import { Loader2, AlertCircle } from "lucide-react";

// Estado de carregamento/erro reutilizável pras listas que buscam via
// React Query — antes cada tela renderizava direto a lista/estado vazio, e
// uma busca lenta ou com erro (RLS, rede) ficava indistinguível de "não tem
// nada cadastrado ainda".
export function LoadingState({ text = "Carregando..." }: { text?: string }) {
  return (
    <div className="py-16 flex flex-col items-center justify-center gap-2 text-muted-foreground">
      <Loader2 className="w-6 h-6 animate-spin" />
      <p className="text-sm">{text}</p>
    </div>
  );
}

export function ErrorState({ message = "Não foi possível carregar os dados. Tente novamente em instantes." }: { message?: string }) {
  return (
    <div className="py-16 flex flex-col items-center justify-center gap-2 text-center text-destructive">
      <AlertCircle className="w-6 h-6" />
      <p className="text-sm">{message}</p>
    </div>
  );
}
