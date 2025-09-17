'use client'

import { useRef, useEffect, useState } from 'react'

interface UseLeafletMapOptions {
  center: [number, number]
  zoom: number
}

export function useLeafletMap({ center, zoom }: UseLeafletMapOptions) {
  const mapRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isMapReady, setIsMapReady] = useState(false)
  const initializingRef = useRef(false)

  useEffect(() => {
    let mounted = true

    const initializeMap = async () => {
      console.log('Attempting to initialize map...')

      if (!containerRef.current) {
        console.log('Container ref not available')
        return
      }

      if (mapRef.current) {
        console.log('Map already exists')
        return
      }

      if (initializingRef.current) {
        console.log('Already initializing')
        return
      }

      try {
        initializingRef.current = true
        console.log('Starting map initialization...')

        // Dynamic import of Leaflet to avoid SSR issues
        const L = await import('leaflet')
        console.log('Leaflet imported successfully')

        // Note: Leaflet CSS should be loaded in the head of the document

        // Fix for default markers in Next.js
        delete (L.Icon.Default.prototype as any)._getIconUrl
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: '/leaflet/marker-icon-2x.png',
          iconUrl: '/leaflet/marker-icon.png',
          shadowUrl: '/leaflet/marker-shadow.png',
        })

        // Clear any existing map content
        containerRef.current.innerHTML = ''

        // Wait a moment for DOM to be ready
        await new Promise(resolve => setTimeout(resolve, 100))

        if (!mounted) {
          console.log('Component unmounted before map creation')
          return
        }

        console.log('Creating map instance...')
        // Create map instance
        const map = L.map(containerRef.current, {
          center,
          zoom,
          scrollWheelZoom: true,
          zoomControl: true,
          preferCanvas: false
        })

        console.log('Adding tile layer...')
        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map)

        if (mounted) {
          console.log('Map initialized successfully')
          mapRef.current = map
          setIsMapReady(true)
        } else {
          console.log('Component unmounted during initialization, removing map')
          map.remove()
        }
      } catch (error) {
        console.error('Error initializing map:', error)
        setIsMapReady(false)
      } finally {
        initializingRef.current = false
      }
    }

    // Small delay to ensure DOM is ready
    const timeoutId = setTimeout(initializeMap, 200)

    return () => {
      console.log('Cleaning up map hook...')
      mounted = false
      clearTimeout(timeoutId)

      if (mapRef.current) {
        try {
          mapRef.current.remove()
        } catch (error) {
          console.warn('Error removing map:', error)
        }
        mapRef.current = null
      }

      setIsMapReady(false)
      initializingRef.current = false
    }
  }, []) // Empty dependency array - only initialize once

  // Handle center/zoom changes
  useEffect(() => {
    if (mapRef.current && isMapReady) {
      mapRef.current.setView(center, zoom)
    }
  }, [center, zoom, isMapReady])

  return {
    map: mapRef.current,
    containerRef,
    isMapReady
  }
}