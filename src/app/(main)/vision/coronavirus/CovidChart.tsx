'use client'

const data = [
  {
    id: 'sars',
    title: 'SARS',
    date: 'Nov 2002 – Jul 2003',
    cases: 8098,
    deaths: 774,
  },
  {
    id: 'mers',
    title: 'MERS',
    date: 'Sep 2012 – 2015',
    cases: 2494,
    deaths: 858,
  },
  {
    id: 'covid-19',
    title: 'COVID-19',
    date: 'Dec 2019 – Present',
    cases: 111363,
    deaths: 3892,
  },
]

function formatNumber(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`
  return n.toString()
}

export function CovidChart() {
  const maxValue = Math.max(...data.map((d) => d.cases))
  const chartHeight = 300
  const barWidth = 50
  const groupGap = 60

  return (
    <div className="max-width content-padding mx-auto my-8">
      <p className="text-sm text-gray text-center mb-6">
        Data as of early March 2020 (snapshot)
      </p>

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${data.length * (barWidth * 2 + groupGap) + 80} ${chartHeight + 100}`}
          className="w-full max-w-[700px] mx-auto"
          role="img"
          aria-label="Bar chart comparing SARS, MERS, and COVID-19 cases and deaths"
        >
          {/* Y-axis gridlines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
            const y = chartHeight - chartHeight * pct + 20
            const val = Math.round(maxValue * pct)
            return (
              <g key={pct}>
                <line
                  x1={70}
                  x2={data.length * (barWidth * 2 + groupGap) + 50}
                  y1={y}
                  y2={y}
                  stroke="#e2e2e2"
                  strokeWidth={1}
                />
                <text
                  x={65}
                  y={y + 4}
                  textAnchor="end"
                  className="text-[11px] fill-gray"
                >
                  {formatNumber(val)}
                </text>
              </g>
            )
          })}

          {/* Bars */}
          {data.map((d, i) => {
            const x = i * (barWidth * 2 + groupGap) + 80
            const casesHeight = (d.cases / maxValue) * chartHeight
            const deathsHeight = (d.deaths / maxValue) * chartHeight
            const isCovid = d.id === 'covid-19'

            return (
              <g key={d.id}>
                {/* Cases bar */}
                <rect
                  x={x}
                  y={chartHeight - casesHeight + 20}
                  width={barWidth}
                  height={casesHeight}
                  fill={isCovid ? '#D6D2EA' : '#E2E2E2'}
                  rx={2}
                />
                <text
                  x={x + barWidth / 2}
                  y={chartHeight - casesHeight + 14}
                  textAnchor="middle"
                  className="text-[10px] fill-gray-dark font-semibold"
                >
                  {formatNumber(d.cases)}
                </text>

                {/* Deaths bar */}
                <rect
                  x={x + barWidth + 4}
                  y={chartHeight - deathsHeight + 20}
                  width={barWidth}
                  height={deathsHeight}
                  fill={isCovid ? '#563C8D' : '#747070'}
                  rx={2}
                />
                <text
                  x={x + barWidth + 4 + barWidth / 2}
                  y={chartHeight - deathsHeight + 14}
                  textAnchor="middle"
                  className="text-[10px] fill-gray-dark font-semibold"
                >
                  {formatNumber(d.deaths)}
                </text>

                {/* Label */}
                <text
                  x={x + barWidth + 2}
                  y={chartHeight + 40}
                  textAnchor="middle"
                  className={`text-[13px] font-semibold ${isCovid ? 'fill-[#563C8D]' : 'fill-gray-dark'}`}
                >
                  {d.title}
                </text>
                <text
                  x={x + barWidth + 2}
                  y={chartHeight + 55}
                  textAnchor="middle"
                  className="text-[10px] fill-gray"
                >
                  {d.date}
                </text>
                <text
                  x={x + barWidth + 2}
                  y={chartHeight + 70}
                  textAnchor="middle"
                  className="text-[10px] fill-gray"
                >
                  Death rate:{' '}
                  {((d.deaths / d.cases) * 100).toFixed(1)}%
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-6 mt-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 bg-[#D6D2EA] rounded-sm inline-block" />
          <span className="text-gray">Confirmed Cases</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 bg-[#563C8D] rounded-sm inline-block" />
          <span className="text-gray">Deaths</span>
        </div>
      </div>
    </div>
  )
}
