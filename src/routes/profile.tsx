import { useState, useEffect, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppScreen, appStyles as styles } from '@/components/layout/AppScreen'
import { Button, Card, Icon, ImageSlot, Skeleton, Stepper } from '@/components/primitives'
import { DEFAULT_PROFILE } from '@/data/defaults'
import { useAnalysisUsage } from '@/hooks/useAnalysisUsage'
import { useAnalyses } from '@/hooks/useAnalyses'
import { useAuth } from '@/hooks/useAuth'
import { useUser } from '@/hooks/useUser'
import { useWeights } from '@/hooks/useWeights'
import { toast } from '@/stores/toastStore'
import { haptic } from '@/lib/haptic'
import { getDayTotalsRange, getMealsRange, getSleepRange, getWorkoutsRange, saveAnalysis, saveAnalysisUsage, upsertUser } from '@/lib/db'
import { enablePushNotifications, getNotificationPermission } from '@/lib/notifications'
import { calculateBmr } from '@/lib/nutrition'
import type { AnalysisPeriod, GeminiModelId, HealthAnalysis, Sex } from '@/types/domain'

const GEMINI_MODELS: Array<{ id: GeminiModelId; label: string; limit: number }> = [
  { id: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash', limit: 20 },
  { id: 'gemini-3-flash', label: 'Gemini 3 Flash', limit: 20 },
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', limit: 20 },
  { id: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash Lite', limit: 500 },
  { id: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite', limit: 20 },
]

export function ProfileRoute() {
  const navigate = useNavigate()
  const { signOut, user } = useAuth()
  const { profile, loading, error: userError } = useUser()
  const userProfile = profile?.profile ?? DEFAULT_PROFILE
  const displayName = profile?.display_name ?? user?.displayName ?? 'DietQuest'
  const avatarUrl = user?.photoURL ?? undefined

  // Edit profile states
  const [isEditing, setIsEditing] = useState(false)
  const [showAbout, setShowAbout] = useState(false)
  const [showAnalysis, setShowAnalysis] = useState(false)
  const [saving, setSaving] = useState(false)
  const [analysisPeriod, setAnalysisPeriod] = useState<AnalysisPeriod>('day')
  const [analysisDate, setAnalysisDate] = useState(todayInputValue())
  const [analysisModel, setAnalysisModel] = useState<GeminiModelId>('gemini-3.5-flash')
  const [analyzing, setAnalyzing] = useState(false)
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
  const { data: analyses, error: analysesError } = useAnalyses()
  const { data: analysisUsage, error: analysisUsageError } = useAnalysisUsage()
  const selectedModelMeta = GEMINI_MODELS.find((model) => model.id === analysisModel) ?? GEMINI_MODELS[0]
  const selectedModelUsed = analysisUsage.filter((usage) => usage.model_id === analysisModel).length
  const selectedModelLimitReached = selectedModelUsed >= selectedModelMeta.limit
  const selectedAnalysisStart = analysisPeriod === 'week' ? addDays(analysisDate, -6) : analysisDate
  const selectedAnalysis = findAnalysis(analyses, analysisPeriod, selectedAnalysisStart, analysisDate)
  const latestAnalysis = analyses[0]
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
  const [sugarTarget, setSugarTarget] = useState(36)

  useEffect(() => {
    if (userError || weightsError || analysesError || analysisUsageError) toast.error("Couldn't load profile data. Try again.")
  }, [userError, weightsError, analysesError, analysisUsageError])

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
    if (profile?.settings?.daily_sugar_target) {
      setSugarTarget(profile.settings.daily_sugar_target)
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
          daily_sugar_target: sugarTarget,
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

  async function handleRunAnalysis() {
    if (!user || analyzing || selectedModelLimitReached) return
    setAnalyzing(true)
    try {
      const endDate = analysisDate
      const dates = analysisPeriod === 'week' ? getDateRange(addDays(endDate, -6), endDate) : [endDate]
      const startDate = dates[0]
      const [totals, meals, workouts, sleeps] = await Promise.all([
        getDayTotalsRange(user.uid, dates),
        getMealsRange(user.uid, startDate, endDate),
        getWorkoutsRange(user.uid, startDate, endDate),
        getSleepRange(user.uid, dates),
      ])
      const idToken = await user.getIdToken()
      const payload = {
        uid: user.uid,
        model_id: analysisModel,
        period: analysisPeriod,
        start_date: startDate,
        end_date: endDate,
        targets: {
          kcal: profile?.settings?.daily_kcal_target ?? 0,
          protein_g: profile?.settings?.daily_protein_target ?? 0,
          water_ml: 3000,
          sleep_hours: 8,
        },
        days: dates.map((date) => ({
          date,
          totals: totals.find((item) => item.date === date)?.totals,
          meals: meals
            .filter((meal) => meal.date === date)
            .map((meal) => ({
              type: meal.meal_type,
              total_kcal: meal.total_kcal,
              total_protein_g: meal.total_protein_g,
              items: meal.items.map((item) => ({
                name: item.name,
                portion: item.portion,
                kcal: item.kcal,
                protein_g: item.protein_g,
              })),
            })),
          workouts: workouts
            .filter((workout) => workout.date === date)
            .map((workout) => ({ type: workout.type, kcal_burned: workout.kcal_burned, duration_min: workout.duration_min })),
          sleep: sleeps.find((sleep) => sleep.date === date)
            ? {
                duration_min: sleeps.find((sleep) => sleep.date === date)?.duration_min,
                bedtime: sleeps.find((sleep) => sleep.date === date)?.bedtime,
                wake_time: sleeps.find((sleep) => sleep.date === date)?.wake_time,
              }
            : null,
        })),
      }

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
      const rawResult = await response.text()
      const result = rawResult ? parseAnalysisResponse(rawResult) : {}
      if (!response.ok) throw new Error(result.error || 'Analysis failed')

      await saveAnalysis(user.uid, {
        period: analysisPeriod,
        model_id: analysisModel,
        start_date: startDate,
        end_date: endDate,
        summary: result.summary,
        wins: result.wins ?? [],
        risks: result.risks ?? [],
        actions: result.actions ?? [],
      })
      await saveAnalysisUsage(user.uid, analysisModel, todayInputValue())
      toast.success('Analysis saved.')
      haptic(10)
    } catch (err) {
      console.error(err)
      toast.error(err instanceof Error ? err.message : "Couldn't analyze this range.")
      haptic([20, 40, 20])
    } finally {
      setAnalyzing(false)
    }
  }

  const pushStatus =
    pushPermission === 'granted'
      ? 'Enabled on this device'
      : pushPermission === 'denied'
        ? 'Blocked in iOS Settings'
        : pushPermission === 'unsupported'
          ? 'Not supported on this device'
          : ''
  const pushIsOn = pushPermission === 'granted'
  const pushDisabled = pushPermission === 'denied' || pushPermission === 'unsupported' || enablingPush

  return (
    <AppScreen activeNav="profile">
      <div className={`${styles.screen} ${styles.withNav} ${styles.scroll}`}>
        <h1 className={styles.headerTitle}>Profile</h1>
        <Card raised padding={18} style={{ marginTop: 14, position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingRight: 44 }}>
            <ImageSlot id="avatar" placeholder={displayName[0] ?? 'D'} shape="circle" src={avatarUrl} style={{ width: 64, height: 64, minHeight: 64 }} />
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
              {pushStatus ? <span className={styles.rowSub}>{pushStatus}</span> : null}
            </span>
            <button
              aria-label="Toggle push notifications"
              className={styles.switch}
              data-on={pushIsOn}
              disabled={pushDisabled}
              onClick={() => { if (!pushIsOn && !pushDisabled) void handleEnablePush() }}
              type="button"
              style={pushDisabled && !pushIsOn ? { opacity: 0.4 } : undefined}
            >
              <span className={styles.switchKnob} />
            </button>
          </div>
          {pushIsOn && [
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
                aria-label={`Toggle ${item.label}`}
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

        <Section title="Analysis">
          <button className={styles.settingRow} onClick={() => setShowAnalysis(true)} type="button" style={{ border: 0, textAlign: 'left', width: '100%' }}>
            <Icon color="var(--a1)" name="sparkle" />
            <span className={styles.rowText}>
              <strong>Analysis view</strong>
              <span className={styles.rowSub}>
                {latestAnalysis ? `Latest: ${latestAnalysis.period === 'week' ? '7 days' : 'Daily'} · ${formatRangeLabel(latestAnalysis.start_date, latestAnalysis.end_date)}` : 'Choose a date and analyze your health data.'}
              </span>
            </span>
            <Icon color="var(--t-3)" name="chevron" />
          </button>
        </Section>

        <Button onClick={handleSignOut} variant="ghost" style={{ color: '#991B1B', fontWeight: 800 }}>
          Sign out
        </Button>
      </div>

      {/* Edit Profile modal sheet overlay */}
      {showAnalysis && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 120, background: 'var(--bg)', overflowY: 'auto', padding: '18px 20px 110px' }}>
          <header className={styles.screenHeader} style={{ marginBottom: 16 }}>
            <button aria-label="Close analysis" className={styles.iconButton} onClick={() => setShowAnalysis(false)} type="button">
              <Icon name="x" />
            </button>
            <strong>Analysis</strong>
            <span style={{ width: 40 }} />
          </header>

          <div style={{ display: 'grid', gap: 12 }}>
            <div className="dq-seg" style={{ width: '100%' }}>
              {(['day', 'week'] as AnalysisPeriod[]).map((period) => (
                <button
                  className="dq-seg-item"
                  data-active={analysisPeriod === period}
                  key={period}
                  onClick={() => setAnalysisPeriod(period)}
                  type="button"
                  style={{ flex: 1, justifyContent: 'center', border: 0, background: 'transparent', outline: 'none', textTransform: 'capitalize' }}
                >
                  {period === 'day' ? 'Day' : '7 days'}
                </button>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
              <input
                aria-label="Analysis date"
                max={todayInputValue()}
                onChange={(event) => setAnalysisDate(event.target.value)}
                style={dateInputStyle}
                type="date"
                value={analysisDate}
              />
              <Button disabled={analyzing || selectedModelLimitReached} onClick={() => void handleRunAnalysis()} style={{ minWidth: 118 }}>
                {analyzing ? 'Sending...' : selectedAnalysis ? 'Re-analyze' : 'Analyze'}
              </Button>
            </div>
            <select
              aria-label="Gemini model"
              onChange={(event) => setAnalysisModel(event.target.value as GeminiModelId)}
              style={dateInputStyle}
              value={analysisModel}
            >
              {GEMINI_MODELS.map((model) => {
                const used = analysisUsage.filter((usage) => usage.model_id === model.id).length
                return (
                  <option key={model.id} value={model.id}>
                    {model.label} ({used}/{model.limit})
                  </option>
                )
              })}
            </select>
            <p className={styles.rowSub} style={{ margin: 0 }}>
              {selectedModelLimitReached ? 'Selected model reached today limit. ' : ''}
              {analysisPeriod === 'week' ? `Viewing ${formatRangeLabel(selectedAnalysisStart, analysisDate)}.` : `Viewing ${analysisDate}.`} Model: {selectedModelMeta.label}.
            </p>
          </div>

          <div style={{ height: 16 }} />
          {selectedAnalysis ? (
            <AnalysisResult analysis={selectedAnalysis} />
          ) : (
            <Card padding={18} style={{ textAlign: 'center' }}>
              <Icon color="var(--t-3)" name="sparkle" />
              <p className={styles.subtitle} style={{ margin: '10px 0 0' }}>No analysis for this date yet.</p>
            </Card>
          )}

          {analyses.length > 0 ? (
            <>
              <div style={{ height: 18 }} />
              <div className={styles.sectionLabel}><span className="dq-eyebrow">Recent</span></div>
              <div style={{ display: 'grid', gap: 8 }}>
                {analyses.slice(0, 8).map((analysis) => (
                  <button
                    className={styles.settingRow}
                    key={analysis.id}
                    onClick={() => {
                      setAnalysisPeriod(analysis.period)
                      setAnalysisDate(analysis.end_date)
                    }}
                    type="button"
                    style={{ border: 0, textAlign: 'left', width: '100%' }}
                  >
                    <span className={styles.rowText}>
                      <strong>{analysis.period === 'week' ? '7-day analysis' : 'Daily analysis'}</strong>
                      <span className={styles.rowSub}>{formatRangeLabel(analysis.start_date, analysis.end_date)}</span>
                    </span>
                    <Icon color="var(--t-3)" name="chevron" />
                  </button>
                ))}
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* Edit Profile modal sheet overlay */}
      {isEditing && (
        <div style={{
          position: 'fixed',
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

              <div style={{ height: 12 }} />
              <Stepper label="Daily sugar limit" suffix="g" value={sugarTarget} onChange={setSugarTarget} min={0} max={150} step={1} />

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
              position: 'fixed',
              inset: 0,
              background: 'rgba(15,23,42,0.4)',
              zIndex: 100,
              border: 0,
              cursor: 'pointer',
            }}
          />
          <div className={styles.sheet} style={{
            position: 'fixed',
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



const dateInputStyle = {
  background: 'var(--bg-soft)',
  border: 0,
  borderRadius: 'var(--r-md)',
  color: 'var(--t-1)',
  font: 'inherit',
  fontSize: 13,
  fontWeight: 800,
  outline: 'none',
  padding: '10px 12px',
  width: '100%',
}

function todayInputValue(): string {
  return toDateKey(new Date())
}

function addDays(dateKey: string, days: number): string {
  const date = new Date(`${dateKey}T00:00:00`)
  date.setDate(date.getDate() + days)
  return toDateKey(date)
}

function getDateRange(startDate: string, endDate: string): string[] {
  const out: string[] = []
  let cursor = startDate
  while (cursor <= endDate) {
    out.push(cursor)
    cursor = addDays(cursor, 1)
  }
  return out
}

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function formatRangeLabel(startDate: string, endDate: string): string {
  return startDate === endDate ? startDate : `${startDate} to ${endDate}`
}

function parseAnalysisResponse(raw: string): { error?: string; summary?: string; wins?: string[]; risks?: string[]; actions?: string[] } {
  try {
    return JSON.parse(raw) as { error?: string; summary?: string; wins?: string[]; risks?: string[]; actions?: string[] }
  } catch {
    return { error: raw.slice(0, 120) || 'Analysis failed' }
  }
}

function findAnalysis(analyses: HealthAnalysis[], period: AnalysisPeriod, startDate: string, endDate: string): HealthAnalysis | undefined {
  return analyses.find((analysis) => analysis.period === period && analysis.start_date === startDate && analysis.end_date === endDate)
}

function AnalysisResult({ analysis }: { analysis: HealthAnalysis }) {
  const modelLabel = GEMINI_MODELS.find((model) => model.id === analysis.model_id)?.label
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <Card padding={16}>
        <p className="dq-eyebrow">{analysis.period === 'week' ? '7 days' : 'Daily'} · {formatRangeLabel(analysis.start_date, analysis.end_date)}</p>
        <strong className="dq-num" style={{ fontSize: 24 }}>Summary</strong>
        <p className={styles.subtitle} style={{ margin: '8px 0 0' }}>{analysis.summary}</p>
        {modelLabel ? <p className={styles.rowSub} style={{ marginTop: 10 }}>{modelLabel}</p> : null}
      </Card>
      <AnalysisBullets title="Wins" items={analysis.wins} />
      <AnalysisBullets title="Watchouts" items={analysis.risks} />
      <AnalysisBullets title="Next Actions" items={analysis.actions} />
    </div>
  )
}

function AnalysisBullets({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null
  return (
    <Card padding={16}>
      <p className="dq-eyebrow">{title}</p>
      <ul style={{ display: 'grid', gap: 8, margin: '10px 0 0', paddingLeft: 18 }}>
        {items.map((item) => (
          <li key={item} style={{ color: 'var(--t-2)', fontSize: 13, lineHeight: 1.45 }}>{item}</li>
        ))}
      </ul>
    </Card>
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
