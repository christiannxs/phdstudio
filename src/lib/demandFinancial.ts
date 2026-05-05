export const SERVICE_TYPE_LABELS: Record<string, string> = {
  beatmaking:  "Beatmaking",
  gravacao:    "Gravação",
  mixagem:     "Mixagem",
  mastering:   "Mastering",
  mix_master:  "Mix + Master",
  aluguel:     "Aluguel de Estúdio",
  outro:       "Outro",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending:   "Pendente",
  paid:      "Pago",
  overdue:   "Atrasado",
  cancelled: "Cancelado",
};

export const PAYMENT_STATUS_STYLES: Record<string, string> = {
  pending:   "bg-amber-500/15 text-amber-600 border-amber-500/30",
  paid:      "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  overdue:   "bg-red-500/15 text-red-600 border-red-500/30",
  cancelled: "bg-muted text-muted-foreground border-border",
};

export const PAYMENT_METHODS = [
  "PIX",
  "Transferência Bancária",
  "Dinheiro",
  "Cartão",
  "Outro",
];

export function formatPrice(value: number | null | undefined): string {
  if (value == null) return "—";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
