import { useNavigate } from 'react-router-dom'
import { AppScreen, appStyles as styles } from '@/components/layout/AppScreen'
import { Button, Icon } from '@/components/primitives'

export function AchievementRoute() {
  const navigate = useNavigate()

  return (
    <AppScreen bg="linear-gradient(180deg, #5B6CFF 0%, #B17AFF 60%, #FF6B9D 100%)" hideNav statusDark={false}>
      <div className={styles.screen} style={{ color: '#fff', textAlign: 'center' }}>
        {Array.from({ length: 22 }, (_, index) => (
          <span
            className={styles.confetti}
            key={index}
            style={{
              top: `${10 + (index * 7) % 70}%`,
              left: `${(index * 13) % 100}%`,
              background: ['#FBBF24', '#34D399', '#F472B6', '#fff'][index % 4],
            }}
          />
        ))}
        <div className={styles.screenHeader} style={{ justifyContent: 'flex-end' }}>
          <button className={styles.iconButton} onClick={() => navigate('/')} style={{ color: '#fff', borderColor: 'rgba(255,255,255,.3)' }} type="button">
            <Icon color="#fff" name="x" />
          </button>
        </div>
        <div className={styles.fullCenter}>
          <div>
            <div className={styles.badge}>
              <div>
                <div className="dq-num" style={{ fontSize: 82, fontWeight: 900 }}>-2</div>
                <strong>kilograms</strong>
              </div>
            </div>
            <p style={{ fontWeight: 900, letterSpacing: '.14em' }}>MILESTONE UNLOCKED</p>
            <h1 style={{ fontSize: 36, lineHeight: 1.1 }}>First 2 kg in the books!</h1>
            <p>14 days of logging, 11 walks completed, and you’re on pace for November.</p>
          </div>
        </div>
        <div className={styles.metricGrid}>
          <Button icon="share" variant="secondary">Share</Button>
          <Button onClick={() => navigate('/')}>Continue</Button>
        </div>
      </div>
    </AppScreen>
  )
}
