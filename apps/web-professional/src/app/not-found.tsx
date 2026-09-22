import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

// Rota inexistente dentro do painel (link antigo, digitação errada etc.).
// Mesmo estilo visual do error.tsx (limite de erro de runtime) — este é o
// limite de "página não existe".
export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <Card className="max-w-sm w-full">
        <CardContent className="p-6 text-center space-y-4">
          <Compass className="w-10 h-10 mx-auto text-primary" />
          <div>
            <h1 className="font-heading text-lg font-semibold">Página não encontrada</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Este endereço não existe ou foi movido.
            </p>
          </div>
          <Button asChild className="w-full">
            <Link href="/dashboard">Voltar para o início</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
