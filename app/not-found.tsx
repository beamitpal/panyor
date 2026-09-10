import Link from "next/link"
import { ArrowLeft, Compass } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BrandMark } from "@/components/shared/brand"

export default function NotFound() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background p-4 sm:p-6">
      <div className="w-full max-w-md rounded-2xl border bg-card p-6 text-center shadow-sm sm:p-8">
        <div className="flex justify-center">
          <BrandMark withName={false} />
        </div>
        <span className="mx-auto mt-4 flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Compass className="size-6" />
        </span>
        <p className="mt-4 font-mono text-xs tracking-widest text-muted-foreground">404</p>
        <h1 className="mt-1 text-xl font-bold">This hostel corridor doesn&apos;t exist</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you&apos;re looking for was moved, deleted, or never lived in Panyor Hall.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link href="/">
            <Button className="w-full gap-1.5 sm:w-auto">
              <ArrowLeft className="size-4" /> Back to home
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="outline" className="w-full sm:w-auto">Sign in</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
