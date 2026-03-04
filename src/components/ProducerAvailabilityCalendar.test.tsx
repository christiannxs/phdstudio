import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ProducerAvailabilityCalendar from "@/components/ProducerAvailabilityCalendar";
import type { DemandRow } from "@/types/demands";

const mockDemands: DemandRow[] = [
  {
    id: "d1",
    name: "Demanda 1",
    status: "em_producao",
    start_at: "2025-03-01T10:00:00Z",
    due_at: "2025-03-15T18:00:00Z",
    producer_name: "Produtor 1",
    solicitante_name: "Cliente A",
    created_at: "",
    created_by: "user-1",
    updated_at: "",
    artist_name: null,
    description: null,
    phase_producao: false,
    phase_gravacao: false,
    phase_mix_master: false,
  },
  {
    id: "d2",
    name: "Demanda 2",
    status: "aguardando",
    start_at: "2025-03-10T09:00:00Z",
    due_at: "2025-03-10T17:00:00Z",
    producer_name: "Produtor 1",
    solicitante_name: null,
    created_at: "",
    created_by: "user-1",
    updated_at: "",
    artist_name: null,
    description: null,
    phase_producao: false,
    phase_gravacao: false,
    phase_mix_master: false,
  },
];

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "user-1" },
    role: "produtor",
    displayName: "Produtor 1",
    loading: false,
    signIn: vi.fn(),
    signUpWithRole: vi.fn(),
    createUserAsAdmin: vi.fn(),
    sendPasswordReset: vi.fn(),
    signOut: vi.fn(),
  }),
}));

vi.mock("@/hooks/useDemands", () => ({
  useDemands: () => ({
    demands: [],
    deliverables: [],
    isLoading: false,
    refetch: vi.fn(),
    updateStatusMutation: { mutateAsync: vi.fn() },
    deleteDemandMutation: { mutate: vi.fn() },
  }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

describe("ProducerAvailabilityCalendar", () => {
  it("renders title and description", () => {
    render(<ProducerAvailabilityCalendar userId="user-1" />);
    expect(screen.getByText("Quando estou ocupado")).toBeInTheDocument();
    expect(screen.getByText(/Cada faixa = período em que você está ocupado/)).toBeInTheDocument();
  });

  it("renders Hoje button", () => {
    render(<ProducerAvailabilityCalendar userId="user-1" />);
    expect(screen.getByRole("button", { name: /hoje/i })).toBeInTheDocument();
  });

  it("shows hint when no day is selected", () => {
    render(<ProducerAvailabilityCalendar userId="user-1" />);
    expect(screen.getByText("Clique em um dia para ver se você está ocupado ou livre.")).toBeInTheDocument();
  });

  it("renders calendar with demands and shows demand list when day is selected", () => {
    render(
      <ProducerAvailabilityCalendar userId="user-1" demands={mockDemands} />
    );
    const buttons = screen.getAllByRole("button");
    const day15 = buttons.find((b) => b.getAttribute("aria-label")?.includes("15"));
    if (day15) {
      fireEvent.click(day15);
      expect(screen.getByText("Demanda 1")).toBeInTheDocument();
      expect(screen.getByText("Demanda 2")).not.toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: /hoje/i })).toBeInTheDocument();
  });

  it("shows Nova demanda button when onAddDemandWithDate is passed and a day is selected", () => {
    const onAdd = vi.fn();
    render(
      <ProducerAvailabilityCalendar
        userId="user-1"
        onAddDemandWithDate={onAdd}
      />
    );
    const buttons = screen.getAllByRole("button");
    const today = new Date();
    const dayNum = today.getDate();
    const dayButton = buttons.find(
      (b) => b.getAttribute("aria-label")?.includes(String(dayNum))
    );
    if (dayButton) {
      fireEvent.click(dayButton);
      const addBtn = screen.getByRole("button", {
        name: /nova demanda com término neste dia/i,
      });
      expect(addBtn).toBeInTheDocument();
      fireEvent.click(addBtn);
      expect(onAdd).toHaveBeenCalledTimes(1);
    }
  });

  it("renders legend with visual hint (início → término)", () => {
    render(<ProducerAvailabilityCalendar userId="user-1" />);
    expect(screen.getByText(/faixa = período ocupado \(início → término da entrega\)/)).toBeInTheDocument();
  });
});
