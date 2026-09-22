import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { OptionPill } from "@/components/ui/option-pill";
import { BUSINESS_GOAL_OPTIONS, NO_GOALS_VALUE } from "@/lib/onboarding-options";
import type { Tables } from "@/lib/supabase/database.types";
import type { StepProps } from "../wizard-types";

/**
 * Alterna um objetivo respeitando a exclusividade de "Nenhuma das opções
 * acima": marcá-la desmarca todas as outras: marcar qualquer outra remove
 * ela. O resto do multi-select funciona como checkbox comum.
 */
export function toggleGoal(current: string[], value: string): string[] {
  if (value === NO_GOALS_VALUE) {
    return current.includes(NO_GOALS_VALUE) ? [] : [NO_GOALS_VALUE];
  }
  const withoutNone = current.filter((g) => g !== NO_GOALS_VALUE);
  return withoutNone.includes(value) ? withoutNone.filter((g) => g !== value) : [...withoutNone, value];
}

export function StepSegment({ data, onChange, segments }: StepProps & { segments: Tables<"segments">[] }) {
  const selectedSegment = segments.find((s) => s.id === data.segmentId);
  const isOtherSegment = selectedSegment?.slug === "outro";

  function selectSegment(segment: Tables<"segments">) {
    // Trocar pra um segmento que não é "Outro" limpa o texto livre — ele só
    // faz sentido junto da opção "Outro" selecionada.
    onChange({ segmentId: segment.id, otherSegment: segment.slug === "outro" ? data.otherSegment : "" });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Qual é o segmento do seu negócio?</Label>
        <div className="grid grid-cols-2 gap-2">
          {segments.map((segment) => (
            <OptionPill key={segment.id} selected={data.segmentId === segment.id} onClick={() => selectSegment(segment)}>
              {segment.name}
            </OptionPill>
          ))}
        </div>
        {isOtherSegment && (
          <div className="pt-1">
            <Label htmlFor="otherSegment">Qual é o segmento do seu negócio?</Label>
            <Input
              id="otherSegment"
              autoFocus
              placeholder="Ex: Podologia"
              value={data.otherSegment}
              onChange={(e) => onChange({ otherSegment: e.target.value })}
              className="h-11 mt-1"
              required
            />
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label>Selecione seus principais objetivos para alcançar o sucesso</Label>
        <p className="text-xs text-muted-foreground">Pode escolher mais de um.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {BUSINESS_GOAL_OPTIONS.map((goal) => (
            <OptionPill
              key={goal.value}
              selected={data.goals.includes(goal.value)}
              onClick={() => onChange({ goals: toggleGoal(data.goals, goal.value) })}
            >
              {goal.label}
            </OptionPill>
          ))}
        </div>
      </div>
    </div>
  );
}

export function stepSegmentIsValid(data: { segmentId: string; otherSegment: string; goals: string[] }, segments: Tables<"segments">[]): boolean {
  if (!data.segmentId) return false;
  const isOther = segments.find((s) => s.id === data.segmentId)?.slug === "outro";
  if (isOther && data.otherSegment.trim().length === 0) return false;
  return data.goals.length > 0;
}
