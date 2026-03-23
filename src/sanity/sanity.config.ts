import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { presentationTool } from 'sanity/presentation'
import { schemaTypes } from './schemas'
import { apiVersion, dataset, projectId } from './env'
import { gettingStartedPlugin } from './tools/gettingStarted'
import { feedbackPlugin } from './tools/feedbackTool'

export default defineConfig({
  name: 'goinvo',
  title: 'GoInvo CMS',
  projectId: projectId || 'placeholder',
  dataset,
  apiVersion,
  basePath: '/studio',
  plugins: [
    structureTool(),
    presentationTool({
      previewUrl: {
        previewMode: {
          enable: '/api/draft-mode/enable',
        },
      },
    }),
    gettingStartedPlugin(),
    feedbackPlugin(),
  ],
  schema: {
    types: schemaTypes,
  },
})
