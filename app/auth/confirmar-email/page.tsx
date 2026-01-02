import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle } from "lucide-react"

export default function ConfirmarEmailPage() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle className="text-2xl">Cadastro realizado!</CardTitle>
              <CardDescription>Confirme seu email para continuar</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center">
                Enviamos um email de confirmação para você. Por favor, verifique sua caixa de entrada e clique no link
                para ativar sua conta.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
