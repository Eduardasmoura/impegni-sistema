import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import html2canvas from "html2canvas";

export type ExportColumn = { key: string; label: string; align?: "left" | "right" };
export type ExportRow = Record<string, string | number>;

export type ExportContext = {
  reportTitle: string;
  reportDescription?: string;
  companyName: string;
  periodoLabel: string;
  filtrosResumo: string[]; // ex.: ["Profissional: João", "Serviço: Corte"] — vazio = "Nenhum filtro adicional"
  geradoEm: Date;
};

/**
 * PDF real (jsPDF + autoTable) com os dados JÁ FILTRADOS do relatório —
 * nunca um arquivo fake. Se `chartElement` for passado, captura o gráfico
 * renderizado na tela (html2canvas) e embute como imagem antes da tabela —
 * "o gráfico real", não um desenho genérico.
 *
 * `buildReportPdfFile` monta o MESMO PDF e devolve como `File` (em vez de
 * baixar direto) — usado pelo compartilhamento (WhatsApp/nativo), que
 * precisa do arquivo em mãos pra anexar, não só disparar um download.
 * `exportReportToPdf` é essa mesma função + o `.save()` do navegador.
 */
export async function buildReportPdfFile(ctx: ExportContext, columns: ExportColumn[], rows: ExportRow[], chartElement?: HTMLElement | null): Promise<File> {
  const doc = new jsPDF({ orientation: columns.length > 6 ? "landscape" : "portrait", unit: "pt" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;
  let y = margin;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(194, 92, 24); // tom âmbar próximo do --primary da marca
  doc.text("Impegni", margin, y);
  y += 20;

  doc.setTextColor(20, 20, 20);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(ctx.companyName, margin, y);
  y += 22;

  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.text(ctx.reportTitle, margin, y);
  y += 18;

  if (ctx.reportDescription) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(90, 90, 90);
    doc.text(ctx.reportDescription, margin, y, { maxWidth: pageWidth - margin * 2 });
    y += 16;
  }

  doc.setFontSize(9);
  doc.setTextColor(110, 110, 110);
  doc.text(`Período: ${ctx.periodoLabel}`, margin, y);
  y += 13;
  doc.text(`Filtros: ${ctx.filtrosResumo.length ? ctx.filtrosResumo.join(" · ") : "Nenhum filtro adicional"}`, margin, y);
  y += 13;
  doc.text(`Gerado em: ${ctx.geradoEm.toLocaleString("pt-BR")}`, margin, y);
  y += 16;

  doc.setDrawColor(220, 220, 220);
  doc.line(margin, y, pageWidth - margin, y);
  y += 14;

  if (chartElement) {
    try {
      const canvas = await html2canvas(chartElement, { scale: 2, backgroundColor: "#ffffff" });
      const imgData = canvas.toDataURL("image/png");
      const imgWidth = pageWidth - margin * 2;
      const imgHeight = (canvas.height / canvas.width) * imgWidth;
      doc.addImage(imgData, "PNG", margin, y, imgWidth, imgHeight);
      y += imgHeight + 16;
    } catch {
      // Captura de gráfico é um "extra" — se falhar (ex.: canvas
      // bloqueado), o PDF ainda sai correto só sem a imagem, não quebra a
      // exportação inteira por causa disso.
    }
  }

  autoTable(doc, {
    startY: y,
    head: [columns.map((c) => c.label)],
    body: rows.map((r) => columns.map((c) => String(r[c.key] ?? ""))),
    styles: { fontSize: 8.5, cellPadding: 4 },
    headStyles: { fillColor: [194, 92, 24], textColor: 255 },
    margin: { left: margin, right: margin },
    didDrawPage: () => {
      const h = doc.internal.pageSize.getHeight();
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text("Relatório gerado pelo Impegni", margin, h - 20);
    },
  });

  const blob = doc.output("blob") as Blob;
  return new File([blob], `${slugifyFilename(ctx.reportTitle)}.pdf`, { type: "application/pdf" });
}

export async function exportReportToPdf(ctx: ExportContext, columns: ExportColumn[], rows: ExportRow[], chartElement?: HTMLElement | null): Promise<void> {
  const file = await buildReportPdfFile(ctx, columns, rows, chartElement);
  downloadFile(file);
}

function downloadFile(file: File): void {
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url; a.download = file.name;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Excel real (.xlsx via ExcelJS) — não é CSV renomeado: colunas com largura
 * ajustada ao conteúdo e um bloco de contexto (relatório/período/filtros)
 * antes da tabela. Trocado de SheetJS (`xlsx@0.18.5`) pra ExcelJS na
 * preparação de produção — a versão do SheetJS em uso tinha 2
 * vulnerabilidades conhecidas sem correção disponível (prototype pollution
 * e ReDoS). Saída equivalente à anterior de propósito (mesmas linhas,
 * mesma largura de coluna, título mesclado, sem negrito) — o ExcelJS
 * suportaria negrito de verdade no cabeçalho, mas isso ficou de fora aqui
 * pra não mudar o resultado visual do relatório nesta troca.
 */
export async function exportReportToXlsx(ctx: ExportContext, columns: ExportColumn[], rows: ExportRow[]): Promise<void> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Relatório");

  const colCount = Math.max(columns.length, 1);
  ws.addRow(["Impegni"]);
  ws.mergeCells(1, 1, 1, colCount);
  ws.addRow([ctx.companyName]);
  ws.addRow([ctx.reportTitle]);
  ws.addRow([`Período: ${ctx.periodoLabel}`]);
  ws.addRow([`Filtros: ${ctx.filtrosResumo.length ? ctx.filtrosResumo.join(" · ") : "Nenhum filtro adicional"}`]);
  ws.addRow([`Gerado em: ${ctx.geradoEm.toLocaleString("pt-BR")}`]);
  ws.addRow([]);
  ws.addRow(columns.map((c) => c.label));
  for (const r of rows) ws.addRow(columns.map((c) => r[c.key] ?? ""));

  ws.columns = columns.map((c) => ({
    width: Math.max(c.label.length + 2, ...rows.map((r) => String(r[c.key] ?? "").length + 2), 10),
  }));

  const buffer = await wb.xlsx.writeBuffer();
  const file = new File([buffer], `${slugifyFilename(ctx.reportTitle)}.xlsx`, {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  downloadFile(file);
}

function slugifyFilename(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase() || "relatorio";
}
