import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { RootProviders } from '@/components/providers/root-providers'

const inter = Inter({ subsets: ['latin'] })
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono'
})

export const metadata: Metadata = {
  title: 'Trade Terminal - Produce Services Europe',
  description: 'Bloomberg-style trading terminal for fresh produce operations',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} ${jetbrainsMono.variable} bg-terminal-dark text-terminal-text`}>
        <RootProviders>{children}</RootProviders>
      </body>
    </html>
  )
}