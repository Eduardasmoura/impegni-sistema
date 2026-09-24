import type { Tables } from "@/lib/supabase/database.types";

// Colunas de `companies` que a página pública lê. O visitante anônimo só tem
// permissão de SELECT nestas colunas (migration 20260924000000) — CPF/CNPJ,
// e-mail, telefone interno e ID de cobrança não saem pela API pública.
// Manter em sincronia com o GRANT da migration ao incluir campos novos.
export const PUBLIC_COMPANY_COLUMNS =
  "id, name, trade_name, slug, segment_id, status, logo_url, cover_url, color_primary, color_secondary, color_accent, business_hours, address, street, address_number, complement, neighborhood, city, state, zip_code, whatsapp, instagram, timezone, anamnesis_enabled, loyalty_program_enabled, created_at";

export type PublicCompany = Pick<
  Tables<"companies">,
  | "id" | "name" | "trade_name" | "slug" | "segment_id" | "status" | "logo_url" | "cover_url"
  | "color_primary" | "color_secondary" | "color_accent" | "business_hours" | "address" | "street"
  | "address_number" | "complement" | "neighborhood" | "city" | "state" | "zip_code" | "whatsapp"
  | "instagram" | "timezone" | "anamnesis_enabled" | "loyalty_program_enabled" | "created_at"
>;
