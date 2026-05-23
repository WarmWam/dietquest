import type { ReactNode } from 'react'
import { appStyles as styles } from '@/components/layout/AppScreen'
import { Icon, type IconName } from '@/components/primitives'
import { useScrollLock } from '@/hooks/useScrollLock'

type FullscreenModalProps = {
  children: ReactNode
  closeIcon?: IconName
  eyebrow?: string
  onClose: () => void
  title: string
  zIndex?: number
}

export function FullscreenModal({
  children,
  closeIcon = 'x',
  eyebrow,
  onClose,
  title,
  zIndex = 120,
}: FullscreenModalProps) {
  useScrollLock()

  return (
    <div
      aria-modal="true"
      role="dialog"
      style={{
        background: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
        inset: 0,
        overflow: 'hidden',
        overscrollBehavior: 'contain',
        position: 'fixed',
        zIndex,
      }}
    >
      <header
        className={styles.screenHeader}
        style={{
          borderBottom: '1px solid var(--line)',
          flexShrink: 0,
          margin: 0,
          padding: 'calc(env(safe-area-inset-top, 0px) + 12px) 20px 12px',
        }}
      >
        <button className={styles.iconButton} onClick={onClose} type="button">
          <Icon name={closeIcon} />
        </button>
        <div style={{ minWidth: 0, textAlign: 'center' }}>
          {eyebrow ? <p className="dq-eyebrow">{eyebrow}</p> : null}
          <strong>{title}</strong>
        </div>
        <span style={{ width: 40 }} />
      </header>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overscrollBehavior: 'contain',
          padding: '20px 20px calc(env(safe-area-inset-bottom, 0px) + 132px)',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {children}
      </div>
    </div>
  )
}
