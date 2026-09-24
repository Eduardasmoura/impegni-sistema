"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { HandCoins, Info, Loader2, QrCode, Save, Trash2, Upload } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OptionPill } from "@/components/ui/option-pill";
import { useToast } from "@/components/ui/use-toast";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/errors";
import { uploadCompanyAsset } from "@/lib/upload";

// Mesmas chaves dos CHECK de company_deposit_settings (migration 20260927000000).
const TIPOS_CHAVE = [
  { value: "cpf_cnpj", label: "CPF/CNPJ" },
  { value: "phone", label: "Telefone" },
  { value: "email", label: "E-mail" },
  { value: "random", label: "Chave aleatória" },
] as const;
type TipoChave = (typeof TIPOS_CHAVE)[number]["value"];
const PERCENTUAIS = [10, 20, 30];

type Form = {
  enabled: boolean;
  percent: string;
  method: "pix" | "link";
  pix_key_type: TipoChave | "";
  pix_key: string;
  pix_receiver_name: string;
  pix_qr_code_url: string;
  payment_link_url: string;
};

const VAZIO: Form = {
  enabled: false,
  percent: "20",
  method: "pix",
  pix_key_type: "",
  pix_key: "",
  pix_receiver_name: "",
  pix_qr_code_url: "",
  payment_link_url: "",
};

// Normaliza a chave no formato que o app do banco aceita ao colar
// (telefone com +55, CPF/CNPJ só dígitos, e-mail minúsculo). Devolve null se
// a chave não for válida para o tipo escolhido.
function normalizarChavePix(tipo: TipoChave, chave: string): string | null {
  const v = chave.trim();
  const digitos = v.replace(/\D/g, "");
  switch (tipo) {
    case "cpf_cnpj":
      return digitos.length === 11 || digitos.length === 14 ? digitos : null;
    case "phone": {
      const nacional = digitos.startsWith("55") && digitos.length >= 12 ? digitos.slice(2) : digitos;
      return nacional.length === 10 || nacional.length === 11 ? `+55${nacional}` : null;
    }
    case "email":
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && v.length <= 77 ? v.toLowerCase() : null;
    case "random":
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v) ? v.toLowerCase() : null;
  }
}

function linkValido(url: string): boolean {
  try {
    const u = new URL(url.trim());
    return u.protocol === "https:" && u.hostname.includes(".") && url.trim().length <= 2048;
  } catch {
    return false;
  }
}

export function CaucaoCard({ companyId, isManager }: { companyId: string; isManager: boolean }) {
  const supabase = createClient();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState<Form>(VAZIO);
  const [personalizado, setPersonalizado] = useState(false);
  const [erros, setErros] = useState<Partial<Record<keyof Form, string>>>({});
  const [salvando, setSalvando] = useState(false);
  const [enviandoQr, setEnviandoQr] = useState(false);

  const { data: config, isLoading } = useQuery({
    queryKey: ["deposit-settings", companyId],
    enabled: isManager,
    queryFn: async () => {
      const { data, error } = await supabase.from("company_deposit_settings").select("*").eq("company_id", companyId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!config) return;
    const percent = String(Number(config.percent));
    setForm({
      enabled: config.enabled,
      percent,
      method: config.method === "link" ? "link" : "pix",
      pix_key_type: (config.pix_key_type as TipoChave | null) ?? "",
      pix_key: config.pix_key ?? "",
      pix_receiver_name: config.pix_receiver_name ?? "",
      pix_qr_code_url: config.pix_qr_code_url ?? "",
      payment_link_url: config.payment_link_url ?? "",
    });
    setPersonalizado(!PERCENTUAIS.includes(Number(config.percent)));
  }, [config]);

  function set<K extends keyof Form>(campo: K, valor: Form[K]) {
    setForm((f) => ({ ...f, [campo]: valor }));
    setErros((e) => ({ ...e, [campo]: undefined }));
  }

  async function enviarQr(file: File) {
    if (enviandoQr) return;
    setEnviandoQr(true);
    try {
      set("pix_qr_code_url", await uploadCompanyAsset(supabase, companyId, "pix-qr", file));
    } catch (e) {
      toast({ title: "Erro no upload", description: friendlyError(e, "enviar o QR Code"), variant: "destructive" });
    } finally {
      setEnviandoQr(false);
    }
  }

  async function salvar() {
    const novosErros: typeof erros = {};
    const percentTexto = form.percent.trim().replace(",", ".");
    const percent = Number(percentTexto);
    if (!/^\d{1,3}(\.\d{1,2})?$/.test(percentTexto) || percent <= 0 || percent > 100) {
      novosErros.percent = "Informe um percentual entre 0,01 e 100.";
    }
    let chave: string | null = form.pix_key.trim() || null;
    if (form.method === "pix" && (form.enabled || chave)) {
      if (!form.pix_key_type) novosErros.pix_key_type = "Escolha o tipo da chave.";
      else if (!chave) novosErros.pix_key = "Informe a chave Pix.";
      else {
        chave = normalizarChavePix(form.pix_key_type, chave);
        if (!chave) novosErros.pix_key = "Chave inválida para o tipo escolhido.";
      }
      if (!form.pix_receiver_name.trim()) novosErros.pix_receiver_name = "Informe o nome do recebedor.";
    }
    const link = form.payment_link_url.trim();
    if (form.method === "link" && (form.enabled || link)) {
      if (!link) novosErros.payment_link_url = "Informe o link de pagamento.";
      else if (!linkValido(link)) novosErros.payment_link_url = "Informe um link válido começando com https://";
    }
    setErros(novosErros);
    if (Object.keys(novosErros).length) return;

    setSalvando(true);
    const { error } = await supabase.from("company_deposit_settings").upsert({
      company_id: companyId,
      enabled: form.enabled,
      percent,
      method: form.method,
      pix_key_type: form.pix_key_type || null,
      pix_key: chave,
      pix_receiver_name: form.pix_receiver_name.trim() || null,
      pix_qr_code_url: form.pix_qr_code_url || null,
      payment_link_url: link || null,
    });
    setSalvando(false);
    if (error) {
      toast({ title: "Erro", description: friendlyError(error, "salvar a configuração do caução"), variant: "destructive" });
      return;
    }
    if (chave) set("pix_key", chave);
    qc.invalidateQueries({ queryKey: ["deposit-settings", companyId] });
    toast({ title: form.enabled ? "Caução ativado!" : "Configuração do caução salva." });
  }

  return (
    <section id="caucao" className="scroll-mt-6">
      <h2 className="font-heading text-2xl font-semibold mb-1">Recebimentos / Caução</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Cobre um sinal para confirmar os agendamentos feitos online.{" "}
        <Link href="/suporte/artigo/configurar-caucao" className="text-primary hover:underline whitespace-nowrap">Como funciona</Link>
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><HandCoins className="w-4 h-4" /> Caução de agendamento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex gap-2 rounded-lg bg-primary/5 border border-primary/20 p-3 text-xs">
            <Info className="w-4 h-4 text-primary shrink-0 mt-px" />
            <p>
              <strong>O Impegni não processa esse pagamento.</strong> O pagamento do caução é realizado diretamente ao estabelecimento — você recebe
              pela forma cadastrada aqui e o Impegni não recebe nem retém esse valor.
            </p>
          </div>

          {!isManager ? (
            <p className="text-sm text-muted-foreground">Só o proprietário ou administrador da empresa pode configurar o caução.</p>
          ) : isLoading ? (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Carregando...</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2">
                <OptionPill selected={!form.enabled} onClick={() => set("enabled", false)}>Não cobrar caução</OptionPill>
                <OptionPill selected={form.enabled} onClick={() => set("enabled", true)}>Cobrar caução</OptionPill>
              </div>

              {form.enabled && (
                <>
                  <div>
                    <Label>Percentual do caução</Label>
                    <p className="text-xs text-muted-foreground mb-2">Aplicado sobre o valor do serviço agendado.</p>
                    <div className="grid grid-cols-4 gap-2">
                      {PERCENTUAIS.map((p) => (
                        <OptionPill key={p} selected={!personalizado && Number(form.percent) === p} onClick={() => { setPersonalizado(false); set("percent", String(p)); }}>
                          {p}%
                        </OptionPill>
                      ))}
                      <OptionPill selected={personalizado} onClick={() => setPersonalizado(true)}>Outro</OptionPill>
                    </div>
                    {personalizado && (
                      <div className="mt-2 flex items-center gap-2 max-w-[180px]">
                        <Input id="caucao-percentual" inputMode="decimal" value={form.percent} onChange={(e) => set("percent", e.target.value)} aria-invalid={!!erros.percent} />
                        <span className="text-sm text-muted-foreground">%</span>
                      </div>
                    )}
                    {erros.percent && <p className="text-xs text-destructive mt-1">{erros.percent}</p>}
                  </div>

                  <div>
                    <Label>Forma de recebimento</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <OptionPill selected={form.method === "pix"} onClick={() => set("method", "pix")}>Pix</OptionPill>
                      <OptionPill selected={form.method === "link"} onClick={() => set("method", "link")}>Link de pagamento</OptionPill>
                    </div>
                  </div>

                  {form.method === "pix" ? (
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="caucao-tipo-chave">Tipo da chave</Label>
                        <select
                          id="caucao-tipo-chave"
                          value={form.pix_key_type}
                          onChange={(e) => set("pix_key_type", e.target.value as TipoChave)}
                          aria-invalid={!!erros.pix_key_type}
                          className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                        >
                          <option value="">Selecione</option>
                          {TIPOS_CHAVE.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                        {erros.pix_key_type && <p className="text-xs text-destructive mt-1">{erros.pix_key_type}</p>}
                      </div>
                      <div>
                        <Label htmlFor="caucao-chave">Chave Pix</Label>
                        <Input id="caucao-chave" value={form.pix_key} onChange={(e) => set("pix_key", e.target.value)} maxLength={140} aria-invalid={!!erros.pix_key} />
                        {erros.pix_key && <p className="text-xs text-destructive mt-1">{erros.pix_key}</p>}
                      </div>
                      <div>
                        <Label htmlFor="caucao-recebedor">Nome do recebedor</Label>
                        <Input id="caucao-recebedor" value={form.pix_receiver_name} onChange={(e) => set("pix_receiver_name", e.target.value)} maxLength={120} placeholder="Como aparece no app do banco" aria-invalid={!!erros.pix_receiver_name} />
                        {erros.pix_receiver_name && <p className="text-xs text-destructive mt-1">{erros.pix_receiver_name}</p>}
                      </div>
                      <div>
                        <Label>QR Code (opcional)</Label>
                        <div className="mt-1 flex items-center gap-3">
                          <div className="w-20 h-20 rounded-lg border border-border bg-muted flex items-center justify-center overflow-hidden shrink-0">
                            {form.pix_qr_code_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={form.pix_qr_code_url} alt="QR Code Pix" className="w-full h-full object-contain bg-white" />
                            ) : (
                              <QrCode className="w-6 h-6 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="cursor-pointer inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
                              {enviandoQr ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                              {enviandoQr ? "Enviando..." : form.pix_qr_code_url ? "Trocar imagem" : "Enviar imagem do QR Code"}
                              <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && enviarQr(e.target.files[0])} />
                            </label>
                            {form.pix_qr_code_url && (
                              <button type="button" onClick={() => set("pix_qr_code_url", "")} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive">
                                <Trash2 className="w-3.5 h-3.5" /> Remover
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <Label htmlFor="caucao-link">Link de pagamento</Label>
                      <Input id="caucao-link" type="url" inputMode="url" value={form.payment_link_url} onChange={(e) => set("payment_link_url", e.target.value)} placeholder="https://..." maxLength={2048} aria-invalid={!!erros.payment_link_url} />
                      <p className="text-xs text-muted-foreground mt-1">Pode ser de qualquer provedor que você já usa (banco, maquininha, loja).</p>
                      {erros.payment_link_url && <p className="text-xs text-destructive mt-1">{erros.payment_link_url}</p>}
                    </div>
                  )}
                </>
              )}

              <Button onClick={salvar} disabled={salvando || enviandoQr} className="w-full gap-2">
                {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} {salvando ? "Salvando..." : "Salvar caução"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
