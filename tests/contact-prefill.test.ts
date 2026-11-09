import { describe, expect, it } from 'vitest'
import { contactFormUrl, CONTACT_MESSAGE_FIELD, projectNoteHref } from '@/lib/contactPrefill'

/**
 * Rule: what a visitor told the homepage search arrives in the contact form and the email
 * note, so they never type their problem twice. (The verifier reads the filled field back
 * out of the live JotForm form.)
 */
describe('contact form pre-fill', () => {
  it('fills "How can we help?" with their words, encoded', () => {
    expect(CONTACT_MESSAGE_FIELD).toBe('howCan')
    expect(contactFormUrl('123', 'Clinicians don’t trust our AI & its #1 answer')).toBe(`https://form.jotform.com/123?howCan=${encodeURIComponent('Clinicians don’t trust our AI & its #1 answer')}`)
  })

  it('leaves the form plain when there is nothing to carry', () => {
    expect(contactFormUrl('123')).toBe('https://form.jotform.com/123')
    expect(contactFormUrl('123', '   ')).toBe('https://form.jotform.com/123')
  })

  it('caps what it carries', () => {
    const url = contactFormUrl('123', 'x'.repeat(5000))
    expect(decodeURIComponent(url.split('howCan=')[1]).length).toBe(1000)
  })

  it('puts their words under "What I\'m working on" in the email note', () => {
    const body = decodeURIComponent(projectNoteHref('info@goinvo.com', 'Prior auth', 'Benefits forms are too hard').split('body=')[1])
    expect(body).toBe("What I'm working on:\nBenefits forms are too hard\n\nWhat I'd like to change:\n\n")
    expect(decodeURIComponent(projectNoteHref('info@goinvo.com', 'Prior auth').split('body=')[1])).toBe("What I'm working on:\n\nWhat I'd like to change:\n\n")
  })
})
