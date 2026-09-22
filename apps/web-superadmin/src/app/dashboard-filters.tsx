"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarRange } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function DashboardFilters({ de, ate }: { de: string; ate: string }) {
  const router = useRouter();
  const [rangeDe, setRangeDe] = useState(de);
  const [rangeAte, setRangeAte] = useState(ate);

  function aplicar() {
    router.push(`/?de=${rangeDe}&ate=${rangeAte}`);
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <CalendarRange className="w-4 h-4 text-muted-foreground hidden sm:block" />
      <Input type="date" value={rangeDe} max={rangeAte} onChange={(e) => setRangeDe(e.target.value)} className="w-auto" />
      <span className="text-sm text-muted-foreground">até</span>
      <Input type="date" value={rangeAte} min={rangeDe} onChange={(e) => setRangeAte(e.target.value)} className="w-auto" />
      <Button size="sm" onClick={aplicar}>Aplicar</Button>
    </div>
  );
}
