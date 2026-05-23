import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Icon, type IconName } from './Icon'

type ButtonVariant = 'primary' | 'secondary' | 'ghost'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  icon?: IconName
  children: ReactNode
}

export function Button({ variant = 'primary', icon, children, className = '', ...props }: ButtonProps) {
  return (
    <button className={`dq-btn dq-btn-${variant} ${className}`.trim()} type="button" {...props}>
      {icon ? <Icon name={icon} size={18} /> : null}
      {children}
    </button>
  )
}
