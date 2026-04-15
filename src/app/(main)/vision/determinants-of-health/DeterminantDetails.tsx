import type { Determinant } from './types'

export function DeterminantDetails({
  determinant,
}: {
  determinant: Determinant
}) {
  return (
    <div>
      <h3 className="determinant">{determinant.title}</h3>
      <p className="description">{determinant.description}</p>
      <div className="divisions">
        {determinant.divisions.map(division => (
          <div className="divisionSection" key={division.title}>
            <h4 className="division">{division.title}</h4>
            {division.factors ? (
              <ul className="factors">
                {division.factors.map(factor => (
                  <li key={factor} className="factor">
                    {factor}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  )
}
