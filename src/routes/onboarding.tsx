import { useNavigate } from 'react-router-dom'
import { AppScreen, appStyles as styles } from '@/components/layout/AppScreen'
import { Button, Card, Icon } from '@/components/primitives'
import { DEFAULT_PROFILE } from '@/data/defaults'
import { useOnboarding } from '@/hooks/useOnboarding'

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
  const profile = DEFAULT_PROFILE

  return (
    <AppScreen hideNav>
      <div className={`${styles.screen} ${styles.scroll}`}>
        <ProgressHeader onBack={() => navigate('/onboarding/welcome')} step={2} />
        <h1 className={styles.headerTitle}>About you</h1>
        <p className={styles.subtitle}>We’ll use this to calculate your daily targets.</p>

        <p className={styles.fieldLabel}>Sex</p>
        <div className="dq-seg" style={{ width: '100%', marginBottom: 18 }}>
          {['Male', 'Female', 'Other'].map((label, index) => (
            <span className="dq-seg-item" data-active={index === 0} key={label} style={{ flex: 1, justifyContent: 'center' }}>
              {label}
            </span>
          ))}
        </div>

        <div className={styles.formGrid}>
          <Stepper label="Age" suffix="yrs" value={profile.age} />
          <Stepper label="Height" suffix="cm" value={profile.height_cm} />
        </div>

        <p className={styles.fieldLabel}>Current weight</p>
        <Card padding={18}>
          <div className={styles.metricValue}>
            <span className={styles.largeNumber}>{profile.weight_start_kg.toFixed(1)}</span>
            <span className={styles.subtitle}>kg</span>
          </div>
        </Card>

        <div style={{ height: 18 }} />
        <div className={styles.previewCard}>
          <div className={styles.previewIcon}>
            <Icon name="sparkle" color="#fff" />
          </div>
          <div>
            <p className="dq-eyebrow">Your BMI · TDEE</p>
            <strong className="dq-num" style={{ fontSize: 22 }}>
              28.0 BMI · 2,450 kcal
            </strong>
          </div>
        </div>

        <div className={styles.bottomAction}>
          <Button icon="chevron" onClick={() => navigate('/onboarding/goal')}>
            Continue
          </Button>
        </div>
      </div>
    </AppScreen>
  )
}

function Stepper({ label, value, suffix }: { label: string; value: number; suffix: string }) {
  return (
    <div>
      <p className={styles.fieldLabel}>{label}</p>
      <div className={styles.stepper}>
        <button className={styles.smallRoundButton} type="button">
          -
        </button>
        <span>
          <strong className="dq-num" style={{ fontSize: 22 }}>
            {value}
          </strong>{' '}
          <span className={styles.subtitle}>{suffix}</span>
        </span>
        <button className={styles.smallRoundButton} type="button">
          +
        </button>
      </div>
    </div>
  )
}

export function OnboardingGoalRoute() {
  const navigate = useNavigate()
  const { completeOnboarding } = useOnboarding()
  const profile = DEFAULT_PROFILE

  return (
    <AppScreen hideNav>
      <div className={styles.screen}>
        <ProgressHeader onBack={() => navigate('/onboarding/profile')} step={3} />
        <h1 className={styles.headerTitle}>Set your goal</h1>
        <p className={styles.subtitle}>We’ll build your plan around this.</p>

        <p className={styles.fieldLabel}>Target weight</p>
        <Card className={styles.goalCompare} padding={0}>
          <div>
            <strong className="dq-num" style={{ fontSize: 32 }}>
              {profile.weight_start_kg.toFixed(1)}
            </strong>
            <p className="dq-eyebrow">Now</p>
          </div>
          <Icon name="chevron" color="var(--t-3)" />
          <div>
            <strong className={`dq-num ${styles.gradientText}`} style={{ fontSize: 56 }}>
              {profile.weight_target_kg.toFixed(1)}
            </strong>
            <p className="dq-eyebrow">Target</p>
          </div>
        </Card>

        <div style={{ height: 20 }} />
        <p className={styles.fieldLabel}>Timeline</p>
        <Card padding={18}>
          <div className={styles.screenHeader}>
            <strong className="dq-num" style={{ fontSize: 28 }}>
              5 months
            </strong>
            <span className={styles.subtitle}>by Nov 2026</span>
          </div>
          <div className={styles.sliderTrack}>
            <span className={styles.sliderFill} />
            <span className={styles.sliderThumb} />
          </div>
        </Card>

        <div style={{ height: 20 }} />
        <div className={styles.gradientCard}>
          <p className="dq-eyebrow" style={{ color: 'rgba(255,255,255,.82)' }}>
            Your daily plan
          </p>
          <strong className="dq-num" style={{ fontSize: 34 }}>
            1,950 kcal · 140g protein
          </strong>
          <p>Rate: 0.7 kg/week</p>
        </div>

        <div className={styles.bottomAction}>
          <Button
            icon="sparkle"
            onClick={() => {
              void completeOnboarding(profile).then(() => navigate('/'))
            }}
          >
            Build my plan
          </Button>
        </div>
      </div>
    </AppScreen>
  )
}
