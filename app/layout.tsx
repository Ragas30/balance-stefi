import type { Metadata } from 'next'
import './globals.css'
import Sidebar from '@/components/Sidebar'

export const metadata: Metadata = {
  title: 'STEFI Finance — Sistem Keuangan Minimarket',
  description: 'Sistem Laporan Keuangan Minimarket Modern',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-mesh min-h-screen">
        <div className="relative flex min-h-screen flex-col md:flex-row">
          <Sidebar />
          <main className="flex-1 p-4 md:h-screen md:overflow-y-auto md:p-8 md:pl-6">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
