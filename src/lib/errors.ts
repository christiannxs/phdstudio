import { toast } from "sonner";

const errorCodeMap: Record<string, string> = {
  "23505": "Registro duplicado.",
  "23503": "Referência inválida para operação solicitada.",
  "42501": "Você não tem permissão para executar esta ação.",
};

type ErrorLike = {
  message?: unknown;
  code?: unknown;
  details?: unknown;
  hint?: unknown;
};

/**
 * Extrai mensagem amigável de um erro (Supabase, Error, ou desconhecido).
 */
export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null) {
    const typed = err as ErrorLike;
    if (typeof typed.code === "string" && errorCodeMap[typed.code]) {
      return errorCodeMap[typed.code];
    }
    if (typeof typed.message === "string") {
      return typed.message;
    }
  }
  return "Erro desconhecido";
}

/**
 * Loga o erro no console e mostra toast de erro. Útil em catch de mutations.
 * Se toastMessage for passado, usa como título e mostra a mensagem real como descrição.
 */
export function handleApiError(err: unknown, toastMessage?: string): void {
  const message = getErrorMessage(err);
  console.error("[API Error]", err);
  if (toastMessage) {
    toast.error(toastMessage, { description: message });
  } else {
    toast.error(message);
  }
}
