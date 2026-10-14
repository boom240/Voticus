import Alert, { type AlertColor } from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'
import { createContext, useCallback, useContext, useMemo, useState, type PropsWithChildren } from 'react'

interface Toast {
  id: number
  message: string
  severity: AlertColor
}

interface ToastValue {
  showToast: (message: string, severity?: AlertColor) => void
}

const ToastContext = createContext<ToastValue | undefined>(undefined)

// Errors and confirmations show as a toast rather than a full-page alert.
export function ToastProvider({ children }: PropsWithChildren) {
  const [queue, setQueue] = useState<Toast[]>([])

  const showToast = useCallback((message: string, severity: AlertColor = 'success') => {
    setQueue((q) => [...q, { id: Date.now() + Math.random(), message, severity }])
  }, [])

  const current = queue[0]
  const dismiss = () => setQueue((q) => q.slice(1))
  const value = useMemo(() => ({ showToast }), [showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Snackbar
        key={current?.id}
        open={current != null}
        autoHideDuration={current?.severity === 'error' ? 8000 : 4000}
        onClose={(_, reason) => {
          if (reason !== 'clickaway') dismiss()
        }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {current ? (
          <Alert
            onClose={dismiss}
            severity={current.severity}
            variant="filled"
            sx={{ width: '100%' }}
            role={current.severity === 'error' ? 'alert' : 'status'}
          >
            {current.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </ToastContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}
