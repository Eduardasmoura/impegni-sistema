// FASE 6 (auditoria UX, Section 6) — mensagem de erro amigável pro usuário
// final. Antes disso, ~16 telas jogavam `error.message` (do Supabase/
// PostgREST/Postgres) direto num toast — o texto cru pode vir em inglês,
// citar nome de constraint/tabela, ou expor detalhe de RLS. Esta função
// nunca devolve o texto original pro usuário: reconhece os padrões mais
// comuns (violação de unique/check/foreign key, RLS negado, sessão
// expirada, rede offline) e traduz pra uma frase clara; qualquer coisa não
// reconhecida cai num fallback genérico específico do contexto da ação
// (nunca "Error 500" ou stack trace). O erro original sempre vai pro
// console (não pro usuário) — não perde nada pra depuração.

type SupabaseLikeError = { message?: string; code?: string; details?: string | null; hint?: string | null };

// Códigos de erro Postgres (SQLSTATE) mais comuns que este produto atinge
// via RLS/constraints — ver https://www.postgresql.org/docs/current/errcodes-appendix.html
const CODE_LABEL: Record<string, string> = {
  "23505": "Já existe um registro com esse mesmo valor.",
  "23503": "Não é possível concluir — este registro está vinculado a outro.",
  "23502": "Preencha todos os campos obrigatórios.",
  "23514": "Um dos valores informados não é permitido.",
  "42501": "Você não tem permissão pra fazer isso.",
  PGRST301: "Sua sessão expirou. Atualize a página e faça login novamente.",
};

function isErrorLike(value: unknown): value is SupabaseLikeError {
  return typeof value === "object" && value !== null && ("message" in value || "code" in value);
}

/**
 * Traduz um erro do Supabase (ou de qualquer chamada assíncrona) pra uma
 * mensagem que faz sentido pro usuário. `contexto` é um trecho de frase no
 * infinitivo (ex.: "salvar o serviço", "excluir o cliente") usado só no
 * fallback genérico — nunca no caminho reconhecido, que já tem frase própria.
 */
export function friendlyError(error: unknown, contexto: string): string {
  const fallback = `Não foi possível ${contexto}. Verifique os dados e tente novamente.`;

  // eslint-disable-next-line no-console
  console.error(`[${contexto}]`, error);

  if (!isErrorLike(error)) return fallback;

  if (error.code && CODE_LABEL[error.code]) return CODE_LABEL[error.code];

  const msg = (error.message || "").toLowerCase();
  if (!msg) return fallback;

  if (msg.includes("invalid login credentials")) {
    return "Email ou senha inválidos.";
  }
  if (msg.includes("user already registered") || msg.includes("email address is already registered")) {
    return "Já existe uma conta com esse email.";
  }
  if (msg.includes("password should be at least")) {
    return "A senha precisa ter pelo menos 6 caracteres.";
  }
  if (msg.includes("failed to fetch") || msg.includes("networkerror") || msg.includes("network request failed")) {
    return "Sem conexão com a internet. Verifique sua rede e tente novamente.";
  }
  if (msg.includes("jwt") || msg.includes("not authenticated") || msg.includes("invalid session")) {
    return "Sua sessão expirou. Atualize a página e faça login novamente.";
  }
  if (msg.includes("row-level security") || msg.includes("permission denied") || msg.includes("not authorized")) {
    return "Você não tem permissão pra fazer isso.";
  }
  if (msg.includes("duplicate key") || msg.includes("already exists")) {
    return "Já existe um registro com esse mesmo valor.";
  }
  if (msg.includes("violates foreign key")) {
    return "Não é possível concluir — este registro está vinculado a outro.";
  }
  if (msg.includes("violates check constraint") || msg.includes("violates not-null constraint")) {
    return "Um dos valores informados não é válido. Confira os campos e tente de novo.";
  }
  if (msg.includes("timeout") || msg.includes("timed out")) {
    return "A operação demorou demais pra responder. Tente novamente.";
  }

  return fallback;
}
