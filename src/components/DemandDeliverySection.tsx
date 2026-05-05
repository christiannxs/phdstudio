import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { Upload, Download, Loader2, MessageSquare, ChevronDown, ChevronRight, FileAudio } from "lucide-react";
import type { DeliverableRow } from "@/types/demands";

const BUCKET = "demand-files";
const ACCEPT_AUDIO = "audio/*,.wav,.mp3,.mp4,.m4a,.aac,.ogg,.flac";

/** Gera um nome de arquivo seguro para a chave do Storage (sem espaços, sem acentos, só [a-zA-Z0-9._-]). */
function safeStorageFileName(originalName: string): string {
  const lastDot = originalName.lastIndexOf(".");
  const base = lastDot >= 0 ? originalName.slice(0, lastDot) : originalName;
  const ext = lastDot >= 0 ? originalName.slice(lastDot).toLowerCase() : "";
  const safeBase = base
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "audio";
  return safeBase + ext;
}

interface DemandDeliverySectionProps {
  demandId: string;
  role: string | null;
  deliverable: DeliverableRow | null;
  userId: string;
  onRefresh: () => void;
}

export default function DemandDeliverySection({
  demandId,
  role,
  deliverable,
  userId,
  onRefresh,
}: DemandDeliverySectionProps) {
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [savingComments, setSavingComments] = useState(false);
  const [commentsDraft, setCommentsDraft] = useState(deliverable?.comments ?? "");
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const canUpload = true;
  const canDownload = true;
  const storagePath = deliverable?.storage_path ?? null;
  const hasFile = !!storagePath && !!deliverable?.file_name;
  const hasComments = !!(deliverable?.comments ?? commentsDraft)?.trim();

  useEffect(() => {
    setCommentsDraft(deliverable?.comments ?? "");
  }, [deliverable?.comments]);

  // Só gera signed URL quando o usuário pode baixar (evita 400 para produtor e requisições desnecessárias)
  useEffect(() => {
    if (!canDownload || !hasFile || !storagePath) {
      setSignedUrl(null);
      return;
    }
    let cancelled = false;
    supabase.storage
      .from(BUCKET)
      .createSignedUrl(storagePath, 60)
      .then(({ data, error }) => {
        if (!cancelled && !error && data?.signedUrl) setSignedUrl(data.signedUrl);
      });
    return () => {
      cancelled = true;
    };
  }, [canDownload, hasFile, storagePath]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !canUpload) return;
    setUploading(true);
    try {
      const safeName = safeStorageFileName(file.name);
      const path = `${demandId}/${safeName}`;
      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true });
      if (uploadError) throw new Error(uploadError.message);

      const { error: rpcError } = await supabase.rpc("upsert_demand_deliverable", {
        p_demand_id: demandId,
        p_storage_path: path,
        p_file_name: file.name,
        p_comments: (deliverable?.comments ?? commentsDraft) || null,
        p_uploaded_by: userId,
      });
      if (rpcError) throw new Error(rpcError.message);
      toast.success("Arquivo enviado com sucesso!");
      onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao enviar arquivo";
      toast.error(msg);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDownload = async () => {
    if (!hasFile || !canDownload) return;
    if (!signedUrl) {
      toast.error("URL do arquivo ainda não disponível.");
      return;
    }
    setDownloading(true);
    try {
      const a = document.createElement("a");
      a.href = signedUrl;
      a.download = deliverable?.file_name ?? "arquivo";
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.click();
      toast.success("Download iniciado.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao baixar arquivo");
    } finally {
      setDownloading(false);
    }
  };

  const handleSaveComments = async () => {
    setSavingComments(true);
    try {
      const { error } = await supabase.rpc("upsert_demand_deliverable", {
        p_demand_id: demandId,
        p_storage_path: deliverable?.storage_path ?? null,
        p_file_name: deliverable?.file_name ?? null,
        p_comments: commentsDraft.trim() || null,
        p_uploaded_by: deliverable?.uploaded_by ?? userId,
      });
      if (error) throw new Error(error.message);
      toast.success("Comentários salvos!");
      onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar comentários";
      toast.error(msg);
    } finally {
      setSavingComments(false);
    }
  };

  const summary = [hasFile ? "1 arquivo" : "Sem arquivo", hasComments ? "com comentários" : null].filter(Boolean).join(" · ");

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="mt-2">
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-md border border-border/60 bg-muted/30 px-2.5 py-1.5 text-left text-xs text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors min-w-0 flex-wrap"
        >
          {open ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
          <FileAudio className="h-3 w-3 shrink-0" />
          <span className="min-w-0 break-words">Entrega e comentários</span>
          {summary && <span className="text-[10px] opacity-80">{summary}</span>}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 space-y-2.5 rounded-md border border-border/60 bg-muted/20 p-2.5">
          {canUpload && (
            <div className="space-y-1">
              <Label className="text-[11px]">Enviar arquivo (WAV, MP3, etc.)</Label>
              <div className="flex flex-wrap items-center gap-2">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept={ACCEPT_AUDIO}
                    className="hidden"
                    disabled={uploading}
                    onChange={handleFileChange}
                  />
                  <Button type="button" size="sm" variant="outline" className="h-7 text-xs pointer-events-none" asChild>
                    <span>
                      {uploading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Upload className="h-3 w-3 mr-1" />}
                      {uploading ? "Enviando..." : "Selecionar arquivo"}
                    </span>
                  </Button>
                </label>
                {hasFile && (
                  <span className="text-[11px] text-muted-foreground truncate max-w-[160px]" title={deliverable?.file_name ?? undefined}>
                    {deliverable?.file_name}
                  </span>
                )}
              </div>
            </div>
          )}

          {canDownload && hasFile && (
            <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={handleDownload} disabled={downloading || !signedUrl}>
              {downloading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Download className="h-3 w-3 mr-1" />}
              {downloading ? "Preparando..." : "Baixar"}
            </Button>
          )}

          <div className="space-y-1">
            <Label className="text-[11px] flex items-center gap-1">
              <MessageSquare className="h-3 w-3" /> Comentários
            </Label>
            <Textarea
              placeholder="Comentários sobre o término..."
              value={commentsDraft}
              onChange={(e) => setCommentsDraft(e.target.value)}
              className="min-h-[60px] text-xs"
              disabled={savingComments}
            />
            <Button size="sm" className="h-7 text-xs" onClick={handleSaveComments} disabled={savingComments}>
              {savingComments ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
              Salvar comentários
            </Button>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
