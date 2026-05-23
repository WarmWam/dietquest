import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Phone, type NavId } from '@/components/primitives'
import styles from './AppScreen.module.css'

type AppScreenProps = {
  children: ReactNode
  hideNav?: boolean
  activeNav?: NavId
  bg?: string
  statusDark?: boolean
}

export function AppScreen({ children, hideNav = false, activeNav = 'home', bg, statusDark }: AppScreenProps) {
  const navigate = useNavigate()

  function onNav(id: NavId) {
    if (id === 'home') navigate('/')
    if (id === 'progress') navigate('/progress?tab=weight')
    if (id === 'plan') navigate('/plan')
    if (id === 'profile') navigate('/profile')
  }

  return (
    <div className={styles.stage}>
      <div className={styles.appFrame}>
        <Phone activeNav={activeNav} bg={bg} hideNav={hideNav} onNav={onNav} statusDark={statusDark}>
          {children}
        </Phone>
      </div>
    </div>
  )
}

export { styles as appStyles }
