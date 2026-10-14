import { useCallback, useEffect, useRef, useState } from 'react'

interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: unknown
}

// Loads data for a page. Reload re-runs the same loader. Stale results are dropped.
export function useAsync<T>(loader: () => Promise<T>, deps: unknown[]) {
  const [state, setState] = useState<AsyncState<T>>({ data: null, loading: true, error: null })
  const runId = useRef(0)

  const run = useCallback(() => {
    const id = ++runId.current
    setState((s) => ({ ...s, loading: true, error: null }))
    loader()
      .then((data) => {
        if (id === runId.current) setState({ data, loading: false, error: null })
      })
      .catch((error: unknown) => {
        if (id === runId.current) setState({ data: null, loading: false, error })
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => {
    run()
  }, [run])

  const setData = useCallback((updater: (prev: T) => T) => {
    setState((s) => (s.data == null ? s : { ...s, data: updater(s.data) }))
  }, [])

  return { ...state, reload: run, setData }
}
