import type { MetadataRoute } from "next";

// Este app mistura páginas públicas (diretório, `/{slug}` e
// `/{slug}/agendar` — a página de agendamento de cada empresa, que
// convém aparecer em busca) com páginas de conta (login/cadastro,
// "Meus agendamentos", perfil, favoritos, anamnese) que nunca deveriam
// ser indexadas. Só as de conta entram no disallow.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/login", "/register", "/forgot-password", "/reset-password", "/meus-agendamentos", "/perfil", "/favoritos", "/anamnese"],
    },
  };
}
