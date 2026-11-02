import { defineArrayMember, defineField } from 'sanity'
import { WalkthroughFocusInput } from '../../components/WalkthroughFocusInput'
import { validFocus } from '../../../lib/guidedWalkthrough'

export const guidedWalkthroughBlock = defineArrayMember({
  name: 'guidedWalkthrough',
  title: 'Guided walkthrough',
  type: 'object',
  description: 'Present the work one design decision at a time, with highlighted interface details and a working demo.',
  options: { collapsible: true, collapsed: false },
  fields: [
    { name: 'title', title: 'Walkthrough name', type: 'string', description: 'Names the walkthrough for assistive technology and Studio.', validation: Rule => Rule.required() },
    { name: 'variant', title: 'Presentation', type: 'string', initialValue: 'chapters', options: { list: [ { title: 'Guided chapters', value: 'chapters' }, { title: 'Video and live preview', value: 'preview' } ] } },
    { name: 'overviewVideo', title: 'Overview video', type: 'object', description: 'Optional short walkthrough above the interactive chapters. Supply a portrait version for phones and a text transcript.', options: { collapsible: true, collapsed: true }, fields: [
      { name: 'animation', title: 'Film composition', type: 'string', options: { list: [{ title: 'Captured walkthrough', value: 'capture' }, { title: 'Animated answer transformation', value: 'answerMorph' }] } },
      { name: 'durationSeconds', title: 'Rendered duration (seconds)', type: 'number', validation: Rule => Rule.positive() },
      { name: 'url', title: 'Video URL', type: 'url', validation: Rule => Rule.required().uri({ allowRelative: true, scheme: ['http', 'https'] }) },
      { name: 'mobileUrl', title: 'Phone video URL', type: 'url', validation: Rule => Rule.uri({ allowRelative: true, scheme: ['http', 'https'] }) },
      { name: 'poster', title: 'Poster URL', type: 'url', validation: Rule => Rule.uri({ allowRelative: true, scheme: ['http', 'https'] }) },
      { name: 'mobilePoster', title: 'Phone poster URL', type: 'url', validation: Rule => Rule.uri({ allowRelative: true, scheme: ['http', 'https'] }) },
      { name: 'description', title: 'Video caption', type: 'string' },
      { name: 'transcript', title: 'Video transcript', type: 'text', rows: 8 },
      { name: 'beats', title: 'Film observations', type: 'array', description: 'Narration and source evidence for the film. Animated answer transformations derive reading time from the words. Regenerate the film and transcript after editing.', validation: Rule => Rule.max(8), of: [
        { type: 'object', name: 'walkthroughVideoBeat', title: 'Film observation', fields: [
          { name: 'title', title: 'Finding or question', type: 'string', validation: Rule => Rule.required() },
          { name: 'caption', title: 'Evidence or action', type: 'text', rows: 2, validation: Rule => Rule.required() },
          { name: 'image', title: 'Reviewed screenshot', type: 'image', validation: Rule => Rule.required(), fields: [
            { name: 'alt', title: 'Image description', type: 'string', validation: Rule => Rule.required() },
          ] },
          { name: 'focus', title: 'Highlight area', type: 'object', components: { input: WalkthroughFocusInput }, fields: [
            ...['x','y','width','height'].map(name => defineField({ name, type: 'number', title: ({x:'Left (%)',y:'Top (%)',width:'Width (%)',height:'Height (%)'} as Record<string,string>)[name], validation: Rule => Rule.required().min(0).max(100) })),
          ], validation: Rule => Rule.required().custom(value => validFocus(value) || 'Choose a positive highlight area inside the screenshot.') },
        ], preview: { select: { title: 'title', subtitle: 'caption', media: 'image' } } },
      ] },
    ] },
    { name: 'scenes', title: 'Chapters', type: 'array', hidden: ({ parent }) => parent?.variant === 'preview', validation: Rule => Rule.custom((value, context) => (context.parent as { variant?: string })?.variant === 'preview' || (Array.isArray(value) && value.length >= 1 && value.length <= 8) || 'Add between one and eight chapters.'), of: [
      { type: 'object', name: 'walkthroughScene', title: 'Chapter', fields: [
        { name: 'title', title: 'Design decision', type: 'string', description: 'A short heading about what we did.', validation: Rule => Rule.required().max(65) },
        { name: 'navigationTitle', title: 'Short chapter label', type: 'string', validation: Rule => Rule.max(28) },
        { name: 'description', title: 'What we did and why', type: 'text', rows: 4, validation: Rule => Rule.required() },
        { name: 'image', title: 'Interface screenshot', type: 'image', validation: Rule => Rule.required(), fields: [
          { name: 'alt', title: 'Image description', type: 'string', validation: Rule => Rule.required() },
          { name: 'caption', title: 'Caption', type: 'string' },
        ] },
        { name: 'focus', title: 'Highlight area', type: 'object', components: { input: WalkthroughFocusInput }, fields: [
          ...['x','y','width','height'].map(name => defineField({ name, type: 'number', title: ({x:'Left (%)',y:'Top (%)',width:'Width (%)',height:'Height (%)'} as Record<string,string>)[name], validation: Rule => Rule.required().min(0).max(100) })),
        ], validation: Rule => Rule.custom(value => !value || validFocus(value) || 'The highlight must have a positive size and fit inside the image.') },
        { name: 'focusLabel', title: 'Highlighted detail', type: 'string', description: 'Tell the reader what to notice in the picture.' },
        { name: 'tryPrompt', title: 'Something to try', type: 'text', rows: 2 },
        { name: 'demoUrl', title: 'Chapter demo URL', type: 'url', description: 'Optional link to the matching scenario or product. Otherwise uses the walkthrough demo.', validation: Rule => Rule.uri({ allowRelative: true, scheme: ['http','https'] }) },
      ], preview: { select: { title: 'title', subtitle: 'navigationTitle', media: 'image' } } },
    ] },
    { name: 'demoUrl', title: 'Working demo URL', type: 'url', description: 'Optional. Leave blank for a presentation of work that has no public interactive demo.', validation: Rule => Rule.uri({ allowRelative: true, scheme: ['http','https'] }) },
    { name: 'demoLabel', title: 'Full-screen link label', type: 'string', initialValue: 'Open the full demo' },
    { name: 'notice', title: 'Research or simulation note', type: 'text', rows: 3, description: 'Visible throughout the walkthrough and live demo. Uses the Caption style: smaller, muted, italic text.' },
  ],
  preview: { select: { title: 'title', scenes: 'scenes' }, prepare({ title, scenes }) { return { title: title || 'Guided walkthrough', subtitle: `${scenes?.length || 0} chapters` } } },
})
