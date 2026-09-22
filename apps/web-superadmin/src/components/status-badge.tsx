// Badge de status reutilizado nas telas de Empresas, Assinaturas e
// Pagamentos — cada tela passa seu próprio mapa de rótulo/cor porque os
// vocabulários são diferentes (status de empresa != status de assinatura
// != status de pagamento), mas o visual é sempre o mesmo.
export function StatusBadge({ value, label, color }: { value: string; label?: string; color?: string }) {
  return (
    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${color ?? "bg-muted text-muted-foreground"}`}>
      {label ?? value}
    </span>
  );
}
