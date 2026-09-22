"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";

function WelcomeToastInner() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isWelcome = searchParams.get("welcome") === "1";

  useEffect(() => {
    if (!isWelcome) return;
    toast({ title: "Seu espaço está pronto!", description: "Seu teste grátis de 14 dias começou." });
    router.replace("/dashboard");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isWelcome]);

  return null;
}

/** Some do fluxo de dashboard normal: só dispara a mensagem de boas-vindas quando `?welcome=1` vem do onboarding recém-concluído. */
export function WelcomeToast() {
  return (
    <Suspense fallback={null}>
      <WelcomeToastInner />
    </Suspense>
  );
}
