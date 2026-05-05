import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DemandDateRangeCalendar } from "@/components/DemandDateRangeCalendar";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useProducers } from "@/hooks/useProducers";
import { supabase } from "@/integrations/supabase/client";
import { handleApiError } from "@/lib/errors";
import { toast } from "sonner";
import { ARTISTS } from "@/lib/artists";
import { SERVICE_TYPE_LABELS } from "@/lib/demandFinancial";

const createDemandSchema = z.object({
  artist: z.string().optional().or(z.literal("")),
  name: z.string().min(1, "Nome é obrigatório").max(200, "Nome muito longo"),
  description: z.string().max(2000).optional().or(z.literal("")),
  startDate: z.string().min(1, "Data de início é obrigatória"),
  startTime: z.string().min(1, "Horário de início é obrigatório"),
  dueDate: z.string().min(1, "Data de término é obrigatória"),
  dueTime: z.string().min(1, "Horário de término é obrigatório"),
  producer: z.string().min(1, "Selecione um produtor"),
  service_type: z.string().optional().or(z.literal("")),
  price: z.string().optional().or(z.literal("")),
  client_name: z.string().optional().or(z.literal("")),
}).refine(
  (data) => {
    const start = new Date(`${data.startDate}T${data.startTime}`);
    const due = new Date(`${data.dueDate}T${data.dueTime}`);
    return start <= due;
  },
  { message: "A data/hora de início deve ser anterior à data/hora de término.", path: ["dueDate"] }
);

type CreateDemandForm = z.infer<typeof createDemandSchema>;

interface Props {
  onCreated: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  initialDueDate?: Date | null;
}

export default function CreateDemandDialog({ onCreated, open: controlledOpen, onOpenChange: controlledOnOpenChange, initialDueDate }: Props) {
  const { user, role, displayName } = useAuth();
  const { data: producers = [] } = useProducers(role);
  const [internalOpen, setInternalOpen] = useState(false);

  const isControlled = controlledOpen !== undefined && controlledOnOpenChange !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? controlledOnOpenChange : setInternalOpen;

  const isProducer = role === "produtor";
  const producerOptions = isProducer && displayName ? [displayName] : producers;
  const producerDisabled = isProducer;

  const [confirmAddOpen, setConfirmAddOpen] = useState(false);
  const [pendingSubmitValues, setPendingSubmitValues] = useState<CreateDemandForm | null>(null);
  const [isSubmittingAfterConfirm, setIsSubmittingAfterConfirm] = useState(false);

  const form = useForm<CreateDemandForm>({
    resolver: zodResolver(createDemandSchema),
    defaultValues: {
      artist: "",
      name: "",
      description: "",
      startDate: "",
      startTime: "",
      dueDate: "",
      dueTime: "",
      producer: "",
      service_type: "",
      price: "",
      client_name: "",
    },
  });

  useEffect(() => {
    if (open && isProducer && displayName) {
      form.setValue("producer", displayName);
    }
  }, [open, isProducer, displayName, form]);

  useEffect(() => {
    if (!open) return;
    if (initialDueDate) {
      const dueDateStr = format(initialDueDate, "yyyy-MM-dd");
      form.setValue("dueDate", dueDateStr);
      form.setValue("dueTime", "18:00");
      form.setValue("startDate", dueDateStr);
      form.setValue("startTime", "09:00");
    }
  }, [open, initialDueDate, form]);

  const doInsertDemand = async (values: CreateDemandForm) => {
    if (!user) return;
    const trimmedProducer = values.producer.trim();
    const dueDateTime = new Date(`${values.dueDate}T${values.dueTime}`);
    const startAtISO = new Date(`${values.startDate}T${values.startTime}`).toISOString();
    const dueAtISO = dueDateTime.toISOString();

    const priceRaw = values.price?.trim().replace(",", ".");
    const priceNum = priceRaw !== undefined && priceRaw !== "" ? parseFloat(priceRaw) : null;
    const serviceType = values.service_type?.trim() || null;
    const clientName = values.client_name?.trim() || null;

    const { error } = await supabase.from("demands").insert({
      artist_name: values.artist?.trim() || null,
      name: values.name.trim(),
      description: values.description?.trim() || null,
      producer_name: trimmedProducer,
      solicitante_name: displayName?.trim() || null,
      created_by: user.id,
      start_at: startAtISO,
      due_at: dueAtISO,
      // Campos financeiros: só incluídos quando têm valor (evita erro se migration não aplicada)
      ...(serviceType ? { service_type: serviceType as never } : {}),
      ...(priceNum != null && !isNaN(priceNum) ? { price: priceNum } : {}),
      ...(clientName ? { client_name: clientName } : {}),
    });
    if (error) throw error;
    toast.success("Demanda criada com sucesso!");
    form.reset({
      artist: "",
      name: "",
      description: "",
      startDate: "",
      startTime: "",
      dueDate: "",
      dueTime: "",
      producer: isProducer && displayName ? displayName : "",
      service_type: "",
      price: "",
      client_name: "",
    });
    setOpen(false);
    setConfirmAddOpen(false);
    setPendingSubmitValues(null);
    onCreated();
  };

  const onSubmit = async (values: CreateDemandForm) => {
    if (!user) return;
    try {
      const trimmedProducer = values.producer.trim();

      const dayStart = new Date(values.dueDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(values.dueDate);
      dayEnd.setHours(23, 59, 59, 999);

      const { data: existingDemands, error: conflictError } = await supabase
        .from("demands")
        .select("id, name, due_at")
        .eq("producer_name", trimmedProducer)
        .gte("due_at", dayStart.toISOString())
        .lte("due_at", dayEnd.toISOString());

      if (conflictError) throw conflictError;

      if (existingDemands && existingDemands.length > 0) {
        setPendingSubmitValues(values);
        setConfirmAddOpen(true);
        return;
      }

      await doInsertDemand(values);
    } catch (err: unknown) {
      handleApiError(err, "Erro ao criar demanda.");
    }
  };

  const handleConfirmAddDespiteConflict = async () => {
    if (!pendingSubmitValues) return;
    setIsSubmittingAfterConfirm(true);
    try {
      await doInsertDemand(pendingSubmitValues);
    } catch (err: unknown) {
      handleApiError(err, "Erro ao criar demanda.");
    } finally {
      setIsSubmittingAfterConfirm(false);
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={setOpen}>
      {!isControlled && (
        <DialogTrigger asChild>
          <Button>
            <Plus className="h-4 w-4 mr-2" /> Nova Demanda
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-h-[90vh] flex flex-col overflow-hidden gap-0 p-0">
        <DialogHeader className="shrink-0 px-6 pt-6 pb-2">
          <DialogTitle>Criar Nova Demanda</DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto flex-1 min-h-0 px-6 pb-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pr-1">
            <FormField
              control={form.control}
              name="artist"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Artista</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o artista" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ARTISTS.map((name) => (
                        <SelectItem key={name} value={name}>{name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Demanda</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ex: Beat Trap para artista X" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Detalhes sobre a demanda..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Card className="border-muted bg-muted/30">
              <CardHeader className="pb-3 pt-4 px-4">
                <CardTitle className="text-sm font-medium">Datas e horários</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-4">
                <div className="space-y-2">
                  <FormLabel>Início</FormLabel>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-muted-foreground font-normal">Data</FormLabel>
                          <FormControl>
                            <Input type="date" required {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="startTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-muted-foreground font-normal">Horário</FormLabel>
                          <FormControl>
                            <Input type="time" required {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <FormLabel>Término</FormLabel>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="dueDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-muted-foreground font-normal">Data</FormLabel>
                          <FormControl>
                            <Input type="date" required {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="dueTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-muted-foreground font-normal">Horário</FormLabel>
                          <FormControl>
                            <Input type="time" required {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                <DemandDateRangeCalendar
                  startDate={form.watch("startDate")}
                  dueDate={form.watch("dueDate")}
                />
              </CardContent>
            </Card>
            <FormField
              control={form.control}
              name="producer"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Produtor</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={producerDisabled || producerOptions.length === 0}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={producerOptions.length === 0 ? "Nenhum produtor cadastrado" : "Selecione o produtor"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {producerOptions.map((name) => (
                        <SelectItem key={name} value={name}>{name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!producerDisabled && (
                    <p className="text-xs text-muted-foreground">Consulte a disponibilidade no topo da página.</p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Tipo de serviço + Valor + Responsável pela cobrança */}
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="service_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de serviço</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Opcional" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">Não especificado</SelectItem>
                        {Object.entries(SERVICE_TYPE_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor (R$) — pode ser 0</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Ex: 500 ou 0"
                        inputMode="decimal"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="client_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Responsável pela cobrança</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Nome do cliente ou responsável — opcional"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full"
              disabled={form.formState.isSubmitting || producerOptions.length === 0}
            >
              {form.formState.isSubmitting ? "Criando..." : "Criar Demanda"}
            </Button>
          </form>
        </Form>
        </div>
      </DialogContent>
    </Dialog>
    <AlertDialog open={confirmAddOpen} onOpenChange={(open) => { setConfirmAddOpen(open); if (!open) setPendingSubmitValues(null); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Já existe demanda neste dia</AlertDialogTitle>
          <AlertDialogDescription>
            Este produtor já tem {pendingSubmitValues ? "demanda(s)" : "uma demanda"} com término marcado para esse dia.
            Deseja adicionar outra demanda mesmo assim?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmittingAfterConfirm}>Não</AlertDialogCancel>
          <Button
            onClick={handleConfirmAddDespiteConflict}
            disabled={isSubmittingAfterConfirm}
          >
            {isSubmittingAfterConfirm ? "Adicionando..." : "Sim, tenho certeza"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>
  );
}
