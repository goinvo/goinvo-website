export const MAX_CHAT_ATTACHMENT_INLINE_SIZE_BYTES = 4 * 1024 * 1024
export const MAX_CHAT_ATTACHMENT_SIZE_BYTES = 1024 * 1024 * 1024

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
export type ChatAttachmentStorageMode = 'inline' | 'slack'

export interface ChatAttachment {
  _key: string
  _type: 'chatAttachment'
  filename: string
  contentType: ChatAttachmentContentType
  size: number
  uploadStatus?: ChatAttachmentUploadStatus
  storageMode?: ChatAttachmentStorageMode
  slackFileId?: string
  slackFileTitle?: string
  slackPermalink?: string
  slackPermalinkPublic?: string
  slackPrivateUrl?: string
  error?: string
}

export interface ValidatedChatAttachment {
  file: File
  filename: string
  contentType: ChatAttachmentContentType
  size: number
}

export interface ChatAttachmentMetadata {
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

export function validateChatAttachment(
  value: unknown,
  options: { maxSizeBytes?: number } = {},
):
  | { attachment: ValidatedChatAttachment; error?: never }
  | { attachment?: never; error?: string } {
  if (!isFileLike(value) || !value.name) return {}

  const filename = sanitizeFilename(value.name)
  const maxSizeBytes = options.maxSizeBytes || MAX_CHAT_ATTACHMENT_SIZE_BYTES
  if (!value.size) return { error: 'Attachment is empty' }
  if (value.size > maxSizeBytes) {
    return { error: `Attachment must be ${formatAttachmentSize(maxSizeBytes)} or smaller` }
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

export function validateInlineChatAttachment(value: unknown) {
  return validateChatAttachment(value, { maxSizeBytes: MAX_CHAT_ATTACHMENT_INLINE_SIZE_BYTES })
}

export function validateChatAttachmentMetadata(value: unknown):
  | { attachment: ChatAttachmentMetadata; error?: never }
  | { attachment?: never; error?: string } {
  if (!value || typeof value !== 'object') return {}

  const record = value as Record<string, unknown>
  if (typeof record.filename !== 'string') return {}

  const filename = sanitizeFilename(record.filename)
  const size = typeof record.size === 'number' ? record.size : Number(record.size)
  if (!Number.isFinite(size) || size <= 0) return { error: 'Attachment is empty' }
  if (size > MAX_CHAT_ATTACHMENT_SIZE_BYTES) {
    return { error: `Attachment must be ${formatAttachmentSize(MAX_CHAT_ATTACHMENT_SIZE_BYTES)} or smaller` }
  }

  const contentType = resolveAttachmentMetadataContentType(filename, record.contentType)
  if (!contentType) {
    return { error: 'Attachment type is not supported' }
  }

  return {
    attachment: {
      filename,
      contentType,
      size,
    },
  }
}

export function createChatAttachment(
  attachment: ValidatedChatAttachment | ChatAttachmentMetadata,
  uploadStatus: ChatAttachmentUploadStatus = 'pending',
  storageMode: ChatAttachmentStorageMode = 'inline',
): ChatAttachment {
  return {
    _key: crypto.randomUUID().replace(/-/g, '').slice(0, 12),
    _type: 'chatAttachment',
    filename: attachment.filename,
    contentType: attachment.contentType,
    size: attachment.size,
    uploadStatus,
    storageMode,
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

function resolveAttachmentMetadataContentType(filename: string, contentType: unknown) {
  if (typeof contentType === 'string' && isAllowedAttachmentType(contentType)) return contentType

  const extension = filename.split('.').pop()?.toLowerCase()
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
