import React, { createContext, useContext, useMemo, useState, useCallback } from 'react'

const ToastCtx = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const toast = useCallback(({ title, description, variant='info', duration=2500 }) => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, title, description, variant }])
    if (duration) setTimeout(() => dismiss(id), duration)
  }, [dismiss])

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss])

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className="toast-wrap">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.variant}`}>
            {t.title && <div className="title">{t.title}</div>}
            {t.description && <div className="label" style={{lineHeight:1.35}}>{t.description}</div>}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

export function useToast(){ return useContext(ToastCtx) }
