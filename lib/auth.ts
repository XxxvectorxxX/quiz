import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { logger } from "./logger"

type AuthUser = {
  id: string
  email?: string
  is_admin?: boolean
}

/**
 * Valida se o usuário está autenticado (side: server/SSR)
 */
export async function getAuthUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll() {
            // Cookies já foram setados no middleware
          },
        },
      },
    )

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user) {
      return null
    }

    return {
      id: user.id,
      email: user.email,
    }
  } catch (err) {
    logger.error("[auth] getAuthUser failed:", err)
    return null
  }
}

/**
 * Valida se o usuário é admin (side: server/SSR)
 */
export async function getAuthUserWithAdmin(): Promise<(AuthUser & { is_admin: boolean }) | null> {
  const user = await getAuthUser()
  if (!user) return null

  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll() {
            // Cookies já foram setados
          },
        },
      },
    )

    const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single()

    return {
      ...user,
      is_admin: profile?.is_admin ?? false,
    }
  } catch (err) {
    logger.error("[auth] getAuthUserWithAdmin failed:", err)
    return {
      ...user,
      is_admin: false,
    }
  }
}

/**
 * Valida credenciais de um endpoint de API
 */
export function validateAuthHeader(authHeader: string | null, expectedToken?: string): boolean {
  if (!authHeader || !expectedToken) {
    return false
  }

  const [scheme, token] = authHeader.split(" ")
  if (scheme !== "Bearer") {
    return false
  }

  return token === expectedToken
}
