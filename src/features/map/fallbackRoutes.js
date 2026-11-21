function jitterPath(start, end, vertices, kmJitter) {
  const path = [start]
  for (let i = 1; i < vertices; i++) {
    const t = i / vertices
    const lat = start[0] + t * (end[0] - start[0])
    const lng = start[1] + t * (end[1] - start[1])
    const jitterLat = (Math.random() - 0.5) * kmJitter / 111
    const jitterLng = (Math.random() - 0.5) * kmJitter / (111 * Math.cos(start[0] * Math.PI / 180))
    path.push([lat + jitterLat, lng + jitterLng])
  }
  path.push(end)
  return path
}

export const FALLBACK_DRIVE = {
  coords: jitterPath(
    [10.3075, 123.9772],
    [10.3246, 123.8975],
    60,
    2
  ),
  distanceKm: 18.5,
  shortestKm: 12.3,
  durationMin: 35,
  steps: [
    { index: 5, type: 'turn', modifier: 'left', name: 'Mactan-Mandaue Bridge', distanceM: 2100 },
    { index: 15, type: 'turn', modifier: 'right', name: 'A.C. Cortes Ave', distanceM: 3200 },
    { index: 30, type: 'turn', modifier: 'left', name: 'M.C. Briones St', distanceM: 1800 },
    { index: 45, type: 'turn', modifier: 'right', name: 'Osmeña Blvd', distanceM: 1200 },
  ],
  offline: true,
}

export const FALLBACK_WALK = {
  coords: jitterPath(
    [10.2935, 123.9022],
    [10.2918, 123.9062],
    45,
    0.5
  ),
  distanceKm: 1.2,
  shortestKm: 0.6,
  durationMin: 18,
  steps: [
    { index: 8, type: 'turn', modifier: 'right', name: 'P. Burgos St', distanceM: 200 },
    { index: 20, type: 'turn', modifier: 'left', name: 'M.J. Cuenco Ave', distanceM: 300 },
    { index: 35, type: 'turn', modifier: 'right', name: 'A. Pigafetta St', distanceM: 150 },
  ],
  offline: true,
}