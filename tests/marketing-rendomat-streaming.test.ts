import { describe, expect, it } from 'vitest'
import { readBoundedRendomatBody, rendomatCalendarItemId } from '@/lib/marketing/rendomat'

describe('Rendomat bounded asset streaming', () => {
  it('rejects an oversized declared content length before reading', async () => {
    const response = new Response(new Uint8Array([1]), {
      headers: { 'content-length': '101' },
    })

    await expect(readBoundedRendomatBody(response, 100)).rejects.toThrow('101 bytes; limit is 100 bytes')
  })

  it('stops a chunked stream once its actual bytes cross the limit', async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array([1, 2, 3]))
        controller.enqueue(new Uint8Array([4, 5, 6]))
        controller.close()
      },
    })

    await expect(readBoundedRendomatBody(new Response(stream), 5)).rejects.toThrow('5 byte limit')
  })

  it('returns the exact bytes when the stream is within the limit', async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array([1, 2]))
        controller.enqueue(new Uint8Array([3, 4]))
        controller.close()
      },
    })

    const buffer = await readBoundedRendomatBody(new Response(stream), 4)
    expect(Array.from(new Uint8Array(buffer))).toEqual([1, 2, 3, 4])
    expect(rendomatCalendarItemId(42)).toBe('rendomat.calendar.42')
  })
})
