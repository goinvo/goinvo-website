// Ipsos Facto's "Key moments": the important parts of several Facto screens, cut from
// their reconstructions at full size and set side by side, so the parts that carry the
// design are readable at homepage scale instead of being lost in screens of sample
// text. 1280 × 849, the full screen's proportions, so switching views keeps the box.
//
//   workflow   the guided steps (frame 1740:15382)
//   compare    one row per source, with the themes across them (1740:15382)
//   citation   the answer's footnote that points at the source (1147:92677)
//   passage    that source, opened at the highlighted sentence (1097:67086)
//   details    the source's own details (1097:67086)
import type { ReactNode } from 'react'
import { FactoCompareTable, FactoCompareWorkflow } from './FactoCompare'
import { ReferenceDetails, ReferencePassage } from './FactoReferenceDetail'

const surface = 'linear-gradient(123.81deg, rgb(23, 48, 44) 2.18%, rgb(3, 22, 45) 35.08%, rgb(3, 22, 45) 45.53%, rgb(0, 28, 64) 101.35%)'
const fade = 'linear-gradient(to bottom, rgba(3,22,45,0), rgb(3,22,45))'

function Tile({ part, x, y, width, height, children, faded = true }: { part: string; x: number; y: number; width: number; height: number; children: ReactNode; faded?: boolean }) {
  return (
    <div data-fragment={part} className="prototype-part absolute overflow-hidden rounded-[14px] shadow-[0_2px_18px_rgba(0,0,0,0.28)]" style={{ left: x, top: y, width, height, backgroundImage: surface }}>
      {children}
      {faded && <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-[56px]" style={{ backgroundImage: fade }} />}
    </div>
  )
}

/** The answer's opening line with its footnote, the one the passage tile opens. */
function Citation() {
  return (
    <div className="absolute inset-[18px] rounded-br-[11.67px] rounded-tl-[11.67px] rounded-tr-[11.67px] bg-[rgba(110,139,247,0.1)] px-[24px] py-[20px] font-[family-name:'Noto_Sans'] text-[16px] leading-[22px] text-[rgba(255,255,255,0.92)]">
      Sustainability encompasses the ability to maintain resources for present and future generations, extending beyond natural resources to include societal and economic resources as well.{' '}
      <span data-fragment="footnote" className="relative top-[-1px] inline-flex h-[14px] w-[23px] items-center justify-center rounded-[2px] bg-[#1fa0a0] align-middle font-[family-name:'Roboto'] text-[11px] leading-[12px] tracking-[0.55px] text-white">1-4</span>
      {' '}It is often referred to as ESG.
    </div>
  )
}

export function FactoBento() {
  return (
    <div className="relative h-[849px] w-[1280px] font-[family-name:'Noto_Sans']">
      <Tile part="workflow" x={0} y={0} width={223} height={849} faded={false}>
        <div className="absolute left-0 top-0 h-[1006px] w-[223px]"><FactoCompareWorkflow /></div>
      </Tile>
      <Tile part="compare" x={239} y={0} width={1041} height={409}>
        <FactoCompareTable width={1041} />
      </Tile>
      <Tile part="passage" x={239} y={425} width={600} height={424}>
        <ReferencePassage width={516} />
      </Tile>
      <Tile part="citation" x={855} y={425} width={425} height={200} faded={false}>
        <Citation />
      </Tile>
      <Tile part="details" x={855} y={641} width={425} height={208} faded={false}>
        <div className="absolute left-[24px] top-[20px]"><ReferenceDetails count={6} /></div>
      </Tile>
    </div>
  )
}
