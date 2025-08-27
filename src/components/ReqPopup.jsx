import React from 'react'

/**
 * Requirements popup.
 * items: [{ id, label, ok }]
 * show: boolean
 * alignRight: boolean (optional)
 * ariaId: string (unique per field)
 */
export default function ReqPopup({ title='Requirements', description='', items=[], show=false, alignRight=false, ariaId }) {
  if (!show) return null
  return (
    <div
      className={'popover' + (alignRight ? ' right' : '')}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      id={ariaId}
    >
      {title && <div className="title">{title}</div>}
      {description && <div className="desc">{description}</div>}
      <div>
        {items.map(it => (
          <div key={it.id} className={'req ' + (it.ok ? 'req-ok' : 'req-bad')}>
            <div className="dot" aria-hidden="true" />
            <div className="text">{it.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
