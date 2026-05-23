import { useState } from 'react'
import { useTheme, type ThemeMode } from '@/hooks/useTheme'
import { BottomNav, Button, Card, Icon, ImageSlot, Phone, Ring, type IconName, type NavId } from '@/components/primitives'
import styles from './_design-system.module.css'

const iconNames: IconName[] = [
  'home',
  'chart',
  'plus',
  'list',
  'user',
  'drop',
  'walk',
  'moon',
  'bell',
  'target',
  'sun',
  'play',
  'camera',
  'star',
  'search',
  'settings',
  'egg',
  'fish',
  'apple',
  'dumbbell',
  'fork',
  'photo',
  'bolt',
  'trend',
  'leaf',
]

const themeModes: ThemeMode[] = ['light', 'dark', 'auto']

export function DesignSystemRoute() {
  const { mode, resolvedTheme, setTheme } = useTheme()
  const [activeNav, setActiveNav] = useState<NavId>('home')

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>DietQuest Design System</h1>
            <p className={styles.subtitle}>
              Primitive components ported from the prototype, using the production token sheet and the app theme hook.
            </p>
          </div>
          <div className={styles.themeControl} aria-label="Theme">
            {themeModes.map((themeMode) => (
              <button
                className={styles.themeButton}
                data-active={mode === themeMode}
                key={themeMode}
                onClick={() => setTheme(themeMode)}
                type="button"
              >
                {themeMode}
              </button>
            ))}
          </div>
        </header>

        <div className={styles.grid}>
          <div className={styles.panel}>
            <Card raised padding={20}>
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Buttons</h2>
                <div className={styles.row}>
                  <Button icon="plus">Log meal</Button>
                  <Button icon="target" variant="secondary">
                    Adjust goal
                  </Button>
                  <Button icon="settings" variant="ghost">
                    Settings
                  </Button>
                </div>
              </section>
            </Card>

            <Card padding={20}>
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Icons</h2>
                <div className={styles.iconGrid}>
                  {iconNames.map((iconName) => (
                    <div className={styles.iconCell} key={iconName} title={iconName}>
                      <Icon name={iconName} />
                    </div>
                  ))}
                </div>
              </section>
            </Card>

            <Card raised padding={20}>
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Ring + Image Slot</h2>
                <div className={styles.row}>
                  <Ring size={178} eaten={1240} target={1950} protein={78} proteinTarget={140} />
                  <ImageSlot className={styles.placeholder} id="design-image-slot" placeholder="Drop progress photo" />
                </div>
              </section>
            </Card>

            <Card padding={20}>
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Bottom Nav</h2>
                <div style={{ height: 96, position: 'relative', borderRadius: 'var(--r-xl)', overflow: 'hidden', background: 'var(--bg)' }}>
                  <BottomNav active={activeNav} onNav={setActiveNav} />
                </div>
              </section>
            </Card>
          </div>

          <Phone activeNav={activeNav} onNav={setActiveNav}>
            <div className={styles.phoneContent}>
              <div className={styles.phoneScroll}>
                <div className={styles.phoneHeader}>
                  <div>
                    <div className="dq-eyebrow">theme {resolvedTheme}</div>
                    <h2 className={styles.phoneTitle}>Today</h2>
                  </div>
                  <span className="dq-pill">
                    <Icon name="flame" size={16} fill="var(--a1)" />
                    6 day
                  </span>
                </div>

                <Card raised padding={18}>
                  <Ring size={230} eaten={1240} target={1950} protein={78} proteinTarget={140} />
                  <div className={styles.statGrid}>
                    <div className={`dq-card-flat ${styles.stat}`} style={{ padding: 14 }}>
                      <Icon name="drop" color="var(--a1)" />
                      <span className={styles.statValue}>1.5 L</span>
                      <span className="dq-eyebrow">water</span>
                    </div>
                    <div className={`dq-card-flat ${styles.stat}`} style={{ padding: 14 }}>
                      <Icon name="walk" color="var(--success)" />
                      <span className={styles.statValue}>45m</span>
                      <span className="dq-eyebrow">walk</span>
                    </div>
                  </div>
                </Card>

                <div style={{ height: 14 }} />

                <Card padding={16}>
                  <div className="dq-row">
                    <div className="dq-check" data-on="true">
                      <Icon name="check" size={14} color="#fff" stroke={3} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <strong>Breakfast</strong>
                      <div style={{ color: 'var(--t-2)', fontSize: 12 }}>Whey, eggs, banana</div>
                    </div>
                    <span className="dq-num" style={{ color: 'var(--a1)', fontWeight: 800 }}>
                      350
                    </span>
                  </div>
                </Card>
              </div>
            </div>
          </Phone>
        </div>
      </div>
    </main>
  )
}
