/**
 * Compartilhamento — SEM infraestrutura de e-mail (nenhum Resend/SMTP
 * configurado no projeto, confirmado antes de construir isso) e SEM
 * WhatsApp Business API. O que É real:
 *
 *  - WhatsApp: usa o mecanismo nativo do dispositivo — Web Share API
 *    (`navigator.share`, anexa o arquivo de verdade quando o navegador
 *    suporta compartilhar arquivos) com fallback pro link `wa.me` (abre o
 *    WhatsApp Web/app com uma mensagem pronta; o usuário anexa o arquivo
 *    manualmente, já baixado). Isso é a "opção disponível no dispositivo"
 *    que a especificação pediu — não é uma integração automática.
 *  - E-mail: a tela de composição existe (destinatário/assunto/mensagem),
 *    mas o botão de enviar fica bloqueado com uma explicação exata do que
 *    falta (configurar um provedor de e-mail no backend) — nunca finge um
 *    envio que não aconteceu.
 */

export function canUseNativeFileShare(file: File): boolean {
  return typeof navigator !== "undefined" && "share" in navigator && "canShare" in navigator && navigator.canShare?.({ files: [file] }) === true;
}

export async function shareFileNatively(file: File, title: string, text: string): Promise<boolean> {
  if (!canUseNativeFileShare(file)) return false;
  try {
    await navigator.share({ files: [file], title, text });
    return true;
  } catch {
    return false; // usuário cancelou ou o SO recusou — não é erro de sistema
  }
}

export function buildWhatsappLink(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export const EMAIL_SHARE_UNAVAILABLE_REASON =
  "Envio por e-mail exige um provedor configurado no backend (Resend ou SMTP) — ainda não há nenhum configurado neste projeto. A composição abaixo já está pronta; falta só ativar o provedor pra o botão enviar de verdade.";
