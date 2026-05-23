import { Component, type ErrorInfo, type ReactNode } from 'react'
import { appStyles as styles } from '@/components/layout/AppScreen'
import { BrandMark } from '@/components/BrandMark'

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
    console.error('Health Tracking error boundary', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <main className={styles.stage}>
          <section className={styles.loginCard}>
            <BrandMark />
            <div>
              <p className="dq-eyebrow">Health Tracking</p>
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
