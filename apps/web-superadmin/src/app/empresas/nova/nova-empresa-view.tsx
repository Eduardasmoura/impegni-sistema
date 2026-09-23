"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/format";
import type { Tables } from "@/lib/supabase/database.types";

type FormState = {
  name: string;
  trade_name: string;
  document: string;
  email: string;
  phone: string;
  whatsapp: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  instagram: string;
  segment_id: string;
  plan_id: string;
  owner_email: string;
};

const EMPTY: FormState = {
  name: "",
  trade_name: "",
  document: "",
  email: "",
  phone: "",
  whatsapp: "",
  address: "",
  city: "",
  state: "",
  zip_code: "",
  instagram: "",
  segment_id: "",
  plan_id: "",
  owner_email: "",
};

export function NovaEmpresaView({
  segments,
  plans,
}: {
  segments: Pick<Tables<"segments">, "id" | "name">[];
  plans: Pick<Tables<"plans">, "id" | "name" | "price_cents">[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.segment_id || !form.plan_id || !form.owner_email.trim() || !form.document.trim()) {
      toast({ title: "Preencha os campos obrigatórios", description: "Nome, CNPJ/CPF, segmento, plano e e-mail do dono são obrigatórios.", variant: "destructive" });
      return;
    }

    setSaving(true);
    const payload: Record<string, string> = { name: form.name.trim(), segment_id: form.segment_id, plan_id: form.plan_id, owner_email: form.owner_email.trim() };
    (["trade_name", "document", "email", "phone", "whatsapp", "address", "city", "state", "zip_code", "instagram"] as const).forEach((key) => {
      if (form[key].trim()) payload[key] = form[key].trim();
    });

    const { data, error } = await supabase.functions.invoke("admin-create-company", { body: payload });
    setSaving(false);

    if (error) {
      // Detalhe técnico só no console; o toast mostra uma mensagem útil, sem
      // expor erro interno. Sem `context` = a requisição nem chegou à função
      // (rede/CORS) — FunctionsFetchError do supabase-js.
      const ctx = (error as unknown as { context?: Response }).context;
      let status: number | undefined;
      let serverMessage: string | undefined;
      if (ctx instanceof Response) {
        status = ctx.status;
        try {
          serverMessage = (await ctx.clone().json())?.error;
        } catch {
          // corpo não veio em JSON
        }
      }
      // eslint-disable-next-line no-console
      console.error("[admin-create-company]", { name: error.name, message: error.message, status, serverMessage });

      const message =
        status === 409 && serverMessage
          ? serverMessage
          : status === 401
            ? "Sua sessão expirou. Entre novamente e tente outra vez."
            : status === 403
              ? "Apenas o Super Admin pode criar empresas."
              : status === 400
                ? "Confira os campos obrigatórios e tente novamente."
                : "Não foi possível criar a empresa. Tente novamente.";
      toast({ title: "Erro ao criar empresa", description: message, variant: "destructive" });
      return;
    }

    const result = data as { company?: { id: string }; owner_invited?: boolean; error?: string; asaas_warning?: string } | null;
    if (result?.error) {
      toast({ title: "Empresa criada com ressalvas", description: result.error, variant: "destructive" });
    } else if (result?.asaas_warning) {
      toast({ title: "Empresa criada — cobrança pendente", description: result.asaas_warning, variant: "destructive" });
    } else {
      toast({ title: "Empresa criada com sucesso", description: result?.owner_invited ? "Um e-mail de convite foi enviado ao dono." : "O dono já tinha conta e foi vinculado." });
    }
    if (result?.company?.id) router.push(`/empresas/${result.company.id}`);
  }

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <Link href="/empresas" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> Voltar
      </Link>
      <h1 className="font-heading text-3xl font-semibold mb-1">Nova Empresa</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Provisiona a empresa, a assinatura em teste e o vínculo do dono automaticamente — nenhum passo manual adicional.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Dados da empresa</CardTitle></CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="name">Nome *</Label>
              <Input id="name" value={form.name} onChange={(e) => set("name", e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="trade_name">Nome fantasia</Label>
              <Input id="trade_name" value={form.trade_name} onChange={(e) => set("trade_name", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="document">CNPJ/CPF *</Label>
              <Input id="document" value={form.document} onChange={(e) => set("document", e.target.value)} required />
              <p className="text-xs text-muted-foreground">Necessário para criar a cobrança recorrente da assinatura no Asaas.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Segmento *</Label>
              <Select value={form.segment_id} onValueChange={(v) => set("segment_id", v)}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {segments.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Plano *</Label>
              <Select value={form.plan_id} onValueChange={(v) => set("plan_id", v)}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {plans.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name} · {formatCurrency(p.price_cents / 100)}/mês</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Contato</CardTitle></CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Telefone</Label>
              <Input id="phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <Input id="whatsapp" value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="instagram">Instagram</Label>
              <Input id="instagram" value={form.instagram} onChange={(e) => set("instagram", e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Endereço</CardTitle></CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="address">Endereço</Label>
              <Input id="address" value={form.address} onChange={(e) => set("address", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="city">Cidade</Label>
              <Input id="city" value={form.city} onChange={(e) => set("city", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="state">Estado</Label>
              <Input id="state" value={form.state} onChange={(e) => set("state", e.target.value)} maxLength={2} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="zip_code">CEP</Label>
              <Input id="zip_code" value={form.zip_code} onChange={(e) => set("zip_code", e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dono da empresa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            <Label htmlFor="owner_email">E-mail do dono *</Label>
            <Input id="owner_email" type="email" value={form.owner_email} onChange={(e) => set("owner_email", e.target.value)} required />
            <p className="text-xs text-muted-foreground">
              Se já existir uma conta com esse e-mail, ela é vinculada como dona. Caso contrário, enviamos um convite por e-mail.
            </p>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" asChild>
            <Link href="/empresas">Cancelar</Link>
          </Button>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Criar empresa
          </Button>
        </div>
      </form>
    </main>
  );
}
