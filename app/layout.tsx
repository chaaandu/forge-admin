import type { Metadata } from 'next'
import localFont from 'next/font/local'
import './globals.css'

// Manrope, Mesa's UI face. Variable 200–800; carries ₹ (U+20B9) and Ō (U+014C, YŌKI).
const manrope = localFont({
  src: './fonts/Manrope-Variable.ttf',
  weight: '200 800',
  variable: '--font-manrope',
  display: 'swap',
})

export const metadata: Metadata = {
  title: { template: '%s · Forge C1', default: 'Forge C1 · Admin Tracker' },
  robots: { index: false, follow: false },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={manrope.variable}>
      <body>{children}</body>
    </html>
  )
}
