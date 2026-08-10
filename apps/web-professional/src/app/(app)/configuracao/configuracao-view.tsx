"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Palette, ImageIcon, MessageCircle, Gift, Save, Scissors, Sparkles, Check, ShieldCheck, ShieldOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { uploadCompanyAsset } from "@/lib/upload";
import type { Tables } from "@/lib/supabase/database.types";

const PALETAS_PRONTAS = [
  { nome: "Âmbar", primaria: "#B45309", secundaria: "#1C1917", acento: "#F5E6D3" },
  { nome: "Rosa", primaria: "#BE185D", secundaria: "#3B0764", acento: "#FCE7F3" },
  { nome: "Esmeralda", primaria: "#047857", secundaria: "#064E3B", acento: "#D1FAE5" },
  { nome: "Azul", primaria: "#1D4ED8", secundaria: "#0F172A", acento: "#DBEAFE" },
  { nome: "Roxo", primaria: "#7C3AED", secundaria: "#1E1B4B", acento: "#EDE9FE" },
  { nome: "Preto", primaria: "#171717", secundaria: "#000000", acento: "#F5F5F5" },
];

const TIPOS_NEGOCIO = [
  { value: "barbearia", label: "Barbearia", icon: Scissors, swatches: ["#0A0A0A", "#FFFFFF", "#2563EB"] },
  { value: "estudio_estetica", label: "Studio / Estética", icon: Sparkles, swatches: ["#C4B5FD", "#71717A", "#FFFFFF"] },
] as const;

type FormState = {
  name: string;
  phone: string;
  whatsapp: string;
  address: string;
  instagram: string;
  logo_url: string;
  cover_url: string;
  color_primary: string;
  color_secondary: string;
  color_accent: string;
  business_type: string;
  loyalty_program_enabled: boolean;
  whatsapp_reminder_enabled: boolean;
};

export function ConfiguracaoView({ company }: { company: Tables<"companies"> }) {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();
  const [enviandoCampo, setEnviandoCampo] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({
    name: company.name || "",
    phone: company.phone || "",
    whatsapp: company.whatsapp || "",
    address: company.address || "",
    instagram: company.instagram || "",
    logo_url: company.logo_url || "",
    cover_url: company.cover_url || "",
    color_primary: company.color_primary || "#B45309",
    color_secondary: company.color_secondary || "#1C1917",
    color_accent: company.color_accent || "#F5E6D3",
    business_type: company.business_type,
    loyalty_program_enabled: company.loyalty_program_enabled,
    whatsapp_reminder_enabled: company.whatsapp_reminder_enabled,
  });

  function set<K extends keyof FormState>(campo: K, valor: FormState[K]) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  async function upload(file: File, campo: "logo_url" | "cover_url") {
    setEnviandoCampo(campo);
    try {
      const url = await uploadCompanyAsset(supabase, company.id, campo === "logo_url" ? "logo" : "cover", file);
      set(campo, url);
    } catch (e) {
      toast({ title: "Erro no upload", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    } finally {
      setEnviandoCampo(null);
    }
  }

  async function salvar() {
    const { error } = await supabase.from("companies").update(form).eq("id", company.id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Identidade visual salva!" });
    router.refresh();
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <h1 className="font-heading text-3xl font-semibold mb-1">Identidade visual</h1>
      <p className="text-sm text-muted-foreground mb-6">Personalize cores, capa e informações do seu salão</p>

      <Card className="overflow-hidden mb-4">
        <div className="h-40 bg-muted relative">
          {form.cover_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={form.cover_url} alt="Capa" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-secondary to-primary" />
          )}
          <label className="absolute bottom-3 right-3 cursor-pointer">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card/90 backdrop-blur text-xs">
              <ImageIcon className="w-3.5 h-3.5" /> {enviandoCampo === "cover_url" ? "Enviando..." : "Trocar capa"}
            </span>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], "cover_url")} />
          </label>
        </div>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <label className="cursor-pointer">
              <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center overflow-hidden">
                {form.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.logo_url} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <Upload className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], "logo_url")} />
            </label>
            <div>
              <p className="font-medium">{form.name || "Nome do salão"}</p>
              <p className="text-xs text-muted-foreground">Logo e capa</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Palette className="w-4 h-4" /> Paletas de cores</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {PALETAS_PRONTAS.map((paleta) => (
              <button
                key={paleta.nome}
                onClick={() => {
                  set("color_primary", paleta.primaria);
                  set("color_secondary", paleta.secundaria);
                  set("color_accent", paleta.acento);
                }}
                className="flex items-center gap-2 p-2 rounded-lg border border-border hover:border-primary transition-colors"
              >
                <div className="flex -space-x-1">
                  <span className="w-5 h-5 rounded-full border-2 border-card" style={{ background: paleta.primaria }} />
                  <span className="w-5 h-5 rounded-full border-2 border-card" style={{ background: paleta.secundaria }} />
                  <span className="w-5 h-5 rounded-full border-2 border-card" style={{ background: paleta.acento }} />
                </div>
                <span className="text-xs">{paleta.nome}</span>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div>
              <Label className="text-xs">Primária</Label>
              <input type="color" value={form.color_primary} onChange={(e) => set("color_primary", e.target.value)} className="w-full h-9 rounded-lg border border-border" />
            </div>
            <div>
              <Label className="text-xs">Secundária</Label>
              <input type="color" value={form.color_secondary} onChange={(e) => set("color_secondary", e.target.value)} className="w-full h-9 rounded-lg border border-border" />
            </div>
            <div>
              <Label className="text-xs">Acento</Label>
              <input type="color" value={form.color_accent} onChange={(e) => set("color_accent", e.target.value)} className="w-full h-9 rounded-lg border border-border" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader><CardTitle className="text-base">Tipo de negócio</CardTitle></CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">Define as cores do app mobile do seu time.</p>
          <div className="grid grid-cols-2 gap-2">
            {TIPOS_NEGOCIO.map((tipo) => (
              <button
                key={tipo.value}
                type="button"
                onClick={() => set("business_type", tipo.value)}
                className={cn(
                  "flex flex-col items-center gap-2 p-3 rounded-lg border text-left transition-colors",
                  form.business_type === tipo.value ? "border-primary ring-1 ring-primary" : "border-border hover:bg-muted"
                )}
              >
                <div className="w-full flex items-center justify-between">
                  <tipo.icon className="w-4 h-4 text-muted-foreground" />
                  {form.business_type === tipo.value && <Check className="w-3.5 h-3.5 text-primary" />}
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
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader><CardTitle className="text-base">Informações</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div><Label>Nome do estabelecimento</Label><Input value={form.name} onChange={(e) => set("name", e.target.value)} /></div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><Label>Telefone</Label><Input value={form.phone} onChange={(e) => set("phone", e.target.value)} /></div>
            <div><Label>WhatsApp</Label><Input value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} /></div>
          </div>
          <div><Label>Endereço</Label><Input value={form.address} onChange={(e) => set("address", e.target.value)} /></div>
          <div><Label>Instagram</Label><Input value={form.instagram} onChange={(e) => set("instagram", e.target.value)} /></div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader><CardTitle className="text-base">Recursos</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gift className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Programa de fidelidade</p>
                <p className="text-xs text-muted-foreground">Acumule pontos a cada visita</p>
              </div>
            </div>
            <Switch checked={form.loyalty_program_enabled} onCheckedChange={(v) => set("loyalty_program_enabled", v)} />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Lembrete WhatsApp</p>
                <p className="text-xs text-muted-foreground">Serviço cobrado à parte</p>
              </div>
            </div>
            <Switch checked={form.whatsapp_reminder_enabled} onCheckedChange={(v) => set("whatsapp_reminder_enabled", v)} />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {company.anamnesis_enabled ? <ShieldCheck className="w-4 h-4 text-primary" /> : <ShieldOff className="w-4 h-4 text-muted-foreground" />}
              <div>
                <p className="text-sm font-medium">Ficha de Anamnese</p>
                <p className="text-xs text-muted-foreground">
                  {company.anamnesis_enabled ? "Liberada para a sua empresa" : "Recurso liberado pela Barber iNova — fale com o suporte"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button onClick={salvar} className="w-full gap-2"><Save className="w-4 h-4" /> Salvar identidade</Button>
    </div>
  );
}
