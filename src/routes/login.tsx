import { Button } from '@/components/primitives'
import { useAuth } from '@/hooks/useAuth'
import { appStyles as styles } from '@/components/layout/AppScreen'
import { BrandMark } from '@/components/BrandMark'

export function LoginRoute() {
  const { error, signIn } = useAuth()

  return (
    <main
      className={styles.stage}
      style={{
        display: 'grid',
        placeItems: 'center',
        padding: '24px',
        background:
          'radial-gradient(circle at 24% 0%, var(--glow-blue), transparent 28rem),' +
          'radial-gradient(circle at 76% 8%, var(--glow-violet), transparent 30rem),' +
          'radial-gradient(circle at 56% 92%, var(--glow-pink), transparent 28rem),' +
          'var(--bg)',
      }}
    >
      <section className={styles.loginCard}>
        <BrandMark />
        <div>
          <p className="dq-eyebrow">Health Tracking</p>
          <h1 className={styles.headerTitle}>Track the cut without the noise.</h1>
          <p className={styles.subtitle}>Sign in with Google to sync meals, weight, water, workouts and sleep.</p>
        </div>
        {error ? <p className={styles.subtitle}>{error}</p> : null}
        <Button onClick={() => void signIn()}>
          Sign in with Google
        </Button>
      </section>
    </main>
  )
}
