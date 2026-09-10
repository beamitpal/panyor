import * as React from "react"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "./avatar"
import { Badge } from "./badge"

export interface MessageProps extends React.HTMLAttributes<HTMLDivElement> {
  author: string
  role?: string
  avatarUrl?: string | null
  timestamp: string
  content: string
  isInternal?: boolean
  attachments?: string[]
  align?: "left" | "right"
}

export function Message({
  className,
  author,
  role,
  avatarUrl,
  timestamp,
  content,
  isInternal,
  attachments = [],
  align = "left",
  ...props
}: MessageProps) {
  const isRight = align === "right"

  return (
    <div
      className={cn(
        "flex gap-3 text-xs",
        isRight ? "flex-row-reverse" : "flex-row",
        className
      )}
      {...props}
    >
      <Avatar className="size-7 shrink-0">
        {avatarUrl && <AvatarImage src={avatarUrl} alt={author} />}
        <AvatarFallback className="text-[10px]">{author.substring(0, 2)}</AvatarFallback>
      </Avatar>

      <div className={cn("flex flex-col gap-1 max-w-[82%]", isRight ? "items-end" : "items-start")}>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-foreground">{author}</span>
          {role && (
            <Badge variant="outline" size="sm" className="text-[9px] py-0 px-1 font-mono">
              {role}
            </Badge>
          )}
          {isInternal && (
            <Badge variant="warning" size="sm" className="text-[9px] py-0 px-1">
              Internal Staff Note
            </Badge>
          )}
          <span className="text-[10px] text-muted-foreground">{new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>

        <div
          className={cn(
            "rounded-lg p-3 text-xs leading-relaxed break-words",
            isInternal
              ? "bg-amber-500/10 border border-amber-500/20 text-amber-950 dark:text-amber-200"
              : isRight
              ? "bg-primary text-primary-foreground"
              : "bg-muted/70 text-foreground border border-border/50"
          )}
        >
          {content}

          {attachments.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2 pt-2 border-t border-border/40">
              {attachments.map((url, i) => (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center text-[10px] underline underline-offset-2 opacity-80 hover:opacity-100"
                >
                  Attachment {i + 1}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function MessageScroller({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const bottomRef = React.useRef<HTMLDivElement>(null)

  return (
    <div
      className={cn("flex flex-col gap-3 overflow-y-auto max-h-[380px] p-2", className)}
      {...props}
    >
      {children}
      <div ref={bottomRef} />
    </div>
  )
}
