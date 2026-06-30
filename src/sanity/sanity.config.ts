import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { presentationTool } from 'sanity/presentation'
import { schemaTypes } from './schemas'
import { apiVersion, dataset, projectId } from './env'
import { gettingStartedPlugin } from './tools/gettingStarted'
import { feedbackPlugin } from './tools/feedbackTool'
import { featureArticleTemplates, resolveFeatureNewDocumentOptions } from './featureTemplates'
import { featureAuthoringBadge, PublishStatusBadge } from './featureBadges'
import { locations, mainDocuments } from './presentation/resolve'
import { structure } from './structure'
import { marketingPlugin } from './tools/marketingTool'
import './studio.css'

export default defineConfig({
  name: 'goinvo',
  title: 'GoInvo CMS',
  projectId: projectId || 'placeholder',
  dataset,
  apiVersion,
  basePath: '/studio',
  plugins: [
    structureTool({ name: 'content', title: 'Content', structure }),
    marketingPlugin(),
    presentationTool({
      previewUrl: {
        previewMode: {
          enable: '/api/draft-mode/enable',
        },
      },
      resolve: {
        mainDocuments,
        locations,
      },
    }),
    gettingStartedPlugin(),
    feedbackPlugin(),
  ],
  document: {
    badges: (prev) => [...prev, PublishStatusBadge, featureAuthoringBadge],
    newDocumentOptions: resolveFeatureNewDocumentOptions,
  },
  schema: {
    types: schemaTypes,
    templates: (prev) => [...prev, ...featureArticleTemplates],
  },
})
