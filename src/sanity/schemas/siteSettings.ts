import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'siteSettings',
  title: 'Site Settings',
  type: 'document',
  fields: [
    defineField({
      name: 'siteTitle',
      title: 'Site Title',
      type: 'string',
      description: 'Appears in the browser tab and as the default SEO title',
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 3,
      description: 'Default meta description used when a page does not specify its own',
    }),
    defineField({
      name: 'socialLinks',
      title: 'Social Links',
      type: 'object',
      description: 'Social media profile URLs displayed in the site footer',
      fields: [
        { name: 'linkedin', title: 'LinkedIn', type: 'url', description: 'Company LinkedIn page URL' },
        { name: 'twitter', title: 'Twitter', type: 'url', description: 'Company Twitter/X URL' },
        { name: 'medium', title: 'Medium', type: 'url', description: 'Company Medium blog URL' },
        { name: 'flickr', title: 'Flickr', type: 'url', description: 'Company Flickr album URL' },
        { name: 'soundcloud', title: 'SoundCloud', type: 'url', description: 'Company SoundCloud URL' },
      ],
    }),
    defineField({
      name: 'footerText',
      title: 'Footer Text',
      type: 'text',
      rows: 3,
      description: 'Tagline or blurb shown in the footer area',
    }),
    defineField({
      name: 'contactInfo',
      title: 'Contact Info',
      type: 'object',
      description: 'Contact details displayed in the footer and contact page',
      fields: [
        { name: 'email', title: 'Email', type: 'string', description: 'Primary contact email address' },
        { name: 'phone', title: 'Phone', type: 'string', description: 'Phone number with area code' },
        { name: 'address', title: 'Address', type: 'text', rows: 3, description: 'Physical mailing address' },
      ],
    }),
  ],
  // Singleton - only one document
  preview: {
    prepare() {
      return { title: 'Site Settings' }
    },
  },
})
