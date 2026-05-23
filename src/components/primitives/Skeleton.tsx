import React from 'react'
import styles from './Skeleton.module.css'

type SkeletonProps = {
  width?: number | string
  height?: number | string
  radius?: number | string
  variant?: 'rect' | 'circle' | 'text'
  className?: string
  style?: React.CSSProperties
}

export function Skeleton({
  width,
  height,
  radius,
  variant = 'rect',
  className = '',
  style,
}: SkeletonProps) {
  const customStyle: React.CSSProperties = {
    width,
    height,
    borderRadius: radius ?? (variant === 'circle' ? '50%' : variant === 'text' ? 'var(--r-xs)' : 'var(--r-md)'),
    ...style,
  }

  return (
    <div
      className={`${styles.skeleton} ${styles[variant]} ${className}`}
      style={customStyle}
    />
  )
}
