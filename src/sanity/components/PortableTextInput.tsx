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
import { type InputProps } from 'sanity'

export function PortableTextInput(props: InputProps) {
  return (
    <div className="goinvo-pte-wrapper">
      <style>{`
        /* Make insertion points between blocks more visible */
        .goinvo-pte-wrapper [data-testid="pt-editor"] [data-testid="block-extras"] {
          min-height: 8px;
        }

        /* Add visible gap between adjacent custom blocks */
        .goinvo-pte-wrapper [data-testid="pt-editor"] [data-testid="pt-block"][data-type] + [data-testid="pt-block"][data-type] {
          margin-top: 8px;
        }

        /* Show a dashed border when hovering between blocks */
        .goinvo-pte-wrapper [data-testid="pt-editor"] [data-testid="pt-block"] + [data-testid="pt-block"]::before {
          content: '';
          display: block;
          height: 4px;
          margin: 2px 0;
          border-radius: 2px;
          transition: background-color 0.15s ease;
        }

        .goinvo-pte-wrapper [data-testid="pt-editor"] [data-testid="pt-block"] + [data-testid="pt-block"]:hover::before {
          background-color: rgba(36, 67, 77, 0.1);
        }
      `}</style>
      <p style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>
        Tip: Press Enter after clicking a block to insert text below it. Use the + button on the left side to add new blocks.
      </p>
      {props.renderDefault(props)}
    </div>
  )
}
