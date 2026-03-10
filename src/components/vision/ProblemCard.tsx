interface ProblemCardProps {
  number: number
  title: string
  description: string
  deaths?: string
  peopleImpacted?: string
  spending?: string
  references?: string
}

export function ProblemCard({
  number,
  title,
  description,
  deaths,
  peopleImpacted,
  spending,
  references,
}: ProblemCardProps) {
  return (
    <div className="mb-8 pb-8 border-b border-gray-medium last:border-b-0">
      <h2 className="font-serif text-xl mb-2">
        {number}.&nbsp;{title}
        {references && (
          <a href="#references" className="no-underline">
            <sup className="text-sm ml-1">{references}</sup>
          </a>
        )}
      </h2>
      <p className="mb-3 leading-relaxed">{description}</p>
      <p className="text-md text-gray font-semibold">
        {deaths && <span>{deaths} Deaths</span>}
        {deaths && (peopleImpacted || spending) && <span> &mdash; </span>}
        {peopleImpacted && <span>{peopleImpacted} People Impacted</span>}
        {peopleImpacted && spending && <span> &mdash; </span>}
        {spending && <span>{spending} Spending</span>}
      </p>
    </div>
  )
}
