export function WizardProgress({ step, totalSteps, label }: { step: number; totalSteps: number; label: string }) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-muted-foreground">
          Etapa {step} de {totalSteps}
        </span>
        <span className="text-xs font-medium text-foreground">{label}</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300"
          style={{ width: `${(step / totalSteps) * 100}%` }}
        />
      </div>
    </div>
  );
}
