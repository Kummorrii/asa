import { useEffect, useRef } from 'react'
import { useStore } from '../../store'
import { bus } from '../../lib/bus'
import { EVENTS } from '../../lib/events'
import { getLongestRoute } from './routing'
import { DEMO_TRIPS } from './presets'

let inflight = null

export function useRouteController() {
  const {
    mode, origin, destination, plan, route, sim,
    setMode, setOrigin, setDestination, setPlan, setRoute, resetAll,
  } = useStore()

  const unsubRef = useRef([])

  useEffect(() => {
    const unsubs = [
      bus.on(EVENTS.REROUTE_REQUEST, handleReroute),
      bus.on(EVENTS.DEMO_TRIP, handleDemoTrip),
      bus.on(EVENTS.ARRIVED, () => setPlan({ status: 'arrived' })),
      bus.on(EVENTS.TRIP_RESET, handleReset),
    ]
    unsubRef.current = unsubs
    return () => unsubs.forEach(u => u())
  }, [])

  async function handleReroute({ to, reason }) {
    if (inflight) return
    inflight = true
    try {
      const fromPos = sim.pos || (origin ? [origin.lat, origin.lng] : null)
      if (!fromPos || !to) return

      setDestination(to)
      setPlan({ status: 'loading' })

      const result = await getLongestRoute(
        { lat: fromPos[0], lng: fromPos[1] },
        to,
        mode
      )

      const coords = result.coords
      if (coords[0] && fromPos) {
        coords[0] = fromPos
      }

      setRoute(coords, {
        distanceKm: result.distanceKm,
        shortestKm: result.shortestKm,
        durationMin: result.durationMin,
        steps: result.steps,
      })
      setPlan({ status: 'navigating' })
      bus.emit(EVENTS.ROUTE_READY, { rerouted: true, reason })
    } catch (e) {
      setPlan({ status: 'error', error: 'Reroute failed' })
    } finally {
      inflight = null
    }
  }

  async function handleDemoTrip() {
    if (inflight) return
    inflight = true
    try {
      const trip = DEMO_TRIPS[0]
      setOrigin(trip.origin)
      setDestination(trip.destination)
      setMode(trip.mode)
      await handleGetRoute()
    } finally {
      inflight = null
    }
  }

  async function handleGetRoute() {
    if (inflight || !origin || !destination) return
    inflight = true
    try {
      setPlan({ status: 'loading' })
      const result = await getLongestRoute(origin, destination, mode)
      setRoute(result.coords, {
        distanceKm: result.distanceKm,
        shortestKm: result.shortestKm,
        durationMin: result.durationMin,
        steps: result.steps,
      })
      setPlan({ status: 'preview' })
      bus.emit(EVENTS.ROUTE_READY, { rerouted: false })
    } catch (e) {
      setPlan({ status: 'error', error: 'Routing failed. Offline mode.' })
    } finally {
      inflight = null
    }
  }

  function handleStart() {
    setPlan({ status: 'navigating' })
    bus.emit(EVENTS.TRIP_START, {})
  }

  function handleStop() {
    bus.emit(EVENTS.TRIP_RESET, {})
  }

  function handleNewTrip() {
    bus.emit(EVENTS.TRIP_RESET, {})
  }

  function handleModeChange(newMode) {
    if (newMode === mode) return
    setMode(newMode)
    if (plan.status === 'navigating' && destination) {
      bus.emit(EVENTS.REROUTE_REQUEST, { to: destination, reason: 'mode' })
    }
  }

  function handleSwap() {
    if (!origin || !destination) return
    const tmp = origin
    setOrigin(destination)
    setDestination(tmp)
  }

  function handlePickTarget(target) {
    useStore.getState().setPickTarget?.(target)
  }

  function handleReset() {
    resetAll()
    useStore.getState().setPickTarget?.(null)
  }

  return {
    plan,
    route,
    routeInfo: useStore.getState().routeInfo,
    origin,
    destination,
    mode,
    handleGetRoute,
    handleStart,
    handleStop,
    handleNewTrip,
    handleModeChange,
    handleSwap,
    handlePickTarget,
    handleDemoTrip,
  }
}