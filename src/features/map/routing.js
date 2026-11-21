import { CONFIG } from '../../config'
import { nearestIndex } from '../../lib/geo'
import { FALLBACK_DRIVE, FALLBACK_WALK } from './fallbackRoutes'

const ROUTE_CACHE = new Map()
const LAST_ROUTE_REQUEST = { time: 0 }

function latLngToLngLat(coords) {
  return coords.map(([lat, lng]) => [lng, lat])
}

function lngLatToLatLng(coords) {
  return coords.map(([lng, lat]) => [lat, lng])
}

async function rateLimitedFetch(url) {
  const now = Date.now()
  const elapsed = now - LAST_ROUTE_REQUEST.time
  if (elapsed < 1000) await new Promise(r => setTimeout(r, 1000 - elapsed))
  LAST_ROUTE_REQUEST.time = Date.now()
  return fetch(url)
}

function cacheKey(origin, destination, mode) {
  return `${origin.lat.toFixed(4)},${origin.lng.toFixed(4)}-${destination.lat.toFixed(4)},${destination.lng.toFixed(4)}-${mode}`
}

function buildOSRMUrl(origin, destination, profile, alternatives = 3) {
  const [oLng, oLat] = [origin.lng, origin.lat]
  const [dLng, dLat] = [destination.lng, destination.lat]
  return `https://router.project-osrm.org/route/v1/${profile}/${oLng},${oLat};${dLng},${dLat}?alternatives=${alternatives}&overview=full&geometries=geojson&steps=true`
}

async function fetchOSRM(origin, destination, profile) {
  const url = buildOSRMUrl(origin, destination, profile)
  const res = await rateLimitedFetch(url)
  if (!res.ok) throw new Error(`OSRM ${profile} failed: ${res.status}`)
  return res.json()
}

function mapSteps(geometry, osrmSteps) {
  const steps = []
  let vertexIdx = 0
  for (const leg of osrmSteps) {
    for (const step of leg.steps) {
      const maneuver = step.maneuver
      if (!maneuver) continue
      const idx = nearestIndex(geometry, [maneuver.location[1], maneuver.location[0]])
      steps.push({
        index: idx,
        type: step.maneuver.type,
        modifier: step.maneuver.modifier || 'straight',
        name: step.name || 'Unnamed road',
        distanceM: Math.round(step.distance),
      })
    }
  }
  return steps
}

function addDetours(geometry, mode) {
  const coords = [...geometry]
  const detourCount = Math.floor(Math.random() * 2) + 1
  const maxDetourKm = mode === 'drive' ? 4 : 1
  const minDetourKm = mode === 'drive' ? 1 : 0.3

  for (let i = 0; i < detourCount; i++) {
    const insertAt = Math.floor(Math.random() * (coords.length - 2)) + 1
    const [lat, lng] = coords[insertAt]
    const angle = Math.random() * Math.PI * 2
    const distKm = minDetourKm + Math.random() * (maxDetourKm - minDetourKm)
    const detourLat = lat + (distKm / 111) * Math.cos(angle)
    const detourLng = lng + (distKm / (111 * Math.cos(lat * Math.PI / 180))) * Math.sin(angle)
    coords.splice(insertAt, 0, [detourLat, detourLng])
  }
  return coords
}

export async function getLongestRoute(origin, destination, mode, options = {}) {
  const key = cacheKey(origin, destination, mode)
  const cached = ROUTE_CACHE.get(key)
  if (cached) return cached

  const profile = mode === 'walk' ? 'foot' : 'driving'
  const footUrl = `https://routing.openstreetmap.de/routed-foot/route/v1/foot/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?alternatives=3&overview=full&geometries=geojson&steps=true`
  const driveUrl = buildOSRMUrl(origin, destination, 'driving')

  let routes = []
  let usedFoot = false

  try {
    if (mode === 'walk') {
      try {
        const res = await rateLimitedFetch(footUrl)
        if (res.ok) {
          const data = await res.json()
          if (data.routes?.length) {
            routes = data.routes
            usedFoot = true
          }
        }
      } catch (e) {
        // fall through to driving
      }
    }

    if (!usedFoot || mode === 'drive') {
      const data = await fetchOSRM(origin, destination, 'driving')
      if (data.routes?.length) routes = data.routes
    }

    if (!routes.length) throw new Error('No routes returned')

    let bestRoute = null
    let shortestKm = Infinity

    for (const route of routes) {
      const geometry = lngLatToLatLng(route.geometry.coordinates)
      const distKm = route.distance / 1000
      if (distKm < shortestKm) shortestKm = distKm
      if (!bestRoute || distKm > bestRoute.distanceKm) {
        bestRoute = {
          coords: geometry,
          distanceKm: distKm,
          durationMin: Math.round(route.duration / 60),
          steps: mapSteps(geometry, route.legs),
        }
      }
    }

    if (routes.length === 1 && bestRoute) {
      const withDetours = addDetours(bestRoute.coords, mode)
      const detourDist = withDetours.reduce((sum, c, i) => {
        if (i === 0) return sum
        const [lat1, lng1] = withDetours[i - 1]
        const [lat2, lng2] = c
        const toRad = d => d * Math.PI / 180
        const dLat = toRad(lat2 - lat1)
        const dLng = toRad(lng2 - lng1)
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
        return sum + 2 * 6371 * Math.asin(Math.sqrt(a))
      }, 0)
      if (detourDist > bestRoute.distanceKm) {
        bestRoute = {
          ...bestRoute,
          coords: withDetours,
          distanceKm: detourDist,
          steps: mapSteps(withDetours, routes[0].legs),
        }
      }
    }

    const result = {
      coords: bestRoute.coords,
      distanceKm: Number(bestRoute.distanceKm.toFixed(2)),
      shortestKm: Number(shortestKm.toFixed(2)),
      durationMin: bestRoute.durationMin,
      steps: bestRoute.steps,
    }

    ROUTE_CACHE.set(key, result)
    return result
  } catch (e) {
    const fallback = mode === 'walk' ? FALLBACK_WALK : FALLBACK_DRIVE
    return { ...fallback, offline: true }
  }
}