import type { GuidedTutorialDefinition } from '../components/GuidedTutorialOverlay'

export const DESIGNER_WORKFLOW_TUTORIAL_STORAGE_KEY = 'goinvo.marketing.designerWorkflow.tutorials.completed'

export const designerWorkflowTutorials: GuidedTutorialDefinition[] = [
  {
    id: 'marketing-view-tour',
    title: 'Marketing view tour',
    description: 'Learn how the Marketing view and Marketing autopilot help you start connected planning work without creating records during the tour.',
    steps: [
      {
        id: 'open-widget',
        targetId: 'designer-workflow-toggle',
        instruction: 'Start with Marketing autopilot',
        description: 'This bottom-right tool is the fastest path from a loose content idea to the research plan designers need before scheduling content.',
        nextLabel: 'Open it',
      },
      {
        id: 'workflow-panel',
        targetId: 'designer-workflow-panel',
        instruction: 'This is the workflow panel',
        description: 'The panel keeps setup work separate from the rest of Marketing, so you can plan without losing your place.',
      },
      {
        id: 'sessions',
        targetId: 'designer-workflow-sessions-button',
        instruction: 'Use Sessions to resume work',
        description: 'Each workflow session is saved locally, like a lightweight chat history. You can reopen older setup runs instead of starting over.',
      },
      {
        id: 'choose-path',
        targetId: 'designer-workflow-path-plan',
        instruction: 'Choose an action',
        description: 'Search the assistant actions, then choose a recommended setup path or jump straight into the section that needs work. After you choose a setup path, the next tutorial starts only when you actually ask for a suggestion.',
        nextLabel: 'Finish tour',
      },
    ],
  },
  {
    id: 'designer-workflow-recommendation',
    title: 'Recommendation tour',
    description: 'Learn how to read a real AI recommendation after you click Suggest next step.',
    steps: [
      {
        id: 'recommendation-steps',
        targetId: 'designer-workflow-recommendation-steps',
        instruction: 'Review the generated steps',
        description: 'These steps are based on the current marketing state and your optional direction. If a plan already exists, the assistant points to the next action inside it instead of making a duplicate.',
      },
      {
        id: 'open-next-step',
        targetId: 'designer-workflow-open-next-step',
        instruction: 'Open the next place to work',
        description: 'Use this to jump to Research, Calendar, Channels, or Analytics. Create a first research project only when no plan exists yet.',
        nextLabel: 'Finish tour',
      },
    ],
  },
  {
    id: 'designer-workflow-sessions',
    title: 'Marketing autopilot sessions',
    description: 'Learn how to resume, switch, and clear local Marketing autopilot setup sessions.',
    steps: [
      {
        id: 'open-widget',
        targetId: 'designer-workflow-toggle',
        instruction: 'Open Marketing autopilot',
        description: 'Sessions live inside the workflow panel so setup history stays close to the task.',
      },
      {
        id: 'sessions',
        targetId: 'designer-workflow-sessions-button',
        instruction: 'Open Sessions',
        description: 'The Sessions list shows recent planning runs, whether they are one-item shells or larger plans.',
      },
      {
        id: 'sessions-list',
        targetId: 'designer-workflow-sessions-list',
        instruction: 'Resume or start fresh',
        description: 'Pick an existing session to continue, delete a stale one, or start a new session when the work has changed.',
      },
    ],
  },
]

export const defaultDesignerWorkflowTutorial = designerWorkflowTutorials[0]

export function getDesignerWorkflowTutorial(id?: string | null) {
  const normalizedId = id === 'designer-workflow-setup' ? 'marketing-view-tour' : id
  return designerWorkflowTutorials.find((tutorial) => tutorial.id === normalizedId) || defaultDesignerWorkflowTutorial
}
