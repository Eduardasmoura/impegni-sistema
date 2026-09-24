import { Suspense } from "react";
import { CentralView } from "./_components/central-view";

export const metadata = { title: "Central de Ajuda — Impegni" };

export default function CentralDeAjudaPage() {
  return (
    <Suspense>
      <CentralView />
    </Suspense>
  );
}
