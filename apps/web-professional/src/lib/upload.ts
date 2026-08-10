import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Sobe um arquivo para o bucket público `company-assets`, sempre sob
 * `{companyId}/...` — é esse prefixo que as policies de Storage (migration
 * 007_storage_company_assets_bucket) usam para conferir que quem escreve é
 * membro daquela empresa. Retorna a URL pública já pronta para usar em <img>.
 */
export async function uploadCompanyAsset(
  supabase: SupabaseClient<Database>,
  companyId: string,
  folder: string,
  file: File
): Promise<string> {
  const ext = file.name.split(".").pop();
  const path = `${companyId}/${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("company-assets").upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from("company-assets").getPublicUrl(path);
  return data.publicUrl;
}
