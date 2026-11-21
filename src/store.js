import { create } from 'zustand'
import { CONFIG } from './config'

const initialSim = {
  status: 'idle',
  index: 0,
  pos: null,
  heading: 0,
  speedKmh: 0,
  progress: 0,
  timeScale: CONFIG.SIM_TIME_SCALE,
  follow: true,
}

const initialPlan = { status: 'idle', error: null }
const initialTraffic = { segments: [], incidents: [], eta: { minutes: 0, label: '' } }

export const useStore = create((set, get) => ({
  mode: 'drive',
  origin: null,
  destination: null,
  plan: initialPlan,
  route: null,
  routeInfo: null,
  sim: initialSim,
  blocked: false,
  traffic: initialTraffic,
  roast: null,
  _pickTarget: null,

  setMode: mode => set({ mode }),
  setPickTarget: target => set({ _pickTarget: target }),
  setOrigin: origin => set({ origin }),
  setDestination: destination => set({ destination }),
  setPlan: patch => set(state => ({ plan: { ...state.plan, ...patch } })),
  setRoute: (route, info) => set({ route, routeInfo: info }),
  setSim: patch => set(state => ({ sim: { ...state.sim, ...patch } })),
  setBlocked: blocked => set({ blocked }),
  setTraffic: patch => set(state => ({ traffic: { ...state.traffic, ...patch } })),
  setRoast: roast => set({ roast }),
  resetAll: () => set({
    mode: 'drive',
    origin: null,
    destination: null,
    plan: initialPlan,
    route: null,
    routeInfo: null,
    sim: initialSim,
    blocked: false,
    traffic: initialTraffic,
    roast: null,
    _pickTarget: null,
  }),
}))