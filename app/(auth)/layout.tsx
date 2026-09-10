import type { ReactNode } from "react"

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen font-sans antialiased">{children}</div>
}
