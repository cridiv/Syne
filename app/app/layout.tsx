import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: "Syne — Verifiable AI Memory Chain",
  description: "AI agent with a public, verifiable reasoning chain pinned permanently to Filecoin in real time.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}