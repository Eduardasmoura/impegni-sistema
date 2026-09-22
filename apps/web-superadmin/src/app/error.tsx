"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

// Limite de erro do App Router — sem isso, uma exceção não tratada em
// qualquer tela cai na página de erro padrão do Next.
export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <Card className="max-w-sm w-full">
        <CardContent className="p-6 text-center space-y-4">
          <AlertTriangle className="w-10 h-10 mx-auto text-destructive" />
          <div>
            <h1 className="font-heading text-lg font-semibold">Algo deu errado</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Não foi possível carregar esta página. Tente novamente em instantes.
            </p>
          </div>
          <Button onClick={reset} className="w-full">Tentar de novo</Button>
        </CardContent>
      </Card>
    </div>
  );
}
