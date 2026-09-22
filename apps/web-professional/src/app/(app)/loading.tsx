// FASE 6 (auditoria UX, Section 5) — antes disso não existia NENHUM
// feedback visual de transição de rota em lugar nenhum do app: navegar
// entre telas (ex.: Clientes -> Financeiro) ficava com a barra lateral
// parada e a área de conteúdo em branco até a tela de destino terminar de
// buscar seus próprios dados — em conexão lenta parecia clique travado.
// Este arquivo é convenção do Next.js App Router: aparece automaticamente
// dentro do layout (a sidebar continua visível) enquanto a rota de destino
// carrega, pra qualquer página dentro de `(app)`.
export default function Loading() {
  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto animate-pulse" aria-busy="true" aria-label="Carregando página">
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-2">
          <div className="h-7 w-40 rounded-md bg-muted" />
          <div className="h-4 w-56 rounded-md bg-muted" />
        </div>
        <div className="h-9 w-28 rounded-lg bg-muted" />
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-28 rounded-xl border border-border bg-muted/50" />
        ))}
      </div>
    </div>
  );
}
