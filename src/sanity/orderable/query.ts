import { ORDER_FIELD_NAME } from './constants'
import type { DocumentListQueryProps } from './types'

const DEFAULT_PARAMS = {}

export function getDocumentQuery({
  type,
  filter,
  params = DEFAULT_PARAMS,
  currentVersion,
}: DocumentListQueryProps) {
  let perspectiveFilter = null

  if (currentVersion === 'published') {
    perspectiveFilter = '!(_id in path("drafts.**")) && !(_id in path("versions.**"))'
  } else if (currentVersion === 'drafts') {
    perspectiveFilter = `
      (_id in path("drafts.**") || (!(_id in path("drafts.**")) && !(_id in path("versions.**"))))
    `
  } else {
    perspectiveFilter = `(sanity::partOfRelease($currentVersion) || (!(_id in path("drafts.**")) && !(_id in path("versions.**"))) || (_id in path("drafts.**")))`
  }

  const querySelect = `*[_type == $type ${perspectiveFilter ? `&& ${perspectiveFilter}` : ''}${filter ? `&& ${filter}` : ''}]`
  const queryOrder = `|order(@[$order] asc)`
  const queryFields = `{_id, _type, ${ORDER_FIELD_NAME}}`

  return {
    query: `${querySelect}${queryOrder}${queryFields}`,
    queryParams: {
      ...params,
      type,
      order: ORDER_FIELD_NAME,
      ...(currentVersion && { currentVersion }),
    },
  }
}

export function getOrderPresetQuery() {
  return `*[_id == $presetId][0]{_id, _type, orderType, documentIds, updatedAt}`
}
