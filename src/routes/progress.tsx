import { useNavigate, useSearchParams } from 'react-router-dom'
import { AppScreen, appStyles as styles } from '@/components/layout/AppScreen'
import { Card, Icon, ImageSlot } from '@/components/primitives'
import { MOCK_MEALS, MOCK_TODAY, MOCK_WEIGHTS } from '@/lib/mock'

type ProgressTab = 'weight' | 'kcal' | 'activity' | 'photos'

const tabs: Array<{ id: ProgressTab; label: string }> = [
  { id: 'weight', label: 'Weight' },
  { id: 'kcal', label: 'Calories' },
  { id: 'activity', label: 'Activity' },
  { id: 'photos', label: 'Photos' },
]

export function ProgressRoute() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const tab = (params.get('tab') || 'weight') as ProgressTab

  return (
    <AppScreen activeNav="progress">
      <div className={`${styles.screen} ${styles.withNav} ${styles.scroll}`}>
        <h1 className={styles.headerTitle}>Progress</h1>
        <div className="dq-h-scroll" style={{ margin: '14px -20px 18px 0', paddingRight: 20 }}>
          <div className={styles.tabRow}>
            {tabs.map((item) => (
              <button className="dq-seg-item" data-active={tab === item.id} key={item.id} onClick={() => navigate(`/progress?tab=${item.id}`)} type="button">
                {item.label}
              </button>
            ))}
          </div>
        </div>
        {tab === 'kcal' ? <CaloriesTab /> : tab === 'activity' ? <ActivityTab /> : tab === 'photos' ? <PhotosTab /> : <WeightTab />}
      </div>
    </AppScreen>
  )
}

function WeightTab() {
  const points = MOCK_WEIGHTS.slice(-20)
  const min = 78
  const max = 80.5
  const path = points
    .map((point, index) => {
      const x = (index / (points.length - 1)) * 350
      const y = 180 - ((point.weight_kg - min) / (max - min)) * 150 - 12
      return `${index === 0 ? 'M' : 'L'}${x},${y}`
    })
    .join(' ')

  return (
    <>
      <div className={styles.chartCard}>
        <div className={styles.screenHeader}>
          <div>
            <p className="dq-eyebrow">Current</p>
            <strong className="dq-num" style={{ fontSize: 48 }}>
              78.2 kg
            </strong>
          </div>
          <span className="dq-pill" style={{ color: 'var(--success)' }}>
            <Icon name="arrowDown" size={12} /> 1.8 kg
          </span>
        </div>
        <svg height="190" viewBox="0 0 350 190" width="100%">
          <path d={`${path} L350,190 L0,190 Z`} fill="var(--a-soft)" />
          <path d={path} fill="none" stroke="var(--a1)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
          <circle cx="350" cy="121" fill="var(--surface)" r="6" stroke="var(--a1)" strokeWidth="3" />
        </svg>
      </div>
      <div className={styles.metricGrid}>
        <Metric label="Start" value="80.0 kg" />
        <Metric label="Now" value="78.2 kg" />
        <Metric label="Lost" value="-1.8 kg" />
        <Metric label="To target" value="13.2 kg" />
      </div>
    </>
  )
}

function CaloriesTab() {
  const days = [1820, 1980, 2160, 1740, 1890, 1620, MOCK_TODAY.totals.kcal]
  return (
    <>
      <div className={styles.chartCard}>
        <p className="dq-eyebrow">Weekly average</p>
        <strong className="dq-num" style={{ fontSize: 42 }}>
          1,778
        </strong>
        <p className={styles.subtitle}>172 kcal under target avg</p>
        <div className={styles.bars}>
          {days.map((kcal, index) => (
            <div className={styles.barColumn} key={`${kcal}-${index}`}>
              <div className={styles.bar} style={{ background: kcal > 1950 ? 'var(--warning)' : index === 6 ? 'var(--a-grad)' : 'var(--bg-soft)', height: `${(kcal / 2400) * 100}%` }} />
              <span className="dq-eyebrow">{['M', 'T', 'W', 'T', 'F', 'S', 'S'][index]}</span>
            </div>
          ))}
        </div>
      </div>
      <Card padding={16}>
        <p className="dq-eyebrow">Top fuel this week</p>
        {MOCK_MEALS.map((meal) => (
          <div className={styles.habitRow} key={meal.id}>
            <Icon color="var(--a1)" name="fork" />
            <span className={styles.rowText}>
              <strong>{meal.items[0].name}</strong>
              <span className={styles.rowSub}>{meal.total_kcal} kcal · {meal.total_protein_g}g protein</span>
            </span>
          </div>
        ))}
      </Card>
    </>
  )
}

function ActivityTab() {
  return (
    <>
      <div className={styles.chartCard}>
        <div className={styles.screenHeader}>
          <div>
            <p className="dq-eyebrow">Streak</p>
            <strong className="dq-num" style={{ fontSize: 42 }}>
              14 days
            </strong>
          </div>
          <Icon color="#F97316" fill="#F97316" name="flame" size={34} />
        </div>
        <div className={styles.heatmap}>
          {Array.from({ length: 13 }, (_, week) => (
            <div className={styles.heatCol} key={week}>
              {Array.from({ length: 7 }, (_, day) => {
                const value = (week * 3 + day * 2) % 6
                return <span className={styles.heatCell} key={day} style={{ opacity: value === 0 ? 0.12 : 0.25 + value * 0.12 }} />
              })}
            </div>
          ))}
        </div>
      </div>
      <div className={styles.metricGrid}>
        <Metric label="Walks" value="18/22" />
        <Metric label="Minutes" value="810" />
        <Metric label="Burned" value="5,420" />
        <Metric label="Best week" value="6 days" />
      </div>
    </>
  )
}

function PhotosTab() {
  return (
    <div className={styles.photoGrid}>
      {['May 23', 'May 10', 'Apr 28', 'Apr 23'].map((date, index) => (
        <div className={styles.photoTile} key={date}>
          <ImageSlot id={`photo-${index}`} placeholder="Progress photo" style={{ width: '100%', height: '100%' }} />
          <span className={styles.photoTag}>
            {date}
            <span>{[78.2, 78.9, 79.5, 80.0][index]} kg</span>
          </span>
        </div>
      ))}
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card padding={14}>
      <p className="dq-eyebrow">{label}</p>
      <strong className="dq-num" style={{ fontSize: 24 }}>
        {value}
      </strong>
    </Card>
  )
}
