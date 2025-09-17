'use client'

import { useEffect, useState } from 'react'
import { useLeafletMap } from '@/hooks/use-leaflet-map'

interface Hub {
  id: string
  name: string
  hub_code: string
  city_name: string
  country_code: string
  latitude: number
  longitude: number
  can_transship: boolean
}

interface RouteInfo {
  fromLocation: string
  toLocation: string
  fromHub: Hub | null
  toHub: Hub | null
  distance: number
  routeCoordinates: [number, number][]
  isRoadDistance?: boolean
}

interface TransportMapProps {
  hubs: Hub[]
  routeInfo: RouteInfo | null
  onHubClick?: (hub: Hub) => void
}

// Custom hub icon
const createHubIcon = async (isOrigin?: boolean, isDestination?: boolean, isTransship?: boolean) => {
  const L = await import('leaflet')
  let iconHtml = ''

  if (isOrigin) {
    iconHtml = `<div style="display: flex; align-items: center; justify-content: center; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2)); transition: transform 0.2s;">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" fill="#10b981" stroke="white" stroke-width="2"/>
        <circle cx="12" cy="12" r="3" fill="white"/>
      </svg>
    </div>`
  } else if (isDestination) {
    iconHtml = `<div style="display: flex; align-items: center; justify-content: center; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2)); transition: transform 0.2s;">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" fill="#ef4444" stroke="white" stroke-width="2"/>
        <circle cx="12" cy="12" r="3" fill="white"/>
      </svg>
    </div>`
  } else if (isTransship) {
    iconHtml = `<div style="display: flex; align-items: center; justify-content: center; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2)); transition: transform 0.2s;">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="8" fill="#3b82f6" stroke="white" stroke-width="2"/>
      </svg>
    </div>`
  } else {
    iconHtml = `<div style="display: flex; align-items: center; justify-content: center; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2)); transition: transform 0.2s;">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="6" fill="#6b7280" stroke="white" stroke-width="2"/>
      </svg>
    </div>`
  }

  return L.divIcon({
    html: iconHtml,
    className: '',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12]
  })
}

// Create curved path between two points (Great Circle)
const createCurvedPath = (start: [number, number], end: [number, number]): [number, number][] => {
  const points: [number, number][] = []
  const steps = 50

  for (let i = 0; i <= steps; i++) {
    const t = i / steps

    // Interpolate along great circle
    const lat1 = start[0] * Math.PI / 180
    const lon1 = start[1] * Math.PI / 180
    const lat2 = end[0] * Math.PI / 180
    const lon2 = end[1] * Math.PI / 180

    const d = 2 * Math.asin(Math.sqrt(
      Math.pow(Math.sin((lat2 - lat1) / 2), 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin((lon2 - lon1) / 2), 2)
    ))

    const A = Math.sin((1 - t) * d) / Math.sin(d)
    const B = Math.sin(t * d) / Math.sin(d)

    const x = A * Math.cos(lat1) * Math.cos(lon1) + B * Math.cos(lat2) * Math.cos(lon2)
    const y = A * Math.cos(lat1) * Math.sin(lon1) + B * Math.cos(lat2) * Math.sin(lon2)
    const z = A * Math.sin(lat1) + B * Math.sin(lat2)

    const lat = Math.atan2(z, Math.sqrt(x * x + y * y)) * 180 / Math.PI
    const lon = Math.atan2(y, x) * 180 / Math.PI

    points.push([lat, lon])
  }

  return points
}

export default function TransportMap({ hubs, routeInfo, onHubClick }: TransportMapProps) {
  // Default center (Europe)
  const defaultCenter: [number, number] = [50.0, 10.0]
  const defaultZoom = 5

  const { map, containerRef, isMapReady } = useLeafletMap({
    center: defaultCenter,
    zoom: defaultZoom
  })

  const [markersLayer, setMarkersLayer] = useState<any>(null)
  const [routeLayer, setRouteLayer] = useState<any>(null)

  // Initialize layers when map is ready
  useEffect(() => {
    const initializeLayers = async () => {
      if (!map || !isMapReady) return

      const L = await import('leaflet')
      const markers = L.layerGroup().addTo(map)
      const routes = L.layerGroup().addTo(map)

      setMarkersLayer(markers)
      setRouteLayer(routes)
    }

    initializeLayers()

    return () => {
      if (markersLayer) {
        markersLayer.clearLayers()
        map?.removeLayer(markersLayer)
      }
      if (routeLayer) {
        routeLayer.clearLayers()
        map?.removeLayer(routeLayer)
      }
    }
  }, [map, isMapReady])

  // Update hub markers
  useEffect(() => {
    const updateMarkers = async () => {
      if (!markersLayer || !hubs) return

      const L = await import('leaflet')
      markersLayer.clearLayers()

      for (const hub of hubs) {
        const isOrigin = routeInfo?.fromHub?.id === hub.id
        const isDestination = routeInfo?.toHub?.id === hub.id

        const icon = await createHubIcon(isOrigin, isDestination, hub.can_transship)
        const marker = L.marker([hub.latitude, hub.longitude], { icon })

        // Add popup
        const popupContent = `
          <div style="padding: 8px;">
            <h3 style="font-weight: bold; font-size: 18px; margin: 0 0 4px 0;">${hub.name}</h3>
            <p style="font-size: 14px; color: #6b7280; margin: 0 0 4px 0;">${hub.hub_code}</p>
            <p style="font-size: 14px; margin: 0 0 8px 0;">${hub.city_name}, ${hub.country_code}</p>
            ${hub.can_transship ? '<p style="font-size: 12px; color: #3b82f6; margin: 0;">✓ Transshipment Hub</p>' : ''}
            ${isOrigin ? '<p style="font-size: 12px; color: #10b981; margin: 0; font-weight: 600;">📍 Origin Hub</p>' : ''}
            ${isDestination ? '<p style="font-size: 12px; color: #ef4444; margin: 0; font-weight: 600;">🎯 Destination Hub</p>' : ''}
          </div>
        `

        marker.bindPopup(popupContent)

        // Add click handler
        if (onHubClick) {
          marker.on('click', () => onHubClick(hub))
        }

        markersLayer.addLayer(marker)
      }
    }

    updateMarkers()
  }, [markersLayer, hubs, routeInfo, onHubClick])

  // Update route visualization
  useEffect(() => {
    const updateRoute = async () => {
      if (!routeLayer || !routeInfo?.fromHub || !routeInfo?.toHub) return

      const L = await import('leaflet')
      routeLayer.clearLayers()

      // Create route path
      const routePath = createCurvedPath(
        [routeInfo.fromHub.latitude, routeInfo.fromHub.longitude],
        [routeInfo.toHub.latitude, routeInfo.toHub.longitude]
      )

      // Add shadow line for depth
      const shadowLine = L.polyline(routePath, {
        color: '#000000',
        weight: 6,
        opacity: 0.1
      })

      // Add main route line
      const routeLine = L.polyline(routePath, {
        color: '#3b82f6',
        weight: 4,
        opacity: 0.8,
        dashArray: '10, 10'
      })

      routeLayer.addLayer(shadowLine)
      routeLayer.addLayer(routeLine)

      // Add distance label at midpoint
      const midLat = (routeInfo.fromHub.latitude + routeInfo.toHub.latitude) / 2
      const midLng = (routeInfo.fromHub.longitude + routeInfo.toHub.longitude) / 2

      const distanceMarker = L.marker([midLat, midLng], {
        icon: L.divIcon({
          html: `
            <div style="
              background: white;
              border: 2px solid #3b82f6;
              border-radius: 20px;
              padding: 4px 12px;
              font-weight: 600;
              color: #3b82f6;
              font-size: 14px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            ">
              ${routeInfo.distance} km ${routeInfo.isRoadDistance ? '🛣️' : '📏'}
            </div>
          `,
          className: '',
          iconSize: [80, 30],
          iconAnchor: [40, 15]
        })
      })

      routeLayer.addLayer(distanceMarker)

      // Fit map to show both hubs
      if (map) {
        const bounds = L.latLngBounds([
          [routeInfo.fromHub.latitude, routeInfo.fromHub.longitude],
          [routeInfo.toHub.latitude, routeInfo.toHub.longitude]
        ])
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 8 })
      }
    }

    updateRoute()
  }, [routeLayer, routeInfo, map])

  return (
    <div className="relative h-full w-full">
      <div
        ref={containerRef}
        className="h-full w-full"
        style={{
          height: '100%',
          width: '100%',
          background: '#f8f9fa'
        }}
      />
      {!isMapReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50/80 backdrop-blur-sm">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-gray-500">Loading map...</p>
          </div>
        </div>
      )}
    </div>
  )
}
