// Faithful Figma reconstruction; see docs/reviews/human-figma-source-map.md.
import Image from 'next/image'

const imgAttention = '/design-lab/human/assets/ce8d6f4b-e04a-4065-bac4-8f16f92241d7.svg';
const imgExpanderOpen = '/design-lab/human/assets/538194d1-211e-4977-baff-a0f3547d270b.svg';
const imgExpanderOpen1 = '/design-lab/human/assets/6c7144ba-0f59-4e0c-953c-ea26b6fdc758.svg';
const imgVector134 = '/design-lab/human/assets/78ca102c-cf21-4cd0-a274-b60712f0b12a.svg';

function TimerBoxWarning({ className }: { className?: string }) {
  return (
    <div className={className || "h-[27px] relative w-[116px]"} data-node-id="1048:113886" data-name="timer box/warning">
      <div className="absolute bg-[#f7f4f2] inset-0 overflow-clip rounded-[4px] shadow-[0px_1px_5px_0px_rgba(0,0,0,0.14)]" data-node-id="1048:113887" data-name="timer box/standard">
        <div className="absolute bg-[#aa3a0d] bottom-0 h-[2px] left-0 right-0" data-node-id="I1048:113887;1048:113882" />
        <div className="absolute content-stretch flex items-end left-[20px] overflow-clip top-[6px]" data-node-id="I1048:113887;1048:113883" data-name="timeLeft/emergency">
          <div className="[word-break:break-word] content-stretch flex gap-px items-end leading-[0] not-italic overflow-clip relative shrink-0 text-[#aa3a0d]" data-node-id="I1048:113887;1048:113883;504:46">
            <div className="flex flex-col font-[family-name:'Source_Sans_Pro'] font-semibold justify-center relative shrink-0 text-[15px] whitespace-nowrap" data-node-id="I1048:113887;1048:113883;504:47">
              <p className="leading-none">50</p>
            </div>
            <div className="flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal h-[12px] justify-center relative shrink-0 text-[12px] tracking-[0.36px] w-[10px]" data-node-id="I1048:113887;1048:113883;504:48">
              <p className="leading-[12px]">m</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PriorRequest() {
  return (
    <div className="relative size-full" data-node-id="4632:624732" data-name="proto/casebar_collapsed">
      <div className="absolute bg-[#fcfcfc] inset-0 overflow-clip" data-node-id="I4632:624732;271:10173;1456:191817" data-name="Case bar 3/collapsed">
        <div className="absolute bg-[#4a6a7b] bottom-0 h-[2px] left-0 right-0" data-node-id="I4632:624732;271:10173;1456:191817;434:41" />
        <div className="absolute content-stretch flex gap-[15px] items-center left-[35px] overflow-clip top-[21px]" data-node-id="I4632:624732;271:10173;1456:191817;434:58">
          <p className="[word-break:break-word] font-[family-name:'Source_Sans_Pro'] font-normal leading-[normal] not-italic relative shrink-0 text-[18px] text-[rgba(0,0,0,0.85)] whitespace-nowrap" data-node-id="I4632:624732;271:10173;1456:191817;434:59" style={{ fontFeatureSettings: '"onum" 1, "pnum" 1' }}>
            Trastuzumab + Taxol
          </p>
          <div className="relative shrink-0 size-[15px]" data-node-id="I4632:624732;271:10173;1456:191817;554:8781" data-name="attention">
            <Image unoptimized width={15} height={15}  alt="" className="absolute block inset-0 max-w-none size-full" src={imgAttention} />
          </div>
        </div>
        <p className="[word-break:break-word] absolute font-[family-name:'Source_Sans_Pro'] font-normal leading-none left-[35px] not-italic text-[12px] text-[rgba(0,0,0,0.65)] top-[47px] tracking-[0.36px] w-[436px]" data-node-id="I4632:624732;271:10173;1456:191817;434:43" style={{ fontFeatureSettings: '"lnum" 1, "pnum" 1' }}>
          +2 protocols in RN Review
        </p>
        <div className="absolute h-[15px] left-[35px] top-[2px] w-[158px]" data-node-id="I4632:624732;271:10173;1456:191817;1048:121068">
          <div className="-translate-y-1/2 absolute flex h-[11.375px] items-center justify-center left-[-17px] top-[calc(50%+0.69px)] w-[7px]" data-node-id="I4632:624732;271:10173;1456:191817;1048:121069">
            <div className="flex-none rotate-90">
              <div className="h-[7px] relative w-[11.375px]" data-name="expander/open">
                <Image unoptimized width={11.375} height={7}  alt="" className="absolute block inset-0 max-w-none size-full" src={imgExpanderOpen} />
              </div>
            </div>
          </div>
          <div className="-translate-y-1/2 absolute flex h-[11.375px] items-center justify-center right-[-17px] top-[calc(50%+0.69px)] w-[7px]" data-node-id="I4632:624732;271:10173;1456:191817;1048:121071">
            <div className="flex-none rotate-90">
              <div className="h-[7px] relative w-[11.375px]" data-name="expander/open">
                <Image unoptimized width={11.375} height={7}  alt="" className="absolute block inset-0 max-w-none size-full" src={imgExpanderOpen1} />
              </div>
            </div>
          </div>
          <p className="[word-break:break-word] absolute font-[family-name:'Source_Sans_Pro'] font-normal leading-[12px] not-italic right-[0.5px] text-[#126a6a] text-[12px] text-right top-[calc(50%-5.5px)] tracking-[0.36px] whitespace-nowrap" data-node-id="I4632:624732;271:10173;1456:191817;1048:121073">
            3 of 3
          </p>
          <p className="[word-break:break-word] absolute font-[family-name:'Source_Sans_Pro'] font-normal leading-[normal] left-0 not-italic text-[#126a6a] text-[12px] top-[calc(50%-7.5px)] tracking-[1.2px] uppercase whitespace-nowrap" data-node-id="I4632:624732;271:10173;1456:191817;1048:121074" style={{ fontFeatureSettings: '"lnum" 1, "pnum" 1' }}>
            Current request
          </p>
        </div>
        <button className="absolute bottom-[31.82%] contents cursor-pointer right-[10.61px] top-[32.6%]" data-node-id="I4632:624732;271:10173;1456:191817;437:8864" data-name="collapser">
          <div className="absolute bottom-[31.82%] right-[10.61px] top-[32.6%] w-[22.387px]" data-node-id="I4632:624732;271:10173;1456:191817;434:46" data-name="closed">
            <div className="absolute inset-[38.71%_26.67%]" data-node-id="I4632:624732;271:10173;1456:191817;434:47">
              <div className="absolute inset-[-23.57%_-11.96%_-19.56%_-11.96%]">
                <Image unoptimized width={12.9474} height={7.59053}  alt="" className="block max-w-none size-full" src={imgVector134} />
              </div>
            </div>
          </div>
        </button>
        <div className="absolute content-stretch flex gap-[14px] items-start right-[59px] top-[19px]" data-node-id="I4632:624732;271:10173;1456:191817;1048:126034">
          <TimerBoxWarning className="h-[27px] relative shrink-0 w-[116px]" />
          <div className="bg-[#51548d] content-stretch flex gap-[5px] items-center overflow-clip px-[10px] py-[4px] relative rounded-[4px] shadow-[0px_1px_5px_0px_rgba(0,0,0,0.14)] shrink-0" data-node-id="I4632:624732;271:10173;1456:191817;554:7959" data-name="button/high/default">
            <div className="[word-break:break-word] flex flex-col font-[family-name:'Source_Sans_Pro'] font-semibold justify-center leading-[0] not-italic relative shrink-0 text-[15px] text-white tracking-[0.45px] whitespace-nowrap" data-node-id="I4632:624732;271:10173;1456:191817;554:7959;209:125">
              <p className="leading-[normal]">Determination</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
