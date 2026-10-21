import type { ReactNode } from 'react'

export function ToolButton({ active, disabled, onClick, label, children, danger = false }: {active?:boolean;disabled?:boolean;onClick:()=>void;label:string;children:ReactNode;danger?:boolean}) {
  return <button type="button" title={label} aria-label={label} aria-pressed={active === undefined ? undefined : active} disabled={disabled} className={`tool-button ${active ? 'active' : ''} ${danger ? 'danger' : ''}`} onClick={onClick}>{children}</button>
}

export function ToolDivider() {return <span className="tool-divider" aria-hidden="true"/>}
