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
  title: 'PSEurope - Fresh Produce Services Platform',
  description: 'Professional trading platform for fresh produce operations across Europe',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} ${jetbrainsMono.variable} bg-background text-foreground`}>
        <RootProviders>{children}</RootProviders>
      </body>
    </html>
  )
}