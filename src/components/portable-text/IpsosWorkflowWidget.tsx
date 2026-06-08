'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

type NodeKind = 'node' | 'decision' | 'terminus' | 'note' | 'annotation' | 'terminalLabel'
type NodeVariant =
  | 'office'
  | 'finance'
  | 'ops'
  | 'survey'
  | 'field'
  | 'media'
  | 'analytics'
  | 'plain'
  | 'reports'

interface WorkflowNode {
  kind?: NodeKind
  text?: string
  small?: string
  role?: string
  variant?: NodeVariant
  tone?: 'ok' | 'warn' | 'neutral'
  open?: boolean
  left?: number
  right?: number
  top: number
  width?: number
  maxWidth?: number
  align?: 'left' | 'right' | 'center'
  lineHeight?: number
}

interface WorkflowLine {
  x1: number
  y1: number
  x2: number
  y2: number
  dashed?: boolean
}

interface WorkflowStage {
  number: string
  title: string
  shortTitle: string
  description: string
  stepCount: string
  width: number
  height: number
  nodes: WorkflowNode[]
  lines: WorkflowLine[]
}

const toolColors = {
  office: '#a82428',
  finance: '#c8a800',
  ops: '#c87080',
  survey: '#2c4fa0',
  field: '#6888bc',
  media: '#1a3888',
  analytics: '#7a4a90',
} as const

const summaryStages = [
  {
    number: '01',
    title: (
      <>
        Pitch &amp;
        <br />
        Quote
      </>
    ),
    invo: true,
    items: [
      ['finance', 'Pitch'],
      ['finance', 'Quotation & basic audience definition'],
      ['field', 'Feasibility (online)'],
      ['finance', 'Jobs & billing schedule'],
    ],
    tools: ['finance', 'field'],
  },
  {
    number: '02',
    title: (
      <>
        Setup &amp;
        <br />
        Planning
      </>
    ),
    invo: true,
    items: [
      ['office', 'Questionnaire preparation'],
      ['finance', 'Tracker wave, brand lists & metadata'],
      ['survey', 'Sample & Quota definition'],
      ['ops', 'Research scheduling'],
      ['ops', 'Research scheduling'],
      ['ops', 'OPS resource assignment, Capacity planning'],
    ],
    tools: ['finance', 'ops', 'survey'],
  },
  {
    number: '03',
    title: (
      <>
        Survey
        <br />
        Preparation
      </>
    ),
    invo: true,
    items: [
      ['survey', 'Questionnaire scripting'],
      ['media', 'Translation'],
      ['ops', 'Media Setup'],
      ['field', 'Quota Setup'],
      ['survey', 'QA Test link'],
    ],
    tools: ['survey', 'media', 'field'],
  },
  {
    number: '04',
    title: (
      <>
        Data
        <br />
        Collection
      </>
    ),
    items: [
      ['field', 'Online Data Collection'],
      ['field', 'Online Field Monitoring'],
      ['ops', 'F2F Scheduling & Data Collection & QA'],
      ['field', 'Telephone Data Collection'],
      ['ops', 'Telephone Scheduling & QA'],
    ],
    tools: ['ops', 'field'],
  },
  {
    number: '05',
    title: (
      <>
        Data
        <br />
        Preparation
      </>
    ),
    items: [
      ['survey', 'Data Processing'],
      ['survey', 'Coding'],
    ],
    tools: ['survey', 'field'],
  },
  {
    number: '06',
    title: (
      <>
        Data
        <br />
        Analytics
      </>
    ),
    items: [
      ['analytics', 'Analytics workstream'],
      ['analytics', 'Social media workstream'],
      ['survey', 'Client database merge'],
    ],
    tools: ['analytics', 'survey'],
  },
  {
    number: '07',
    title: (
      <>
        Insights &amp;
        <br />
        Reporting
      </>
    ),
    invo: true,
    items: [
      ['analytics', 'Core report'],
      ['analytics', 'Custom insights'],
    ],
    tools: ['analytics'],
  },
  {
    number: '08',
    title: (
      <>
        Delivery
        <br />
        to Client
      </>
    ),
    items: [
      ['office', 'Final report'],
      ['office', 'Client insights'],
      ['analytics', 'Dashboard handoff'],
    ],
    tools: ['office', 'analytics'],
  },
] as const

const stages: WorkflowStage[] = [
  {
    number: '1',
    title: 'Pitch & quote',
    shortTitle: 'Pitch & quote',
    description: 'Receive the lead, evaluate, draft the proposal, lock pricing, get client sign-off.',
    stepCount: '~22 steps',
    width: 752,
    height: 1304,
    nodes: [
      { kind: 'terminus', text: 'C', left: 121, top: 4 },
      { kind: 'note', text: 'Need a project (RFP request)', left: 156, top: 36 },
      { text: 'Evaluate needs', role: 'Ir', variant: 'plain', left: 62, top: 84, width: 140 },
      { kind: 'decision', left: 123, top: 164 },
      { kind: 'annotation', text: 'Yes', tone: 'ok', right: 932, top: 149 },
      { kind: 'annotation', text: 'No', tone: 'warn', left: 156, top: 149 },
      { kind: 'terminalLabel', text: 'PFP rejected', left: 232, top: 166 },
      { kind: 'annotation', text: 'opportunity\nidentified', tone: 'neutral', right: 932, top: 194, width: 90, align: 'right', lineHeight: 1.4 },
      { text: 'Create pitch', role: 'Ir', variant: 'finance', left: 62, top: 244, width: 140 },
      { text: 'Write proposal & SOW', role: 'Ir', variant: 'office', left: 42, top: 324, width: 180 },
      { text: 'Quotation', variant: 'finance', left: 292, top: 244, width: 140 },
      { text: 'Online', variant: 'finance', left: 252, top: 324, width: 100 },
      { text: 'Offline', variant: 'finance', left: 372, top: 324, width: 100 },
      { text: 'Define samples & survey specs', variant: 'survey', left: 262, top: 404, width: 200 },
      { text: 'Feasibility check', role: 'Io', variant: 'survey', left: 292, top: 484, width: 140 },
      { text: 'Provide fieldwork cost', variant: 'finance', left: 282, top: 564, width: 160 },
      { text: 'Collate professional time', variant: 'finance', left: 152, top: 644, width: 160 },
      { text: 'Source other costs', variant: 'finance', left: 412, top: 644, width: 160 },
      { text: 'Data science & GMU', role: 'Is', variant: 'office', left: 332, top: 724, width: 160 },
      { text: 'Coding, DP & data delivery cost', role: 'Io', variant: 'office', left: 512, top: 724, width: 200 },
      { text: 'Define total price & profitability', variant: 'finance', left: 272, top: 804, width: 180 },
      { text: 'Pitch - proposal package', variant: 'finance', left: 52, top: 884, width: 160 },
      { kind: 'terminus', text: 'C', left: 121, top: 964 },
      { kind: 'decision', left: 123, top: 1044 },
      { kind: 'annotation', text: 'Accepted', tone: 'ok', right: 932, top: 1066 },
      { kind: 'annotation', text: 'Pitch WON', tone: 'neutral', right: 932, top: 1090 },
      { kind: 'annotation', text: 'Rejected', tone: 'warn', left: 156, top: 1033 },
      { kind: 'terminalLabel', text: 'Pitch LOST', left: 232, top: 1046 },
      { text: 'Provide project requirements', role: 'Ir', variant: 'finance', left: 42, top: 1124, width: 180 },
      { text: 'Billing schedule created for Ext. job', role: 'Io', variant: 'finance', left: 22, top: 1204, width: 220 },
    ],
    lines: [
      [132, 15, 132, 102], [132, 102, 132, 173], [132, 173, 132, 262], [132, 173, 242, 173],
      [132, 262, 132, 342], [132, 262, 362, 262], [362, 262, 302, 342], [362, 262, 422, 342],
      [302, 342, 362, 422], [422, 342, 362, 422], [362, 422, 362, 502], [362, 502, 362, 582],
      [362, 582, 232, 662], [362, 582, 492, 662], [492, 662, 412, 742], [492, 662, 612, 742],
      [412, 742, 362, 822], [612, 742, 362, 822], [232, 662, 362, 822], [362, 822, 132, 902],
      [132, 342, 132, 902], [132, 902, 132, 975], [132, 975, 132, 1053], [132, 1053, 132, 1142],
      [132, 1053, 242, 1053], [132, 1142, 132, 1222],
    ].map(line),
  },
  {
    number: '2',
    title: 'Setup',
    shortTitle: 'Setup',
    description: 'Create the job, define sample & quota, set up questionnaire and schedule, brief the team.',
    stepCount: '~20 steps',
    width: 760,
    height: 674,
    nodes: [
      { text: 'New job created', role: 'Io', variant: 'finance', left: 390, top: 14, width: 140 },
      { text: 'SOW update', role: 'Io', variant: 'office', left: 390, top: 94, width: 140 },
      { text: 'Questionnaire setup', role: 'Ir', variant: 'plain', left: 200, top: 174, width: 160 },
      { text: 'Survey setup', role: 'Ir', variant: 'plain', left: 390, top: 174, width: 140 },
      { text: 'Sample & quota definition', variant: 'plain', left: 560, top: 174, width: 160 },
      { text: 'Processing media', variant: 'media', left: 30, top: 254, width: 140 },
      { text: 'Define routing structure', variant: 'survey', left: 200, top: 254, width: 160 },
      { text: 'Communicate project', role: 'Io', variant: 'plain', left: 380, top: 254, width: 160 },
      { text: 'Define team, roles, responsibilities', variant: 'survey', left: 560, top: 254, width: 160 },
      { text: 'Draft questionnaire', variant: 'office', left: 200, top: 334, width: 160 },
      { text: 'Define deadlines', variant: 'office', left: 390, top: 334, width: 140 },
      { text: 'Define sampling & field specs', variant: 'office', left: 560, top: 334, width: 160 },
      { text: 'Conduct kickoff', role: 'Ir', variant: 'plain', left: 390, top: 414, width: 140 },
      { text: 'Book GMU capacity', variant: 'plain', left: 200, top: 494, width: 160 },
      { text: 'Assign OPS / project team', variant: 'plain', left: 380, top: 494, width: 160 },
      { text: 'Draft & share briefing', role: 'Ir', variant: 'office', left: 560, top: 494, width: 160 },
      { text: 'Export scripting package', role: 'Io', variant: 'survey', left: 20, top: 574, width: 160 },
      { text: 'Share schedule', variant: 'office', left: 390, top: 574, width: 140 },
    ],
    lines: [
      [460, 32, 460, 112], [460, 112, 280, 192], [460, 112, 460, 192], [460, 112, 640, 192],
      [280, 192, 100, 272], [280, 192, 280, 272], [460, 192, 460, 272], [640, 192, 640, 272],
      [280, 272, 280, 352], [460, 272, 460, 352], [640, 272, 640, 352], [280, 352, 460, 432],
      [460, 352, 460, 432], [640, 352, 460, 432], [460, 432, 280, 512], [460, 432, 460, 512],
      [460, 432, 640, 512], [280, 512, 100, 592], [460, 512, 460, 592],
    ].map(line),
  },
  {
    number: '3',
    title: 'Survey & preparation',
    shortTitle: 'Survey & preparation',
    description: 'Script the master questionnaire, test logic, manage translations, approve the script.',
    stepCount: '~14 steps',
    width: 500,
    height: 994,
    nodes: [
      { text: 'Setup completed', variant: 'plain', left: 70, top: 14, width: 140 },
      { text: 'Script master questionnaire', role: 'Is', variant: 'survey', left: 40, top: 94, width: 200 },
      { text: 'Processing media', variant: 'media', left: 300, top: 94, width: 140 },
      { text: 'Update master form', variant: 'office', left: 60, top: 174, width: 160 },
      { text: 'Check script logic & overall look and feel', role: 'Ir', variant: 'survey', left: 30, top: 254, width: 220 },
      { text: 'Update master questionnaire', variant: 'survey', left: 40, top: 334, width: 200 },
      { text: 'Test survey link', role: 'Ir', variant: 'survey', left: 70, top: 414, width: 140 },
      { text: 'Random Generation Data (RGD)', role: 'Is', variant: 'survey', left: 40, top: 494, width: 200 },
      { text: 'Define translation needs', variant: 'office', left: 50, top: 574, width: 180 },
      { text: 'Export translation (survey script & translate)', variant: 'office', left: 20, top: 654, width: 240 },
      { text: 'Translation approval', variant: 'plain', left: 290, top: 654, width: 160 },
      { text: 'Script overlap multi language', role: 'Ir', variant: 'survey', left: 40, top: 734, width: 200 },
      { text: 'Test translation links', role: 'Ir', variant: 'survey', left: 280, top: 734, width: 180 },
      { text: 'Update master change form', variant: 'office', left: 50, top: 814, width: 180 },
      { text: 'Script approved', variant: 'plain', left: 70, top: 894, width: 140 },
    ],
    lines: [
      [140, 32, 140, 112], [140, 112, 370, 112], [140, 112, 140, 192], [140, 192, 140, 272],
      [140, 272, 140, 352], [140, 352, 140, 432], [140, 432, 140, 512], [140, 512, 140, 592],
      [140, 592, 140, 672], [140, 672, 370, 672], [140, 672, 140, 752], [370, 672, 370, 752],
      [140, 752, 140, 832], [370, 752, 140, 832], [140, 832, 140, 912],
    ].map(line),
  },
  {
    number: '4',
    title: 'Data collection',
    shortTitle: 'Data collection',
    description: 'Launch and monitor online and offline fieldwork; close and consolidate the data.',
    stepCount: '~16 steps',
    width: 790,
    height: 754,
    nodes: [
      { text: 'Provide sampling structure, quota & quality criteria', variant: 'office', left: 330, top: 14, width: 240 },
      { text: 'Prepare sampling & quota', role: 'Io', variant: 'survey', left: 180, top: 94, width: 180 },
      { text: 'Brief offline DC supervisors & provide materials', variant: 'plain', left: 510, top: 94, width: 240 },
      { text: 'Launch fieldwork', small: 'online', role: 'Io', variant: 'survey', left: 200, top: 174, width: 140 },
      { text: 'Launch fieldwork', small: 'offline', variant: 'survey', left: 560, top: 174, width: 140 },
      { text: 'Monitor fieldwork', small: 'online', role: 'Io', variant: 'survey', left: 20, top: 254, width: 140 },
      { text: 'Monitor DC & QA', small: 'online', variant: 'survey', left: 190, top: 254, width: 160 },
      { text: 'Deliver interim data', role: 'Ir', variant: 'survey', left: 370, top: 254, width: 160 },
      { text: 'Monitor DC & QA', small: 'offline', variant: 'survey', left: 550, top: 254, width: 160 },
      { text: 'Close fieldwork', small: 'online', variant: 'survey', left: 200, top: 334, width: 140 },
      { text: 'Close fieldwork', small: 'offline', variant: 'survey', left: 560, top: 334, width: 140 },
      { text: 'Transfer data to Dimensions', role: 'Is', variant: 'survey', left: 530, top: 414, width: 200 },
      { text: 'Deliver final data and field summary', variant: 'survey', left: 330, top: 494, width: 240 },
      { text: 'Review fieldwork outcomes', role: 'Ir', variant: 'office', left: 350, top: 574, width: 200 },
      { text: 'Survey data collected', variant: 'plain', left: 370, top: 654, width: 160 },
    ],
    lines: [
      [450, 32, 270, 112], [450, 32, 630, 112], [270, 112, 270, 192], [630, 112, 630, 192],
      [270, 192, 90, 272], [270, 192, 270, 272], [630, 192, 450, 272], [630, 192, 630, 272],
      [90, 272, 270, 352], [270, 272, 270, 352], [630, 272, 630, 352], [270, 352, 450, 512],
      [630, 352, 630, 432], [630, 432, 450, 512], [450, 512, 450, 592], [450, 592, 450, 672],
    ].map(line),
  },
  {
    number: '5',
    title: 'Data preparation',
    shortTitle: 'Data preparation',
    description: 'Clean data, code open-ends, weight, build tables and toplines.',
    stepCount: '~14 steps',
    width: 860,
    height: 914,
    nodes: [
      { text: 'Review OP specs', role: 'Io', variant: 'office', left: 220, top: 14, width: 160 },
      { text: 'Extract & clean data', role: 'Is', variant: 'survey', left: 450, top: 14, width: 180 },
      { text: 'Setup coding specifications', role: 'Ir', variant: 'office', left: 310, top: 94, width: 220 },
      { text: 'Define Codeframe', variant: 'analytics', left: 340, top: 174, width: 160 },
      { text: 'Review Codeframe', role: 'Ir', variant: 'analytics', left: 330, top: 254, width: 180 },
      { text: 'Code open-ended responses', variant: 'analytics', left: 320, top: 334, width: 200 },
      { text: 'Merge closed & open-ended data', role: 'Is', variant: 'survey', left: 300, top: 414, width: 240 },
      { text: 'Construct variables & weight data', variant: 'survey', left: 310, top: 494, width: 220 },
      { text: 'Produce Top Lines', variant: 'survey', left: 340, top: 574, width: 160 },
      { text: 'Review Top Lines', variant: 'office', left: 340, top: 654, width: 160 },
      { text: 'Create tables, filter & sort outputs', variant: 'survey', left: 20, top: 734, width: 160 },
      { text: 'Produce Tables Plan', variant: 'survey', left: 220, top: 734, width: 160 },
      { text: 'Review DP tables', role: 'Ir', variant: 'office', left: 460, top: 734, width: 160 },
      { text: 'Deliver GMU file', role: 'Io', variant: 'plain', left: 660, top: 734, width: 160 },
      { text: 'Aggregate & structure collected data', variant: 'plain', left: 300, top: 814, width: 240 },
    ],
    lines: [
      [300, 32, 420, 112], [540, 32, 420, 112], [420, 112, 420, 192], [420, 192, 420, 272],
      [420, 272, 420, 352], [420, 352, 420, 432], [420, 432, 420, 512], [420, 512, 420, 592],
      [420, 592, 420, 672], [420, 672, 100, 752], [420, 672, 300, 752], [420, 672, 540, 752],
      [420, 672, 740, 752], [100, 752, 420, 832], [300, 752, 420, 832], [540, 752, 420, 832],
      [740, 752, 420, 832],
    ].map(line),
  },
  {
    number: '6',
    title: 'Data analytics',
    shortTitle: 'Data analytics',
    description: 'Run analytics and social media workstreams; merge results into the client database.',
    stepCount: '~14 steps',
    width: 1040,
    height: 814,
    nodes: [
      { text: 'New request for analytics', variant: 'plain', left: 420, top: 14, width: 180 },
      { text: 'Review analytics specs', role: 'Is', variant: 'office', left: 420, top: 94, width: 180 },
      { text: 'Prepare verbatims & data', role: 'Ir', variant: 'media', left: 220, top: 174, width: 180 },
      { text: 'Collect social media data', variant: 'survey', left: 620, top: 174, width: 180 },
      { text: 'Run analytics', variant: 'analytics', left: 220, top: 254, width: 180 },
      { text: 'Run social media analysis', variant: 'analytics', left: 620, top: 254, width: 180 },
      { text: 'Review analytics outputs', role: 'Is', variant: 'office', left: 220, top: 334, width: 180 },
      { text: 'Review social media outputs', role: 'Is', variant: 'office', left: 620, top: 334, width: 180 },
      { text: 'Deliver analytics outputs', variant: 'office', left: 220, top: 414, width: 180 },
      { text: 'Deliver social media analytics', variant: 'office', left: 620, top: 414, width: 180 },
      { text: 'Merge analytics into client database', role: 'Is', variant: 'survey', left: 420, top: 494, width: 180 },
      { text: 'Upload data to client database', variant: 'office', left: 420, top: 574, width: 180 },
      { text: 'Analytics outputs produced', variant: 'plain', left: 420, top: 654, width: 180 },
      { text: 'New survey data integrated', variant: 'plain', left: 420, top: 734, width: 180 },
    ],
    lines: [
      [510, 32, 510, 112], [510, 112, 310, 192], [510, 112, 710, 192], [310, 192, 310, 272],
      [710, 192, 710, 272], [310, 272, 310, 352], [710, 272, 710, 352], [310, 352, 310, 432],
      [710, 352, 710, 432], [310, 432, 510, 512], [710, 432, 510, 512], [510, 512, 510, 592],
      [510, 592, 510, 672], [510, 672, 510, 752],
    ].map(line),
  },
  {
    number: '7',
    title: 'Insights & Reporting',
    shortTitle: 'Insights & reporting',
    description: 'Build, review, and ship reports and insights across team cycles.',
    stepCount: '~16 steps',
    width: 1040,
    height: 884,
    nodes: [
      { kind: 'terminus', text: 'C', left: 499, top: 4 },
      { text: 'Reporting requirements', variant: 'plain', left: 420, top: 84, width: 180 },
      { text: 'Define core report specs', role: 'Ir', variant: 'office', left: 220, top: 164, width: 180 },
      { text: 'Define custom insights specs', role: 'Ir', variant: 'office', left: 620, top: 164, width: 180 },
      { text: 'Review use report specs', role: 'Ir', variant: 'office', left: 220, top: 244, width: 180 },
      { text: 'Review insights specs', role: 'Ir', variant: 'office', left: 620, top: 244, width: 180 },
      { text: 'Final approval', variant: 'plain', left: 220, top: 324, width: 180 },
      { text: 'Design insights', role: 'Ir', variant: 'analytics', left: 620, top: 324, width: 180 },
      { text: 'Setup live core report', variant: 'analytics', left: 220, top: 404, width: 180 },
      { text: 'Build insights', variant: 'analytics', left: 620, top: 404, width: 180 },
      { text: 'Process data tables', role: 'Ir', variant: 'survey', left: 220, top: 484, width: 180 },
      { text: 'Prepare & share data tables', variant: 'survey', left: 620, top: 484, width: 180 },
      { text: 'Link data', variant: 'office', left: 420, top: 564, width: 180 },
      { text: 'Review outputs', role: 'Ir', variant: 'analytics', left: 420, top: 644, width: 180 },
      { text: 'Report approved', variant: 'plain', left: 220, top: 724, width: 180 },
      { text: 'Publish & share insights', variant: 'analytics', left: 620, top: 724, width: 180 },
      { text: 'Delivered', variant: 'plain', left: 420, top: 804, width: 180 },
    ],
    lines: [
      [510, 15, 510, 102], [510, 102, 310, 182], [510, 102, 710, 182], [310, 182, 310, 262],
      [710, 182, 710, 262], [310, 262, 310, 342], [710, 262, 710, 342], [310, 342, 310, 422],
      [710, 342, 710, 422], [310, 422, 310, 502], [710, 422, 710, 502], [310, 502, 510, 582],
      [710, 502, 510, 582], [510, 582, 510, 662], [510, 662, 310, 742], [510, 662, 710, 742],
      [310, 742, 510, 822], [710, 742, 510, 822],
    ].map(line),
  },
  {
    number: '8',
    title: 'Delivery to client',
    shortTitle: 'Delivery to client',
    description: 'Compile insights, deliver final report and dashboards, close the project.',
    stepCount: '~11 steps',
    width: 940,
    height: 484,
    nodes: [
      { kind: 'terminus', text: 'C', left: 459, top: 4 },
      { text: 'Data ready', variant: 'plain', left: 390, top: 84, width: 160 },
      { text: 'Prepare data & analytics outputs', role: 'Ir', variant: 'plain', left: 90, top: 164, width: 160 },
      { text: 'Analyze results & produce insights', role: 'Ir', variant: 'plain', left: 390, top: 164, width: 160 },
      { text: 'Provide dashboard access', variant: 'analytics', left: 690, top: 164, width: 160 },
      { text: 'Prepare final report', role: 'Ir', variant: 'office', left: 90, top: 244, width: 160 },
      { text: 'Prepare client deck', variant: 'office', left: 390, top: 244, width: 160 },
      { text: 'Build status updates', variant: 'survey', left: 690, top: 244, width: 160 },
      { text: 'Deliver final report', variant: 'office', left: 90, top: 324, width: 160 },
      { text: 'Share with stakeholders', variant: 'office', left: 390, top: 324, width: 160 },
      { text: 'Hand off to client', role: 'Ir', variant: 'office', left: 690, top: 324, width: 160 },
      { text: 'Project complete', variant: 'plain', left: 390, top: 404, width: 160 },
    ],
    lines: [
      [470, 15, 470, 102], [470, 102, 170, 182], [470, 102, 470, 182], [470, 102, 770, 182],
      [170, 182, 170, 262], [470, 182, 470, 262], [770, 182, 770, 262], [170, 262, 170, 342],
      [470, 262, 470, 342], [770, 262, 770, 342], [170, 342, 470, 422], [470, 342, 470, 422],
      [770, 342, 470, 422],
    ].map(line),
  },
]

function line([x1, y1, x2, y2]: number[]): WorkflowLine {
  return { x1, y1, x2, y2 }
}

function nodeStyle(node: WorkflowNode): React.CSSProperties {
  return {
    left: node.left == null ? undefined : `${node.left}px`,
    right: node.right == null ? undefined : `${node.right}px`,
    top: `${node.top}px`,
    width: node.width == null ? undefined : `${node.width}px`,
    maxWidth: node.maxWidth == null ? undefined : `${node.maxWidth}px`,
    textAlign: node.align,
    lineHeight: node.lineHeight,
  }
}

function WorkflowNodeView({ node }: { node: WorkflowNode }) {
  const kind = node.kind || 'node'

  if (kind === 'decision') return <span className="ipsos-decision" style={nodeStyle(node)} />
  if (kind === 'terminus') {
    return (
      <span className={cn('ipsos-terminus', node.open && 'ipsos-terminus-open')} style={nodeStyle(node)}>
        {node.text}
      </span>
    )
  }
  if (kind === 'note') {
    return (
      <span className="ipsos-note" style={nodeStyle(node)}>
        {node.text}
      </span>
    )
  }
  if (kind === 'annotation') {
    return (
      <span className={cn('ipsos-ann', node.tone && `ipsos-ann-${node.tone}`)} style={nodeStyle(node)}>
        {node.text?.split('\n').map((part, index) => (
          <span key={index}>
            {index > 0 && <br />}
            {part}
          </span>
        ))}
      </span>
    )
  }
  if (kind === 'terminalLabel') {
    return (
      <span className="ipsos-terminal-label" style={nodeStyle(node)}>
        {node.text}
      </span>
    )
  }

  return (
    <div className={cn('ipsos-node', node.variant && `ipsos-node-${node.variant}`)} style={nodeStyle(node)}>
      {node.text}
      {node.small && <small>{node.small}</small>}
      {node.role && <span className="ipsos-role-badge">{node.role}</span>}
    </div>
  )
}

// ---- Orthogonal connector router (ported from the design reference) ----
// Rewrites the straight <line>s into right-angle <path>s that snap to node
// ports, route around boxes, and merge parallel branches into shared trunks.
const ROUTER_NS = 'http://www.w3.org/2000/svg'
const ROUTER_SNAP = 36
const ROUTER_PAD = 6

type RouterDir = 'u' | 'd' | 'l' | 'r' | null
interface RouterObstacle { el: Element; left: number; right: number; top: number; bottom: number }
interface RouterPort { x: number; y: number; dir: RouterDir }
interface RouterEdge { el: Element; sNode: RouterObstacle | null; tNode: RouterObstacle | null; sp: RouterPort; tp: RouterPort }

function routerObstacles(svg: SVGSVGElement): RouterObstacle[] {
  const diagram = svg.parentElement
  if (!diagram) return []
  const dRect = diagram.getBoundingClientRect()
  const out: RouterObstacle[] = []
  diagram.querySelectorAll('.ipsos-node, .ipsos-decision, .ipsos-terminus').forEach((n) => {
    const r = n.getBoundingClientRect()
    out.push({ el: n, left: r.left - dRect.left, right: r.right - dRect.left, top: r.top - dRect.top, bottom: r.bottom - dRect.top })
  })
  return out
}

function routerNearest(x: number, y: number, list: RouterObstacle[]): RouterObstacle | null {
  let best: RouterObstacle | null = null
  let bestD = Infinity
  for (const o of list) {
    const dx = Math.max(o.left - x, 0, x - o.right)
    const dy = Math.max(o.top - y, 0, y - o.bottom)
    const d = Math.hypot(dx, dy)
    if (d < bestD) { bestD = d; best = o }
  }
  return bestD <= ROUTER_SNAP ? best : null
}

function routerPort(node: RouterObstacle, towardX: number, towardY: number): RouterPort {
  const cx = (node.left + node.right) / 2
  const cy = (node.top + node.bottom) / 2
  const dx = towardX - cx
  const dy = towardY - cy
  if (Math.abs(dy) >= 30) return dy >= 0 ? { x: cx, y: node.bottom, dir: 'd' } : { x: cx, y: node.top, dir: 'u' }
  return dx >= 0 ? { x: node.right, y: cy, dir: 'r' } : { x: node.left, y: cy, dir: 'l' }
}

function routerHClear(y: number, x1: number, x2: number, list: RouterObstacle[], skip: Array<RouterObstacle | null>): boolean {
  const a = Math.min(x1, x2), b = Math.max(x1, x2)
  for (const o of list) {
    if (skip.indexOf(o) !== -1) continue
    if (y >= o.top - ROUTER_PAD && y <= o.bottom + ROUTER_PAD && b >= o.left - 2 && a <= o.right + 2) return false
  }
  return true
}
function routerVClear(x: number, y1: number, y2: number, list: RouterObstacle[], skip: Array<RouterObstacle | null>): boolean {
  const a = Math.min(y1, y2), b = Math.max(y1, y2)
  for (const o of list) {
    if (skip.indexOf(o) !== -1) continue
    if (x >= o.left - ROUTER_PAD && x <= o.right + ROUTER_PAD && b >= o.top - 2 && a <= o.bottom + 2) return false
  }
  return true
}
function routerMidY(sy: number, ty: number, sx: number, tx: number, list: RouterObstacle[], skip: Array<RouterObstacle | null>): number {
  const ideal = Math.round((sy + ty) / 2)
  if (routerHClear(ideal, sx, tx, list, skip)) return ideal
  for (let d = 4; d < 240; d += 4) for (const y of [ideal - d, ideal + d]) if (routerHClear(y, sx, tx, list, skip)) return y
  return ideal
}
function routerMidX(sx: number, tx: number, sy: number, ty: number, list: RouterObstacle[], skip: Array<RouterObstacle | null>): number {
  const ideal = Math.round((sx + tx) / 2)
  if (routerVClear(ideal, sy, ty, list, skip)) return ideal
  for (let d = 4; d < 240; d += 4) for (const x of [ideal - d, ideal + d]) if (routerVClear(x, sy, ty, list, skip)) return x
  return ideal
}
function routerPath(sp: RouterPort, tp: RouterPort, list: RouterObstacle[], skip: Array<RouterObstacle | null>): string {
  const sx = Math.round(sp.x), sy = Math.round(sp.y)
  const tx = Math.round(tp.x), ty = Math.round(tp.y)
  const ALIGN = 20
  if (Math.abs(sx - tx) <= ALIGN) return `M ${Math.round((sx + tx) / 2)} ${sy} V ${ty}`
  if (Math.abs(sy - ty) <= ALIGN) return `M ${sx} ${Math.round((sy + ty) / 2)} H ${tx}`
  const sV = sp.dir === 'u' || sp.dir === 'd'
  const tV = tp.dir === 'u' || tp.dir === 'd'
  if (sV && !tV) return `M ${sx} ${sy} V ${ty} H ${tx}`
  if (!sV && tV) return `M ${sx} ${sy} H ${tx} V ${ty}`
  if (sV && tV) { const midY = routerMidY(sy, ty, sx, tx, list, skip); return `M ${sx} ${sy} V ${midY} H ${tx} V ${ty}` }
  const midX = routerMidX(sx, tx, sy, ty, list, skip)
  return `M ${sx} ${sy} H ${midX} V ${ty} H ${tx}`
}
function routerEndpoints(el: Element): [number, number, number, number] | null {
  if (el.tagName.toLowerCase() !== 'line') return null
  return [
    parseFloat(el.getAttribute('x1') || '0'),
    parseFloat(el.getAttribute('y1') || '0'),
    parseFloat(el.getAttribute('x2') || '0'),
    parseFloat(el.getAttribute('y2') || '0'),
  ]
}
function routeIpsosWires(svg: SVGSVGElement) {
  if (svg.dataset.routed) return
  if (!svg.parentElement || svg.parentElement.offsetWidth === 0) return
  const list = routerObstacles(svg)
  const edges: RouterEdge[] = []
  Array.from(svg.children).forEach((el) => {
    const ep = routerEndpoints(el)
    if (!ep) return
    const [x1, y1, x2, y2] = ep
    const sNode = routerNearest(x1, y1, list)
    const tNode = routerNearest(x2, y2, list)
    const sp: RouterPort = sNode
      ? routerPort(sNode, x2, y2)
      : { x: x1, y: y1, dir: Math.abs(y2 - y1) >= Math.abs(x2 - x1) ? (y2 > y1 ? 'd' : 'u') : (x2 > x1 ? 'r' : 'l') }
    let tp: RouterPort
    if (tNode) {
      const fromX = sNode ? (sNode.left + sNode.right) / 2 : sp.x
      const fromY = sNode ? (sNode.top + sNode.bottom) / 2 : sp.y
      tp = routerPort(tNode, fromX, fromY)
    } else {
      tp = { x: x2, y: y2, dir: null }
    }
    edges.push({ el, sNode, tNode, sp, tp })
  })

  const epKey = (p: RouterPort) => `${Math.round(p.x)},${Math.round(p.y)}`
  const bySource = new Map<string, RouterEdge[]>()
  const byTarget = new Map<string, RouterEdge[]>()
  for (const e of edges) {
    const isVert = (e.sp.dir === 'u' || e.sp.dir === 'd') && (e.tp.dir === 'u' || e.tp.dir === 'd')
    if (!isVert) continue
    const sk = epKey(e.sp), tk = epKey(e.tp)
    if (!bySource.has(sk)) bySource.set(sk, [])
    bySource.get(sk)!.push(e)
    if (!byTarget.has(tk)) byTarget.set(tk, [])
    byTarget.get(tk)!.push(e)
  }

  const groupY = new Map<string, number>()
  const trunkY = (group: RouterEdge[], divergent: boolean): number => {
    const minTx = Math.min(...group.map((g) => g.tp.x)), maxTx = Math.max(...group.map((g) => g.tp.x))
    const minSx = Math.min(...group.map((g) => g.sp.x)), maxSx = Math.max(...group.map((g) => g.sp.x))
    const spanMin = divergent ? Math.min(minTx, group[0].sp.x) : Math.min(minSx, group[0].tp.x)
    const spanMax = divergent ? Math.max(maxTx, group[0].sp.x) : Math.max(maxSx, group[0].tp.x)
    const sy = Math.max(...group.map((g) => g.sp.y)), ty = Math.min(...group.map((g) => g.tp.y))
    const ideal = Math.round((sy + ty) / 2)
    const skip = group.flatMap((g) => [g.sNode, g.tNode].filter(Boolean) as RouterObstacle[])
    if (routerHClear(ideal, spanMin, spanMax, list, skip)) return ideal
    for (let d = 4; d < 240; d += 4) for (const y of [ideal - d, ideal + d]) if (routerHClear(y, spanMin, spanMax, list, skip)) return y
    return ideal
  }
  for (const [sk, group] of bySource) if (group.length >= 2) groupY.set(`s:${sk}`, trunkY(group, true))
  for (const [tk, group] of byTarget) {
    if (group.length < 2) continue
    const filtered = group.filter((e) => (bySource.get(epKey(e.sp)) || []).length === 1)
    if (filtered.length >= 2) groupY.set(`t:${tk}`, trunkY(filtered, false))
  }

  edges.forEach((e) => {
    const sk = epKey(e.sp), tk = epKey(e.tp)
    let midY: number | null = null
    if ((bySource.get(sk) || []).length >= 2 && groupY.has(`s:${sk}`)) midY = groupY.get(`s:${sk}`)!
    else if ((byTarget.get(tk) || []).length >= 2 && groupY.has(`t:${tk}`)) midY = groupY.get(`t:${tk}`)!
    let d: string
    if (midY !== null) {
      const sx = Math.round(e.sp.x), sy = Math.round(e.sp.y), tx = Math.round(e.tp.x), ty = Math.round(e.tp.y)
      d = Math.abs(sx - tx) <= 14 ? `M ${Math.round((sx + tx) / 2)} ${sy} V ${ty}` : `M ${sx} ${sy} V ${midY} H ${tx} V ${ty}`
    } else {
      d = routerPath(e.sp, e.tp, list, [e.sNode, e.tNode].filter(Boolean) as RouterObstacle[])
    }
    const p = document.createElementNS(ROUTER_NS, 'path')
    p.setAttribute('d', d)
    if (e.el.classList.contains('dashed')) p.setAttribute('class', 'dashed')
    svg.replaceChild(p, e.el)
  })
  svg.dataset.routed = '1'
}

function StageDiagram({ stage }: { stage: WorkflowStage }) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    // Route after layout so node bounding boxes are measurable.
    const raf = requestAnimationFrame(() => routeIpsosWires(svg))
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div className="ipsos-diagram" style={{ width: `${stage.width}px`, height: `${stage.height}px` }}>
      <svg ref={svgRef} className="ipsos-wires" width={stage.width} height={stage.height} viewBox={`0 0 ${stage.width} ${stage.height}`}>
        {stage.lines.map((edge, index) => (
          <line
            key={index}
            x1={edge.x1}
            y1={edge.y1}
            x2={edge.x2}
            y2={edge.y2}
            className={edge.dashed ? 'dashed' : undefined}
          />
        ))}
      </svg>
      {stage.nodes.map((node, index) => (
        <WorkflowNodeView key={index} node={node} />
      ))}
    </div>
  )
}

// Smoothly scroll the widget's own scroll container so an opened stage's header
// lands flush under the sticky top nav (easeInOutQuad, distance-scaled duration).
function scrollSectionIntoView(section: HTMLElement | null) {
  if (!section) return
  const widget = section.closest('.ipsos-workflow') as HTMLElement | null
  if (!widget) return
  const sticky = widget.querySelector('.ipsos-sticky-top') as HTMLElement | null
  const stickyH = sticky ? sticky.offsetHeight : 0
  const rawTarget = widget.scrollTop + section.getBoundingClientRect().top - widget.getBoundingClientRect().top - stickyH
  const endTop = Math.max(0, Math.min(rawTarget, widget.scrollHeight - widget.clientHeight))
  const startTop = widget.scrollTop
  const dist = endTop - startTop
  if (Math.abs(dist) < 2) return
  const dur = Math.min(320, Math.max(120, Math.abs(dist) * 0.35))
  const t0 = performance.now()
  const step = (now: number) => {
    const p = Math.min(1, (now - t0) / dur)
    const ease = p < 0.5 ? 2 * p * p : -1 + (4 - 2 * p) * p
    widget.scrollTop = startTop + dist * ease
    if (p < 1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}

function StageSection({ stage, open, onToggle }: { stage: WorkflowStage; open: boolean; onToggle: (next: boolean) => void }) {
  const detailsRef = useRef<HTMLDetailsElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)

  // Opening is instant (the body mounts at full height); then scroll it under
  // the sticky nav. Opening another stage closes this one instantly via `open`.
  useEffect(() => {
    if (!open) return
    const raf = requestAnimationFrame(() => scrollSectionIntoView(detailsRef.current))
    return () => cancelAnimationFrame(raf)
  }, [open])

  const handleSummaryClick = (event: React.MouseEvent) => {
    event.preventDefault()
    if (!open) {
      onToggle(true)
      return
    }
    // Animate the body collapse, then unmount it.
    const body = bodyRef.current
    if (!body) {
      onToggle(false)
      return
    }
    const startH = body.offsetHeight
    body.style.height = `${startH}px`
    body.style.overflow = 'hidden'
    requestAnimationFrame(() => {
      body.style.transition = 'height 0.24s ease, opacity 0.16s ease'
      body.style.opacity = '0'
      body.style.height = '0'
    })
    const done = (ev: TransitionEvent) => {
      if (ev.propertyName !== 'height') return
      body.removeEventListener('transitionend', done)
      onToggle(false)
    }
    body.addEventListener('transitionend', done)
  }

  return (
    <details ref={detailsRef} className="ipsos-section" open={open}>
      <summary onClick={handleSummaryClick}>
        <span className="num">{stage.number}</span>
        <div>
          <h2>{stage.title}</h2>
          <p>{stage.description}</p>
        </div>
        <span className="meta"><span>{stage.stepCount}</span></span>
        <svg className="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </summary>
      {open && (
        <div ref={bodyRef} className="ipsos-stage-body">
          <StageDiagram stage={stage} />
        </div>
      )}
    </details>
  )
}

export function IpsosWorkflowWidget() {
  const [activeTab, setActiveTab] = useState<'overview' | 'detailed'>('overview')
  const [legendOpen, setLegendOpen] = useState(false)
  const [openStage, setOpenStage] = useState<string | null>(null)
  const workflowRef = useRef<HTMLDivElement>(null)

  // Keep the sticky stage headers aligned just under the (variable-height) top nav.
  useEffect(() => {
    const widget = workflowRef.current
    const sticky = widget?.querySelector('.ipsos-sticky-top') as HTMLElement | null
    if (!widget || !sticky) return
    const update = () => widget.style.setProperty('--summary-sticky-top', `${sticky.offsetHeight}px`)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(sticky)
    return () => observer.disconnect()
  }, [])

  return (
    <div className="relative left-1/2 -ml-[50vw] my-10 w-screen px-4 sm:px-8">
      <style>{workflowCss}</style>
      <div ref={workflowRef} className="ipsos-workflow" data-testid="ipsos-workflow-widget">
        <div className="ipsos-sticky-top">
          <header className="ipsos-header">
            <div className="ipsos-header-left">
              <div className="ipsos-icon" aria-hidden>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
              </div>
              <div>
                <div className="ipsos-title">Ipsos Research Workflow</div>
                <div className="ipsos-subtitle">
                  Current state — 8 stages, ~152 steps
                  <span className="ipsos-subtitle-sep" aria-hidden />
                  <span className="ipsos-callout-inline">
                    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                      <rect x="7.25" y="6.5" width="1.5" height="5" rx=".75" fill="currentColor" />
                      <circle cx="8" cy="4.5" r=".85" fill="currentColor" />
                    </svg>
                    More sub-steps inside
                  </span>
                </div>
              </div>
            </div>
            <div className="ipsos-legend">
              <button
                type="button"
                className="ipsos-legend-button"
                aria-expanded={legendOpen}
                onClick={() => setLegendOpen((open) => !open)}
              >
                {/* "info" glyph (ⓘ): dot on top, stem below — the correct
                    semantic for a legend. (The CodePen reference used an
                    alert/exclamation glyph here, which reads as a warning.) */}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="12" x2="12" y2="16" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                {legendOpen ? 'Hide legend' : 'Legend'}
              </button>
              {legendOpen && (
                <div className="ipsos-legend-panel">
                  <div>
                    <div className="ipsos-legend-label">Roles</div>
                    <div className="ipsos-legend-roles">
                      {['Client', 'Ipsos Research', 'Ipsos Science', 'Ipsos Operations'].map((label, index) => (
                        <div key={label} className={cn('ipsos-legend-role', index === 0 && 'client')}>
                          <span>{['C', 'Ir', 'Is', 'Io'][index]}</span>
                          {label}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="ipsos-legend-label">Tools</div>
                    <div className="ipsos-legend-tools">
                      <LegendTool color={toolColors.office} label="Office 365" />
                      <LegendTool color={toolColors.finance} label="Project & Finance" count="3" />
                      <LegendTool color={toolColors.ops} label="Operations & Scheduling" count="3" />
                      <LegendTool color={toolColors.survey} label="Survey & Reporting" count="3" />
                      <LegendTool color={toolColors.field} label="Field & Sample" count="2" />
                      <LegendTool color={toolColors.media} label="Media & Translation" count="2" />
                      <LegendTool color={toolColors.analytics} label="Analytics & Dashboard" count="6" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </header>

          <nav className="ipsos-tabs" aria-label="Ipsos workflow views">
            <button
              type="button"
              className={cn('ipsos-tab', activeTab === 'overview' && 'active')}
              onClick={() => setActiveTab('overview')}
            >
              Overview
            </button>
            <button
              type="button"
              className={cn('ipsos-tab', activeTab === 'detailed' && 'active')}
              onClick={() => setActiveTab('detailed')}
            >
              Detailed stages
            </button>
          </nav>
        </div>

        <svg width="0" height="0" className="absolute" aria-hidden>
          <defs>
            <marker id="ipsos-workflow-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#9a9690" />
            </marker>
          </defs>
        </svg>

        {activeTab === 'overview' ? (
          <div className="ipsos-summary-scroll ipsos-tab-fade">
            <div className="ipsos-summary-grid">
              {summaryStages.map((stage) => (
                <div key={stage.number} className={cn('ipsos-summary-col', 'invo' in stage && stage.invo && 'invo')}>
                  <div className="ipsos-summary-hdr">
                    <span className="snum">{stage.number}</span>
                    <span className="stitle">{stage.title}</span>
                  </div>
                  <div className="ipsos-summary-items">
                    {stage.items.map(([tool, item], index) => (
                      <div className="ipsos-summary-item" key={`${stage.number}-${index}`}>
                        <div className="item-bar" style={{ background: toolColors[tool] }} />
                        <div className="item-txt">{item}</div>
                      </div>
                    ))}
                  </div>
                  <div className="ipsos-summary-dots">
                    {stage.tools.map((tool) => (
                      <span key={tool} className="ipsos-summary-dot" style={{ background: toolColors[tool] }} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="ipsos-detailed ipsos-tab-fade">
            {stages.map((stage) => (
              <StageSection
                key={stage.number}
                stage={stage}
                open={openStage === stage.number}
                onToggle={(next) => setOpenStage(next ? stage.number : null)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function LegendTool({ color, label, count }: { color: string; label: string; count?: string }) {
  return (
    <span className="ipsos-legend-tool">
      <span style={{ background: color }} />
      {label}
      {count && <em>({count})</em>}
    </span>
  )
}

const workflowCss = `
.ipsos-workflow {
  --bg: #fafaf9;
  --panel: #ffffff;
  --ink: #18181b;
  --ink-2: #3f3f46;
  --ink-3: #71717a;
  --ink-4: #a1a1aa;
  --rule: #e8e6e3;
  --rule-2: #f1efec;
  --c-o365: #a82428;
  --c-finance: #c8a800;
  --c-ops: #c87080;
  --c-survey: #2c4fa0;
  --c-field: #6888bc;
  --c-media: #1a3888;
  --c-analytics: #7a4a90;
  font: 13px/1.5 "Inter", "Helvetica Neue", Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  color: var(--ink);
  background: var(--bg);
  border: 1px solid var(--rule);
  border-radius: 16px;
  overflow: auto;
  scrollbar-gutter: stable;
  box-shadow: 0 2px 4px rgba(24,24,27,0.04), 0 16px 48px -16px rgba(24,24,27,0.12);
  width: min(100%, 1320px);
  min-height: 420px;
  max-height: 50vh;
  margin: 0 auto;
}
.ipsos-workflow * { box-sizing: border-box; }
.ipsos-sticky-top { position: sticky; top: 0; z-index: 200; background: var(--panel); }
.ipsos-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 16px 20px; background: var(--panel); border-bottom: 1px solid var(--rule); }
.ipsos-header-left { display: flex; align-items: center; gap: 12px; min-width: 0; flex: 1; overflow: hidden; }
.ipsos-icon { width: 32px; height: 32px; border-radius: 8px; background: var(--ink); color: #fff; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.ipsos-title { font-size: 14px; font-weight: 700; letter-spacing: -0.01em; color: var(--ink); }
.ipsos-subtitle { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--ink-3); flex-wrap: wrap; }
.ipsos-subtitle-sep { width: 1px; height: 11px; background: var(--rule); flex-shrink: 0; }
.ipsos-callout-inline { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 500; color: #1d4ed8; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 999px; padding: 2px 8px 2px 5px; line-height: 1; white-space: nowrap; }
.ipsos-callout-inline svg { flex-shrink: 0; }
.ipsos-legend { position: relative; display: inline-flex; flex-direction: column; align-items: flex-end; }
.ipsos-legend-button { appearance: none; display: inline-flex; align-items: center; gap: 6px; background: var(--ink); color: #fff; border: none; border-radius: 999px; padding: 7px 14px 7px 10px; font: 12px/1 "Inter", sans-serif; font-weight: 600; cursor: pointer; box-shadow: 0 2px 8px -2px rgba(24,24,27,0.3); transition: background .12s, transform .1s; white-space: nowrap; }
.ipsos-legend-button:hover { background: #27272a; transform: translateY(-1px); }
.ipsos-legend-panel { display: flex; flex-direction: column; gap: 20px; background: var(--panel); border: 1px solid var(--rule); border-radius: 12px; padding: 16px 18px 18px; box-shadow: 0 4px 24px -8px rgba(24,24,27,0.18), 0 1px 3px rgba(24,24,27,0.08); min-width: 240px; width: max-content; position: absolute; top: calc(100% + 10px); right: 0; z-index: 300; }
.ipsos-legend-label { font-size: 10px; font-weight: 600; letter-spacing: 0.12em; color: var(--ink-4); text-transform: uppercase; margin-bottom: 8px; }
.ipsos-legend-roles, .ipsos-legend-tools { display: flex; flex-direction: column; gap: 6px; }
.ipsos-legend-role, .ipsos-legend-tool { display: inline-flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 500; color: var(--ink-2); white-space: nowrap; }
.ipsos-legend-role span { width: 22px; height: 22px; border-radius: 50%; border: 1.5px solid var(--ink-2); display: inline-flex; align-items: center; justify-content: center; font-size: 8px; font-weight: 700; letter-spacing: -0.3px; background: #fff; color: var(--ink-2); flex-shrink: 0; }
.ipsos-legend-role.client span { background: var(--ink); border-color: var(--ink); color: #fff; }
.ipsos-legend-tool span { width: 12px; height: 12px; border-radius: 3px; flex-shrink: 0; }
.ipsos-legend-tool em { color: var(--ink-4); font-style: normal; }
.ipsos-tabs { display: flex; align-items: center; gap: 0; padding: 0 16px; background: var(--panel); border-bottom: 1px solid var(--rule); }
.ipsos-tab { appearance: none; background: none; border: none; border-bottom: 2px solid transparent; padding: 10px 12px; font: 12.5px/1 "Inter", sans-serif; font-weight: 500; color: var(--ink-3); cursor: pointer; transition: color .12s, border-color .12s; margin-bottom: -1px; white-space: nowrap; }
.ipsos-tab:hover { color: var(--ink-2); }
.ipsos-tab.active { color: var(--ink); border-bottom-color: var(--ink); font-weight: 600; }
@keyframes ipsosTabFade { from { opacity: 0 } to { opacity: 1 } }
.ipsos-tab-fade { animation: ipsosTabFade 0.2s ease; }
.ipsos-summary-scroll { overflow: auto; padding: 20px; background: var(--bg); }
.ipsos-summary-grid { display: flex; gap: 0; min-width: fit-content; max-width: 960px; width: 100%; margin: 0 auto; border: 1px solid var(--rule); border-radius: 8px; overflow: hidden; }
.ipsos-summary-col { flex: 1; min-width: 0; display: flex; flex-direction: column; border-right: 1px solid var(--rule); }
.ipsos-summary-col:last-child { border-right: none; }
.ipsos-summary-hdr { background: #f0eeec; padding: 10px 10px 8px; display: flex; flex-direction: column; gap: 2px; height: 60px; justify-content: center; border-bottom: 1px solid var(--rule); }
.ipsos-summary-hdr .snum { font-size: 11px; font-weight: 600; color: var(--ink-3); line-height: 1; }
.ipsos-summary-hdr .stitle { font-size: 14px; font-weight: 600; color: var(--ink); letter-spacing: -0.01em; line-height: 1.22; }
.ipsos-summary-col.invo > .ipsos-summary-hdr { border-top: 3px solid #E36216; background: #fef5ee; }
.ipsos-summary-col.invo > .ipsos-summary-hdr .snum { color: #E36216; }
.ipsos-summary-items { flex: 1; background: var(--panel); }
.ipsos-summary-item { display: flex; align-items: stretch; border-bottom: 1px solid var(--rule-2); }
.ipsos-summary-item:last-child { border-bottom: none; }
.item-bar { width: 3px; flex-shrink: 0; }
.item-txt { padding: 5px 8px; font-size: 12px; color: var(--ink-2); line-height: 1.3; }
.ipsos-summary-dots { display: flex; gap: 4px; padding: 7px 10px; background: var(--bg); border-top: 1px solid var(--rule-2); flex-wrap: wrap; min-height: 26px; align-items: center; }
.ipsos-summary-dot { width: 11px; height: 11px; border-radius: 2px; flex-shrink: 0; }
.ipsos-section { border-bottom: 1px solid var(--rule-2); background: var(--panel); }
.ipsos-section:last-child { border-bottom: none; }
.ipsos-section[open] { background: var(--bg); }
.ipsos-section > summary { list-style: none; cursor: pointer; padding: 14px 20px; display: grid; grid-template-columns: 28px 1fr auto auto; gap: 12px; align-items: center; user-select: none; position: sticky; top: var(--summary-sticky-top, 94px); z-index: 10; background: var(--panel); border-bottom: 1px solid transparent; }
.ipsos-section > summary::-webkit-details-marker { display: none; }
.ipsos-section > summary:hover { background: #faf9f7; }
.ipsos-section[open] > summary { background: #f5f4f1; border-bottom-color: var(--rule-2); }
.ipsos-section .num { width: 24px; height: 24px; border-radius: 50%; background: var(--ink); color: #fff; font-weight: 600; font-size: 11px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.ipsos-section h2 { font: 600 14px/1.2 "Inter", sans-serif; letter-spacing: -0.01em; margin: 0; color: var(--ink); }
.ipsos-section p { font: 11.5px/1.45 "Inter", sans-serif; color: var(--ink-3); margin: 2px 0 0; }
.ipsos-section .meta { display: inline-flex; gap: 6px; font-size: 11px; color: var(--ink-3); align-items: center; }
.ipsos-section .meta span { padding: 2px 7px; border: 1px solid var(--rule); border-radius: 999px; background: #fafaf9; white-space: nowrap; }
.ipsos-section .chev { width: 18px; height: 18px; color: var(--ink-4); transition: transform .2s; flex-shrink: 0; }
.ipsos-section[open] .chev { transform: rotate(90deg); }
.ipsos-stage-body { border-top: 1px solid var(--rule-2); background: linear-gradient(180deg, #f8f7f5 0%, #fff 60px); overflow-x: auto; overflow-y: hidden; padding: 24px 20px 28px; }
.ipsos-diagram { position: relative; margin: 0; }
.ipsos-wires { position: absolute; inset: 0; display: block; pointer-events: none; z-index: 1; }
.ipsos-wires path, .ipsos-wires line { fill: none; stroke: #c4c1bc; stroke-width: 1.25; stroke-linecap: round; stroke-linejoin: round; marker-end: url(#ipsos-workflow-arrow); }
.ipsos-wires .dashed { stroke-dasharray: 4 3; }
.ipsos-node { position: absolute; min-width: 116px; max-width: 240px; padding: 9px 6px; border-radius: 1px; font-size: 14px; line-height: 1.32; font-weight: 500; color: var(--ink); background: var(--panel); border: 1px solid var(--rule); box-shadow: 0 1px 3px rgba(24,24,27,0.07), 0 4px 12px -4px rgba(24,24,27,0.10); text-align: center; transition: transform .12s, box-shadow .12s; z-index: 2; }
.ipsos-node:hover { transform: translateY(-1px); box-shadow: 0 4px 12px -4px rgba(24,24,27,0.10); z-index: 4; }
.ipsos-node small { display: block; font-size: 12px; color: var(--ink-3); font-weight: 500; margin-top: 2px; }
.ipsos-node-office { border-left: 3px solid var(--c-o365); }
.ipsos-node-finance { border-left: 3px solid var(--c-finance); }
.ipsos-node-ops { border-left: 3px solid var(--c-ops); }
.ipsos-node-survey, .ipsos-node-field { border-left: 3px solid var(--c-survey); }
.ipsos-node-media { border-left: 3px solid var(--c-media); }
.ipsos-node-analytics { border-left: 3px solid var(--c-analytics); }
.ipsos-node-plain, .ipsos-node-reports { color: var(--ink); }
.ipsos-decision { position: absolute; width: 18px; height: 18px; transform: rotate(45deg); background: #fff; border: 1.5px solid var(--ink-2); box-shadow: 0 1px 3px rgba(24,24,27,0.07), 0 4px 12px -4px rgba(24,24,27,0.10); z-index: 2; }
.ipsos-terminus { position: absolute; width: 22px; height: 22px; border-radius: 50%; background: var(--ink); border: 1.5px solid var(--ink); color: #fff; font-size: 10.5px; font-weight: 700; letter-spacing: -0.3px; display: flex; align-items: center; justify-content: center; line-height: 1; z-index: 2; }
.ipsos-terminus-open { background:#fff; border:2px solid var(--ink); color: var(--ink); }
.ipsos-role-badge { position: absolute; width: auto; min-width: 20px; height: 20px; padding: 0 5px; border-radius: 999px; background: var(--panel); border: 1.5px solid var(--ink-2); font-size: 12px; font-weight: 700; letter-spacing: -0.4px; display: flex; align-items: center; justify-content: center; left: -10px; top: -10px; z-index: 3; color: var(--ink-2); box-shadow: 0 1px 2px rgba(24,24,27,0.08); line-height: 1; }
.ipsos-terminal-label { position: absolute; font-size: 12px; font-weight: 500; color: #d23a3a; z-index: 5; line-height: 1.2; padding-left: 16px; white-space: normal; max-width: 140px; }
.ipsos-note { position: absolute; font-size: 12px; color: var(--ink-3); line-height: 1.25; z-index: 5; background: var(--bg); padding: 0 3px; max-width: 160px; word-wrap: break-word; white-space: normal; }
.ipsos-ann { position: absolute; font-size: 12px; color: var(--ink-3); background: var(--panel); padding: 1px 6px; border-radius: 1px; line-height: 1.2; text-align: center; font-weight: 500; z-index: 5; }
.ipsos-ann-warn { color:#b6442b; background:#fde9e4; }
.ipsos-ann-ok { color:#1a6830; background:#c8ecd2; }
.ipsos-ann-neutral { color: var(--ink-2); background:#e5e5e3; }
@media (max-width: 760px) {
  .ipsos-workflow { max-height: 70vh; }
  .ipsos-header { align-items: flex-start; flex-direction: column; }
  .ipsos-legend { align-items: flex-start; }
  .ipsos-legend-panel { left: 0; right: auto; }
  .ipsos-summary-grid { min-width: 880px; }
  .ipsos-section > summary { grid-template-columns: 28px 1fr auto; top: var(--summary-sticky-top, 129px); }
  .ipsos-section .meta { display: none; }
}
`
