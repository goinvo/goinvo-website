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
