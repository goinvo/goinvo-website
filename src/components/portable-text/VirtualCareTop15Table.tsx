type IconName = 'smartphone' | 'clinic' | 'ekg' | 'bloodPressure' | 'required' | 'optional'

interface CellValue {
  icons?: IconName[]
  text?: string | null
}

interface Row {
  name: string
  encounter?: CellValue
  text?: CellValue
  image?: CellValue
  audio?: CellValue
  video?: CellValue
  vitals?: CellValue
  labs?: CellValue
  imaging?: CellValue
  other?: CellValue
  percent: string
}

const HEADER_CELLS = [
  { label: 'Reason for Visit', width: '20%' },
  { label: 'Encounter & Device', width: '8%' },
  { label: 'Text', width: '8%' },
  { label: 'Image', width: '8%' },
  { label: 'Audio', width: '8%' },
  { label: 'Video', width: '8%' },
  { label: 'Vitals', width: '8%' },
  { label: 'Labs', width: '8%' },
  { label: 'Imaging', width: '8%' },
  { label: 'Other', width: '8%' },
  { label: '% of Visits', width: '8%' },
] as const

const ROWS: Row[] = [
  { name: 'Routine checkup', encounter: { icons: ['smartphone'] }, text: { icons: ['required'] }, audio: { icons: ['optional'] }, percent: '24.5%' },
  { name: 'Medication, other and unspecifed kinds', encounter: { icons: ['smartphone'] }, text: { icons: ['required'] }, audio: { icons: ['optional'] }, percent: '3.6%' },
  { name: 'Joint pain (knee, shoulder, etc.)', encounter: { icons: ['smartphone'] }, text: { icons: ['required'] }, image: { icons: ['optional'] }, audio: { icons: ['optional'] }, imaging: { icons: ['optional'] }, percent: '2.9%' },
  { name: 'Postoperative visit', encounter: { icons: ['smartphone'] }, text: { icons: ['required'] }, audio: { icons: ['optional'] }, percent: '2.6%' },
  { name: 'Cough', encounter: { icons: ['smartphone'] }, text: { icons: ['required'] }, audio: { icons: ['optional'] }, percent: '2.1%' },
  { name: 'Gynecological examination', encounter: { icons: ['clinic'] }, other: { text: 'Gynecologic exam (specialist)' }, percent: '2.1%' },
  { name: 'Prenatal examination, routine', encounter: { icons: ['smartphone'] }, text: { icons: ['required'] }, audio: { icons: ['optional'] }, imaging: { icons: ['optional'], text: 'Ultrasound' }, percent: '1.8%' },
  { name: 'Back pain', encounter: { icons: ['smartphone'] }, text: { icons: ['required'] }, audio: { icons: ['optional'] }, imaging: { icons: ['optional'] }, percent: '1.6%' },
  { name: 'Hypertension', encounter: { icons: ['smartphone', 'bloodPressure'] }, text: { icons: ['required'] }, audio: { icons: ['optional'] }, video: { icons: ['optional'] }, vitals: { icons: ['required'], text: 'Blood pressure' }, imaging: { icons: ['optional'] }, percent: '1.6%' },
  { name: 'Stomach and abdominal pain, cramps, and spasms', encounter: { icons: ['smartphone', 'ekg'] }, text: { icons: ['required'] }, audio: { icons: ['optional'] }, video: { icons: ['optional'] }, vitals: { icons: ['optional'] }, labs: { icons: ['optional'] }, imaging: { icons: ['optional'] }, percent: '1.5%' },
  { name: 'Well baby examination', encounter: { icons: ['clinic'] }, other: { text: 'Milestones exam (specialist)' }, percent: '1.3%' },
  { name: 'Diabetes mellitus', encounter: { icons: ['smartphone'] }, text: { icons: ['required'] }, audio: { icons: ['optional'] }, labs: { icons: ['optional'], text: 'Every 3 months Hemoglobin A1C. Every year fasting lipid profile, liver function tests, urine albumin excretion, serum creatinine.' }, percent: '1.3%' },
  { name: 'Skin rash, lesion', encounter: { icons: ['smartphone'] }, text: { icons: ['required'] }, image: { icons: ['required'], text: 'Photo of rash/lesion' }, audio: { icons: ['optional'] }, percent: '1.0%' },
  { name: 'Preoperative visit', encounter: { icons: ['smartphone', 'ekg'] }, text: { icons: ['required'] }, audio: { icons: ['optional'] }, vitals: { icons: ['required'] }, other: { text: 'EKG' }, percent: '1.0%' },
  { name: 'Symptoms referable to throat', encounter: { icons: ['smartphone'] }, text: { icons: ['required'] }, image: { icons: ['optional'] }, audio: { icons: ['optional'] }, other: { text: 'Strep test' }, percent: '0.9%' },
  { name: 'All other reasons', percent: '50.2%' },
]

const LEGEND_ITEMS: { icon: IconName; label: string }[] = [
  { icon: 'smartphone', label: 'Virtual Visit' },
  { icon: 'clinic', label: 'Face-to-face Visit' },
  { icon: 'ekg', label: 'EKG Monitor' },
  { icon: 'bloodPressure', label: 'Blood Pressure Cuff' },
  { icon: 'required', label: 'Required' },
  { icon: 'optional', label: 'Optional' },
]

function IconSymbol({ icon }: { icon: IconName }) {
  const title = {
    smartphone: 'Smartphone',
    clinic: 'Office Visit',
    ekg: 'EKG',
    bloodPressure: 'Blood Pressure Cuff',
    required: 'Required',
    optional: 'Optional',
  }[icon]

  const iconClassName = 'inline-block h-auto w-[20%] max-h-[30px] min-w-[23px] align-top text-charcoal'

  return (
    <>
      {icon === 'smartphone' && (
        <svg viewBox="0 0 29 54.37" className={iconClassName} aria-label={title}>
          <title>{title}</title>
          <path d="M3.78.23A3.78,3.78,0,0,0,0,4V50.8a3.78,3.78,0,0,0,3.78,3.8H25.22A3.78,3.78,0,0,0,29,50.8V4A3.78,3.78,0,0,0,25.22.23ZM2.52,5.29h24V44.48h-24Zm12,41.09a3.16,3.16,0,1,1-3.15,3.16A3.15,3.15,0,0,1,14.5,46.38Z" fill="currentColor" transform="translate(0 -0.23)" />
        </svg>
      )}
      {icon === 'clinic' && (
        <svg viewBox="0 0 55.74 51" className={iconClassName} aria-label={title}>
          <title>{title}</title>
          <path d="M55.87,20.66,29.27.26a1.26,1.26,0,0,0-1.54,0L1.13,20.66A1.28,1.28,0,0,0,.7,22.08,1.27,1.27,0,0,0,1.9,23H8.23V49.72a1.33,1.33,0,0,0,.37.91,1.26,1.26,0,0,0,.9.37h38a1.26,1.26,0,0,0,.9-.37,1.33,1.33,0,0,0,.37-.91V23H55.1a1.27,1.27,0,0,0,1.2-.87,1.28,1.28,0,0,0-.43-1.42ZM47.5,20.4a1.26,1.26,0,0,0-.9.37,1.32,1.32,0,0,0-.37.9V48.45H10.77V21.67a1.32,1.32,0,0,0-.37-.9,1.26,1.26,0,0,0-.9-.37H5.65L28.5,2.88,51.35,20.4Z" fill="currentColor" transform="translate(-0.63 0)" />
          <polygon points="25.33 22.95 25.33 28.05 20.27 28.05 20.27 33.15 25.33 33.15 25.33 38.25 30.4 38.25 30.4 33.15 35.47 33.15 35.47 28.05 30.4 28.05 30.4 22.95 25.33 22.95" fill="currentColor" />
        </svg>
      )}
      {icon === 'ekg' && (
        <svg viewBox="0 0 52.63 43.98" className={iconClassName} aria-label={title}>
          <title>{title}</title>
          <path d="M48.86,0H4.13A3.93,3.93,0,0,0,.19,3.92V40.08A3.94,3.94,0,0,0,4.13,44H48.87a3.94,3.94,0,0,0,4-3.91V3.92A3.94,3.94,0,0,0,48.86,0ZM2,22.68h8.39a2.24,2.24,0,0,0,1.44-.5c.52,1.54,1.26,3.66,1.87,5.19a.88.88,0,0,0,.89.55.87.87,0,0,0,.79-.69c.32-1.44,1.08-5.14,1.71-8.18.67,3.76,1.6,8.8,2,10.87a.91.91,0,0,0,.85.6H20c.67,0,1.2-.17,3.34-7.85h4.79A1.87,1.87,0,0,0,30,21.48l.14-.36c.56,1.43,1.42,3.58,2.61,6.41a.92.92,0,0,0,.86.54.87.87,0,0,0,.8-.63c.82-2.83,1.71-5.69,2.39-7.82,1.86,10.89,2.27,10.87,2.87,10.87A.9.9,0,0,0,40.75,30c.92-2.42,2.07-5.89,2.52-7.28h7.78V33H2ZM4.13,1.76H48.87a2.17,2.17,0,0,1,2.18,2.16v17H42.63a.88.88,0,0,0-.84.61s-.9,2.78-1.79,5.35c-.57-2.61-1.37-7-2-11.13a.88.88,0,0,0-.81-.73.87.87,0,0,0-.9.6c0,.05-1.39,4.23-2.81,8.93C31.77,20.5,31,18.42,31,18.4a.89.89,0,0,0-.82-.58.84.84,0,0,0-.83.55l-1,2.48a.48.48,0,0,1-.27.07H22.65a.89.89,0,0,0-.86.64c-.48,1.77-1.06,3.71-1.55,5.18C19.35,22,18,14.3,18,14.21a.88.88,0,0,0-.85-.73h0a.9.9,0,0,0-.87.7s-1.17,5.76-2,9.7c-.76-2.14-1.43-4.2-1.44-4.24A.89.89,0,0,0,12,19a.91.91,0,0,0-.85.53l-.53,1.28a.47.47,0,0,1-.28.07H2v-17A2.17,2.17,0,0,1,4.13,1.76ZM48.86,42.24H4.13A2.17,2.17,0,0,1,2,40.08V34.7h49.1v5.38A2.18,2.18,0,0,1,48.86,42.24Z" fill="currentColor" transform="translate(-0.19 -0.01)" />
          <path d="M36.48,36.31H33.23a2.28,2.28,0,1,0,0,4.56h3.25a2.28,2.28,0,1,0,0-4.56Zm0,3H33.23a.75.75,0,1,1,0-1.5h3.25a.75.75,0,1,1,0,1.5Z" fill="currentColor" transform="translate(-0.19 -0.01)" />
          <path d="M46,36.31H42.75a2.28,2.28,0,1,0,0,4.56H46a2.28,2.28,0,1,0,0-4.56Zm0,3H42.75a.75.75,0,0,1,0-1.5H46a.75.75,0,1,1,0,1.5Z" fill="currentColor" transform="translate(-0.19 -0.01)" />
        </svg>
      )}
      {icon === 'bloodPressure' && (
        <svg viewBox="0 0 62.59 56.07" className={iconClassName} aria-label={title}>
          <title>{title}</title>
          <path d="M15.57,21.33c-1.66,4.43-5.59,7.22-8.47,6s-3.84-5.76-2.26-10,5.18-5.91,8-4.7S17.17,17.07,15.57,21.33Z" fill="currentColor" transform="translate(-0.7 -3.96)" />
          <path d="M46.58,20.84a9.33,9.33,0,0,0,9.3,9.26h.29v1.06a5.26,5.26,0,0,1-5.27,5.26H38.84v1.8c0,4.45,0,9.06-1.75,13.38a13,13,0,0,1-7.25,7.22A18.14,18.14,0,0,1,23.06,60,25.45,25.45,0,0,1,13.28,58C7.77,55.65,3.7,52,1.77,47.6c-2.44-5.53-.23-11.23,2-16.14.59-1.29,1.12-2.5,1.56-3.67a4.77,4.77,0,0,0,1.24.75,4.81,4.81,0,0,0,2,.4l.33,0C8.35,30.33,7.76,31.69,7.16,33c-2,4.37-3.82,9-2,13.1,2.08,4.72,6.88,7.33,9.56,8.46,4.75,2,10,2.33,13.72.82a9.29,9.29,0,0,0,5.23-5.22c1.51-3.62,1.49-7.66,1.46-11.93V36.42H31.31a5.26,5.26,0,0,1-5.26-5.26V9.22A5.27,5.27,0,0,1,31.31,4H50.9a5.27,5.27,0,0,1,5.27,5.26v2.35h-.29A9.31,9.31,0,0,0,46.58,20.84Z" fill="currentColor" transform="translate(-0.7 -3.96)" />
          <path d="M55.88,13.42a7.41,7.41,0,1,0,0,14.82h0a7.41,7.41,0,0,0,0-14.82Zm5.74,7.32a5.75,5.75,0,1,1-5.8-5.64h0A5.73,5.73,0,0,1,61.62,20.74Z" fill="currentColor" transform="translate(-0.7 -3.96)" />
          <path d="M59.67,18.12a.44.44,0,0,0-.6-.17c-.26.13-.5.27-.74.41l-.06,0-1.17.69-.66.39a1.43,1.43,0,0,0-1.33.13l-.2.17a1.4,1.4,0,0,0,1,2.39,1.38,1.38,0,0,0,.56-.12,1.27,1.27,0,0,0,.23-.12,1.4,1.4,0,0,0,.6-1.2l1.42-1.21,0,0,.85-.73A.46.46,0,0,0,59.67,18.12Z" fill="currentColor" transform="translate(-0.7 -3.96)" />
        </svg>
      )}
      {icon === 'required' && (
        <svg viewBox="0 0 47 46.48" className={iconClassName} aria-label={title}>
          <title>{title}</title>
          <path d="M23.5.19A23.39,23.39,0,0,0,0,23.43a23.5,23.5,0,0,0,47,0A23.39,23.39,0,0,0,23.5.19Zm0,3.1a20.14,20.14,0,1,1,0,40.28,20.14,20.14,0,1,1,0-40.28Zm11,10.83a1.57,1.57,0,0,0-1.08.48L20.37,27.92l-5.54-5.64a1.57,1.57,0,0,0-2.64.66,1.56,1.56,0,0,0,.39,1.51l6.66,6.77a1.56,1.56,0,0,0,1.13.48,1.54,1.54,0,0,0,1.12-.48L35.72,16.76a1.54,1.54,0,0,0-1.17-2.64Z" fill="currentColor" transform="translate(0 -0.19)" />
        </svg>
      )}
      {icon === 'optional' && (
        <svg viewBox="0 0 46.59 46.67" className={iconClassName} aria-label={title}>
          <title>{title}</title>
          <path d="M21.49,31.22,35.72,16.76a1.54,1.54,0,0,0-1.17-2.64,1.57,1.57,0,0,0-1.08.48L20.37,27.92l-5.54-5.64a1.57,1.57,0,0,0-2.64.66,1.56,1.56,0,0,0,.39,1.51l6.66,6.77a1.56,1.56,0,0,0,1.13.48A1.54,1.54,0,0,0,21.49,31.22Z" fill="currentColor" transform="translate(-0.16 -0.16)" />
          <path d="M17.49,4.07,16.6,1.2h0a23.41,23.41,0,0,0-2.72,1H13.8L15.05,5A19.44,19.44,0,0,1,17.49,4.07Z" fill="currentColor" transform="translate(-0.16 -0.16)" />
          <path d="M4.54,16.13,1.75,15h0v0h0v0h0l0,0h0c-.22.59-.43,1.19-.61,1.81h0v0h0v0h0v0H1v0H1c-.07.24-.13.47-.19.72l2.91.71A21,21,0,0,1,4.54,16.13Z" fill="currentColor" transform="translate(-0.16 -0.16)" />
          <path d="M3.69,28.12.77,28.8l.09.39h0v0h0v0h0c.09.34.18.67.29,1h0v0h0v0h0v0h0v0h0v0h0v0h0v0h0v0h0c.1.31.21.61.32.92l2.81-1.05A22.39,22.39,0,0,1,3.69,28.12Z" fill="currentColor" transform="translate(-0.16 -0.16)" />
          <path d="M3.16,23.5c0-.48,0-1,.06-1.45l-3-.21c0,.38,0,.75,0,1.13h0v0h0v0h0v0h0v0h0c0,.33,0,.67,0,1l3-.17C3.18,24.28,3.16,23.89,3.16,23.5Z" fill="currentColor" transform="translate(-0.16 -0.16)" />
          <path d="M43.76,21.74l3-.26v-.05h0v0h0v0h0v0h0v0h0v0h0v0h0v0h0v0h0v0h0v0h0v0h0v0h-.05v0h-.09v0h0v0h0v0h0v0h0c-.05-.33-.12-.66-.19-1l-2.93.63A20.48,20.48,0,0,1,43.76,21.74Z" fill="currentColor" transform="translate(-0.16 -0.16)" />
          <path d="M42.34,15.83l2.78-1.13-.18-.43h0l0,0h0v0H44.8v0h0v0h0v0h0c-.19-.41-.39-.82-.6-1.22h0l0,0h0v0H44v0h0v0h0v0h0L43.81,12,41.2,13.48A21.19,21.19,0,0,1,42.34,15.83Z" fill="currentColor" transform="translate(-0.16 -0.16)" />
          <path d="M3.35,35.27A22.15,22.15,0,0,0,5,37.76L7.4,35.92a19.94,19.94,0,0,1-1.46-2.16Z" fill="currentColor" transform="translate(-0.16 -0.16)" />
          <path d="M36.37,4q-.54-.36-1.11-.69h0l0,0h0l0,0H35l0,0h-.09l0,0h0l-.56-.3H34l-.26-.13L32.45,5.23a22.18,22.18,0,0,1,2.27,1.3Z" fill="currentColor" transform="translate(-0.16 -0.16)" />
          <path d="M23.5,3.16v-3h-.8c-.7,0-1.39.08-2.07.16h-.12l.38,3A20.67,20.67,0,0,1,23.5,3.16Z" fill="currentColor" transform="translate(-0.16 -0.16)" />
          <path d="M30.05,1.1c-.49-.15-1-.27-1.47-.38h-.43l-1-.19-.46,3A18.43,18.43,0,0,1,29.21,4Z" fill="currentColor" transform="translate(-0.16 -0.16)" />
          <path d="M32.49,41.75l1.32,2.69a24.72,24.72,0,0,0,2.6-1.5l-1.66-2.5A21.36,21.36,0,0,1,32.49,41.75Z" fill="currentColor" transform="translate(-0.16 -0.16)" />
          <path d="M26.7,43.59l.47,3,.54-.09h.45l1.05-.24h.42l.46-.13L29.25,43A20.43,20.43,0,0,1,26.7,43.59Z" fill="currentColor" transform="translate(-0.16 -0.16)" />
          <path d="M41.55,8.71Q41,8,40.35,7.36h0v0h0v0h-.13l0,0h0l0,0h0l0,0h0l0,0h0l-.43-.43H39.5l-2,2.18a21.41,21.41,0,0,1,1.78,1.91Z" fill="currentColor" transform="translate(-0.16 -0.16)" />
          <path d="M4.14,10.46h0l0,0H4v0H4l-.51.81L6.08,13a21,21,0,0,1,1.49-2.14L5.22,9Q4.65,9.71,4.14,10.46Z" fill="currentColor" transform="translate(-0.16 -0.16)" />
          <path d="M43.76,25.23a20.58,20.58,0,0,1-.38,2.58l2.93.63a22.47,22.47,0,0,0,.44-3Z" fill="currentColor" transform="translate(-0.16 -0.16)" />
          <path d="M41.22,33.48,43.83,35c.13-.23.26-.46.38-.7h0l0,0h0v0h0l0,0h0v0h0v0h.07v0h0v0h0l0,0h0v0h0c.24-.48.46-1,.66-1.48h0l0,0h0v0h0v0h0l-2.78-1.13A19.6,19.6,0,0,1,41.22,33.48Z" fill="currentColor" transform="translate(-0.16 -0.16)" />
          <path d="M37.47,38.27l2.07,2.18a23.47,23.47,0,0,0,1.81-1.92h0l0,0h0v0h.19l-2.33-1.9A18.9,18.9,0,0,1,37.47,38.27Z" fill="currentColor" transform="translate(-0.16 -0.16)" />
          <path d="M10.18,4.34h-.3c-.52.37-1,.77-1.5,1.18h-.2v0h0A1.54,1.54,0,0,0,8,6.09l2,2.23A21.49,21.49,0,0,1,12,6.71L10.33,4.24Z" fill="currentColor" transform="translate(-0.16 -0.16)" />
          <path d="M7.73,40.7a21.64,21.64,0,0,0,1.73,1.44h0l0,0h.17l.4.29,1.73-2.45a19.94,19.94,0,0,1-2-1.64Z" fill="currentColor" transform="translate(-0.16 -0.16)" />
          <path d="M20.19,46.6a22.75,22.75,0,0,0,3,.23l0-3a20.7,20.7,0,0,1-2.61-.2Z" fill="currentColor" transform="translate(-0.16 -0.16)" />
          <path d="M13.51,44.6a24.13,24.13,0,0,0,2.79,1.1l.92-2.85a21,21,0,0,1-2.42-1Z" fill="currentColor" transform="translate(-0.16 -0.16)" />
        </svg>
      )}
    </>
  )
}

function CellContent({ value }: { value?: CellValue }) {
  if (!value?.icons?.length && !value?.text) return null

  return (
    <>
      {value?.icons?.length ? value.icons.map((icon, index) => (
        <span key={`${icon}-${index}`} className={index > 0 ? 'ml-[10px]' : undefined}>
          <IconSymbol icon={icon} />
        </span>
      )) : null}
      {value?.text ? (
        <>
          {value.icons?.length ? <br /> : null}
          {value.text}
        </>
      ) : null}
    </>
  )
}

const baseCellClassName = 'align-top px-[5px] py-[10px] leading-[26px]'

export function VirtualCareTop15Table() {
  return (
    <div className="relative left-1/2 right-1/2 my-8 w-screen -ml-[50vw] -mr-[50vw] overflow-x-auto">
      <table className="w-full min-w-[1040px] border-collapse text-base leading-[26px] text-black">
        <tbody>
          <tr className="text-gray">
            {HEADER_CELLS.map((cell, index) => (
              <td
                key={cell.label}
                width={cell.width}
                className={[
                  baseCellClassName,
                  index === 0 ? 'pl-5' : '',
                  index === HEADER_CELLS.length - 1 ? 'pr-5 text-right' : '',
                ].filter(Boolean).join(' ')}
              >
                {cell.label}
              </td>
            ))}
          </tr>
          {ROWS.map((row, index) => (
            <tr key={row.name} className={index % 2 === 0 ? 'bg-[#f9f9f9]' : undefined}>
              <td className={`${baseCellClassName} pl-5`}>{row.name}</td>
              <td className={baseCellClassName}><CellContent value={row.encounter} /></td>
              <td className={baseCellClassName}><CellContent value={row.text} /></td>
              <td className={baseCellClassName}><CellContent value={row.image} /></td>
              <td className={baseCellClassName}><CellContent value={row.audio} /></td>
              <td className={baseCellClassName}><CellContent value={row.video} /></td>
              <td className={baseCellClassName}><CellContent value={row.vitals} /></td>
              <td className={baseCellClassName}><CellContent value={row.labs} /></td>
              <td className={baseCellClassName}><CellContent value={row.imaging} /></td>
              <td className={baseCellClassName}><CellContent value={row.other} /></td>
              <td className={`${baseCellClassName} pr-5 text-right`}>{row.percent}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <table className="mt-5 mb-5 w-full min-w-[1040px] border-collapse border-t border-[#eee] text-base leading-[26px] text-gray">
        <tbody>
          <tr className="text-gray">
            {LEGEND_ITEMS.map((item) => (
              <td key={item.label} className="align-top px-[5px] py-5 text-center leading-[26px]">
                <IconSymbol icon={item.icon} />
                <br />
                {item.label}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  )
}

export function VirtualCareTimeToDiagnosis() {
  return (
    <div className="my-8">
      <table width="100%" className="w-full text-base text-gray">
        <tbody>
          <tr>
            <td colSpan={2} className="pb-2 pr-[5px] align-top">Time-to-diagnosis</td>
          </tr>
          <tr>
            <td className="py-2 pr-[5px] align-top">Waiting for appointment</td>
            <td className="py-2 pr-[5px] align-top">24 days<sup><a href="#references" className="text-primary no-underline hover:underline">3</a></sup></td>
          </tr>
          <tr>
            <td className="py-2 pr-[5px] align-top">Waiting for clinician in office</td>
            <td className="py-2 pr-[5px] align-top">41 minutes<sup><a href="#references" className="text-primary no-underline hover:underline">4</a></sup></td>
          </tr>
          <tr>
            <td className="py-2 pr-[5px] align-top">Consultation with clinician</td>
            <td className="py-2 pr-[5px] align-top">18.21 minutes<sup><a href="#references" className="text-primary no-underline hover:underline">4</a></sup></td>
          </tr>
          <tr>
            <td className="py-2 pr-[5px] align-top">Total</td>
            <td className="py-2 pr-[5px] align-top">24 days and 59.21 minutes</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
