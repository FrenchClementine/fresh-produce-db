'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Create custom pulsating green hub icon
const createHubIcon = (isActive: boolean, isSelected: boolean) => {
  const size = isSelected ? 16 : 12
  const pulseClass = isActive ? 'hub-pulse' : ''
  const selectedRing = isSelected ? 'box-shadow: 0 0 0 4px rgba(34,197,94,0.4);' : ''
  
  return L.divIcon({
    html: `<div class="${pulseClass}" style="
      width: ${size}px;
      height: ${size}px;
      background-color: ${isActive ? '#22c55e' : '#86efac'};
      border: 2px solid rgba(34,197,94,0.8);
      border-radius: 50%;
      ${selectedRing}
    "></div>`,
    className: 'custom-hub-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2]
  })
}

interface HubWithCoordinates {
  id: string
  name: string
  hub_code: string
  country_code?: string
  city_name?: string
  region?: string
  is_active: boolean
  coordinates: [number, number]
}

interface RouteConnection {
  id: string
  origin: HubWithCoordinates
  destination: HubWithCoordinates
  transporter: string
  duration_days: number
  is_active: boolean
  type: 'transporter' | 'supplier'
}

interface LeafletMapProps {
  center: [number, number]
  zoom: number
  hubs: HubWithCoordinates[]
  routes: RouteConnection[]
  selectedHub: HubWithCoordinates | null
  onHubSelect: (hub: HubWithCoordinates | null) => void
}

export default function LeafletMapWrapper({
  center,
  zoom,
  hubs,
  routes,
  selectedHub,
  onHubSelect
}: LeafletMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const markersRef = useRef<L.Marker[]>([])
  const polylinesRef = useRef<L.Polyline[]>([])

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    // Create map instance
    const map = L.map(mapRef.current).setView(center, zoom)

    // Add grayscale tile layer without any text labels - only country borders
    L.tileLayer('https://tiles.stadiamaps.com/tiles/stamen_toner_background/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>, &copy; <a href="https://stamen.com/">Stamen Design</a>, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 20
    }).addTo(map)

    mapInstanceRef.current = map

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [center, zoom])

  // Update hub markers
  useEffect(() => {
    if (!mapInstanceRef.current) return

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove())
    markersRef.current = []

    // Add hub markers
    hubs.forEach(hub => {
      const isSelected = selectedHub?.id === hub.id
      const marker = L.marker(hub.coordinates, {
        icon: createHubIcon(hub.is_active, isSelected)
      })
        .bindPopup(`
          <div style="
            padding: 12px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            border: none;
            background: white;
          ">
            <h3 style="
              font-weight: 600; 
              margin: 0 0 8px 0; 
              font-size: 14px;
              color: #000;
            ">${hub.name}</h3>
            <p style="
              margin: 0 0 2px 0; 
              font-size: 12px; 
              color: #666;
              line-height: 1.4;
            ">${hub.city_name}</p>
            <p style="
              margin: 0 0 6px 0; 
              font-size: 11px; 
              color: #999;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            ">${hub.hub_code}</p>
            <span style="
              display: inline-block; 
              padding: 2px 6px; 
              border-radius: 3px; 
              font-size: 9px;
              font-weight: 500;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              background-color: ${hub.is_active ? '#000' : '#999'};
              color: white;
            ">
              ${hub.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
        `, {
          className: 'custom-popup'
        })
        .addTo(mapInstanceRef.current!)

      // Add event handlers
      marker.on('click', () => {
        onHubSelect(selectedHub?.id === hub.id ? null : hub)
      })

      marker.on('mouseover', () => {
        onHubSelect(hub)
      })

      markersRef.current.push(marker)
    })
  }, [hubs, selectedHub, onHubSelect])

  // Update route lines
  useEffect(() => {
    if (!mapInstanceRef.current || !selectedHub) {
      // Clear existing polylines
      polylinesRef.current.forEach(polyline => polyline.remove())
      polylinesRef.current = []
      return
    }

    // Clear existing polylines
    polylinesRef.current.forEach(polyline => polyline.remove())
    polylinesRef.current = []

    // Add route lines for selected hub
    const hubRoutes = routes.filter(route => 
      route.origin.id === selectedHub.id || route.destination.id === selectedHub.id
    )

    hubRoutes.forEach(route => {
      const polyline = L.polyline([
        route.origin.coordinates,
        route.destination.coordinates
      ], {
        color: '#22c55e',
        weight: 3,
        opacity: 0.8,
        dashArray: '8, 4',
        className: 'route-line'
      }).bindPopup(`
        <div style="
          padding: 12px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          border: none;
          background: white;
        ">
          <h4 style="
            font-weight: 600; 
            margin: 0 0 8px 0;
            font-size: 13px;
            color: #000;
          ">
            ${route.origin.name} → ${route.destination.name}
          </h4>
          <p style="
            margin: 0 0 2px 0; 
            font-size: 11px; 
            color: #666;
          ">
            ${route.transporter}
          </p>
          <p style="
            margin: 0 0 6px 0; 
            font-size: 10px; 
            color: #999;
          ">
            ${route.duration_days} day${route.duration_days !== 1 ? 's' : ''}
          </p>
          <span style="
            display: inline-block; 
            padding: 1px 4px; 
            border-radius: 2px; 
            font-size: 8px;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            background-color: #000;
            color: white;
          ">
            Route
          </span>
        </div>
      `, {
        className: 'custom-popup'
      })
      .addTo(mapInstanceRef.current!)

      polylinesRef.current.push(polyline)
    })
  }, [routes, selectedHub])

  return <div ref={mapRef} style={{ height: '100%', width: '100%' }} />
}