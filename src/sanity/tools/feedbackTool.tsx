import { useState, useCallback } from 'react'
import { definePlugin, type Tool, useClient } from 'sanity'
import { CommentIcon } from '@sanity/icons'
import { useCurrentUser } from 'sanity'

const TASKS = [
  {
    id: 'find-edit',
    title: 'Find and open an existing case study',
    description: 'In Structure, click Case Study, then click any case study to open it. Try editing the title or caption.',
  },
  {
    id: 'create-draft',
    title: 'Create a new case study draft',
    description: 'Click Case Study → + Create. Fill in a Title and generate a Slug. You can delete it after.',
  },
  {
    id: 'upload-image',
    title: 'Upload and crop a hero image',
    description: 'On any case study, click the Hero Image field, upload an image, then click the crop icon to set a hotspot.',
  },
  {
    id: 'rich-text',
    title: 'Write rich text content',
    description: 'In a case study\'s Content field, add an H2 heading, a body paragraph, and a bullet list.',
  },
  {
    id: 'insert-columns',
    title: 'Insert a Columns block',
    description: 'In the Content editor, click "+ Insert" and add a Columns block with 2 images.',
  },
  {
    id: 'insert-quote',
    title: 'Insert a Quote block',
    description: 'In the Content editor, click "+ Insert" and add a Quote with text, author name, and role.',
  },
  {
    id: 'preview',
    title: 'Preview with the Presentation tab',
    description: 'Switch to the Presentation tab at the top of the Studio. Navigate to a case study you edited and check that your changes appear.',
  },
  {
    id: 'add-comment',
    title: 'Add a comment on a document',
    description: 'Open any document, select some text or click a field, then use the comment button (💬) in the toolbar to leave a comment for a colleague.',
  },
  {
    id: 'team-member',
    title: 'Add or edit a team member',
    description: 'In Structure, click Team Member. Try editing a bio or adding a social link.',
  },
  {
    id: 'reorder',
    title: 'Change the sort order of items',
    description: 'On any case study, change the Sort Order number and check the /work listing to see the effect.',
  },
  {
    id: 'publish-unpublish',
    title: 'Publish and unpublish a document',
    description: 'Publish a draft, then click ⋯ → Unpublish to revert it. Confirm it disappears from the live site.',
  },
]

interface TaskState {
  completed: boolean
  difficulty: number
  comment: string
}

function FeedbackComponent() {
  const client = useClient({ apiVersion: '2024-01-01' })
  const currentUser = useCurrentUser()

  const [taskStates, setTaskStates] = useState<Record<string, TaskState>>(() => {
    const initial: Record<string, TaskState> = {}
    TASKS.forEach((t) => {
      initial[t.id] = { completed: false, difficulty: 0, comment: '' }
    })
    return initial
  })
  const [overallRating, setOverallRating] = useState(0)
  const [whatWorkedWell, setWhatWorkedWell] = useState('')
  const [whatWasConfusing, setWhatWasConfusing] = useState('')
  const [suggestions, setSuggestions] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const updateTask = useCallback((id: string, field: keyof TaskState, value: boolean | number | string) => {
    setTaskStates((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }))
  }, [])

  const handleSubmit = useCallback(async () => {
    setSubmitting(true)
    try {
      await client.create({
        _type: 'cmsFeedback',
        submittedBy: currentUser?.name || currentUser?.email || 'Unknown',
        submittedAt: new Date().toISOString(),
        tasks: TASKS.map((t) => ({
          _key: t.id,
          taskId: t.id,
          completed: taskStates[t.id].completed,
          difficulty: taskStates[t.id].difficulty || undefined,
          comment: taskStates[t.id].comment || undefined,
        })),
        overallRating: overallRating || undefined,
        whatWorkedWell: whatWorkedWell || undefined,
        whatWasConfusing: whatWasConfusing || undefined,
        suggestions: suggestions || undefined,
      })
      setSubmitted(true)
    } catch (err) {
      console.error('Failed to submit feedback:', err)
      alert('Failed to submit feedback. Check the console for details.')
    } finally {
      setSubmitting(false)
    }
  }, [client, currentUser, taskStates, overallRating, whatWorkedWell, whatWasConfusing, suggestions])

  if (submitted) {
    return (
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '80px 24px', textAlign: 'center', color: 'var(--card-fg-color)' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>&#10003;</div>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Thank you!</h1>
        <p style={{ fontSize: 16, color: 'var(--card-muted-fg-color)' }}>
          Your feedback has been saved. It will help us improve the CMS experience.
        </p>
        <button
          type="button"
          onClick={() => {
            setSubmitted(false)
            setTaskStates(() => {
              const initial: Record<string, TaskState> = {}
              TASKS.forEach((t) => {
                initial[t.id] = { completed: false, difficulty: 0, comment: '' }
              })
              return initial
            })
            setOverallRating(0)
            setWhatWorkedWell('')
            setWhatWasConfusing('')
            setSuggestions('')
          }}
          style={{
            marginTop: 24,
            padding: '10px 24px',
            background: 'var(--card-badge-default-bg-color, rgba(128,128,128,0.1))',
            color: 'var(--card-fg-color)',
            border: '1px solid var(--card-border-color)',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          Submit another response
        </button>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 24px', fontFamily: 'system-ui, -apple-system, sans-serif', color: 'var(--card-fg-color)', lineHeight: 1.7 }}>
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>CMS Feedback</h1>
      <p style={{ fontSize: 16, color: 'var(--card-muted-fg-color)', marginBottom: 12 }}>
        Help us improve the CMS by trying the tasks below and sharing your experience.
        Your feedback is saved automatically when you submit.
      </p>
      <div style={{ padding: '12px 16px', background: 'var(--card-badge-default-bg-color, rgba(128,128,128,0.1))', borderLeft: '4px solid #007385', borderRadius: '0 6px 6px 0', fontSize: 14, marginBottom: 40 }}>
        <strong>How this works:</strong> Try each task, check it off, rate how easy it was (1 = very hard, 5 = very easy), and optionally leave a comment. Then fill in the overall feedback at the bottom and click Submit.
      </div>

      {/* Tasks */}
      <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 16, paddingBottom: 8, borderBottom: '1px solid var(--card-border-color)' }}>
        Tasks to Try
      </h2>

      {TASKS.map((task, index) => {
        const state = taskStates[task.id]
        return (
          <div
            key={task.id}
            style={{
              marginBottom: 24,
              padding: '16px 20px',
              background: state.completed ? 'var(--card-badge-default-bg-color, rgba(128,128,128,0.1))' : 'transparent',
              border: '1px solid var(--card-border-color)',
              borderRadius: 8,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <input
                type="checkbox"
                checked={state.completed}
                onChange={(e) => updateTask(task.id, 'completed', e.target.checked)}
                style={{ marginTop: 4, width: 18, height: 18, cursor: 'pointer', accentColor: '#007385' }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 15 }}>
                  {index + 1}. {task.title}
                </div>
                <div style={{ fontSize: 14, color: 'var(--card-muted-fg-color)', marginTop: 4 }}>
                  {task.description}
                </div>
              </div>
            </div>

            {state.completed && (
              <div style={{ marginTop: 12, marginLeft: 30 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: 'var(--card-muted-fg-color)' }}>Difficulty:</span>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      type="button"
                      key={n}
                      onClick={() => updateTask(task.id, 'difficulty', n)}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 6,
                        border: state.difficulty === n ? '2px solid #007385' : '1px solid var(--card-border-color)',
                        background: state.difficulty === n ? 'rgba(0,115,133,0.15)' : 'transparent',
                        color: 'var(--card-fg-color)',
                        cursor: 'pointer',
                        fontWeight: state.difficulty === n ? 700 : 400,
                        fontSize: 14,
                      }}
                    >
                      {n}
                    </button>
                  ))}
                  <span style={{ fontSize: 12, color: 'var(--card-muted-fg-color)', marginLeft: 4 }}>
                    (1 = hard, 5 = easy)
                  </span>
                </div>
                <textarea
                  placeholder="Any comments about this task? (optional)"
                  value={state.comment}
                  onChange={(e) => updateTask(task.id, 'comment', e.target.value)}
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 6,
                    border: '1px solid var(--card-border-color)',
                    background: 'var(--card-bg-color)',
                    color: 'var(--card-fg-color)',
                    fontSize: 14,
                    resize: 'vertical',
                    fontFamily: 'inherit',
                  }}
                />
              </div>
            )}
          </div>
        )
      })}

      {/* Overall Feedback */}
      <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 16, marginTop: 40, paddingBottom: 8, borderBottom: '1px solid var(--card-border-color)' }}>
        Overall Feedback
      </h2>

      <div style={{ marginBottom: 24 }}>
        <label style={{ display: 'block', fontWeight: 600, fontSize: 15, marginBottom: 8 }}>
          Overall, how easy was the CMS to use?
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              type="button"
              key={n}
              onClick={() => setOverallRating(n)}
              style={{
                width: 44,
                height: 44,
                borderRadius: 8,
                border: overallRating === n ? '2px solid #007385' : '1px solid var(--card-border-color)',
                background: overallRating === n ? 'rgba(0,115,133,0.15)' : 'transparent',
                color: 'var(--card-fg-color)',
                cursor: 'pointer',
                fontWeight: overallRating === n ? 700 : 400,
                fontSize: 16,
              }}
            >
              {n}
            </button>
          ))}
          <span style={{ fontSize: 13, color: 'var(--card-muted-fg-color)', alignSelf: 'center', marginLeft: 8 }}>
            (1 = very difficult, 5 = very easy)
          </span>
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <label style={{ display: 'block', fontWeight: 600, fontSize: 15, marginBottom: 8 }}>
          What worked well?
        </label>
        <textarea
          placeholder="What did you find intuitive or easy?"
          value={whatWorkedWell}
          onChange={(e) => setWhatWorkedWell(e.target.value)}
          rows={3}
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: 6,
            border: '1px solid var(--card-border-color)',
            background: 'var(--card-bg-color)',
            color: 'var(--card-fg-color)',
            fontSize: 14,
            resize: 'vertical',
            fontFamily: 'inherit',
          }}
        />
      </div>

      <div style={{ marginBottom: 24 }}>
        <label style={{ display: 'block', fontWeight: 600, fontSize: 15, marginBottom: 8 }}>
          What was confusing or difficult?
        </label>
        <textarea
          placeholder="What tripped you up or felt unclear?"
          value={whatWasConfusing}
          onChange={(e) => setWhatWasConfusing(e.target.value)}
          rows={3}
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: 6,
            border: '1px solid var(--card-border-color)',
            background: 'var(--card-bg-color)',
            color: 'var(--card-fg-color)',
            fontSize: 14,
            resize: 'vertical',
            fontFamily: 'inherit',
          }}
        />
      </div>

      <div style={{ marginBottom: 32 }}>
        <label style={{ display: 'block', fontWeight: 600, fontSize: 15, marginBottom: 8 }}>
          Any other suggestions?
        </label>
        <textarea
          placeholder="Features you'd like, things that are missing, ideas for improvement..."
          value={suggestions}
          onChange={(e) => setSuggestions(e.target.value)}
          rows={3}
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: 6,
            border: '1px solid var(--card-border-color)',
            background: 'var(--card-bg-color)',
            color: 'var(--card-fg-color)',
            fontSize: 14,
            resize: 'vertical',
            fontFamily: 'inherit',
          }}
        />
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting}
        style={{
          width: '100%',
          padding: '14px 24px',
          background: '#007385',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          fontSize: 16,
          fontWeight: 600,
          cursor: submitting ? 'not-allowed' : 'pointer',
          opacity: submitting ? 0.6 : 1,
        }}
      >
        {submitting ? 'Submitting...' : 'Submit Feedback'}
      </button>

      <p style={{ marginTop: 12, fontSize: 13, color: 'var(--card-muted-fg-color)', textAlign: 'center' }}>
        Your responses are saved as a document in the CMS and can be reviewed later.
      </p>
    </div>
  )
}

const feedbackTool: Tool = {
  name: 'feedback',
  title: 'Feedback',
  icon: CommentIcon,
  component: FeedbackComponent,
}

export const feedbackPlugin = definePlugin({
  name: 'feedback',
  tools: [feedbackTool],
})
