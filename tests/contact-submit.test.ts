import { describe, expect, it } from 'vitest'
import { contactErrors, jotformAccepted, jotformBody, jotformSubmitUrl, readContactFields } from '@/lib/contactSubmit'
import { contactFormUrl } from '@/lib/contactPrefill'

const good = { name: 'Ana Reyes', email: 'ana@example.org', message: 'We need a clear product direction.' }

describe('the contact form, sent in one step', () => {
  it('needs a name, an email we can reply to, and a note', () => {
    expect(contactErrors(good)).toEqual({})
    expect(Object.keys(contactErrors({ name: '', email: 'not-an-email', message: '' }))).toEqual(['name', 'email', 'message'])
    expect(contactErrors({ ...good, email: 'ana@example' }).email).toBeTruthy()
  })

  it('reads only its three fields, trimmed and bounded', () => {
    const read = readContactFields({ name: `  ${'n'.repeat(300)}  `, email: ' ana@example.org ', message: 'm'.repeat(5000), formID: '999', url: 'https://elsewhere.example' })
    expect(read.name).toHaveLength(120)
    expect(read.email).toBe('ana@example.org')
    expect(read.message).toHaveLength(1000)
    expect(Object.keys(read)).toEqual(['name', 'email', 'message'])
    expect(readContactFields(null)).toEqual({ name: '', email: '', message: '' })
  })

  it('goes to the site\'s own form, in that form\'s field names, with its robot trap left empty', () => {
    const body = jotformBody('123', good)
    expect(Object.fromEntries(body)).toEqual({ formID: '123', simple_spc: '123-123', q7_yourName: good.name, q4_yourEmail: good.email, q5_howCan: good.message, website: '' })
    expect(jotformSubmitUrl('123')).toBe('https://submit.jotform.com/submit/123')
  })

  it('rule: a visitor is told "sent" only when the form says thank you', () => {
    expect(jotformAccepted(200, '<h1>Thank You!</h1><p>Your submission has been received.</p>')).toBe(true)
    expect(jotformAccepted(302, '', 'https://submit.jotform.com/thankyou/123')).toBe(true)
    // Everything else is not sent: an error page, a captcha, a redirect elsewhere, an empty or unknown page, a server error.
    expect(jotformAccepted(200, '<p>There are incomplete required fields.</p>')).toBe(false)
    expect(jotformAccepted(200, '<div>Please complete the captcha. Thank you.</div>')).toBe(false)
    expect(jotformAccepted(302, '', 'https://www.jotform.com/login')).toBe(false)
    expect(jotformAccepted(200, '')).toBe(false)
    expect(jotformAccepted(200, '<html><body>Welcome</body></html>')).toBe(false)
    expect(jotformAccepted(500, 'Thank you')).toBe(false)
  })

  it('when it cannot send, the form it hands over to is filled in with all three', () => {
    const url = new URL(contactFormUrl('123', good.message, { name: good.name, email: good.email }))
    expect(url.origin + url.pathname).toBe('https://form.jotform.com/123')
    expect(Object.fromEntries(url.searchParams)).toEqual({ howCan: good.message, yourName: good.name, yourEmail: good.email })
    expect(contactFormUrl('123', 'Two words')).toBe('https://form.jotform.com/123?howCan=Two%20words')
    expect(contactFormUrl('123')).toBe('https://form.jotform.com/123')
  })
})
