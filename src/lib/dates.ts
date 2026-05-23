export function todayKey(date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function daysAgoKey(daysBack: number, from = new Date()): string {
  const date = new Date(from)
  date.setDate(date.getDate() - daysBack)
  return todayKey(date)
}
