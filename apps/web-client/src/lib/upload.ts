import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Sobe uma foto de perfil para o bucket público `avatars`, sempre sob
 * `{userId}/...` — é esse prefixo que as policies de Storage (migration
 * 008_storage_avatars_bucket) usam para conferir que só o dono escreve ali.
 */
export async function uploadAvatar(supabase: SupabaseClient<Database>, userId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop();
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return data.publicUrl;
}
