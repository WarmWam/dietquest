import { AppScreen, appStyles as styles } from '@/components/layout/AppScreen'
import { Button, Card, Icon } from '@/components/primitives'
import { MOCK_PLAN_SECTIONS } from '@/lib/mock'

export function PlanRoute() {
  return (
    <AppScreen activeNav="plan">
      <div className={`${styles.screen} ${styles.withNav} ${styles.scroll}`}>
        <h1 className={styles.headerTitle}>Plan</h1>
        <p className={styles.subtitle}>Your reference for meals, recipes and routines.</p>
        <Card className={styles.habitRow} padding={12} style={{ margin: '16px 0' }}>
          <Icon color="var(--t-3)" name="search" />
          <span className={styles.subtitle}>Search meals, recipes...</span>
        </Card>
        <div className={styles.heroPanel}>
          <p className="dq-eyebrow" style={{ color: 'rgba(255,255,255,.82)' }}>Your 5-month plan</p>
          <h2 style={{ margin: '4px 0' }}>1,950 kcal · 140g protein</h2>
          <p>3 meals + 1 snack · 6 days/week walk · 7.5 hr sleep</p>
          <Button icon="download" variant="secondary">Open full plan</Button>
        </div>
        <div className={styles.accordion}>
          {MOCK_PLAN_SECTIONS.map((section, index) => (
            <Card key={section.title} padding={0}>
              <div className={styles.habitRow} style={{ padding: 16 }}>
                <span className={styles.mealIcon}>{section.icon}</span>
                <span className={styles.rowText}>
                  <strong>{section.title}</strong>
                  <span className={styles.rowSub}>{section.items.length} items</span>
                </span>
                <Icon color="var(--t-3)" name={index === 0 ? 'arrowUp' : 'chevron'} />
              </div>
              {index === 0 ? (
                <div style={{ padding: '0 16px 14px' }}>
                  {section.items.map((item) => (
                    <div className={styles.habitRow} key={item}>
                      <span className={styles.rowText}>{item}</span>
                      <span className="dq-pill">Use</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </Card>
          ))}
        </div>
      </div>
    </AppScreen>
  )
}
