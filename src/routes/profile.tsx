import { useState, useEffect, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppScreen, appStyles as styles } from '@/components/layout/AppScreen'
import { Button, Card, Icon, ImageSlot, Skeleton, Stepper } from '@/components/primitives'
import { DEFAULT_PROFILE } from '@/data/defaults'
import { useAuth } from '@/hooks/useAuth'
import { useUser } from '@/hooks/useUser'
import { useWeights } from '@/hooks/useWeights'
import { toast } from '@/stores/toastStore'
import { haptic } from '@/lib/haptic'
import { upsertUser } from '@/lib/db'
import { enablePushNotifications, getNotificationPermission } from '@/lib/notifications'
import { calculateBmr } from '@/lib/nutrition'
import type { Sex } from '@/types/domain'


export function ProfileRoute() {
  const navigate = useNavigate()
  const { signOut, user } = useAuth()
  const { profile, loading, error: userError } = useUser()
  const userProfile = profile?.profile ?? DEFAULT_PROFILE
  const displayName = profile?.display_name ?? user?.displayName ?? 'DietQuest'

  // Edit profile states
  const [isEditing, setIsEditing] = useState(false)
  const [showAbout, setShowAbout] = useState(false)
  const [saving, setSaving] = useState(false)
  const [enablingPush, setEnablingPush] = useState(false)
  const [pushPermission, setPushPermission] = useState<NotificationPermission | 'unsupported'>(() => getNotificationPermission())
  const [notifications, setNotifications] = useState({
    breakfast: true,
    lunch: true,
    water: false,
    workout: true,
    bedtime: true,
  })

  // Goal progress
  const { data: weights, error: weightsError } = useWeights(60)
  const latestWeight = weights[weights.length - 1]
  const totalToLose = userProfile.weight_start_kg - userProfile.weight_target_kg
  const lost = userProfile.weight_start_kg - (latestWeight?.weight_kg ?? userProfile.weight_start_kg)
  const goalPct = totalToLose > 0 ? Math.min(Math.max(lost / totalToLose, 0), 1) : 0

  // Edit draft states
  const [sex, setSex] = useState<Sex>('male')
  const [age, setAge] = useState(30)
  const [height, setHeight] = useState(170)
  const [weightStart, setWeightStart] = useState(80.0)
  const [weightTarget, setWeightTarget] = useState(65.0)
  const [months, setMonths] = useState(6)

  useEffect(() => {
    if (userError || weightsError) toast.error("Couldn't load profile data. Try again.")
  }, [userError, weightsError])

  useEffect(() => {
    if (profile?.profile) {
      setSex(profile.profile.sex)
      setAge(profile.profile.age)
      setHeight(profile.profile.height_cm)
      setWeightStart(profile.profile.weight_start_kg)
      setWeightTarget(profile.profile.weight_target_kg)
      
      const now = new Date()
      const end = new Date(profile.profile.target_date)
      const diff = Math.max(3, (end.getFullYear() - now.getFullYear()) * 12 + end.getMonth() - now.getMonth())
      setMonths(diff)
    }
    if (profile?.settings?.notifications) {
      setNotifications(profile.settings.notifications)
    }
  }, [isEditing, profile])

  if (loading) {
    return (
      <AppScreen activeNav="profile">
        <div className={`${styles.screen} ${styles.withNav} ${styles.scroll}`}>
          <h1 className={styles.headerTitle}>Profile</h1>
          <Card className={styles.habitRow} raised padding={18} style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
            <Skeleton width={64} height={64} variant="circle" />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Skeleton width="60%" height={18} variant="text" />
              <Skeleton width="40%" height={12} variant="text" />
            </div>
          </Card>
          <Card padding={16} style={{ margin: '14px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Skeleton width={50} height={12} variant="text" />
            <Skeleton width={120} height={32} variant="text" />
            <Skeleton width={160} height={14} variant="text" />
            <Skeleton width="100%" height={6} radius="3px" style={{ marginTop: 6 }} />
          </Card>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ marginBottom: 12 }}>
              <Skeleton width={80} height={12} variant="text" style={{ marginBottom: 8 }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Card padding={14} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Skeleton width="40%" height={16} variant="text" />
                  <Skeleton width={20} height={20} variant="circle" />
                </Card>
              </div>
            </div>
          ))}
        </div>
      </AppScreen>
    )
  }

  async function handleSaveProfile() {
    if (!user) return
    setSaving(true)
    
    const bmr = calculateBmr({
      sex,
      weightKg: weightStart,
      heightCm: height,
      age,
    })
    const tdee = Math.round(bmr * 1.5)
    
    const endDate = new Date()
    endDate.setMonth(endDate.getMonth() + months)
    
    const dailyDeficit = ((weightStart - weightTarget) * 7700) / (months * 30)
    const dailyKcal = Math.max(1200, Math.round(tdee - dailyDeficit))
    const dailyProtein = Math.round(weightTarget * 1.8)

    try {
      await upsertUser(user.uid, {
        profile: {
          sex,
          age,
          height_cm: height,
          weight_start_kg: weightStart,
          weight_target_kg: weightTarget,
          target_date: endDate,
        },
        settings: {
          ...profile?.settings,
          daily_kcal_target: dailyKcal,
          daily_protein_target: dailyProtein,
        }
      })
      toast.success("Profile targets synced!")
      haptic(10)
      setIsEditing(false)
    } catch (err) {
      console.error(err)
      toast.error("Failed to update profile.")
      haptic([20, 40, 20])
    } finally {
      setSaving(false)
    }
  }

  function handleSignOut() {
    const ok = window.confirm("Are you sure you want to sign out?")
    if (ok) {
      void signOut()
      toast.success("Signed out successfully")
      haptic(10)
      navigate('/login')
    }
  }

  async function handleToggleNotification(key: string) {
    if (!user) return
    const next = {
      ...notifications,
      [key]: !notifications[key as keyof typeof notifications],
    }
    setNotifications(next)
    haptic(5)
    try {
      await upsertUser(user.uid, {
        settings: {
          ...profile?.settings,
          notifications: next,
        },
      })
    } catch (err) {
      console.error(err)
      toast.error("Couldn't save preference.")
    }
  }

  async function handleEnablePush() {
    if (!user || enablingPush) return
    setEnablingPush(true)
    const result = await enablePushNotifications(user.uid)
    setPushPermission(getNotificationPermission())
    setEnablingPush(false)

    if (result.ok === true) {
      toast.success('Notifications enabled for this device.')
      haptic(10)
      return
    }

    toast.error(result.message)
    haptic([20, 40, 20])
  }

  const pushStatus =
    pushPermission === 'granted'
      ? 'Enabled on this device'
      : pushPermission === 'denied'
        ? 'Blocked in iOS Settings'
        : pushPermission === 'unsupported'
          ? 'Not supported on this device'
          : 'Allow browser to send reminders'

  return (
    <AppScreen activeNav="profile">
      <div className={`${styles.screen} ${styles.withNav} ${styles.scroll}`}>
        <h1 className={styles.headerTitle}>Profile</h1>
        <Card raised padding={18} style={{ marginTop: 14, position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingRight: 44 }}>
            <ImageSlot id="avatar" placeholder={displayName[0] ?? 'D'} shape="circle" style={{ width: 64, height: 64, minHeight: 64 }} />
            <span className={styles.rowText}>
              <strong>{displayName}</strong>
              <span className={styles.rowSub}>{userProfile.age} - {userProfile.height_cm} cm - Firebase sync on</span>
            </span>
          </div>
          <button aria-label="Edit profile" className={styles.iconButton} onClick={() => setIsEditing(true)} type="button" style={{ position: 'absolute', right: 16, top: 16 }}>
            <Icon name="edit" size={18} />
          </button>
        </Card>
        <Card padding={16} style={{ margin: '14px 0' }}>
          <p className="dq-eyebrow">Goal</p>
          <strong className="dq-num" style={{ fontSize: 28 }}>
            {userProfile.weight_target_kg.toFixed(1)} kg
          </strong>
          <p className={styles.subtitle}>
            {lost.toFixed(1)} kg of {totalToLose.toFixed(1)} kg ({Math.round(goalPct * 100)}%)
          </p>
          <div className={styles.progressBar} style={{ marginTop: 12 }}>
            <div className={styles.progressFill} style={{ width: `${goalPct * 100}%` }} />
          </div>
        </Card>

        <Section title="Notifications">
          <div className={styles.settingRow}>
            <Icon color="var(--a1)" name="bell" />
            <span className={styles.rowText}>
              <strong>Push notifications</strong>
              <span className={styles.rowSub}>{pushStatus}</span>
            </span>
            {pushPermission === 'granted' || pushPermission === 'unsupported' ? (
              <span className={styles.rowSub}>{pushPermission === 'granted' ? 'On' : 'N/A'}</span>
            ) : (
              <Button disabled={enablingPush} onClick={() => void handleEnablePush()} variant="secondary" style={{ height: 34, padding: '0 12px', fontSize: 13 }}>
                {enablingPush ? '...' : 'Enable'}
              </Button>
            )}
          </div>
          {[
            { key: 'breakfast', label: 'Breakfast reminder (06:30)', icon: 'sun' as const },
            { key: 'lunch', label: 'Lunch reminder (11:00)', icon: 'fork' as const },
            { key: 'water', label: 'Water (every 2h)', icon: 'drop' as const },
            { key: 'workout', label: 'Workout reminder (16:30)', icon: 'walk' as const },
            { key: 'bedtime', label: 'Bedtime reminder (22:30)', icon: 'moon' as const },
          ].map((item) => (
            <div className={styles.settingRow} key={item.key}>
              <Icon color="var(--a1)" name={item.icon} />
              <span className={styles.rowText}>{item.label}</span>
              <button
                className={styles.switch}
                data-on={notifications[item.key as keyof typeof notifications]}
                onClick={() => void handleToggleNotification(item.key)}
                type="button"
              >
                <span className={styles.switchKnob} />
              </button>
            </div>
          ))}
        </Section>

        <Button onClick={handleSignOut} variant="ghost" style={{ color: '#991B1B', fontWeight: 800 }}>
          Sign out
        </Button>
      </div>

      {/* Edit Profile modal sheet overlay */}
      {isEditing && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(15,23,42,0.4)',
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
        }}>
          <div className={styles.sheet} style={{ height: '80%', display: 'flex', flexDirection: 'column' }}>
            <div className={styles.sheetHandle} />
            <header className={styles.screenHeader}>
              <button className={styles.iconButton} onClick={() => setIsEditing(false)} type="button">
                <Icon name="x" />
              </button>
              <strong>Edit settings</strong>
              <span style={{ width: 40 }} />
            </header>
            <div className={styles.sheetItems} style={{ flex: 1, overflowY: 'auto', padding: '0 20px 24px' }}>
              <p className={styles.fieldLabel}>Sex</p>
              <div className="dq-seg" style={{ width: '100%', marginBottom: 18 }}>
                {['Male', 'Female', 'Other'].map((label) => {
                  const option = label.toLowerCase() as Sex
                  return (
                    <button
                      className="dq-seg-item"
                      data-active={sex === option}
                      key={label}
                      onClick={() => setSex(option)}
                      type="button"
                      style={{ flex: 1, justifyContent: 'center', border: 0, background: 'transparent', outline: 'none' }}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <Stepper label="Age" suffix="yrs" value={age} onChange={setAge} min={13} max={100} />
                <Stepper label="Height" suffix="cm" value={height} onChange={setHeight} min={120} max={230} />
              </div>

              <Stepper label="Current weight" suffix="kg" value={weightStart} onChange={setWeightStart} min={30} max={300} step={0.1} />
              <div style={{ height: 12 }} />
              <Stepper label="Target weight" suffix="kg" value={weightTarget} onChange={setWeightTarget} min={40} max={weightStart - 1} step={0.5} />
              
              <div style={{ height: 18 }} />
              <p className={styles.fieldLabel}>Timeline</p>
              <Card padding={16} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className={styles.screenHeader}>
                  <strong className="dq-num" style={{ fontSize: 22 }}>
                    {months} months
                  </strong>
                </div>
                <input
                  type="range"
                  min={3}
                  max={12}
                  value={months}
                  onChange={(e) => setMonths(Number(e.target.value))}
                  style={{
                    width: '100%',
                    height: '6px',
                    borderRadius: '3px',
                    background: 'var(--bg-soft)',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                />
              </Card>
              
              <div style={{ height: 20 }} />
              <Button disabled={saving} onClick={() => void handleSaveProfile()}>
                {saving ? "Saving changes..." : "Save settings"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* About DietQuest sheet */}
      {showAbout && (
        <>
          <button
            aria-label="Close about sheet"
            onClick={() => setShowAbout(false)}
            type="button"
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(15,23,42,0.4)',
              zIndex: 100,
              border: 0,
              cursor: 'pointer',
            }}
          />
          <div className={styles.sheet} style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 101,
          }}>
            <div className={styles.sheetHandle} />
            <header className={styles.screenHeader}>
              <span style={{ width: 40 }} />
              <strong>About DietQuest</strong>
              <button className={styles.iconButton} onClick={() => setShowAbout(false)} type="button">
                <Icon name="x" />
              </button>
            </header>
            <div style={{ padding: '0 20px 32px', display: 'flex', flexDirection: 'column', gap: 16, textAlign: 'center' }}>
              <div>
                <strong className="dq-num" style={{ fontSize: 24 }}>DietQuest</strong>
                <p className={styles.subtitle}>v1.0.1</p>
              </div>
              <p className={styles.subtitle}>
                Built with Vite + React + Firebase
              </p>
              <a
                href="https://github.com/WarmWam/dietquest"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--a1)', fontWeight: 700, fontSize: 13 }}
              >
                github.com/WarmWam/dietquest
              </a>
              <p className={styles.subtitle} style={{ fontSize: 11 }}>
                © 2026 DietQuest. All rights reserved.
              </p>
            </div>
          </div>
        </>
      )}
    </AppScreen>
  )
}



function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ flexShrink: 0 }}>
      <div className={styles.sectionLabel}><span className="dq-eyebrow">{title}</span></div>
      <div className={styles.settingList}>{children}</div>
      <div style={{ height: 16 }} />
    </section>
  )
}
