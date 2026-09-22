"use client";

import Link from "next/link";
import { Store, User, Bell, ShieldCheck, ChevronRight, ClipboardList } from "lucide-react";
import { Card } from "@/components/ui/card";

// Hub leve — cada item leva pra uma página que já existe (nenhum conteúdo é
// duplicado aqui, só a navegação central que o pedido descreve).
const GRUPOS = [
  { href: "/configuracao", label: "Negócio", desc: "Identidade visual, capa, cores, horários, link público", icon: Store },
  { href: "/anamnese", label: "Anamnese", desc: "Perguntas da ficha preenchida com o cliente", icon: ClipboardList },
  { href: "/perfil", label: "Conta", desc: "Nome, foto, telefone, e-mail e senha", icon: User },
  { href: "/notificacoes", label: "Notificações", desc: "Lembretes automáticos por WhatsApp", icon: Bell },
  { href: "/seguranca", label: "Segurança", desc: "Trocar senha e sair da conta", icon: ShieldCheck },
];

export function ConfiguracoesView() {
  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto">
      <h1 className="font-heading text-3xl font-semibold mb-1">Configurações</h1>
      <p className="text-sm text-muted-foreground mb-6">Escolha o que você quer ajustar.</p>

      <div className="space-y-2">
        {GRUPOS.map((g) => (
          <Link key={g.href} href={g.href}>
            <Card className="hover:border-primary/40 transition-colors">
              <div className="flex items-center gap-3 p-4">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <g.icon className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{g.label}</p>
                  <p className="text-xs text-muted-foreground truncate">{g.desc}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
