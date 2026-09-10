import Image from "next/image"
import { cn } from "@/lib/utils"

export const BRAND_NAME = "Panyor Hall of Residence"
export const BRAND_SUB = "Rajiv Gandhi University, Doimukh"
export const BRAND_SHORT = "Panyor Hall"
export const BRAND_MARK_SRC = "/icons/mark-96.png"

/**
 * Single source of truth for the Panyor logo lockup: the shared image
 * mark (same artwork as the PWA icons/favicon) plus the two-line wordmark.
 */
export function BrandMark({
  withName = true,
  boxClassName,
  className,
  onPrimary = false,
}: {
  withName?: boolean
  boxClassName?: string
  className?: string
  /** Use on primary-colored backgrounds (white text). */
  onPrimary?: boolean
}) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <Image
        src={BRAND_MARK_SRC}
        alt="Panyor Hall logo"
        width={32}
        height={32}
        className={cn("size-8 shrink-0 rounded-lg", boxClassName)}
        priority
      />
      {withName && (
        <span className="flex min-w-0 flex-col">
          <span
            className={cn(
              "truncate text-xs font-bold leading-tight sm:text-sm",
              onPrimary ? "text-primary-foreground" : "text-foreground"
            )}
          >
            {BRAND_NAME}
          </span>
          <span
            className={cn(
              "max-w-[200px] truncate text-[10px] font-medium sm:max-w-none",
              onPrimary ? "text-primary-foreground/80" : "text-muted-foreground"
            )}
          >
            {BRAND_SUB}
          </span>
        </span>
      )}
    </span>
  )
}
