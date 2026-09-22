import { User, Mail, Phone, Building2, IdCard } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDocument, formatPhone, isValidDocument, isValidEmail, isValidPhone } from "@/lib/validators";
import type { StepProps } from "../wizard-types";

export function StepAccount({ data, onChange }: StepProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="fullName">Nome completo</Label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
          <Input
            id="fullName"
            autoFocus
            autoComplete="name"
            value={data.fullName}
            onChange={(e) => onChange({ fullName: e.target.value })}
            className="pl-10 h-12"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={data.email}
            onChange={(e) => onChange({ email: e.target.value })}
            className="pl-10 h-12"
            required
            aria-invalid={data.email.length > 0 && !isValidEmail(data.email)}
          />
        </div>
        {data.email.length > 0 && !isValidEmail(data.email) && (
          <p className="text-xs text-destructive">Informe um e-mail válido.</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Telefone</Label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
          <Input
            id="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="(11) 91234-5678"
            value={data.phone}
            onChange={(e) => onChange({ phone: formatPhone(e.target.value) })}
            className="pl-10 h-12"
            required
            aria-invalid={data.phone.length > 0 && !isValidPhone(data.phone)}
          />
        </div>
        {data.phone.length > 0 && !isValidPhone(data.phone) && (
          <p className="text-xs text-destructive">Informe um telefone com DDD.</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="businessName">Nome do negócio</Label>
        <div className="relative">
          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
          <Input
            id="businessName"
            placeholder="Studio Nova"
            value={data.businessName}
            onChange={(e) => onChange({ businessName: e.target.value })}
            className="pl-10 h-12"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="document">CPF ou CNPJ</Label>
        <div className="relative">
          <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
          <Input
            id="document"
            inputMode="numeric"
            placeholder="000.000.000-00"
            value={data.document}
            onChange={(e) => onChange({ document: formatDocument(e.target.value) })}
            className="pl-10 h-12"
            required
            aria-invalid={data.document.length > 0 && !isValidDocument(data.document)}
          />
        </div>
        {data.document.length > 0 && !isValidDocument(data.document) && (
          <p className="text-xs text-destructive">Confira os números — o documento não parece válido.</p>
        )}
      </div>
    </div>
  );
}

export function stepAccountIsValid(data: { fullName: string; email: string; phone: string; businessName: string; document: string }): boolean {
  return (
    data.fullName.trim().length > 1 &&
    isValidEmail(data.email) &&
    isValidPhone(data.phone) &&
    data.businessName.trim().length > 1 &&
    isValidDocument(data.document)
  );
}
