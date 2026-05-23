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

export function Phone({ children, hideNav = false, activeNav = 'home', onNav, bg, statusDark }: PhoneProps) {
  const { resolvedTheme } = useTheme()
  const dark = resolvedTheme === 'dark'
  const statusUsesDarkText = statusDark ?? !dark

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
      }}
    >
      <div style={{ height: 54, position: 'relative', zIndex: 6, paddingTop: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px' }}>
          <span style={{ color: statusUsesDarkText ? '#0F172A' : '#fff', fontSize: 15, fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
            9:41
          </span>
          <div style={{ color: statusUsesDarkText ? '#0F172A' : '#fff', display: 'flex', gap: 6, alignItems: 'center' }}>
            <svg width="17" height="11" viewBox="0 0 17 11" fill="currentColor" aria-hidden="true">
              <rect x="0" y="7" width="3" height="4" rx="0.7" />
              <rect x="4.4" y="4.6" width="3" height="6.4" rx="0.7" />
              <rect x="8.8" y="2.2" width="3" height="8.8" rx="0.7" />
              <rect x="13.2" y="0" width="3" height="11" rx="0.7" />
            </svg>
            <svg width="24" height="11" viewBox="0 0 24 11" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true">
              <rect x="0.5" y="0.5" width="21" height="10" rx="2.5" />
              <rect x="2" y="2" width="18" height="7" rx="1" fill="currentColor" />
              <path d="M23 4v3" />
            </svg>
          </div>
        </div>
      </div>
      {children}
      <ToastContainer />
      {!hideNav && <BottomNav active={activeNav} onNav={onNav} />}
    </div>
  )
}

