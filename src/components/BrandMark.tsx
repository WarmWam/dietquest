import { appStyles as styles } from '@/components/layout/AppScreen'

type BrandMarkProps = {
  size?: number
}

export function BrandMark({ size = 86 }: BrandMarkProps) {
  return (
    <div className={styles.logoMark} style={{ width: size, height: size }}>
      <img alt="" src="/icons/icon-192.png" style={{ width: '100%', height: '100%', borderRadius: 'inherit' }} />
    </div>
  )
}
