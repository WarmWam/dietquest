import type { SVGProps } from 'react'

export type IconName =
  | 'home'
  | 'chart'
  | 'plus'
  | 'list'
  | 'user'
  | 'flame'
  | 'drop'
  | 'walk'
  | 'moon'
  | 'bell'
  | 'chevron'
  | 'chevronL'
  | 'check'
  | 'x'
  | 'arrowDown'
  | 'arrowUp'
  | 'edit'
  | 'target'
  | 'sun'
  | 'sunrise'
  | 'play'
  | 'pause'
  | 'stop'
  | 'camera'
  | 'star'
  | 'sparkle'
  | 'search'
  | 'settings'
  | 'cal'
  | 'egg'
  | 'fish'
  | 'apple'
  | 'dumbbell'
  | 'fork'
  | 'photo'
  | 'download'
  | 'bolt'
  | 'trash'
  | 'share'
  | 'info'
  | 'trend'
  | 'coffee'
  | 'leaf'

type IconProps = Omit<SVGProps<SVGSVGElement>, 'color' | 'fill' | 'stroke'> & {
  name: IconName
  size?: number
  stroke?: number
  color?: string
  fill?: string
}

export function Icon({
  name,
  size = 22,
  stroke = 1.8,
  color = 'currentColor',
  fill = 'none',
  ...svgProps
}: IconProps) {
  const common = {
    fill,
    stroke: color,
    strokeWidth: stroke,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }

  const paths: Record<IconName, JSX.Element> = {
    home: <path d="M3 11l9-8 9 8v9a2 2 0 0 1-2 2h-4v-7h-6v7H5a2 2 0 0 1-2-2z" />,
    chart: <path d="M3 21h18M6 17V9M11 17V5M16 17v-6M21 17v-9" />,
    plus: <path d="M12 5v14M5 12h14" />,
    list: <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />,
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),
    flame: <path d="M12 22a7 7 0 0 0 7-7c0-4-2-6-3-7 0 2-2 3-2 3s-1-3-3-5c-3-3-3-5-3-5s-1 4-3 6S5 11 5 15a7 7 0 0 0 7 7z" fill={fill} />,
    drop: <path d="M12 3s-7 7-7 12a7 7 0 0 0 14 0c0-5-7-12-7-12z" />,
    walk: (
      <>
        <circle cx="13" cy="4" r="2" />
        <path d="M9 22l3-7 3 3v4M9 13l-2-3 5-4 4 5 3 1M5 22l3-5" />
      </>
    ),
    moon: <path d="M21 13a9 9 0 1 1-9-10 7 7 0 0 0 9 10z" />,
    bell: <path d="M18 16v-5a6 6 0 0 0-12 0v5l-2 2v1h16v-1zM9 21a3 3 0 0 0 6 0" />,
    chevron: <path d="M9 6l6 6-6 6" />,
    chevronL: <path d="M15 6l-6 6 6 6" />,
    check: <path d="M5 13l4 4L19 7" />,
    x: <path d="M6 6l12 12M18 6L6 18" />,
    arrowDown: <path d="M12 5v14M5 12l7 7 7-7" />,
    arrowUp: <path d="M12 19V5M5 12l7-7 7 7" />,
    edit: <path d="M12 20h9M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4z" />,
    target: (
      <>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="5" />
        <circle cx="12" cy="12" r="1.5" fill={color} />
      </>
    ),
    sun: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
      </>
    ),
    sunrise: (
      <>
        <circle cx="12" cy="11" r="3" />
        <path d="M12 4v2M5 11H3M21 11h-2M6.34 5.34l1.41 1.41M16.25 6.75l1.41-1.41" />
        <path d="M3 17h4M17 17h4" />
        <path d="M8 20h8" />
        <path d="M11.5 14.5c-2 .3-3.5 1.6-3.5 3.5h8c0-1.9-1.5-3.2-3.5-3.5" />
      </>
    ),
    play: <path d="M6 4l14 8-14 8z" fill={color} stroke="none" />,
    pause: (
      <>
        <rect x="6" y="5" width="4" height="14" fill={color} stroke="none" />
        <rect x="14" y="5" width="4" height="14" fill={color} stroke="none" />
      </>
    ),
    stop: <rect x="6" y="6" width="12" height="12" rx="2" fill={color} stroke="none" />,
    camera: (
      <>
        <path d="M3 7h4l2-3h6l2 3h4v12H3z" />
        <circle cx="12" cy="13" r="4" />
      </>
    ),
    star: <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.27 5.82 22 7 14.14l-5-4.87 6.91-1.01z" />,
    sparkle: <path d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5z" />,
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m21 21-4.3-4.3" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </>
    ),
    cal: (
      <>
        <rect x="3" y="4" width="18" height="18" rx="3" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </>
    ),
    egg: <path d="M12 3c-4 0-7 5-7 11a7 7 0 0 0 14 0c0-6-3-11-7-11z" />,
    fish: (
      <>
        <path d="M2 12c4-5 9-5 13 0-4 5-9 5-13 0z" />
        <path d="M15 12l5-3v6z" fill={color} stroke="none" />
        <circle cx="6" cy="11" r="0.8" fill={color} stroke="none" />
      </>
    ),
    apple: (
      <>
        <path d="M12 8c-3-3-8 0-8 5 0 4 3 8 5 8 1.5 0 2-1 3-1s1.5 1 3 1c2 0 5-4 5-8 0-5-5-8-8-5z" />
        <path d="M12 8s0-3 2-5" />
      </>
    ),
    dumbbell: <path d="M6 4v16M3 8v8M18 4v16M21 8v8M6 12h12" />,
    fork: <path d="M4 3v6a2 2 0 0 0 2 2v10M8 3v6M16 3c-2 1-3 3-3 6v3h3v9" />,
    photo: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <circle cx="9" cy="10" r="2" />
        <path d="m21 17-5-5-9 9" />
      </>
    ),
    download: <path d="M12 3v14M5 12l7 7 7-7M5 21h14" />,
    bolt: <path d="M13 2L4 14h7l-1 8 9-12h-7z" fill={color} stroke="none" />,
    trash: <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />,
    share: (
      <>
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
      </>
    ),
    info: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8h.01M11 12h1v4h1" />
      </>
    ),
    trend: <path d="M3 17l6-6 4 4 8-8M17 7h4v4" />,
    coffee: <path d="M4 8h14v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4zM18 8h2a2 2 0 0 1 2 2v1a2 2 0 0 1-2 2h-2M7 5V2M11 5V2M15 5V2" />,
    leaf: <path d="M3 21c0-9 6-15 18-18-1 12-7 18-18 18zM6 18l9-9" />,
  }

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...common} {...svgProps}>
      {paths[name]}
    </svg>
  )
}
