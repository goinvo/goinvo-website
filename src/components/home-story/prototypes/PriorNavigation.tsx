// Faithful Figma reconstruction; see docs/reviews/human-figma-source-map.md.
import Image from 'next/image'

const imgNavPatients = '/design-lab/human/assets/c6e3a9a0-c3f1-4af3-937b-dd2fa0aebf41.svg';
const imgNavUser = '/design-lab/human/assets/e7053b4e-0165-4456-8d93-72f41f38911e.svg';
const imgNavAlerts = '/design-lab/human/assets/ce11c37e-195c-43a0-a1c3-251e07e4574d.svg';
const imgFrame757 = '/design-lab/human/assets/5a9ddbfe-ef3e-4eac-a0bd-78c65d40021e.svg';
const imgNavDashboard = '/design-lab/human/assets/d70e55cf-002f-4a57-89dd-8edd460bec46.svg';
const imgNavCases = '/design-lab/human/assets/246e6282-e79f-4784-89fc-3b441f247ffa.svg';
const imgNavProtocol = '/design-lab/human/assets/76b806d1-4924-4d20-bab6-d2765bb05e4d.svg';
const imgNavTasks = '/design-lab/human/assets/198cd183-4f47-4652-b40e-22119538f7f7.svg';

function NavPatients({ className }: { className?: string }) {
  return (
    <div className={className || "relative size-[30px]"} data-node-id="2752:213" data-name="nav/Patients">
      <Image unoptimized width={30} height={30}  alt="" className="absolute block inset-0 max-w-none size-full" src={imgNavPatients} />
    </div>
  );
}

export function PriorNavigation() {
  return (
    <div className="relative size-full" data-node-id="4632:425918" data-name="proto/NavRail">
      <div className="absolute bg-[#f7f7f7] inset-0" data-node-id="I4632:425918;248:49576" data-name="NavRail/withoutHome">
        <div className="-translate-x-1/2 absolute content-stretch flex flex-col gap-px items-start left-1/2 overflow-clip top-[-0.5px]" data-node-id="I4632:425918;248:49576;438:973">
          <div className="h-[56px] relative shrink-0 w-[55px]" data-node-id="I4632:425918;248:49576;672:57" data-name="nav_item/off">
            <div className="absolute inset-0 opacity-60" data-node-id="I4632:425918;248:49576;672:57;672:22" data-name="nav_item/selected">
              <div className="-translate-x-1/2 -translate-y-1/2 absolute left-[calc(50%+0.5px)] size-[30px] top-1/2" data-node-id="I4632:425918;248:49576;672:57;672:22;672:18" data-name="nav/User">
                <Image unoptimized width={30} height={30}  alt="" className="absolute block inset-0 max-w-none size-full" src={imgNavUser} />
              </div>
            </div>
          </div>
          <div className="h-[56px] relative shrink-0 w-[55px]" data-node-id="I4632:425918;248:49576;672:63" data-name="nav_item/off">
            <div className="absolute inset-0 opacity-60" data-node-id="I4632:425918;248:49576;672:63;672:22" data-name="nav_item/selected">
              <div className="-translate-x-1/2 -translate-y-1/2 absolute left-[calc(50%+0.5px)] size-[30px] top-1/2" data-node-id="I4632:425918;248:49576;672:63;672:22;672:18" data-name="nav/Alerts">
                <Image unoptimized width={30} height={30}  alt="" className="absolute block inset-0 max-w-none size-full" src={imgNavAlerts} />
              </div>
            </div>
          </div>
          <div className="h-[10px] relative shrink-0 w-[55px]" data-node-id="I4632:425918;248:49576;438:980">
            <Image unoptimized width={55} height={10}  alt="" className="absolute block inset-0 max-w-none size-full" src={imgFrame757} />
          </div>
          <div className="h-[56px] relative shrink-0 w-[55px]" data-node-id="I4632:425918;248:49576;672:68" data-name="nav_item/off">
            <div className="absolute inset-0 opacity-60" data-node-id="I4632:425918;248:49576;672:68;672:22" data-name="nav_item/selected">
              <div className="-translate-x-1/2 -translate-y-1/2 absolute left-[calc(50%+0.5px)] size-[30px] top-1/2" data-node-id="I4632:425918;248:49576;672:68;672:22;672:18" data-name="nav/Patients">
                <Image unoptimized width={30} height={30}  alt="" className="absolute block inset-0 max-w-none size-full" src={imgNavDashboard} />
              </div>
            </div>
          </div>
          <div className="h-[56px] relative shrink-0 w-[55px]" data-node-id="I4632:425918;248:49576;672:72" data-name="nav_item/off">
            <div className="absolute inset-0 opacity-60" data-node-id="I4632:425918;248:49576;672:72;672:22" data-name="nav_item/selected">
              <div className="-translate-x-1/2 -translate-y-1/2 absolute left-[calc(50%+0.5px)] size-[30px] top-1/2" data-node-id="I4632:425918;248:49576;672:72;672:22;672:18" data-name="nav/Cases">
                <Image unoptimized width={30} height={30}  alt="" className="absolute block inset-0 max-w-none size-full" src={imgNavCases} />
              </div>
            </div>
          </div>
          <div className="bg-[rgba(216,226,232,0.6)] border-2 border-[#f7f7f7] border-solid h-[56px] relative shrink-0 w-[55px]" data-node-id="I4632:425918;248:49576;672:76" data-name="nav_item/selected">
            <NavPatients className="-translate-x-1/2 -translate-y-1/2 absolute left-[calc(50%+0.5px)] size-[30px] top-1/2" />
          </div>
          <div className="h-[56px] relative shrink-0 w-[55px]" data-node-id="I4632:425918;248:49576;672:80" data-name="nav_item/off">
            <div className="absolute inset-0 opacity-60" data-node-id="I4632:425918;248:49576;672:80;672:22" data-name="nav_item/selected">
              <div className="-translate-x-1/2 -translate-y-1/2 absolute left-[calc(50%+0.5px)] size-[30px] top-1/2" data-node-id="I4632:425918;248:49576;672:80;672:22;672:18" data-name="nav/Protocol">
                <Image unoptimized width={30} height={30}  alt="" className="absolute block inset-0 max-w-none size-full" src={imgNavProtocol} />
              </div>
            </div>
          </div>
          <div className="h-[56px] relative shrink-0 w-[55px]" data-node-id="I4632:425918;248:49576;762:322" data-name="nav_item/off">
            <div className="absolute inset-0 opacity-60" data-node-id="I4632:425918;248:49576;762:322;672:22" data-name="nav_item/selected">
              <div className="-translate-x-1/2 -translate-y-1/2 absolute left-[calc(50%+0.5px)] size-[30px] top-1/2" data-node-id="I4632:425918;248:49576;762:322;672:22;672:18" data-name="nav/Tasks">
                <Image unoptimized width={30} height={30}  alt="" className="absolute block inset-0 max-w-none size-full" src={imgNavTasks} />
              </div>
            </div>
          </div>
          <div className="h-[10px] relative shrink-0 w-[55px]" data-node-id="I4632:425918;248:49576;438:1005">
            <Image unoptimized width={55} height={10}  alt="" className="absolute block inset-0 max-w-none size-full" src={imgFrame757} />
          </div>
        </div>
      </div>
      <div className="absolute contents inset-[0.12%_0_49.63%_0]" data-node-id="I4632:425918;248:49744" data-name="hit targets">
        <div className="absolute bg-[rgba(255,255,255,0.15)] inset-[15.35%_0_77.74%_0] opacity-1" data-node-id="I4632:425918;248:49676" data-name="proto/hittarget" />
        <div className="absolute bg-[rgba(255,255,255,0.15)] inset-[6.91%_0_86.31%_0] opacity-1" data-node-id="I4632:425918;248:49741" data-name="proto/hittarget" />
        <div className="absolute bg-[rgba(255,255,255,0.15)] inset-[0.12%_0_93.09%_0] opacity-1" data-node-id="I4632:425918;248:49742" data-name="proto/hittarget" />
        <div className="absolute bg-[rgba(255,255,255,0.15)] inset-[22.38%_0_70.72%_0] opacity-1" data-node-id="I4632:425918;248:49677" data-name="proto/hittarget" />
        <div className="absolute bg-[rgba(255,255,255,0.15)] inset-[29.41%_0_63.69%_0] opacity-1" data-node-id="I4632:425918;248:49681" data-name="proto/hittarget" />
        <div className="absolute bg-[rgba(255,255,255,0.15)] inset-[36.44%_0_56.66%_0] opacity-1" data-node-id="I4632:425918;248:49682" data-name="proto/hittarget" />
        <div className="absolute bg-[rgba(255,255,255,0.15)] inset-[43.46%_0_49.63%_0] opacity-1" data-node-id="I4632:425918;1532:20581" data-name="proto/hittarget" />
      </div>
    </div>
  );
}
