import { TradePotential } from '@/types/trade-potential'

export function calculateReadinessScore(potential: TradePotential): number {
  let score = 0

  // Completion status (40 points)
  if (potential.status === 'complete') {
    score += 40
  } else if (potential.status === 'missing_price') {
    score += 20
  } else if (potential.status === 'missing_transport') {
    score += 20
  }
  // missing_both gets 0

  // Margin percentage (30 points)
  if (potential.supplierPrice?.pricePerUnit) {
    const offerPrice = potential.opportunity?.offerPrice || potential.supplierPrice.pricePerUnit * 1.15
    const margin = offerPrice - potential.supplierPrice.pricePerUnit
    const marginPercent = (margin / offerPrice) * 100

    if (marginPercent >= 20) score += 30
    else if (marginPercent >= 15) score += 25
    else if (marginPercent >= 10) score += 20
    else if (marginPercent >= 5) score += 10
  }

  // Urgency - expiring soon (20 points)
  if (potential.supplierPrice?.validUntil) {
    const daysUntilExpiry = getDaysUntilExpiry(potential.supplierPrice.validUntil)
    if (daysUntilExpiry <= 3) score += 20
    else if (daysUntilExpiry <= 7) score += 15
    else if (daysUntilExpiry <= 14) score += 10
  }

  // Already has opportunity (-10 points, deprioritize)
  if (potential.hasOpportunity) {
    score -= 10
  }

  // Active opportunity that's not converted yet (bonus 5 points)
  if (potential.isActiveOpportunity) {
    score += 5
  }

  return Math.max(0, score) // Don't go negative
}

function getDaysUntilExpiry(validUntil: string): number {
  const now = new Date()
  const expiryDate = new Date(validUntil)
  const diffTime = expiryDate.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

export function sortByReadinessScore(potentials: TradePotential[]): TradePotential[] {
  return [...potentials].sort((a, b) => {
    const scoreA = calculateReadinessScore(a)
    const scoreB = calculateReadinessScore(b)
    return scoreB - scoreA // Descending order (highest first)
  })
}

export function getReadinessLabel(score: number): {
  label: string
  color: string
} {
  if (score >= 70) {
    return { label: '🔥 Hot Lead', color: 'text-red-600' }
  } else if (score >= 50) {
    return { label: '⭐ High Priority', color: 'text-orange-600' }
  } else if (score >= 30) {
    return { label: '✓ Ready', color: 'text-green-600' }
  } else if (score >= 10) {
    return { label: '⏳ Needs Work', color: 'text-yellow-600' }
  } else {
    return { label: '❌ Low Priority', color: 'text-gray-600' }
  }
}
