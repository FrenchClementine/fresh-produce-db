'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to Trade Overview on page load
    router.replace('/trade/overview')
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen bg-terminal-dark">
      <div className="text-terminal-text font-mono">Loading...</div>
    </div>
  )
}
