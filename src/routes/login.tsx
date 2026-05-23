import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/primitives'
import { useAuthStore } from '@/stores/authStore'
import { MOCK_USER } from '@/lib/mock'
import { appStyles as styles } from '@/components/layout/AppScreen'

export function LoginRoute() {
  const navigate = useNavigate()
  const signInMock = useAuthStore((state) => state.signInMock)

  return (
    <main className={styles.stage}>
      <section className={styles.loginCard}>
        <div className={styles.logoMark}>DQ</div>
        <div>
          <p className="dq-eyebrow">DietQuest</p>
          <h1 className={styles.headerTitle}>Track the cut without the noise.</h1>
          <p className={styles.subtitle}>Mock sign-in for {MOCK_USER.email}. Firebase auth lands in Phase 5.</p>
        </div>
        <Button
          onClick={() => {
            signInMock()
            navigate('/splash')
          }}
        >
          Sign in
        </Button>
      </section>
    </main>
  )
}
