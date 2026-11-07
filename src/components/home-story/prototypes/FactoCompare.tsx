// Parts of the Ipsos Facto "compare across sources" step, reconstructed from Figma
// frame 1740:15382 (Facto Figma file, "NYC Demo Concepts" page) for the homepage's
// "Key moments" bento (FactoBento): the workflow rail and the comparison table.
// Client names, the workspace and file names are replaced with obvious placeholders
// (Brand X, sample files); the layout, type and colours are the frame's own.
import Image from 'next/image'

const asset = (name: string) => `/design-lab/human/assets/${name}`
const imgOpenIn = asset('db0d7fff-f14d-4436-bd70-df37c416c723.svg')
const imgChat = asset('45066f05-a6a2-41a6-bd1a-3a50070d46e8.svg')
const imgLine123 = asset('0dc27e94-02dc-4bf4-9227-9b11608c8dc5.svg')
const imgDropdownArrow = asset('ca373049-de8b-4332-acf5-427fa4c60d96.svg')
const imgMore = asset('a1e8326f-7420-495a-9575-c64c21cb69b2.svg')
const imgStepCircle = asset('f81b1a98-0f09-4237-89c5-37967044677c.svg')
const imgSubstepCircle = asset('f7133874-c5a4-4134-a082-c7550a415c5e.svg')

const sans = "font-[family-name:'Noto_Sans']"
const display = "font-[family-name:'Noto_Sans_Display']"
const text = 'text-[rgba(255,255,255,0.92)]'
const light = 'text-[rgba(207,207,207,0.86)]'
const box = 'bg-[rgba(110,139,247,0.1)] rounded-[6.182px]'

const packaging = [
  '78% of surveyed consumers across North America said they prefer brands using recyclable or biodegradable packaging. Interviews reveal that plastic reduction is a key driver for brand loyalty in the pet food market.',
  'Highlight the use of sustainable materials (e.g., 100% recycled aluminum cans or plant-based bottles) in ads. Create transparent messaging to reassure customers of your environmental efforts.',
]
const rows: { source: string; open?: string; body: string[]; tall?: boolean }[] = [
  { source: 'Sample tracker 2023', body: [packaging[0].replace('plastic reduction is a key driver', 'packaging reduction is a driver'), packaging[1]], tall: true },
  { source: 'industry-report-sample', body: ['The report highlights that transparency in ingredient sourcing has become a significant purchasing criterion, with 63% of consumers favoring brands that provide detailed ingredient origins. Sustainability remains a pivotal concern, with 76% of surveyed individuals expressing a preference for brands that use environmentally friendly packaging. The growing trend of pet humanization is evident, as 82% of respondents now consider their pets integral members of the family.'] },
  { source: 'Consumer Pet Food Chart', open: 'Open in Harmoni', body: ['The set of charts presents data from a 2023 survey exploring the evolving preferences of cat owners. The first chart illustrates a shift towards premium, health-focused pet food products, with 67% of respondents expressing this preference. Another chart highlights the importance of sustainability, showing that 72% of cat owners are concerned about the environmental impact of pet food packaging.'] },
  { source: 'customer_interview_9.mp4 and 3 more', body: packaging },
  { source: 'Sample_tables_2024.xlsx', open: 'Open in Excel', body: packaging },
]
const themes = 'Across generations, there is a shared concern about sustainability, health, and ethical consumption when it comes to choosing pet food. Gen Z consumers struggle with the environmental impact of single-use plastics and peer pressure, seeking brands that communicate their eco-friendly practices clearly. Millennials are highly aware of environmental challenges and value transparency and authenticity, balancing convenience with making sustainable choices. Boomers are increasingly conscious of leaving a better planet for future generations, prioritizing health and showing skepticism towards brands’ sustainability claims. All generations appreciate brands that simplify sustainable decision-making through clear communication and packaging options.'

function Row({ row }: { row: typeof rows[number] }) {
  return (
    <div className="flex w-full items-stretch gap-[10px]" data-name="table row">
      <div className={`${box} flex w-[113px] shrink-0 flex-col gap-[10px] px-[17px] py-[16px] ${row.tall ? '' : 'h-[141px]'}`} data-name="text box">
        <p className={`${sans} w-full overflow-hidden text-ellipsis text-[14px] leading-[19px] [word-break:break-word] ${text}`}>{row.source}</p>
        {row.open && <div className="flex w-full items-center gap-[5px] rounded-[6px] bg-[rgba(46,203,202,0.23)] px-[6px] py-[4px]" data-name="special box">
          <div className="relative h-[8.575px] w-[10.174px] shrink-0"><Image unoptimized width={10} height={9} alt="" className="absolute inset-0 block size-full max-w-none" src={imgOpenIn} /></div>
          <p className="w-[49px] font-[family-name:'Roboto'] text-[12px] font-medium leading-[12px] text-white">{row.open}</p>
        </div>}
      </div>
      <div className={`${box} relative min-w-px flex-[1_0_0] ${row.tall ? 'px-[20px] py-[16px]' : 'h-[141px]'}`} data-name="text box">
        <div className={`${sans} text-[14px] [word-break:break-word] ${text} ${row.tall ? '' : 'absolute left-[20px] right-[18px] top-[16px] h-[108px] overflow-hidden text-ellipsis'}`}>
          {row.body.map((paragraph, index) => <p key={index} className={`leading-[19px] ${index < row.body.length - 1 ? 'mb-[8px]' : ''}`}>{paragraph}</p>)}
        </div>
      </div>
    </div>
  )
}

function Step({ number, label, current = false }: { number: number; label: string; current?: boolean }) {
  return (
    <div className={`flex w-full items-center gap-[7px] px-[18px] py-[14px] ${current ? '' : 'opacity-80'}`} data-name="step">
      <div className="relative h-[25px] w-[20px] shrink-0">
        <div className="absolute left-1/2 top-[calc(50%+0.5px)] size-[22px] -translate-x-1/2 -translate-y-1/2"><Image unoptimized width={22} height={22} alt="" className="absolute inset-0 block size-full max-w-none" src={imgStepCircle} /></div>
        <p className={`${sans} absolute left-[10px] top-[13px] w-[20px] -translate-x-1/2 -translate-y-1/2 text-center text-[16px] font-medium leading-[20.188px] [font-feature-settings:'lnum','tnum'] ${text}`}>{number}</p>
      </div>
      <p className={`${sans} w-[149px] text-[16px] leading-[19px] ${current ? 'font-semibold' : ''} ${text}`}>{label}</p>
    </div>
  )
}

function Substep({ letter, label, current = false }: { letter: string; label: string; current?: boolean }) {
  return (
    <div className={`flex w-full items-start gap-[7px] px-[18px] py-[8px] ${current ? 'bg-[rgba(18,202,202,0.1)]' : 'opacity-80'}`} data-name="substep">
      <div className="relative size-[20px] shrink-0">
        <div className="absolute left-0 top-0 size-[20.188px]"><Image unoptimized width={20} height={20} alt="" className="absolute inset-0 block size-full max-w-none" src={imgSubstepCircle} /></div>
        <p className={`${sans} absolute left-[calc(50%+0.09px)] top-[calc(50%-10px)] h-[20.187px] w-[20.188px] -translate-x-1/2 text-center text-[12px] leading-[20.188px] ${text}`}>{letter}</p>
      </div>
      <p className={`${sans} max-h-[80px] min-w-px flex-[1_0_0] overflow-hidden text-ellipsis text-[14px] leading-[19px] [word-break:break-word] ${current ? 'font-semibold' : ''} ${text}`}>{label}</p>
    </div>
  )
}

/** The workflow rail: where this comparison sits in the research. */
export function FactoCompareWorkflow() {
  return (
    <div className="absolute left-0 top-0 h-[1006px] w-[223px] border-r border-solid border-[rgba(46,203,202,0.23)] bg-[rgba(115,115,115,0.17)]" data-name="workflow bar">
      <div className="absolute bottom-0 left-[calc(50%+0.5px)] h-[126px] w-[223px] -translate-x-1/2 overflow-clip rounded-tl-[10px] rounded-tr-[10px] bg-gradient-to-t from-[rgba(0,195,165,0.14)] to-[rgba(255,255,255,0.03)]" data-name="big add button">
        <div className="absolute left-1/2 top-[calc(50%-14.5px)] size-[57px] -translate-x-1/2 -translate-y-1/2"><Image unoptimized width={57} height={57} alt="" className="absolute inset-0 block size-full max-w-none" src={imgChat} /></div>
        <p className={`${sans} absolute left-[calc(50%+0.5px)] top-[79px] w-[76px] -translate-x-1/2 text-center text-[16px] font-semibold leading-[19px] text-white`}>New Chat</p>
      </div>
      <div className="absolute left-0 right-0 top-[16px] h-[45px]" data-name="top">
        <div className="absolute left-0 right-0 top-[44px] h-px"><Image unoptimized width={223} height={1} alt="" className="block size-full max-w-none" src={imgLine123} /></div>
        <p className={`${display} absolute left-[47px] top-[21px] w-[102px] -translate-y-1/2 text-[14px] font-bold tracking-[0.28px] ${light}`}>Workflows</p>
        <div className="absolute left-[16px] top-[7px] size-[26px] rounded-[4px] opacity-60">
          <div className="absolute bottom-[23.08%] left-1/2 top-[30.77%] w-[12px] -translate-x-1/2">
            <div className="absolute inset-[6.25%_3.02%_77.08%_5.31%] rounded-[0.75px] bg-white" />
            <div className="absolute inset-[43.75%_3.02%_39.58%_5.31%] rounded-[0.75px] bg-white" />
            <div className="absolute inset-[81.25%_3.02%_2.08%_5.31%] rounded-[0.75px] bg-white" />
          </div>
        </div>
      </div>
      <div className="absolute left-0 top-[61px] flex w-[223px] flex-col items-start gap-[20px] overflow-clip border-b border-solid border-[rgba(115,115,115,0.6)] p-[20px]">
        <div className="relative h-[45px] w-full shrink-0">
          <p className={`${sans} absolute left-0 top-0 w-[181px] text-[12px] leading-[20.188px] ${light}`}>Workspace</p>
          <p className={`${sans} absolute left-0 top-[21px] w-[181px] text-[16px] ${text}`}>Brand X pet food 2025</p>
          <div className="absolute right-[-10px] top-[25px] size-[14px] rounded-[4px] opacity-60"><div className="absolute inset-[15.38%]"><Image unoptimized width={10} height={10} alt="" className="absolute inset-0 block size-full max-w-none" src={imgDropdownArrow} /></div></div>
        </div>
        <div className="relative h-[67px] w-full shrink-0">
          <p className={`${sans} absolute left-0 top-0 w-[181px] text-[12px] leading-[20.188px] ${light}`}>Content Curation</p>
          <p className={`${sans} absolute left-0 top-[21px] w-[178px] text-[16px] ${text}`}>Cat food preference changes since Covid</p>
          <div className="absolute left-[172px] top-[31px] size-[26px] rounded-[4px] opacity-60"><div className="absolute inset-[15.38%]"><Image unoptimized width={18} height={18} alt="" className="absolute inset-0 block size-full max-w-none" src={imgMore} /></div></div>
        </div>
      </div>
      <div className="absolute left-0 right-[-1px] top-[245px] flex flex-col items-start">
        <Step number={1} label="Define Research Brief" />
        <Step number={2} label="Content Curation" />
        <Step number={3} label="Meta Analysis" current />
        <Substep letter="A" label="What are the current consumer priorities and preferences in the wet cat food market post-Covid, particularly in relation to Environmental, Social, and Governance (ESG) factors?" />
        <Substep letter="B" label="Which demographic segments demonstrate the strongest interest in ESG-compliant cat food products, and what are their specific needs and preferences?" />
        <Substep letter="C" label="Compare across top 5 sources, “How do previously tested Brand X wet cat food concepts align with the evolving consumer trends in the post-pandemic market?”" current />
        <Step number={4} label="Create Playbook" />
      </div>
    </div>
  )
}

/** The comparison the meta-analysis step produces: one row per source, the themes
 * across them beside. `width` is the output bubble's width (943 in the frame). */
export function FactoCompareTable({ width = 943 }: { width?: number }) {
  return (
    <div className="flex flex-col items-start gap-[20px] rounded-br-[11.67px] rounded-tl-[11.67px] rounded-tr-[11.67px] bg-[rgba(110,139,247,0.1)] px-[32px] py-[28px]" style={{ width }} data-name="table output">
      <p className={`${display} w-full text-[18px] font-semibold ${text}`}>Comparison across sources: “What were some sustainability trends in the pet food industry in 2025”</p>
      <div className="flex w-full items-start gap-[10px]">
        <div data-fragment="sources" className="flex w-[653px] shrink-0 flex-col items-start gap-[10px]">{rows.map(row => <Row key={row.source} row={row} />)}</div>
        <div data-fragment="themes" className={`${box} relative min-w-px flex-[1_0_0] self-stretch`} data-name="text box">
          <div className={`${sans} absolute inset-[16px_20px_14px_20px] overflow-hidden text-ellipsis text-[14px] [word-break:break-word] ${text}`}>
            <p className="mb-[19px] font-bold leading-[19px]">Themes</p>
            <p className="leading-[19px]">{themes}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
