export function ConceptReferenceArrow({ className = '' }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block transition-transform duration-[360ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${className}`}
    >
      →
    </span>
  )
}
