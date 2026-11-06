// Faithful Figma reconstruction; see docs/reviews/human-figma-source-map.md.
import Image from 'next/image'

const imgSize12Px = '/design-lab/human/assets/b47686de-f3a6-4cd8-bc9c-6ccb589a3195.svg';
const imgGroup2859106 = '/design-lab/human/assets/51cc02b9-05e9-4408-87ba-e81db8ef3a4c.svg';
const imgIconCaret = '/design-lab/human/assets/c3d996db-64f7-43ff-a68d-a7e3be2a4cc3.svg';

type IconFilterProps = {
  className?: string;
  size?: "12px";
};

function IconFilter({ className, size = "12px" }: IconFilterProps) {
  return (
    <div className={className || "relative size-[16px]"} data-node-id="2311:15845">
      <Image unoptimized width={16} height={16}  alt="" className="absolute block inset-0 max-w-none size-full" src={imgSize12Px} />
    </div>
  );
}

type IconCustomizeProps = {
  className?: string;
  size?: "12px";
};

function IconCustomize({ className, size = "12px" }: IconCustomizeProps) {
  return (
    <div className={className || "content-stretch flex items-center justify-center relative rounded-[var(--prototype-radius-radius-minimal,2px)] size-[var(--prototype-spacing-spacing-m,16px)]"} data-node-id="2311:15839">
      <div className="relative shrink-0 size-[12px]" data-node-id="2311:15840">
        <div className="absolute inset-[-4.17%]">
          <Image unoptimized width={13} height={13}  alt="" className="block max-w-none size-full" src={imgGroup2859106} />
        </div>
      </div>
    </div>
  );
}

type IconToolProps = {
  className?: string;
  property1?: "12px";
};

function IconTool({ className, property1 = "12px" }: IconToolProps) {
  return (
    <div className={className || "content-stretch flex gap-[var(--prototype-spacing-spacing-none,0px)] items-center justify-center p-[var(--prototype-spacing-spacing-none,0px)] relative size-[var(--prototype-spacing-spacing-m,16px)]"} data-node-id="2311:15803">
      <div className="grid-cols-[max-content] grid-rows-[max-content] inline-grid leading-[0] place-items-start relative shrink-0" data-node-id="2311:15804">
        <div className="border border-[var(--prototype-icon-icon-secondary,#637575)] border-solid col-1 ml-0 mt-0 relative rounded-[1px] row-1 size-[4.5px]" data-node-id="2311:15805" />
        <div className="border border-[var(--prototype-icon-icon-secondary,#637575)] border-solid col-1 ml-0 mt-[7.5px] relative rounded-[1px] row-1 size-[4.5px]" data-node-id="2311:15806" />
        <div className="border border-[var(--prototype-icon-icon-secondary,#637575)] border-solid col-1 ml-[7.5px] mt-[7.5px] relative rounded-[1px] row-1 size-[4.5px]" data-node-id="2311:15807" />
        <div className="border border-[var(--prototype-icon-icon-secondary,#637575)] border-solid col-1 ml-[7.5px] mt-0 relative rounded-[1px] row-1 size-[4.5px]" data-node-id="2311:15808" />
      </div>
    </div>
  );
}

export function FlowTitle() {
  return (
    <div className="content-stretch flex items-end justify-between px-[var(--prototype-spacing-xl,32px)] py-[var(--prototype-spacing-spacing-m,16px)] relative size-full" data-node-id="2375:11776" data-name="Title">
      <div className="content-stretch flex gap-[var(--prototype-spacing-spacing-l,24px)] items-center relative shrink-0" data-node-id="I2375:11776;15825:44688" data-name="select">
        <div className="content-stretch flex flex-col gap-[var(--prototype-spacing-spacing-s,8px)] items-start relative shrink-0 w-[480px]" data-node-id="I2375:11776;16047:216169" data-name="job">
          <div className="[word-break:break-word] flex flex-col font-[family-name:var(--prototype-typeface-family-title,'Roboto')] font-normal justify-center leading-[0] relative shrink-0 text-[color:var(--prototype-text-tertiary,#7dd4d4)] text-[length:var(--prototype-typeface-weight-small,12px)] w-[216.919px]" data-node-id="I2375:11776;16047:216170" style={{ fontVariationSettings: '"wdth" 100' }}>
            <p className="leading-[var(--prototype-8px-system-2,16px)]">Ext. Job</p>
          </div>
          <div className="border-[var(--prototype-stroke-strong,#5a7878)] border-b border-solid content-stretch flex gap-[var(--prototype-spacing-spacing-m,16px)] items-center relative shrink-0 w-full" data-node-id="I2375:11776;16047:216171">
            <p className="[word-break:break-word] capitalize font-[family-name:var(--prototype-typeface-family-title,'Roboto')] font-medium leading-[var(--prototype-8px-system-3,24px)] relative shrink-0 text-[color:var(--prototype-text-primary,#f2fcfc)] text-[length:var(--prototype-typeface-weight-big,16px)] w-[448px]" data-node-id="I2375:11776;16047:216172" style={{ fontVariationSettings: '"wdth" 100' }}>
              Sample research tracking
            </p>
            <div className="flex flex-row items-center self-stretch" data-node-id="I2375:11776;16047:216173">
              <div className="h-full relative shrink-0 w-[16px]" data-name="icon/caret">
                <Image unoptimized width={16} height={24}  alt="" className="absolute block inset-0 max-w-none size-full" src={imgIconCaret} />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="content-stretch flex gap-[var(--prototype-spacing-spacing-s,8px)] items-center py-[var(--prototype-spacing-spacing-s,8px)] relative shrink-0" data-node-id="I2375:11776;15735:96055" data-name="icons">
        <div className="content-stretch flex items-center justify-center relative rounded-[var(--prototype-radius-radius-minimal,2px)] shrink-0" data-node-id="I2375:11776;15735:96056" data-name="button/icon">
          <IconTool className="relative shrink-0 size-[16px]" />
        </div>
        <div className="content-stretch flex items-center justify-center relative rounded-[var(--prototype-radius-radius-minimal,2px)] shrink-0" data-node-id="I2375:11776;15825:44781" data-name="button/icon">
          <IconCustomize className="relative shrink-0 size-[16px]" />
        </div>
        <div className="content-stretch flex items-center justify-center relative rounded-[var(--prototype-radius-radius-minimal,2px)] shrink-0" data-node-id="I2375:11776;15735:96057" data-name="button/icon">
          <IconFilter className="relative shrink-0 size-[16px]" />
        </div>
      </div>
    </div>
  );
}
