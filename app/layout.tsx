import { Inter, Geist_Mono } from "next/font/google"
import type { Metadata, Viewport } from "next"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register"
import { ReminderEngine } from "@/components/pwa/reminder-engine"
import { cn } from "@/lib/utils"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })
const fontMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" })

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
const TITLE = "Panyor Hall of Residence | Rajiv Gandhi University"
const DESCRIPTION =
  "Official hostel management platform for Panyor Hall of Residence, Rajiv Gandhi University (RGU), Doimukh — admissions, rooms, mess, equipment, complaints and notices."

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: "%s | Panyor Hall of Residence",
  },
  description: DESCRIPTION,
  applicationName: "Panyor Hall of Residence",
  keywords: ["Panyor Hall", "Rajiv Gandhi University", "RGU hostel", "hostel management", "Doimukh"],
  authors: [{ name: "Panyor Hall of Residence, RGU" }],
  creator: "Panyor Hall of Residence",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Panyor Hall",
  },
  formatDetection: { telephone: false },
  openGraph: {
    type: "website",
    siteName: "Panyor Hall of Residence",
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: "/icons/icon-512.png", width: 512, height: 512, alt: "Panyor Hall of Residence" }],
  },
  twitter: {
    card: "summary",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/icons/icon-512.png"],
  },
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  // Auth-gated app: keep auth screens out of search indexes.
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn("min-h-screen bg-background text-foreground selection:bg-primary selection:text-primary-foreground font-sans antialiased", inter.variable, fontMono.variable)}>
        <ThemeProvider>
          <ServiceWorkerRegister />
          <ReminderEngine />
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
