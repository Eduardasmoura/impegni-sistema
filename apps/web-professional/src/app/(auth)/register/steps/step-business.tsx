import { Label } from "@/components/ui/label";
import { OptionPill } from "@/components/ui/option-pill";
import { BUSINESS_SIZE_OPTIONS, STAFF_SIZE_OPTIONS } from "@/lib/onboarding-options";
import type { StepProps } from "../wizard-types";

export function StepBusiness({ data, onChange }: StepProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Qual é o tamanho do seu negócio?</Label>
        <div className="grid grid-cols-3 gap-2">
          {BUSINESS_SIZE_OPTIONS.map((option) => (
            <OptionPill
              key={option.value}
              selected={data.businessSize === option.value}
              onClick={() => onChange({ businessSize: option.value })}
              className="justify-center text-center"
            >
              {option.label}
            </OptionPill>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Quantos profissionais realizam atendimentos no seu negócio?</Label>
        <div className="grid grid-cols-2 gap-2">
          {STAFF_SIZE_OPTIONS.map((option) => (
            <OptionPill
              key={option.value}
              selected={data.staffSizeRange === option.value}
              onClick={() => onChange({ staffSizeRange: option.value })}
            >
              {option.label}
            </OptionPill>
          ))}
        </div>
      </div>
    </div>
  );
}

export function stepBusinessIsValid(data: { businessSize: string; staffSizeRange: string }): boolean {
  return data.businessSize.length > 0 && data.staffSizeRange.length > 0;
}
