import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Between Outdoor — Contenido para aventura',
  description: 'Genera contenido profesional para tu agencia de turismo aventura',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark h-full">
      <head>
        <link
          href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700,900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className="min-h-screen antialiased"
        style={{ backgroundColor: '#0A0F0A', color: '#EAF2EC', fontFamily: "'Satoshi', system-ui, sans-serif" }}
      >
        {children}
      </body>
    </html>
  )
}
