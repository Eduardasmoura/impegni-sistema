"use client";

import { useState } from "react";
import { Copy, Check, QrCode, ExternalLink, HandCoins, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import type { Database } from "@/lib/supabase/database.types";

export type CaucaoInfo = Database["public"]["Functions"]["get_booking_deposit"]["Returns"][number];

const TIPO_CHAVE: Record<string, string> = { cpf_cnpj: "CPF/CNPJ", phone: "Telefone", email: "E-mail", random: "Chave aleatória" };

/**
 * Caução pago DIRETO ao estabelecimento (Pix ou link dele). O valor vem
 * calculado do servidor (get_booking_deposit); aqui só exibimos e coletamos
 * a declaração do cliente — copiar a chave ou abrir o link não conta como pago.
 */
export function CaucaoBox({
  caucao,
  servicoNome,
  declarado,
  onDeclaradoChange,
}: {
  caucao: CaucaoInfo;
  servicoNome: string;
  declarado: boolean;
  onDeclaradoChange: (v: boolean) => void;
}) {
  const [copiado, setCopiado] = useState(false);
  const [mostrarQr, setMostrarQr] = useState(false);

  async function copiarChave() {
    if (!caucao.pix_key) return;
    try {
      await navigator.clipboard.writeText(caucao.pix_key);
    } catch {
      // Navegadores sem Clipboard API (ou sem permissão): seleciona o texto
      // pra o cliente copiar manualmente.
      const el = document.getElementById("caucao-chave-pix");
      if (el) window.getSelection()?.selectAllChildren(el);
      return;
    }
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  }

  return (
    <div data-testid="caucao-box" className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
      <p className="font-heading font-semibold flex items-center gap-2"><HandCoins className="w-4 h-4 text-primary" /> Caução para confirmar seu horário</p>
      <div className="text-sm space-y-1">
        <div className="flex justify-between gap-2"><span className="text-muted-foreground">Serviço</span><span className="text-right">{servicoNome}</span></div>
        <div className="flex justify-between gap-2"><span className="text-muted-foreground">Valor</span><span>{formatCurrency(Number(caucao.service_price))}</span></div>
        <div className="flex justify-between gap-2 font-semibold">
          <span>Caução ({Number(caucao.percent)}%)</span>
          <span data-testid="caucao-valor" className="text-primary">{formatCurrency(Number(caucao.deposit_amount))}</span>
        </div>
      </div>

      <div className="flex gap-2 rounded-lg bg-card border border-border p-2.5 text-xs">
        <Info className="w-4 h-4 text-primary shrink-0" />
        <p><strong>Você está pagando diretamente ao estabelecimento.</strong> O Impegni não recebe nem retém esse valor.</p>
      </div>

      {caucao.method === "pix" ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">Pagamento via Pix</p>
          <div className="rounded-lg bg-card border border-border p-3 text-sm">
            <p className="text-xs text-muted-foreground">Chave Pix{caucao.pix_key_type ? ` (${TIPO_CHAVE[caucao.pix_key_type] ?? caucao.pix_key_type})` : ""}</p>
            <p id="caucao-chave-pix" data-testid="caucao-chave-pix" className="font-mono break-all">{caucao.pix_key}</p>
            {caucao.pix_receiver_name && <p className="text-xs text-muted-foreground mt-1">Recebedor: {caucao.pix_receiver_name}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={copiarChave}>
              {copiado ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {copiado ? "Chave copiada!" : "Copiar chave Pix"}
            </Button>
            {caucao.pix_qr_code_url && (
              <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => setMostrarQr((v) => !v)}>
                <QrCode className="w-3.5 h-3.5" /> {mostrarQr ? "Ocultar QR Code" : "Exibir QR Code"}
              </Button>
            )}
          </div>
          {mostrarQr && caucao.pix_qr_code_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={caucao.pix_qr_code_url} alt="QR Code Pix do estabelecimento" className="w-48 h-48 object-contain bg-white rounded-lg border border-border mx-auto" />
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm font-medium">Pagamento online</p>
          {caucao.payment_link_url && (
            <Button asChild className="w-full gap-1.5">
              <a href={caucao.payment_link_url} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-4 h-4" /> Pagar caução</a>
            </Button>
          )}
          <p className="text-[11px] text-muted-foreground">Abre em uma nova aba — seu agendamento continua aqui.</p>
        </div>
      )}

      <div className="border-t border-primary/20 pt-3">
        <p className="text-sm font-medium mb-1.5">Já realizou o pagamento do caução?</p>
        <label className="flex items-start gap-2 text-sm cursor-pointer">
          <input
            id="caucao-declaracao"
            type="checkbox"
            checked={declarado}
            onChange={(e) => onDeclaradoChange(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-[hsl(var(--primary))]"
          />
          <span>Confirmo que realizei o pagamento do caução.</span>
        </label>
      </div>
    </div>
  );
}
