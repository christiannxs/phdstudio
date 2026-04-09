import type { DemandRow } from "@/types/demands";

export type PhaseKey =
  | "phase_producao"
  | "phase_gravacao"
  | "phase_mix_master"
  | "phase_step_4"
  | "phase_step_5";

export type PhaseLabelColumn =
  | "phase_producao_label"
  | "phase_gravacao_label"
  | "phase_mix_master_label"
  | "phase_step_4_label"
  | "phase_step_5_label";

export type UpdatePhaseLabelPayload = { id: string; labelColumn: PhaseLabelColumn; value: string };

export const PHASE_STEPS: { key: PhaseKey; labelColumn: PhaseLabelColumn }[] = [
  { key: "phase_producao", labelColumn: "phase_producao_label" },
  { key: "phase_gravacao", labelColumn: "phase_gravacao_label" },
  { key: "phase_mix_master", labelColumn: "phase_mix_master_label" },
  { key: "phase_step_4", labelColumn: "phase_step_4_label" },
  { key: "phase_step_5", labelColumn: "phase_step_5_label" },
];

export function phaseLabelFromDemand(demand: DemandRow, key: PhaseKey): string {
  switch (key) {
    case "phase_producao":
      return demand.phase_producao_label ?? "";
    case "phase_gravacao":
      return demand.phase_gravacao_label ?? "";
    case "phase_mix_master":
      return demand.phase_mix_master_label ?? "";
    case "phase_step_4":
      return demand.phase_step_4_label ?? "";
    case "phase_step_5":
      return demand.phase_step_5_label ?? "";
  }
}

export function phaseCheckedFromDemand(demand: DemandRow, key: PhaseKey): boolean {
  switch (key) {
    case "phase_producao":
      return demand.phase_producao;
    case "phase_gravacao":
      return demand.phase_gravacao;
    case "phase_mix_master":
      return demand.phase_mix_master;
    case "phase_step_4":
      return demand.phase_step_4;
    case "phase_step_5":
      return demand.phase_step_5;
  }
}
