export type WorkUpdatePrivacyIssue = {
  code: 'credential' | 'contactPii' | 'healthIdentifier'
  message: string
}

/**
 * Deterministic preflight that runs before a coworker note is sent to AI.
 * It intentionally quarantines instead of trying to redact secrets silently.
 */
export function findWorkUpdatePrivacyIssue(value: unknown): WorkUpdatePrivacyIssue | null {
  if (typeof value !== 'string') return null
  const text = value.trim()
  if (!text) return null

  if (
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i.test(text) ||
    /\b(?:password|passwd|api[_ -]?key|access[_ -]?token|secret|bearer)\b\s*[:=]\s*["']?[A-Za-z0-9_./+\-=]{8,}/i.test(text) ||
    /\b(?:sk|pk)_(?:live|test)_[A-Za-z0-9]{12,}\b/i.test(text) ||
    /\bsk-[A-Za-z0-9_-]{16,}\b/.test(text)
  ) {
    return {
      code: 'credential',
      message: 'Remove the password, API key, token, or private key before asking Marketing to analyze this update.',
    }
  }

  if (
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(text) ||
    /(?:^|\D)(?:\+?1[ .-]?)?\(?\d{3}\)?[ .-]\d{3}[ .-]\d{4}(?:\D|$)/.test(text) ||
    /\b\d{3}-\d{2}-\d{4}\b/.test(text)
  ) {
    return {
      code: 'contactPii',
      message: 'Remove email addresses, phone numbers, or personal identifiers. Add the person later through the private Outreach workflow.',
    }
  }

  if (/\b(?:medical record number|medical record #|mrn|patient id|patient name|date of birth|dob)\b/i.test(text)) {
    return {
      code: 'healthIdentifier',
      message: 'Remove patient or health-record identifiers before asking Marketing to analyze this update.',
    }
  }

  return null
}
