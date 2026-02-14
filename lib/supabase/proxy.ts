import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { logger } from "@/lib/logger"

// Rotas públicas que não precisam de autenticação
const PUBLIC_ROUTES = ["/", "/auth/login", "/auth/cadastro", "/auth/confirmar-email", "/igrejas", "/torneios"]

// Rotas protegidas que precisam de autenticação
const PROTECTED_ROUTES = ["/quiz", "/perfil", "/competicoes", "/admin", "/rankings"]

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
    },
  )

  // Atualizar sessão (refresh token se necessário)
  try {
    await supabase.auth.getSession()
  } catch (err) {
    logger.error("[middleware] Failed to refresh session:", err)
  }

  const path = request.nextUrl.pathname

  // Verificar se está acessando rota protegida
  const isProtectedRoute = PROTECTED_ROUTES.some((route) => path.startsWith(route))
  const isPublicRoute = PUBLIC_ROUTES.some((route) => path === route)

  // Se é rota protegida
  if (isProtectedRoute && !isPublicRoute) {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !user) {
        logger.warn(`[middleware] Unauthorized access to ${path}`)
        const url = request.nextUrl.clone()
        url.pathname = "/auth/login"
        url.searchParams.set("redirect", path)
        return NextResponse.redirect(url)
      }

      // Admin check para rotas /admin
      if (path.startsWith("/admin")) {
        try {
          const { data: profile } = await supabase
            .from("profiles")
            .select("is_admin")
            .eq("id", user.id)
            .single()

          if (!profile?.is_admin) {
            logger.warn(`[middleware] Admin access denied for user ${user.id}`)
            const url = request.nextUrl.clone()
            url.pathname = "/quiz"
            return NextResponse.redirect(url)
          }
        } catch (err) {
          logger.error("[middleware] Admin check failed:", err)
          // Bloquear acesso em caso de erro para segurança
          return new NextResponse("Admin validation failed", { status: 403 })
        }
      }
    } catch (err) {
      logger.error("[middleware] Auth validation failed:", err)
    }
  }

  return supabaseResponse
}
