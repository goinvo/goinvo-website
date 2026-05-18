import { validateChatAttachment, type ValidatedChatAttachment } from '@/lib/chat/attachments'

export interface ChatRequestBody {
  fields: Record<string, unknown>
  attachment?: ValidatedChatAttachment
  error?: string
}

export async function readChatRequestBody(request: Request): Promise<ChatRequestBody> {
  const contentType = request.headers.get('content-type') || ''

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData()
    const attachmentResult = validateChatAttachment(formData.get('attachment'))
    if (attachmentResult.error) return { fields: {}, error: attachmentResult.error }

    return {
      fields: Object.fromEntries(formData.entries()),
      attachment: attachmentResult.attachment,
    }
  }

  return {
    fields: (await request.json()) as Record<string, unknown>,
  }
}
