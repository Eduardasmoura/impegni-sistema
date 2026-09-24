import { AvisosView } from "./avisos-view";

export const metadata = { title: "Notificações — Impegni" };

// Login e empresa já são garantidos pelo layout do painel ((app)/layout.tsx).
export default function AvisosPage() {
  return <AvisosView />;
}
