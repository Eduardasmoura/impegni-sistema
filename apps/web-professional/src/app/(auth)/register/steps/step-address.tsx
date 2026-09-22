"use client";

import { useState } from "react";
import { Loader2, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCep, isValidCepFormat } from "@/lib/validators";
import { lookupCep } from "@/lib/viacep";
import type { StepProps } from "../wizard-types";

export function StepAddress({ data, onChange }: StepProps) {
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [erroCep, setErroCep] = useState("");

  async function handleCepBlur() {
    if (!isValidCepFormat(data.zipCode)) return;
    setErroCep("");
    setBuscandoCep(true);
    const resultado = await lookupCep(data.zipCode);
    setBuscandoCep(false);

    if (resultado.status === "not_found") {
      setErroCep("Não encontramos esse CEP. Verifique o número e tente novamente.");
      return;
    }
    if (resultado.status === "unavailable") {
      setErroCep("Não conseguimos consultar o CEP agora. Você pode preencher o endereço manualmente.");
      return;
    }
    onChange({
      street: resultado.address.street || data.street,
      neighborhood: resultado.address.neighborhood || data.neighborhood,
      city: resultado.address.city || data.city,
      state: resultado.address.state || data.state,
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="zipCode">CEP</Label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
          <Input
            id="zipCode"
            inputMode="numeric"
            placeholder="00000-000"
            value={data.zipCode}
            onChange={(e) => {
              setErroCep("");
              onChange({ zipCode: formatCep(e.target.value) });
            }}
            onBlur={handleCepBlur}
            className="pl-10 h-12"
            required
          />
          {buscandoCep && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />}
        </div>
        {erroCep && <p className="text-xs text-destructive">{erroCep}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="street">Rua</Label>
        <Input id="street" value={data.street} onChange={(e) => onChange({ street: e.target.value })} className="h-12" required />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="addressNumber">Número</Label>
          <Input
            id="addressNumber"
            inputMode="numeric"
            value={data.addressNumber}
            onChange={(e) => onChange({ addressNumber: e.target.value })}
            className="h-12"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="complement">Complemento</Label>
          <Input
            id="complement"
            placeholder="Opcional"
            value={data.complement}
            onChange={(e) => onChange({ complement: e.target.value })}
            className="h-12"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="neighborhood">Bairro</Label>
        <Input id="neighborhood" value={data.neighborhood} onChange={(e) => onChange({ neighborhood: e.target.value })} className="h-12" required />
      </div>

      <div className="grid grid-cols-[1fr_auto] gap-3">
        <div className="space-y-2">
          <Label htmlFor="city">Cidade</Label>
          <Input id="city" value={data.city} onChange={(e) => onChange({ city: e.target.value })} className="h-12" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="state">Estado</Label>
          <Input
            id="state"
            maxLength={2}
            placeholder="SP"
            value={data.state}
            onChange={(e) => onChange({ state: e.target.value.toUpperCase() })}
            className="h-12 w-16 text-center uppercase"
            required
          />
        </div>
      </div>
    </div>
  );
}

export function stepAddressIsValid(data: {
  zipCode: string;
  street: string;
  neighborhood: string;
  addressNumber: string;
  city: string;
  state: string;
}): boolean {
  return (
    isValidCepFormat(data.zipCode) &&
    data.street.trim().length > 0 &&
    data.neighborhood.trim().length > 0 &&
    data.addressNumber.trim().length > 0 &&
    data.city.trim().length > 0 &&
    /^[A-Za-z]{2}$/.test(data.state.trim())
  );
}
