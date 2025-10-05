export interface PriceStatus {
  isExpired: boolean
  isExpiringSoon: boolean
  daysUntilExpiry?: number
  expiryDate?: Date
}

export function getPriceStatus(validUntil: string | null | undefined): PriceStatus {
  if (!validUntil) {
    return {
      isExpired: false,
      isExpiringSoon: false
    }
  }

  const now = new Date()
  const expiryDate = new Date(validUntil)
  const diffTime = expiryDate.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  return {
    isExpired: diffDays < 0,
    isExpiringSoon: diffDays >= 0 && diffDays <= 7,
    daysUntilExpiry: Math.max(0, diffDays),
    expiryDate
  }
}

export function formatPriceStatusBadge(status: PriceStatus): {
  variant: 'destructive' | 'outline' | 'secondary'
  text: string
} {
  if (status.isExpired) {
    return {
      variant: 'destructive',
      text: 'Price Expired'
    }
  }

  if (status.isExpiringSoon) {
    return {
      variant: 'outline',
      text: `Expires in ${status.daysUntilExpiry} day${status.daysUntilExpiry === 1 ? '' : 's'}`
    }
  }

  return {
    variant: 'secondary',
    text: 'Price Valid'
  }
}