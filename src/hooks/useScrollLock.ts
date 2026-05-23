import { useEffect } from 'react'

// Track multiple modals — only release lock when all unmount
let lockCount = 0
let savedScrollY = 0

/**
 * Lock document scroll while a modal/sheet is mounted.
 * Restores scroll position on unmount.
 *
 * iOS Safari needs position:fixed on body to truly prevent rubber-band
 * scroll bouncing the underlying page when user drags inside the modal.
 */
export function useScrollLock() {
  useEffect(() => {
    if (lockCount === 0) {
      savedScrollY = window.scrollY
      document.body.style.position = 'fixed'
      document.body.style.top = `-${savedScrollY}px`
      document.body.style.left = '0'
      document.body.style.right = '0'
      document.body.style.overflow = 'hidden'
    }
    lockCount += 1

    return () => {
      lockCount -= 1
      if (lockCount === 0) {
        document.body.style.position = ''
        document.body.style.top = ''
        document.body.style.left = ''
        document.body.style.right = ''
        document.body.style.overflow = ''
        window.scrollTo(0, savedScrollY)
      }
    }
  }, [])
}
