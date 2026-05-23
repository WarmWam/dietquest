import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppScreen, appStyles as styles } from '@/components/layout/AppScreen'

export function SplashRoute() {
  const navigate = useNavigate()

  useEffect(() => {
    const id = window.setTimeout(() => navigate('/onboarding/welcome'), 650)
    return () => window.clearTimeout(id)
  }, [navigate])

  return (
    <AppScreen hideNav>
      <div className={styles.screen}>
        <div className={styles.splashWrap}>
          <div>
            <div className={styles.logoMark}>DQ</div>
            <h1 className={styles.headerTitle} style={{ marginTop: 22 }}>
              DietQuest
            </h1>
            <p className={styles.subtitle}>Preparing today’s quest</p>
            <div className={styles.spinner} />
          </div>
        </div>
      </div>
    </AppScreen>
  )
}
