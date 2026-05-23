export function haptic(pattern: number | number[]): void {
  if (typeof window === 'undefined') return

  // Guard for platform vibration support
  if (!('vibrate' in navigator) || typeof navigator.vibrate !== 'function') {
    return
  }

  // Respect user setting from localStorage
  const enabled = localStorage.getItem('dq_haptics_enabled') !== 'false'
  if (!enabled) return

  try {
    navigator.vibrate(pattern)
  } catch (error) {
    // Gracefully catch security/interaction restrictions on certain browsers
    console.debug('Haptic vibration prevented:', error)
  }
}

export function setHapticsEnabled(enabled: boolean): void {
  localStorage.setItem('dq_haptics_enabled', String(enabled))
}

export function isHapticsEnabled(): boolean {
  if (typeof window === 'undefined') return true
  return localStorage.getItem('dq_haptics_enabled') !== 'false'
}
