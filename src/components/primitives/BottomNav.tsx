import { Icon, type IconName } from './Icon'

export type NavId = 'home' | 'progress' | 'plan' | 'profile'

type BottomNavProps = {
  active?: NavId
  onNav?: (id: NavId) => void
}

const navItems: Array<{ id: NavId; label: string; icon: IconName }> = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'progress', label: 'Progress', icon: 'chart' },
  { id: 'plan', label: 'Plan', icon: 'list' },
  { id: 'profile', label: 'Profile', icon: 'user' },
]

export function BottomNav({ active = 'home', onNav }: BottomNavProps) {
  return (
    <nav className="dq-nav" aria-label="Primary">
      <div className="dq-nav-bg" />
      {navItems.map((item) => (
        <button
          key={item.id}
          aria-current={active === item.id ? 'page' : undefined}
          className="dq-nav-item"
          data-active={active === item.id}
          onClick={() => onNav?.(item.id)}
          type="button"
        >
          <Icon name={item.icon} size={22} />
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  )
}
