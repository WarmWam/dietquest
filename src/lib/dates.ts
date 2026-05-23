export function todayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10)
}

export function daysAgoKey(daysBack: number, from = new Date()): string {
  const date = new Date(from)
  date.setDate(date.getDate() - daysBack)
  return todayKey(date)
}
