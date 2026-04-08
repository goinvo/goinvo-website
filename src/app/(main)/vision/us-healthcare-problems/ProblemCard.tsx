interface ProblemCardProps {
  number: number
  id: string
  title: string
  description: string
  deaths?: string
  peopleImpacted?: string
  spending?: string
  references?: string
}

export function ProblemCard({
  number,
  id,
  title,
  description,
  deaths,
  peopleImpacted,
  spending,
  references,
}: ProblemCardProps) {
  return (
    <div className="problem">
      <div className={id}>
        <h2>
          {number + 1}.&nbsp;
          {title}
          {references ? (
            <a href="#references">
              <sup>{references}</sup>
            </a>
          ) : null}
        </h2>
        <p>{description}</p>

        <p>
          {deaths ? <span>{deaths} Deaths - </span> : null}
          {peopleImpacted ? (
            <span>{peopleImpacted} People Impacted - </span>
          ) : null}
          {spending ? <span>{spending} Spending</span> : null}
        </p>
      </div>
    </div>
  )
}
