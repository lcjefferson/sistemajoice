import { useEffect, useRef, useState } from 'react'
import { Box, CircularProgress, Typography } from '@mui/material'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

export type MapPoint = { lat: number; lng: number; status: string }

const BR_CENTER: L.LatLngTuple = [-14.235, -51.9253]
const DEFAULT_ZOOM = 4
const SINGLE_ZOOM = 14

function statusColor(status: string): string {
  if (status === 'Conforme') return '#2e7d32'
  if (status === 'Pendente') return '#ed6c02'
  return '#c62828'
}

function statusTitle(status: string): string {
  if (status === 'Conforme') return 'Conforme'
  if (status === 'Pendente') return 'Pendente'
  return 'Não Conforme'
}

export default function DashboardMap({ points }: { points: MapPoint[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markersLayerRef = useRef<L.LayerGroup | null>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    let map: L.Map
    try {
      map = L.map(el, {
        center: BR_CENTER,
        zoom: DEFAULT_ZOOM,
        scrollWheelZoom: true
      })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" rel="noreferrer">OpenStreetMap</a>',
        maxZoom: 19
      }).addTo(map)

      markersLayerRef.current = L.layerGroup().addTo(map)
      mapRef.current = map
      setReady(true)
      setError(false)
    } catch (e) {
      console.error(e)
      setError(true)
      setReady(false)
      return
    }

    return () => {
      setReady(false)
      markersLayerRef.current = null
      mapRef.current = null
      map.remove()
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const layer = markersLayerRef.current
    if (!ready || !map || !layer) return

    layer.clearLayers()

    if (points.length === 0) {
      map.setView(BR_CENTER, DEFAULT_ZOOM)
      return
    }

    points.forEach((p, i) => {
      const fill = statusColor(p.status)
      const marker = L.circleMarker([p.lat, p.lng], {
        radius: 9,
        color: '#ffffff',
        weight: 2,
        fillColor: fill,
        fillOpacity: 1,
        zIndexOffset: i
      })
      marker.bindTooltip(statusTitle(p.status), { permanent: false, direction: 'top' })
      marker.addTo(layer)
    })

    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], SINGLE_ZOOM)
      return
    }

    const bounds = L.latLngBounds(points.map(p => [p.lat, p.lng] as L.LatLngTuple))
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 })
  }, [ready, points])

  if (error) {
    return (
      <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
        <Typography variant="body2" color="error">
          Não foi possível inicializar o mapa.
        </Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ position: 'relative', height: 300, borderRadius: 2, overflow: 'hidden', border: '1px solid #ddd' }}>
      {!ready && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'rgba(255,255,255,0.85)',
            zIndex: 1000
          }}
        >
          <CircularProgress size={32} />
        </Box>
      )}
      <div
        ref={containerRef}
        style={{ width: '100%', height: '100%', minHeight: 300 }}
        role="application"
        aria-label="Mapa OpenStreetMap com pontos de coleta"
      />
    </Box>
  )
}
