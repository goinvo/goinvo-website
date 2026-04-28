import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@sanity/client'
import { apiVersion, dataset, projectId, writeToken } from '@/sanity/env'

const client = writeToken
  ? createClient({
      projectId,
      dataset,
      token: writeToken,
      apiVersion,
      useCdn: false,
    })
  : null

export async function POST(request: NextRequest) {
  if (!client) {
    return NextResponse.json(
      { error: 'Sanity write token is not configured' },
      { status: 500 },
    )
  }

  const { documentId, type } = await request.json()

  if (!['caseStudy', 'feature'].includes(type)) {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  }

  if (typeof documentId !== 'string' || !documentId.startsWith('drafts.')) {
    return NextResponse.json(
      { error: 'Only draft documents can be deleted here' },
      { status: 400 },
    )
  }

  try {
    const existingType = await client.fetch<string | null>(
      '*[_id == $documentId][0]._type',
      { documentId },
    )

    if (!existingType) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
    }

    if (existingType !== type) {
      return NextResponse.json({ error: 'Draft type mismatch' }, { status: 400 })
    }

    await client.delete(documentId)
  } catch (error) {
    console.error('Failed to delete draft:', error)
    return NextResponse.json({ error: 'Failed to delete draft' }, { status: 500 })
  }

  return NextResponse.json({ deleted: true, id: documentId, type })
}
