"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Scissors, Sparkles, Loader2, Check, ClipboardCheck } from "lucide-react";
import { AuthLayout } from "@/components/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/errors";
import { stageTermsAcceptance } from "@/lib/terms";
import { fetchPendingOnboarding, type PendingOnboardingPayload } from "@/lib/pending-onboarding";
import { EMPTY_WIZARD_DATA, type WizardData } from "@/app/(auth)/register/wizard-types";
import { StepBusiness, stepBusinessIsValid } from "@/app/(auth)/register/steps/step-business";
import { StepSegment, stepSegmentIsValid } from "@/app/(auth)/register/steps/step-segment";
import { StepAddress, stepAddressIsValid } from "@/app/(auth)/register/steps/step-address";
import type { Tables } from "@/lib/supabase/database.types";

// Ícone só pra decorar o card de segmento — a lista de verdade vem do banco
// (public.segments), o Super Admin pode cadastrar um segmento novo sem
// precisar de deploy. theme_key "dark_blue" usa tesoura, o resto usa brilho.
function iconFor(themeKey: string) {
  return themeKey === "dark_blue" ? Scissors : Sparkles;
}

function draftToWizardData(draft: PendingOnboardingPayload): WizardData {
  return {
    ...EMPTY_WIZARD_DATA,
    businessName: draft.businessName,
    document: draft.document,
    businessSize: draft.businessSize,
    staffSizeRange: draft.staffSizeRange,
    segmentId: draft.segmentId,
    otherSegment: draft.otherSegment ?? "",
    goals: draft.goals,
    zipCode: draft.zipCode,
    street: draft.street,
    neighborhood: draft.neighborhood,
    addressNumber: draft.addressNumber,
    complement: draft.complement,
    city: draft.city,
    state: draft.state,
  };
}

/**
 * Primeiro acesso de um usuário sem empresa ainda.
 *
 * Caminho normal (quem veio do cadastro em 5 etapas): o porte, segmento,
 * objetivos e endereço já foram coletados lá e ficaram guardados no banco
 * (`stage_pending_onboarding` — ver `lib/pending-onboarding.ts`), não em
 * localStorage, então chegam aqui mesmo que a confirmação de e-mail tenha
 * sido aberta noutro aparelho. Em vez de aplicar direto sem perguntar,
 * mostramos um resumo revisável — a pessoa pode corrigir algo antes de
 * confirmar (reaproveita os mesmos componentes de etapa do wizard).
 *
 * Caminho de fallback (sem rascunho — conta antiga de antes desta feature,
 * ou o rascunho já foi consumido): cai no formulário simples de sempre,
 * não trava ninguém.
 */
export function OnboardingForm({ userEmail }: { userEmail: string }) {
  const router = useRouter();
  const [fase, setFase] = useState<"verificando" | "recuperado" | "manual">("verificando");
  const [erro, setErro] = useState("");
  const [confirmando, setConfirmando] = useState(false);

  const [segments, setSegments] = useState<Tables<"segments">[]>([]);
  const [recuperado, setRecuperado] = useState<WizardData>(EMPTY_WIZARD_DATA);
  const [draft, setDraft] = useState<PendingOnboardingPayload | null>(null);

  // Aceite do contrato — reconfirmado aqui porque este é o último ponto
  // antes da empresa existir de fato. Se a gravação no cadastro tiver
  // falhado (rede/timeout), é aqui que a evidência auditável é criada;
  // `complete_company_onboarding` recusa concluir sem ela.
  const [termsAccepted, setTermsAccepted] = useState(false);

  // formulário manual (fallback, sem rascunho)
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [checkingSlug, setCheckingSlug] = useState(false);
  const [segmentId, setSegmentId] = useState("");
  const [otherSegment, setOtherSegment] = useState("");
  const [loadingManual, setLoadingManual] = useState(false);

  const tentouCarregar = useRef(false);

  useEffect(() => {
    createClient()
      .from("segments")
      .select("*")
      .eq("active", true)
      .order("name")
      .then(({ data }) => {
        if (!data) return;
        setSegments(data);
        if (data.length > 0) setSegmentId((current) => current || data[0].id);
      });
  }, []);

  useEffect(() => {
    if (tentouCarregar.current) return;
    tentouCarregar.current = true;

    fetchPendingOnboarding(createClient()).then((pending) => {
      if (!pending) {
        setFase("manual");
        return;
      }
      setDraft(pending);
      setRecuperado(draftToWizardData(pending));
      setFase("recuperado");
    });
  }, []);

  function patchRecuperado(update: Partial<WizardData>) {
    setRecuperado((current) => ({ ...current, ...update }));
  }

  const recuperadoValido =
    stepBusinessIsValid(recuperado) &&
    stepSegmentIsValid(recuperado, segments) &&
    stepAddressIsValid(recuperado) &&
    termsAccepted;

  async function confirmarRecuperado() {
    if (!draft || confirmando) return;
    setConfirmando(true);
    setErro("");
    const supabase = createClient();

    // Garante a evidência do aceite antes de criar a empresa (idempotente
    // — não duplica se já foi registrado no cadastro).
    const { error: termsError } = await stageTermsAcceptance(supabase, userEmail);
    if (termsError) {
      setConfirmando(false);
      setErro(friendlyError(termsError, "registrar o aceite do contrato"));
      return;
    }

    const { data: novoSlug, error: slugError } = await supabase.rpc("generate_unique_slug", { base_name: draft.businessName });
    if (slugError || !novoSlug) {
      setConfirmando(false);
      setErro(friendlyError(slugError, "preparar sua empresa"));
      return;
    }

    const otherSegmentSelected = segments.find((s) => s.id === recuperado.segmentId)?.slug === "outro";
    const { error: rpcError } = await supabase.rpc("complete_company_onboarding", {
      p_name: draft.businessName,
      p_slug: novoSlug,
      p_segment_id: recuperado.segmentId,
      p_other_segment: otherSegmentSelected ? recuperado.otherSegment.trim() : undefined,
      p_business_size: recuperado.businessSize,
      p_staff_size_range: recuperado.staffSizeRange,
      p_phone: draft.phone,
      p_document: draft.document,
      p_zip_code: recuperado.zipCode,
      p_street: recuperado.street,
      p_neighborhood: recuperado.neighborhood,
      p_address_number: recuperado.addressNumber,
      p_complement: recuperado.complement,
      p_city: recuperado.city,
      p_state: recuperado.state,
      p_goals: recuperado.goals,
    });

    setConfirmando(false);
    if (rpcError) {
      setErro(friendlyError(rpcError, "criar sua empresa"));
      return;
    }
    router.push("/dashboard?welcome=1");
    router.refresh();
  }

  async function sugerirSlug(baseName: string) {
    if (slugTouched || !baseName.trim()) return;
    setCheckingSlug(true);
    const supabase = createClient();
    const { data, error: rpcError } = await supabase.rpc("generate_unique_slug", { base_name: baseName });
    setCheckingSlug(false);
    if (!rpcError && data && !slugTouched) setSlug(data);
  }

  const manualSegmentIsOther = segments.find((s) => s.id === segmentId)?.slug === "outro";
  const manualValido =
    name.trim().length > 1 &&
    !!segmentId &&
    (!manualSegmentIsOther || otherSegment.trim().length > 0) &&
    termsAccepted;

  async function handleSubmitManual(e: React.FormEvent) {
    e.preventDefault();
    if (loadingManual || !manualValido) return;
    setLoadingManual(true);
    setErro("");
    const supabase = createClient();

    // Aceite primeiro (idempotente), depois cria a empresa pela MESMA RPC
    // do caminho normal — nunca com insert cru em `companies`, que pularia
    // as validações de negócio e não passaria porte/objetivos/endereço.
    const { error: termsError } = await stageTermsAcceptance(supabase, userEmail);
    if (termsError) {
      setLoadingManual(false);
      setErro(friendlyError(termsError, "registrar o aceite do contrato"));
      return;
    }

    const { data: finalSlug, error: slugError } = await supabase.rpc("generate_unique_slug", { base_name: slug || name });
    if (slugError || !finalSlug) {
      setLoadingManual(false);
      setErro(slugError ? friendlyError(slugError, "gerar o link da empresa") : "Não foi possível gerar o link da empresa.");
      return;
    }

    const { error: rpcError } = await supabase.rpc("complete_company_onboarding", {
      p_name: name.trim(),
      p_slug: finalSlug,
      p_segment_id: segmentId,
      p_other_segment: manualSegmentIsOther ? otherSegment.trim() : undefined,
    });
    setLoadingManual(false);
    if (rpcError) {
      setErro(friendlyError(rpcError, "criar a empresa"));
      return;
    }
    router.push("/dashboard?welcome=1");
    router.refresh();
  }

  const termsCheckbox = (
    <label className="flex items-start gap-2.5 cursor-pointer">
      <Checkbox checked={termsAccepted} onCheckedChange={(v) => setTermsAccepted(v === true)} className="mt-0.5" />
      <span className="text-sm text-muted-foreground">
        Li e concordo com o{" "}
        <Link href="/contrato" target="_blank" rel="noopener noreferrer" className="text-primary font-medium hover:underline">
          Contrato de Prestação de Serviços e os Termos de Uso
        </Link>
        .
      </span>
    </label>
  );

  if (fase === "verificando") {
    return (
      <AuthLayout icon={Scissors} title="Preparando seu espaço" subtitle="Só um instante...">
        <div className="flex justify-center py-4">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </AuthLayout>
    );
  }

  if (fase === "recuperado") {
    return (
      <AuthLayout icon={ClipboardCheck} title="Encontramos seus dados" subtitle="Você pode continuar seu cadastro de onde parou, ou ajustar algo antes de confirmar.">
        {erro && <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{erro}</div>}
        <div className="space-y-6">
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">Negócio</p>
            <p className="text-sm font-medium">{draft?.businessName}</p>
          </div>
          <StepBusiness data={recuperado} onChange={patchRecuperado} />
          <StepSegment data={recuperado} onChange={patchRecuperado} segments={segments} />
          <StepAddress data={recuperado} onChange={patchRecuperado} />
          {termsCheckbox}
          <Button className="w-full h-12 font-medium" disabled={!recuperadoValido || confirmando} onClick={confirmarRecuperado}>
            {confirmando ? <Loader2 className="w-4 h-4 animate-spin" /> : "Continuar cadastro"}
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout icon={Scissors} title="Vamos criar sua empresa" subtitle="É rápido — você poderá ajustar tudo depois">
      <form onSubmit={handleSubmitManual} className="space-y-4">
        {erro && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{erro}</div>}
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
          <Label>Segmento</Label>
          <p className="text-xs text-muted-foreground">Define as cores do app mobile do seu time — dá pra trocar depois em Configuração.</p>
          <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto">
            {segments.map((segment) => {
              const Icon = iconFor(segment.theme_key);
              return (
                <button
                  key={segment.id}
                  type="button"
                  onClick={() => setSegmentId(segment.id)}
                  className={cn(
                    "flex items-center justify-between gap-2 p-3 rounded-lg border text-left transition-colors",
                    segmentId === segment.id ? "border-primary ring-1 ring-primary" : "border-border hover:bg-muted"
                  )}
                >
                  <span className="flex items-center gap-2 text-xs font-medium">
                    <Icon className="w-4 h-4 text-muted-foreground shrink-0" /> {segment.name}
                  </span>
                  {segmentId === segment.id && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                </button>
              );
            })}
          </div>
          {manualSegmentIsOther && (
            <div className="pt-1">
              <Label htmlFor="otherSegmentManual">Qual é o segmento do seu negócio?</Label>
              <Input
                id="otherSegmentManual"
                autoFocus
                placeholder="Ex: Podologia"
                value={otherSegment}
                onChange={(e) => setOtherSegment(e.target.value)}
                className="mt-1"
                required
              />
            </div>
          )}
        </div>
        {termsCheckbox}
        <Button type="submit" className="w-full h-12 font-medium" disabled={loadingManual || checkingSlug || !manualValido}>
          {loadingManual ? <Loader2 className="w-4 h-4 animate-spin" /> : "Criar empresa"}
        </Button>
      </form>
    </AuthLayout>
  );
}
