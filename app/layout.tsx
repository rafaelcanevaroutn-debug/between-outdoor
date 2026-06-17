import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Between Outdoor — Contenido para aventura',
  description: 'Genera contenido profesional para tu agencia de turismo aventura',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark h-full">
      <body className="min-h-screen antialiased" style={{ backgroundColor: '#0A0F0A', color: '#F0FFF4' }}>
        {children}
      </body>
    </html>
  )
}
