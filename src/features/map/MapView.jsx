import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Pane, Marker, Polyline, useMap, useMapEvents } from 'react-leaflet'
import { useStore } from '../../store'
import { bus } from '../../lib/bus'
import { EVENTS } from '../../lib/events'
import { CONFIG } from '../../config'
import { reverseGeocode } from './geocode'
import './map.css'

const greenIcon = new (require('leaflet').Icon)({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
})
greenIcon.options.className = 'map-pin-origin'

const redIcon = new (require('leaflet').Icon)({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
})
redIcon.options.className = 'map-pin-destination'

function RoutePolyline({ route }) {
  if (!route || route.length < 2) return null
  return (
    <Polyline
      pathOptions={{ color: '#2196f3', weight: 5, opacity: 0.8 }}
      positions={route}
    />
  )
}

function OriginMarker({ onDragEnd }) {
  const origin = useStore(s => s.origin)
  if (!origin) return null
  return (
    <Marker
      position={[origin.lat, origin.lng]}
      draggable={true}
      onDragEnd={onDragEnd}
      icon={greenIcon}
    >
      <div className="map-pin-label">A</div>
    </Marker>
  )
}

function DestinationMarker({ onDragEnd }) {
  const destination = useStore(s => s.destination)
  if (!destination) return null
  return (
    <Marker
      position={[destination.lat, destination.lng]}
      draggable={true}
      onDragEnd={onDragEnd}
      icon={redIcon}
    >
      <div className="map-pin-label">B</div>
    </Marker>
  )
}

function AutoFit({ route, status }) {
  const map = useMap()
  const fittedRef = useRef(false)
  useEffect(() => {
    if (status !== 'preview' || !route || route.length < 2) {
      fittedRef.current = false
      return
    }
    if (!fittedRef.current) {
      const bounds = route.map(([lat, lng]) => [lat, lng])
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 })
      fittedRef.current = true
    }
  }, [route, status, map])
  return null
}

function MapClickHandler({ pickTarget }) {
  const { setOrigin, setDestination } = useStore.getState()
  useMapEvents({
    click(e) {
      if (!pickTarget) return
      const { lat, lng } = e.latlng
      handleMapPick(lat, lng, pickTarget, setOrigin, setDestination)
    },
  })
  return null
}

async function handleMapPick(lat, lng, target, setOrigin, setDestination) {
  const point = { lat, lng, name: `Pinned (${lat.toFixed(4)}, ${lng.toFixed(4)})` }
  if (target === 'origin') setOrigin(point)
  else setDestination(point)
  try {
    const geocoded = await reverseGeocode(lat, lng)
    if (target === 'origin') setOrigin(geocoded)
    else setDestination(geocoded)
  } catch (e) {
    // keep pinned name
  }
}

function MapContextMenu() {
  const map = useMap()
  const [menu, setMenu] = useState(null)
  const { setOrigin, setDestination } = useStore.getState()

  useMapEvents({
    contextmenu(e) {
      e.originalEvent.preventDefault()
      setMenu({ lat: e.latlng.lat, lng: e.latlng.lng })
    },
    click() { setMenu(null) },
    zoomstart() { setMenu(null) },
    dragstart() { setMenu(null) },
  })

  if (!menu) return null

  return (
    <div className="map-context-menu" style={{ left: map.latLngToContainerPoint([menu.lat, menu.lng]).x, top: map.latLngToContainerPoint([menu.lat, menu.lng]).y }}>
      <button onClick={() => { handleMapPick(menu.lat, menu.lng, 'origin', setOrigin, setDestination); setMenu(null) }}>Set as start</button>
      <button onClick={() => { handleMapPick(menu.lat, menu.lng, 'destination', setOrigin, setDestination); setMenu(null) }}>Set as destination</button>
    </div>
  )
}

function DragHandlers() {
  const { setOrigin, setDestination } = useStore.getState()

  const handleOriginDrag = async (e) => {
    const { lat, lng } = e.target.getLatLng()
    setOrigin({ lat, lng, name: `Pinned (${lat.toFixed(4)}, ${lng.toFixed(4)})` })
    try {
      const geocoded = await reverseGeocode(lat, lng)
      setOrigin(geocoded)
    } catch (e) {}
  }

  const handleDestDrag = async (e) => {
    const { lat, lng } = e.target.getLatLng()
    setDestination({ lat, lng, name: `Pinned (${lat.toFixed(4)}, ${lng.toFixed(4)})` })
    try {
      const geocoded = await reverseGeocode(lat, lng)
      setDestination(geocoded)
    } catch (e) {}
  }

  return (
    <>
      <OriginMarker onDragEnd={handleOriginDrag} />
      <DestinationMarker onDragEnd={handleDestDrag} />
    </>
  )
}

export default function MapView({ children }) {
  const { route, plan, origin, destination } = useStore()
  const pickTarget = useStore(s => s._pickTarget)

  return (
    <MapContainer
      center={CONFIG.MAP_CENTER}
      zoom={CONFIG.MAP_ZOOM}
      style={{ width: '100%', height: '100%' }}
      scrollWheelZoom={true}
      zoomControl={false}
      attributionControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Pane name="route" style={{ zIndex: 450 }}>
        <RoutePolyline route={route} />
        <AutoFit route={route} status={plan.status} />
      </Pane>
      <Pane name="overlays" style={{ zIndex: 460 }}>
        {children}
      </Pane>
      <Pane name="markers" style={{ zIndex: 470 }}>
        <DragHandlers />
      </Pane>
      <MapClickHandler pickTarget={pickTarget} />
      <MapContextMenu />
    </MapContainer>
  )
}