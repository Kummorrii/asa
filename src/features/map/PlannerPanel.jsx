import { useState, useEffect, useRef, useCallback } from 'react'
import { useStore } from '../../store'
import { bus } from '../../lib/bus'
import { EVENTS } from '../../lib/events'
import { searchPlaces, reverseGeocode } from './geocode'
import { DEMO_TRIPS } from './presets'
import { useRouteController } from './useRouteController'
import './map.css'

function debounce(fn, ms) {
  let timer = null
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), ms)
  }
}

export default function PlannerPanel() {
  const {
    mode, origin, destination, plan, routeInfo,
    setMode, setOrigin, setDestination, setPickTarget,
  } = useStore()

  const controller = useRouteController()

  const [originInput, setOriginInput] = useState('')
  const [destInput, setDestInput] = useState('')
  const [originSuggestions, setOriginSuggestions] = useState([])
  const [destSuggestions, setDestSuggestions] = useState([])
  const [showOriginSuggestions, setShowOriginSuggestions] = useState(false)
  const [showDestSuggestions, setShowDestSuggestions] = useState(false)
  const [pickTarget, setPickTargetState] = useState(null)
  const originInputRef = useRef(null)
  const destInputRef = useRef(null)

  useEffect(() => {
    if (origin) setOriginInput(origin.name)
    if (destination) setDestInput(destination.name)
  }, [origin, destination])

  useEffect(() => {
    setPickTarget(pickTarget)
    const setPick = useStore.getState().setPickTarget
    if (setPick) setPick(pickTarget)
  }, [pickTarget])

  const debouncedOriginSearch = useCallback(debounce(async (q) => {
    if (q.length < 2) { setOriginSuggestions([]); return }
    const results = await searchPlaces(q)
    setOriginSuggestions(results)
  }, 600), [])

  const debouncedDestSearch = useCallback(debounce(async (q) => {
    if (q.length < 2) { setDestSuggestions([]); return }
    const results = await searchPlaces(q)
    setDestSuggestions(results)
  }, 600), [])

  const handleOriginChange = (e) => {
    const val = e.target.value
    setOriginInput(val)
    debouncedOriginSearch(val)
    setShowOriginSuggestions(true)
  }

  const handleDestChange = (e) => {
    const val = e.target.value
    setDestInput(val)
    debouncedDestSearch(val)
    setShowDestSuggestions(true)
  }

  const selectOrigin = (place) => {
    setOrigin({ lat: place.lat, lng: place.lng, name: place.name })
    setOriginInput(place.name)
    setOriginSuggestions([])
    setShowOriginSuggestions(false)
  }

  const selectDest = (place) => {
    setDestination({ lat: place.lat, lng: place.lng, name: place.name })
    setDestInput(place.name)
    setDestSuggestions([])
    setShowDestSuggestions(false)
  }

  const handleSwap = () => {
    if (!origin || !destination) return
    const tmp = origin
    setOrigin(destination)
    setDestination(tmp)
    setOriginInput(destination.name)
    setDestInput(origin.name)
  }

  const handleDemoTrip = () => {
    const trip = DEMO_TRIPS[0]
    setOrigin(trip.origin)
    setDestination(trip.destination)
    setMode(trip.mode)
    setOriginInput(trip.origin.name)
    setDestInput(trip.destination.name)
    controller.handleDemoTrip()
  }

  const handleModeChange = (newMode) => {
    controller.handleModeChange(newMode)
  }

  const renderSuggestions = (suggestions, show, onSelect, inputRef) => {
    if (!show || suggestions.length === 0) return null
    return (
      <ul className="map-suggestions" role="listbox">
        {suggestions.map((p, i) => (
          <li key={i} role="option" onClick={() => onSelect(p)}>
            {p.name}
          </li>
        ))}
      </ul>
    )
  }

  return (
    <div className="panel map-planner">
      <h3 style={{ margin: '0 0 12px', fontSize: '16px' }}>🧭 ASA Planner</h3>

      <div style={{ marginBottom: '12px' }}>
        <label>Choose starting point (A)</label>
        <div className="map-input-wrapper">
          <input
            ref={originInputRef}
            type="text"
            value={originInput}
            onChange={handleOriginChange}
            onFocus={() => setShowOriginSuggestions(true)}
            onBlur={() => setTimeout(() => setShowOriginSuggestions(false), 150)}
            placeholder="Type or pick on map..."
            autoComplete="off"
          />
          <button className="btn ghost map-pick-btn" onClick={() => setPickTargetState('origin')} title="Pick on map">📍</button>
        </div>
        {renderSuggestions(originSuggestions, showOriginSuggestions, selectOrigin, originInputRef)}
      </div>

      <div style={{ marginBottom: '12px' }}>
        <label>Choose destination (B)</label>
        <div className="map-input-wrapper">
          <input
            ref={destInputRef}
            type="text"
            value={destInput}
            onChange={handleDestChange}
            onFocus={() => setShowDestSuggestions(true)}
            onBlur={() => setTimeout(() => setShowDestSuggestions(false), 150)}
            placeholder="Type or pick on map..."
            autoComplete="off"
          />
          <button className="btn ghost map-pick-btn" onClick={() => setPickTargetState('destination')} title="Pick on map">📍</button>
        </div>
        {renderSuggestions(destSuggestions, showDestSuggestions, selectDest, destInputRef)}
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        <button className="btn ghost" onClick={handleSwap} title="Swap start and destination" style={{ flex: 1 }}>⇅ Swap</button>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        <button
          className={`btn ${mode === 'drive' ? '' : 'ghost'}`}
          onClick={() => handleModeChange('drive')}
          style={{ flex: 1 }}
        >🚗 Drive</button>
        <button
          className={`btn ${mode === 'walk' ? '' : 'ghost'}`}
          onClick={() => handleModeChange('walk')}
          style={{ flex: 1 }}
        >🚶 Walk</button>
      </div>

      {plan.status === 'loading' && (
        <div className="map-status loading">Gikalkula ang pinakalayo nga dalan... 🐢</div>
      )}

      {plan.status === 'error' && (
        <div className="map-status error">Dili makakita ug dalan. Offline mode activated. 📴</div>
      )}

      {plan.status === 'preview' && routeInfo && (
        <div className="map-preview">
          <div style={{ marginBottom: '8px' }}>
            <strong>Distance:</strong> {routeInfo.distanceKm} km
            <br />
            <small style={{ color: '#aaa' }}>
              (Shortest would be {routeInfo.shortestKm} km, we took {routeInfo.distanceKm} km! 😈)
            </small>
          </div>
          <div style={{ marginBottom: '8px' }}>
            <strong>ETA:</strong> ~{routeInfo.durationMin} min
          </div>
          <button className="btn" onClick={controller.handleStart} style={{ width: '100%' }}>Start Trip ▶</button>
        </div>
      )}

      {plan.status === 'navigating' && (
        <button className="btn danger" onClick={controller.handleStop} style={{ width: '100%' }}>Stop Trip ⏹</button>
      )}

      {plan.status === 'arrived' && (
        <button className="btn" onClick={controller.handleNewTrip} style={{ width: '100%' }}>New Trip 🔄</button>
      )}

      <button className="btn ghost" onClick={handleDemoTrip} style={{ width: '100%', marginTop: '12px' }}>Quick Demo Trip 🎭</button>

      {pickTarget && (
        <div className="map-pick-hint">Click on map to set {pickTarget === 'origin' ? 'start' : 'destination'}... (ESC to cancel)</div>
      )}
    </div>
  )
}