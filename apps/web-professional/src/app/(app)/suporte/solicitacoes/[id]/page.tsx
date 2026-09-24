import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, Mail, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/company";
import { formatDate, formatTime } from "@/lib/format";
import { supportCategoryLabel, supportProtocol, supportStatus } from "@/lib/support";
import { StatusBadge } from "../solicitacoes-view";

export const metadata = { title: "Solicitação — Impegni" };

export default async function SolicitacaoDetalhePage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const current = await getCurrentCompany();
  if (!current) redirect("/onboarding");

  // RLS: só retorna o chamado se ele for de uma empresa da qual o usuário é
  // membro; o filtro por company_id garante que é a empresa aberta agora.
  const { data: t } = await supabase
    .from("support_tickets")
    .select("id, subject, category, status, description, created_at, updated_at, closed_at")
    .eq("id", params.id)
    .eq("company_id", current.company.id)
    .maybeSingle();
  if (!t) notFound();

  const st = supportStatus(t.status);
  const quando = (iso: string) => `${formatDate(iso)} às ${formatTime(iso)}`;

  return (
    <div className="max-w-3xl">
      <Link href="/suporte/solicitacoes" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ChevronLeft className="w-4 h-4" /> Minhas solicitações</Link>
      <div className="mt-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-mono text-muted-foreground">Protocolo #{supportProtocol(t.id)}</p>
          <h1 className="font-heading text-2xl font-semibold mt-1 break-words">{t.subject}</h1>
        </div>
        <StatusBadge status={t.status} />
      </div>

      <Card className="mt-6">
        <CardContent className="p-5 sm:p-6">
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div><dt className="text-xs text-muted-foreground">Categoria</dt><dd className="font-medium mt-0.5">{supportCategoryLabel(t.category)}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Aberta em</dt><dd className="font-medium mt-0.5">{quando(t.created_at)}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Última atualização</dt><dd className="font-medium mt-0.5">{quando(t.updated_at)}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Status</dt><dd className="font-medium mt-0.5">{st.label}</dd></div>
          </dl>
          <div className="border-t border-border mt-5 pt-5">
            <p className="text-xs text-muted-foreground mb-2">Sua mensagem</p>
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{t.description || "—"}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardContent className="p-5 sm:p-6 flex gap-3">
          <Mail className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium">Resposta da equipe</p>
            <p className="text-muted-foreground mt-1">
              {t.status === "closed"
                ? "Este chamado foi encerrado. Se precisar, abra uma nova solicitação."
                : st.label === "Respondido"
                  ? "Nossa equipe já respondeu pelo e-mail cadastrado na sua conta. Confira sua caixa de entrada (e o spam)."
                  : "Nossa equipe está analisando. A resposta chega pelo e-mail cadastrado na sua conta."}
            </p>
            {st.label === "Em análise" && (
              <p className="inline-flex items-center gap-1.5 text-xs font-medium mt-3 rounded-md bg-muted px-2.5 py-1"><Clock className="w-3.5 h-3.5" /> SLA de resposta: até 24 horas.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
