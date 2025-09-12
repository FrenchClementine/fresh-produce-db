import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatWeight(kg: number) {
  if (kg >= 1000) {
    return `${(kg / 1000).toFixed(1)}t`
  }
  return `${kg}kg`
}

export function getCountryFlag(countryCode: string) {
  const flags: Record<string, string> = {
    'Spain': '🇪🇸',
    'Italy': '🇮🇹',
    'Netherlands': '🇳🇱',
    'France': '🇫🇷',
    'Germany': '🇩🇪',
    'Poland': '🇵🇱',
    'Turkey': '🇹🇷',
    'Greece': '🇬🇷',
    'Portugal': '🇵🇹',
    'Belgium': '🇧🇪',
  }
  
  return flags[countryCode] || '🌍'
}

export function getProductEmoji(productName: string) {
  const emojis: Record<string, string> = {
    'Apples': '🍎',
    'Pears': '🍐',
    'Strawberries': '🍓',
    'Oranges': '🍊',
    'Lemons': '🍋',
    'Tomatoes': '🍅',
    'Peppers': '🌶️',
    'Lettuce': '🥬',
    'Onions': '🧅',
    'Potatoes': '🥔',
  }
  
  return emojis[productName] || '🥕'
}

export function getSeasonColor(month: number) {
  if (month >= 3 && month <= 5) return 'bg-green-200' // Spring
  if (month >= 6 && month <= 8) return 'bg-yellow-200' // Summer  
  if (month >= 9 && month <= 11) return 'bg-orange-200' // Autumn
  return 'bg-blue-200' // Winter
}