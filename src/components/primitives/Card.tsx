import type { CSSProperties, HTMLAttributes, ReactNode } from 'react'

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode
  raised?: boolean
  padding?: number | string
}

export function Card({ children, raised = false, padding = 18, className = '', style, ...props }: CardProps) {
  const mergedStyle: CSSProperties = {
    padding,
    cursor: props.onClick ? 'pointer' : 'default',
    ...style,
  }

  return (
    <div className={`${raised ? 'dq-card' : 'dq-card-flat'} ${className}`.trim()} style={mergedStyle} {...props}>
      {children}
    </div>
  )
}
