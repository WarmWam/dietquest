import { Component, type ErrorInfo, type ReactNode } from 'react'
import { appStyles as styles } from '@/components/layout/AppScreen'

type Props = {
  children: ReactNode
}

type State = {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('DietQuest error boundary', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <main className={styles.stage}>
          <section className={styles.loginCard}>
            <div className={styles.logoMark}>DQ</div>
            <div>
              <p className="dq-eyebrow">DietQuest</p>
              <h1 className={styles.headerTitle}>Something needs a refresh.</h1>
              <p className={styles.subtitle}>{this.state.error.message}</p>
            </div>
            <button className="dq-btn" onClick={() => window.location.reload()} type="button">
              Reload
            </button>
          </section>
        </main>
      )
    }

    return this.props.children
  }
}
