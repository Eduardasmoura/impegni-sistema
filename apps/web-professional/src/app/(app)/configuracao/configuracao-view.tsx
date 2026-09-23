"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Palette, ImageIcon, MessageCircle, Gift, Save, Scissors, Sparkles, Check, ShieldCheck, ShieldOff, Link2, Clock, ExternalLink, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/errors";
import { uploadCompanyAsset } from "@/lib/upload";
import type { Tables } from "@/lib/supabase/database.types";
import { BOOKING_DOMAIN } from "@/lib/format";

const PALETAS_PRONTAS = [
  { nome: "Impegni", primaria: "#BE185D", secundaria: "#1C1917", acento: "#FCE7F3" },
  { nome: "Âmbar", primaria: "#B45309", secundaria: "#1C1917", acento: "#F5E6D3" },
  { nome: "Rosa", primaria: "#BE185D", secundaria: "#3B0764", acento: "#FCE7F3" },
  { nome: "Esmeralda", primaria: "#047857", secundaria: "#064E3B", acento: "#D1FAE5" },
  { nome: "Azul", primaria: "#1D4ED8", secundaria: "#0F172A", acento: "#DBEAFE" },
  { nome: "Roxo", primaria: "#7C3AED", secundaria: "#1E1B4B", acento: "#EDE9FE" },
  { nome: "Preto", primaria: "#171717", secundaria: "#000000", acento: "#F5F5F5" },
];

function iconFor(themeKey: string) {
  return themeKey === "dark_blue" ? Scissors : Sparkles;
}

type FormState = {
  name: string;
  phone: string;
  whatsapp: string;
  address: string;
  instagram: string;
  business_hours: string;
  logo_url: string;
  cover_url: string;
  color_primary: string;
  color_secondary: string;
  color_accent: string;
  segment_id: string;
  loyalty_program_enabled: boolean;
  whatsapp_reminder_enabled: boolean;
};

export function ConfiguracaoView({ company }: { company: Tables<"companies"> }) {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();
  const [enviandoCampo, setEnviandoCampo] = useState<string | null>(null);
  const [segments, setSegments] = useState<Tables<"segments">[]>([]);
  const [carregandoSegmentos, setCarregandoSegmentos] = useState(true);
  const [erroSegmentos, setErroSegmentos] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    supabase
      .from("segments")
      .select("*")
      .eq("active", true)
      .order("name")
      .then(({ data, error }) => {
        if (error) {
          setErroSegmentos(true);
        } else {
          setSegments(data ?? []);
        }
        setCarregandoSegmentos(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [form, setForm] = useState<FormState>({
    name: company.name || "",
    phone: company.phone || "",
    whatsapp: company.whatsapp || "",
    address: company.address || "",
    instagram: company.instagram || "",
    business_hours: company.business_hours || "",
    logo_url: company.logo_url || "",
    cover_url: company.cover_url || "",
    color_primary: company.color_primary || "#BE185D",
    color_secondary: company.color_secondary || "#1C1917",
    color_accent: company.color_accent || "#FCE7F3",
    segment_id: company.segment_id,
    loyalty_program_enabled: company.loyalty_program_enabled,
    whatsapp_reminder_enabled: company.whatsapp_reminder_enabled,
  });

  function set<K extends keyof FormState>(campo: K, valor: FormState[K]) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  async function upload(file: File, campo: "logo_url" | "cover_url") {
    if (enviandoCampo) return;
    setEnviandoCampo(campo);
    try {
      const url = await uploadCompanyAsset(supabase, company.id, campo === "logo_url" ? "logo" : "cover", file);
      set(campo, url);
    } catch (e) {
      toast({ title: "Erro no upload", description: friendlyError(e, "enviar a imagem"), variant: "destructive" });
    } finally {
      setEnviandoCampo(null);
    }
  }

  async function salvar() {
    setSalvando(true);
    const { error } = await supabase.from("companies").update(form).eq("id", company.id);
    setSalvando(false);
    if (error) {
      toast({ title: "Erro", description: friendlyError(error, "salvar as informações do estabelecimento"), variant: "destructive" });
      return;
    }
    toast({ title: "Identidade visual salva!" });
    router.refresh();
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <h1 className="font-heading text-3xl font-semibold mb-1">Identidade visual</h1>
      <p className="text-sm text-muted-foreground mb-6">Personalize cores, capa e informações do seu salão</p>

      <Card className="mb-4">
        <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <Link2 className="w-4 h-4 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Link público (o que você compartilha com clientes)</p>
              <p className="font-mono text-sm truncate">{company.slug}.{BOOKING_DOMAIN}</p>
            </div>
          </div>
          <a
            href={`https://${company.slug}.${BOOKING_DOMAIN}`}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-primary hover:underline flex items-center gap-1 shrink-0"
          >
            Abrir <ExternalLink className="w-3 h-3" />
          </a>
        </CardContent>
      </Card>

      <Card className="overflow-hidden mb-4">
        <div className="h-40 bg-muted relative overflow-hidden">
          {form.cover_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={form.cover_url} alt="Capa" className="w-full h-full object-cover" />
          ) : (
            // Sem capa cadastrada: placeholder na cor da marca (não uma área vazia) —
            // padrão de pontos + ícone sinalizam que é um estado intencional.
            <div className="w-full h-full bg-gradient-to-br from-secondary to-primary relative flex items-center justify-center">
              <div
                className="absolute inset-0 opacity-25"
                style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.55) 1px, transparent 1px)", backgroundSize: "16px 16px" }}
              />
              <ImageIcon className="w-9 h-9 text-white/35 relative" strokeWidth={1.5} />
            </div>
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
              <Label htmlFor="cor-primaria" className="text-xs">Primária</Label>
              <input id="cor-primaria" type="color" value={form.color_primary} onChange={(e) => set("color_primary", e.target.value)} className="w-full h-9 rounded-lg border border-border" />
            </div>
            <div>
              <Label htmlFor="cor-secundaria" className="text-xs">Secundária</Label>
              <input id="cor-secundaria" type="color" value={form.color_secondary} onChange={(e) => set("color_secondary", e.target.value)} className="w-full h-9 rounded-lg border border-border" />
            </div>
            <div>
              <Label htmlFor="cor-acento" className="text-xs">Acento</Label>
              <input id="cor-acento" type="color" value={form.color_accent} onChange={(e) => set("color_accent", e.target.value)} className="w-full h-9 rounded-lg border border-border" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader><CardTitle className="text-base">Segmento</CardTitle></CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">Define as cores do app mobile do seu time.</p>
          {carregandoSegmentos ? (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 py-4"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Carregando segmentos...</p>
          ) : erroSegmentos ? (
            <p className="text-xs text-destructive py-4">Não foi possível carregar os segmentos disponíveis.</p>
          ) : (
          <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto">
            {segments.map((segment) => {
              const Icon = iconFor(segment.theme_key);
              return (
                <button
                  key={segment.id}
                  type="button"
                  onClick={() => set("segment_id", segment.id)}
                  className={cn(
                    "flex items-center justify-between gap-2 p-3 rounded-lg border text-left transition-colors",
                    form.segment_id === segment.id ? "border-primary ring-1 ring-primary" : "border-border hover:bg-muted"
                  )}
                >
                  <span className="flex items-center gap-2 text-xs font-medium">
                    <Icon className="w-4 h-4 text-muted-foreground shrink-0" /> {segment.name}
                  </span>
                  {form.segment_id === segment.id && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                </button>
              );
            })}
          </div>
          )}
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader><CardTitle className="text-base">Informações</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div><Label htmlFor="nome-estabelecimento">Nome do estabelecimento</Label><Input id="nome-estabelecimento" value={form.name} onChange={(e) => set("name", e.target.value)} /></div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><Label htmlFor="telefone-estabelecimento">Telefone</Label><Input id="telefone-estabelecimento" type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} /></div>
            <div><Label htmlFor="whatsapp-estabelecimento">WhatsApp</Label><Input id="whatsapp-estabelecimento" type="tel" value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} /></div>
          </div>
          <div><Label htmlFor="endereco-estabelecimento">Endereço</Label><Input id="endereco-estabelecimento" value={form.address} onChange={(e) => set("address", e.target.value)} /></div>
          <div><Label htmlFor="instagram-estabelecimento">Instagram</Label><Input id="instagram-estabelecimento" value={form.instagram} onChange={(e) => set("instagram", e.target.value)} /></div>
          <div>
            <Label htmlFor="horario-funcionamento" className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Horário de funcionamento</Label>
            <Input id="horario-funcionamento" value={form.business_hours} onChange={(e) => set("business_hours", e.target.value)} placeholder="Seg-Sex 9h-19h, Sáb 9h-17h" />
          </div>
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
            <Switch aria-label="Programa de fidelidade" checked={form.loyalty_program_enabled} onCheckedChange={(v) => set("loyalty_program_enabled", v)} />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Lembrete WhatsApp</p>
                <p className="text-xs text-muted-foreground">Serviço cobrado à parte</p>
              </div>
            </div>
            <Switch aria-label="Lembrete WhatsApp" checked={form.whatsapp_reminder_enabled} onCheckedChange={(v) => set("whatsapp_reminder_enabled", v)} />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {company.anamnesis_enabled ? <ShieldCheck className="w-4 h-4 text-primary" /> : <ShieldOff className="w-4 h-4 text-muted-foreground" />}
              <div>
                <p className="text-sm font-medium">Ficha de Anamnese</p>
                <p className="text-xs text-muted-foreground">
                  {company.anamnesis_enabled ? "Liberada para a sua empresa" : "Recurso liberado pela Impegni — fale com o suporte"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button onClick={salvar} disabled={salvando} className="w-full gap-2">
        {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} {salvando ? "Salvando..." : "Salvar identidade"}
      </Button>
    </div>
  );
}
