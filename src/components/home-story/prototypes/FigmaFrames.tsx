import { PriorPatient } from './PriorPatient'
import { PriorRequest } from './PriorRequest'
import { PriorNavigation } from './PriorNavigation'
import { PriorHistory } from './PriorHistory'
import { PriorClinical } from './PriorClinical'
import { PriorNotes } from './PriorNotes'
import { FactoScreen } from './FactoScreen'
import { FlowNavigation } from './FlowNavigation'
import { FlowTitle } from './FlowTitle'
import { FlowFinancials } from './FlowFinancials'

export function PriorFrame() {
  return <div data-prototype-canvas data-prototype="prior" className="relative h-[811px] w-[1240px] bg-[#d8e1e4] font-[family-name:'Source_Sans_Pro'] text-[#000000]">
    <div data-fragment="patient" className="prototype-part absolute left-[55px] top-0 h-[46px] w-[1185px]"><PriorPatient /></div>
    <div data-fragment="request" className="prototype-part absolute left-[55px] top-[46px] h-[66px] w-[1185px]"><PriorRequest /></div>
    <div data-fragment="navigation" className="prototype-part absolute left-0 top-0 h-[811px] w-[55px]"><PriorNavigation /></div>
    <div data-fragment="history" className="prototype-part absolute left-[70px] top-[127px] h-[669px] w-[527px]"><PriorHistory /></div>
    <div data-fragment="clinical" className="prototype-part absolute left-[612px] top-[127px] h-[614px] w-[612px]"><PriorClinical /></div>
    <div data-fragment="notes" className="prototype-part absolute left-[612px] top-[756px] h-[40px] w-[612px]"><PriorNotes /></div>
  </div>
}

export function FactoFrame() {
  return <div data-prototype-canvas data-prototype="facto" className="relative h-[1273px] w-[1920px] overflow-visible font-[family-name:'Noto_Sans']"><div className="absolute left-0 top-[-107px] h-[1380px] w-[1920px]"><FactoScreen /></div></div>
}

export function FlowFrame() {
  return <div data-prototype-canvas data-prototype="flow" className="relative h-[1080px] w-[1920px] overflow-visible bg-white font-[family-name:'Roboto']">
    <div data-fragment="navigation" className="prototype-part absolute left-0 top-0 h-[96px] w-[1920px] overflow-hidden"><FlowNavigation /></div>
    <div data-fragment="title" className="prototype-part absolute left-[40px] top-[128px] h-[80px] w-[1841px]"><FlowTitle /></div>
    <div className="absolute left-[40px] top-[208px] h-[1048px] w-[1841px]"><FlowFinancials /></div>
  </div>
}
