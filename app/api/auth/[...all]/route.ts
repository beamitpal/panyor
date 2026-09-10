import { toNextJsHandler } from "better-auth/next-js"
import { auth } from "@/auth"

/**
 * Better Auth request handler — serves every auth endpoint under /api/auth/*:
 * sign-up, sign-in, sign-out, get-session, etc.
 */
export const { GET, POST } = toNextJsHandler(auth)
