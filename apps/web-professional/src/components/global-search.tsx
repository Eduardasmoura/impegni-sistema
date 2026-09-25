"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  Search, LayoutDashboard, CalendarDays, ListOrdered, CalendarOff, Users, UserSearch, Scissors, Package, Wallet, BarChart3,
  ClipboardList, Star, Tag, Megaphone, UserCog, Store, Settings, User, Bell, MessageCircle, ShieldCheck, CreditCard, Receipt,
  HelpCircle, HandCoins, Link2, MessageSquarePlus, Inbox, BookOpen, CornerDownLeft, type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { allowedEntries, searchCatalog, type SearchEntry, type SearchPermissions } from "@/lib/global-search";
import { searchArticles } from "@/lib/help";

const ICONES: Record<string, LucideIcon> = {
  home: LayoutDashboard, agenda: CalendarDays, espera: ListOrdered, bloqueio: CalendarOff, clientes: Users, segmentos: UserSearch,
  servicos: Scissors, estoque: Package, financeiro: Wallet, relatorios: BarChart3, anamnese: ClipboardList, avaliacoes: Star,
  cupons: Tag, marketing: Megaphone, equipe: UserCog, estabelecimento: Store, configuracoes: Settings, conta: User,
  notificacoes: Bell, lembretes: MessageCircle, seguranca: ShieldCheck, plano: CreditCard, pagamentos: Receipt, ajuda: HelpCircle,
  caucao: HandCoins, link: Link2, suporte: MessageSquarePlus, solicitacoes: Inbox, artigo: BookOpen,
};

const OPEN_EVENT = "impegni:open-search";
const SUGESTOES = ["agenda", "clientes", "financeiro", "estabelecimento", "relatorios", "ajuda"];

/** Abre a busca global de qualquer lugar (ex.: campo do cabeçalho da Home). */
export function openGlobalSearch() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

function useIsMac() {
  const [mac, setMac] = useState(true);
  useEffect(() => setMac(/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)), []);
  return mac;
}

type Item = { key: string; title: string; description: string; href: string; icon: string; group: string };

export function GlobalSearch({ permissions }: { permissions: SearchPermissions }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [ativo, setAtivo] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const entries = useMemo(() => allowedEntries(permissions), [permissions]);

  // ⌘K (Mac) / Ctrl K (Windows/Linux) em qualquer tela do painel.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_EVENT, onOpen);
    };
  }, []);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const grupos = useMemo(() => {
    const q = query.trim();
    const toItem = (e: SearchEntry): Item => ({ key: e.id, title: e.title, description: e.description, href: e.href, icon: e.icon, group: e.group });
    if (!q) {
      const sug = SUGESTOES.map((id) => entries.find((e) => e.id === id)).filter(Boolean) as SearchEntry[];
      return [{ label: "Acesso rápido", itens: sug.map(toItem) }];
    }
    const achados = searchCatalog(q, entries);
    const paginas = achados.filter((e) => e.group === "Páginas").slice(0, 6).map(toItem);
    const recursos = achados.filter((e) => e.group === "Recursos").slice(0, 5).map(toItem);
    const artigos = searchArticles(q).slice(0, 4).map((a): Item => ({ key: `art-${a.slug}`, title: a.title, description: a.description, href: `/suporte/artigo/${a.slug}`, icon: "artigo", group: "Central de Ajuda" }));
    return [
      { label: "Páginas", itens: paginas },
      { label: "Recursos", itens: recursos },
      { label: "Central de Ajuda", itens: artigos },
    ].filter((g) => g.itens.length > 0);
  }, [query, entries]);

  const planos = useMemo(() => grupos.flatMap((g) => g.itens), [grupos]);
  useEffect(() => setAtivo(0), [query]);
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${ativo}"]`)?.scrollIntoView({ block: "nearest" });
  }, [ativo]);

  const ir = useCallback(
    (item: Item | undefined) => {
      if (!item) return;
      setOpen(false);
      router.push(item.href);
    },
    [router]
  );

  function onInputKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setAtivo((i) => Math.min(i + 1, planos.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setAtivo((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); ir(planos[ativo]); }
  }

  let idx = -1;
  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[1px]" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-[8vh] sm:top-[12vh] z-50 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 rounded-xl border border-border bg-card shadow-2xl overflow-hidden"
        >
          <DialogPrimitive.Title className="sr-only">Buscar no Impegni</DialogPrimitive.Title>
          <div className="flex items-center gap-3 border-b border-border px-4">
            <Search className="w-5 h-5 text-muted-foreground shrink-0" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onInputKey}
              placeholder="Buscar no Impegni..."
              aria-label="Buscar no Impegni"
              role="combobox"
              aria-expanded
              aria-controls="global-search-list"
              aria-activedescendant={planos[ativo] ? `gs-${planos[ativo].key}` : undefined}
              className="h-14 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
            />
            <kbd className="hidden sm:inline-flex items-center rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">ESC</kbd>
          </div>

          <div ref={listRef} id="global-search-list" role="listbox" className="max-h-[60vh] overflow-y-auto p-2">
            {planos.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <p className="text-sm font-medium">Não encontramos nada para sua busca.</p>
                <button onClick={() => ir({ key: "ajuda", title: "", description: "", href: "/suporte", icon: "ajuda", group: "" })} className="mt-2 text-sm text-primary hover:underline">
                  Procurar na Central de Ajuda
                </button>
              </div>
            ) : (
              grupos.map((g) => (
                <div key={g.label} className="mb-1 last:mb-0">
                  <p className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{g.label}</p>
                  {g.itens.map((item) => {
                    idx += 1;
                    const i = idx;
                    const Icon = ICONES[item.icon] ?? Search;
                    const sel = i === ativo;
                    return (
                      <button
                        key={item.key}
                        id={`gs-${item.key}`}
                        data-index={i}
                        role="option"
                        aria-selected={sel}
                        onMouseMove={() => setAtivo(i)}
                        onClick={() => ir(item)}
                        className={cn("w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors", sel ? "bg-primary/10" : "hover:bg-muted")}
                      >
                        <span className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", sel ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground")}>
                          <Icon className="w-4 h-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className={cn("block text-sm font-medium truncate", sel && "text-[hsl(var(--primary-emphasis))]")}>{item.title}</span>
                          <span className="block text-xs text-muted-foreground truncate">{item.description}</span>
                        </span>
                        {sel && <CornerDownLeft className="w-3.5 h-3.5 text-muted-foreground shrink-0 hidden sm:block" />}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
          <div className="hidden sm:flex items-center gap-4 border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
            <span><kbd className="font-sans">↑</kbd> <kbd className="font-sans">↓</kbd> navegar</span>
            <span><kbd className="font-sans">↵</kbd> abrir</span>
            <span><kbd className="font-sans">esc</kbd> fechar</span>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/** Campo discreto que abre a busca (cabeçalho da Home, desktop/tablet). */
export function GlobalSearchField({ className }: { className?: string }) {
  const mac = useIsMac();
  return (
    <button
      type="button"
      onClick={openGlobalSearch}
      aria-label="Buscar no Impegni"
      className={cn("h-9 items-center gap-2 rounded-lg border border-input bg-card px-3 text-sm text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors", className)}
    >
      <Search className="w-4 h-4 shrink-0" />
      <span className="flex-1 text-left truncate">Buscar no Impegni...</span>
      <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium">{mac ? "⌘ K" : "Ctrl K"}</kbd>
    </button>
  );
}

/** Só o ícone (menu lateral e cabeçalho do celular). */
export function GlobalSearchIconButton({ className }: { className?: string }) {
  const mac = useIsMac();
  return (
    <button
      type="button"
      onClick={openGlobalSearch}
      aria-label="Buscar no Impegni"
      title={`Buscar (${mac ? "⌘K" : "Ctrl K"})`}
      className={cn("p-1.5 rounded-lg hover:bg-muted text-muted-foreground", className)}
    >
      <Search className="w-5 h-5 lg:w-4 lg:h-4" />
    </button>
  );
}
