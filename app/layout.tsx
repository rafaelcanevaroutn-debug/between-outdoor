import type { Metadata } from 'next'
import localFont from 'next/font/local'
import './globals.css'

const inter = localFont({
  src: '../public/fonts/inter-latin.woff2',
  weight: '400 600',
  style: 'normal',
  display: 'swap',
  variable: '--font-inter',
})

const bricolage = localFont({
  src: '../public/fonts/bricolage-grotesque-latin.woff2',
  weight: '400 600',
  style: 'normal',
  display: 'swap',
  variable: '--font-bricolage',
})

export const metadata: Metadata = {
  title: 'Between Outdoor — Contenido para aventura',
  description: 'Genera contenido profesional para tu agencia de turismo aventura',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`h-full ${inter.variable} ${bricolage.variable}`}>
      <body className="min-h-screen antialiased font-sans">
        {children}
      </body>
    </html>
  )
}
