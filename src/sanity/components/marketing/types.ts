// Shared marketing-CMS data-model types extracted from the marketing tool
// monolith (src/sanity/tools/marketingTool.tsx) as workspaces are split into
// their own files. Types here are used by MORE THAN ONE workspace, so they live
// in a neutral module both the tool and the extracted workspaces import — never
// duplicated. Add a type here only when it is small/self-contained; the deeply
// interconnected data-model interfaces (MarketingData, MarketingChannel, ...)
// remain in the tool and are imported from there to keep this graph minimal.

// A single managed content-type option on a marketing channel. Mirrors the
// `channelContentType` array object in src/sanity/schemas/marketingChannel.ts.
export interface ChannelContentType {
  _key?: string
  _type?: 'channelContentType'
  label?: string
  value?: string
  description?: string
}

// Which editor sub-tab is active in the A/B Tests workspace. Used by both
// AbTestingWorkspace (component state) and the tool's
// getAbTestingInsightActionTarget helper (its return type), so it lives here.
export type AbTestingEditorTab = 'setup' | 'launch' | 'results'

// Glossary / workflow-help types. Shared between the ResearchWorkspace cluster
// (MarketingTerm / WorkflowAnswer / WorkflowHelpSection / DesignerSetupPath) and
// the tool's workflowTerms / workflowHelpItems / workflowSetupSteps data, so they
// live in this neutral module both sides import. Type-only import of
// MarketingViewId from the tool keeps this graph free of runtime dependencies.
import type { MarketingViewId } from '../../tools/marketingTool'

export type WorkflowTerm = {
  label: string
  definition: string
}

export type WorkflowHelpItem = {
  question: string
  answer: Array<string | WorkflowTerm>
  action?: {
    label: string
    view: MarketingViewId
  }
}

export type WorkflowSetupStep = {
  label: string
  title: string
  outcome: string
  designerAction: string
  view: MarketingViewId
  terms?: WorkflowTerm[]
}
