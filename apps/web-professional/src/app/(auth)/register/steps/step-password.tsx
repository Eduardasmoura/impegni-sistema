"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Eye, EyeOff, Lock, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { passwordChecks, isPasswordValid } from "@/lib/validators";
import { BUSINESS_GOAL_OPTIONS, BUSINESS_SIZE_OPTIONS, STAFF_SIZE_OPTIONS } from "@/lib/onboarding-options";
import type { Tables } from "@/lib/supabase/database.types";
import type { StepProps } from "../wizard-types";

function Requirement({ met, children }: { met: boolean; children: React.ReactNode }) {
  return (
    <li className={cn("flex items-center gap-1.5 text-xs", met ? "text-primary" : "text-muted-foreground")}>
      {met ? <Check className="w-3.5 h-3.5 shrink-0" /> : <X className="w-3.5 h-3.5 shrink-0 opacity-40" />}
      {children}
    </li>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
        <Input
          id={id}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pl-10 pr-10 h-12"
          required
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

export function StepPassword({ data, onChange, segments }: StepProps & { segments: Tables<"segments">[] }) {
  const checks = passwordChecks(data.password);
  const passwordsMatch = data.password.length > 0 && data.password === data.confirmPassword;
  const segmentName = segments.find((s) => s.id === data.segmentId)?.name;
  const goalLabels = data.goals.map((g) => BUSINESS_GOAL_OPTIONS.find((o) => o.value === g)?.label ?? g);

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <PasswordField id="password" label="Senha" value={data.password} onChange={(v) => onChange({ password: v })} autoComplete="new-password" />
        <ul className="grid grid-cols-2 gap-1.5">
          <Requirement met={checks.length}>8 caracteres</Requirement>
          <Requirement met={checks.letter}>Pelo menos uma letra</Requirement>
          <Requirement met={checks.number}>Pelo menos um número</Requirement>
        </ul>

        <PasswordField
          id="confirmPassword"
          label="Confirmar senha"
          value={data.confirmPassword}
          onChange={(v) => onChange({ confirmPassword: v })}
          autoComplete="new-password"
        />
        {data.confirmPassword.length > 0 && (
          <p className={cn("text-xs flex items-center gap-1.5", passwordsMatch ? "text-primary" : "text-destructive")}>
            {passwordsMatch ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
            As senhas coincidem
          </p>
        )}
      </div>

      <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Revise antes de concluir</p>

        <div>
          <p className="text-xs text-muted-foreground">Seus dados</p>
          <p className="text-sm">{data.fullName} · {data.email} · {data.phone}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Seu negócio</p>
          <p className="text-sm">
            {data.businessName} · {data.document}
            <br />
            {BUSINESS_SIZE_OPTIONS.find((o) => o.value === data.businessSize)?.label} ·{" "}
            {STAFF_SIZE_OPTIONS.find((o) => o.value === data.staffSizeRange)?.label}
            <br />
            {segmentName === "Outro" ? data.otherSegment : segmentName}
          </p>
        </div>
        {goalLabels.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground">Objetivos</p>
            <p className="text-sm">{goalLabels.join(", ")}</p>
          </div>
        )}
        <div>
          <p className="text-xs text-muted-foreground">Endereço</p>
          <p className="text-sm">
            {data.street}, {data.addressNumber}
            {data.complement ? ` — ${data.complement}` : ""}
            <br />
            {data.neighborhood} · {data.city}/{data.state} · CEP {data.zipCode}
          </p>
        </div>
      </div>

      <label className="flex items-start gap-2.5 cursor-pointer">
        <Checkbox
          checked={data.termsAccepted}
          onCheckedChange={(v) => onChange({ termsAccepted: v === true })}
          className="mt-0.5"
        />
        <span className="text-sm text-muted-foreground">
          Li e concordo com o{" "}
          <Link href="/contrato" target="_blank" rel="noopener noreferrer" className="text-primary font-medium hover:underline">
            Contrato de Prestação de Serviços e os Termos de Uso
          </Link>
          .
        </span>
      </label>
    </div>
  );
}

export function stepPasswordIsValid(data: { password: string; confirmPassword: string; termsAccepted: boolean }): boolean {
  return isPasswordValid(data.password) && data.password === data.confirmPassword && data.termsAccepted;
}
