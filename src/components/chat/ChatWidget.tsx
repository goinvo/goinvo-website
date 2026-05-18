'use client'

import { FormEvent, useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { siteConfig } from '@/lib/config'
import {
  CHAT_ATTACHMENT_ACCEPT,
  formatAttachmentSize,
  validateChatAttachment,
  type ChatAttachment,
} from '@/lib/chat/attachments'

const THREAD_STORAGE_KEY = 'goinvo-chat-thread-v1'
const SESSION_STORAGE_KEY = 'goinvo-chat-browser-session-v1'

interface ChatMessage {
  id: string
  authorType: 'visitor' | 'team'
  authorName?: string
  text: string
  createdAt: string
  attachments?: Pick<ChatAttachment, 'filename' | 'contentType' | 'size' | 'uploadStatus'>[]
}

interface StoredThread {
  threadId: string
  visitorKey: string
  name?: string
  email?: string
}

interface ThreadResponse {
  threadId: string
  visitorKey?: string
  status: string
  visitor?: { name?: string; email?: string }
  messages: ChatMessage[]
}

export function ChatWidget() {
  const [enabled, setEnabled] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [thread, setThread] = useState<StoredThread | null>(null)
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
        setThread(null)
        setMessages([])
      }
      throw new Error('Unable to load chat')
    }

    const data = (await response.json()) as ThreadResponse
    const updatedThread = mergeStoredThreadWithVisitor(storedThread, data.visitor)
    if (updatedThread !== storedThread) {
      saveStoredThread(updatedThread)
    }
    setThread(updatedThread)
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

        const storedThread = loadStoredThread()
        if (storedThread) {
          try {
            await loadThread(storedThread)
          } catch {
            setError(null)
          }
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
    if (!enabled || !thread) return

    const interval = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return
      loadThread(thread).catch(() => undefined)
    }, pollingIntervalMs)

    return () => window.clearInterval(interval)
  }, [enabled, loadThread, pollingIntervalMs, thread])

  useEffect(() => {
    if (!isOpen) return
    messagesEndRef.current?.scrollIntoView({ block: 'end' })
  }, [isOpen, messages.length])

  const handleStartThread = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const formData = new FormData()
      formData.set('name', name)
      formData.set('email', email)
      formData.set('message', initialMessage)
      formData.set('pageUrl', window.location.href)
      formData.set('pageTitle', document.title)
      formData.set('referrer', document.referrer)
      formData.set('sessionId', getBrowserSessionId())
      formData.set('language', navigator.language)
      formData.set('website', website)
      if (initialAttachment) formData.set('attachment', initialAttachment)

      const response = await fetch('/api/chat/threads', {
        method: 'POST',
        body: formData,
      })

      const data = (await response.json()) as ThreadResponse & { error?: string }
      if (!response.ok) {
        throw new Error(data.error || 'Unable to start chat')
      }

      const storedThread = {
        threadId: data.threadId,
        visitorKey: data.visitorKey || '',
        name: name.trim() || data.visitor?.name,
        email: email.trim() || data.visitor?.email,
      }

      saveStoredThread(storedThread)
      setThread(storedThread)
      setThreadStatus(data.status)
      setMessages(data.messages || [])
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
      const formData = new FormData()
      formData.set('visitorKey', thread.visitorKey)
      formData.set('message', replyMessage)
      if (replyAttachment) formData.set('attachment', replyAttachment)

      const response = await fetch(`/api/chat/threads/${encodeURIComponent(thread.threadId)}`, {
        method: 'POST',
        body: formData,
      })

      const data = (await response.json()) as ThreadResponse & { error?: string }
      if (!response.ok) {
        throw new Error(data.error || 'Unable to send message')
      }

      setThreadStatus(data.status)
      setMessages(data.messages || [])
      const updatedThread = mergeStoredThreadWithVisitor(thread, data.visitor)
      if (updatedThread !== thread) {
        saveStoredThread(updatedThread)
        setThread(updatedThread)
        setName(updatedThread.name || '')
        setEmail(updatedThread.email || '')
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

  if (!enabled) return null

  const hasThread = Boolean(thread)
  const statusLabel = threadStatus === 'waitingOnVisitor' ? 'Replied' : threadStatus === 'resolved' ? 'Resolved' : null
  return (
    <div className="fixed right-4 bottom-4 z-[1200] font-sans sm:right-6 sm:bottom-6">
      {isOpen && (
        <section
          aria-label="GoInvo chat"
          className="mb-3 flex h-[min(640px,calc(100vh-7rem))] w-[calc(100vw-2rem)] max-w-[380px] flex-col overflow-hidden rounded-lg border border-gray-medium bg-white shadow-[0_16px_40px_rgba(29,27,26,0.18)]"
        >
          <div className="flex min-h-14 items-center justify-between gap-4 bg-tertiary px-4 py-3 text-white">
            <div>
              <h2 className="mb-0 font-sans text-base font-semibold leading-6">GoInvo</h2>
              {(!hasThread || statusLabel) && (
                <p className="mb-0 text-xs leading-5 text-white/85">{hasThread ? statusLabel : 'Ask us anything'}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="group relative h-8 w-8 shrink-0 border border-white/30 text-white transition-colors hover:bg-white/10"
              aria-label="Close chat"
            >
              <span className="absolute left-1/2 top-1/2 block h-[2px] w-4 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-current transition-transform group-hover:scale-110" />
              <span className="absolute left-1/2 top-1/2 block h-[2px] w-4 -translate-x-1/2 -translate-y-1/2 -rotate-45 bg-current transition-transform group-hover:scale-110" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto bg-gray-lightest px-4 py-4">
            {!hasThread ? (
              <div className="rounded-lg border border-gray-medium bg-white p-4">
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
                        className={`max-w-[82%] rounded-lg px-3 py-2 text-sm leading-6 ${
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
                                className={`min-w-0 max-w-full overflow-hidden border px-2 py-1 text-xs leading-5 ${
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
              <div className="mb-3 border border-red bg-red/5 px-3 py-2 text-sm leading-5 text-red" role="alert">
                {error}
              </div>
            )}

            {!hasThread ? (
              <form onSubmit={handleStartThread} className="space-y-3">
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Name"
                  autoComplete="name"
                  className="h-10 w-full border border-gray-medium px-3 text-sm outline-none focus:border-secondary"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Email"
                  autoComplete="email"
                  className="h-10 w-full border border-gray-medium px-3 text-sm outline-none focus:border-secondary"
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
                  className="min-h-24 w-full resize-none border border-gray-medium px-3 py-2 text-sm leading-6 outline-none focus:border-secondary"
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
                    className="h-10 flex-1 bg-primary px-4 text-sm font-semibold uppercase tracking-[2px] text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-55"
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
                  className="min-h-20 w-full resize-none border border-gray-medium px-3 py-2 text-sm leading-6 outline-none focus:border-secondary"
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
                    className="h-10 flex-1 bg-primary px-4 text-sm font-semibold uppercase tracking-[2px] text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-55"
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
        className="flex h-10 w-10 shrink-0 items-center justify-center border border-gray-medium text-tertiary transition-colors hover:border-secondary hover:text-secondary focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/25"
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
    <div className="flex min-w-0 items-center justify-between gap-2 border border-gray-medium bg-gray-lightest px-3 py-2 text-xs leading-5 text-gray">
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
  try {
    const raw = localStorage.getItem(THREAD_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as StoredThread) : null
  } catch {
    return null
  }
}

function saveStoredThread(thread: StoredThread) {
  localStorage.setItem(THREAD_STORAGE_KEY, JSON.stringify(thread))
}

function mergeStoredThreadWithVisitor(
  thread: StoredThread,
  visitor: ThreadResponse['visitor'],
) {
  const nextThread = {
    ...thread,
    name: thread.name || visitor?.name,
    email: thread.email || visitor?.email,
  }

  return nextThread.name === thread.name && nextThread.email === thread.email ? thread : nextThread
}

function getBrowserSessionId() {
  const existing = localStorage.getItem(SESSION_STORAGE_KEY)
  if (existing) return existing

  const value = crypto.randomUUID()
  localStorage.setItem(SESSION_STORAGE_KEY, value)
  return value
}
