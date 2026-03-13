import { useState, useEffect, useCallback, createContext, useContext } from 'react'

const ToastContext = createContext()

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null)

  const showToast = useCallback((msg, color = 'var(--accent-green)') => {
    setToast({ msg, color })
    setTimeout(() => setToast(null), 2500)
  }, [])

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {toast && (
        <div
          className="toast"
          style={{
            border: `1px solid ${toast.color}40`,
            color: toast.color,
            boxShadow: `0 4px 20px ${toast.color}20`,
          }}
        >
          {toast.msg}
        </div>
      )}
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
