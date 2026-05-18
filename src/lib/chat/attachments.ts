export const MAX_CHAT_ATTACHMENT_SIZE_BYTES = 4 * 1024 * 1024

export const CHAT_ATTACHMENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'application/pdf',
  'text/plain',
  'text/csv',
] as const

export const CHAT_ATTACHMENT_ACCEPT = [
  ...CHAT_ATTACHMENT_TYPES,
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.mp4',
  '.webm',
  '.mov',
  '.pdf',
  '.txt',
  '.csv',
].join(',')

export type ChatAttachmentContentType = (typeof CHAT_ATTACHMENT_TYPES)[number]
export type ChatAttachmentUploadStatus = 'pending' | 'uploaded' | 'failed'

export interface ChatAttachment {
  _key: string
  _type: 'chatAttachment'
  filename: string
  contentType: ChatAttachmentContentType
  size: number
  uploadStatus?: ChatAttachmentUploadStatus
  slackFileId?: string
  slackFileTitle?: string
  error?: string
}

export interface ValidatedChatAttachment {
  file: File
  filename: string
  contentType: ChatAttachmentContentType
  size: number
}

const extensionContentTypes: Record<string, ChatAttachmentContentType> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  pdf: 'application/pdf',
  txt: 'text/plain',
  csv: 'text/csv',
}

export function validateChatAttachment(value: unknown):
  | { attachment: ValidatedChatAttachment; error?: never }
  | { attachment?: never; error?: string } {
  if (!isFileLike(value) || !value.name) return {}

  const filename = sanitizeFilename(value.name)
  if (!value.size) return { error: 'Attachment is empty' }
  if (value.size > MAX_CHAT_ATTACHMENT_SIZE_BYTES) {
    return { error: `Attachment must be ${formatAttachmentSize(MAX_CHAT_ATTACHMENT_SIZE_BYTES)} or smaller` }
  }

  const contentType = resolveAttachmentContentType(value)
  if (!contentType) {
    return { error: 'Attachment type is not supported' }
  }

  return {
    attachment: {
      file: value,
      filename,
      contentType,
      size: value.size,
    },
  }
}

export function createChatAttachment(
  attachment: ValidatedChatAttachment,
  uploadStatus: ChatAttachmentUploadStatus = 'pending',
): ChatAttachment {
  return {
    _key: crypto.randomUUID().replace(/-/g, '').slice(0, 12),
    _type: 'chatAttachment',
    filename: attachment.filename,
    contentType: attachment.contentType,
    size: attachment.size,
    uploadStatus,
  }
}

export function formatAttachmentSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(bytes % (1024 * 1024) === 0 ? 0 : 1)} MB`
}

function resolveAttachmentContentType(file: File) {
  if (isAllowedAttachmentType(file.type)) return file.type

  const extension = file.name.split('.').pop()?.toLowerCase()
  if (!extension) return undefined
  return extensionContentTypes[extension]
}

function isAllowedAttachmentType(value: string): value is ChatAttachmentContentType {
  return CHAT_ATTACHMENT_TYPES.includes(value as ChatAttachmentContentType)
}

function sanitizeFilename(filename: string) {
  return filename
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 140) || 'attachment'
}

function isFileLike(value: unknown): value is File {
  return Boolean(
    value &&
      typeof value === 'object' &&
      typeof (value as File).name === 'string' &&
      typeof (value as File).size === 'number' &&
      typeof (value as File).arrayBuffer === 'function',
  )
}
