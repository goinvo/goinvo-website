// Faithful Figma reconstruction; see docs/reviews/human-figma-source-map.md.
import Image from 'next/image'

const imgExpanderOpen = '/design-lab/human/assets/32293bb4-9909-49af-82c9-12d082b44cd3.svg';
const imgLine91 = '/design-lab/human/assets/d976a2bc-be4f-486e-b482-7732bddcf328.svg';
const imgIcon = '/design-lab/human/assets/89a3aa89-f3b2-4e1f-ad59-eea2b4fc3ffc.svg';
const imgExpanderOpen1 = '/design-lab/human/assets/b7410f80-a9e7-4d02-a163-29546e2b81df.svg';
const imgRequired = '/design-lab/human/assets/2866204c-455c-4f7f-8709-ad4f22478cc6.svg';
const imgRectangle993 = '/design-lab/human/assets/11ca06b9-097c-4193-a724-faafa7fcfbd7.svg';
const imgBorderTop = '/design-lab/human/assets/b10a3177-4b24-4044-8184-b7d053a12925.svg';
const imgBorderTop1 = '/design-lab/human/assets/14a08a21-5b25-4213-856e-cf444320d641.svg';
const imgExpanderOpen2 = '/design-lab/human/assets/0aa460e7-fb00-4bd1-bf03-0d12a6bfbb93.svg';
const imgExpanderClosed = '/design-lab/human/assets/38ca8c62-1483-45a4-a8e0-3b1e6bc9a234.svg';
const imgVerificationStatus = '/design-lab/human/assets/7c66cbb9-c534-457b-908f-c75e0e7e0de7.svg';
const imgExpanderClosed1 = '/design-lab/human/assets/43a5b1aa-c13f-400c-877f-5d35a340f554.svg';
const imgContentToggleRecord = '/design-lab/human/assets/3f1cd954-6787-4eb2-a2f8-df7836db19d0.svg';

function ExpanderOpen({ className }: { className?: string }) {
  return (
    <div className={className || "relative size-[16px]"} data-node-id="2752:242" data-name="expander/open">
      <Image unoptimized width={16} height={16}  alt="" className="absolute block inset-0 max-w-none size-full" src={imgExpanderOpen} />
    </div>
  );
}

function ConditionHeader({ className }: { className?: string }) {
  return (
    <div className={className || "bg-white h-[40px] relative w-[532px]"} data-node-id="218:551816" data-name="condition header">
      <div className="absolute bg-[rgba(65,92,106,0.04)] inset-[0_0_1px_0]" data-node-id="335:55430" />
      <div className="absolute bottom-0 left-0 top-full w-[532.001px]" data-node-id="218:521152">
        <div className="absolute inset-[-1px_0_0_0]">
          <Image unoptimized width={532.001} height={1}  alt="" className="block max-w-none size-full" src={imgLine91} />
        </div>
      </div>
      <div className="-translate-y-1/2 [word-break:break-word] absolute flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal justify-center leading-[0] left-[20px] not-italic right-[145px] text-[12px] text-[rgba(0,0,0,0.65)] top-[calc(50%+1.5px)] tracking-[1.2px] uppercase" data-node-id="218:521153" style={{ fontFeatureSettings: '"lnum" 1, "pnum" 1' }}>
        <p className="leading-[normal]">Invasive ductal carcinoma of breast</p>
      </div>
      <div className="-translate-y-1/2 absolute bg-[#fffeff] border border-[#51548d] border-solid content-stretch flex gap-[5px] items-start overflow-clip px-[7px] py-[5px] right-[10px] rounded-[4px] shadow-[0px_1px_5px_0px_rgba(0,0,0,0.14)] top-[calc(50%+1px)]" data-node-id="218:521154" data-name="button/medium/default">
        <div className="relative shrink-0 size-[10px]" data-node-id="I218:521154;209:130" data-name="icon">
          <Image unoptimized width={10} height={10}  alt="" className="absolute block inset-0 max-w-none size-full" src={imgIcon} />
        </div>
      </div>
      <div className="absolute contents left-[395.5px] top-[13px]" data-node-id="218:521155">
        <div className="absolute flex items-center justify-center left-[395.5px] size-[16px] top-[13px]" data-node-id="314:63246">
          <div className="-rotate-90 flex-none">
            <div className="relative size-[16px]" data-name="expander/open">
              <Image unoptimized width={16} height={16}  alt="" className="absolute block inset-0 max-w-none size-full" src={imgExpanderOpen1} />
            </div>
          </div>
        </div>
        <ExpanderOpen className="absolute flex items-center justify-center left-[448px] size-[16px] top-[13px]" />
        <div className="-translate-y-1/2 [word-break:break-word] absolute flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal justify-center leading-[0] not-italic right-[117px] text-[12px] text-[rgba(0,0,0,0.65)] top-[calc(50%+1px)] tracking-[0.36px] translate-x-full whitespace-nowrap" data-node-id="218:521158">
          <p className="leading-[12px]">1 of 2</p>
        </div>
      </div>
    </div>
  );
}

function Required({ className }: { className?: string }) {
  return (
    <div className={className || "h-[7px] relative w-[6.417px]"} data-node-id="2752:668" data-name="required">
      <Image unoptimized width={6.41655} height={7}  alt="" className="absolute block inset-0 max-w-none size-full" src={imgRequired} />
    </div>
  );
}

function VerificationStatus({ className }: { className?: string }) {
  return (
    <div className={className || "opacity-80 relative size-[13px]"} data-node-id="268:94087" data-name="verification status">
      <Required className="absolute inset-[23.08%_27.56%_23.08%_23.08%]" />
    </div>
  );
}

function RecordNav({ className }: { className?: string }) {
  return (
    <div className={className || "content-stretch flex flex-col items-center py-px relative"} data-node-id="64:34424" data-name="record/nav">
      <div className="bg-white h-[44px] overflow-clip relative rounded-br-[3px] rounded-tr-[3px] shrink-0 w-[80px]" data-node-id="64:34236" data-name="section_vert/on">
        <div className="[word-break:break-word] absolute flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal inset-[0_5px] justify-center leading-[0] not-italic text-[12px] text-[rgba(0,0,0,0.85)] tracking-[0.36px]" data-node-id="I64:34236;438:1333" style={{ fontFeatureSettings: '"lnum" 1, "pnum" 1' }}>
          <p className="leading-none">Patient</p>
        </div>
        <div className="absolute bottom-0 right-0 top-0 w-[3px]" data-node-id="I64:34236;438:1334">
          <Image unoptimized width={3} height={44}  alt="" className="absolute block inset-0 max-w-none size-full" src={imgRectangle993} />
        </div>
      </div>
      <div className="bg-[#f7f7f7] h-[44px] overflow-clip relative rounded-br-[3px] rounded-tr-[3px] shrink-0 w-[80px]" data-node-id="64:24719" data-name="section_vert/off">
        <div className="[word-break:break-word] absolute flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal inset-[0.35%_5px_-0.35%_5px] justify-center leading-[0] not-italic text-[12px] text-[rgba(0,0,0,0.65)] tracking-[0.36px]" data-node-id="I64:24719;438:1336" style={{ fontFeatureSettings: '"lnum" 1, "pnum" 1' }}>
          <p className="leading-none">Disease Summary</p>
        </div>
        <div className="absolute bg-[#f7f7f7] h-[2px] left-0 right-0 shadow-[0px_0px_5.5px_1px_rgba(0,0,0,0.11)] top-[-2px]" data-node-id="I64:24719;531:78" data-name="top shadow" />
        <div className="absolute bg-[#f7f7f7] bottom-[2px] left-[-2px] shadow-[0px_0px_5.5px_0.5px_rgba(0,0,0,0.11)] top-0 w-[2px]" data-node-id="I64:24719;531:79" data-name="left shadow" />
      </div>
      <div className="bg-[#f7f7f7] h-[44px] overflow-clip relative rounded-br-[3px] rounded-tr-[3px] shrink-0 w-[80px]" data-node-id="64:24721" data-name="section_vert/off">
        <div className="[word-break:break-word] absolute flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal inset-[0.35%_5px_-0.35%_5px] justify-center leading-[0] not-italic text-[12px] text-[rgba(0,0,0,0.65)] tracking-[0.36px]" data-node-id="I64:24721;438:1336" style={{ fontFeatureSettings: '"lnum" 1, "pnum" 1' }}>
          <p className="leading-none">Medications</p>
        </div>
        <div className="absolute bg-[#f7f7f7] h-[2px] left-0 right-0 shadow-[0px_0px_5.5px_1px_rgba(0,0,0,0.11)] top-[-2px]" data-node-id="I64:24721;531:78" data-name="top shadow" />
        <div className="absolute bg-[#f7f7f7] bottom-[2px] left-[-2px] shadow-[0px_0px_5.5px_0.5px_rgba(0,0,0,0.11)] top-0 w-[2px]" data-node-id="I64:24721;531:79" data-name="left shadow" />
      </div>
      <div className="bg-[#f7f7f7] h-[44px] overflow-clip relative rounded-br-[3px] rounded-tr-[3px] shrink-0 w-[80px]" data-node-id="64:24722" data-name="section_vert/off">
        <div className="[word-break:break-word] absolute flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal inset-[0.35%_5px_-0.35%_5px] justify-center leading-[0] not-italic text-[12px] text-[rgba(0,0,0,0.65)] tracking-[0.36px]" data-node-id="I64:24722;438:1336" style={{ fontFeatureSettings: '"lnum" 1, "pnum" 1' }}>
          <p className="leading-none">Procedures</p>
        </div>
        <div className="absolute bg-[#f7f7f7] h-[2px] left-0 right-0 shadow-[0px_0px_5.5px_1px_rgba(0,0,0,0.11)] top-[-2px]" data-node-id="I64:24722;531:78" data-name="top shadow" />
        <div className="absolute bg-[#f7f7f7] bottom-[2px] left-[-2px] shadow-[0px_0px_5.5px_0.5px_rgba(0,0,0,0.11)] top-0 w-[2px]" data-node-id="I64:24722;531:79" data-name="left shadow" />
      </div>
      <div className="bg-[#f7f7f7] h-[44px] overflow-clip relative rounded-br-[3px] rounded-tr-[3px] shrink-0 w-[80px]" data-node-id="64:24723" data-name="section_vert/off">
        <div className="[word-break:break-word] absolute flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal inset-[0.35%_5px_-0.35%_5px] justify-center leading-[0] not-italic text-[12px] text-[rgba(0,0,0,0.65)] tracking-[0.36px]" data-node-id="I64:24723;438:1336" style={{ fontFeatureSettings: '"lnum" 1, "pnum" 1' }}>
          <p className="leading-none">Imaging</p>
        </div>
        <div className="absolute bg-[#f7f7f7] h-[2px] left-0 right-0 shadow-[0px_0px_5.5px_1px_rgba(0,0,0,0.11)] top-[-2px]" data-node-id="I64:24723;531:78" data-name="top shadow" />
        <div className="absolute bg-[#f7f7f7] bottom-[2px] left-[-2px] shadow-[0px_0px_5.5px_0.5px_rgba(0,0,0,0.11)] top-0 w-[2px]" data-node-id="I64:24723;531:79" data-name="left shadow" />
      </div>
      <div className="bg-[#f7f7f7] h-[44px] overflow-clip relative rounded-br-[3px] rounded-tr-[3px] shrink-0 w-[80px]" data-node-id="64:24724" data-name="section_vert/off">
        <div className="[word-break:break-word] absolute flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal inset-[0.35%_5px_-0.35%_5px] justify-center leading-[0] not-italic text-[12px] text-[rgba(0,0,0,0.65)] tracking-[0.36px]" data-node-id="I64:24724;438:1336" style={{ fontFeatureSettings: '"lnum" 1, "pnum" 1' }}>
          <p className="leading-none">Labs</p>
        </div>
        <div className="absolute bg-[#f7f7f7] h-[2px] left-0 right-0 shadow-[0px_0px_5.5px_1px_rgba(0,0,0,0.11)] top-[-2px]" data-node-id="I64:24724;531:78" data-name="top shadow" />
        <div className="absolute bg-[#f7f7f7] bottom-[2px] left-[-2px] shadow-[0px_0px_5.5px_0.5px_rgba(0,0,0,0.11)] top-0 w-[2px]" data-node-id="I64:24724;531:79" data-name="left shadow" />
      </div>
      <div className="bg-[#f7f7f7] h-[44px] overflow-clip relative rounded-br-[3px] rounded-tr-[3px] shrink-0 w-[80px]" data-node-id="64:24725" data-name="section_vert/off">
        <div className="[word-break:break-word] absolute flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal inset-[0.35%_5px_-0.35%_5px] justify-center leading-[0] not-italic text-[12px] text-[rgba(0,0,0,0.65)] tracking-[0.36px]" data-node-id="I64:24725;438:1336" style={{ fontFeatureSettings: '"lnum" 1, "pnum" 1' }}>
          <p className="leading-none">Biomarkers</p>
        </div>
        <div className="absolute bg-[#f7f7f7] h-[2px] left-0 right-0 shadow-[0px_0px_5.5px_1px_rgba(0,0,0,0.11)] top-[-2px]" data-node-id="I64:24725;531:78" data-name="top shadow" />
        <div className="absolute bg-[#f7f7f7] bottom-[2px] left-[-2px] shadow-[0px_0px_5.5px_0.5px_rgba(0,0,0,0.11)] top-0 w-[2px]" data-node-id="I64:24725;531:79" data-name="left shadow" />
      </div>
      <div className="bg-[#f7f7f7] h-[44px] overflow-clip relative rounded-br-[3px] rounded-tr-[3px] shrink-0 w-[80px]" data-node-id="64:24726" data-name="section_vert/off">
        <div className="[word-break:break-word] absolute flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal inset-[0.35%_5px_-0.35%_5px] justify-center leading-[0] not-italic text-[12px] text-[rgba(0,0,0,0.65)] tracking-[0.36px]" data-node-id="I64:24726;438:1336" style={{ fontFeatureSettings: '"lnum" 1, "pnum" 1' }}>
          <p className="leading-none">Pathology</p>
        </div>
        <div className="absolute bg-[#f7f7f7] h-[2px] left-0 right-0 shadow-[0px_0px_5.5px_1px_rgba(0,0,0,0.11)] top-[-2px]" data-node-id="I64:24726;531:78" data-name="top shadow" />
        <div className="absolute bg-[#f7f7f7] bottom-[2px] left-[-2px] shadow-[0px_0px_5.5px_0.5px_rgba(0,0,0,0.11)] top-0 w-[2px]" data-node-id="I64:24726;531:79" data-name="left shadow" />
      </div>
      <div className="bg-[#f7f7f7] h-[44px] overflow-clip relative rounded-br-[3px] rounded-tr-[3px] shrink-0 w-[80px]" data-node-id="204:32391" data-name="section_vert/off">
        <div className="[word-break:break-word] absolute flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal inset-[0.35%_5px_-0.35%_5px] justify-center leading-[0] not-italic text-[12px] text-[rgba(0,0,0,0.65)] tracking-[0.36px]" data-node-id="I204:32391;438:1336" style={{ fontFeatureSettings: '"lnum" 1, "pnum" 1' }}>
          <p className="leading-none">Toxicities</p>
        </div>
        <div className="absolute bg-[#f7f7f7] h-[2px] left-0 right-0 shadow-[0px_0px_5.5px_1px_rgba(0,0,0,0.11)] top-[-2px]" data-node-id="I204:32391;531:78" data-name="top shadow" />
        <div className="absolute bg-[#f7f7f7] bottom-[2px] left-[-2px] shadow-[0px_0px_5.5px_0.5px_rgba(0,0,0,0.11)] top-0 w-[2px]" data-node-id="I204:32391;531:79" data-name="left shadow" />
      </div>
    </div>
  );
}

export function PriorClinical() {
  return (
    <div className="relative size-full" data-node-id="4632:425921" data-name="proto/clinicalView">
      <div className="absolute drop-shadow-[0px_1px_7.5px_rgba(0,0,0,0.08)] inset-0" data-node-id="I4632:425921;314:60857;218:181607" data-name="raised portion">
        <RecordNav className="absolute content-stretch flex flex-col items-center py-px right-[2px] top-[45px]" />
        <div className="absolute bg-white inset-[0_82px_0_0] overflow-x-clip overflow-y-auto rounded-[3px]" data-node-id="I4632:425921;314:60857;10:743" data-name="main sheet">
          <div className="absolute bg-white content-stretch flex flex-col gap-[30px] items-start left-[10px] overflow-clip right-[10px] top-[53px]" data-node-id="I4632:425921;314:60857;218:744781" data-name="patient_category_view_redo">
            <div className="content-stretch flex flex-col gap-[15px] items-start relative shrink-0 w-full" data-node-id="I4632:425921;314:60857;218:744781;1511:244584" data-name="patient">
              <div className="h-[15px] relative shrink-0 w-full" data-node-id="I4632:425921;314:60857;218:744781;1511:244585" data-name="expanding_section_title">
                <div className="absolute inset-[0_14px_0_0] overflow-clip" data-node-id="I4632:425921;314:60857;218:744781;1511:244586" data-name="section_title">
                  <div className="absolute content-stretch flex gap-[8px] items-center left-[10px] overflow-clip top-0" data-node-id="I4632:425921;314:60857;218:744781;1511:244587" data-name="section_title">
                    <p className="[word-break:break-word] font-[family-name:'Source_Sans_Pro'] font-normal leading-[normal] not-italic relative shrink-0 text-[12px] text-[rgba(0,0,0,0.65)] tracking-[1.2px] uppercase whitespace-nowrap" data-node-id="I4632:425921;314:60857;218:744781;1511:244588" style={{ fontFeatureSettings: '"lnum" 1, "pnum" 1' }}>
                      Patient
                    </p>
                    <div className="h-0 relative shrink-0 w-[523px]" data-node-id="I4632:425921;314:60857;218:744781;1511:244589" data-name="border-top">
                      <div className="absolute inset-[-0.5px_0]">
                        <Image unoptimized width={523} height={1}  alt="" className="block max-w-none size-full" src={imgBorderTop} />
                      </div>
                    </div>
                  </div>
                  <div className="-translate-y-1/2 absolute h-0 left-0 top-1/2 w-[5px]" data-node-id="I4632:425921;314:60857;218:744781;1511:244590" data-name="border-top">
                    <div className="absolute inset-[-0.5px_0]">
                      <Image unoptimized width={5} height={1}  alt="" className="block max-w-none size-full" src={imgBorderTop1} />
                    </div>
                  </div>
                </div>
                <div className="-translate-y-1/2 absolute right-[-3px] size-[16px] top-[calc(50%+0.5px)]" data-node-id="I4632:425921;314:60857;218:744781;1511:244591" data-name="expander/open">
                  <Image unoptimized width={16} height={16}  alt="" className="absolute block inset-0 max-w-none size-full" src={imgExpanderOpen2} />
                </div>
              </div>
              <div className="h-[81px] relative shrink-0 w-full" data-node-id="I4632:425921;314:60857;218:744781;1511:244594">
                <div className="absolute content-stretch flex flex-col items-start left-0 overflow-clip right-[50.98%] top-0" data-node-id="I4632:425921;314:60857;218:744781;1511:244595" data-name="left col">
                  <div className="h-[27px] relative shrink-0 w-full" data-node-id="I4632:425921;314:60857;218:744781;1511:244596" data-name="list_row_half">
                    <div className="absolute bg-[rgba(65,92,106,0.04)] inset-0" data-node-id="I4632:425921;314:60857;218:744781;1511:244597" data-name="bg" />
                    <p className="[word-break:break-word] absolute font-[family-name:'Source_Sans_Pro'] font-normal h-[15px] leading-none left-[10px] not-italic text-[12px] text-[rgba(0,0,0,0.65)] top-[8px] tracking-[0.36px] w-[78px]" data-node-id="I4632:425921;314:60857;218:744781;1511:244603" style={{ fontFeatureSettings: '"lnum" 1, "pnum" 1' }}>
                      Date of birth
                    </p>
                    <p className="[word-break:break-word] absolute font-[family-name:'Source_Sans_Pro'] font-normal h-[18px] leading-none left-[93px] not-italic right-[13.98px] text-[15px] text-[rgba(0,0,0,0.85)] top-[5px]" data-node-id="I4632:425921;314:60857;218:744781;1511:244604">
                      5 Apr 1967 (age 53)
                    </p>
                  </div>
                  <div className="[word-break:break-word] font-[family-name:'Source_Sans_Pro'] font-normal h-[27px] leading-none not-italic relative shrink-0 w-full" data-node-id="I4632:425921;314:60857;218:744781;1511:244629" data-name="list_row_half">
                    <p className="absolute h-[15px] left-[10px] text-[12px] text-[rgba(0,0,0,0.65)] top-[8px] tracking-[0.36px] w-[78px]" data-node-id="I4632:425921;314:60857;218:744781;1511:244636" style={{ fontFeatureSettings: '"lnum" 1, "pnum" 1' }}>
                      Sex
                    </p>
                    <p className="absolute h-[18px] left-[93px] right-[13.98px] text-[15px] text-[rgba(0,0,0,0.85)] top-[5px]" data-node-id="I4632:425921;314:60857;218:744781;1511:244637">
                      Female
                    </p>
                  </div>
                </div>
                <div className="absolute content-stretch flex flex-col items-center left-[50.98%] overflow-clip right-0 top-0" data-node-id="I4632:425921;314:60857;218:744781;1511:244662" data-name="right col">
                  <div className="h-[27px] relative shrink-0 w-[249px]" data-node-id="I4632:425921;314:60857;218:744781;1511:244663" data-name="list_row_half">
                    <div className="absolute bg-[rgba(65,92,106,0.04)] inset-0" data-node-id="I4632:425921;314:60857;218:744781;1511:244664" data-name="bg" />
                    <p className="[word-break:break-word] absolute font-[family-name:'Source_Sans_Pro'] font-normal h-[15px] leading-none left-[10px] not-italic text-[12px] text-[rgba(0,0,0,0.65)] top-[8px] tracking-[0.36px] w-[78px]" data-node-id="I4632:425921;314:60857;218:744781;1511:244670" style={{ fontFeatureSettings: '"lnum" 1, "pnum" 1' }}>
                      Height
                    </p>
                    <p className="[word-break:break-word] absolute font-[family-name:'Source_Sans_Pro'] font-normal h-[18px] leading-none left-[93px] not-italic right-[14px] text-[15px] text-[rgba(0,0,0,0.85)] top-[5px]" data-node-id="I4632:425921;314:60857;218:744781;1511:244671">
                      165 cm
                    </p>
                  </div>
                  <div className="[word-break:break-word] font-[family-name:'Source_Sans_Pro'] font-normal h-[27px] leading-none not-italic relative shrink-0 w-[249px]" data-node-id="I4632:425921;314:60857;218:744781;1511:244696" data-name="list_row_half">
                    <p className="absolute h-[15px] left-[10px] text-[12px] text-[rgba(0,0,0,0.65)] top-[8px] tracking-[0.36px] w-[78px]" data-node-id="I4632:425921;314:60857;218:744781;1511:244703" style={{ fontFeatureSettings: '"lnum" 1, "pnum" 1' }}>
                      Weight
                    </p>
                    <p className="absolute h-[18px] left-[93px] right-[14px] text-[15px] text-[rgba(0,0,0,0.85)] top-[5px]" data-node-id="I4632:425921;314:60857;218:744781;1511:244704">
                      62 kg
                    </p>
                  </div>
                </div>
                <div className="absolute h-[27px] left-0 right-0 top-[54px]" data-node-id="I4632:425921;314:60857;218:744781;1511:244762" data-name="list_row/complete">
                  <div className="absolute bg-[rgba(65,92,106,0.04)] inset-0" data-node-id="I4632:425921;314:60857;218:744781;1511:244763" data-name="bg" />
                  <div className="-translate-y-1/2 absolute content-stretch flex flex-col gap-[2px] items-start left-[10px] top-1/2" data-node-id="I4632:425921;314:60857;218:744781;1511:244764">
                    <div className="[word-break:break-word] flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal h-[15px] justify-center leading-[0] not-italic relative shrink-0 text-[12px] text-[rgba(0,0,0,0.65)] tracking-[0.36px] w-[137px]" data-node-id="I4632:425921;314:60857;218:744781;1511:244765" style={{ fontFeatureSettings: '"lnum" 1, "pnum" 1' }}>
                      <p className="leading-none">Comorbidities</p>
                    </div>
                  </div>
                  <div className="-translate-y-1/2 [word-break:break-word] absolute flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal h-[18px] justify-center leading-[0] left-[154px] not-italic right-[48px] text-[15px] text-[rgba(0,0,0,0.85)] top-[calc(50%+0.5px)]" data-node-id="I4632:425921;314:60857;218:744781;1511:244826">
                    <p className="leading-none">Hypertension, Acute arthritis</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="content-stretch flex flex-col gap-[15px] items-start relative shrink-0 w-full" data-node-id="I4632:425921;314:60857;218:744781;1511:244882" data-name="Disease Summary">
              <div className="h-[15px] relative shrink-0 w-full" data-node-id="I4632:425921;314:60857;218:744781;1511:244883" data-name="expanding_section_title">
                <div className="absolute inset-[0_14px_0_0] overflow-clip" data-node-id="I4632:425921;314:60857;218:744781;1511:244884" data-name="section_title">
                  <div className="absolute content-stretch flex gap-[8px] items-center left-[10px] overflow-clip top-0" data-node-id="I4632:425921;314:60857;218:744781;1511:244885" data-name="section_title">
                    <p className="[word-break:break-word] font-[family-name:'Source_Sans_Pro'] font-normal leading-[normal] not-italic relative shrink-0 text-[12px] text-[rgba(0,0,0,0.65)] tracking-[1.2px] uppercase whitespace-nowrap" data-node-id="I4632:425921;314:60857;218:744781;1511:244886" style={{ fontFeatureSettings: '"lnum" 1, "pnum" 1' }}>
                      Disease Summary
                    </p>
                    <div className="h-0 relative shrink-0 w-[523px]" data-node-id="I4632:425921;314:60857;218:744781;1511:244887" data-name="border-top">
                      <div className="absolute inset-[-0.5px_0]">
                        <Image unoptimized width={523} height={1}  alt="" className="block max-w-none size-full" src={imgBorderTop} />
                      </div>
                    </div>
                  </div>
                  <div className="-translate-y-1/2 absolute h-0 left-0 top-1/2 w-[5px]" data-node-id="I4632:425921;314:60857;218:744781;1511:244888" data-name="border-top">
                    <div className="absolute inset-[-0.5px_0]">
                      <Image unoptimized width={5} height={1}  alt="" className="block max-w-none size-full" src={imgBorderTop1} />
                    </div>
                  </div>
                </div>
                <div className="-translate-y-1/2 absolute right-[-3px] size-[16px] top-[calc(50%+0.5px)]" data-node-id="I4632:425921;314:60857;218:744781;1511:244889" data-name="expander/open">
                  <Image unoptimized width={16} height={16}  alt="" className="absolute block inset-0 max-w-none size-full" src={imgExpanderOpen2} />
                </div>
              </div>
              <div className="content-stretch flex flex-col items-start overflow-clip relative shrink-0 w-full" data-node-id="I4632:425921;314:60857;218:744781;1511:244892">
                <div className="h-[27px] relative shrink-0 w-full" data-node-id="I4632:425921;314:60857;218:744781;1511:244893" data-name="list_row/complete">
                  <div className="absolute bg-[rgba(65,92,106,0.04)] inset-0" data-node-id="I4632:425921;314:60857;218:744781;1511:244894" data-name="bg" />
                  <div className="-translate-y-1/2 absolute content-stretch flex flex-col gap-[2px] items-start left-[10px] top-1/2" data-node-id="I4632:425921;314:60857;218:744781;1511:244895">
                    <div className="[word-break:break-word] flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal h-[15px] justify-center leading-[0] not-italic relative shrink-0 text-[12px] text-[rgba(0,0,0,0.65)] tracking-[0.36px] w-[137px]" data-node-id="I4632:425921;314:60857;218:744781;1511:244896" style={{ fontFeatureSettings: '"lnum" 1, "pnum" 1' }}>
                      <p className="leading-none">Cancer name</p>
                    </div>
                  </div>
                  <div className="-translate-y-1/2 [word-break:break-word] absolute flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal h-[18px] justify-center leading-[0] left-[154px] not-italic right-[48px] text-[15px] text-[rgba(0,0,0,0.85)] top-[calc(50%+0.5px)]" data-node-id="I4632:425921;314:60857;218:744781;1511:244957">
                    <p className="leading-none">Invasive ductal carcinoma of breast</p>
                  </div>
                </div>
                <div className="h-[27px] relative shrink-0 w-full" data-node-id="I4632:425921;314:60857;218:744781;1511:245013" data-name="list_row/complete">
                  <div className="-translate-y-1/2 absolute content-stretch flex flex-col gap-[2px] items-start left-[10px] top-1/2" data-node-id="I4632:425921;314:60857;218:744781;1511:245015">
                    <div className="[word-break:break-word] flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal h-[15px] justify-center leading-[0] not-italic relative shrink-0 text-[12px] text-[rgba(0,0,0,0.65)] tracking-[0.36px] w-[137px]" data-node-id="I4632:425921;314:60857;218:744781;1511:245016" style={{ fontFeatureSettings: '"lnum" 1, "pnum" 1' }}>
                      <p className="leading-none">Date of diagnosis</p>
                    </div>
                  </div>
                  <div className="-translate-y-1/2 [word-break:break-word] absolute flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal h-[18px] justify-center leading-[0] left-[154px] not-italic right-[48px] text-[15px] text-[rgba(0,0,0,0.85)] top-[calc(50%+0.5px)]" data-node-id="I4632:425921;314:60857;218:744781;1511:245077">
                    <p className="leading-none">6 May 2019 (age 50)</p>
                  </div>
                </div>
                <div className="h-[27px] relative shrink-0 w-full" data-node-id="I4632:425921;314:60857;218:744781;1511:245133" data-name="list_row/complete">
                  <div className="absolute bg-[rgba(65,92,106,0.04)] inset-0" data-node-id="I4632:425921;314:60857;218:744781;1511:245134" data-name="bg" />
                  <div className="-translate-y-1/2 absolute content-stretch flex flex-col gap-[2px] items-start left-[10px] top-1/2" data-node-id="I4632:425921;314:60857;218:744781;1511:245135">
                    <div className="[word-break:break-word] flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal h-[15px] justify-center leading-[0] not-italic relative shrink-0 text-[12px] text-[rgba(0,0,0,0.65)] tracking-[0.36px] w-[137px]" data-node-id="I4632:425921;314:60857;218:744781;1511:245136" style={{ fontFeatureSettings: '"lnum" 1, "pnum" 1' }}>
                      <p className="leading-none">Stage at diagnosis</p>
                    </div>
                  </div>
                  <div className="-translate-y-1/2 absolute right-[7px] size-[13px] top-[calc(50%+0.5px)]" data-node-id="I4632:425921;314:60857;218:744781;1511:245161" data-name="reference set" />
                  <div className="-translate-y-1/2 [word-break:break-word] absolute flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal h-[18px] justify-center leading-[0] left-[154px] not-italic right-[48px] text-[15px] text-[rgba(0,0,0,0.85)] top-[calc(50%+0.5px)]" data-node-id="I4632:425921;314:60857;218:744781;1511:245197">
                    <p className="leading-none">IA</p>
                  </div>
                </div>
                <div className="h-[27px] relative shrink-0 w-full" data-node-id="I4632:425921;314:60857;218:744781;1511:245253" data-name="list_row/complete">
                  <div className="-translate-y-1/2 absolute content-stretch flex flex-col gap-[2px] items-start left-[10px] top-1/2" data-node-id="I4632:425921;314:60857;218:744781;1511:245255">
                    <div className="[word-break:break-word] flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal h-[15px] justify-center leading-[0] not-italic relative shrink-0 text-[12px] text-[rgba(0,0,0,0.65)] tracking-[0.36px] w-[137px]" data-node-id="I4632:425921;314:60857;218:744781;1511:245256" style={{ fontFeatureSettings: '"lnum" 1, "pnum" 1' }}>
                      <p className="leading-none">HER2</p>
                    </div>
                  </div>
                  <div className="-translate-y-1/2 [word-break:break-word] absolute flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal h-[18px] justify-center leading-[0] left-[154px] not-italic right-[48px] text-[15px] text-[rgba(0,0,0,0.85)] top-[calc(50%+0.5px)]" data-node-id="I4632:425921;314:60857;218:744781;1511:245317">
                    <p className="leading-none">Negative</p>
                  </div>
                </div>
                <div className="h-[27px] relative shrink-0 w-full" data-node-id="I4632:425921;314:60857;218:744781;1511:245373" data-name="list_row/complete">
                  <div className="absolute bg-[rgba(65,92,106,0.04)] inset-0" data-node-id="I4632:425921;314:60857;218:744781;1511:245374" data-name="bg" />
                  <div className="-translate-y-1/2 absolute content-stretch flex flex-col gap-[2px] items-start left-[10px] top-1/2" data-node-id="I4632:425921;314:60857;218:744781;1511:245375">
                    <div className="[word-break:break-word] flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal h-[15px] justify-center leading-[0] not-italic relative shrink-0 text-[12px] text-[rgba(0,0,0,0.65)] tracking-[0.36px] w-[137px]" data-node-id="I4632:425921;314:60857;218:744781;1511:245376" style={{ fontFeatureSettings: '"lnum" 1, "pnum" 1' }}>
                      <p className="leading-none">ER</p>
                    </div>
                  </div>
                  <div className="-translate-y-1/2 [word-break:break-word] absolute flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal h-[18px] justify-center leading-[0] left-[154px] not-italic right-[48px] text-[15px] text-[rgba(0,0,0,0.85)] top-[calc(50%+0.5px)]" data-node-id="I4632:425921;314:60857;218:744781;1511:245437">
                    <p className="leading-none">Positive</p>
                  </div>
                </div>
                <div className="h-[27px] relative shrink-0 w-full" data-node-id="I4632:425921;314:60857;218:744781;1511:245493" data-name="list_row/complete">
                  <div className="-translate-y-1/2 absolute content-stretch flex flex-col gap-[2px] items-start left-[10px] top-1/2" data-node-id="I4632:425921;314:60857;218:744781;1511:245495">
                    <div className="[word-break:break-word] flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal h-[15px] justify-center leading-[0] not-italic relative shrink-0 text-[12px] text-[rgba(0,0,0,0.65)] tracking-[0.36px] w-[137px]" data-node-id="I4632:425921;314:60857;218:744781;1511:245496" style={{ fontFeatureSettings: '"lnum" 1, "pnum" 1' }}>
                      <p className="leading-none">PR</p>
                    </div>
                  </div>
                  <div className="-translate-y-1/2 [word-break:break-word] absolute flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal h-[18px] justify-center leading-[0] left-[154px] not-italic right-[48px] text-[15px] text-[rgba(0,0,0,0.85)] top-[calc(50%+0.5px)]" data-node-id="I4632:425921;314:60857;218:744781;1511:245557">
                    <p className="leading-none">Positive</p>
                  </div>
                </div>
              </div>
              <div className="h-[161px] relative shrink-0 w-full" data-node-id="I4632:425921;314:60857;218:744781;1511:245613">
                <p className="[word-break:break-word] absolute font-[family-name:'Source_Sans_Pro'] font-semibold h-[15px] leading-[normal] left-[10px] not-italic text-[12px] text-[rgba(0,0,0,0.65)] top-[4px] tracking-[0.36px] w-[299px]" data-node-id="I4632:425921;314:60857;218:744781;1511:245614" style={{ fontFeatureSettings: '"lnum" 1, "pnum" 1' }}>
                  Status
                </p>
                <div className="absolute content-stretch flex flex-col items-start left-0 overflow-clip top-[20px]" data-node-id="I4632:425921;314:60857;218:744781;1511:245615">
                  <div className="h-[27px] relative shrink-0 w-[508px]" data-node-id="I4632:425921;314:60857;218:744781;1511:245616" data-name="list_row/complete">
                    <div className="absolute bg-[rgba(65,92,106,0.04)] inset-0" data-node-id="I4632:425921;314:60857;218:744781;1511:245617" data-name="bg" />
                    <div className="-translate-y-1/2 absolute content-stretch flex flex-col gap-[2px] items-start left-[10px] top-1/2" data-node-id="I4632:425921;314:60857;218:744781;1511:245618">
                      <div className="[word-break:break-word] flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal h-[15px] justify-center leading-[0] not-italic relative shrink-0 text-[12px] text-[rgba(0,0,0,0.65)] tracking-[0.36px] w-[137px]" data-node-id="I4632:425921;314:60857;218:744781;1511:245619" style={{ fontFeatureSettings: '"lnum" 1, "pnum" 1' }}>
                        <p className="leading-none">Last staging</p>
                      </div>
                    </div>
                    <VerificationStatus className="-translate-y-1/2 absolute opacity-80 right-[7px] size-[13px] top-[calc(50%+1px)]" />
                    <div className="-translate-y-1/2 [word-break:break-word] absolute flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal h-[18px] justify-center leading-[0] left-[154px] not-italic right-[48px] text-[15px] text-[rgba(0,0,0,0.85)] top-[calc(50%+0.5px)]" data-node-id="I4632:425921;314:60857;218:744781;1511:245680">
                      <p className="leading-none">IV (29 May 2020)</p>
                    </div>
                    <div className="-translate-y-1/2 absolute bg-[#fffeff] border border-[#51548d] border-solid content-stretch flex gap-[5px] items-start overflow-clip px-[7px] py-[2px] right-[27.5px] rounded-[4px] shadow-[0px_1px_5px_0px_rgba(0,0,0,0.14)] top-1/2" data-node-id="I4632:425921;314:60857;218:744781;1511:245728" data-name="verify">
                      <div className="[word-break:break-word] flex flex-col font-[family-name:'Source_Sans_Pro'] font-semibold justify-center leading-[0] not-italic relative shrink-0 text-[#464761] text-[15px] tracking-[0.45px] whitespace-nowrap" data-node-id="I4632:425921;314:60857;218:744781;1511:245732">
                        <p className="leading-[normal]">Verify</p>
                      </div>
                    </div>
                  </div>
                  <div className="grid-cols-[max-content] grid-rows-[max-content] inline-grid leading-[0] place-items-start relative shrink-0" data-node-id="I4632:425921;314:60857;218:744781;1511:245736">
                    <div className="col-1 h-[40px] ml-0 mt-0 relative row-1 w-[508px]" data-node-id="I4632:425921;314:60857;218:744781;1511:245737" data-name="list_row/complete">
                      <div className="-translate-y-1/2 absolute content-stretch flex flex-col gap-[2px] items-start left-[10px] top-[calc(50%-0.5px)]" data-node-id="I4632:425921;314:60857;218:744781;1511:245739">
                        <div className="[word-break:break-word] flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal h-[15px] justify-center leading-[0] not-italic relative shrink-0 text-[12px] text-[rgba(0,0,0,0.65)] tracking-[0.36px] w-[137px]" data-node-id="I4632:425921;314:60857;218:744781;1511:245740" style={{ fontFeatureSettings: '"lnum" 1, "pnum" 1' }}>
                          <p className="leading-none">ECOG</p>
                        </div>
                      </div>
                      <div className="-translate-y-1/2 absolute content-stretch flex items-start left-[149px] top-[calc(50%-0.5px)]" data-node-id="I4632:425921;314:60857;218:744781;1511:245802" data-name="singleSelect/default">
                        <div className="bg-[rgba(255,255,255,0.94)] border border-[rgba(211,221,224,0.9)] border-solid content-stretch flex items-end overflow-clip px-[7px] py-[4px] relative rounded-bl-[4px] rounded-tl-[4px] self-stretch shrink-0" data-node-id="I4632:425921;314:60857;218:744781;1511:245803" data-name="left side - default">
                          <div className="[word-break:break-word] flex flex-col font-[family-name:'Source_Sans_Pro'] font-light h-[19px] justify-center leading-[0] not-italic relative shrink-0 text-[15px] text-[rgba(0,0,0,0.85)] text-center w-[30px]" data-node-id="I4632:425921;314:60857;218:744781;1511:245804">
                            <p className="leading-[19px]">0</p>
                          </div>
                        </div>
                        <div className="bg-[rgba(255,255,255,0.94)] border border-[rgba(211,221,224,0.9)] border-solid content-stretch flex gap-[5px] items-end overflow-clip px-[7px] py-[4px] relative shrink-0" data-node-id="I4632:425921;314:60857;218:744781;1511:245809" data-name="text toggle/default">
                          <div className="[word-break:break-word] flex flex-col font-[family-name:'Source_Sans_Pro'] font-light h-[19px] justify-center leading-[0] not-italic relative shrink-0 text-[15px] text-[rgba(0,0,0,0.85)] text-center w-[30px]" data-node-id="I4632:425921;314:60857;218:744781;1511:245810">
                            <p className="leading-[19px]">1</p>
                          </div>
                        </div>
                        <div className="bg-[rgba(255,255,255,0.94)] border border-[rgba(211,221,224,0.9)] border-solid content-stretch flex gap-[5px] items-end overflow-clip px-[7px] py-[4px] relative shrink-0" data-node-id="I4632:425921;314:60857;218:744781;1511:245812" data-name="text toggle/default">
                          <div className="[word-break:break-word] flex flex-col font-[family-name:'Source_Sans_Pro'] font-light h-[19px] justify-center leading-[0] not-italic relative shrink-0 text-[15px] text-[rgba(0,0,0,0.85)] text-center w-[30px]" data-node-id="I4632:425921;314:60857;218:744781;1511:245813">
                            <p className="leading-[19px]">2</p>
                          </div>
                        </div>
                        <div className="bg-[rgba(255,255,255,0.94)] border border-[rgba(211,221,224,0.9)] border-solid content-stretch flex gap-[5px] items-end overflow-clip px-[7px] py-[4px] relative self-stretch shrink-0" data-node-id="I4632:425921;314:60857;218:744781;1511:245815" data-name="text toggle/default">
                          <div className="[word-break:break-word] flex flex-col font-[family-name:'Source_Sans_Pro'] font-light h-[19px] justify-center leading-[0] not-italic relative shrink-0 text-[15px] text-[rgba(0,0,0,0.85)] text-center w-[30px]" data-node-id="I4632:425921;314:60857;218:744781;1511:245816">
                            <p className="leading-[19px]">3</p>
                          </div>
                        </div>
                        <div className="bg-[rgba(255,255,255,0.94)] border border-[rgba(211,221,224,0.9)] border-solid content-stretch flex gap-[5px] items-start overflow-clip px-[7px] py-[4px] relative rounded-br-[4px] rounded-tr-[4px] self-stretch shrink-0" data-node-id="I4632:425921;314:60857;218:744781;1511:245821" data-name="button/medium/default">
                          <div className="[word-break:break-word] flex flex-col font-[family-name:'Source_Sans_Pro'] font-light h-[19px] justify-center leading-[0] not-italic relative shrink-0 text-[15px] text-[rgba(0,0,0,0.85)] text-center w-[30px]" data-node-id="I4632:425921;314:60857;218:744781;1511:245822">
                            <p className="leading-[19px]">4</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="[word-break:break-word] col-1 flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal h-[18px] justify-center ml-[405.92px] mt-[12px] not-italic relative row-1 text-[#51548d] text-[15px] w-[90.064px]" data-node-id="I4632:425921;314:60857;218:744781;1511:245857">
                      <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[normal] underline">Karnofsky</p>
                    </div>
                  </div>
                  <div className="h-[40px] relative shrink-0 w-[508px]" data-node-id="I4632:425921;314:60857;218:744781;1511:245858" data-name="list_row/complete">
                    <div className="absolute bg-[rgba(65,92,106,0.04)] inset-0" data-node-id="I4632:425921;314:60857;218:744781;1511:245859" data-name="bg" />
                    <div className="-translate-y-1/2 absolute content-stretch flex flex-col gap-[2px] items-start left-[10px] top-[calc(50%-0.5px)]" data-node-id="I4632:425921;314:60857;218:744781;1511:245860">
                      <div className="[word-break:break-word] flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal h-[15px] justify-center leading-[0] not-italic relative shrink-0 text-[12px] text-[rgba(0,0,0,0.65)] tracking-[0.36px] w-[137px]" data-node-id="I4632:425921;314:60857;218:744781;1511:245861" style={{ fontFeatureSettings: '"lnum" 1, "pnum" 1' }}>
                        <p className="leading-none">Disease status</p>
                      </div>
                    </div>
                    <div className="-translate-y-1/2 absolute content-stretch flex items-start left-[149px] top-[calc(50%-0.5px)]" data-node-id="I4632:425921;314:60857;218:744781;1511:245923" data-name="singleSelect/default">
                      <div className="bg-[rgba(255,255,255,0.94)] border border-[rgba(211,221,224,0.9)] border-solid content-stretch flex items-end overflow-clip px-[7px] py-[4px] relative rounded-bl-[4px] rounded-tl-[4px] self-stretch shrink-0" data-node-id="I4632:425921;314:60857;218:744781;1511:245924" data-name="left side - default">
                        <div className="[word-break:break-word] flex flex-col font-[family-name:'Source_Sans_Pro'] font-light justify-center leading-[0] not-italic relative shrink-0 text-[15px] text-[rgba(0,0,0,0.85)] text-center whitespace-nowrap" data-node-id="I4632:425921;314:60857;218:744781;1511:245926">
                          <p className="leading-[19px]">Stable</p>
                        </div>
                      </div>
                      <div className="bg-[rgba(255,255,255,0.94)] border border-[rgba(211,221,224,0.9)] border-solid content-stretch flex gap-[5px] items-end overflow-clip px-[7px] py-[4px] relative shrink-0" data-node-id="I4632:425921;314:60857;218:744781;1511:245930" data-name="text toggle/default">
                        <div className="[word-break:break-word] flex flex-col font-[family-name:'Source_Sans_Pro'] font-light justify-center leading-[0] not-italic relative shrink-0 text-[15px] text-[rgba(0,0,0,0.85)] text-center whitespace-nowrap" data-node-id="I4632:425921;314:60857;218:744781;1511:245932">
                          <p className="leading-[19px]">Progressing</p>
                        </div>
                      </div>
                      <div className="bg-[rgba(255,255,255,0.94)] border border-[rgba(211,221,224,0.9)] border-solid content-stretch flex gap-[5px] items-end overflow-clip px-[7px] py-[4px] relative shrink-0" data-node-id="I4632:425921;314:60857;218:744781;1511:245933" data-name="text toggle/default">
                        <div className="[word-break:break-word] flex flex-col font-[family-name:'Source_Sans_Pro'] font-light justify-center leading-[0] not-italic relative shrink-0 text-[15px] text-[rgba(0,0,0,0.85)] text-center whitespace-nowrap" data-node-id="I4632:425921;314:60857;218:744781;1511:245935">
                          <p className="leading-[19px]">Responding</p>
                        </div>
                      </div>
                      <div className="bg-[rgba(255,255,255,0.94)] border border-[rgba(211,221,224,0.9)] border-solid content-stretch flex gap-[5px] items-start overflow-clip px-[7px] py-[4px] relative rounded-br-[4px] rounded-tr-[4px] self-stretch shrink-0" data-node-id="I4632:425921;314:60857;218:744781;1511:245942" data-name="button/medium/default">
                        <div className="[word-break:break-word] flex flex-col font-[family-name:'Source_Sans_Pro'] font-light justify-center leading-[0] not-italic relative shrink-0 text-[15px] text-[rgba(0,0,0,0.85)] text-center whitespace-nowrap" data-node-id="I4632:425921;314:60857;218:744781;1511:245944">
                          <p className="leading-[19px]">Complete Res.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="h-[27px] relative shrink-0 w-full" data-node-id="I4632:425921;314:60857;218:744781;1511:245978" data-name="list_row/complete">
                    <div className="-translate-y-1/2 absolute content-stretch flex flex-col gap-[2px] items-start left-[10px] top-1/2" data-node-id="I4632:425921;314:60857;218:744781;1511:245980">
                      <div className="[word-break:break-word] flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal h-[15px] justify-center leading-[0] not-italic relative shrink-0 text-[12px] text-[rgba(0,0,0,0.65)] tracking-[0.36px] w-[137px]" data-node-id="I4632:425921;314:60857;218:744781;1511:245981" style={{ fontFeatureSettings: '"lnum" 1, "pnum" 1' }}>
                        <p className="leading-none">Clinical status</p>
                      </div>
                    </div>
                    <VerificationStatus className="-translate-y-1/2 absolute opacity-80 right-[7px] size-[13px] top-[calc(50%+1px)]" />
                    <div className="-translate-y-1/2 [word-break:break-word] absolute flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal h-[18px] justify-center leading-[0] left-[154px] not-italic right-[48px] text-[15px] text-[rgba(0,0,0,0.85)] top-[calc(50%+0.5px)]" data-node-id="I4632:425921;314:60857;218:744781;1511:246042">
                      <p className="leading-none">Recurrent</p>
                    </div>
                    <div className="-translate-y-1/2 absolute bg-[#fffeff] border border-[#51548d] border-solid content-stretch flex gap-[5px] items-start overflow-clip px-[7px] py-[2px] right-[27.5px] rounded-[4px] shadow-[0px_1px_5px_0px_rgba(0,0,0,0.14)] top-1/2" data-node-id="I4632:425921;314:60857;218:744781;1511:246090" data-name="verify">
                      <div className="[word-break:break-word] flex flex-col font-[family-name:'Source_Sans_Pro'] font-semibold justify-center leading-[0] not-italic relative shrink-0 text-[#464761] text-[15px] tracking-[0.45px] whitespace-nowrap" data-node-id="I4632:425921;314:60857;218:744781;1511:246094">
                        <p className="leading-[normal]">Verify</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="h-[104px] relative shrink-0 w-full" data-node-id="I4632:425921;314:60857;218:744781;1511:246098">
                <p className="[word-break:break-word] absolute font-[family-name:'Source_Sans_Pro'] font-semibold h-[15px] leading-[normal] left-[10px] not-italic text-[12px] text-[rgba(0,0,0,0.65)] top-[4.5px] tracking-[0.36px] w-[299px]" data-node-id="I4632:425921;314:60857;218:744781;1511:246099" style={{ fontFeatureSettings: '"lnum" 1, "pnum" 1' }}>
                  Last treatments
                </p>
                <div className="absolute content-stretch flex flex-col items-start left-0 overflow-clip top-[23px] w-[510px]" data-node-id="I4632:425921;314:60857;218:744781;1511:246100">
                  <div className="h-[27px] relative shrink-0 w-full" data-node-id="I4632:425921;314:60857;218:744781;1511:246101" data-name="list_row/complete">
                    <div className="absolute bg-[rgba(65,92,106,0.04)] inset-0" data-node-id="I4632:425921;314:60857;218:744781;1511:246102" data-name="bg" />
                    <div className="-translate-y-1/2 absolute content-stretch flex flex-col gap-[2px] items-start left-[10px] top-1/2" data-node-id="I4632:425921;314:60857;218:744781;1511:246103">
                      <div className="[word-break:break-word] flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal h-[15px] justify-center leading-[0] not-italic relative shrink-0 text-[12px] text-[rgba(0,0,0,0.65)] tracking-[0.36px] w-[137px]" data-node-id="I4632:425921;314:60857;218:744781;1511:246104" style={{ fontFeatureSettings: '"lnum" 1, "pnum" 1' }}>
                        <p className="leading-none">Last resection</p>
                      </div>
                    </div>
                    <div className="-translate-y-1/2 [word-break:break-word] absolute flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal h-[18px] justify-center leading-[0] left-[154px] not-italic right-[48px] text-[15px] text-[rgba(0,0,0,0.85)] top-[calc(50%+0.5px)]" data-node-id="I4632:425921;314:60857;218:744781;1511:246165">
                      <p className="leading-none">4 May 2019</p>
                    </div>
                  </div>
                  <div className="h-[27px] relative shrink-0 w-full" data-node-id="I4632:425921;314:60857;218:744781;1511:246221" data-name="list_row/complete">
                    <div className="-translate-y-1/2 absolute content-stretch flex flex-col gap-[2px] items-start left-[10px] top-1/2" data-node-id="I4632:425921;314:60857;218:744781;1511:246223">
                      <div className="[word-break:break-word] flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal h-[15px] justify-center leading-[0] not-italic relative shrink-0 text-[12px] text-[rgba(0,0,0,0.65)] tracking-[0.36px] w-[137px]" data-node-id="I4632:425921;314:60857;218:744781;1511:246224" style={{ fontFeatureSettings: '"lnum" 1, "pnum" 1' }}>
                        <p className="leading-none">Recent medication</p>
                      </div>
                    </div>
                    <div className="-translate-y-1/2 [word-break:break-word] absolute flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal h-[18px] justify-center leading-[0] left-[154px] not-italic right-[48px] text-[15px] text-[rgba(0,0,0,0.85)] top-[calc(50%+0.5px)]" data-node-id="I4632:425921;314:60857;218:744781;1511:246285">
                      <p className="leading-none">Tamoxifen</p>
                    </div>
                  </div>
                  <div className="bg-[rgba(65,92,106,0.04)] h-[27px] relative shrink-0 w-full" data-node-id="I4632:425921;314:60857;218:744781;1511:246341" data-name="list_row/complete">
                    <div className="-translate-y-1/2 absolute content-stretch flex flex-col gap-[2px] items-start left-[10px] top-1/2" data-node-id="I4632:425921;314:60857;218:744781;1511:246343">
                      <div className="[word-break:break-word] flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal h-[15px] justify-center leading-[0] not-italic relative shrink-0 text-[12px] text-[rgba(0,0,0,0.65)] tracking-[0.36px] w-[137px]" data-node-id="I4632:425921;314:60857;218:744781;1511:246344" style={{ fontFeatureSettings: '"lnum" 1, "pnum" 1' }}>
                        <p className="leading-none">Last radiation</p>
                      </div>
                    </div>
                    <div className="-translate-y-1/2 [word-break:break-word] absolute flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal h-[18px] justify-center leading-[0] left-[154px] not-italic right-[48px] text-[15px] text-[rgba(0,0,0,0.85)] top-[calc(50%+0.5px)]" data-node-id="I4632:425921;314:60857;218:744781;1511:246405">
                      <p className="leading-none">23 Jun 2019 – 4 Aug 2019</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="content-stretch flex flex-col gap-[15px] items-start relative shrink-0 w-full" data-node-id="I4632:425921;314:60857;218:744781;1511:246467" data-name="medications">
              <div className="h-[15px] relative shrink-0 w-full" data-node-id="I4632:425921;314:60857;218:744781;1511:246468" data-name="expanding_section_title">
                <div className="absolute inset-[0_14px_0_0] overflow-clip" data-node-id="I4632:425921;314:60857;218:744781;1511:246469" data-name="section_title">
                  <div className="absolute content-stretch flex gap-[8px] items-center left-[10px] overflow-clip top-0" data-node-id="I4632:425921;314:60857;218:744781;1511:246470" data-name="section_title">
                    <p className="[word-break:break-word] font-[family-name:'Source_Sans_Pro'] font-normal leading-[normal] not-italic relative shrink-0 text-[12px] text-[rgba(0,0,0,0.65)] tracking-[1.2px] uppercase whitespace-nowrap" data-node-id="I4632:425921;314:60857;218:744781;1511:246471" style={{ fontFeatureSettings: '"lnum" 1, "pnum" 1' }}>
                      Medications
                    </p>
                    <div className="h-0 relative shrink-0 w-[523px]" data-node-id="I4632:425921;314:60857;218:744781;1511:246472" data-name="border-top">
                      <div className="absolute inset-[-0.5px_0]">
                        <Image unoptimized width={523} height={1}  alt="" className="block max-w-none size-full" src={imgBorderTop} />
                      </div>
                    </div>
                  </div>
                  <div className="-translate-y-1/2 absolute h-0 left-0 top-1/2 w-[5px]" data-node-id="I4632:425921;314:60857;218:744781;1511:246473" data-name="border-top">
                    <div className="absolute inset-[-0.5px_0]">
                      <Image unoptimized width={5} height={1}  alt="" className="block max-w-none size-full" src={imgBorderTop1} />
                    </div>
                  </div>
                </div>
                <div className="-translate-y-1/2 absolute right-[-3px] size-[16px] top-[calc(50%+0.5px)]" data-node-id="I4632:425921;314:60857;218:744781;1511:246474" data-name="expander/open">
                  <Image unoptimized width={16} height={16}  alt="" className="absolute block inset-0 max-w-none size-full" src={imgExpanderOpen2} />
                </div>
              </div>
              <div className="h-[101px] relative shrink-0 w-full" data-node-id="I4632:425921;314:60857;218:744781;1511:246477">
                <p className="[word-break:break-word] absolute font-[family-name:'Source_Sans_Pro'] font-semibold h-[15px] leading-[normal] left-[10px] not-italic text-[12px] text-[rgba(0,0,0,0.65)] top-[6px] tracking-[0.36px] w-[200.367px]" data-node-id="I4632:425921;314:60857;218:744781;1511:246478" style={{ fontFeatureSettings: '"lnum" 1, "pnum" 1' }}>
                  Treatment
                </p>
                <div className="absolute content-stretch flex flex-col items-start left-0 overflow-clip top-[22px] w-[508px]" data-node-id="I4632:425921;314:60857;218:744781;1511:246479">
                  <div className="h-[27px] relative shrink-0 w-full" data-node-id="I4632:425921;314:60857;218:744781;1511:246480" data-name="list_row/complete">
                    <div className="absolute bg-[rgba(65,92,106,0.04)] inset-0" data-node-id="I4632:425921;314:60857;218:744781;1511:246481" data-name="bg" />
                    <div className="-translate-y-1/2 absolute content-stretch flex flex-col gap-[2px] items-start left-[10px] top-1/2" data-node-id="I4632:425921;314:60857;218:744781;1511:246482">
                      <div className="[word-break:break-word] flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal h-[15px] justify-center leading-[0] not-italic relative shrink-0 text-[12px] text-[rgba(0,0,0,0.65)] tracking-[0.36px] w-[137px]" data-node-id="I4632:425921;314:60857;218:744781;1511:246483" style={{ fontFeatureSettings: '"lnum" 1, "pnum" 1' }}>
                        <p className="leading-none">{`14 Jun 2019 – `}</p>
                      </div>
                    </div>
                    <div className="-translate-y-1/2 [word-break:break-word] absolute flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal h-[18px] justify-center leading-[0] left-[154px] not-italic right-[48px] text-[15px] text-[rgba(0,0,0,0.85)] top-[calc(50%+0.5px)]" data-node-id="I4632:425921;314:60857;218:744781;1511:246544">
                      <p className="leading-none">{`tamoxifen `}</p>
                    </div>
                  </div>
                  <div className="h-[27px] relative shrink-0 w-full" data-node-id="I4632:425921;314:60857;218:744781;1511:246600" data-name="list_row/complete">
                    <div className="-translate-y-1/2 absolute content-stretch flex flex-col gap-[2px] items-start left-[10px] top-1/2" data-node-id="I4632:425921;314:60857;218:744781;1511:246602">
                      <div className="[word-break:break-word] flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal h-[15px] justify-center leading-[0] not-italic relative shrink-0 text-[12px] text-[rgba(0,0,0,0.65)] tracking-[0.36px] w-[137px]" data-node-id="I4632:425921;314:60857;218:744781;1511:246603" style={{ fontFeatureSettings: '"lnum" 1, "pnum" 1' }}>
                        <p className="leading-none">26 Sep 2018 – Dec 2019</p>
                      </div>
                    </div>
                    <div className="-translate-y-1/2 [word-break:break-word] absolute flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal h-[18px] justify-center leading-[0] left-[154px] not-italic right-[48px] text-[15px] text-[rgba(0,0,0,0.85)] top-[calc(50%+0.5px)]" data-node-id="I4632:425921;314:60857;218:744781;1511:246664">
                      <p className="leading-none">ddAC followed by paclitaxel</p>
                    </div>
                  </div>
                  <div className="h-[25px] relative shrink-0 w-full" data-node-id="I4632:425921;314:60857;218:744781;1511:246720" data-name="more">
                    <div className="absolute content-stretch flex gap-[9px] items-center left-[10px] overflow-clip top-[6px]" data-node-id="I4632:425921;314:60857;218:744781;1511:246721">
                      <p className="[word-break:break-word] font-[family-name:'Source_Sans_Pro'] font-normal leading-none not-italic relative shrink-0 text-[15px] text-[rgba(0,0,0,0.65)] whitespace-nowrap" data-node-id="I4632:425921;314:60857;218:744781;1511:246722">
                        3 Past medications
                      </p>
                      <div className="relative shrink-0 size-[16px]" data-node-id="I4632:425921;314:60857;218:744781;1511:246723" data-name="expander/closed">
                        <Image unoptimized width={16} height={16}  alt="" className="absolute block inset-0 max-w-none size-full" src={imgExpanderClosed} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="h-[127px] relative shrink-0 w-full" data-node-id="I4632:425921;314:60857;218:744781;1511:246726">
                <p className="[word-break:break-word] absolute font-[family-name:'Source_Sans_Pro'] font-semibold h-[15px] leading-[normal] left-[9.11px] not-italic text-[12px] text-[rgba(0,0,0,0.65)] top-[6px] tracking-[0.36px] w-[200.367px]" data-node-id="I4632:425921;314:60857;218:744781;1511:246727" style={{ fontFeatureSettings: '"lnum" 1, "pnum" 1' }}>
                  Supportive
                </p>
                <div className="absolute content-stretch flex flex-col items-start left-0 overflow-clip top-[22px] w-[508px]" data-node-id="I4632:425921;314:60857;218:744781;1511:246728">
                  <div className="h-[27px] relative shrink-0 w-full" data-node-id="I4632:425921;314:60857;218:744781;1511:246729" data-name="list_row/complete">
                    <div className="absolute bg-[rgba(65,92,106,0.04)] inset-0" data-node-id="I4632:425921;314:60857;218:744781;1511:246730" data-name="bg" />
                    <div className="-translate-y-1/2 absolute content-stretch flex flex-col gap-[2px] items-start left-[10px] top-1/2" data-node-id="I4632:425921;314:60857;218:744781;1511:246731">
                      <div className="[word-break:break-word] flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal h-[15px] justify-center leading-[0] not-italic relative shrink-0 text-[12px] text-[rgba(0,0,0,0.65)] tracking-[0.36px] w-[137px]" data-node-id="I4632:425921;314:60857;218:744781;1511:246732" style={{ fontFeatureSettings: '"lnum" 1, "pnum" 1' }}>
                        <p className="leading-none">26 Oct 2018 –</p>
                      </div>
                    </div>
                    <div className="-translate-y-1/2 [word-break:break-word] absolute flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal h-[18px] justify-center leading-[0] left-[154px] not-italic right-[48px] text-[15px] text-[rgba(0,0,0,0.85)] top-[calc(50%+0.5px)]" data-node-id="I4632:425921;314:60857;218:744781;1511:246793">
                      <p className="leading-none">lisinopril, 20mg QD, oral</p>
                    </div>
                  </div>
                  <div className="h-[27px] relative shrink-0 w-full" data-node-id="I4632:425921;314:60857;218:744781;1511:246849" data-name="list_row/complete">
                    <div className="-translate-y-1/2 absolute content-stretch flex flex-col gap-[2px] items-start left-[10px] top-1/2" data-node-id="I4632:425921;314:60857;218:744781;1511:246851">
                      <div className="[word-break:break-word] flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal h-[15px] justify-center leading-[0] not-italic relative shrink-0 text-[12px] text-[rgba(0,0,0,0.65)] tracking-[0.36px] w-[137px]" data-node-id="I4632:425921;314:60857;218:744781;1511:246852" style={{ fontFeatureSettings: '"lnum" 1, "pnum" 1' }}>
                        <p className="leading-none">26 Sep 2018 –</p>
                      </div>
                    </div>
                    <div className="-translate-y-1/2 [word-break:break-word] absolute flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal h-[18px] justify-center leading-[0] left-[154px] not-italic right-[48px] text-[15px] text-[rgba(0,0,0,0.85)] top-[calc(50%+0.5px)]" data-node-id="I4632:425921;314:60857;218:744781;1511:246913">
                      <p className="leading-none">XGeva, 120 mg, every 4 weeks, subq</p>
                    </div>
                  </div>
                  <div className="h-[27px] relative shrink-0 w-full" data-node-id="I4632:425921;314:60857;218:744781;1511:246969" data-name="list_row/complete">
                    <div className="absolute bg-[rgba(65,92,106,0.04)] inset-0" data-node-id="I4632:425921;314:60857;218:744781;1511:246970" data-name="bg" />
                    <div className="-translate-y-1/2 absolute content-stretch flex flex-col gap-[2px] items-start left-[10px] top-1/2" data-node-id="I4632:425921;314:60857;218:744781;1511:246971">
                      <div className="[word-break:break-word] flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal h-[15px] justify-center leading-[0] not-italic relative shrink-0 text-[12px] text-[rgba(0,0,0,0.65)] tracking-[0.36px] w-[137px]" data-node-id="I4632:425921;314:60857;218:744781;1511:246972" style={{ fontFeatureSettings: '"lnum" 1, "pnum" 1' }}>
                        <p className="leading-none">26 Sep 2018 –</p>
                      </div>
                    </div>
                    <div className="-translate-y-1/2 [word-break:break-word] absolute flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal h-[18px] justify-center leading-[0] left-[154px] not-italic right-[48px] text-[15px] text-[rgba(0,0,0,0.85)] top-[calc(50%+0.5px)]" data-node-id="I4632:425921;314:60857;218:744781;1511:247033">
                      <p className="leading-none">Neupogen, 5 mcg/kg/day, subq</p>
                    </div>
                  </div>
                  <div className="h-[25px] relative shrink-0 w-full" data-node-id="I4632:425921;314:60857;218:744781;1511:247089" data-name="more">
                    <div className="absolute content-stretch flex gap-[9px] items-center left-[10px] overflow-clip top-[6px]" data-node-id="I4632:425921;314:60857;218:744781;1511:247090">
                      <p className="[word-break:break-word] font-[family-name:'Source_Sans_Pro'] font-normal leading-none not-italic relative shrink-0 text-[15px] text-[rgba(0,0,0,0.65)] whitespace-nowrap" data-node-id="I4632:425921;314:60857;218:744781;1511:247091">
                        1 Past medication
                      </p>
                      <div className="relative shrink-0 size-[16px]" data-node-id="I4632:425921;314:60857;218:744781;1511:247092" data-name="expander/closed">
                        <Image unoptimized width={16} height={16}  alt="" className="absolute block inset-0 max-w-none size-full" src={imgExpanderClosed} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="h-[249px] relative shrink-0 w-full" data-node-id="I4632:425921;314:60857;218:744781;1511:247095" data-name="procedures">
              <div className="absolute h-[15px] left-0 right-0 top-0" data-node-id="I4632:425921;314:60857;218:744781;1511:247096" data-name="expanding_section_title">
                <div className="absolute inset-[0_14px_0_0] overflow-clip" data-node-id="I4632:425921;314:60857;218:744781;1511:247097" data-name="section_title">
                  <div className="absolute content-stretch flex gap-[8px] items-center left-[10px] overflow-clip top-0" data-node-id="I4632:425921;314:60857;218:744781;1511:247098" data-name="section_title">
                    <p className="[word-break:break-word] font-[family-name:'Source_Sans_Pro'] font-normal leading-[normal] not-italic relative shrink-0 text-[12px] text-[rgba(0,0,0,0.65)] tracking-[1.2px] uppercase whitespace-nowrap" data-node-id="I4632:425921;314:60857;218:744781;1511:247099" style={{ fontFeatureSettings: '"lnum" 1, "pnum" 1' }}>
                      Procedures
                    </p>
                    <div className="h-0 relative shrink-0 w-[523px]" data-node-id="I4632:425921;314:60857;218:744781;1511:247100" data-name="border-top">
                      <div className="absolute inset-[-0.5px_0]">
                        <Image unoptimized width={523} height={1}  alt="" className="block max-w-none size-full" src={imgBorderTop} />
                      </div>
                    </div>
                  </div>
                  <div className="-translate-y-1/2 absolute h-0 left-0 top-1/2 w-[5px]" data-node-id="I4632:425921;314:60857;218:744781;1511:247101" data-name="border-top">
                    <div className="absolute inset-[-0.5px_0]">
                      <Image unoptimized width={5} height={1}  alt="" className="block max-w-none size-full" src={imgBorderTop1} />
                    </div>
                  </div>
                </div>
                <div className="-translate-y-1/2 absolute right-[-3px] size-[16px] top-[calc(50%+0.5px)]" data-node-id="I4632:425921;314:60857;218:744781;1511:247102" data-name="expander/open">
                  <Image unoptimized width={16} height={16}  alt="" className="absolute block inset-0 max-w-none size-full" src={imgExpanderOpen2} />
                </div>
              </div>
              <div className="absolute h-[101px] left-0 right-0 top-[30px]" data-node-id="I4632:425921;314:60857;218:744781;1511:247105">
                <p className="[word-break:break-word] absolute font-[family-name:'Source_Sans_Pro'] font-semibold h-[15px] leading-[normal] left-[10px] not-italic text-[12px] text-[rgba(0,0,0,0.65)] top-[6px] tracking-[0.36px] w-[200.367px]" data-node-id="I4632:425921;314:60857;218:744781;1511:247106" style={{ fontFeatureSettings: '"lnum" 1, "pnum" 1' }}>
                  Treatment
                </p>
                <div className="absolute h-[81px] left-0 overflow-clip top-[22px] w-[508px]" data-node-id="I4632:425921;314:60857;218:744781;1511:247107">
                  <div className="absolute h-[27px] left-0 top-0 w-[508px]" data-node-id="I4632:425921;314:60857;218:744781;1511:247108" data-name="list_row/complete">
                    <div className="absolute bg-[rgba(65,92,106,0.04)] inset-0" data-node-id="I4632:425921;314:60857;218:744781;1511:247109" data-name="bg" />
                    <div className="-translate-y-1/2 absolute content-stretch flex flex-col gap-[2px] items-start left-[10px] top-1/2" data-node-id="I4632:425921;314:60857;218:744781;1511:247110">
                      <div className="[word-break:break-word] flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal h-[15px] justify-center leading-[0] not-italic relative shrink-0 text-[12px] text-[rgba(0,0,0,0.65)] tracking-[0.36px] w-[137px]" data-node-id="I4632:425921;314:60857;218:744781;1511:247111" style={{ fontFeatureSettings: '"lnum" 1, "pnum" 1' }}>
                        <p className="leading-none">{`26 Apr 2019 – 7 Jun 2019 `}</p>
                      </div>
                    </div>
                    <div className="-translate-y-1/2 absolute opacity-80 right-[7px] size-[13px] top-[calc(50%+1px)]" data-node-id="I4632:425921;314:60857;218:744781;1634:212599" data-name="verification status">
                      <Image unoptimized width={13} height={13}  alt="" className="absolute block inset-0 max-w-none size-full" src={imgVerificationStatus} />
                    </div>
                    <div className="-translate-y-1/2 [word-break:break-word] absolute flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal h-[18px] justify-center leading-[0] left-[154px] not-italic right-[48px] text-[15px] text-[rgba(0,0,0,0.85)] top-[calc(50%+0.5px)]" data-node-id="I4632:425921;314:60857;218:744781;1511:247172">
                      <p className="leading-none">radiation therapy</p>
                    </div>
                  </div>
                  <div className="absolute h-[27px] left-0 top-[27px] w-[508px]" data-node-id="I4632:425921;314:60857;218:744781;1511:247228" data-name="list_row/complete">
                    <div className="-translate-y-1/2 absolute content-stretch flex flex-col gap-[2px] items-start left-[10px] top-1/2" data-node-id="I4632:425921;314:60857;218:744781;1511:247230">
                      <div className="[word-break:break-word] flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal h-[15px] justify-center leading-[0] not-italic relative shrink-0 text-[12px] text-[rgba(0,0,0,0.65)] tracking-[0.36px] w-[137px]" data-node-id="I4632:425921;314:60857;218:744781;1511:247231" style={{ fontFeatureSettings: '"lnum" 1, "pnum" 1' }}>
                        <p className="leading-none">17 Feb 2019</p>
                      </div>
                    </div>
                    <div className="-translate-y-1/2 [word-break:break-word] absolute flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal h-[18px] justify-center leading-[0] left-[154px] not-italic right-[48px] text-[15px] text-[rgba(0,0,0,0.85)] top-[calc(50%+0.5px)]" data-node-id="I4632:425921;314:60857;218:744781;1511:247292">
                      <p className="leading-none">lumpectomy</p>
                    </div>
                  </div>
                  <div className="absolute h-[27px] left-0 top-[54px] w-[508px]" data-node-id="I4632:425921;314:60857;218:744781;1511:247348" data-name="list_row/complete">
                    <div className="absolute bg-[rgba(65,92,106,0.04)] inset-0" data-node-id="I4632:425921;314:60857;218:744781;1511:247349" data-name="bg" />
                    <div className="-translate-y-1/2 absolute content-stretch flex flex-col gap-[2px] items-start left-[10px] top-1/2" data-node-id="I4632:425921;314:60857;218:744781;1511:247350">
                      <div className="[word-break:break-word] flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal h-[15px] justify-center leading-[0] not-italic relative shrink-0 text-[12px] text-[rgba(0,0,0,0.65)] tracking-[0.36px] w-[137px]" data-node-id="I4632:425921;314:60857;218:744781;1511:247351" style={{ fontFeatureSettings: '"lnum" 1, "pnum" 1' }}>
                        <p className="leading-none">28 Sep 2018 – 28 Jan 2019</p>
                      </div>
                    </div>
                    <div className="-translate-y-1/2 [word-break:break-word] absolute flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal h-[18px] justify-center leading-[0] left-[154px] not-italic right-[48px] text-[15px] text-[rgba(0,0,0,0.85)] top-[calc(50%+0.5px)]" data-node-id="I4632:425921;314:60857;218:744781;1511:247412">
                      <p className="leading-none">{`radiation therapy `}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute h-[103px] left-0 right-0 top-[146px]" data-node-id="I4632:425921;314:60857;218:744781;1511:247474">
                <p className="[word-break:break-word] absolute font-[family-name:'Source_Sans_Pro'] font-semibold h-[15px] leading-[normal] left-[9.11px] not-italic text-[12px] text-[rgba(0,0,0,0.65)] top-[6px] tracking-[0.36px] w-[200.367px]" data-node-id="I4632:425921;314:60857;218:744781;1511:247475" style={{ fontFeatureSettings: '"lnum" 1, "pnum" 1' }}>
                  Non-treatment
                </p>
                <div className="absolute h-[81px] left-0 overflow-clip top-[22px] w-[508px]" data-node-id="I4632:425921;314:60857;218:744781;1511:247476">
                  <div className="absolute h-[27px] left-0 top-0 w-[508px]" data-node-id="I4632:425921;314:60857;218:744781;1511:247477" data-name="list_row/complete">
                    <div className="absolute bg-[rgba(65,92,106,0.04)] inset-0" data-node-id="I4632:425921;314:60857;218:744781;1511:247478" data-name="bg" />
                    <div className="-translate-y-1/2 absolute content-stretch flex flex-col gap-[2px] items-start left-[10px] top-1/2" data-node-id="I4632:425921;314:60857;218:744781;1511:247479">
                      <div className="[word-break:break-word] flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal h-[15px] justify-center leading-[0] not-italic relative shrink-0 text-[12px] text-[rgba(0,0,0,0.65)] tracking-[0.36px] w-[137px]" data-node-id="I4632:425921;314:60857;218:744781;1511:247480" style={{ fontFeatureSettings: '"lnum" 1, "pnum" 1' }}>
                        <p className="leading-none">29 May 2020</p>
                      </div>
                    </div>
                    <div className="-translate-y-1/2 absolute opacity-80 right-[7px] size-[13px] top-[calc(50%+1px)]" data-node-id="I4632:425921;314:60857;218:744781;1634:214574" data-name="verification status">
                      <Image unoptimized width={13} height={13}  alt="" className="absolute block inset-0 max-w-none size-full" src={imgVerificationStatus} />
                    </div>
                    <div className="-translate-y-1/2 [word-break:break-word] absolute flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal h-[18px] justify-center leading-[0] left-[154px] not-italic right-[48px] text-[15px] text-[rgba(0,0,0,0.85)] top-[calc(50%+0.5px)]" data-node-id="I4632:425921;314:60857;218:744781;1511:247541">
                      <p className="leading-none">pathology event</p>
                    </div>
                  </div>
                  <div className="absolute h-[27px] left-0 top-[27px] w-[508px]" data-node-id="I4632:425921;314:60857;218:744781;1511:247597" data-name="list_row/complete">
                    <div className="-translate-y-1/2 absolute content-stretch flex flex-col gap-[2px] items-start left-[10px] top-1/2" data-node-id="I4632:425921;314:60857;218:744781;1511:247599">
                      <div className="[word-break:break-word] flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal h-[15px] justify-center leading-[0] not-italic relative shrink-0 text-[12px] text-[rgba(0,0,0,0.65)] tracking-[0.36px] w-[137px]" data-node-id="I4632:425921;314:60857;218:744781;1511:247600" style={{ fontFeatureSettings: '"lnum" 1, "pnum" 1' }}>
                        <p className="leading-none">21 Sep 2018</p>
                      </div>
                    </div>
                    <div className="-translate-y-1/2 [word-break:break-word] absolute flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal h-[18px] justify-center leading-[0] left-[154px] not-italic right-[48px] text-[15px] text-[rgba(0,0,0,0.85)] top-[calc(50%+0.5px)]" data-node-id="I4632:425921;314:60857;218:744781;1511:247661">
                      <p className="leading-none">Port-a-cath insertion</p>
                    </div>
                  </div>
                  <div className="absolute h-[27px] left-0 top-[54px] w-[508px]" data-node-id="I4632:425921;314:60857;218:744781;1511:247717" data-name="list_row/complete">
                    <div className="absolute bg-[rgba(65,92,106,0.04)] inset-0" data-node-id="I4632:425921;314:60857;218:744781;1511:247718" data-name="bg" />
                    <div className="-translate-y-1/2 absolute content-stretch flex flex-col gap-[2px] items-start left-[10px] top-1/2" data-node-id="I4632:425921;314:60857;218:744781;1511:247719">
                      <div className="[word-break:break-word] flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal h-[15px] justify-center leading-[0] not-italic relative shrink-0 text-[12px] text-[rgba(0,0,0,0.65)] tracking-[0.36px] w-[137px]" data-node-id="I4632:425921;314:60857;218:744781;1511:247720" style={{ fontFeatureSettings: '"lnum" 1, "pnum" 1' }}>
                        <p className="leading-none">6 Aug 2018</p>
                      </div>
                    </div>
                    <div className="-translate-y-1/2 [word-break:break-word] absolute flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal h-[18px] justify-center leading-[0] left-[154px] not-italic right-[48px] text-[15px] text-[rgba(0,0,0,0.85)] top-[calc(50%+0.5px)]" data-node-id="I4632:425921;314:60857;218:744781;1511:247781">
                      <p className="leading-none">Core needle biopsy</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="h-[184px] relative shrink-0 w-full" data-node-id="I4632:425921;314:60857;218:744781;1511:247843" data-name="imaging">
              <div className="absolute h-[15px] left-0 right-0 top-0" data-node-id="I4632:425921;314:60857;218:744781;1511:247844" data-name="expanding_section_title">
                <div className="absolute inset-[0_14px_0_0] overflow-clip" data-node-id="I4632:425921;314:60857;218:744781;1511:247845" data-name="section_title">
                  <div className="absolute content-stretch flex gap-[8px] items-center left-[10px] overflow-clip top-0" data-node-id="I4632:425921;314:60857;218:744781;1511:247846" data-name="section_title">
                    <p className="[word-break:break-word] font-[family-name:'Source_Sans_Pro'] font-normal leading-[normal] not-italic relative shrink-0 text-[12px] text-[rgba(0,0,0,0.65)] tracking-[1.2px] uppercase whitespace-nowrap" data-node-id="I4632:425921;314:60857;218:744781;1511:247847" style={{ fontFeatureSettings: '"lnum" 1, "pnum" 1' }}>
                      Imaging
                    </p>
                    <div className="h-0 relative shrink-0 w-[523px]" data-node-id="I4632:425921;314:60857;218:744781;1511:247848" data-name="border-top">
                      <div className="absolute inset-[-0.5px_0]">
                        <Image unoptimized width={523} height={1}  alt="" className="block max-w-none size-full" src={imgBorderTop} />
                      </div>
                    </div>
                  </div>
                  <div className="-translate-y-1/2 absolute h-0 left-0 top-1/2 w-[5px]" data-node-id="I4632:425921;314:60857;218:744781;1511:247849" data-name="border-top">
                    <div className="absolute inset-[-0.5px_0]">
                      <Image unoptimized width={5} height={1}  alt="" className="block max-w-none size-full" src={imgBorderTop1} />
                    </div>
                  </div>
                </div>
                <div className="-translate-y-1/2 absolute right-[-3px] size-[16px] top-[calc(50%+0.5px)]" data-node-id="I4632:425921;314:60857;218:744781;1511:247850" data-name="expander/open">
                  <Image unoptimized width={16} height={16}  alt="" className="absolute block inset-0 max-w-none size-full" src={imgExpanderOpen2} />
                </div>
              </div>
              <div className="absolute h-[154px] left-0 overflow-clip right-0 top-[30px]" data-node-id="I4632:425921;314:60857;218:744781;1511:247853">
                <div className="absolute h-[27px] left-0 top-0 w-[508px]" data-node-id="I4632:425921;314:60857;218:744781;1511:247854" data-name="list_row/complete">
                  <div className="absolute bg-[rgba(65,92,106,0.04)] inset-0" data-node-id="I4632:425921;314:60857;218:744781;1511:247855" data-name="bg" />
                  <div className="-translate-y-1/2 absolute content-stretch flex flex-col gap-[2px] items-start left-[10px] top-1/2" data-node-id="I4632:425921;314:60857;218:744781;1511:247856">
                    <div className="[word-break:break-word] flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal h-[15px] justify-center leading-[0] not-italic relative shrink-0 text-[12px] text-[rgba(0,0,0,0.65)] tracking-[0.36px] w-[137px]" data-node-id="I4632:425921;314:60857;218:744781;1511:247857" style={{ fontFeatureSettings: '"lnum" 1, "pnum" 1' }}>
                      <p className="leading-none">29 May 2020</p>
                    </div>
                  </div>
                  <div className="-translate-y-1/2 absolute opacity-80 right-[7px] size-[13px] top-[calc(50%+1px)]" data-node-id="I4632:425921;314:60857;218:744781;1634:218307" data-name="verification status">
                    <Image unoptimized width={13} height={13}  alt="" className="absolute block inset-0 max-w-none size-full" src={imgVerificationStatus} />
                  </div>
                  <div className="-translate-y-1/2 [word-break:break-word] absolute flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal h-[18px] justify-center leading-[0] left-[154px] not-italic right-[48px] text-[15px] text-[rgba(0,0,0,0.85)] top-[calc(50%+0.5px)]" data-node-id="I4632:425921;314:60857;218:744781;1511:247918">
                    <p className="leading-none">imaging event</p>
                  </div>
                </div>
                <div className="absolute h-[27px] left-0 top-[27px] w-[508px]" data-node-id="I4632:425921;314:60857;218:744781;1511:247974" data-name="list_row/complete">
                  <div className="-translate-y-1/2 absolute content-stretch flex flex-col gap-[2px] items-start left-[10px] top-1/2" data-node-id="I4632:425921;314:60857;218:744781;1511:247976">
                    <div className="[word-break:break-word] flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal h-[15px] justify-center leading-[0] not-italic relative shrink-0 text-[12px] text-[rgba(0,0,0,0.65)] tracking-[0.36px] w-[137px]" data-node-id="I4632:425921;314:60857;218:744781;1511:247977" style={{ fontFeatureSettings: '"lnum" 1, "pnum" 1' }}>
                      <p className="leading-none">19 May 2020</p>
                    </div>
                  </div>
                  <div className="-translate-y-1/2 absolute opacity-80 right-[7px] size-[13px] top-[calc(50%+1px)]" data-node-id="I4632:425921;314:60857;218:744781;1634:219806" data-name="verification status">
                    <Image unoptimized width={13} height={13}  alt="" className="absolute block inset-0 max-w-none size-full" src={imgVerificationStatus} />
                  </div>
                  <div className="-translate-y-1/2 [word-break:break-word] absolute flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal h-[18px] justify-center leading-[0] left-[154px] not-italic right-[48px] text-[15px] text-[rgba(0,0,0,0.85)] top-[calc(50%+0.5px)]" data-node-id="I4632:425921;314:60857;218:744781;1511:248038">
                    <p className="leading-none">imaging event</p>
                  </div>
                </div>
                <div className="absolute h-[27px] left-0 top-[54px] w-[508px]" data-node-id="I4632:425921;314:60857;218:744781;1511:248094" data-name="list_row/complete">
                  <div className="absolute bg-[rgba(65,92,106,0.04)] inset-0" data-node-id="I4632:425921;314:60857;218:744781;1511:248095" data-name="bg" />
                  <div className="-translate-y-1/2 absolute content-stretch flex flex-col gap-[2px] items-start left-[10px] top-1/2" data-node-id="I4632:425921;314:60857;218:744781;1511:248096">
                    <div className="[word-break:break-word] flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal h-[15px] justify-center leading-[0] not-italic relative shrink-0 text-[12px] text-[rgba(0,0,0,0.65)] tracking-[0.36px] w-[137px]" data-node-id="I4632:425921;314:60857;218:744781;1511:248097" style={{ fontFeatureSettings: '"lnum" 1, "pnum" 1' }}>
                      <p className="leading-none">23 Sep 2018</p>
                    </div>
                  </div>
                  <div className="-translate-y-1/2 [word-break:break-word] absolute flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal h-[18px] justify-center leading-[0] left-[154px] not-italic right-[48px] text-[15px] text-[rgba(0,0,0,0.85)] top-[calc(50%+0.5px)]" data-node-id="I4632:425921;314:60857;218:744781;1511:248158">
                    <p className="leading-none">transthoracic 3d echocardiogram of heart</p>
                  </div>
                </div>
                <div className="absolute h-[27px] left-0 top-[81px] w-[508px]" data-node-id="I4632:425921;314:60857;218:744781;1511:248214" data-name="list_row/complete">
                  <div className="-translate-y-1/2 absolute content-stretch flex flex-col gap-[2px] items-start left-[10px] top-1/2" data-node-id="I4632:425921;314:60857;218:744781;1511:248216">
                    <div className="[word-break:break-word] flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal h-[15px] justify-center leading-[0] not-italic relative shrink-0 text-[12px] text-[rgba(0,0,0,0.65)] tracking-[0.36px] w-[137px]" data-node-id="I4632:425921;314:60857;218:744781;1511:248217" style={{ fontFeatureSettings: '"lnum" 1, "pnum" 1' }}>
                      <p className="leading-none">21 Jul 2018</p>
                    </div>
                  </div>
                  <div className="-translate-y-1/2 [word-break:break-word] absolute flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal h-[18px] justify-center leading-[0] left-[154px] not-italic right-[48px] text-[15px] text-[rgba(0,0,0,0.85)] top-[calc(50%+0.5px)]" data-node-id="I4632:425921;314:60857;218:744781;1511:248278">
                    <p className="leading-none">diagnostic mammogram</p>
                  </div>
                </div>
                <div className="absolute h-[27px] left-0 top-[108px] w-[508px]" data-node-id="I4632:425921;314:60857;218:744781;1511:248334" data-name="list_row/complete">
                  <div className="absolute bg-[rgba(65,92,106,0.04)] inset-0" data-node-id="I4632:425921;314:60857;218:744781;1511:248335" data-name="bg" />
                  <div className="-translate-y-1/2 absolute content-stretch flex flex-col gap-[2px] items-start left-[10px] top-1/2" data-node-id="I4632:425921;314:60857;218:744781;1511:248336">
                    <div className="[word-break:break-word] flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal h-[15px] justify-center leading-[0] not-italic relative shrink-0 text-[12px] text-[rgba(0,0,0,0.65)] tracking-[0.36px] w-[137px]" data-node-id="I4632:425921;314:60857;218:744781;1511:248337" style={{ fontFeatureSettings: '"lnum" 1, "pnum" 1' }}>
                      <p className="leading-none">6 Aug 2017</p>
                    </div>
                  </div>
                  <div className="-translate-y-1/2 [word-break:break-word] absolute flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal h-[18px] justify-center leading-[0] left-[154px] not-italic right-[48px] text-[15px] text-[rgba(0,0,0,0.85)] top-[calc(50%+0.5px)]" data-node-id="I4632:425921;314:60857;218:744781;1511:248398">
                    <p className="leading-none">diagnostic ultrasonography</p>
                  </div>
                </div>
                <div className="absolute h-[19px] left-0 top-[135px] w-[508px]" data-node-id="I4632:425921;314:60857;218:744781;1511:248454" data-name="more">
                  <div className="absolute content-stretch flex gap-[9px] items-center left-[10px] overflow-clip top-0" data-node-id="I4632:425921;314:60857;218:744781;1511:248455">
                    <p className="[word-break:break-word] font-[family-name:'Source_Sans_Pro'] font-normal leading-none not-italic relative shrink-0 text-[15px] text-[rgba(0,0,0,0.65)] whitespace-nowrap" data-node-id="I4632:425921;314:60857;218:744781;1511:248456">
                      1 more imaging
                    </p>
                    <div className="relative shrink-0 size-[16px]" data-node-id="I4632:425921;314:60857;218:744781;1511:248457" data-name="expander/closed">
                      <Image unoptimized width={16} height={16}  alt="" className="absolute block inset-0 max-w-none size-full" src={imgExpanderClosed} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="h-[157px] relative shrink-0 w-full" data-node-id="I4632:425921;314:60857;218:744781;1511:248460" data-name="labs">
              <div className="absolute h-[15px] left-0 right-0 top-0" data-node-id="I4632:425921;314:60857;218:744781;1511:248461" data-name="expanding_section_title">
                <div className="absolute inset-[0_14px_0_0] overflow-clip" data-node-id="I4632:425921;314:60857;218:744781;1511:248462" data-name="section_title">
                  <div className="absolute content-stretch flex gap-[8px] items-center left-[10px] overflow-clip top-0" data-node-id="I4632:425921;314:60857;218:744781;1511:248463" data-name="section_title">
                    <p className="[word-break:break-word] font-[family-name:'Source_Sans_Pro'] font-normal leading-[normal] not-italic relative shrink-0 text-[12px] text-[rgba(0,0,0,0.65)] tracking-[1.2px] uppercase whitespace-nowrap" data-node-id="I4632:425921;314:60857;218:744781;1511:248464" style={{ fontFeatureSettings: '"lnum" 1, "pnum" 1' }}>
                      Labs
                    </p>
                    <div className="h-0 relative shrink-0 w-[523px]" data-node-id="I4632:425921;314:60857;218:744781;1511:248465" data-name="border-top">
                      <div className="absolute inset-[-0.5px_0]">
                        <Image unoptimized width={523} height={1}  alt="" className="block max-w-none size-full" src={imgBorderTop} />
                      </div>
                    </div>
                  </div>
                  <div className="-translate-y-1/2 absolute h-0 left-0 top-1/2 w-[5px]" data-node-id="I4632:425921;314:60857;218:744781;1511:248466" data-name="border-top">
                    <div className="absolute inset-[-0.5px_0]">
                      <Image unoptimized width={5} height={1}  alt="" className="block max-w-none size-full" src={imgBorderTop1} />
                    </div>
                  </div>
                </div>
                <div className="-translate-y-1/2 absolute right-[-3px] size-[16px] top-[calc(50%+0.5px)]" data-node-id="I4632:425921;314:60857;218:744781;1511:248467" data-name="expander/open">
                  <Image unoptimized width={16} height={16}  alt="" className="absolute block inset-0 max-w-none size-full" src={imgExpanderOpen2} />
                </div>
              </div>
              <div className="absolute h-[127px] left-0 overflow-clip right-0 top-[30px]" data-node-id="I4632:425921;314:60857;218:744781;1511:248470">
                <div className="absolute h-[27px] left-0 top-0 w-[508px]" data-node-id="I4632:425921;314:60857;218:744781;1511:248471" data-name="list_row/complete">
                  <div className="absolute bg-[rgba(65,92,106,0.04)] inset-0" data-node-id="I4632:425921;314:60857;218:744781;1511:248472" data-name="bg" />
                  <div className="-translate-y-1/2 absolute content-stretch flex flex-col gap-[2px] items-start left-[10px] top-1/2" data-node-id="I4632:425921;314:60857;218:744781;1511:248473">
                    <div className="[word-break:break-word] flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal h-[15px] justify-center leading-[0] not-italic relative shrink-0 text-[12px] text-[rgba(0,0,0,0.65)] tracking-[0.36px] w-[137px]" data-node-id="I4632:425921;314:60857;218:744781;1511:248474" style={{ fontFeatureSettings: '"lnum" 1, "pnum" 1' }}>
                      <p className="leading-none">Hemoglobin</p>
                    </div>
                  </div>
                  <div className="-translate-y-1/2 [word-break:break-word] absolute flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal h-[18px] justify-center leading-[0] left-[154px] not-italic right-[48px] text-[0px] text-[rgba(0,0,0,0.85)] top-[calc(50%+0.5px)]" data-node-id="I4632:425921;314:60857;218:744781;1511:248535">
                    <p>
                      <span className="leading-none text-[15px]">{`14.8 `}</span>
                      <span className="[word-break:break-word] font-[family-name:'Source_Sans_Pro'] font-normal leading-none not-italic text-[12px] tracking-[0.36px]" style={{ fontFeatureSettings: '"lnum" 1, "pnum" 1' }}>
                        %
                      </span>
                    </p>
                  </div>
                </div>
                <div className="absolute h-[27px] left-0 top-[27px] w-[508px]" data-node-id="I4632:425921;314:60857;218:744781;1511:248591" data-name="list_row/complete">
                  <div className="-translate-y-1/2 absolute content-stretch flex flex-col gap-[2px] items-start left-[10px] top-1/2" data-node-id="I4632:425921;314:60857;218:744781;1511:248593">
                    <div className="[word-break:break-word] flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal h-[15px] justify-center leading-[0] not-italic relative shrink-0 text-[12px] text-[rgba(0,0,0,0.65)] tracking-[0.36px] w-[137px]" data-node-id="I4632:425921;314:60857;218:744781;1511:248594" style={{ fontFeatureSettings: '"lnum" 1, "pnum" 1' }}>
                      <p className="leading-none">Neutrophil</p>
                    </div>
                  </div>
                  <div className="-translate-y-1/2 [word-break:break-word] absolute flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal h-[18px] justify-center leading-[0] left-[154px] not-italic right-[48px] text-[0px] text-[rgba(0,0,0,0.85)] top-[calc(50%+0.5px)]" data-node-id="I4632:425921;314:60857;218:744781;1511:248655">
                    <p>
                      <span className="leading-none text-[15px]">4.2 10+9</span>
                      <span className="[word-break:break-word] font-[family-name:'Source_Sans_Pro'] font-normal leading-none not-italic text-[12px] tracking-[0.36px]" style={{ fontFeatureSettings: '"lnum" 1, "pnum" 1' }}>
                        /L
                      </span>
                    </p>
                  </div>
                </div>
                <div className="absolute h-[27px] left-0 top-[54px] w-[508px]" data-node-id="I4632:425921;314:60857;218:744781;1511:248711" data-name="list_row/complete">
                  <div className="absolute bg-[rgba(65,92,106,0.04)] inset-0" data-node-id="I4632:425921;314:60857;218:744781;1511:248712" data-name="bg" />
                  <div className="-translate-y-1/2 absolute content-stretch flex flex-col gap-[2px] items-start left-[10px] top-1/2" data-node-id="I4632:425921;314:60857;218:744781;1511:248713">
                    <div className="[word-break:break-word] flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal h-[15px] justify-center leading-[0] not-italic relative shrink-0 text-[12px] text-[rgba(0,0,0,0.65)] tracking-[0.36px] w-[137px]" data-node-id="I4632:425921;314:60857;218:744781;1511:248714" style={{ fontFeatureSettings: '"lnum" 1, "pnum" 1' }}>
                      <p className="leading-none">Platelet count</p>
                    </div>
                  </div>
                  <div className="-translate-y-1/2 [word-break:break-word] absolute flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal h-[18px] justify-center leading-[0] left-[154px] not-italic right-[48px] text-[0px] text-[rgba(0,0,0,0.85)] top-[calc(50%+0.5px)]" data-node-id="I4632:425921;314:60857;218:744781;1511:248775">
                    <p>
                      <span className="leading-none text-[15px]">210 10+9</span>
                      <span className="[word-break:break-word] font-[family-name:'Source_Sans_Pro'] font-normal leading-none not-italic text-[12px] tracking-[0.36px]" style={{ fontFeatureSettings: '"lnum" 1, "pnum" 1' }}>
                        /L
                      </span>
                    </p>
                  </div>
                </div>
                <div className="absolute h-[27px] left-0 top-[81px] w-[508px]" data-node-id="I4632:425921;314:60857;218:744781;1511:248831" data-name="list_row/complete">
                  <div className="-translate-y-1/2 absolute content-stretch flex flex-col gap-[2px] items-start left-[10px] top-1/2" data-node-id="I4632:425921;314:60857;218:744781;1511:248833">
                    <div className="[word-break:break-word] flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal h-[15px] justify-center leading-[0] not-italic relative shrink-0 text-[12px] text-[rgba(0,0,0,0.65)] tracking-[0.36px] w-[137px]" data-node-id="I4632:425921;314:60857;218:744781;1511:248834" style={{ fontFeatureSettings: '"lnum" 1, "pnum" 1' }}>
                      <p className="leading-none">White blood cell</p>
                    </div>
                  </div>
                  <div className="-translate-y-1/2 [word-break:break-word] absolute flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal h-[18px] justify-center leading-[0] left-[154px] not-italic right-[48px] text-[0px] text-[rgba(0,0,0,0.85)] top-[calc(50%+0.5px)]" data-node-id="I4632:425921;314:60857;218:744781;1511:248895">
                    <p>
                      <span className="leading-none text-[15px]">610+9</span>
                      <span className="[word-break:break-word] font-[family-name:'Source_Sans_Pro'] font-normal leading-none not-italic text-[12px] tracking-[0.36px]" style={{ fontFeatureSettings: '"lnum" 1, "pnum" 1' }}>
                        /L
                      </span>
                    </p>
                  </div>
                </div>
                <div className="absolute h-[19px] left-0 top-[108px] w-[508px]" data-node-id="I4632:425921;314:60857;218:744781;1511:248951" data-name="more">
                  <div className="absolute content-stretch flex gap-[9px] items-center left-[10px] overflow-clip top-0" data-node-id="I4632:425921;314:60857;218:744781;1511:248952">
                    <p className="[word-break:break-word] font-[family-name:'Source_Sans_Pro'] font-normal leading-none not-italic relative shrink-0 text-[15px] text-[rgba(0,0,0,0.65)] whitespace-nowrap" data-node-id="I4632:425921;314:60857;218:744781;1511:248953">
                      4 more labs
                    </p>
                    <div className="relative shrink-0 size-[16px]" data-node-id="I4632:425921;314:60857;218:744781;1511:248954" data-name="expander/closed">
                      <Image unoptimized width={16} height={16}  alt="" className="absolute block inset-0 max-w-none size-full" src={imgExpanderClosed} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="h-[203px] relative shrink-0 w-full" data-node-id="I4632:425921;314:60857;218:744781;1511:248957" data-name="Biomarkers">
              <div className="absolute h-[15px] left-0 right-0 top-0" data-node-id="I4632:425921;314:60857;218:744781;1511:248958" data-name="expanding_section_title">
                <div className="absolute inset-[0_14px_0_0] overflow-clip" data-node-id="I4632:425921;314:60857;218:744781;1511:248959" data-name="section_title">
                  <div className="absolute content-stretch flex gap-[8px] items-center left-[10px] overflow-clip top-0" data-node-id="I4632:425921;314:60857;218:744781;1511:248960" data-name="section_title">
                    <p className="[word-break:break-word] font-[family-name:'Source_Sans_Pro'] font-normal leading-[normal] not-italic relative shrink-0 text-[12px] text-[rgba(0,0,0,0.65)] tracking-[1.2px] uppercase whitespace-nowrap" data-node-id="I4632:425921;314:60857;218:744781;1511:248961" style={{ fontFeatureSettings: '"lnum" 1, "pnum" 1' }}>
                      Biomarkers
                    </p>
                    <div className="h-0 relative shrink-0 w-[523px]" data-node-id="I4632:425921;314:60857;218:744781;1511:248962" data-name="border-top">
                      <div className="absolute inset-[-0.5px_0]">
                        <Image unoptimized width={523} height={1}  alt="" className="block max-w-none size-full" src={imgBorderTop} />
                      </div>
                    </div>
                  </div>
                  <div className="-translate-y-1/2 absolute h-0 left-0 top-1/2 w-[5px]" data-node-id="I4632:425921;314:60857;218:744781;1511:248963" data-name="border-top">
                    <div className="absolute inset-[-0.5px_0]">
                      <Image unoptimized width={5} height={1}  alt="" className="block max-w-none size-full" src={imgBorderTop1} />
                    </div>
                  </div>
                </div>
                <div className="-translate-y-1/2 absolute right-[-3px] size-[16px] top-[calc(50%+0.5px)]" data-node-id="I4632:425921;314:60857;218:744781;1511:248964" data-name="expander/open">
                  <Image unoptimized width={16} height={16}  alt="" className="absolute block inset-0 max-w-none size-full" src={imgExpanderOpen2} />
                </div>
              </div>
              <div className="absolute h-[106px] left-0 right-0 top-[30px]" data-node-id="I4632:425921;314:60857;218:744781;1511:248967">
                <p className="[word-break:break-word] absolute font-[family-name:'Source_Sans_Pro'] font-semibold h-[15px] leading-[normal] left-[10px] not-italic text-[12px] text-[rgba(0,0,0,0.65)] top-0 tracking-[0.36px] w-[302.574px]" data-node-id="I4632:425921;314:60857;218:744781;1511:248968" style={{ fontFeatureSettings: '"lnum" 1, "pnum" 1' }}>
                  Tumor biomarkers
                </p>
                <div className="absolute h-[81px] left-0 overflow-clip right-0 top-[25px]" data-node-id="I4632:425921;314:60857;218:744781;1511:248969">
                  <div className="absolute h-[27px] left-0 top-0 w-[508px]" data-node-id="I4632:425921;314:60857;218:744781;1511:248970" data-name="list_row/complete">
                    <div className="absolute bg-[rgba(65,92,106,0.04)] inset-0" data-node-id="I4632:425921;314:60857;218:744781;1511:248971" data-name="bg" />
                    <div className="-translate-y-1/2 absolute content-stretch flex flex-col gap-[2px] items-start left-[10px] top-1/2" data-node-id="I4632:425921;314:60857;218:744781;1511:248972">
                      <div className="[word-break:break-word] flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal h-[15px] justify-center leading-[0] not-italic relative shrink-0 text-[12px] text-[rgba(0,0,0,0.65)] tracking-[0.36px] w-[137px]" data-node-id="I4632:425921;314:60857;218:744781;1511:248973" style={{ fontFeatureSettings: '"lnum" 1, "pnum" 1' }}>
                        <p className="leading-none">Estrogen receptor</p>
                      </div>
                    </div>
                    <div className="-translate-y-1/2 [word-break:break-word] absolute flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal h-[18px] justify-center leading-[0] left-[154px] not-italic right-[48px] text-[15px] text-[rgba(0,0,0,0.85)] top-[calc(50%+0.5px)]" data-node-id="I4632:425921;314:60857;218:744781;1511:249034">
                      <p className="leading-none">positive</p>
                    </div>
                  </div>
                  <div className="absolute h-[27px] left-0 top-[27px] w-[508px]" data-node-id="I4632:425921;314:60857;218:744781;1511:249090" data-name="list_row/complete">
                    <div className="-translate-y-1/2 absolute content-stretch flex flex-col gap-[2px] items-start left-[10px] top-1/2" data-node-id="I4632:425921;314:60857;218:744781;1511:249092">
                      <div className="[word-break:break-word] flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal h-[15px] justify-center leading-[0] not-italic relative shrink-0 text-[12px] text-[rgba(0,0,0,0.65)] tracking-[0.36px] w-[137px]" data-node-id="I4632:425921;314:60857;218:744781;1511:249093" style={{ fontFeatureSettings: '"lnum" 1, "pnum" 1' }}>
                        <p className="leading-none">Progesterone Receptor</p>
                      </div>
                    </div>
                    <div className="-translate-y-1/2 [word-break:break-word] absolute flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal h-[18px] justify-center leading-[0] left-[154px] not-italic right-[48px] text-[15px] text-[rgba(0,0,0,0.85)] top-[calc(50%+0.5px)]" data-node-id="I4632:425921;314:60857;218:744781;1511:249154">
                      <p className="leading-none">positive</p>
                    </div>
                  </div>
                  <div className="absolute h-[27px] left-0 top-[54px] w-[508px]" data-node-id="I4632:425921;314:60857;218:744781;1511:249210" data-name="list_row/complete">
                    <div className="absolute bg-[rgba(65,92,106,0.04)] inset-0" data-node-id="I4632:425921;314:60857;218:744781;1511:249211" data-name="bg" />
                    <div className="-translate-y-1/2 absolute content-stretch flex flex-col gap-[2px] items-start left-[10px] top-1/2" data-node-id="I4632:425921;314:60857;218:744781;1511:249212">
                      <div className="[word-break:break-word] flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal h-[15px] justify-center leading-[0] not-italic relative shrink-0 text-[12px] text-[rgba(0,0,0,0.65)] tracking-[0.36px] w-[137px]" data-node-id="I4632:425921;314:60857;218:744781;1511:249213" style={{ fontFeatureSettings: '"lnum" 1, "pnum" 1' }}>
                        <p className="leading-none">HER2 Receptor</p>
                      </div>
                    </div>
                    <div className="-translate-y-1/2 [word-break:break-word] absolute flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal h-[18px] justify-center leading-[0] left-[154px] not-italic right-[48px] text-[15px] text-[rgba(0,0,0,0.85)] top-[calc(50%+0.5px)]" data-node-id="I4632:425921;314:60857;218:744781;1511:249274">
                      <p className="leading-none">negative</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute h-[52px] left-0 right-0 top-[151px]" data-node-id="I4632:425921;314:60857;218:744781;1511:249330">
                <p className="[word-break:break-word] absolute font-[family-name:'Source_Sans_Pro'] font-semibold h-[15px] leading-[normal] left-[10px] not-italic text-[12px] text-[rgba(0,0,0,0.65)] top-0 tracking-[0.36px] w-[489.857px]" data-node-id="I4632:425921;314:60857;218:744781;1511:249331" style={{ fontFeatureSettings: '"lnum" 1, "pnum" 1' }}>
                  Germline Biomarkers
                </p>
                <div className="absolute h-[27px] left-0 overflow-clip right-0 top-[25px]" data-node-id="I4632:425921;314:60857;218:744781;1511:249332">
                  <div className="absolute h-[27px] left-0 top-0 w-[508px]" data-node-id="I4632:425921;314:60857;218:744781;1511:249333" data-name="list_row/complete">
                    <div className="absolute bg-[rgba(65,92,106,0.04)] inset-0" data-node-id="I4632:425921;314:60857;218:744781;1511:249334" data-name="bg" />
                    <div className="-translate-y-1/2 absolute content-stretch flex flex-col gap-[2px] items-start left-[10px] top-1/2" data-node-id="I4632:425921;314:60857;218:744781;1511:249335">
                      <div className="[word-break:break-word] flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal h-[15px] justify-center leading-[0] not-italic relative shrink-0 text-[12px] text-[rgba(0,0,0,0.65)] tracking-[0.36px] w-[137px]" data-node-id="I4632:425921;314:60857;218:744781;1511:249336" style={{ fontFeatureSettings: '"lnum" 1, "pnum" 1' }}>
                        <p className="leading-none">BRCA1/2</p>
                      </div>
                    </div>
                    <div className="-translate-y-1/2 [word-break:break-word] absolute flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal h-[18px] justify-center leading-[0] left-[154px] not-italic right-[48px] text-[15px] text-[rgba(0,0,0,0.85)] top-[calc(50%+0.5px)]" data-node-id="I4632:425921;314:60857;218:744781;1511:249397">
                      <p className="leading-none">negative</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="h-[214px] relative shrink-0 w-full" data-node-id="I4632:425921;314:60857;218:744781;1511:249466" data-name="Pathology">
              <div className="absolute h-[15px] left-0 right-0 top-0" data-node-id="I4632:425921;314:60857;218:744781;1511:249467" data-name="expanding_section_title">
                <div className="absolute inset-[0_14px_0_0] overflow-clip" data-node-id="I4632:425921;314:60857;218:744781;1511:249468" data-name="section_title">
                  <div className="absolute content-stretch flex gap-[8px] items-center left-[10px] overflow-clip top-0" data-node-id="I4632:425921;314:60857;218:744781;1511:249469" data-name="section_title">
                    <p className="[word-break:break-word] font-[family-name:'Source_Sans_Pro'] font-normal leading-[normal] not-italic relative shrink-0 text-[12px] text-[rgba(0,0,0,0.65)] tracking-[1.2px] uppercase whitespace-nowrap" data-node-id="I4632:425921;314:60857;218:744781;1511:249470" style={{ fontFeatureSettings: '"lnum" 1, "pnum" 1' }}>
                      Pathology
                    </p>
                    <div className="h-0 relative shrink-0 w-[523px]" data-node-id="I4632:425921;314:60857;218:744781;1511:249471" data-name="border-top">
                      <div className="absolute inset-[-0.5px_0]">
                        <Image unoptimized width={523} height={1}  alt="" className="block max-w-none size-full" src={imgBorderTop} />
                      </div>
                    </div>
                  </div>
                  <div className="-translate-y-1/2 absolute h-0 left-0 top-1/2 w-[5px]" data-node-id="I4632:425921;314:60857;218:744781;1511:249472" data-name="border-top">
                    <div className="absolute inset-[-0.5px_0]">
                      <Image unoptimized width={5} height={1}  alt="" className="block max-w-none size-full" src={imgBorderTop1} />
                    </div>
                  </div>
                </div>
                <div className="-translate-y-1/2 absolute right-[-3px] size-[16px] top-[calc(50%+0.5px)]" data-node-id="I4632:425921;314:60857;218:744781;1511:249473" data-name="expander/open">
                  <Image unoptimized width={16} height={16}  alt="" className="absolute block inset-0 max-w-none size-full" src={imgExpanderOpen2} />
                </div>
              </div>
              <div className="absolute h-[154px] left-0 overflow-clip right-0 top-[30px]" data-node-id="I4632:425921;314:60857;218:744781;1511:249476">
                <div className="absolute h-[27px] left-0 top-0 w-[508px]" data-node-id="I4632:425921;314:60857;218:744781;1511:249477" data-name="list_row/complete">
                  <div className="absolute bg-[rgba(65,92,106,0.04)] inset-0" data-node-id="I4632:425921;314:60857;218:744781;1511:249478" data-name="bg" />
                  <div className="-translate-y-1/2 absolute content-stretch flex flex-col gap-[2px] items-start left-[10px] top-1/2" data-node-id="I4632:425921;314:60857;218:744781;1511:249479">
                    <div className="[word-break:break-word] flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal h-[15px] justify-center leading-[0] not-italic relative shrink-0 text-[12px] text-[rgba(0,0,0,0.65)] tracking-[0.36px] w-[137px]" data-node-id="I4632:425921;314:60857;218:744781;1511:249480" style={{ fontFeatureSettings: '"lnum" 1, "pnum" 1' }}>
                      <p className="leading-none">Report date</p>
                    </div>
                  </div>
                  <div className="-translate-y-1/2 [word-break:break-word] absolute flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal h-[18px] justify-center leading-[0] left-[154px] not-italic right-[48px] text-[15px] text-[rgba(0,0,0,0.85)] top-[calc(50%+0.5px)]" data-node-id="I4632:425921;314:60857;218:744781;1511:249541">
                    <p className="leading-none">29 May 2020</p>
                  </div>
                </div>
                <div className="absolute h-[27px] left-0 top-[27px] w-[508px]" data-node-id="I4632:425921;314:60857;218:744781;1511:249597" data-name="list_row/complete">
                  <div className="-translate-y-1/2 absolute content-stretch flex flex-col gap-[2px] items-start left-[10px] top-1/2" data-node-id="I4632:425921;314:60857;218:744781;1511:249599">
                    <div className="[word-break:break-word] flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal h-[15px] justify-center leading-[0] not-italic relative shrink-0 text-[12px] text-[rgba(0,0,0,0.65)] tracking-[0.36px] w-[137px]" data-node-id="I4632:425921;314:60857;218:744781;1511:249600" style={{ fontFeatureSettings: '"lnum" 1, "pnum" 1' }}>
                      <p className="leading-none">Tumor size</p>
                    </div>
                  </div>
                  <div className="-translate-y-1/2 [word-break:break-word] absolute flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal h-[18px] justify-center leading-[0] left-[154px] not-italic right-[48px] text-[15px] text-[rgba(0,0,0,0.85)] top-[calc(50%+0.5px)]" data-node-id="I4632:425921;314:60857;218:744781;1511:249661">
                    <p className="leading-none whitespace-pre-wrap">{`1.5 x 1.0 cm,  1.8 x 1.0 cm`}</p>
                  </div>
                </div>
                <div className="absolute h-[27px] left-0 top-[54px] w-[508px]" data-node-id="I4632:425921;314:60857;218:744781;1511:249717" data-name="list_row/complete">
                  <div className="absolute bg-[rgba(65,92,106,0.04)] inset-0" data-node-id="I4632:425921;314:60857;218:744781;1511:249718" data-name="bg" />
                  <div className="-translate-y-1/2 absolute content-stretch flex flex-col gap-[2px] items-start left-[10px] top-1/2" data-node-id="I4632:425921;314:60857;218:744781;1511:249719">
                    <div className="[word-break:break-word] flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal h-[15px] justify-center leading-[0] not-italic relative shrink-0 text-[12px] text-[rgba(0,0,0,0.65)] tracking-[0.36px] w-[137px]" data-node-id="I4632:425921;314:60857;218:744781;1511:249720" style={{ fontFeatureSettings: '"lnum" 1, "pnum" 1' }}>
                      <p className="leading-none">Tumor margins</p>
                    </div>
                  </div>
                  <div className="-translate-y-1/2 [word-break:break-word] absolute flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal h-[18px] justify-center leading-[0] left-[154px] not-italic right-[48px] text-[15px] text-[rgba(0,0,0,0.85)] top-[calc(50%+0.5px)]" data-node-id="I4632:425921;314:60857;218:744781;1511:249781">
                    <p className="leading-none">Close</p>
                  </div>
                </div>
                <div className="absolute h-[27px] left-0 top-[81px] w-[508px]" data-node-id="I4632:425921;314:60857;218:744781;1511:249837" data-name="list_row/complete">
                  <div className="-translate-y-1/2 absolute content-stretch flex flex-col gap-[2px] items-start left-[10px] top-1/2" data-node-id="I4632:425921;314:60857;218:744781;1511:249839">
                    <div className="[word-break:break-word] flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal h-[15px] justify-center leading-[0] not-italic relative shrink-0 text-[12px] text-[rgba(0,0,0,0.65)] tracking-[0.36px] w-[137px]" data-node-id="I4632:425921;314:60857;218:744781;1511:249840" style={{ fontFeatureSettings: '"lnum" 1, "pnum" 1' }}>
                      <p className="leading-none">Mitosis</p>
                    </div>
                  </div>
                  <div className="-translate-y-1/2 [word-break:break-word] absolute flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal h-[18px] justify-center leading-[0] left-[154px] not-italic right-[48px] text-[0px] text-[rgba(0,0,0,0.85)] top-[calc(50%+0.5px)]" data-node-id="I4632:425921;314:60857;218:744781;1511:249901">
                    <p>
                      <span className="leading-none text-[15px]">{`20 per 50 `}</span>
                      <span className="[word-break:break-word] font-[family-name:'Source_Sans_Pro'] font-normal leading-none not-italic text-[12px] tracking-[0.36px]" style={{ fontFeatureSettings: '"lnum" 1, "pnum" 1' }}>
                        hpf
                      </span>
                    </p>
                  </div>
                </div>
                <div className="absolute h-[46px] left-0 top-[108px] w-[508px]" data-node-id="I4632:425921;314:60857;218:744781;1511:249957" data-name="list_row/complete">
                  <div className="absolute bg-[rgba(65,92,106,0.04)] inset-0" data-node-id="I4632:425921;314:60857;218:744781;1511:249958" data-name="bg" />
                  <div className="-translate-y-1/2 absolute content-stretch flex flex-col gap-[2px] items-start left-[10px] top-[calc(50%-0.5px)]" data-node-id="I4632:425921;314:60857;218:744781;1511:249959">
                    <div className="[word-break:break-word] flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal h-[15px] justify-center leading-[0] not-italic relative shrink-0 text-[12px] text-[rgba(0,0,0,0.65)] tracking-[0.36px] w-[137px]" data-node-id="I4632:425921;314:60857;218:744781;1511:249960" style={{ fontFeatureSettings: '"lnum" 1, "pnum" 1' }}>
                      <p className="leading-none">Histological grade</p>
                    </div>
                  </div>
                  <div className="-translate-y-1/2 [word-break:break-word] absolute flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal h-[18px] justify-center leading-[0] left-[154px] not-italic right-[48px] text-[15px] text-[rgba(0,0,0,0.85)] top-1/2" data-node-id="I4632:425921;314:60857;218:744781;1511:250021">
                    <p className="leading-none">Grade 2: Intermediate grade or moderately differentiated</p>
                  </div>
                </div>
              </div>
              <div className="absolute h-[19px] left-0 right-0 top-[188.5px]" data-node-id="I4632:425921;314:60857;218:744781;1511:250077" data-name="more">
                <div className="absolute h-[16px] left-[10px] top-0 w-[136px]" data-node-id="I4632:425921;314:60857;218:744781;1511:250078">
                  <p className="[word-break:break-word] absolute font-[family-name:'Source_Sans_Pro'] font-normal leading-none left-0 not-italic text-[15px] text-[rgba(0,0,0,0.65)] top-[0.5px] whitespace-nowrap" data-node-id="I4632:425921;314:60857;218:744781;1511:250079">
                    2 more pathology
                  </p>
                  <div className="absolute left-[120px] size-[16px] top-0" data-node-id="I4632:425921;314:60857;218:744781;1511:250080" data-name="expander/closed">
                    <Image unoptimized width={16} height={16}  alt="" className="absolute block inset-0 max-w-none size-full" src={imgExpanderClosed1} />
                  </div>
                </div>
              </div>
            </div>
            <div className="h-[288px] relative shrink-0 w-full" data-node-id="I4632:425921;314:60857;218:744781;1511:250083" data-name="Toxicities">
              <div className="absolute h-[15px] left-0 right-0 top-0" data-node-id="I4632:425921;314:60857;218:744781;1511:250084" data-name="expanding_section_title">
                <div className="absolute inset-[0_14px_0_0] overflow-clip" data-node-id="I4632:425921;314:60857;218:744781;1511:250085" data-name="section_title">
                  <div className="absolute content-stretch flex gap-[8px] items-center left-[10px] overflow-clip top-0" data-node-id="I4632:425921;314:60857;218:744781;1511:250086" data-name="section_title">
                    <p className="[word-break:break-word] font-[family-name:'Source_Sans_Pro'] font-normal leading-[normal] not-italic relative shrink-0 text-[12px] text-[rgba(0,0,0,0.65)] tracking-[1.2px] uppercase whitespace-nowrap" data-node-id="I4632:425921;314:60857;218:744781;1511:250087" style={{ fontFeatureSettings: '"lnum" 1, "pnum" 1' }}>
                      Toxicities
                    </p>
                    <div className="h-0 relative shrink-0 w-[523px]" data-node-id="I4632:425921;314:60857;218:744781;1511:250088" data-name="border-top">
                      <div className="absolute inset-[-0.5px_0]">
                        <Image unoptimized width={523} height={1}  alt="" className="block max-w-none size-full" src={imgBorderTop} />
                      </div>
                    </div>
                  </div>
                  <div className="-translate-y-1/2 absolute h-0 left-0 top-1/2 w-[5px]" data-node-id="I4632:425921;314:60857;218:744781;1511:250089" data-name="border-top">
                    <div className="absolute inset-[-0.5px_0]">
                      <Image unoptimized width={5} height={1}  alt="" className="block max-w-none size-full" src={imgBorderTop1} />
                    </div>
                  </div>
                </div>
                <div className="-translate-y-1/2 absolute right-[-3px] size-[16px] top-[calc(50%+0.5px)]" data-node-id="I4632:425921;314:60857;218:744781;1511:250090" data-name="expander/open">
                  <Image unoptimized width={16} height={16}  alt="" className="absolute block inset-0 max-w-none size-full" src={imgExpanderOpen2} />
                </div>
              </div>
              <div className="absolute h-[167px] left-0 right-0 top-[30px]" data-node-id="I4632:425921;314:60857;218:744781;1511:250093">
                <p className="[word-break:break-word] absolute font-[family-name:'Source_Sans_Pro'] font-semibold h-[15px] leading-[normal] left-[9px] not-italic text-[12px] text-[rgba(0,0,0,0.65)] top-0 tracking-[0.36px] w-[198px]" data-node-id="I4632:425921;314:60857;218:744781;1511:250094" style={{ fontFeatureSettings: '"lnum" 1, "pnum" 1' }}>
                  Key toxicities
                </p>
                <div className="absolute h-[142px] left-0 overflow-clip top-[25px] w-[508px]" data-node-id="I4632:425921;314:60857;218:744781;1511:250095">
                  <div className="absolute h-[42px] left-0 top-0 w-[508px]" data-node-id="I4632:425921;314:60857;218:744781;1511:250096" data-name="list_row/complete">
                    <div className="absolute bg-[rgba(65,92,106,0.04)] inset-0" data-node-id="I4632:425921;314:60857;218:744781;1511:250097" data-name="bg" />
                    <div className="-translate-y-1/2 absolute content-stretch flex flex-col gap-[2px] items-start left-[10px] top-[calc(50%-0.5px)]" data-node-id="I4632:425921;314:60857;218:744781;1511:250098">
                      <div className="[word-break:break-word] flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal h-[15px] justify-center leading-[0] not-italic relative shrink-0 text-[12px] text-[rgba(0,0,0,0.65)] tracking-[0.36px] w-[137px]" data-node-id="I4632:425921;314:60857;218:744781;1511:250099" style={{ fontFeatureSettings: '"lnum" 1, "pnum" 1' }}>
                        <p className="leading-none">Peripheral motor neuropathy</p>
                      </div>
                    </div>
                    <p className="[word-break:break-word] absolute font-[family-name:'Source_Sans_Pro'] font-normal h-[18px] leading-none left-[154px] not-italic right-[48px] text-[15px] text-[rgba(0,0,0,0.85)] top-[calc(50%-9px)]" data-node-id="I4632:425921;314:60857;218:744781;1511:250160">
                      Grade 3
                    </p>
                  </div>
                  <div className="absolute h-[27px] left-0 top-[42px] w-[508px]" data-node-id="I4632:425921;314:60857;218:744781;1511:250216" data-name="list_row/complete">
                    <div className="-translate-y-1/2 absolute content-stretch flex flex-col gap-[2px] items-start left-[10px] top-1/2" data-node-id="I4632:425921;314:60857;218:744781;1511:250218">
                      <div className="[word-break:break-word] flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal h-[15px] justify-center leading-[0] not-italic relative shrink-0 text-[12px] text-[rgba(0,0,0,0.65)] tracking-[0.36px] w-[137px]" data-node-id="I4632:425921;314:60857;218:744781;1511:250219" style={{ fontFeatureSettings: '"lnum" 1, "pnum" 1' }}>
                        <p className="leading-none">Blood clots</p>
                      </div>
                    </div>
                    <div className="-translate-y-1/2 [word-break:break-word] absolute flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal h-[18px] justify-center leading-[0] left-[154px] not-italic right-[48px] text-[15px] text-[rgba(0,0,0,0.65)] top-[calc(50%+0.5px)]" data-node-id="I4632:425921;314:60857;218:744781;1511:250280">
                      <p className="leading-none">none</p>
                    </div>
                  </div>
                  <div className="absolute h-[27px] left-0 top-[69px] w-[508px]" data-node-id="I4632:425921;314:60857;218:744781;1511:250336" data-name="list_row/complete">
                    <div className="absolute bg-[rgba(65,92,106,0.04)] inset-0" data-node-id="I4632:425921;314:60857;218:744781;1511:250337" data-name="bg" />
                    <div className="-translate-y-1/2 absolute content-stretch flex flex-col gap-[2px] items-start left-[10px] top-1/2" data-node-id="I4632:425921;314:60857;218:744781;1511:250338">
                      <div className="[word-break:break-word] flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal h-[15px] justify-center leading-[0] not-italic relative shrink-0 text-[12px] text-[rgba(0,0,0,0.65)] tracking-[0.36px] w-[137px]" data-node-id="I4632:425921;314:60857;218:744781;1511:250339" style={{ fontFeatureSettings: '"lnum" 1, "pnum" 1' }}>
                        <p className="leading-none">Neutropenia</p>
                      </div>
                    </div>
                    <div className="-translate-y-1/2 [word-break:break-word] absolute flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal h-[18px] justify-center leading-[0] left-[154px] not-italic right-[48px] text-[15px] text-[rgba(0,0,0,0.65)] top-[calc(50%+0.5px)]" data-node-id="I4632:425921;314:60857;218:744781;1511:250400">
                      <p className="leading-none">none</p>
                    </div>
                  </div>
                  <div className="absolute h-[27px] left-0 top-[96px] w-[508px]" data-node-id="I4632:425921;314:60857;218:744781;1511:250456" data-name="list_row/complete">
                    <div className="-translate-y-1/2 absolute content-stretch flex flex-col gap-[2px] items-start left-[10px] top-1/2" data-node-id="I4632:425921;314:60857;218:744781;1511:250458">
                      <div className="[word-break:break-word] flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal h-[15px] justify-center leading-[0] not-italic relative shrink-0 text-[12px] text-[rgba(0,0,0,0.65)] tracking-[0.36px] w-[137px]" data-node-id="I4632:425921;314:60857;218:744781;1511:250459" style={{ fontFeatureSettings: '"lnum" 1, "pnum" 1' }}>
                        <p className="leading-none">Nausea/vomiting</p>
                      </div>
                    </div>
                    <div className="-translate-y-1/2 [word-break:break-word] absolute flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal h-[18px] justify-center leading-[0] left-[154px] not-italic right-[48px] text-[15px] text-[rgba(0,0,0,0.85)] top-[calc(50%+0.5px)]" data-node-id="I4632:425921;314:60857;218:744781;1511:250520">
                      <p className="leading-none">some</p>
                    </div>
                  </div>
                  <div className="absolute h-[19px] left-0 top-[123px] w-[508px]" data-node-id="I4632:425921;314:60857;218:744781;1511:250576" data-name="more">
                    <div className="absolute content-stretch flex gap-[9px] items-center left-[10px] overflow-clip top-0" data-node-id="I4632:425921;314:60857;218:744781;1511:250577">
                      <p className="[word-break:break-word] font-[family-name:'Source_Sans_Pro'] font-normal leading-none not-italic relative shrink-0 text-[15px] text-[rgba(0,0,0,0.65)] whitespace-nowrap" data-node-id="I4632:425921;314:60857;218:744781;1511:250578">
                        2 more toxicities
                      </p>
                      <div className="relative shrink-0 size-[16px]" data-node-id="I4632:425921;314:60857;218:744781;1511:250579" data-name="expander/closed">
                        <Image unoptimized width={16} height={16}  alt="" className="absolute block inset-0 max-w-none size-full" src={imgExpanderClosed} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute h-[67px] left-0 right-0 top-[212px]" data-node-id="I4632:425921;314:60857;218:744781;1511:250582">
                <p className="[word-break:break-word] absolute font-[family-name:'Source_Sans_Pro'] font-semibold h-[15px] leading-[normal] left-[9px] not-italic text-[12px] text-[rgba(0,0,0,0.65)] top-0 tracking-[0.36px] w-[198px]" data-node-id="I4632:425921;314:60857;218:744781;1511:250583" style={{ fontFeatureSettings: '"lnum" 1, "pnum" 1' }}>
                  Allergies
                </p>
                <div className="absolute content-stretch flex flex-col items-center left-0 overflow-clip top-[25px] w-[508px]" data-node-id="I4632:425921;314:60857;218:744781;1511:250584">
                  <div className="h-[42px] relative shrink-0 w-[502px]" data-node-id="I4632:425921;314:60857;218:744781;1511:250585" data-name="list_row/complete">
                    <div className="absolute bg-[rgba(65,92,106,0.04)] inset-0" data-node-id="I4632:425921;314:60857;218:744781;1511:250586" data-name="bg" />
                    <div className="-translate-y-1/2 absolute content-stretch flex flex-col gap-[2px] items-start left-[10px] top-[calc(50%-0.5px)]" data-node-id="I4632:425921;314:60857;218:744781;1511:250587">
                      <div className="[word-break:break-word] flex flex-col font-[family-name:'Source_Sans_Pro'] font-normal h-[15px] justify-center leading-[0] not-italic relative shrink-0 text-[12px] text-[rgba(0,0,0,0.65)] tracking-[0.36px] w-[137px]" data-node-id="I4632:425921;314:60857;218:744781;1511:250588" style={{ fontFeatureSettings: '"lnum" 1, "pnum" 1' }}>
                        <p className="leading-none">none</p>
                      </div>
                    </div>
                    <p className="[word-break:break-word] absolute font-[family-name:'Source_Sans_Pro'] font-normal h-[18px] leading-none left-[154px] not-italic right-[48px] text-[15px] text-[rgba(0,0,0,0.85)] top-[calc(50%-9px)]" data-node-id="I4632:425921;314:60857;218:744781;1511:250649">{` `}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <ConditionHeader className="absolute bg-white h-[40px] left-0 right-0 top-0" />
          <div className="absolute bg-gradient-to-t bottom-0 from-[2.222%] from-white h-[20px] left-0 right-0 to-[rgba(255,255,255,0)]" data-node-id="I4632:425921;314:60857;85:27683" data-name="bottom fade out" />
          <div className="absolute bg-gradient-to-t from-[rgba(255,255,255,0)] h-[15px] left-0 right-0 to-white top-[40px]" data-node-id="I4632:425921;314:60857;335:55847" data-name="top fade out" />
        </div>
      </div>
      <button className="absolute block cursor-pointer h-[22px] right-[21px] top-[13px] w-[37px]" data-node-id="I4632:425921;314:60857;64:43356" data-name="content-toggle/record">
        <Image unoptimized width={37} height={22}  alt="" className="absolute block inset-0 max-w-none size-full" src={imgContentToggleRecord} />
      </button>
    </div>
  );
}
