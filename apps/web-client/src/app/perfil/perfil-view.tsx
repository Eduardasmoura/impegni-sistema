"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Upload, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { createClient } from "@/lib/supabase/client";
import { uploadAvatar } from "@/lib/upload";
import type { Tables } from "@/lib/supabase/database.types";

export function PerfilView({ userEmail, userId, profile }: { userEmail: string; userId: string; profile: Tables<"profiles"> | null }) {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || "");
  const [email, setEmail] = useState(userEmail);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleAvatar(file: File) {
    setUploading(true);
    try {
      const url = await uploadAvatar(supabase, userId, file);
      // Persiste já aqui, não só quando "Salvar alterações" for clicado —
      // sem isso, o arquivo ia pro Storage mas um refresh antes de salvar o
      // resto do formulário perdia a troca de foto (BUG: auditoria pré-lançamento).
      const { error } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", userId);
      if (error) throw error;
      setAvatarUrl(url);
    } catch (e) {
      toast({ title: "Erro no upload", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }

  async function salvar() {
    setSaving(true);
    // full_name/phone/avatar_url vivem em `profiles` (colunas liberadas pra
    // auto-edição — ver migration 001); e-mail é trocado via Supabase Auth,
    // que manda um link de confirmação antes de valer de fato.
    const { error: profileError } = await supabase.from("profiles").update({ full_name: fullName, phone, avatar_url: avatarUrl }).eq("id", userId);
    let emailMsg = "";
    if (email !== userEmail) {
      const { error: emailError } = await supabase.auth.updateUser({ email });
      if (emailError) {
        toast({ title: "Erro ao atualizar e-mail", description: emailError.message, variant: "destructive" });
        setSaving(false);
        return;
      }
      emailMsg = " Enviamos um link de confirmação para o novo e-mail.";
    }
    setSaving(false);
    if (profileError) {
      toast({ title: "Erro", description: profileError.message, variant: "destructive" });
      return;
    }
    toast({ title: "Perfil atualizado!" + emailMsg });
    router.refresh();
  }

  return (
    <main className="max-w-lg mx-auto px-4 py-8">
      <h1 className="font-heading text-3xl font-semibold mb-6">Meu perfil</h1>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-4">
            <label className="cursor-pointer">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="Foto de perfil" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-6 h-6 text-muted-foreground" />
                )}
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleAvatar(e.target.files[0])} />
            </label>
            <div>
              <p className="text-sm font-medium flex items-center gap-1"><Upload className="w-3.5 h-3.5" /> {uploading ? "Enviando..." : "Trocar foto"}</p>
              <p className="text-xs text-muted-foreground">Clique na foto para trocar</p>
            </div>
          </div>

          <div><Label>Nome completo</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
          <div><Label>Telefone / WhatsApp</Label><Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>

          <Button onClick={salvar} disabled={saving} className="w-full gap-2">
            <Save className="w-4 h-4" /> {saving ? "Salvando..." : "Salvar alterações"}
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
