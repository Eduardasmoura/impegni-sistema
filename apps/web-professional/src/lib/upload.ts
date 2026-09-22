import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.82;

/**
 * Reduz fotos grandes (comum em upload direto da câmera do celular, muitas
 * vezes 3-8MB) antes de subir — essas imagens vão direto pra página pública
 * da empresa e pros cards de serviço, sem passar por otimização do Next
 * (são `<img>` puro, servidas do Storage). Se a imagem já for pequena, ou
 * se a compressão falhar por qualquer motivo, sobe o arquivo original —
 * nunca bloqueia o upload por causa disso.
 */
async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml" || file.type === "image/gif") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    if (scale >= 1) {
      bitmap.close();
      return file;
    }
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" });
  } catch {
    return file;
  }
}

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
  const uploadFile = await compressImage(file);
  const ext = uploadFile.name.split(".").pop();
  const path = `${companyId}/${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("company-assets").upload(path, uploadFile, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from("company-assets").getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Sobe uma foto de perfil para o bucket público `avatars`, sempre sob
 * `{userId}/...` — mesmo bucket/policies (migration 008_storage_avatars_bucket)
 * já usados pelo app do cliente (`apps/web-client/src/lib/upload.ts`), só
 * que aqui também comprime a imagem antes (mesmo helper de `uploadCompanyAsset`).
 */
export async function uploadAvatar(supabase: SupabaseClient<Database>, userId: string, file: File): Promise<string> {
  const uploadFile = await compressImage(file);
  const ext = uploadFile.name.split(".").pop();
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("avatars").upload(path, uploadFile, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return data.publicUrl;
}
