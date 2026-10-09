import { useId } from 'react'

export type MarketingSectionGroup = { id: string; title: string; items: { value: string; label: string }[] }
export function MarketingSectionNavigation({ groups, value, onSelect }: { groups: MarketingSectionGroup[]; value: string; onSelect: (value: string) => void }) {
  const id = useId()
  return <nav data-marketing-section-navigation aria-label="Marketing sections">
    <div data-marketing-sidebar>
      <div className="marketing-nav-brand">Marqueta</div>
      {groups.map(group => {
        const active = group.items.some(item => item.value === value)
        return <div key={group.id} className="marketing-nav-group">
          <button type="button" className="marketing-nav-heading" aria-expanded={active} onClick={() => { if (!active) onSelect(group.items[0].value) }}>{group.title}</button>
          {active && <div className="marketing-nav-items">{group.items.map(item => <button key={item.value} type="button" aria-current={item.value === value ? 'page' : undefined} onClick={() => onSelect(item.value)}>{item.label}</button>)}</div>}
        </div>
      })}
    </div>
    <div data-marketing-mobile-navigation>
      <label htmlFor={id}>Section</label>
      <select id={id} value={value} onChange={event => onSelect(event.currentTarget.value)}>{groups.map(group => <optgroup key={group.id} label={group.title}>{group.items.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</optgroup>)}</select>
    </div>
  </nav>
}
