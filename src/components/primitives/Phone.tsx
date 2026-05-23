import type { ReactNode } from 'react'
import { useTheme } from '@/hooks/useTheme'
import { BottomNav, type NavId } from './BottomNav'
import { ToastContainer } from './Toast'


type PhoneProps = {
  children: ReactNode
  hideNav?: boolean
  activeNav?: NavId
  onNav?: (id: NavId) => void
  bg?: string
  statusDark?: boolean
}

export function Phone({ children, hideNav = false, activeNav = 'home', onNav, bg }: PhoneProps) {
  const { resolvedTheme } = useTheme()
  const dark = resolvedTheme === 'dark'

  return (
    <div
      className={`dq-app ${dark ? 'dq-dark' : 'dq-light'}`}
      data-accent="aurora"
      style={{
        width: 390,
        height: 844,
        position: 'relative',
        overflow: 'hidden',
        background: bg || 'var(--bg)',
        color: 'var(--t-1)',
        isolation: 'isolate',
      }}
    >
      {children}
      <ToastContainer />
      {!hideNav && <BottomNav active={activeNav} onNav={onNav} />}
    </div>
  )
}
