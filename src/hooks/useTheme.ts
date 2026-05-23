import { useEffect, useMemo, useSyncExternalStore } from 'react'

export type ThemeMode = 'light' | 'dark' | 'auto'

const STORAGE_KEY = 'dietquest-theme'

type ThemeSnapshot = {
  mode: ThemeMode
  resolvedTheme: 'light' | 'dark'
}

const listeners = new Set<() => void>()

let mode: ThemeMode = readStoredMode()
let mediaQuery: MediaQueryList | null = null
let cachedSnapshot: ThemeSnapshot = {
  mode,
  resolvedTheme: getResolvedTheme(),
}

function readStoredMode(): ThemeMode {
  if (typeof window === 'undefined') return 'auto'

  const stored = window.localStorage.getItem(STORAGE_KEY)
  return stored === 'light' || stored === 'dark' || stored === 'auto' ? stored : 'auto'
}

function getMediaQuery() {
  if (typeof window === 'undefined') return null
  mediaQuery ??= window.matchMedia('(prefers-color-scheme: dark)')
  return mediaQuery
}

function getResolvedTheme(): 'light' | 'dark' {
  if (mode !== 'auto') return mode
  return getMediaQuery()?.matches ? 'dark' : 'light'
}

function emit() {
  cachedSnapshot = {
    mode,
    resolvedTheme: getResolvedTheme(),
  }
  listeners.forEach((listener) => listener())
}

function applyTheme() {
  if (typeof document === 'undefined') return

  const resolved = getResolvedTheme()
  document.documentElement.dataset.theme = resolved
  document.documentElement.dataset.themeMode = mode
  document.documentElement.classList.toggle('dq-dark', resolved === 'dark')
  document.documentElement.classList.toggle('dq-light', resolved === 'light')
}

function setMode(nextMode: ThemeMode) {
  mode = nextMode
  window.localStorage.setItem(STORAGE_KEY, nextMode)
  applyTheme()
  emit()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot(): ThemeSnapshot {
  return cachedSnapshot
}

function getServerSnapshot(): ThemeSnapshot {
  return {
    mode: 'auto',
    resolvedTheme: 'light',
  }
}

export function useTheme() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  useEffect(() => {
    const query = getMediaQuery()
    if (!query) return undefined

    const onChange = () => {
      applyTheme()
      emit()
    }

    applyTheme()
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  return useMemo(
    () => ({
      ...snapshot,
      setTheme: setMode,
    }),
    [snapshot],
  )
}

applyTheme()
cachedSnapshot = {
  mode,
  resolvedTheme: getResolvedTheme(),
}
