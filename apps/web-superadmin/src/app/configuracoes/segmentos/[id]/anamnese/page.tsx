import { notFound } from "next/navigation";
import { requireSuperAdmin } from "@/lib/require-super-admin";
import { AdminShell } from "@/components/admin-nav";
import { AnamneseTemplateView } from "./anamnese-template-view";

// Ficha-modelo de anamnese do segmento — catálogo administrado só pelo
// Super Admin (`anamnesis_templates`/`anamnesis_template_fields`, RLS
// admin-only). Empresas recebem uma CÓPIA disso quando um profissional
// delas ganha este segmento (`set_professional_segments`); editar aqui
// nunca altera cópias já entregues — só entra em vigor pra quem sincronizar
// depois.
export default async function AnamneseTemplatePage({ params }: { params: { id: string } }) {
  const { user, supabase } = await requireSuperAdmin();

  const [{ data: segment }, { data: currentTemplate }, { data: versions }] = await Promise.all([
    supabase.from("segments").select("id, name").eq("id", params.id).single(),
    supabase.from("anamnesis_templates").select("*").eq("segment_id", params.id).eq("is_current", true).maybeSingle(),
    supabase.from("anamnesis_templates").select("id, version, created_at").eq("segment_id", params.id).order("version", { ascending: false }),
  ]);

  if (!segment) notFound();

  const { data: fields } = currentTemplate
    ? await supabase.from("anamnesis_template_fields").select("*").eq("template_id", currentTemplate.id).order("sort_order")
    : { data: [] };

  return (
    <AdminShell userEmail={user.email}>
      <AnamneseTemplateView
        segment={segment}
        currentTemplate={currentTemplate ?? null}
        initialFields={fields ?? []}
        versions={versions ?? []}
      />
    </AdminShell>
  );
}
