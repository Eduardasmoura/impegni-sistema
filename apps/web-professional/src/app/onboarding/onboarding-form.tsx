"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Scissors, Loader2 } from "lucide-react";
import { AuthLayout } from "@/components/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Primeiro acesso de um usuário sem empresa: cria a empresa (o trigger
// on_company_created já o torna 'owner' automaticamente, ver migration 002).
export function OnboardingForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error: insertError } = await supabase.from("companies").insert({ name, slug });
    setLoading(false);
    if (insertError) {
      setError(insertError.message.includes("duplicate") ? "Esse link já está em uso, escolha outro." : insertError.message);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <AuthLayout icon={Scissors} title="Vamos criar sua empresa" subtitle="É rápido — você poderá ajustar tudo depois">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}
        <div className="space-y-2">
          <Label htmlFor="name">Nome do salão</Label>
          <Input
            id="name"
            autoFocus
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!slugTouched) setSlug(slugify(e.target.value));
            }}
            placeholder="Studio Nova"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="slug">Link de agendamento</Label>
          <div className="flex items-center rounded-lg border border-input bg-card text-sm overflow-hidden">
            <span className="px-3 py-2 text-muted-foreground bg-muted whitespace-nowrap">agendar.barberinova.com/</span>
            <input
              id="slug"
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(slugify(e.target.value));
              }}
              className="flex-1 px-2 py-2 bg-transparent outline-none min-w-0"
              required
            />
          </div>
        </div>
        <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Criar empresa"}
        </Button>
      </form>
    </AuthLayout>
  );
}
