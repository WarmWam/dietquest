import { useNavigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { AppScreen, appStyles as styles } from '@/components/layout/AppScreen'
import { Button, Card, Icon, ImageSlot } from '@/components/primitives'
import { DEFAULT_PROFILE } from '@/data/defaults'
import { useAuth } from '@/hooks/useAuth'
import { useTheme, type ThemeMode } from '@/hooks/useTheme'
import { useUser } from '@/hooks/useUser'

export function ProfileRoute() {
  const { mode, setTheme } = useTheme()
  const navigate = useNavigate()
  const { signOut, user } = useAuth()
  const { profile } = useUser()
  const userProfile = profile?.profile ?? DEFAULT_PROFILE
  const displayName = profile?.display_name ?? user?.displayName ?? 'DietQuest'
  const targetSpan = Math.abs(userProfile.weight_start_kg - userProfile.weight_target_kg)

  return (
    <AppScreen activeNav="profile">
      <div className={`${styles.screen} ${styles.withNav} ${styles.scroll}`}>
        <h1 className={styles.headerTitle}>Profile</h1>
        <Card className={styles.habitRow} raised padding={18} style={{ marginTop: 14 }}>
          <ImageSlot id="avatar" placeholder={displayName[0] ?? 'D'} shape="circle" style={{ width: 64, height: 64, minHeight: 64 }} />
          <span className={styles.rowText}>
            <strong>{displayName}</strong>
            <span className={styles.rowSub}>{userProfile.age} - {userProfile.height_cm} cm - Firebase sync on</span>
          </span>
        </Card>
        <Card padding={16} style={{ margin: '14px 0' }}>
          <p className="dq-eyebrow">Goal</p>
          <strong className="dq-num" style={{ fontSize: 28 }}>
            {userProfile.weight_target_kg.toFixed(1)} kg
          </strong>
          <p className={styles.subtitle}>{targetSpan.toFixed(1)} kg target span</p>
          <div className={styles.progressBar} style={{ marginTop: 12 }}>
            <div className={styles.progressFill} style={{ width: '12%' }} />
          </div>
        </Card>

        <Section title="Theme">
          {(['light', 'dark', 'auto'] as ThemeMode[]).map((theme) => (
            <button className={styles.settingRow} key={theme} onClick={() => setTheme(theme)} type="button">
              <Icon color="var(--a1)" name={theme === 'dark' ? 'moon' : theme === 'light' ? 'sun' : 'settings'} />
              <span className={styles.rowText}>{theme}</span>
              <span className="dq-check" data-on={mode === theme}>{mode === theme ? <Icon color="#fff" name="check" size={14} /> : null}</span>
            </button>
          ))}
        </Section>

        <Section title="Notifications">
          {['Breakfast 06:30', 'Lunch 11:00', 'Water every 2h', 'Walk 16:30', 'Bedtime 22:30'].map((item, index) => (
            <div className={styles.settingRow} key={item}>
              <span className={styles.rowText}>{item}</span>
              <button className={styles.switch} data-on={index < 4} type="button"><span className={styles.switchKnob} /></button>
            </div>
          ))}
        </Section>

        <Section title="Data">
          <div className={styles.settingRow}><Icon name="download" /><span className={styles.rowText}>Export data</span><span className={styles.rowSub}>CSV</span></div>
          <div className={styles.settingRow}><Icon name="info" /><span className={styles.rowText}>About DietQuest</span><span className={styles.rowSub}>v1.0.0</span></div>
        </Section>

        <Button
          onClick={() => {
            void signOut()
            navigate('/login')
          }}
          variant="ghost"
        >
          Sign out
        </Button>
      </div>
    </AppScreen>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <div className={styles.sectionLabel}><span className="dq-eyebrow">{title}</span></div>
      <div className={styles.settingList}>{children}</div>
      <div style={{ height: 16 }} />
    </>
  )
}
