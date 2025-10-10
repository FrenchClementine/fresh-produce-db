'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Hook to detect when a value changes and trigger a flash animation
 * Returns true for a brief moment when the value changes
 */
export function useFlashOnChange<T>(value: T, duration: number = 2000): boolean {
  const [isFlashing, setIsFlashing] = useState(false)
  const prevValueRef = useRef<T>(value)
  const timeoutRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    // Compare current value with previous value
    const hasChanged = JSON.stringify(value) !== JSON.stringify(prevValueRef.current)

    if (hasChanged && prevValueRef.current !== undefined) {
      // Trigger flash
      setIsFlashing(true)

      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      // Stop flashing after duration
      timeoutRef.current = setTimeout(() => {
        setIsFlashing(false)
      }, duration)
    }

    // Update previous value
    prevValueRef.current = value

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [value, duration])

  return isFlashing
}

/**
 * Hook to track changes for multiple items by ID
 * Returns a Set of IDs that are currently flashing
 */
export function useFlashOnChangeById<T extends { id: string }>(
  items: T[],
  duration: number = 2000,
  compareKey?: keyof T
): Set<string> {
  const [flashingIds, setFlashingIds] = useState<Set<string>>(new Set())
  const prevItemsRef = useRef<Map<string, T>>(new Map())
  const timeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map())

  useEffect(() => {
    const newFlashingIds = new Set<string>()
    const currentItems = new Map<string, T>()

    items.forEach(item => {
      currentItems.set(item.id, item)
      const prevItem = prevItemsRef.current.get(item.id)

      if (prevItem) {
        // Compare the items
        const valueToCompare = compareKey ? item[compareKey] : item
        const prevValueToCompare = compareKey ? prevItem[compareKey] : prevItem

        const hasChanged = JSON.stringify(valueToCompare) !== JSON.stringify(prevValueToCompare)

        if (hasChanged) {
          newFlashingIds.add(item.id)

          // Clear existing timeout for this ID
          const existingTimeout = timeoutsRef.current.get(item.id)
          if (existingTimeout) {
            clearTimeout(existingTimeout)
          }

          // Set new timeout to stop flashing
          const timeout = setTimeout(() => {
            setFlashingIds(prev => {
              const next = new Set(prev)
              next.delete(item.id)
              return next
            })
            timeoutsRef.current.delete(item.id)
          }, duration)

          timeoutsRef.current.set(item.id, timeout)
        }
      }
    })

    // Update flashing IDs if there are new ones
    if (newFlashingIds.size > 0) {
      setFlashingIds(prev => new Set([...prev, ...newFlashingIds]))
    }

    // Update previous items
    prevItemsRef.current = currentItems

    // Cleanup
    return () => {
      timeoutsRef.current.forEach(timeout => clearTimeout(timeout))
    }
  }, [items, duration, compareKey])

  return flashingIds
}
