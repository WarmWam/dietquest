import { useState } from 'react'
import { AppScreen, appStyles as styles } from '@/components/layout/AppScreen'
import { Card, Icon, Skeleton } from '@/components/primitives'
import { DEFAULT_SETTINGS, PLAN_SECTIONS } from '@/data/defaults'
import { useUser } from '@/hooks/useUser'

export function PlanRoute() {
  const { profile, loading } = useUser()
  const settings = profile?.settings ?? DEFAULT_SETTINGS
  const [openSection, setOpenSection] = useState<number | null>(0)

  if (loading) {
    return (
      <AppScreen activeNav="plan">
        <div className={`${styles.screen} ${styles.withNav} ${styles.scroll}`}>
          <h1 className={styles.headerTitle}>Plan</h1>
          <Skeleton width={220} height={14} variant="text" style={{ marginTop: 4, marginBottom: 12 }} />
          <div className={styles.heroPanel} style={{ minHeight: 140 }}>
            <Skeleton width={80} height={12} variant="text" style={{ background: 'rgba(255,255,255,0.25)' }} />
            <Skeleton width="70%" height={26} variant="text" style={{ background: 'rgba(255,255,255,0.25)', marginTop: 8 }} />
            <Skeleton width="90%" height={14} variant="text" style={{ background: 'rgba(255,255,255,0.25)', marginTop: 8 }} />
          </div>
          <div className={styles.accordion} style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
            {[1, 2, 3].map((i) => (
              <Card key={i} padding={16} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Skeleton width={32} height={32} variant="circle" />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <Skeleton width="50%" height={16} variant="text" />
                  <Skeleton width="30%" height={12} variant="text" />
                </div>
              </Card>
            ))}
          </div>
        </div>
      </AppScreen>
    )
  }

  return (
    <AppScreen activeNav="plan">
      <div className={`${styles.screen} ${styles.withNav} ${styles.scroll}`}>
        <h1 className={styles.headerTitle}>Plan</h1>
        <p className={styles.subtitle}>Your reference for meals, recipes and routines.</p>
        <div className={styles.heroPanel}>
          <p className="dq-eyebrow" style={{ color: 'rgba(255,255,255,.82)' }}>Your plan</p>
          <h2 style={{ margin: '4px 0' }}>{settings.daily_kcal_target} kcal - {settings.daily_protein_target}g protein</h2>
          <p>3 meals + 1 snack - 6 days/week walk - 7.5 hr sleep</p>
        </div>
        <div className={styles.accordion}>
          {PLAN_SECTIONS.map((section, index) => {
            const isOpen = openSection === index
            return (
              <Card key={section.title} padding={0}>
                <button
                  className={styles.habitRow}
                  onClick={() => setOpenSection(isOpen ? null : index)}
                  style={{ padding: 16, width: '100%', border: 0, background: 'transparent', cursor: 'pointer', textAlign: 'left' }}
                  type="button"
                >
                  <span className={styles.mealIcon}>{section.icon}</span>
                  <span className={styles.rowText}>
                    <strong>{section.title}</strong>
                    <span className={styles.rowSub}>{section.items.length} items</span>
                  </span>
                  <Icon color="var(--t-3)" name={isOpen ? 'arrowUp' : 'chevron'} />
                </button>
                {isOpen ? (
                  <div style={{ padding: '0 16px 14px' }}>
                    {section.items.map((item) => (
                      <div className={styles.habitRow} key={item}>
                        <span className={styles.rowText}>{item}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </Card>
            )
          })}
        </div>
      </div>
    </AppScreen>
  )
}
