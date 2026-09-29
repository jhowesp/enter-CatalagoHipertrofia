import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import {
  CSV_COLUMNS,
  buildCsvTemplate,
  buildImportPreview,
  parseImportCsv,
  runImport,
  type ImportPreview,
  type ImportReport,
} from "@/services/import";
import {
  listAdminBrands,
  listAdminCategories,
  listProductReferences,
} from "@/services/admin";

type CsvImportSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
};

type Step = "upload" | "preview" | "report";

export function CsvImportSheet({ open, onOpenChange, onImported }: CsvImportSheetProps) {
  const [step, setStep] = useState<Step>("upload");
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [options, setOptions] = useState({
    updateExisting: true,
    createMissingTaxonomy: true,
  });

  const reset = () => {
    setStep("upload");
    setFileName(null);
    setPreview(null);
    setReport(null);
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast.error("Envie um arquivo .csv (exportado do Excel ou Google Planilhas).");
      return;
    }

    setParsing(true);
    setFileName(file.name);
    try {
      const content = await file.text();
      const parsed = parseImportCsv(content);

      if (parsed.headerErrors.some((error) => error.startsWith("Coluna obrigatória"))) {
        toast.error(parsed.headerErrors[0]);
        setParsing(false);
        return;
      }

      const [categories, brands, products] = await Promise.all([
        listAdminCategories(),
        listAdminBrands(),
        listProductReferences(),
      ]);

      const result = buildImportPreview(
        parsed,
        {
          categories: categories.map((item) => ({
            id: item.id,
            name: item.name,
            slug: item.slug,
          })),
          brands: brands.map((item) => ({ id: item.id, name: item.name, slug: item.slug })),
          products,
        },
        options,
      );

      setPreview(result);
      setStep("preview");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível ler o arquivo.");
    } finally {
      setParsing(false);
    }
  };

  const reanalyze = async (nextOptions: typeof options) => {
    setOptions(nextOptions);
    const input = document.getElementById("csv-file-input") as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (file) await handleFile(file);
  };

  const handleConfirm = async () => {
    if (!preview || preview.validRows === 0) return;

    setImporting(true);
    try {
      const result = await runImport(preview, options);
      setReport(result);
      setStep("report");
      onImported();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao importar os produtos.");
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const blob = new Blob([`\uFEFF${buildCsvTemplate()}`], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "modelo-produtos-hipertrofia.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-y-auto border-border bg-background p-0 sm:max-w-3xl"
      >
        <SheetHeader className="border-b border-border px-5 py-4 text-left">
          <SheetTitle className="font-display text-xl uppercase tracking-tight">
            Importar produtos por CSV
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            Cadastre dezenas de produtos de uma só vez, com validação antes de gravar.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 px-5 py-5">
          {step === "upload" && (
            <>
              <div className="space-y-3 rounded-xl border border-border bg-card p-5">
                <h3 className="font-display text-base tracking-tight text-foreground">
                  1. Prepare a planilha
                </h3>
                <p className="text-sm text-muted-foreground">
                  Colunas aceitas:{" "}
                  <span className="text-foreground">{CSV_COLUMNS.join(", ")}</span>.
                  Separador vírgula ou ponto e vírgula, com cabeçalho na primeira linha.
                </p>
                <Button type="button" variant="outline" size="lg" onClick={downloadTemplate}>
                  <Download />
                  Baixar modelo CSV
                </Button>
              </div>

              <div className="space-y-3 rounded-xl border border-border bg-card p-5">
                <h3 className="font-display text-base tracking-tight text-foreground">
                  2. Envie o arquivo
                </h3>
                <Label htmlFor="csv-file-input" className="sr-only">
                  Arquivo CSV
                </Label>
                <Input
                  id="csv-file-input"
                  type="file"
                  accept=".csv,text/csv"
                  className="h-12 cursor-pointer file:text-foreground"
                  onChange={(event) => void handleFile(event.target.files?.[0])}
                />
                {parsing && (
                  <p className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Validando {fileName}...
                  </p>
                )}
              </div>

              <div className="space-y-3 rounded-xl border border-border bg-card p-5">
                <h3 className="font-display text-base tracking-tight text-foreground">
                  3. Opções
                </h3>
                <label className="flex items-center justify-between gap-4">
                  <span className="text-sm text-muted-foreground">
                    Atualizar produtos existentes (mesmo endereço/slug)
                  </span>
                  <Switch
                    checked={options.updateExisting}
                    onCheckedChange={(checked) =>
                      setOptions((current) => ({ ...current, updateExisting: checked }))
                    }
                  />
                </label>
                <label className="flex items-center justify-between gap-4">
                  <span className="text-sm text-muted-foreground">
                    Criar categorias e marcas que ainda não existem
                  </span>
                  <Switch
                    checked={options.createMissingTaxonomy}
                    onCheckedChange={(checked) =>
                      setOptions((current) => ({ ...current, createMissingTaxonomy: checked }))
                    }
                  />
                </label>
              </div>
            </>
          )}

          {step === "preview" && preview && (
            <>
              <div className="grid gap-3 sm:grid-cols-4">
                <div className="rounded-lg border border-border bg-card p-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    Linhas
                  </p>
                  <p className="font-display text-2xl text-foreground">{preview.totalRows}</p>
                </div>
                <div className="rounded-lg border border-success/40 bg-success/10 p-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    Válidas
                  </p>
                  <p className="font-display text-2xl text-success">{preview.validRows}</p>
                </div>
                <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    Com erro
                  </p>
                  <p className="font-display text-2xl text-destructive">
                    {preview.errors.length}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-card p-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    Criar / Atualizar
                  </p>
                  <p className="font-display text-xl text-foreground">
                    {preview.createCount} / {preview.updateCount}
                  </p>
                </div>
              </div>

              {(preview.newCategories.length > 0 || preview.newBrands.length > 0) &&
                options.createMissingTaxonomy && (
                  <div className="space-y-1 rounded-lg border border-primary/35 bg-primary/5 p-4 text-sm">
                    <p className="font-semibold text-foreground">
                      Serão criados automaticamente
                    </p>
                    {preview.newCategories.length > 0 && (
                      <p className="text-muted-foreground">
                        Categorias: {preview.newCategories.join(", ")}
                      </p>
                    )}
                    {preview.newBrands.length > 0 && (
                      <p className="text-muted-foreground">
                        Marcas: {preview.newBrands.join(", ")}
                      </p>
                    )}
                  </div>
                )}

              {preview.errors.length > 0 && (
                <div className="space-y-3 rounded-xl border border-destructive/40 bg-destructive/5 p-4">
                  <h3 className="flex items-center gap-2 font-display text-base tracking-tight text-foreground">
                    <AlertTriangle className="h-4 w-4 text-destructive" aria-hidden />
                    Linhas com erro (não serão gravadas)
                  </h3>
                  <ul className="max-h-64 space-y-1.5 overflow-y-auto text-xs">
                    {preview.errors.slice(0, 40).map((error, index) => (
                      <li key={`${error.line}-${index}`} className="text-muted-foreground">
                        <span className="font-semibold text-foreground">
                          Linha {error.line}
                        </span>{" "}
                        — {error.field}: {error.message}
                      </li>
                    ))}
                  </ul>
                  {preview.errors.length > 40 && (
                    <p className="text-xs text-muted-foreground">
                      Mostrando os 40 primeiros erros de {preview.errors.length}.
                    </p>
                  )}
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                <Button
                  variant="brand"
                  size="lg"
                  disabled={importing || preview.validRows === 0}
                  onClick={() => void handleConfirm()}
                >
                  {importing ? <Loader2 className="animate-spin" /> : <Upload />}
                  Confirmar importação de {preview.validRows}{" "}
                  {preview.validRows === 1 ? "produto" : "produtos"}
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  disabled={importing}
                  onClick={() => void reanalyze(options)}
                >
                  Revalidar
                </Button>
                <Button variant="ghost" size="lg" disabled={importing} onClick={reset}>
                  Trocar arquivo
                </Button>
              </div>
            </>
          )}

          {step === "report" && report && (
            <>
              <div className="flex items-start gap-3 rounded-xl border border-success/40 bg-success/10 p-5">
                <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-success" aria-hidden />
                <div className="space-y-1 text-sm">
                  <p className="font-semibold text-foreground">Importação concluída</p>
                  <p className="text-muted-foreground">
                    {report.created} {report.created === 1 ? "produto criado" : "produtos criados"} •{" "}
                    {report.updated} {report.updated === 1 ? "atualizado" : "atualizados"}
                    {report.createdCategories > 0 &&
                      ` • ${report.createdCategories} categoria(s) criada(s)`}
                    {report.createdBrands > 0 && ` • ${report.createdBrands} marca(s) criada(s)`}
                  </p>
                </div>
              </div>

              {report.failures.length > 0 && (
                <div className="space-y-2 rounded-xl border border-destructive/40 bg-destructive/5 p-4">
                  <h3 className="font-display text-base tracking-tight text-foreground">
                    {report.failures.length} linha(s) falharam ao gravar
                  </h3>
                  <ul className="max-h-48 space-y-1 overflow-y-auto text-xs text-muted-foreground">
                    {report.failures.slice(0, 30).map((failure, index) => (
                      <li key={`${failure.line}-${index}`}>
                        <span className="font-semibold text-foreground">
                          Linha {failure.line}
                        </span>{" "}
                        — {failure.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                <Button variant="brand" size="lg" onClick={reset}>
                  <FileSpreadsheet />
                  Importar outro arquivo
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => {
                    reset();
                    onOpenChange(false);
                  }}
                >
                  Fechar
                </Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
