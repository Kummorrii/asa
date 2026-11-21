import { CONFIG } from '../../config'
import { PRESETS } from './presets'

const CACHE = new Map()
const LAST_REQUEST = { time: 0 }

const CEBU_VIEWBOX = '123.7,10.5,124.1,10.2'

async function rateLimitedFetch(url) {
  const now = Date.now()
  const elapsed = now - LAST_REQUEST.time
  if (elapsed < 1000) await new Promise(r => setTimeout(r, 1000 - elapsed))
  LAST_REQUEST.time = Date.now()
  return fetch(url, { headers: { 'User-Agent': 'ASA-App/1.0' } })
}

export async function searchPlaces(query) {
  if (!query || query.length < 2) return []

  const cached = CACHE.get(query)
  if (cached) return cached

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(query)}&limit=5&countrycodes=${CONFIG.SEARCH_COUNTRY}&viewbox=${CEBU_VIEWBOX}&bounded=0`
    const res = await rateLimitedFetch(url)
    if (!res.ok) throw new Error('Nominatim search failed')
    const data = await res.json()
    const results = data.map(item => ({
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      name: item.display_name.split(',')[0],
    }))
    CACHE.set(query, results)
    return results
  } catch (e) {
    const fallback = PRESETS
      .filter(p => p.name.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 5)
      .map(p => ({ lat: p.lat, lng: p.lng, name: p.name }))
    return fallback
  }
}

export async function reverseGeocode(lat, lng) {
  const key = `${lat.toFixed(4)},${lng.toFixed(4)}`
  const cached = CACHE.get(key)
  if (cached) return cached

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`
    const res = await rateLimitedFetch(url)
    if (!res.ok) throw new Error('Nominatim reverse failed')
    const data = await res.json()
    const name = data.display_name?.split(',')[0] || `Pinned location (${lat.toFixed(4)}, ${lng.toFixed(4)})`
    const result = { lat, lng, name }
    CACHE.set(key, result)
    return result
  } catch (e) {
    return { lat, lng, name: `Pinned location (${lat.toFixed(4)}, ${lng.toFixed(4)})` }
  }
}