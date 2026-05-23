import { useNavigate } from 'react-router-dom'
import { AppScreen, appStyles as styles } from '@/components/layout/AppScreen'
import { Button, Icon } from '@/components/primitives'
import { haptic } from '@/lib/haptic'

export function NotFoundRoute() {
  const navigate = useNavigate()

  return (
    <AppScreen hideNav>
      <div className={styles.screen}>
        <div className={styles.fullCenter}>
          <div style={{ textAlign: 'center', padding: '0 20px' }}>
            <div style={{
              width: 86,
              height: 86,
              borderRadius: '50%',
              background: 'var(--a-soft)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
            }}>
              <Icon color="var(--a1)" name="x" size={42} stroke={3} />
            </div>
            <h1 className={styles.headerTitle} style={{ fontSize: 28, marginBottom: 8 }}>
              Page not found
            </h1>
            <p className={styles.subtitle} style={{ fontSize: 15, lineHeight: 1.5 }}>
              The screen you are looking for doesn't exist or has been moved.
            </p>
          </div>
        </div>
        <Button
          onClick={() => {
            haptic(10)
            navigate('/')
          }}
          icon="chevron"
        >
          Back to home
        </Button>
      </div>
    </AppScreen>
  )
}
