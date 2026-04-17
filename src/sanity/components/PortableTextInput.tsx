/**
 * Custom Portable Text input that adds visible "Add block" affordances
 * between adjacent custom blocks (images, quotes, columns, etc.).
 *
 * Feedback: "when you add components, you can't get a space between them
 * to add more text, so it's easier to purposefully leave a space between them"
 *
 * This wraps Sanity's default PTE input and injects CSS to make the
 * insertion points between blocks more visible and clickable.
 */
import { useEffect, useRef } from 'react'
import { type InputProps } from 'sanity'

const COLLAPSED_TOOLBAR_LABELS = {
  actionMenu: 'Formatting tools',
  insertMenu: 'More blocks',
} as const

function decoratePortableTextEditor(rootElement: HTMLElement) {
  const actionMenuButton = rootElement.querySelector<HTMLElement>('[data-testid="action-menu-button"]')
  const insertMenuButton = rootElement.querySelector<HTMLElement>('[data-testid="insert-menu-button"]')
  const editorElement = rootElement.querySelector<HTMLElement>('[data-testid="pt-editor"]')
  const articleCanvasElement = editorElement?.querySelector<HTMLElement>('[contenteditable="true"]')
  const customBlocks = rootElement.querySelectorAll<HTMLElement>('[data-testid="pt-editor"] [data-testid="pt-block"][data-type]:not([data-type="block"])')

  if (actionMenuButton) {
    actionMenuButton.setAttribute('title', COLLAPSED_TOOLBAR_LABELS.actionMenu)
    actionMenuButton.setAttribute('aria-label', COLLAPSED_TOOLBAR_LABELS.actionMenu)
  }

  if (insertMenuButton) {
    insertMenuButton.setAttribute('title', COLLAPSED_TOOLBAR_LABELS.insertMenu)
    insertMenuButton.setAttribute('aria-label', COLLAPSED_TOOLBAR_LABELS.insertMenu)
    insertMenuButton.setAttribute('data-goinvo-insert-menu-button', 'true')
  }

  if (editorElement) {
    editorElement.setAttribute('data-goinvo-pt-editor', 'true')
  }

  if (articleCanvasElement) {
    articleCanvasElement.setAttribute('data-goinvo-article-canvas', 'true')
  }

  customBlocks.forEach((blockElement) => {
    blockElement.setAttribute('data-goinvo-custom-block', 'true')
  })
}

export function PortableTextInput(props: InputProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const wrapperElement = wrapperRef.current

    if (!wrapperElement || typeof MutationObserver === 'undefined') {
      return undefined
    }

    const applyToolbarAffordances = () => {
      decoratePortableTextEditor(wrapperElement)
    }

    const observer = new MutationObserver(applyToolbarAffordances)

    applyToolbarAffordances()
    observer.observe(wrapperElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-testid', 'aria-label'],
    })

    return () => {
      observer.disconnect()
    }
  }, [])

  return (
    <div className="goinvo-pte-wrapper" ref={wrapperRef}>
      <style>{`
        .goinvo-pte-wrapper {
          --goinvo-editor-shell: #f6f3f1;
          --goinvo-editor-shell-border: #ddd7d2;
          --goinvo-editor-canvas-border: rgba(36, 67, 77, 0.12);
          --goinvo-editor-canvas-shadow: rgba(36, 67, 77, 0.08);
          --goinvo-editor-canvas-width: 775px;
          --goinvo-editor-text: #24434d;
          --goinvo-editor-muted: #787473;
          --goinvo-editor-link: #007385;
          --goinvo-editor-accent: #E36216;
        }

        .goinvo-pte-wrapper [data-goinvo-pt-editor="true"] {
          padding: 18px;
          border: 1px solid var(--goinvo-editor-shell-border);
          border-radius: 18px;
          background: linear-gradient(180deg, #faf7f5 0%, var(--goinvo-editor-shell) 100%);
        }

        .goinvo-pte-wrapper [data-goinvo-article-canvas="true"] {
          display: block;
          box-sizing: border-box;
          width: min(100%, var(--goinvo-editor-canvas-width));
          min-height: 320px;
          margin: 0 auto;
          padding: clamp(24px, 3vw, 48px);
          border: 1px solid var(--goinvo-editor-canvas-border);
          border-radius: 10px;
          background: #ffffff;
          box-shadow: 0 18px 40px var(--goinvo-editor-canvas-shadow);
          color: var(--goinvo-editor-text);
          font-family: var(--font-sans, "Open Sans", Arial, Helvetica, sans-serif);
          font-size: 1rem;
          line-height: 1.625;
        }

        .goinvo-pte-wrapper [data-goinvo-article-canvas="true"] a {
          color: var(--goinvo-editor-link);
          text-decoration: underline;
          text-underline-offset: 0.12em;
        }

        .goinvo-pte-wrapper [data-goinvo-article-canvas="true"] sup {
          color: var(--goinvo-editor-accent);
          font-size: 0.75em;
        }

        .goinvo-pte-wrapper [data-goinvo-article-canvas="true"] ul,
        .goinvo-pte-wrapper [data-goinvo-article-canvas="true"] ol {
          padding-left: 1.5rem;
        }

        .goinvo-pte-wrapper [data-goinvo-article-canvas="true"] li + li {
          margin-top: 0.5rem;
        }

        .goinvo-pte-wrapper [data-goinvo-article-canvas="true"] [data-slate-placeholder="true"] {
          color: var(--goinvo-editor-muted);
        }

        .goinvo-pte-wrapper [data-goinvo-custom-block="true"] {
          box-sizing: border-box;
          width: min(100%, var(--goinvo-editor-canvas-width));
          margin-left: auto;
          margin-right: auto;
        }

        .goinvo-pte-wrapper [data-goinvo-custom-block="true"] > div:first-child,
        .goinvo-pte-wrapper [data-goinvo-custom-block="true"] > article:first-child,
        .goinvo-pte-wrapper [data-goinvo-custom-block="true"] > section:first-child {
          border-radius: 12px;
        }

        /* Make insertion points between blocks more visible */
        .goinvo-pte-wrapper [data-testid="pt-editor"] [data-testid="block-extras"] {
          min-height: 8px;
        }

        /* Add visible gap between adjacent custom blocks */
        .goinvo-pte-wrapper [data-goinvo-custom-block="true"] + [data-goinvo-custom-block="true"] {
          margin-top: 12px;
        }

        /* Show a dashed border when hovering between blocks */
        .goinvo-pte-wrapper [data-goinvo-custom-block="true"] + [data-testid="pt-block"]::before,
        .goinvo-pte-wrapper [data-testid="pt-editor"] [data-testid="pt-block"] + [data-goinvo-custom-block="true"]::before {
          content: '';
          display: block;
          height: 4px;
          margin: 2px 0;
          border-radius: 2px;
          transition: background-color 0.15s ease;
        }

        .goinvo-pte-wrapper [data-goinvo-custom-block="true"] + [data-testid="pt-block"]:hover::before,
        .goinvo-pte-wrapper [data-testid="pt-editor"] [data-testid="pt-block"] + [data-goinvo-custom-block="true"]:hover::before {
          background-color: rgba(36, 67, 77, 0.1);
        }

        /* Differentiate the collapsed "more blocks" control from formatting tools */
        .goinvo-pte-wrapper [data-goinvo-insert-menu-button="true"] {
          position: relative;
        }

        .goinvo-pte-wrapper [data-goinvo-insert-menu-button="true"] svg {
          display: none;
        }

        .goinvo-pte-wrapper [data-goinvo-insert-menu-button="true"]::after {
          content: '+';
          display: block;
          font-size: 1.125rem;
          font-weight: 600;
          line-height: 1;
          color: currentColor;
        }
      `}</style>
      <p style={{ fontSize: '12px', color: '#787473', marginBottom: '8px' }}>
        Tip: this editor now previews the public article typography and colors. Press Enter after clicking a block to insert text below it, and use the + button on the left side to add new blocks.
      </p>
      {props.renderDefault(props)}
    </div>
  )
}
