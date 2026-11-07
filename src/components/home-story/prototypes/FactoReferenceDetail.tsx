// Parts of an opened Ipsos Facto reference, reconstructed from Figma (frame 1097:67086,
// card 912:45249) for the homepage's "Key moments" bento: the passage the answer drew
// on, highlighted in its page, and the document's details. The file name is the same
// scrubbed placeholder FactoScreen's reference list uses; the passage is the frame's
// own sample text.
import Image from 'next/image'

const asset = (name: string) => `/design-lab/human/assets/${name}`
const imgDropdownArrow = asset('ac632aa1-9cc5-42aa-bf0d-58b7cd6b54df.svg')
const imgPdf = asset('6e4bcb05-735a-4612-a02c-55681a609807.svg')
const imgTransfer = asset('3fc1d9b4-23be-4d44-90a7-1f4b87043e03.svg')
const imgDownload = asset('e10d42e4-939b-46b7-9a65-a385277ec382.svg')
const imgBook = asset('6d4b5c51-487e-42b8-99ba-4268a8b7dd3a.svg')

const sans = "font-[family-name:'Noto_Sans']"
const display = "font-[family-name:'Noto_Sans_Display']"
const text = 'text-[rgba(255,255,255,0.92)]'
const light = 'text-[rgba(207,207,207,0.86)]'

const paragraphs = [
  'In response to these challenges, we have implemented a comprehensive strategy aimed at reducing our environmental impact. Our approach focuses on sustainable design, circular economy initiatives, and manufacturing innovations. By 2026, we aim to incorporate biodegradable and recycled materials into 70% of our product lines. This year, we launched a take-back program that allows customers to return worn shoes, which are then recycled or upcycled into new products, ensuring that fewer shoes end up in landfills. Additionally, we are reducing our reliance on virgin plastics by 50% and integrating bio-based alternatives into our production processes.',
  'Our efforts in 2024 have yielded significant results. Over 1.5 million pairs of shoes were produced using recycled plastics and plant-based fibers, demonstrating our commitment to sustainable innovation. Through our take-back program, we collected 500,000 pairs of shoes, diverting a substantial amount of waste from landfills and advancing our circular economy goals. Furthermore, our manufacturing improvements and transition to renewable energy have reduced our carbon emissions per shoe by 30%.',
  'While we are proud of our achievements, we recognize that our journey is far from complete. Moving forward, we remain steadfast in our commitment to driving industry-wide change and fostering partnerships that support environmental responsibility. Together with our stakeholders, partners, and customers, we can ensure that the future of footwear is not only stylish and functional but also sustainable.',
  'To further enhance our sustainability initiatives, we are investing heavily in research and development to pioneer the next generation of eco-friendly footwear technologies. Our innovation teams are exploring advanced bio-based materials, such as algae-based foams and mycelium leather, which have the potential to significantly reduce environmental impact. These materials not only minimize reliance on traditional plastics but also align with our vision for creating biodegradable and compostable shoes. By collaborating with leading scientists and material innovators, we aim to push the boundaries of what is possible in sustainable footwear design.',
]

const details: { label: string; value?: string; chip?: string; icon?: boolean }[] = [
  { label: 'Document Date:', value: 'January 27th, 2023' },
  { label: 'Service Line:', chip: 'BHT' },
  { label: 'Mimetype:', chip: 'PDF', icon: true },
  { label: 'Document Type:', chip: 'Official Business Record' },
  { label: 'Document Topic:', chip: 'Ipsos Opinions' },
  { label: 'Country:', chip: 'India' },
  { label: 'Services and Products:', chip: 'Footwear' },
  { label: 'Language:', chip: 'English' },
]

/** The opened reference: its name, then the cited passage highlighted in the page.
 * `width` is the text column (687 in the card); the bento sets it narrower. */
export function ReferencePassage({ width = 687, more = 1 }: { width?: number; more?: number }) {
  return (
    <div className="relative" data-name="pdf">
      <ol start={1} className={`${sans} ml-[47px] list-decimal overflow-hidden text-ellipsis whitespace-nowrap pt-[14px] text-[14px] font-bold ${text}`}>
        <li className="ms-[21px]"><span className="leading-[normal]">Research_Jan2023.pdf</span></li>
      </ol>
      <div className="absolute left-[17px] top-[15px] size-[16.955px] overflow-clip rounded-[3.179px] border-[1.06px] border-solid border-[rgba(46,203,202,0.23)]" data-name="heavy checkbox" />
      <div className="absolute right-[8px] top-[15px] size-[24px] rotate-180"><div className="absolute left-1/2 top-[calc(50%+1px)] size-[10px] -translate-x-1/2 -translate-y-1/2"><Image unoptimized width={10} height={10} alt="" className="absolute inset-0 block size-full max-w-none" src={imgDropdownArrow} /></div></div>
      <div className={`${sans} ml-[51px] mt-[8px] whitespace-pre-wrap text-[14px] leading-[18px] [word-break:break-word] ${light}`} style={{ width }}>
        <p className="mb-[18px]">
          <span className={`${display} font-bold ${text}`}>Page 23</span>
          <span className={text}> </span>- Every step we take can lead to a more sustainable future. As a leader in the footwear industry, we are acutely aware of the environmental challenges posed by our sector and are committed to reducing our footprint while driving innovation in sustainable materials and practices.{' '}
          {/* The passage the answer cited, highlighted where it sits on the page. */}
          <span data-fragment="passage" className={`${display} bg-[rgba(46,203,202,0.23)] font-bold [box-decoration-break:clone]`}>Billions of shoes end up in landfills yearly, taking hundreds of even thousands of years to decompose. Many shoes contain non-biodegradable plastics, including polyurethane and synthetic rubber, which significantly contribute to global waste and environmental degradation.</span>
          {' '}This reality underscores the urgent need for transformative action and a shift towards a circular economy within the footwear industry.
        </p>
        {paragraphs.slice(0, more).map((paragraph, index) => <p key={index} className="mb-[18px]">{paragraph}</p>)}
      </div>
    </div>
  )
}

/** The document's details, listed under the passage. */
export function ReferenceDetails({ count = details.length }: { count?: number }) {
  return (
    <div data-fragment="details" className="flex w-[515px] flex-col items-start gap-[2px] border-l border-solid border-[rgba(115,115,115,0.6)] pl-[12px]" data-name="resource details">
      {details.slice(0, count).map(detail => (
        <div key={detail.label} className="flex h-[25px] w-full items-baseline gap-[6px] py-[2px]">
          <p className={`${sans} whitespace-nowrap text-[12px] leading-[15px] tracking-[0.12px] ${light}`}>{detail.label}</p>
          {detail.value && <p className={`${sans} whitespace-nowrap text-[12px] leading-[15px] tracking-[0.12px] ${text}`}>{detail.value}</p>}
          {detail.chip && <div className="flex shrink-0 items-center gap-[6px] rounded-[9px] border-[0.5px] border-solid border-[rgba(211,221,224,0.9)] px-[10px] py-[3px]" data-name="chips">
            <p className={`${sans} whitespace-nowrap text-center text-[12px] leading-[15px] tracking-[0.12px] ${text}`}>{detail.chip}</p>
            {detail.icon && <div className="relative size-[15px] shrink-0"><Image unoptimized width={15} height={15} alt="" className="absolute inset-0 block size-full max-w-none" src={imgPdf} /></div>}
          </div>}
        </div>
      ))}
    </div>
  )
}

/** The card's actions: send the passage to a new chat, download, copy the citation. */
export function ReferenceActions() {
  return (
    <div className="flex items-center gap-[10px]">
      {[{ icon: imgTransfer, label: 'To new chat' }, { icon: imgDownload, label: 'Download' }, { icon: imgBook, label: 'Copy citation' }].map(action => (
        <div key={action.label} className="flex items-center gap-[2px]">
          <div className="relative size-[24px] rounded-[4px] opacity-60"><div className="absolute inset-[15.38%]"><Image unoptimized width={17} height={17} alt="" className="absolute inset-0 block size-full max-w-none" src={action.icon} /></div></div>
          <p className={`${sans} whitespace-nowrap text-[12px] leading-[15px] tracking-[0.12px] [text-shadow:0px_0px_4px_rgba(0,0,0,0.25)] ${text}`}>{action.label}</p>
        </div>
      ))}
    </div>
  )
}
