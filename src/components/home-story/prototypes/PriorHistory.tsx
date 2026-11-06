// Faithful Figma reconstruction; see docs/reviews/human-figma-source-map.md.
import Image from 'next/image'

const imgTimeArrow = '/design-lab/human/assets/c4ec0b39-e339-487a-9b05-523ee9bbc63d.svg';
const imgBorderTop = '/design-lab/human/assets/c29829c7-9635-458c-b088-2fef84b26e0d.svg';
const imgBorderTop1 = '/design-lab/human/assets/4ef9ada5-3115-4079-be94-1aafb143bffc.svg';
const imgExpanderOpen = '/design-lab/human/assets/e508b33a-5150-4ad9-bbe1-0fcbf6f09e3b.svg';
const imgDot = '/design-lab/human/assets/2083cb42-178b-4fd8-84d6-741faf75fd6e.svg';
const imgEllipse60 = '/design-lab/human/assets/966b30b2-99d7-4bbd-bc69-b8e88185c08f.svg';
const imgVector = '/design-lab/human/assets/74d23d4a-e22c-40d4-8cd2-e4f48a4481a2.svg';
const imgSearchGlass = '/design-lab/human/assets/58caec07-9d01-4d07-acf5-2a03ae456734.svg';

function TimeArrow({ className }: { className?: string }) {
  return (
    <div className={className || "h-[31px] relative w-[5px]"} data-node-id="2752:568" data-name="time arrow">
      <div className="absolute inset-[-3.23%_-20%_0_-20%]">
        <Image unoptimized width={7} height={32}  alt="" className="block max-w-none size-full" src={imgTimeArrow} />
      </div>
    </div>
  );
}

export function PriorHistory() {
  return (
    <div className="relative size-full" data-node-id="4632:425919" data-name="proto/history">
      <div className="absolute bottom-0 drop-shadow-[0px_1px_7.5px_rgba(0,0,0,0.08)] left-0 overflow-clip top-0 w-[527px]" data-node-id="I4632:425919;314:47602" data-name="left-frame">
        <div className="absolute bg-white inset-[40px_0_0_0] rounded-bl-[3px] rounded-br-[3px] rounded-tr-[3px]" data-node-id="I4632:425919;314:47602;64:29496" data-name="main space" />
        <div className="absolute content-stretch flex items-start left-0 top-0" data-node-id="I4632:425919;314:47602;64:34099" data-name="TabBar/Documents">
          <div className="content-stretch flex items-start overflow-clip relative rounded-tl-[3px] rounded-tr-[3px] shrink-0" data-node-id="I4632:425919;314:47602;64:34099;64:34037" data-name="TabBar/History">
            <div className="bg-white h-[40px] overflow-clip relative rounded-tl-[3px] rounded-tr-[3px] shrink-0 w-[130px]" data-node-id="I4632:425919;314:47602;64:34099;64:34037;64:33843" data-name="tab/on">
              <div className="absolute bg-[#51548d] h-[5px] left-0 right-0 top-0" data-node-id="I4632:425919;314:47602;64:34099;64:34037;64:33843;442:24" />
              <div className="[word-break:break-word] absolute flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal inset-[12.5%_20px_0_20px] justify-center leading-[0] not-italic text-[15px] text-[rgba(0,0,0,0.85)]" data-node-id="I4632:425919;314:47602;64:34099;64:34037;64:33843;442:25" style={{ fontFeatureSettings: '"lnum" 1, "pnum" 1' }}>
                <p className="leading-[normal]">History</p>
              </div>
            </div>
            <button className="bg-[#f7f7f7] block cursor-pointer h-[40px] overflow-clip relative rounded-tl-[3px] rounded-tr-[3px] shrink-0 w-[130px]" data-node-id="I4632:425919;314:47602;64:34099;64:34037;64:33844" data-name="tab/off">
              <div className="[word-break:break-word] absolute flex flex-col font-[family-name:'Source_Sans_Pro'] font-light inset-[12.5%_20px_0_20px] justify-center leading-[0] not-italic text-[15px] text-[rgba(0,0,0,0.65)] text-left" data-node-id="I4632:425919;314:47602;64:34099;64:34037;64:33844;442:46" style={{ fontFeatureSettings: '"lnum" 1, "pnum" 1' }}>
                <p className="leading-[normal]">Documents</p>
              </div>
              <div className="absolute bg-[#c4c4c4] bottom-[-2px] h-[2px] left-0 right-0 shadow-[0px_0px_10px_0.5px_rgba(0,0,0,0.09)]" data-node-id="I4632:425919;314:47602;64:34099;64:34037;64:33844;531:40" data-name="bottom shadow" />
              <div className="absolute bg-[#c4c4c4] bottom-[-2px] left-[-2px] shadow-[0px_0px_10px_0.5px_rgba(0,0,0,0.09)] top-0 w-[2px]" data-node-id="I4632:425919;314:47602;64:34099;64:34037;64:33844;531:57" data-name="left shadow" />
            </button>
            <button className="bg-[#f7f7f7] block cursor-pointer h-[40px] overflow-clip relative rounded-tl-[3px] rounded-tr-[3px] shrink-0 w-[130px]" data-node-id="I4632:425919;314:47602;64:34099;64:34037;64:33845" data-name="tab/off">
              <div className="[word-break:break-word] absolute flex flex-col font-[family-name:'Source_Sans_Pro'] font-light inset-[12.5%_20px_0_20px] justify-center leading-[0] not-italic text-[15px] text-[rgba(0,0,0,0.65)] text-left" data-node-id="I4632:425919;314:47602;64:34099;64:34037;64:33845;442:46" style={{ fontFeatureSettings: '"lnum" 1, "pnum" 1' }}>
                <p className="leading-[normal]">Actions</p>
              </div>
              <div className="absolute bg-[#c4c4c4] bottom-[-2px] h-[2px] left-0 right-0 shadow-[0px_0px_10px_0.5px_rgba(0,0,0,0.09)]" data-node-id="I4632:425919;314:47602;64:34099;64:34037;64:33845;531:40" data-name="bottom shadow" />
              <div className="absolute bg-[#c4c4c4] bottom-[-2px] left-[-2px] shadow-[0px_0px_10px_0.5px_rgba(0,0,0,0.09)] top-0 w-[2px]" data-node-id="I4632:425919;314:47602;64:34099;64:34037;64:33845;531:57" data-name="left shadow" />
            </button>
          </div>
        </div>
      </div>
      <div className="absolute inset-[40px_0_0_0]" data-node-id="I4632:425919;1502:163110">
        <div className="absolute contents left-[20px] top-[67px]" data-node-id="I4632:425919;508:739">
          <div className="-translate-y-1/2 [word-break:break-word] absolute flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal justify-center leading-[0] left-[20px] not-italic text-[12px] text-[rgba(0,0,0,0.65)] top-[77px] tracking-[0.36px] whitespace-nowrap" data-node-id="I4632:425919;508:740">
            <p className="leading-[12px]">Events:</p>
          </div>
          <div className="absolute content-stretch flex gap-[5px] items-start left-[68px] overflow-clip top-[67px]" data-node-id="I4632:425919;508:741">
            <div className="content-stretch flex items-start relative shrink-0" data-node-id="I4632:425919;508:742" data-name="text toggle_small/on">
              <div className="bg-[#dbdbef] border border-[#51548d] border-solid content-stretch flex gap-[5px] items-end overflow-clip px-[7px] py-[4px] relative rounded-[4px] shrink-0" data-node-id="I4632:425919;508:742;576:2358" data-name="text toggle/on">
                <div className="[word-break:break-word] flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal justify-center leading-[0] not-italic relative shrink-0 text-[#464761] text-[12px] text-center tracking-[0.36px] whitespace-nowrap" data-node-id="I4632:425919;508:742;576:2358;577:2347">
                  <p className="leading-[12px]">ALL</p>
                </div>
              </div>
            </div>
            <div className="content-stretch flex items-start relative shrink-0" data-node-id="I4632:425919;508:743" data-name="text toggle_small/default">
              <div className="bg-[rgba(255,255,255,0.94)] border border-[rgba(211,221,224,0.9)] border-solid content-stretch flex gap-[5px] items-end overflow-clip px-[7px] py-[4px] relative rounded-[4px] shrink-0" data-node-id="I4632:425919;508:743;576:2356" data-name="text toggle/default">
                <div className="[word-break:break-word] flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal justify-center leading-[0] not-italic relative shrink-0 text-[12px] text-[rgba(0,0,0,0.65)] text-center tracking-[0.36px] whitespace-nowrap" data-node-id="I4632:425919;508:743;576:2356;576:2326">
                  <p className="leading-[12px]">Notes</p>
                </div>
              </div>
            </div>
            <div className="content-stretch flex items-start relative shrink-0" data-node-id="I4632:425919;508:744" data-name="text toggle_small/default">
              <div className="bg-[rgba(255,255,255,0.94)] border border-[rgba(211,221,224,0.9)] border-solid content-stretch flex gap-[5px] items-end overflow-clip px-[7px] py-[4px] relative rounded-[4px] shrink-0" data-node-id="I4632:425919;508:744;576:2356" data-name="text toggle/default">
                <div className="[word-break:break-word] flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal justify-center leading-[0] not-italic relative shrink-0 text-[12px] text-[rgba(0,0,0,0.65)] text-center tracking-[0.36px] whitespace-nowrap" data-node-id="I4632:425919;508:744;576:2356;576:2326">
                  <p className="leading-[12px]">Fax</p>
                </div>
              </div>
            </div>
            <div className="content-stretch flex items-start relative shrink-0" data-node-id="I4632:425919;508:745" data-name="text toggle_small/default">
              <div className="bg-[rgba(255,255,255,0.94)] border border-[rgba(211,221,224,0.9)] border-solid content-stretch flex gap-[5px] items-end overflow-clip px-[7px] py-[4px] relative rounded-[4px] shrink-0" data-node-id="I4632:425919;508:745;576:2356" data-name="text toggle/default">
                <div className="[word-break:break-word] flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal justify-center leading-[0] not-italic relative shrink-0 text-[12px] text-[rgba(0,0,0,0.65)] text-center tracking-[0.36px] whitespace-nowrap" data-node-id="I4632:425919;508:745;576:2356;576:2326">
                  <p className="leading-[12px]">Phone calls</p>
                </div>
              </div>
            </div>
            <div className="content-stretch flex items-start relative shrink-0" data-node-id="I4632:425919;508:746" data-name="text toggle_small/default">
              <div className="bg-[rgba(255,255,255,0.94)] border border-[rgba(211,221,224,0.9)] border-solid content-stretch flex gap-[5px] items-end overflow-clip px-[7px] py-[4px] relative rounded-[4px] shrink-0" data-node-id="I4632:425919;508:746;576:2356" data-name="text toggle/default">
                <div className="[word-break:break-word] flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal justify-center leading-[0] not-italic relative shrink-0 text-[12px] text-[rgba(0,0,0,0.65)] text-center tracking-[0.36px] whitespace-nowrap" data-node-id="I4632:425919;508:746;576:2356;576:2326">
                  <p className="leading-[12px]">Attachments</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute contents left-[20px] top-[130px]" data-node-id="I4632:425919;587:360">
          <div className="-translate-y-1/2 [word-break:break-word] absolute flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal justify-center leading-[0] left-[20px] not-italic text-[12px] text-[rgba(0,0,0,0.65)] top-[140px] tracking-[0.36px] whitespace-nowrap" data-node-id="I4632:425919;587:361">
            <p className="leading-[12px]">Threads:</p>
          </div>
          <div className="absolute content-stretch flex gap-[5px] items-start left-[78px] overflow-clip top-[130px]" data-node-id="I4632:425919;587:362">
            <div className="content-stretch flex items-start relative shrink-0" data-node-id="I4632:425919;587:363" data-name="text toggle_small/on">
              <div className="bg-[#dbdbef] border border-[#51548d] border-solid content-stretch flex gap-[5px] items-end overflow-clip px-[7px] py-[4px] relative rounded-[4px] shrink-0" data-node-id="I4632:425919;587:363;576:2358" data-name="text toggle/on">
                <div className="[word-break:break-word] flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal justify-center leading-[0] not-italic relative shrink-0 text-[#464761] text-[12px] text-center tracking-[0.36px] whitespace-nowrap" data-node-id="I4632:425919;587:363;576:2358;577:2347">
                  <p className="leading-[12px]">ALL</p>
                </div>
              </div>
            </div>
            <div className="content-stretch flex items-start relative shrink-0" data-node-id="I4632:425919;587:364" data-name="text toggle_small/default">
              <div className="bg-[rgba(255,255,255,0.94)] border border-[rgba(211,221,224,0.9)] border-solid content-stretch flex gap-[5px] items-end overflow-clip px-[7px] py-[4px] relative rounded-[4px] shrink-0" data-node-id="I4632:425919;587:364;576:2356" data-name="text toggle/default">
                <div className="[word-break:break-word] flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal justify-center leading-[0] not-italic relative shrink-0 text-[12px] text-[rgba(0,0,0,0.65)] text-center tracking-[0.36px] whitespace-nowrap" data-node-id="I4632:425919;587:364;576:2356;576:2326">
                  <p className="leading-[12px]">Treatment</p>
                </div>
              </div>
            </div>
            <div className="content-stretch flex items-start relative shrink-0" data-node-id="I4632:425919;587:365" data-name="text toggle_small/default">
              <div className="bg-[rgba(255,255,255,0.94)] border border-[rgba(211,221,224,0.9)] border-solid content-stretch flex gap-[5px] items-end overflow-clip px-[7px] py-[4px] relative rounded-[4px] shrink-0" data-node-id="I4632:425919;587:365;576:2356" data-name="text toggle/default">
                <div className="[word-break:break-word] flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal justify-center leading-[0] not-italic relative shrink-0 text-[12px] text-[rgba(0,0,0,0.65)] text-center tracking-[0.36px] whitespace-nowrap" data-node-id="I4632:425919;587:365;576:2356;576:2326">
                  <p className="leading-[12px]">Supportive</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute h-[15px] left-[9.5px] top-[102px] w-[504px]" data-node-id="I4632:425919;314:47609" data-name="expanding_section_title">
          <div className="absolute inset-[0_14px_0_0] overflow-clip" data-node-id="I4632:425919;314:47609;40:11171" data-name="section_title">
            <div className="absolute content-stretch flex gap-[8px] items-center left-[10px] overflow-clip top-0" data-node-id="I4632:425919;314:47609;40:11171;10:893" data-name="section_title">
              <p className="[word-break:break-word] font-[family-name:'Source_Sans_Pro'] font-normal leading-[normal] not-italic relative shrink-0 text-[12px] text-[rgba(0,0,0,0.65)] tracking-[1.2px] uppercase whitespace-nowrap" data-node-id="I4632:425919;314:47609;40:11171;10:894" style={{ fontFeatureSettings: '"lnum" 1, "pnum" 1' }}>
                Ref# 13276143 (4)
              </p>
              <div className="h-0 relative shrink-0 w-[523px]" data-node-id="I4632:425919;314:47609;40:11171;10:895" data-name="border-top">
                <div className="absolute inset-[-0.5px_0]">
                  <Image unoptimized width={523} height={1}  alt="" className="block max-w-none size-full" src={imgBorderTop} />
                </div>
              </div>
            </div>
            <div className="-translate-y-1/2 absolute h-0 left-0 top-1/2 w-[5px]" data-node-id="I4632:425919;314:47609;40:11171;269:83567" data-name="border-top">
              <div className="absolute inset-[-0.5px_0]">
                <Image unoptimized width={5} height={1}  alt="" className="block max-w-none size-full" src={imgBorderTop1} />
              </div>
            </div>
          </div>
          <div className="-translate-y-1/2 absolute right-[-3px] size-[16px] top-[calc(50%+0.5px)]" data-node-id="I4632:425919;314:47609;40:11172" data-name="expander/open">
            <Image unoptimized width={16} height={16}  alt="" className="absolute block inset-0 max-w-none size-full" src={imgExpanderOpen} />
          </div>
        </div>
        <div className="absolute content-stretch flex flex-col gap-[10px] items-center left-[10px] top-[166px]" data-node-id="I4632:425919;314:47611">
          <div className="bg-white drop-shadow-[0px_0px_15px_#ebebeb] h-[60px] relative rounded-[4px] shrink-0 w-full" data-node-id="I4632:425919;314:47617" data-name="hist_row/default">
            <div className="[word-break:break-word] absolute font-[family-name:'Source_Sans_Pro'] font-normal h-[43px] leading-[12px] left-[10px] not-italic text-[12px] top-[10px] tracking-[0.36px] w-[60px] whitespace-nowrap" data-node-id="I4632:425919;314:47617;224:10389">
              <p className="absolute left-0 text-[rgba(0,0,0,0.65)] top-[14px]" data-node-id="I4632:425919;314:47617;219:566341">
                13:15 - 13:30
              </p>
              <p className="absolute left-0 text-[rgba(0,0,0,0.65)] top-0" data-node-id="I4632:425919;314:47617;219:566245">
                20 Jun 2020
              </p>
              <p className="absolute left-0 text-[rgba(0,0,0,0.85)] top-[28px]" data-node-id="I4632:425919;314:47617;219:566342">
                Reviewer
              </p>
            </div>
            <div className="[word-break:break-word] absolute contents left-[144px] not-italic right-[10px] text-[15px] top-[9px]" data-node-id="I4632:425919;314:47617;224:13473">
              <p className="absolute font-[family-name:'Source_Sans_Pro'] font-light inset-[31px_10px_10px_144px] leading-[19px] text-[rgba(0,0,0,0.65)]" data-node-id="I4632:425919;314:47617;219:564578">
                In process
              </p>
              <p className="absolute font-[family-name:'Source_Sans_Pro'] font-normal leading-none left-[144px] right-[34.65px] text-[rgba(0,0,0,0.85)] top-[9px]" data-node-id="I4632:425919;314:47617;219:566244">
                MD Review
              </p>
            </div>
            <div className="-translate-y-1/2 absolute left-[108px] size-[8px] top-1/2" data-node-id="I4632:425919;314:47617;219:584066" data-name="dot">
              <Image unoptimized width={8} height={8}  alt="" className="absolute block inset-0 max-w-none size-full" src={imgDot} />
            </div>
          </div>
          <div className="grid-rows-[max-content] inline-grid leading-[0] place-items-start relative shrink-0 w-full" data-node-id="I4632:425919;314:47618">
            <div className="col-1 h-[12px] ml-0 mt-0 relative row-1 w-full" data-node-id="I4632:425919;314:47619">
              <div className="absolute bottom-[33.33%] left-[110px] top-[33.33%] w-[4px]" data-node-id="I4632:425919;314:47619;219:585909">
                <Image unoptimized width={4} height={4}  alt="" className="absolute block inset-0 max-w-none size-full" src={imgEllipse60} />
              </div>
              <p className="[word-break:break-word] absolute bottom-0 font-[family-name:'Source_Sans_Pro'] font-normal leading-[12px] left-[144px] not-italic text-[12px] text-[rgba(0,0,0,0.65)] top-0 tracking-[0.36px] w-[337px]" data-node-id="I4632:425919;314:47619;219:585911">
                Your queue
              </p>
            </div>
          </div>
          <div className="bg-white drop-shadow-[0px_0px_15px_#ebebeb] h-[80px] relative rounded-[4px] shrink-0 w-full" data-node-id="I4632:425919;314:47620" data-name="hist_row/default">
            <div className="[word-break:break-word] absolute font-[family-name:'Source_Sans_Pro'] font-normal h-[43px] leading-[12px] left-[10px] not-italic text-[12px] top-[10px] tracking-[0.36px] w-[60px] whitespace-nowrap" data-node-id="I4632:425919;314:47620;224:10389">
              <p className="absolute left-0 text-[rgba(0,0,0,0.65)] top-[14px]" data-node-id="I4632:425919;314:47620;219:566341">
                13:03 - 13:08
              </p>
              <p className="absolute left-0 text-[rgba(0,0,0,0.65)] top-0" data-node-id="I4632:425919;314:47620;219:566245">
                20 Jun 2020
              </p>
              <p className="absolute left-0 text-[rgba(0,0,0,0.85)] top-[28px]" data-node-id="I4632:425919;314:47620;219:566342">
                Reviewer
              </p>
            </div>
            <div className="[word-break:break-word] absolute contents left-[144px] not-italic right-[10px] text-[15px] top-[9px]" data-node-id="I4632:425919;314:47620;224:13473">
              <div className="absolute font-[family-name:'Source_Sans_Pro'] font-light inset-[31px_10px_11px_144px] leading-[0] text-[rgba(0,0,0,0.65)]" data-node-id="I4632:425919;314:47620;219:564578">
                <p className="leading-[19px] mb-0">MD Assigned, RN assigned</p>
                <p>
                  <span className="[word-break:break-word] font-[family-name:'Source_Sans_Pro'] font-normal leading-[19px] not-italic">Office contact</span>
                  <span className="leading-[19px]">{` Records attached. DX and stage confirme...`}</span>
                </p>
              </div>
              <p className="absolute font-[family-name:'Source_Sans_Pro'] font-normal leading-none left-[144px] right-[34.65px] text-[rgba(0,0,0,0.85)] top-[9px] whitespace-pre-wrap" data-node-id="I4632:425919;314:47620;219:566244">{`CRS     Case intake`}</p>
            </div>
            <div className="absolute flex h-[11.186px] items-center justify-center left-[129px] top-[11.5px] w-[10px]" data-node-id="I4632:425919;314:47620;219:566378">
              <div className="-scale-y-100 flex-none rotate-90">
                <div className="h-[10px] relative w-[11.186px]" data-name="Vector">
                  <Image unoptimized width={11.1864} height={10}  alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector} />
                </div>
              </div>
            </div>
            <div className="-translate-y-1/2 absolute left-[108px] size-[8px] top-1/2" data-node-id="I4632:425919;314:47620;219:584066" data-name="dot">
              <Image unoptimized width={8} height={8}  alt="" className="absolute block inset-0 max-w-none size-full" src={imgDot} />
            </div>
          </div>
          <div className="grid-cols-[max-content] grid-rows-[max-content] inline-grid leading-[0] place-items-start relative shrink-0" data-node-id="I4632:425919;334:77069">
            <div className="col-1 h-[12px] ml-0 mt-0 relative row-1 w-[507px]" data-node-id="I4632:425919;334:77070">
              <div className="absolute bottom-[33.33%] left-[110px] top-[33.33%] w-[4px]" data-node-id="I4632:425919;334:77070;219:585909">
                <Image unoptimized width={4} height={4}  alt="" className="absolute block inset-0 max-w-none size-full" src={imgEllipse60} />
              </div>
              <p className="[word-break:break-word] absolute bottom-0 font-[family-name:'Source_Sans_Pro'] font-normal leading-[12px] left-[144px] not-italic text-[12px] text-[rgba(0,0,0,0.65)] top-0 tracking-[0.36px] w-[337px]" data-node-id="I4632:425919;334:77070;219:585911">
                CRS queue
              </p>
            </div>
          </div>
          <div className="bg-white drop-shadow-[0px_0px_15px_#ebebeb] h-[80px] relative rounded-[4px] shrink-0 w-[507px]" data-node-id="I4632:425919;402:23247" data-name="hist_row/default">
            <div className="[word-break:break-word] absolute font-[family-name:'Source_Sans_Pro'] font-normal h-[43px] leading-[12px] left-[10px] not-italic text-[12px] top-[10px] tracking-[0.36px] w-[60px] whitespace-nowrap" data-node-id="I4632:425919;402:23247;224:10389">
              <p className="absolute left-0 text-[rgba(0,0,0,0.65)] top-[14px]" data-node-id="I4632:425919;402:23247;219:566341">
                13:15 - 13:30
              </p>
              <p className="absolute left-0 text-[rgba(0,0,0,0.65)] top-0" data-node-id="I4632:425919;402:23247;219:566245">
                20 Jun 2020
              </p>
              <p className="absolute left-0 text-[rgba(0,0,0,0.85)] top-[28px]" data-node-id="I4632:425919;402:23247;219:566342">
                Reviewer
              </p>
            </div>
            <div className="[word-break:break-word] absolute contents left-[144px] not-italic right-[10px] text-[15px] top-[9px]" data-node-id="I4632:425919;402:23247;224:13473">
              <p className="absolute font-[family-name:'Source_Sans_Pro'] font-light inset-[31px_10px_11px_144px] leading-[19px] text-[rgba(0,0,0,0.65)]" data-node-id="I4632:425919;402:23247;219:564578">
                Trastuzumab + Taxol (stage IV), 6 cycles
                <br aria-hidden />
                Bone met.: XGeva...
              </p>
              <p className="absolute font-[family-name:'Source_Sans_Pro'] font-normal leading-none left-[144px] right-[34.65px] text-[rgba(0,0,0,0.85)] top-[9px] whitespace-pre-wrap" data-node-id="I4632:425919;402:23247;219:566244">{`System   Request received`}</p>
            </div>
            <div className="-translate-y-1/2 absolute left-[108px] size-[8px] top-1/2" data-node-id="I4632:425919;402:23247;219:584066" data-name="dot">
              <Image unoptimized width={8} height={8}  alt="" className="absolute block inset-0 max-w-none size-full" src={imgDot} />
            </div>
          </div>
        </div>
        <TimeArrow className="absolute h-[229px] left-[119.5px] top-[181px] w-[5px]" />
        <div className="absolute bg-[rgba(65,92,106,0.04)] h-[35px] left-[20px] right-[20px] rounded-[4px] top-[22px]" data-node-id="I4632:425919;314:47629" data-name="search/empty">
          <div className="-translate-y-1/2 absolute content-stretch flex gap-[15px] items-center left-[15px] overflow-clip top-[calc(50%+0.5px)]" data-node-id="I4632:425919;314:47629;495:2357" data-name="with left icon">
            <div className="content-stretch flex gap-[13px] items-center px-px py-[2px] relative shrink-0" data-node-id="I4632:425919;314:47629;495:2377" data-name="left content">
              <div className="relative shrink-0 size-[16px]" data-node-id="I4632:425919;314:47629;495:2378" data-name="Search glass">
                <Image unoptimized width={16} height={16}  alt="" className="absolute block inset-0 max-w-none size-full" src={imgSearchGlass} />
              </div>
            </div>
            <p className="[word-break:break-word] font-[family-name:'Source_Sans_Pro'] font-light leading-[19px] not-italic relative shrink-0 text-[15px] text-[rgba(0,0,0,0.85)] whitespace-nowrap" data-node-id="I4632:425919;314:47629;495:2361">
              Search for events
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
