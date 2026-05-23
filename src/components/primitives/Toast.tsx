import React from 'react'
import { createPortal } from 'react-dom'
import { useToastStore, type ToastItem } from '@/stores/toastStore'
import { Icon } from './Icon'
import styles from './Toast.module.css'

export function ToastContainer() {
  const toasts = useToastStore((state) => state.toasts)
  const removeToast = useToastStore((state) => state.removeToast)

  if (typeof window === 'undefined' || toasts.length === 0) return null

  return createPortal(
    <div className={styles.container}>
      {toasts.map((item) => (
        <ToastCard key={item.id} item={item} onClose={() => removeToast(item.id)} />
      ))}
    </div>,
    document.body
  )
}

function ToastCard({ item, onClose }: { item: ToastItem; onClose: () => void }) {
  const [isDismissing, setIsDismissing] = React.useState(false)

  const handleDismiss = () => {
    setIsDismissing(true)
    setTimeout(onClose, 200)
  }

  const iconName = item.type === 'success' ? 'check' : item.type === 'error' ? 'x' : 'info'
  const color = item.type === 'success' ? 'var(--success)' : item.type === 'error' ? 'var(--danger)' : 'var(--a1)'

  return (
    <div
      className={`${styles.toast} ${styles[item.type]} ${isDismissing ? styles.dismissing : ''}`}
      onClick={handleDismiss}
      style={{ cursor: 'pointer' }}
      role="alert"
    >
      <span className={styles.icon} style={{ color }}>
        <Icon name={iconName} size={16} stroke={3} />
      </span>
      <span className={styles.message}>{item.message}</span>
    </div>
  )
}
