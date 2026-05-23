import { useNavigate } from 'react-router-dom'
import { AppScreen, appStyles as styles } from '@/components/layout/AppScreen'
import { Button, Card, Icon } from '@/components/primitives'
import { useOnboarding } from '@/hooks/useOnboarding'
import { useOnboardingDraft } from '@/stores/onboardingDraft'
import { calculateBmr } from '@/lib/nutrition'
import type { Sex } from '@/types/domain'

function ProgressHeader({ step, onBack }: { step: number; onBack?: () => void }) {
  return (
    <div className={styles.screenHeader}>
      <button className={styles.iconButton} disabled={!onBack} onClick={onBack} type="button">
        <Icon name="chevronL" />
      </button>
      <div className={styles.progressDots}>
        {[1, 2, 3].map((item) => (
          <span className={`${styles.dot} ${item <= step ? styles.dotActive : ''}`} key={item} />
        ))}
      </div>
      <span className="dq-eyebrow">{step}/3</span>
    </div>
  )
}

export function OnboardingWelcomeRoute() {
  const navigate = useNavigate()

  return (
    <AppScreen hideNav>
      <div className={styles.screen}>
        <div className={styles.heroOrb}>
          <span className={styles.heroNumber}>15</span>
          <span className={styles.heroCaption}>kg to goal</span>
        </div>
        <p className="dq-eyebrow">DietQuest</p>
        <h1 className={styles.welcomeTitle}>
          Your journey
          <br />
          <span className={styles.gradientText}>80 to 65 kg</span>
          <br />
          starts here.
        </h1>
        <p className={styles.subtitle}>Track meals, water, walks and weight in under 3 taps a day. Built for one person: you.</p>
        <div className={styles.bottomAction}>
          <Button icon="chevron" onClick={() => navigate('/onboarding/profile')}>
            Get started
          </Button>
          <Button onClick={() => navigate('/login')} variant="ghost">
            Back to sign in
          </Button>
        </div>
      </div>
    </AppScreen>
  )
}

export function OnboardingProfileRoute() {
  const navigate = useNavigate()
  const { sex, setSex, age, setAge, height_cm, setHeight, weight_start_kg, setStartWeight } = useOnboardingDraft()

  const bmr = calculateBmr({ sex, weightKg: weight_start_kg, heightCm: height_cm, age })
  const tdee = Math.round(bmr * 1.5)
  const bmi = weight_start_kg / ((height_cm / 100) ** 2)

  return (
    <AppScreen hideNav>
      <div className={`${styles.screen} ${styles.scroll}`}>
        <ProgressHeader onBack={() => navigate('/onboarding/welcome')} step={2} />
        <h1 className={styles.headerTitle}>About you</h1>
        <p className={styles.subtitle}>We’ll use this to calculate your daily targets.</p>

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

        <div className={styles.formGrid}>
          <Stepper label="Age" suffix="yrs" value={age} onChange={setAge} min={13} max={100} />
          <Stepper label="Height" suffix="cm" value={height_cm} onChange={setHeight} min={120} max={230} />
        </div>

        <Stepper label="Current weight" suffix="kg" value={weight_start_kg} onChange={setStartWeight} min={30} max={300} step={0.1} />

        <div style={{ height: 18 }} />
        <div className={styles.previewCard}>
          <div className={styles.previewIcon}>
            <Icon name="sparkle" color="#fff" />
          </div>
          <div>
            <p className="dq-eyebrow">Your BMI · TDEE</p>
            <strong className="dq-num" style={{ fontSize: 22 }}>
              {bmi.toFixed(1)} BMI · {tdee.toLocaleString()} kcal
            </strong>
          </div>
        </div>

        <div className={styles.bottomAction} style={{ marginTop: 24 }}>
          <Button icon="chevron" onClick={() => navigate('/onboarding/goal')}>
            Continue
          </Button>
        </div>
      </div>
    </AppScreen>
  )
}

function Stepper({
  label,
  value,
  suffix,
  onChange,
  min,
  max,
  step = 1,
}: {
  label: string
  value: number
  suffix: string
  onChange: (val: number) => void
  min: number
  max: number
  step?: number
}) {
  const formattedValue = step % 1 !== 0 ? value.toFixed(1) : String(value)
  const isMin = value <= min
  const isMax = value >= max

  return (
    <div>
      <p className={styles.fieldLabel}>{label}</p>
      <div className={styles.stepper}>
        <button
          className={styles.smallRoundButton}
          type="button"
          onClick={() => {
            const nextVal = Number((value - step).toFixed(2))
            onChange(Math.max(nextVal, min))
          }}
          disabled={isMin}
        >
          -
        </button>
        <span>
          <strong className="dq-num" style={{ fontSize: 22 }}>
            {formattedValue}
          </strong>{' '}
          <span className={styles.subtitle}>{suffix}</span>
        </span>
        <button
          className={styles.smallRoundButton}
          type="button"
          onClick={() => {
            const nextVal = Number((value + step).toFixed(2))
            onChange(Math.min(nextVal, max))
          }}
          disabled={isMax}
        >
          +
        </button>
      </div>
    </div>
  )
}

export function OnboardingGoalRoute() {
  const navigate = useNavigate()
  const { completeOnboarding } = useOnboarding()
  
  const {
    sex,
    age,
    height_cm,
    weight_start_kg,
    weight_target_kg,
    setTargetWeight,
    target_months,
    setTargetMonths,
    reset,
  } = useOnboardingDraft()

  const bmr = calculateBmr({ sex, weightKg: weight_start_kg, heightCm: height_cm, age })
  const tdee = Math.round(bmr * 1.5)
  const dailyDeficit = ((weight_start_kg - weight_target_kg) * 7700) / (target_months * 30)
  const dailyKcal = Math.max(1200, Math.round(tdee - dailyDeficit))
  const dailyProtein = Math.round(weight_target_kg * 1.8)
  const weeklyRate = ((weight_start_kg - weight_target_kg) / (target_months * 30)) * 7

  const endDate = new Date()
  endDate.setMonth(endDate.getMonth() + target_months)
  const endFormatted = endDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })

  const sliderPercent = ((target_months - 3) / 9) * 100

  const handleBuild = async () => {
    await completeOnboarding({
      sex,
      age,
      height_cm,
      weight_start_kg,
      weight_target_kg,
      target_date: endDate,
    })
    reset()
    navigate('/')
  }

  return (
    <AppScreen hideNav>
      <div className={`${styles.screen} ${styles.scroll}`}>
        <ProgressHeader onBack={() => navigate('/onboarding/profile')} step={3} />
        <h1 className={styles.headerTitle}>Set your goal</h1>
        <p className={styles.subtitle}>We’ll build your plan around this.</p>

        <p className={styles.fieldLabel}>Target weight</p>
        <Card className={styles.goalCompare} padding={0}>
          <div>
            <strong className="dq-num" style={{ fontSize: 24 }}>
              {weight_start_kg.toFixed(1)}
            </strong>
            <p className="dq-eyebrow">Now</p>
          </div>
          <Icon name="chevron" color="var(--t-3)" />
          <div>
            <strong className={`dq-num ${styles.gradientText}`} style={{ fontSize: 44 }}>
              {weight_target_kg.toFixed(1)}
            </strong>
            <p className="dq-eyebrow">Target</p>
          </div>
        </Card>

        <div style={{ height: 12 }} />
        <Stepper
          label="Target weight adjustment"
          suffix="kg"
          value={weight_target_kg}
          onChange={setTargetWeight}
          min={40}
          max={weight_start_kg - 1}
          step={0.5}
        />

        <div style={{ height: 18 }} />
        <p className={styles.fieldLabel}>Timeline</p>
        <Card padding={18}>
          <div className={styles.screenHeader}>
            <strong className="dq-num" style={{ fontSize: 28 }}>
              {target_months} months
            </strong>
            <span className={styles.subtitle}>by {endFormatted}</span>
          </div>
          <div className={styles.sliderTrack} style={{ position: 'relative', marginTop: 12 }}>
            <span className={styles.sliderFill} style={{ width: `${sliderPercent}%` }} />
            <span className={styles.sliderThumb} style={{ left: `calc(${sliderPercent}% - 11px)` }} />
            <input
              type="range"
              min={3}
              max={12}
              value={target_months}
              onChange={(e) => setTargetMonths(Number(e.target.value))}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                opacity: 0,
                cursor: 'pointer',
                margin: 0,
                padding: 0,
              }}
            />
          </div>
        </Card>

        <div style={{ height: 20 }} />
        <div className={styles.gradientCard}>
          <p className="dq-eyebrow" style={{ color: 'rgba(255,255,255,.82)' }}>
            Your daily plan
          </p>
          <strong className="dq-num" style={{ fontSize: 30 }}>
            {dailyKcal.toLocaleString()} kcal · {dailyProtein}g protein
          </strong>
          <p>Rate: {weeklyRate.toFixed(1)} kg/week</p>
        </div>

        <div className={styles.bottomAction} style={{ marginTop: 24 }}>
          <Button icon="sparkle" onClick={() => void handleBuild()}>
            Build my plan
          </Button>
        </div>
      </div>
    </AppScreen>
  )
}
