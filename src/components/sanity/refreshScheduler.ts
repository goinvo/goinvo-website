type PendingRefresh = {
  reject: (reason?: unknown) => void
  resolve: () => void
}

export function createDebouncedRefresh(refresh: () => void, delayMs: number) {
  let timeout: ReturnType<typeof setTimeout> | undefined
  let pending: PendingRefresh[] = []

  function settlePending(error?: unknown) {
    const current = pending
    pending = []

    current.forEach(({ reject, resolve }) => {
      if (error) {
        reject(error)
        return
      }

      resolve()
    })
  }

  return {
    schedule() {
      if (timeout) {
        clearTimeout(timeout)
      }

      return new Promise<void>((resolve, reject) => {
        pending.push({ reject, resolve })
        timeout = setTimeout(() => {
          timeout = undefined

          try {
            refresh()
            settlePending()
          } catch (error) {
            settlePending(error)
          }
        }, delayMs)
      })
    },

    cancel() {
      if (timeout) {
        clearTimeout(timeout)
        timeout = undefined
      }

      settlePending()
    },
  }
}
