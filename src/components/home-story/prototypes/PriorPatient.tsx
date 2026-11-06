// Faithful Figma reconstruction; see docs/reviews/human-figma-source-map.md.
import Image from 'next/image'

const imgExpanderClosed = '/design-lab/human/assets/473d0b31-3822-403f-8ad7-d1e195d387e9.svg';

export function PriorPatient() {
  return (
    <div className="relative size-full" data-node-id="4632:425917" data-name="proto/patient bar">
      <div className="absolute bg-[#4a6a7b] inset-0 overflow-clip" data-node-id="I4632:425917;271:16315" data-name="patient name bar _v2">
        <div className="-translate-y-1/2 [word-break:break-word] absolute flex flex-col font-[family-name:'Source_Sans_Pro'] font-light justify-center leading-[0] left-[35px] not-italic text-[22px] text-white top-[23px] w-[175px]" data-node-id="I4632:425917;271:16315;33:46" style={{ fontFeatureSettings: '"onum" 1, "pnum" 1' }}>
          <p className="leading-[normal]">Patient record</p>
        </div>
        <div className="-translate-y-1/2 absolute bg-[rgba(255,255,255,0.06)] h-[36px] left-[calc(42.86%+96.64px)] right-[87.5px] rounded-[3px] top-1/2" data-node-id="I4632:425917;271:16315;437:5330">
          <p className="[word-break:break-word] absolute font-[family-name:'Source_Sans_Pro'] font-normal leading-none left-[15px] not-italic text-[15px] text-white top-[10.5px] w-[277px]" data-node-id="I4632:425917;271:16315;33:51">
            Invasive ductal carcinoma of the breast
          </p>
          <div className="[word-break:break-word] absolute contents left-[312px] not-italic top-[3px] whitespace-nowrap" data-node-id="I4632:425917;271:16315;33:47">
            <p className="absolute font-[family-name:'Source_Sans_Pro'] font-light leading-[19px] left-[312px] text-[15px] text-white top-[14px]" data-node-id="I4632:425917;271:16315;33:48">
              IV
            </p>
            <p className="absolute font-[family-name:'Source_Sans_Pro'] font-normal leading-none left-[312px] text-[12px] text-[rgba(255,255,255,0.94)] top-[3px] tracking-[0.36px]" data-node-id="I4632:425917;271:16315;33:49" style={{ fontFeatureSettings: '"lnum" 1, "pnum" 1' }}>
              Last Staging
            </p>
          </div>
          <div className="absolute contents right-[15.5px] top-[10px]" data-node-id="I4632:425917;271:16315;437:6579">
            <div className="-translate-y-1/2 [word-break:break-word] absolute flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal justify-center leading-[0] not-italic right-[77px] text-[12px] text-white top-[18px] tracking-[0.36px] translate-x-full whitespace-nowrap" data-node-id="I4632:425917;271:16315;437:5641">
              <p className="leading-[12px]">(1 more)</p>
            </div>
            <div className="absolute right-[15.5px] size-[16px] top-[10px]" data-node-id="I4632:425917;271:16315;437:5894" data-name="expander/closed">
              <Image unoptimized width={16} height={16}  alt="" className="absolute block inset-0 max-w-none size-full" src={imgExpanderClosed} />
            </div>
          </div>
        </div>
        <div className="-translate-y-1/2 [word-break:break-word] absolute flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal justify-center leading-[0] not-italic right-[57px] text-[15px] text-white top-[calc(50%+0.5px)] translate-x-full whitespace-nowrap" data-node-id="I4632:425917;271:16315;437:7386">
          <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[normal] underline">Profile</p>
        </div>
        <div className="[word-break:break-word] absolute contents left-[calc(14.29%+165.21px)] not-italic top-[8px] whitespace-nowrap" data-node-id="I4632:425917;271:16315;437:7852">
          <p className="absolute font-[family-name:'Source_Sans_Pro'] font-light leading-[19px] left-[calc(14.29%+165.21px)] text-[15px] text-white top-[19.5px]" data-node-id="I4632:425917;271:16315;437:7853">
            5 Apr 1967 (age 53)
          </p>
          <p className="absolute font-[family-name:'Source_Sans_Pro'] font-normal leading-none left-[calc(14.29%+165.21px)] text-[12px] text-[rgba(255,255,255,0.94)] top-[8px] tracking-[0.36px]" data-node-id="I4632:425917;271:16315;437:7854" style={{ fontFeatureSettings: '"lnum" 1, "pnum" 1' }}>
            DoB
          </p>
        </div>
        <div className="[word-break:break-word] absolute contents left-[calc(28.57%+139.93px)] not-italic top-[8px] whitespace-nowrap" data-node-id="I4632:425917;271:16315;491:81234">
          <p className="absolute font-[family-name:'Source_Sans_Pro'] font-light leading-[19px] left-[calc(28.57%+139.93px)] text-[15px] text-white top-[19.5px]" data-node-id="I4632:425917;271:16315;491:81235">
            Optum / Private
          </p>
          <p className="absolute font-[family-name:'Source_Sans_Pro'] font-normal leading-none left-[calc(28.57%+139.93px)] text-[12px] text-[rgba(255,255,255,0.94)] top-[8px] tracking-[0.36px]" data-node-id="I4632:425917;271:16315;491:81236" style={{ fontFeatureSettings: '"lnum" 1, "pnum" 1' }}>
            Payer / LOB
          </p>
        </div>
      </div>
    </div>
  );
}
