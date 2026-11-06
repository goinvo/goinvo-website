import type { PrototypeId } from './WorkPrototype'

/** Shown above every exploded prototype: why we work at this level of detail. */
export const detailInsight = { eyebrow: 'Why the details matter', statement: 'People trust a system one detail at a time. Get the small decisions right and they stop working around it.' }

export const prototypeScenes: { id: PrototypeId; title: string; client: string; challenge: string; situation: string; task: string; audience: string; href: string; problems: string[]; solutions: string[]; emphasis: string[]; reasoning: string[]; targets: { x: number; y: number; dx: number; dy: number }[]; annotationCells: { column: number; span: number; row: number }[] }[] = [
  {
    id: 'clinical', title: 'Clinical Evidence Engine', client: 'Clinical decision support',
    challenge: 'Trust in AI', audience: 'Clinical product teams',
    situation: 'I can’t tell whether to trust an AI answer.',
    task: 'We designed a clinical workflow that makes AI recommendations open to scrutiny: the recommendation, its sources, and the reasons to trust—or question—it, together.',
    href: '/work/clinical-evidence-engine',
    problems: ['Evidence scattered across sources.', 'An answer without its reasoning.', 'Confidence that is hard to judge.'],
    solutions: ['Keep evidence close.', 'Design around patient details.', 'Question the confidence.'],
    emphasis: ['Keep', 'Design', 'Question'],
    reasoning: ['A claim without its source gets taken on faith. Beside it, the source can be checked at a glance.', 'Generic advice can be wrong for this patient. With their details in view, a clinician can tell.', 'A bare score asks for blind trust. Showing its inputs lets clinicians weigh it themselves.'],
    targets: [{ x: 480, y: 540, dx: -170, dy: 70 }, { x: 480, y: 260, dx: 60, dy: 0 }, { x: 1118, y: 330, dx: 100, dy: 30 }],
    annotationCells: [{ column: 1, span: 2, row: 3 }, { column: 5, span: 4, row: 1 }, { column: 10, span: 3, row: 1 }],
  },
  {
    id: 'prior', title: 'Prior Authorization', client: 'Cancer treatment review',
    challenge: 'Fragmented workflows', audience: 'Care & operations teams',
    situation: 'My team spends more time finding information than reviewing it.',
    task: 'We redesigned the review workflow around patient context, history, and the reviewer’s notes—less detective work between a patient and their treatment.',
    href: '/work/prior-auth',
    problems: ['Patient context scattered across records.', 'A history rebuilt by hand.', 'Notes that interrupt the review.'],
    solutions: ['Keep context visible.', 'Read history in order.', 'Keep notes in context.'],
    emphasis: ['Keep', 'Read', 'Keep'],
    reasoning: ['Without the patient in view, records get read out of context. Pinned above, every page is judged for them.', 'Scattered treatments hide the story. On one timeline, a reviewer sees it at a glance.', 'Notes in another window break the review. Beside the record, they’re taken while reading.'],
    targets: [{ x: 650, y: 23, dx: 0, dy: -100 }, { x: 333, y: 460, dx: -100, dy: 45 }, { x: 918, y: 776, dx: 80, dy: 95 }],
    annotationCells: [{ column: 1, span: 2, row: 1 }, { column: 1, span: 2, row: 9 }, { column: 11, span: 2, row: 9 }],
  },
  {
    id: 'facto', title: 'Ipsos Facto', client: 'Research intelligence',
    challenge: 'Research at scale', audience: 'Research & insights teams',
    situation: 'AI isn’t tailored to my scale of research.',
    task: 'We shaped a generic AI chat into a research workflow with guidance, citations, and source limits, turning forty years of market research into cited insights.',
    href: '/work/ipsos-facto',
    problems: ['Prompting your way to an answer.', 'Citations detached from the insight.', 'Source limitations hidden from view.'],
    solutions: ['Guide the question.', 'Keep citations attached.', 'Name the limits.'],
    emphasis: ['Guide', 'Keep', 'Name'],
    reasoning: ['A blank chat box leaves researchers guessing. Task prompts get them to a useful question faster.', 'An insight without sources can’t go in a report. With citations attached, each one can be traced.', 'Hidden caveats breed overconfidence. Named in the panel, they show where the evidence stops.'],
    targets: [{ x: 580, y: 1193, dx: -80, dy: 100 }, { x: 1500, y: 743, dx: 120, dy: -20 }, { x: 1500, y: 323, dx: 120, dy: -20 }],
    annotationCells: [{ column: 1, span: 2, row: 9 }, { column: 6, span: 4, row: 9 }, { column: 6, span: 4, row: 1 }],
  },
]
