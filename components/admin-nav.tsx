"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Settings, Users, BookOpen, Trophy, ScrollText, Home, X, Menu, Sparkles, Medal, Church } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { usePathname } from "next/navigation"

export function AdminNav() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    async function checkAdmin() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single()

      setIsAdmin(profile?.is_admin || false)
    }
    checkAdmin()
  }, [])

  if (!isAdmin) return null

  const isAdminRoute = pathname?.startsWith("/admin")

  return (
    <>
      {/* Botão flutuante */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform"
        aria-label="Menu Admin"
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Menu lateral */}
      {isOpen && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
          <Card className="fixed bottom-24 right-6 z-50 w-72 shadow-2xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b">
                <div className="p-2 rounded-full bg-gradient-to-r from-purple-100 to-pink-100">
                  <Settings className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Painel Admin</h3>
                  <p className="text-xs text-muted-foreground">Navegação rápida</p>
                </div>
              </div>

              <div className="space-y-2">
                {/* Área do usuário */}
                <div className="mb-3">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">ÁREA DO QUIZ</p>
                  <Button
                    variant={!isAdminRoute ? "default" : "ghost"}
                    size="sm"
                    className="w-full justify-start"
                    asChild
                  >
                    <Link href="/quiz">
                      <Home className="h-4 w-4 mr-2" />
                      Página Principal
                    </Link>
                  </Button>
                  <Button variant="ghost" size="sm" className="w-full justify-start" asChild>
                    <Link href="/competicoes">
                      <Trophy className="h-4 w-4 mr-2" />
                      Competicoes
                    </Link>
                  </Button>
                  <Button variant="ghost" size="sm" className="w-full justify-start" asChild>
                    <Link href="/torneios">
                      <Medal className="h-4 w-4 mr-2" />
                      Torneios
                    </Link>
                  </Button>
                  <Button variant="ghost" size="sm" className="w-full justify-start" asChild>
                    <Link href="/igrejas">
                      <Church className="h-4 w-4 mr-2" />
                      Igrejas
                    </Link>
                  </Button>
                  <Button variant="ghost" size="sm" className="w-full justify-start" asChild>
                    <Link href="/rankings">
                      <Trophy className="h-4 w-4 mr-2" />
                      Rankings
                    </Link>
                  </Button>
                </div>

                {/* Área admin */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2">ÁREA ADMINISTRATIVA</p>
                  <Button
                    variant={pathname === "/admin" ? "default" : "ghost"}
                    size="sm"
                    className="w-full justify-start"
                    asChild
                  >
                    <Link href="/admin">
                      <Settings className="h-4 w-4 mr-2" />
                      Dashboard
                    </Link>
                  </Button>
                  <Button
                    variant={pathname === "/admin/usuarios" ? "default" : "ghost"}
                    size="sm"
                    className="w-full justify-start"
                    asChild
                  >
                    <Link href="/admin/usuarios">
                      <Users className="h-4 w-4 mr-2" />
                      Usuários
                    </Link>
                  </Button>
                  <Button
                    variant={pathname === "/admin/perguntas" ? "default" : "ghost"}
                    size="sm"
                    className="w-full justify-start"
                    asChild
                  >
                    <Link href="/admin/perguntas">
                      <BookOpen className="h-4 w-4 mr-2" />
                      Perguntas
                    </Link>
                  </Button>
                  <Button
                    variant={pathname === "/admin/gerar-perguntas" ? "default" : "ghost"}
                    size="sm"
                    className="w-full justify-start"
                    asChild
                  >
                    <Link href="/admin/gerar-perguntas">
                      <Sparkles className="h-4 w-4 mr-2" />
                      Gerar com IA
                    </Link>
                  </Button>
                  <Button
                    variant={pathname === "/admin/equipes" ? "default" : "ghost"}
                    size="sm"
                    className="w-full justify-start"
                    asChild
                  >
                    <Link href="/admin/equipes">
                      <Trophy className="h-4 w-4 mr-2" />
                      Equipes
                    </Link>
                  </Button>
                  <Button
                    variant={pathname === "/admin/torneios" ? "default" : "ghost"}
                    size="sm"
                    className="w-full justify-start"
                    asChild
                  >
                    <Link href="/admin/torneios">
                      <Medal className="h-4 w-4 mr-2" />
                      Torneios
                    </Link>
                  </Button>
                  <Button
                    variant={pathname === "/admin/logs" ? "default" : "ghost"}
                    size="sm"
                    className="w-full justify-start"
                    asChild
                  >
                    <Link href="/admin/logs">
                      <ScrollText className="h-4 w-4 mr-2" />
                      Logs
                    </Link>
                  </Button>
                  <Button
                    variant={pathname === "/admin/configuracoes" ? "default" : "ghost"}
                    size="sm"
                    className="w-full justify-start"
                    asChild
                  >
                    <Link href="/admin/configuracoes">
                      <Settings className="h-4 w-4 mr-2" />
                      Configurações
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </>
  )
}

