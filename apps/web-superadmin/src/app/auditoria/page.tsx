import { requireSuperAdmin } from "@/lib/require-super-admin";
import { AdminShell } from "@/components/admin-nav";
import { AuditoriaView, type AuditLogRow } from "./auditoria-view";

const PAGE_SIZE = 30;

// Só leitura — não existe delete/update exposto pra audit_logs em nenhum
// lugar do app (nem RLS nem RPC permitem; ver migration 038/comentário na
// tabela). Isso é proposital: log de auditoria não deve ser "arrumável"
// pelo próprio Super Admin.
export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams: { q?: string; acao?: string; empresa?: string; pagina?: string };
}) {
  const { user, supabase } = await requireSuperAdmin();

  const q = typeof searchParams.q === "string" ? searchParams.q.trim() : "";
  const acao = typeof searchParams.acao === "string" ? searchParams.acao : "";
  const empresa = typeof searchParams.empresa === "string" ? searchParams.empresa.trim() : "";
  const page = Math.max(1, Number(searchParams.pagina) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let companyIdsForSearch: string[] | null = null;
  if (empresa) {
    const safe = empresa.replace(/[%,]/g, "");
    const { data: matches } = await supabase.from("companies").select("id").ilike("name", `%${safe}%`);
    companyIdsForSearch = (matches ?? []).map((c) => c.id);
    if (companyIdsForSearch.length === 0) companyIdsForSearch = ["00000000-0000-0000-0000-000000000000"];
  }

  let query = supabase
    .from("audit_logs")
    .select("*, companies(id, name)", { count: "exact" })
    .order("created_at", { ascending: false });

  if (q) query = query.ilike("action", `%${q.replace(/[%,]/g, "")}%`);
  if (acao) query = query.eq("action", acao);
  if (companyIdsForSearch) query = query.in("company_id", companyIdsForSearch);

  const [{ data: logs, count, error }, { data: actions }] = await Promise.all([
    query.range(from, to),
    supabase.from("audit_logs").select("action").limit(500),
  ]);

  const distinctActions = Array.from(new Set((actions ?? []).map((a) => a.action))).sort();

  // Resolve nome/e-mail de quem agiu (actor_id) numa segunda consulta —
  // profiles não tem FK direta configurada como relationship do PostgREST
  // pra audit_logs, então junta em memória.
  const actorIds = Array.from(new Set((logs ?? []).map((l) => l.actor_id).filter((id): id is string => !!id)));
  const { data: actorProfiles } = actorIds.length > 0 ? await supabase.from("profiles").select("id, full_name").in("id", actorIds) : { data: [] };
  const actorNameById = new Map((actorProfiles ?? []).map((p) => [p.id, p.full_name]));

  const rows: AuditLogRow[] = (logs ?? []).map((l) => ({ ...l, actor_name: (l.actor_id && actorNameById.get(l.actor_id)) || null }));

  return (
    <AdminShell userEmail={user.email}>
      <AuditoriaView
        logs={rows}
        total={count ?? 0}
        page={page}
        pageSize={PAGE_SIZE}
        actions={distinctActions}
        filters={{ q, acao, empresa }}
        loadError={error?.message}
      />
    </AdminShell>
  );
}
