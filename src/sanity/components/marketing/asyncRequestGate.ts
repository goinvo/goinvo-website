export type AsyncRequestTicket<Kind extends string = string> = Readonly<{
  id: number
  kind: Kind
  context: string | null
}>

/**
 * Synchronous request guard for UI actions. React state updates are intentionally
 * not used as the lock because two click/submit events can run before a render.
 */
export class LatestExclusiveRequestGate<Kind extends string = string> {
  private sequence = 0
  private current: AsyncRequestTicket<Kind> | null = null

  begin(kind: Kind, context: string | null = null) {
    if (this.current) return null
    return this.supersede(kind, context)
  }

  supersede(kind: Kind, context: string | null = null) {
    const ticket = { id: ++this.sequence, kind, context } satisfies AsyncRequestTicket<Kind>
    this.current = ticket
    return ticket
  }

  cancel() {
    this.sequence += 1
    this.current = null
  }

  isCurrent(ticket: AsyncRequestTicket<Kind>) {
    return this.current?.id === ticket.id
      && this.current.kind === ticket.kind
      && this.current.context === ticket.context
  }

  finish(ticket: AsyncRequestTicket<Kind>) {
    if (!this.isCurrent(ticket)) return false
    this.current = null
    return true
  }

  get pending() {
    return this.current !== null
  }
}
