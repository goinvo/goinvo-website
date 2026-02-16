import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { schemaTypes } from './schemas'
import { apiVersion, dataset, projectId } from './env'

export default defineConfig({
  name: 'goinvo',
  title: 'GoInvo CMS',
  projectId: projectId || 'placeholder',
  dataset,
  apiVersion,
  basePath: '/studio',
  plugins: [structureTool()],
  schema: {
    types: schemaTypes,
  },
})
