'use client'

import { FormEvent, useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { siteConfig } from '@/lib/config'
import {
  CHAT_ATTACHMENT_ACCEPT,
  MAX_CHAT_ATTACHMENT_INLINE_SIZE_BYTES,
  formatAttachmentSize,
  validateChatAttachment,
  type ChatAttachment,
} from '@/lib/chat/attachments'

const THREAD_STORAGE_KEY = 'goinvo-chat-thread-v1'
const THREADS_STORAGE_KEY = 'goinvo-chat-threads-v1'
const SESSION_STORAGE_KEY = 'goinvo-chat-browser-session-v1'

interface ChatMessage {
  id: string
  authorType: 'visitor' | 'team'
  authorName?: string
  text: string
  createdAt: string
  attachments?: Pick<ChatAttachment, 'filename' | 'contentType' | 'size' | 'uploadStatus' | 'slackPermalink'>[]
}

interface StoredThread {
  threadId: string
  visitorKey: string
  name?: string
  email?: string
  status?: string
  lastMessageAt?: string
  lastMessagePreview?: string
}

interface ThreadResponse {
  threadId: string
  visitorKey?: string
  status: string
  visitor?: { name?: string; email?: string }
  messages: ChatMessage[]
  directUpload?: DirectUpload
}

interface DirectUpload {
  uploadUrl: string
  fileId: string
  messageId: string
}

type ChatViewMode = 'conversation' | 'threads' | 'new'

export function ChatWidget() {
  const [enabled, setEnabled] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [thread, setThread] = useState<StoredThread | null>(null)
  const [storedThreads, setStoredThreads] = useState<StoredThread[]>([])
  const [viewMode, setViewMode] = useState<ChatViewMode>('new')
  const [threadStatus, setThreadStatus] = useState<string>('new')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [pollingIntervalMs, setPollingIntervalMs] = useState<number>(siteConfig.chat.pollingIntervalMs)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [initialMessage, setInitialMessage] = useState('')
  const [replyMessage, setReplyMessage] = useState('')
  const [initialAttachment, setInitialAttachment] = useState<File | null>(null)
  const [replyAttachment, setReplyAttachment] = useState<File | null>(null)
  const [website, setWebsite] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const initialAttachmentInputRef = useRef<HTMLInputElement>(null)
  const replyAttachmentInputRef = useRef<HTMLInputElement>(null)

  const loadThread = useCallback(async (storedThread: StoredThread) => {
    const response = await fetch(
      `/api/chat/threads/${encodeURIComponent(storedThread.threadId)}?visitorKey=${encodeURIComponent(storedThread.visitorKey)}`,
      { cache: 'no-store' },
    )

    if (!response.ok) {
      if (response.status === 404 || response.status === 403) {
        localStorage.removeItem(THREAD_STORAGE_KEY)
        setStoredThreads(removeStoredThread(storedThread.threadId))
        setThread(null)
        setMessages([])
        setViewMode(loadStoredThreads().length ? 'threads' : 'new')
      }
      throw new Error('Unable to load chat')
    }

    const data = (await response.json()) as ThreadResponse
    const updatedThread = mergeStoredThreadWithResponse(storedThread, data)
    setStoredThreads(saveStoredThread(updatedThread))
    setThread(updatedThread)
    setViewMode('conversation')
    setThreadStatus(data.status)
    setMessages(data.messages || [])
    setName(updatedThread.name || '')
    setEmail(updatedThread.email || '')
  }, [])

  useEffect(() => {
    let isCancelled = false

    fetch('/api/chat/config', { cache: 'no-store' })
      .then((response) => response.json())
      .then(async (data: { enabled?: boolean; pollingIntervalMs?: number }) => {
        if (isCancelled || !data.enabled) return
        setEnabled(true)
        if (data.pollingIntervalMs) setPollingIntervalMs(data.pollingIntervalMs)

        const availableThreads = loadStoredThreads()
        setStoredThreads(availableThreads)
        const storedThread = loadStoredThread()
        if (storedThread) {
          try {
            await loadThread(storedThread)
          } catch {
            setError(null)
          }
        } else if (availableThreads.length) {
          setViewMode('threads')
        }
      })
      .catch(() => {
        setEnabled(false)
      })

    return () => {
      isCancelled = true
    }
  }, [loadThread])

  useEffect(() => {
    if (!enabled || !thread || viewMode !== 'conversation') return

    const interval = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return
      loadThread(thread).catch(() => undefined)
    }, pollingIntervalMs)

    return () => window.clearInterval(interval)
  }, [enabled, loadThread, pollingIntervalMs, thread, viewMode])

  useEffect(() => {
    if (!isOpen) return
    messagesEndRef.current?.scrollIntoView({ block: 'end' })
  }, [isOpen, messages.length])

  const handleStartThread = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const data = await sendChatRequest('/api/chat/threads', {
        name,
        email,
        message: initialMessage,
        pageUrl: window.location.href,
        pageTitle: document.title,
        referrer: document.referrer,
        sessionId: getBrowserSessionId(),
        language: navigator.language,
        website,
      }, initialAttachment)

      let storedThread = mergeStoredThreadWithResponse({
        threadId: data.threadId,
        visitorKey: data.visitorKey || '',
        name: name.trim() || data.visitor?.name,
        email: email.trim() || data.visitor?.email,
      }, data)

      setStoredThreads(saveStoredThread(storedThread))
      setThread(storedThread)
      setViewMode('conversation')
      setThreadStatus(data.status)
      setMessages(data.messages || [])
      if (data.directUpload && initialAttachment) {
        const uploadedData = await uploadDirectAttachment(data.threadId, storedThread.visitorKey, data.directUpload, initialAttachment)
        storedThread = mergeStoredThreadWithResponse(storedThread, uploadedData)
        setStoredThreads(saveStoredThread(storedThread))
        setThread(storedThread)
        setThreadStatus(uploadedData.status)
        setMessages(uploadedData.messages || [])
      }
      setInitialMessage('')
      setInitialAttachment(null)
      if (initialAttachmentInputRef.current) initialAttachmentInputRef.current.value = ''
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to start chat')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSendReply = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!thread) return

    setError(null)
    setIsSubmitting(true)

    try {
      const data = await sendChatRequest(
        `/api/chat/threads/${encodeURIComponent(thread.threadId)}`,
        {
          visitorKey: thread.visitorKey,
          message: replyMessage,
        },
        replyAttachment,
      )

      setThreadStatus(data.status)
      setMessages(data.messages || [])
      let updatedThread = mergeStoredThreadWithResponse(thread, data)
      setStoredThreads(saveStoredThread(updatedThread))
      setThread(updatedThread)
      setName(updatedThread.name || '')
      setEmail(updatedThread.email || '')
      if (data.directUpload && replyAttachment) {
        const uploadedData = await uploadDirectAttachment(thread.threadId, thread.visitorKey, data.directUpload, replyAttachment)
        updatedThread = mergeStoredThreadWithResponse(updatedThread, uploadedData)
        setStoredThreads(saveStoredThread(updatedThread))
        setThread(updatedThread)
        setThreadStatus(uploadedData.status)
        setMessages(uploadedData.messages || [])
      }
      setReplyMessage('')
      setReplyAttachment(null)
      if (replyAttachmentInputRef.current) replyAttachmentInputRef.current.value = ''
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send message')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleShowThreads = () => {
    setError(null)
    setStoredThreads(loadStoredThreads())
    setViewMode('threads')
  }

  const handleOpenThread = (selectedThread: StoredThread) => {
    setError(null)
    selectStoredThread(selectedThread)
    loadThread(selectedThread).catch((err) => {
      setError(err instanceof Error ? err.message : 'Unable to load chat')
    })
  }

  const handleStartNewThread = () => {
    setError(null)
    setThread(null)
    setThreadStatus('new')
    setMessages([])
    setReplyMessage('')
    setReplyAttachment(null)
    setInitialAttachment(null)
    setInitialMessage('')
    localStorage.removeItem(THREAD_STORAGE_KEY)
    setViewMode('new')
    if (initialAttachmentInputRef.current) initialAttachmentInputRef.current.value = ''
    if (replyAttachmentInputRef.current) replyAttachmentInputRef.current.value = ''
  }

  if (!enabled) return null

  const hasThread = viewMode === 'conversation' && Boolean(thread)
  const isThreadList = viewMode === 'threads'
  const showBackButton = viewMode !== 'threads' && storedThreads.length > 0
  const statusLabel = threadStatus === 'waitingOnVisitor' ? 'Replied' : threadStatus === 'resolved' ? 'Resolved' : null
  return (
    <div className="fixed right-4 bottom-4 z-[1200] font-sans sm:right-6 sm:bottom-6">
      {isOpen && (
        <section
          aria-label="GoInvo chat"
          className="mb-3 flex h-[min(640px,calc(100vh-7rem))] w-[calc(100vw-2rem)] max-w-[380px] flex-col overflow-hidden rounded-md border border-gray-medium bg-white shadow-[0_16px_40px_rgba(29,27,26,0.18)]"
        >
          <div className="flex min-h-14 items-center justify-between gap-4 bg-tertiary px-4 py-3 text-white">
            <div className="flex min-w-0 items-center gap-2">
              {showBackButton && (
                <button
                  type="button"
                  onClick={handleShowThreads}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-white transition-colors hover:bg-white/10 focus:bg-white/10 focus:outline-none"
                  aria-label="All messages"
                  title="All messages"
                >
                  <ArrowLeftIcon />
                </button>
              )}
              <div className="min-w-0">
                <h2 className="mb-0 font-sans text-base font-semibold leading-6">
                  {isThreadList ? 'Messages' : 'GoInvo'}
                </h2>
                {(isThreadList || !hasThread || statusLabel) && (
                  <p className="mb-0 text-xs leading-5 text-white/85">
                    {isThreadList ? 'Conversations' : hasThread ? statusLabel : 'Ask us anything'}
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="group relative h-8 w-8 shrink-0 rounded-md border border-white/30 text-white transition-colors hover:bg-white/10"
              aria-label="Close chat"
            >
              <span className="absolute left-1/2 top-1/2 block h-[2px] w-4 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-current transition-transform group-hover:scale-110" />
              <span className="absolute left-1/2 top-1/2 block h-[2px] w-4 -translate-x-1/2 -translate-y-1/2 -rotate-45 bg-current transition-transform group-hover:scale-110" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto bg-gray-lightest px-4 py-4">
            {isThreadList ? (
              <ThreadList
                threads={storedThreads}
                activeThreadId={thread?.threadId}
                onOpenThread={handleOpenThread}
                onStartNewThread={handleStartNewThread}
              />
            ) : !hasThread ? (
              <div className="rounded-md border border-gray-medium bg-white p-4">
                <h3 className="mb-2 font-sans text-sm font-semibold uppercase tracking-[2px] text-tertiary">
                  {siteConfig.chat.introTitle}
                </h3>
                <p className="mb-0 text-sm leading-6 text-gray">
                  {siteConfig.chat.introText}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((message) => {
                  const isVisitor = message.authorType === 'visitor'
                  return (
                    <div key={message.id} className={`flex ${isVisitor ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[82%] rounded-md px-3 py-2 text-sm leading-6 ${
                          isVisitor
                            ? 'bg-secondary text-white'
                            : 'border border-gray-medium bg-white text-black'
                        }`}
                      >
                        {!isVisitor && (
                          <div className="mb-1 text-xs font-semibold uppercase tracking-[1px] text-primary">
                            {message.authorName || 'GoInvo'}
                          </div>
                        )}
                        <div className="whitespace-pre-wrap break-words">{message.text}</div>
                        {Boolean(message.attachments?.length) && (
                          <div className="mt-2 space-y-1">
                            {message.attachments?.map((attachment) => (
                              <div
                                key={`${message.id}-${attachment.filename}`}
                                className={`min-w-0 max-w-full overflow-hidden rounded-md border px-2 py-1 text-xs leading-5 ${
                                  isVisitor
                                    ? 'border-white/35 bg-white/10 text-white'
                                    : 'border-gray-medium bg-gray-lightest text-gray'
                                }`}
                              >
                                <span className="block max-w-full break-all font-semibold leading-5">
                                  {attachment.filename}
                                </span>
                                <span className="block opacity-80">{formatAttachmentSize(attachment.size)}</span>
                                {attachment.uploadStatus === 'failed' && (
                                  <span className="block font-semibold">Upload failed</span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          <div className="border-t border-gray-medium bg-white p-4">
            {error && (
              <div className="mb-3 rounded-md border border-red bg-red/5 px-3 py-2 text-sm leading-5 text-red" role="alert">
                {error}
              </div>
            )}

            {isThreadList ? (
              <button
                type="button"
                onClick={handleStartNewThread}
                className="h-10 w-full rounded-md bg-primary px-4 text-sm font-semibold uppercase tracking-[2px] text-white transition-colors hover:bg-primary-dark"
              >
                New conversation
              </button>
            ) : !hasThread ? (
              <form onSubmit={handleStartThread} className="space-y-3">
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Name"
                  autoComplete="name"
                  className="h-10 w-full rounded-md border border-gray-medium px-3 text-sm outline-none focus:border-secondary"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Email"
                  autoComplete="email"
                  className="h-10 w-full rounded-md border border-gray-medium px-3 text-sm outline-none focus:border-secondary"
                />
                <label className="sr-only" htmlFor="chat-website">
                  Website
                </label>
                <input
                  id="chat-website"
                  type="text"
                  value={website}
                  onChange={(event) => setWebsite(event.target.value)}
                  tabIndex={-1}
                  autoComplete="off"
                  className="hidden"
                />
                <textarea
                  value={initialMessage}
                  onChange={(event) => setInitialMessage(event.target.value)}
                  placeholder="How can we help?"
                  rows={4}
                  maxLength={2000}
                  className="min-h-24 w-full resize-none rounded-md border border-gray-medium px-3 py-2 text-sm leading-6 outline-none focus:border-secondary"
                  required={!initialAttachment}
                />
                <AttachmentSummary
                  attachment={initialAttachment}
                  onRemove={() => {
                    setInitialAttachment(null)
                    if (initialAttachmentInputRef.current) initialAttachmentInputRef.current.value = ''
                  }}
                />
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={isSubmitting || (!initialMessage.trim() && !initialAttachment)}
                    className="h-10 flex-1 rounded-md bg-primary px-4 text-sm font-semibold uppercase tracking-[2px] text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    {isSubmitting ? 'Sending...' : 'Send'}
                  </button>
                  <AttachmentPicker
                    id="chat-initial-attachment"
                    inputRef={initialAttachmentInputRef}
                    attachment={initialAttachment}
                    onSelect={(file) => handleAttachmentSelect(file, setInitialAttachment)}
                  />
                </div>
              </form>
            ) : (
              <form onSubmit={handleSendReply} className="space-y-3">
                <textarea
                  value={replyMessage}
                  onChange={(event) => setReplyMessage(event.target.value)}
                  placeholder="Write a reply"
                  rows={3}
                  maxLength={2000}
                  className="min-h-20 w-full resize-none rounded-md border border-gray-medium px-3 py-2 text-sm leading-6 outline-none focus:border-secondary"
                  required={!replyAttachment}
                />
                <AttachmentSummary
                  attachment={replyAttachment}
                  onRemove={() => {
                    setReplyAttachment(null)
                    if (replyAttachmentInputRef.current) replyAttachmentInputRef.current.value = ''
                  }}
                />
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={isSubmitting || (!replyMessage.trim() && !replyAttachment)}
                    className="h-10 flex-1 rounded-md bg-primary px-4 text-sm font-semibold uppercase tracking-[2px] text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    {isSubmitting ? 'Sending...' : 'Send'}
                  </button>
                  <AttachmentPicker
                    id="chat-reply-attachment"
                    inputRef={replyAttachmentInputRef}
                    attachment={replyAttachment}
                    onSelect={(file) => handleAttachmentSelect(file, setReplyAttachment)}
                  />
                </div>
              </form>
            )}
          </div>
        </section>
      )}

      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="group flex min-h-12 max-w-[calc(100vw-2rem)] items-center gap-3 rounded-[30px] bg-[#252a3c] py-3 pl-4 pr-5 text-left text-white shadow-[0_12px_30px_rgba(29,27,26,0.22)] transition-colors hover:bg-tertiary sm:max-w-none"
          aria-expanded={isOpen}
          aria-label="Open GoInvo chat"
        >
          <span className="block h-3 w-3 shrink-0 rounded-full border-2 border-white bg-[#44c961]" aria-hidden="true" />
          <span className="block text-sm font-semibold leading-5 tracking-normal sm:text-[15px]">
            {siteConfig.chat.greeting}
          </span>
        </button>
      )}
    </div>
  )

  function handleAttachmentSelect(file: File | null, onValidFile: (file: File) => void) {
    if (!file) return

    const result = validateChatAttachment(file)
    if (result.error) {
      setError(result.error)
      return
    }

    setError(null)
    onValidFile(file)
  }
}

async function sendChatRequest(
  url: string,
  fields: Record<string, string>,
  attachment: File | null,
) {
  const usesDirectSlackUpload = Boolean(attachment && attachment.size > MAX_CHAT_ATTACHMENT_INLINE_SIZE_BYTES)
  const response = await fetch(url, {
    method: 'POST',
    ...(usesDirectSlackUpload
      ? {
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            ...fields,
            attachment: attachment
              ? {
                  filename: attachment.name,
                  contentType: attachment.type,
                  size: attachment.size,
                }
              : undefined,
          }),
        }
      : {
          body: toFormData(fields, attachment),
        }),
  })

  const data = (await response.json()) as ThreadResponse & { error?: string }
  if (!response.ok) {
    throw new Error(data.error || 'Unable to send message')
  }

  return data
}

function toFormData(fields: Record<string, string>, attachment: File | null) {
  const formData = new FormData()
  Object.entries(fields).forEach(([key, value]) => {
    formData.set(key, value)
  })
  if (attachment) formData.set('attachment', attachment)
  return formData
}

async function uploadDirectAttachment(
  threadId: string,
  visitorKey: string,
  directUpload: DirectUpload,
  attachment: File,
) {
  await fetch(directUpload.uploadUrl, {
    method: 'POST',
    mode: 'no-cors',
    body: attachment,
  })

  const response = await fetch('/api/chat/attachments/complete', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      threadId,
      visitorKey,
      messageId: directUpload.messageId,
      fileId: directUpload.fileId,
    }),
  })

  const data = (await response.json()) as ThreadResponse & { error?: string }
  if (!response.ok) {
    throw new Error(data.error || 'Unable to finish Slack attachment upload')
  }

  return data
}

function ThreadList({
  threads,
  activeThreadId,
  onOpenThread,
  onStartNewThread,
}: {
  threads: StoredThread[]
  activeThreadId?: string
  onOpenThread: (thread: StoredThread) => void
  onStartNewThread: () => void
}) {
  if (!threads.length) {
    return (
      <div className="rounded-md border border-gray-medium bg-white p-4">
        <h3 className="mb-2 font-sans text-sm font-semibold uppercase tracking-[2px] text-tertiary">
          No messages yet
        </h3>
        <p className="mb-4 text-sm leading-6 text-gray">Start a conversation and we will reply here.</p>
        <button
          type="button"
          onClick={onStartNewThread}
          className="h-10 w-full rounded-md bg-primary px-4 text-sm font-semibold uppercase tracking-[2px] text-white transition-colors hover:bg-primary-dark"
        >
          New conversation
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {threads.map((storedThread) => {
        const isActive = storedThread.threadId === activeThreadId
        return (
          <button
            key={storedThread.threadId}
            type="button"
            onClick={() => onOpenThread(storedThread)}
            className={`w-full rounded-md border px-3 py-3 text-left transition-colors ${
              isActive
                ? 'border-secondary bg-white'
                : 'border-gray-medium bg-white hover:border-secondary hover:bg-gray-lightest'
            }`}
            aria-current={isActive ? 'true' : undefined}
          >
            <span className="flex min-w-0 items-start justify-between gap-3">
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold leading-5 text-tertiary">
                  {getThreadTitle(storedThread)}
                </span>
                <span className="mt-1 block line-clamp-2 text-xs leading-5 text-gray">
                  {storedThread.lastMessagePreview || 'Conversation with GoInvo'}
                </span>
              </span>
              <span className="shrink-0 text-right">
                {storedThread.lastMessageAt && (
                  <span className="block text-[11px] leading-5 text-gray">{formatThreadDate(storedThread.lastMessageAt)}</span>
                )}
                {storedThread.status && (
                  <span className="mt-1 block text-[11px] font-semibold uppercase leading-5 tracking-[1px] text-secondary">
                    {getThreadStatusLabel(storedThread.status)}
                  </span>
                )}
              </span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

function AttachmentPicker({
  id,
  inputRef,
  attachment,
  onSelect,
}: {
  id: string
  inputRef: RefObject<HTMLInputElement | null>
  attachment: File | null
  onSelect: (file: File | null) => void
}) {
  return (
    <>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-gray-medium text-tertiary transition-colors hover:border-secondary hover:text-secondary focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/25"
        aria-label={attachment ? `Change attached file: ${attachment.name}` : 'Attach file'}
        title="Attach file"
      >
        <PaperclipIcon />
      </button>
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={CHAT_ATTACHMENT_ACCEPT}
        className="sr-only"
        onChange={(event) => onSelect(event.target.files?.[0] || null)}
      />
    </>
  )
}

function AttachmentSummary({
  attachment,
  onRemove,
}: {
  attachment: File | null
  onRemove: () => void
}) {
  if (!attachment) return null

  return (
    <div className="flex min-w-0 items-center justify-between gap-2 rounded-md border border-gray-medium bg-gray-lightest px-3 py-2 text-xs leading-5 text-gray">
      <span className="min-w-0 truncate">
        {attachment.name} ({formatAttachmentSize(attachment.size)})
      </span>
      <button
        type="button"
        onClick={onRemove}
        className="shrink-0 text-xs font-semibold uppercase tracking-[1.5px] text-primary hover:text-primary-dark"
      >
        Remove
      </button>
    </div>
  )
}

function ArrowLeftIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  )
}

function PaperclipIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    >
      <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  )
}

function loadStoredThread(): StoredThread | null {
  return parseStoredThread(localStorage.getItem(THREAD_STORAGE_KEY))
}

function loadStoredThreads(): StoredThread[] {
  let threads: StoredThread[] = []

  try {
    const raw = localStorage.getItem(THREADS_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    if (Array.isArray(parsed)) {
      threads = parsed.map((item) => parseStoredThread(JSON.stringify(item))).filter(Boolean) as StoredThread[]
    }
  } catch {
    threads = []
  }

  const activeThread = loadStoredThread()
  return activeThread ? upsertStoredThread(threads, activeThread) : sortStoredThreads(threads)
}

function saveStoredThread(thread: StoredThread) {
  const threads = upsertStoredThread(loadStoredThreads(), thread)
  localStorage.setItem(THREAD_STORAGE_KEY, JSON.stringify(thread))
  localStorage.setItem(THREADS_STORAGE_KEY, JSON.stringify(threads))
  return threads
}

function selectStoredThread(thread: StoredThread) {
  localStorage.setItem(THREAD_STORAGE_KEY, JSON.stringify(thread))
}

function removeStoredThread(threadId: string) {
  const threads = loadStoredThreads().filter((item) => item.threadId !== threadId)
  localStorage.setItem(THREADS_STORAGE_KEY, JSON.stringify(threads))
  const activeThread = loadStoredThread()
  if (activeThread?.threadId === threadId) {
    localStorage.removeItem(THREAD_STORAGE_KEY)
  }
  return threads
}

function mergeStoredThreadWithResponse(
  thread: StoredThread,
  response: Pick<ThreadResponse, 'status' | 'visitor' | 'messages'>,
) {
  const lastMessage = response.messages.at(-1)
  const nextThread = {
    ...thread,
    name: thread.name || response.visitor?.name,
    email: thread.email || response.visitor?.email,
    status: response.status,
    lastMessageAt: lastMessage?.createdAt || thread.lastMessageAt,
    lastMessagePreview: lastMessage?.text || thread.lastMessagePreview,
  }

  return nextThread
}

function parseStoredThread(raw: string | null): StoredThread | null {
  if (!raw) return null

  try {
    const value = JSON.parse(raw) as Partial<StoredThread>
    if (typeof value.threadId !== 'string' || typeof value.visitorKey !== 'string') return null
    return {
      threadId: value.threadId,
      visitorKey: value.visitorKey,
      ...(typeof value.name === 'string' ? { name: value.name } : {}),
      ...(typeof value.email === 'string' ? { email: value.email } : {}),
      ...(typeof value.status === 'string' ? { status: value.status } : {}),
      ...(typeof value.lastMessageAt === 'string' ? { lastMessageAt: value.lastMessageAt } : {}),
      ...(typeof value.lastMessagePreview === 'string' ? { lastMessagePreview: value.lastMessagePreview } : {}),
    }
  } catch {
    return null
  }
}

function upsertStoredThread(threads: StoredThread[], thread: StoredThread) {
  return sortStoredThreads([thread, ...threads.filter((item) => item.threadId !== thread.threadId)])
}

function sortStoredThreads(threads: StoredThread[]) {
  return [...threads].sort((first, second) => {
    const firstTime = Date.parse(first.lastMessageAt || '')
    const secondTime = Date.parse(second.lastMessageAt || '')
    return (Number.isFinite(secondTime) ? secondTime : 0) - (Number.isFinite(firstTime) ? firstTime : 0)
  })
}

function getThreadTitle(thread: StoredThread) {
  return thread.name || thread.email || 'Website chat'
}

function getThreadStatusLabel(status: string) {
  if (status === 'waitingOnVisitor') return 'Replied'
  if (status === 'resolved') return 'Resolved'
  if (status === 'open') return 'Open'
  return 'New'
}

function formatThreadDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date)
}

function getBrowserSessionId() {
  const existing = localStorage.getItem(SESSION_STORAGE_KEY)
  if (existing) return existing

  const value = crypto.randomUUID()
  localStorage.setItem(SESSION_STORAGE_KEY, value)
  return value
}
