'use client'

import { useEffect, useRef } from 'react'
import { sankey as d3Sankey, sankeyLinkHorizontal } from 'd3-sankey'

/**
 * Sankey flow diagram for Healing US Healthcare — restores the D3 sankey
 * visualization from the legacy Gatsby page that was missing in the port.
 * Flow data (51 links) is extracted from the legacy sankey.csv and
 * node titles from the legacy sankey.js dictionary.
 *
 * Nodes are labeled on the left/right of the chart. Paths are colored
 * plain and become highlighted on hover.
 */

const LINKS: Array<[string, string, number]> = [
  ['universal_access', 'public_option', 5],
  ['public_option', 'everyone_covered', 5],
  ['everyone_covered', 'better_costs', 1.6],
  ['everyone_covered', 'more_equitable', 1.6],
  ['everyone_covered', 'preventative_meds', 1.6],
  ['universal_access', 'give_patients_data', 4],
  ['universal_access', 'health_data_standard', 3],
  ['universal_access', 'on_demand_care', 2],
  ['universal_access', 'primary_care_workers', 1],
  ['give_patients_data', 'take_charge_of_health', 4],
  ['take_charge_of_health', 'more_equitable', 2],
  ['take_charge_of_health', 'health_conscious_people', 2],
  ['on_demand_care', 'self_care', 2],
  ['self_care', 'better_costs', 1],
  ['self_care', 'preventative_meds', 1],
  ['primary_care_workers', 'more_time', 1],
  ['more_time', 'better_care', 0.5],
  ['more_time', 'more_equitable', 0.5],
  ['health_data_standard', 'interoperability', 1.5],
  ['health_data_standard', 'shop_quality_cost', 1.5],
  ['interoperability', 'better_care', 0.375],
  ['interoperability', 'fewer_tests', 0.375],
  ['interoperability', 'reduced_errors', 0.375],
  ['interoperability', 'efficiency', 0.3],
  ['shop_quality_cost', 'better_costs', 3.25],
  ['shop_quality_cost', 'better_care', 3.25],
  ['perfect_quality', 'individualise_meds', 5],
  ['perfect_quality', 'coordinate_care', 4],
  ['perfect_quality', 'destigmatize_death', 3],
  ['perfect_quality', 'doctor_training', 2],
  ['destigmatize_death', 'value_quality_life', 3],
  ['individualise_meds', 'tailored_treatment', 5],
  ['tailored_treatment', 'fewer_tests', 2.5],
  ['tailored_treatment', 'better_care', 2.5],
  ['doctor_training', 'communicate_better', 2],
  ['communicate_better', 'fewer_tests', 1.5],
  ['communicate_better', 'fewer_visits', 1.5],
  ['communicate_better', 'better_care', 1.5],
  ['communicate_better', 'reduced_errors', 1.5],
  ['coordinate_care', 'communicate_better', 4],
  ['better_prices', 'transparent_prices', 5],
  ['better_prices', 'incentivize_outcomes', 4],
  ['better_prices', 'reform_malpractice', 3],
  ['transparent_prices', 'shop_quality_cost', 5],
  ['value_quality_life', 'better_care', 3],
  ['incentivize_outcomes', 'fees_for_outcomes', 4],
  ['fees_for_outcomes', 'better_costs', 1.3],
  ['fees_for_outcomes', 'fewer_tests', 1.3],
  ['fees_for_outcomes', 'efficiency', 1.3],
  ['reform_malpractice', 'less_malpractice_liability', 3],
  ['less_malpractice_liability', 'better_costs', 1.5],
  ['less_malpractice_liability', 'fewer_tests', 1.5],
]

// Node key → display label. Mirrors the `i[e.name].title` map from sankey.js.
const NODE_LABELS: Record<string, string> = {
  universal_access: 'Universal Access',
  perfect_quality: 'Near Perfect Quality',
  better_prices: 'Much Better Prices',
  public_option: 'Offer Public Option',
  everyone_covered: 'Everyone Gets Covered',
  better_costs: 'Better Costs',
  more_equitable: 'More Equitable',
  preventative_meds: 'Increased Preventative Medicine',
  give_patients_data: 'Give Patients Their Data',
  health_data_standard: 'Create Health Data Standard',
  on_demand_care: 'Enable On-Demand Care',
  primary_care_workers: 'Train More Primary Care Workers',
  take_charge_of_health: 'Patients Take Charge of Their Own Health',
  health_conscious_people: 'More Health Conscious People',
  self_care: 'Self Care',
  more_time: 'Caregivers Spend More Time with Patients',
  better_care: 'Better Care',
  interoperability: 'Improve Interoperability',
  shop_quality_cost: 'People Shop for Quality and Cost',
  fewer_tests: 'Fewer Unnecessary Tests',
  reduced_errors: 'Reduced Errors',
  efficiency: 'Increased Efficiency',
  individualise_meds: 'Personalize Medicine',
  coordinate_care: 'Coordinate Care',
  destigmatize_death: 'Destigmatize Death',
  doctor_training: 'Improve Doctor Training',
  value_quality_life: 'People Value Quality of Life',
  tailored_treatment: 'Tailored Treatment Plans',
  communicate_better: 'Clinicians Communicate Better with Patients',
  fewer_visits: 'Fewer Hospital Visits',
  transparent_prices: 'Make Prices Transparent',
  incentivize_outcomes: 'Incentivize Outcomes',
  reform_malpractice: 'Reform Malpractice Laws',
  fees_for_outcomes: 'Fees for Outcomes Instead of Fees for Services',
  less_malpractice_liability: 'Doctors who Follow Best Practices Shielded from Liability',
}

interface Node {
  name: string
  label: string
}

interface Link {
  source: number
  target: number
  value: number
}

export function HealingSankeyChart() {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return

    const render = () => {
      // Reset
      while (svg.firstChild) svg.removeChild(svg.firstChild)

      const parentEl = svg.parentElement
      const width = Math.max(320, parentEl?.clientWidth || 960)
      const height = 600

      // Build unique node list
      const nodeNames = new Set<string>()
      for (const [s, t] of LINKS) {
        nodeNames.add(s)
        nodeNames.add(t)
      }
      const nodes: Node[] = Array.from(nodeNames).map((name) => ({
        name,
        label: NODE_LABELS[name] || name,
      }))
      const indexOf: Record<string, number> = {}
      nodes.forEach((n, i) => {
        indexOf[n.name] = i
      })

      const links: Link[] = LINKS.map(([s, t, v]) => ({
        source: indexOf[s],
        target: indexOf[t],
        value: v,
      }))

      const layout = d3Sankey<Node, Link>()
        .nodeWidth(2)
        .nodePadding(15)
        .extent([
          [200, 10],
          [width - 200, height - 10],
        ])

      const graph = layout({
        nodes: nodes.map((n) => ({ ...n })),
        links: links.map((l) => ({ ...l })),
      })

      svg.setAttribute('viewBox', `0 0 ${width} ${height}`)
      svg.setAttribute('width', String(width))
      svg.setAttribute('height', String(height))
      svg.style.maxWidth = '100%'
      svg.style.height = 'auto'

      const svgNS = 'http://www.w3.org/2000/svg'

      // Links (paths)
      const pathGen = sankeyLinkHorizontal<Node, Link>()
      for (const l of graph.links) {
        const path = document.createElementNS(svgNS, 'path')
        const d = pathGen(l) || ''
        path.setAttribute('d', d)
        path.setAttribute('class', 'healing-sankey-link')
        path.setAttribute('fill', 'none')
        path.setAttribute('stroke', '#939598')
        path.setAttribute('stroke-opacity', '0.35')
        path.setAttribute('stroke-width', String(Math.max(1, l.width || 0)))
        path.style.transition = 'stroke-opacity 150ms ease'
        path.addEventListener('mouseenter', () => {
          path.setAttribute('stroke-opacity', '0.7')
        })
        path.addEventListener('mouseleave', () => {
          path.setAttribute('stroke-opacity', '0.35')
        })
        svg.appendChild(path)
      }

      // Nodes (rects + labels)
      for (const n of graph.nodes) {
        const rect = document.createElementNS(svgNS, 'rect')
        rect.setAttribute('x', String(n.x0))
        rect.setAttribute('y', String(n.y0))
        rect.setAttribute('width', String((n.x1 || 0) - (n.x0 || 0)))
        rect.setAttribute('height', String((n.y1 || 0) - (n.y0 || 0)))
        rect.setAttribute('fill', '#383838')
        svg.appendChild(rect)

        const text = document.createElementNS(svgNS, 'text')
        const midY = ((n.y0 || 0) + (n.y1 || 0)) / 2
        const isLeft = (n.x0 || 0) < width / 2
        text.setAttribute('x', String(isLeft ? (n.x0 || 0) - 6 : (n.x1 || 0) + 6))
        text.setAttribute('y', String(midY))
        text.setAttribute('dy', '0.35em')
        text.setAttribute('text-anchor', isLeft ? 'end' : 'start')
        text.setAttribute('font-size', '11')
        text.setAttribute('font-family', '"Lato", Helvetica, Arial, sans-serif')
        text.setAttribute('fill', '#333')
        text.textContent = n.label
        svg.appendChild(text)
      }
    }

    render()
    const onResize = () => render()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return <svg ref={svgRef} className="healing-sankey-chart" />
}
