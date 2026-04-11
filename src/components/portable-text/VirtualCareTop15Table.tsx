/**
 * Virtual Care: "Top 15 Encounters Breakdown" table.
 *
 * Hard-coded reproduction of the Gatsby `<table class="virtual-diagram">`
 * showing each visit type's encounter device, capability flags
 * (text/image/audio/video/vitals/labs/imaging/other), and % of visits.
 *
 * Source data extracted from goinvo.com/vision/virtual-care/ on 2026-04-10.
 */

type Capability = 'required' | 'optional' | null

interface Row {
  name: string
  device: 'phone' | 'clinic'
  text: Capability
  image: Capability
  audio: Capability
  video: Capability
  vitals: Capability
  labs: Capability
  imaging: Capability
  other: string | null
  percent: string
}

const ROWS: Row[] = [
  { name: 'Routine checkup', device: 'phone', text: 'required', image: null, audio: 'optional', video: null, vitals: null, labs: null, imaging: null, other: null, percent: '24.5%' },
  { name: 'Medication, other and unspecified kinds', device: 'phone', text: 'required', image: null, audio: 'optional', video: null, vitals: null, labs: null, imaging: null, other: null, percent: '3.6%' },
  { name: 'Joint pain (knee, shoulder, etc.)', device: 'phone', text: 'required', image: 'optional', audio: 'optional', video: null, vitals: null, labs: null, imaging: 'optional', other: null, percent: '2.9%' },
  { name: 'Postoperative visit', device: 'phone', text: 'required', image: null, audio: 'optional', video: null, vitals: null, labs: null, imaging: null, other: null, percent: '2.6%' },
  { name: 'Cough', device: 'phone', text: 'required', image: null, audio: 'optional', video: null, vitals: null, labs: null, imaging: null, other: null, percent: '2.1%' },
  { name: 'Gynecological examination', device: 'clinic', text: null, image: null, audio: null, video: null, vitals: null, labs: null, imaging: null, other: 'Gynecologic exam (specialist)', percent: '2.1%' },
  { name: 'Prenatal examination, routine', device: 'phone', text: 'required', image: null, audio: 'optional', video: null, vitals: null, labs: null, imaging: 'optional', other: 'Ultrasound', percent: '1.8%' },
  { name: 'Back pain', device: 'phone', text: 'required', image: null, audio: 'optional', video: null, vitals: null, labs: null, imaging: 'optional', other: null, percent: '1.6%' },
  { name: 'Hypertension', device: 'phone', text: 'required', image: null, audio: 'optional', video: 'optional', vitals: 'required', labs: null, imaging: 'optional', other: 'Blood pressure', percent: '1.6%' },
  { name: 'Stomach and abdominal pain, cramps, and spasms', device: 'phone', text: 'required', image: null, audio: 'optional', video: 'optional', vitals: 'optional', labs: 'optional', imaging: 'optional', other: null, percent: '1.5%' },
  { name: 'Well baby examination', device: 'clinic', text: null, image: null, audio: null, video: null, vitals: null, labs: null, imaging: null, other: 'Milestones exam (specialist)', percent: '1.3%' },
  { name: 'Diabetes mellitus', device: 'phone', text: 'required', image: null, audio: 'optional', video: null, vitals: null, labs: 'optional', imaging: null, other: 'Every 3 months hemoglobin A1C. Every year fasting lipid profile, liver function tests, urine albumin excretion, serum creatinine', percent: '1.3%' },
  { name: 'Skin rash, lesion', device: 'phone', text: 'required', image: 'required', audio: 'optional', video: null, vitals: null, labs: null, imaging: null, other: 'Photo of rash/lesion', percent: '1.0%' },
  { name: 'Preoperative visit', device: 'phone', text: 'required', image: null, audio: 'optional', video: null, vitals: 'required', labs: null, imaging: null, other: 'EKG', percent: '1.0%' },
  { name: 'Symptoms referable to throat', device: 'phone', text: 'required', image: 'optional', audio: 'optional', video: null, vitals: null, labs: null, imaging: null, other: 'Strep test', percent: '0.9%' },
  { name: 'All other reasons', device: 'phone', text: null, image: null, audio: null, video: null, vitals: null, labs: null, imaging: null, other: null, percent: '50.2%' },
]

function CapabilityIcon({ value }: { value: Capability }) {
  if (!value) return null
  if (value === 'required') {
    return (
      <svg width="20" height="20" viewBox="0 0 47 47" className="inline-block text-charcoal" aria-label="Required">
        <circle cx="23.5" cy="23.5" r="22" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M14.5 24l6 6 12-13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
  // optional — just the checkmark, no circle
  return (
    <svg width="20" height="20" viewBox="0 0 47 47" className="inline-block text-charcoal" aria-label="Optional">
      <path d="M14.5 24l6 6 12-13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function DeviceIcon({ device }: { device: 'phone' | 'clinic' }) {
  if (device === 'phone') {
    return (
      <svg width="14" height="22" viewBox="0 0 29 54" className="inline-block text-charcoal" aria-label="Smartphone visit">
        <path d="M3.78 0A3.78 3.78 0 000 3.78v46.78a3.78 3.78 0 003.78 3.78h21.44A3.78 3.78 0 0029 50.56V3.78A3.78 3.78 0 0025.22 0zM2.52 5.06h24v39.18h-24zm12 41.09a3.16 3.16 0 11-3.15 3.16 3.15 3.15 0 013.15-3.16z" fill="currentColor" />
      </svg>
    )
  }
  // clinic icon
  return (
    <svg width="22" height="22" viewBox="0 0 47 47" className="inline-block text-charcoal" aria-label="In-clinic visit">
      <path d="M23.5 4 L4 18 V42 H43 V18 Z M19 28 H28 V42 H19 Z M11 22 H17 V28 H11 Z M30 22 H36 V28 H30 Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  )
}

export function VirtualCareTop15Table() {
  return (
    <div className="my-8 overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="text-gray text-xs">
            <th className="text-left font-normal p-2 w-[18%]">Reason for Visit</th>
            <th className="font-normal p-2 w-[8%]">Encounter &amp; Device</th>
            <th className="font-normal p-2 w-[7%]">Text</th>
            <th className="font-normal p-2 w-[7%]">Image</th>
            <th className="font-normal p-2 w-[7%]">Audio</th>
            <th className="font-normal p-2 w-[7%]">Video</th>
            <th className="font-normal p-2 w-[7%]">Vitals</th>
            <th className="font-normal p-2 w-[7%]">Labs</th>
            <th className="font-normal p-2 w-[7%]">Imaging</th>
            <th className="font-normal p-2 w-[10%]">Other</th>
            <th className="font-normal p-2 text-right w-[8%]">% of Visits</th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row, i) => (
            <tr key={i} className="border-t border-gray-200">
              <td className="p-2 align-middle">{row.name}</td>
              <td className="p-2 text-center align-middle"><DeviceIcon device={row.device} /></td>
              <td className="p-2 text-center align-middle"><CapabilityIcon value={row.text} /></td>
              <td className="p-2 text-center align-middle"><CapabilityIcon value={row.image} /></td>
              <td className="p-2 text-center align-middle"><CapabilityIcon value={row.audio} /></td>
              <td className="p-2 text-center align-middle"><CapabilityIcon value={row.video} /></td>
              <td className="p-2 text-center align-middle"><CapabilityIcon value={row.vitals} /></td>
              <td className="p-2 text-center align-middle"><CapabilityIcon value={row.labs} /></td>
              <td className="p-2 text-center align-middle"><CapabilityIcon value={row.imaging} /></td>
              <td className="p-2 align-middle text-xs text-gray">{row.other || ''}</td>
              <td className="p-2 align-middle text-right">{row.percent}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-4 text-xs text-gray flex flex-wrap gap-4">
        <span className="flex items-center gap-1.5"><CapabilityIcon value="required" /> Required</span>
        <span className="flex items-center gap-1.5"><CapabilityIcon value="optional" /> Optional</span>
      </p>
    </div>
  )
}
