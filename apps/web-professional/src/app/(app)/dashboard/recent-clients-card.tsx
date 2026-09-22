import Link from "next/link";
import { ArrowRight, Phone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import type { Tables } from "@/lib/supabase/database.types";

export function RecentClientsCard({ clientes }: { clientes: Tables<"clients">[] }) {
  return (
    <Card className="min-w-0">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Clientes recentes</CardTitle>
        <Link href="/clientes" className="text-xs text-primary font-medium flex items-center gap-1 hover:underline">
          Ver todos <ArrowRight className="w-3 h-3" />
        </Link>
      </CardHeader>
      <CardContent>
        {clientes.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Nenhum cliente cadastrado ainda.</p>
        ) : (
          <div className="space-y-2">
            {clientes.map((c) => (
              <Link key={c.id} href={`/clientes/${c.id}`} className="flex items-center gap-3 p-1.5 -mx-1.5 rounded-lg hover:bg-muted/50">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium shrink-0">{c.name[0]?.toUpperCase()}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{c.name}</p>
                  {c.phone && <p className="text-xs text-muted-foreground flex items-center gap-1 truncate"><Phone className="w-3 h-3 shrink-0" /> <span className="truncate">{c.phone}</span></p>}
                </div>
                <p className="text-xs text-muted-foreground shrink-0">{formatDate(c.created_at)}</p>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
