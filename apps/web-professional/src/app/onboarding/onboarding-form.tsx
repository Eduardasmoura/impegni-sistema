"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Scissors, Sparkles, Loader2, Check } from "lucide-react";
import { AuthLayout } from "@/components/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

const TIPOS_NEGOCIO = [
  { value: "barbearia", label: "Barbearia", icon: Scissors, swatches: ["#0A0A0A", "#FFFFFF", "#2563EB"] },
  { value: "estudio_estetica", label: "Studio / Estética", icon: Sparkles, swatches: ["#C4B5FD", "#71717A", "#FFFFFF"] },
] as const;

// Primeiro acesso de um usuário sem empresa: cria a empresa (o trigger
// on_company_created já o torna 'owner' automaticamente, ver migration 002).
export function OnboardingForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [checkingSlug, setCheckingSlug] = useState(false);
  const [businessType, setBusinessType] = useState<(typeof TIPOS_NEGOCIO)[number]["value"]>("barbearia");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Só sugere o slug a partir do nome quando o usuário ainda não editou o
  // campo de link na mão — chama o RPC generate_unique_slug (migration 013)
  // pra já vir sem acento/espaço e sem colidir com um link já existente
  // (kellyrein, kellyrein2...), em vez de só normalizar o texto localmente.
  async function sugerirSlug(baseName: string) {
    if (slugTouched || !baseName.trim()) return;
    setCheckingSlug(true);
    const supabase = createClient();
    const { data, error: rpcError } = await supabase.rpc("generate_unique_slug", { base_name: baseName });
    setCheckingSlug(false);
    if (!rpcError && data && !slugTouched) setSlug(data);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createClient();

    // Roda de novo em cima do valor atual (mesmo se editado à mão) — garante
    // um slug realmente único e limpo na hora de gravar, não só no preview.
    const { data: finalSlug, error: slugError } = await supabase.rpc("generate_unique_slug", { base_name: slug || name });
    if (slugError || !finalSlug) {
      setLoading(false);
      setError(slugError?.message || "Não foi possível gerar o link da empresa.");
      return;
    }

    const { error: insertError } = await supabase.from("companies").insert({ name, slug: finalSlug, business_type: businessType });
    setLoading(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <AuthLayout icon={Scissors} title="Vamos criar sua empresa" subtitle="É rápido — você poderá ajustar tudo depois">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}
        <div className="space-y-2">
          <Label htmlFor="name">Nome do salão</Label>
          <Input
            id="name"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={(e) => sugerirSlug(e.target.value)}
            placeholder="Studio Nova"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="slug">Link público</Label>
          <div className="flex items-center rounded-lg border border-input bg-card text-sm overflow-hidden">
            <input
              id="slug"
              value={checkingSlug ? "gerando..." : slug}
              disabled={checkingSlug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value.toLowerCase());
              }}
              className="flex-1 px-3 py-2 bg-transparent outline-none min-w-0"
              placeholder="sua-empresa"
              required
            />
            <span className="px-3 py-2 text-muted-foreground bg-muted whitespace-nowrap">.inova.app</span>
          </div>
          <p className="text-xs text-muted-foreground">Gerado a partir do nome — pode editar, a gente garante que fica único.</p>
        </div>
        <div className="space-y-2">
          <Label>Tipo de negócio</Label>
          <p className="text-xs text-muted-foreground">Define as cores do app mobile do seu time — dá pra trocar depois em Configuração.</p>
          <div className="grid grid-cols-2 gap-2">
            {TIPOS_NEGOCIO.map((tipo) => (
              <button
                key={tipo.value}
                type="button"
                onClick={() => setBusinessType(tipo.value)}
                className={cn(
                  "flex flex-col items-center gap-2 p-3 rounded-lg border text-left transition-colors",
                  businessType === tipo.value ? "border-primary ring-1 ring-primary" : "border-border hover:bg-muted"
                )}
              >
                <div className="w-full flex items-center justify-between">
                  <tipo.icon className="w-4 h-4 text-muted-foreground" />
                  {businessType === tipo.value && <Check className="w-3.5 h-3.5 text-primary" />}
                </div>
                <div className="flex -space-x-1 self-start">
                  {tipo.swatches.map((cor) => (
                    <span key={cor} className="w-4 h-4 rounded-full border-2 border-card" style={{ background: cor }} />
                  ))}
                </div>
                <span className="text-xs font-medium self-start">{tipo.label}</span>
              </button>
            ))}
          </div>
        </div>
        <Button type="submit" className="w-full h-12 font-medium" disabled={loading || checkingSlug}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Criar empresa"}
        </Button>
      </form>
    </AuthLayout>
  );
}
