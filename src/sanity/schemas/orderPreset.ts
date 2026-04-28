import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'orderPreset',
  title: 'Order Preset',
  type: 'document',
  hidden: true,
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      readOnly: true,
    }),
    defineField({
      name: 'name',
      title: 'Preset Name',
      type: 'string',
      readOnly: true,
    }),
    defineField({
      name: 'orderType',
      title: 'Ordered Type',
      type: 'string',
      readOnly: true,
    }),
    defineField({
      name: 'documentIds',
      title: 'Document IDs',
      type: 'array',
      of: [{ type: 'string' }],
      readOnly: true,
    }),
    defineField({
      name: 'updatedAt',
      title: 'Updated At',
      type: 'datetime',
      readOnly: true,
    }),
  ],
  preview: {
    select: {
      title: 'name',
      subtitle: 'updatedAt',
    },
  },
})
