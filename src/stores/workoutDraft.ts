import { create } from 'zustand'

type WorkoutType = 'incline_walk' | 'bodyweight' | 'other'

interface WorkoutDraftState {
  type: WorkoutType
  incline_pct: number
  speed_kmh: number
  target_duration_min: number
  startedAt: number | null
  pausedAt: number | null
  totalPausedMs: number
  elapsedMs: number

  setType: (type: WorkoutType) => void
  setIncline: (pct: number) => void
  setSpeed: (kmh: number) => void
  setTargetDuration: (min: number) => void
  start: () => void
  pause: () => void
  resume: () => void
  tick: () => void
  reset: () => void
}

const DEFAULTS = {
  type: 'incline_walk' as WorkoutType,
  incline_pct: 8,
  speed_kmh: 5.5,
  target_duration_min: 45,
  startedAt: null as number | null,
  pausedAt: null as number | null,
  totalPausedMs: 0,
  elapsedMs: 0,
}

export const useWorkoutDraft = create<WorkoutDraftState>((set, get) => ({
  ...DEFAULTS,

  setType: (type) => set({ type }),
  setIncline: (pct) => set({ incline_pct: pct }),
  setSpeed: (kmh) => set({ speed_kmh: kmh }),
  setTargetDuration: (min) => set({ target_duration_min: min }),

  start: () => set({
    startedAt: Date.now(),
    pausedAt: null,
    totalPausedMs: 0,
    elapsedMs: 0,
  }),

  pause: () => {
    const { startedAt, pausedAt } = get()
    if (startedAt && !pausedAt) {
      set({ pausedAt: Date.now() })
    }
  },

  resume: () => {
    const { pausedAt, totalPausedMs } = get()
    if (pausedAt) {
      const pausedDuration = Date.now() - pausedAt
      set({
        pausedAt: null,
        totalPausedMs: totalPausedMs + pausedDuration,
      })
    }
  },

  tick: () => {
    const { startedAt, pausedAt, totalPausedMs } = get()
    if (!startedAt || pausedAt) return
    set({ elapsedMs: Date.now() - startedAt - totalPausedMs })
  },

  reset: () => set({ ...DEFAULTS }),
}))
