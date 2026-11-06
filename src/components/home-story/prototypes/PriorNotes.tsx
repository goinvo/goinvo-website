// Faithful Figma reconstruction; see docs/reviews/human-figma-source-map.md.
import Image from 'next/image'

const imgRectangle472 = '/design-lab/human/assets/8bb1b1f8-799d-4a2d-bffc-af1ac52e41f7.svg';
const imgRectangle473 = '/design-lab/human/assets/aff9c503-bc30-49a4-9697-dda01de92d7f.svg';
const imgSubtract = '/design-lab/human/assets/58fd9e17-cf0d-4953-ae42-2eec3380ab70.svg';
const imgVector234 = '/design-lab/human/assets/d3a92ecd-4844-402f-bccd-b41d9bc194b0.svg';
const imgVector235 = '/design-lab/human/assets/5348a3bd-1b64-455f-ac86-cef9c6757f0d.svg';

function ScratchClosed({ className }: { className?: string }) {
  return (
    <div className={className || "drop-shadow-[0px_1px_7.5px_rgba(0,0,0,0.08)] h-[40px] relative w-[610px]"} data-node-id="85:25762" data-name="scratch/closed">
      <div className="absolute h-[40px] left-0 right-0 top-0" data-node-id="85:25717">
        <Image unoptimized width={610} height={40}  alt="" className="absolute block inset-0 max-w-none size-full" src={imgRectangle472} />
      </div>
      <div className="-translate-y-1/2 absolute h-[40px] right-[-0.11px] top-1/2 w-[42.105px]" data-node-id="85:25718">
        <Image unoptimized width={42.1053} height={40}  alt="" className="absolute block inset-0 max-w-none size-full" src={imgRectangle473} />
      </div>
      <p className="[word-break:break-word] absolute font-[family-name:'Source_Sans_Pro'] font-light leading-[19px] left-[20px] not-italic text-[#51548d] text-[15px] top-[10.5px] whitespace-nowrap" data-node-id="85:25729">
        Start free note text
      </p>
      <div className="absolute right-[5.5px] size-[30px] top-[4.5px]" data-node-id="85:25730">
        <div className="absolute h-[24px] left-[5px] top-[3px] w-[20px]" data-node-id="85:25731" data-name="Subtract">
          <Image unoptimized width={20} height={24}  alt="" className="absolute block inset-0 max-w-none size-full" src={imgSubtract} />
        </div>
        <div className="absolute contents left-[10.5px] top-px" data-node-id="85:25736">
          <div className="absolute bg-white h-[6px] left-[10.5px] rounded-[2px] top-px w-[3px]" data-node-id="85:25737" />
          <div className="absolute bg-white h-[6px] left-[16.5px] rounded-[2px] top-px w-[3px]" data-node-id="85:25738" />
        </div>
        <div className="absolute h-px left-[9.5px] top-[11px] w-[11px]" data-node-id="85:25739">
          <div className="absolute inset-[-75.02%_-6.82%_-59.59%_-6.82%]">
            <Image unoptimized width={12.5003} height={2.34613}  alt="" className="block max-w-none size-full" src={imgVector234} />
          </div>
        </div>
        <div className="absolute h-px left-[9.5px] top-[15.5px] w-[11px]" data-node-id="85:25740">
          <div className="absolute inset-[-75.02%_-6.82%_-59.59%_-6.82%]">
            <Image unoptimized width={12.5003} height={2.34613}  alt="" className="block max-w-none size-full" src={imgVector235} />
          </div>
        </div>
        <div className="absolute h-px left-[9.5px] top-[20px] w-[11px]" data-node-id="85:25741">
          <div className="absolute inset-[-75.02%_-6.82%_-59.59%_-6.82%]">
            <Image unoptimized width={12.5003} height={2.34613}  alt="" className="block max-w-none size-full" src={imgVector235} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ProtoScratchClosed({ className }: { className?: string }) {
  return (
    <button className={className || "block cursor-pointer h-[40px] relative w-[612px]"} data-node-id="314:66486" data-name="proto/scratch/closed">
      <ScratchClosed className="absolute drop-shadow-[0px_1px_7.5px_rgba(0,0,0,0.08)] inset-0" />
    </button>
  );
}

export function PriorNotes() {
  return <ProtoScratchClosed className="relative size-full" />;
}
