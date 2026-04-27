import { useEffect } from 'react'
import { useToast, type ToastParams } from '@sanity/ui'

import { DocumentListQuery } from './DocumentListQuery'
import { OrderableContext } from './OrderableContext'
import type { OrderableDocumentListOptions } from './types'

interface DocumentListWrapperProps extends OrderableDocumentListOptions {
  actionToast: ToastParams
  showIncrements: boolean
}

export function DocumentListWrapper({
  actionToast,
  showIncrements,
  ...options
}: DocumentListWrapperProps) {
  const toast = useToast()

  useEffect(() => {
    if (actionToast?.title && actionToast?.status) {
      toast.push(actionToast)
    }
  }, [actionToast, toast])

  return (
    <OrderableContext.Provider value={{ showIncrements }}>
      <DocumentListQuery {...options} />
    </OrderableContext.Provider>
  )
}
