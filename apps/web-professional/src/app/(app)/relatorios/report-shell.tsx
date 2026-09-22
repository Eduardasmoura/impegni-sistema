"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Download, Share2, SlidersHorizontal, FileSpreadsheet, FileText, Mail, MessageCircle, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { exportReportToPdf, exportReportToXlsx, buildReportPdfFile, type ExportColumn, type ExportRow } from "./export";
import { buildWhatsappLink, canUseNativeFileShare, shareFileNatively, EMAIL_SHARE_UNAVAILABLE_REASON } from "./share";
import type { ReportContent } from "./report-content";

const PAGE_SIZE = 10;

export function ReportShell({
  reportKey,
  title,
  description,
  companyName,
  periodoLabel,
  filtrosResumo,
  onVoltar,
  content,
  isLoading,
}: {
  reportKey: string;
  title: string;
  description: string;
  companyName: string;
  periodoLabel: string;
  filtrosResumo: string[];
  onVoltar: () => void;
  content: ReportContent | null;
  isLoading: boolean;
}) {
  const [mostrarGrafico, setMostrarGrafico] = useState(true);
  const [pagina, setPagina] = useState(1);
  const [shareOpen, setShareOpen] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => setPagina(1), [reportKey]);

  const rows = content?.rows ?? [];
  const columns = content?.columns ?? [];
  const rowsPagina = rows.slice((pagina - 1) * PAGE_SIZE, pagina * PAGE_SIZE);

  async function handleExportPdf() {
    await exportReportToPdf(
      { reportTitle: title, reportDescription: description, companyName, periodoLabel, filtrosResumo, geradoEm: new Date() },
      columns, rows, mostrarGrafico ? chartRef.current : null
    );
    toast({ title: "PDF gerado", description: "O download deve começar automaticamente." });
  }
  function handleExportXlsx() {
    exportReportToXlsx({ reportTitle: title, reportDescription: description, companyName, periodoLabel, filtrosResumo, geradoEm: new Date() }, columns, rows);
    toast({ title: "Excel gerado", description: "O download deve começar automaticamente." });
  }

  return (
    <div className="space-y-4">
      <div>
        <button onClick={onVoltar} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 mb-3">
          <ArrowLeft className="w-3.5 h-3.5" /> Voltar
        </button>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-heading text-xl font-bold">{title}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {content?.chart && (
              <Button variant="outline" size="sm" onClick={() => setMostrarGrafico((v) => !v)} className="gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5" /> {mostrarGrafico ? "Ocultar gráfico" : "Mostrar gráfico"}
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5" disabled={!content || rows.length === 0}><Download className="w-3.5 h-3.5" /> Exportar</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportPdf}><FileText className="w-3.5 h-3.5 mr-2" /> PDF</DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportXlsx}><FileSpreadsheet className="w-3.5 h-3.5 mr-2" /> Excel (.xlsx)</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" size="sm" className="gap-1.5" disabled={!content || rows.length === 0} onClick={() => setShareOpen(true)}>
              <Share2 className="w-3.5 h-3.5" /> Compartilhar
            </Button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <ReportSkeleton />
      ) : !content ? (
        <Card className="border-dashed"><CardContent className="p-6 text-sm text-muted-foreground">Não foi possível calcular este relatório.</CardContent></Card>
      ) : content.emptyMessage && rows.length === 0 && !content.chart ? (
        <Card className="border-dashed"><CardContent className="p-8 text-center text-sm text-muted-foreground">{content.emptyMessage}</CardContent></Card>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {content.kpis.map((k) => (
              <Card key={k.label} className="min-w-0">
                <CardContent className="p-4 min-w-0">
                  <span className="text-xs text-muted-foreground truncate block">{k.label}</span>
                  <p className="font-heading text-xl font-bold mt-1 tabular-nums truncate">{k.value}</p>
                  {k.hint && <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{k.hint}</p>}
                </CardContent>
              </Card>
            ))}
          </div>

          {content.chart && mostrarGrafico && (
            <Card><CardContent className="p-4" ref={chartRef}>{content.chart}</CardContent></Card>
          )}

          <Card>
            <CardContent className="p-0">
              {rows.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">{content.emptyMessage ?? "Sem dados no período selecionado."}</div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>{columns.map((c) => <TableHead key={c.key} className={c.align === "right" ? "text-right" : ""}>{c.label}</TableHead>)}</TableRow>
                    </TableHeader>
                    <TableBody>
                      {rowsPagina.map((r, i) => (
                        <TableRow key={i}>{columns.map((c) => <TableCell key={c.key} className={c.align === "right" ? "text-right tabular-nums" : ""}>{r[c.key]}</TableCell>)}</TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="p-3 border-t border-border">
                    <PaginationBar page={pagina} total={rows.length} pageSize={PAGE_SIZE} onPageChange={setPagina} itemLabel="registro" />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {content && (
        <ShareDialog
          open={shareOpen} onOpenChange={setShareOpen} title={title} description={description}
          companyName={companyName} periodoLabel={periodoLabel} filtrosResumo={filtrosResumo}
          columns={columns} rows={rows}
        />
      )}
    </div>
  );
}

function ReportSkeleton() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 3 }).map((_, i) => <Card key={i}><CardContent className="p-4"><Skeleton className="h-3 w-20 mb-3" /><Skeleton className="h-7 w-24" /></CardContent></Card>)}
      </div>
      <Card><CardContent className="p-4"><Skeleton className="h-48 w-full" /></CardContent></Card>
    </div>
  );
}

function ShareDialog({
  open, onOpenChange, title, description, companyName, periodoLabel, filtrosResumo, columns, rows,
}: {
  open: boolean; onOpenChange: (v: boolean) => void; title: string; description: string; companyName: string;
  periodoLabel: string; filtrosResumo: string[]; columns: ExportColumn[]; rows: ExportRow[];
}) {
  const { toast } = useToast();
  const [destinatario, setDestinatario] = useState("");
  const [assunto, setAssunto] = useState(`Relatório: ${title}`);
  const [mensagem, setMensagem] = useState(`Segue o relatório "${title}" (${periodoLabel}), gerado pelo Impegni.`);

  async function handleWhatsapp() {
    // Gera o PDF de verdade e tenta anexar via compartilhamento nativo do
    // dispositivo (Web Share API); sem suporte a arquivo, baixa o PDF e
    // abre o wa.me com uma mensagem pronta — o usuário anexa o arquivo já
    // baixado. Nunca finge um envio automático que não existe.
    const ctx = { reportTitle: title, reportDescription: description, companyName, periodoLabel, filtrosResumo, geradoEm: new Date() };
    const pdfFile = await buildReportPdfFile(ctx, columns, rows, null);
    const texto = `${mensagem}\n\n(Relatório em PDF anexado)`;
    if (canUseNativeFileShare(pdfFile)) {
      const ok = await shareFileNatively(pdfFile, title, texto);
      if (ok) return;
    }
    // Sem suporte nativo a arquivo: baixa o PDF e abre o WhatsApp com o texto pronto.
    const url = URL.createObjectURL(pdfFile);
    const a = document.createElement("a");
    a.href = url; a.download = pdfFile.name;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    window.open(buildWhatsappLink(`${mensagem}\n\n(Baixamos o PDF agora — anexe-o aqui no WhatsApp.)`), "_blank");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Compartilhar relatório</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <button onClick={handleWhatsapp} className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors text-left">
            <MessageCircle className="w-5 h-5 text-chart-2 shrink-0" />
            <div>
              <p className="text-sm font-medium">WhatsApp</p>
              <p className="text-xs text-muted-foreground">Baixa o PDF e abre o compartilhamento do seu dispositivo.</p>
            </div>
          </button>

          <div className="p-3 rounded-lg border space-y-3">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">E-mail</span>
            </div>
            <div className="flex items-start gap-1.5 text-xs text-amber-700 bg-amber-50 rounded-md p-2">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {EMAIL_SHARE_UNAVAILABLE_REASON}
            </div>
            <div>
              <Label htmlFor="share-to" className="text-xs">Destinatário</Label>
              <Input id="share-to" type="email" placeholder="nome@email.com" value={destinatario} onChange={(e) => setDestinatario(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="share-subject" className="text-xs">Assunto</Label>
              <Input id="share-subject" value={assunto} onChange={(e) => setAssunto(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="share-message" className="text-xs">Mensagem</Label>
              <Textarea id="share-message" rows={3} value={mensagem} onChange={(e) => setMensagem(e.target.value)} />
            </div>
            <Button
              className="w-full" variant="outline" disabled
              onClick={() => toast({ title: "Envio indisponível", description: EMAIL_SHARE_UNAVAILABLE_REASON })}
            >
              Enviar por e-mail (indisponível)
            </Button>
          </div>
        </div>
        <DialogFooter><Button variant="ghost" onClick={() => onOpenChange(false)}>Fechar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
