"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { format, isValid } from "date-fns";

import {
  CalendarClock,
  Check,
  CheckCircle2,
  History,
  Trash2,
  X,
} from "lucide-react";

import api from "@/lib/api";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";

import { Button } from "@/components/ui/button";

import { Label } from "@/components/ui/label";

import { Textarea } from "@/components/ui/textarea";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type AppointmentStatus =
  | "PENDING"
  | "CONFIRMED"
  | "CANCELLED"
  | "COMPLETED"
  | "NO_SHOW";

type Appointment = {
  id: string;
  date: string;
  status: AppointmentStatus;

  cancellationReason?: string | null;
  cancelledBy?: "PROFESSIONAL" | "CUSTOMER" | null;
  cancelledAt?: string | null;

  customer?: {
    id: string;
    name: string;
    phone: string;
  };

  service?: {
    id: string;
    name: string;
    durationMinutes: number;
    price: number;
  };

  professional?: {
    id: string;
    name: string;
  };
};

type CleanupResponse = {
  count?: number;
  deletedIds?: string[];
  message?: string;
};

const statusConfig = {
  PENDING: {
    label: "Pendente",
    variant: "secondary" as const,
  },

  CONFIRMED: {
    label: "Confirmado",
    variant: "default" as const,
  },

  CANCELLED: {
    label: "Cancelado",
    variant: "destructive" as const,
  },

  COMPLETED: {
    label: "Concluído",
    variant: "outline" as const,
  },

  NO_SHOW: {
    label: "Não compareceu",
    variant: "outline" as const,
  },
};

function formatWhatsApp(phone: string) {
  const clean = phone.replace(/\D/g, "");

  const normalized = clean.startsWith("55") ? clean : `55${clean}`;

  return `https://wa.me/${normalized}`;
}

function getErrorMessage(error: any, fallback: string) {
  const message = error.response?.data?.message;

  return Array.isArray(message) ? message.join("\n") : (message ?? fallback);
}

function isFinishedStatus(status: AppointmentStatus) {
  return (
    status === "CANCELLED" || status === "COMPLETED" || status === "NO_SHOW"
  );
}

export default function DashboardPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  const [loading, setLoading] = useState(true);

  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [cleaning, setCleaning] = useState(false);

  /*
   * Cancelamento com motivo.
   */
  const [cancellationTarget, setCancellationTarget] =
    useState<Appointment | null>(null);

  const [cancellationReason, setCancellationReason] = useState("");

  const [cancelling, setCancelling] = useState(false);

  /*
   * ========================================================
   * LISTAS
   * ========================================================
   */

  /*
   * PENDING + CONFIRMED
   *
   * Ordem:
   * horário/data mais próximo primeiro.
   */
  const activeAppointments = useMemo(() => {
    return appointments
      .filter(
        (appointment) =>
          appointment.status === "PENDING" ||
          appointment.status === "CONFIRMED",
      )
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [appointments]);

  /*
   * CANCELLED + COMPLETED + NO_SHOW
   *
   * Ordem:
   * mais recente primeiro.
   */
  const finishedAppointments = useMemo(() => {
    return appointments
      .filter((appointment) => isFinishedStatus(appointment.status))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [appointments]);

  const pendingCount = activeAppointments.filter(
    (appointment) => appointment.status === "PENDING",
  ).length;

  const confirmedCount = activeAppointments.filter(
    (appointment) => appointment.status === "CONFIRMED",
  ).length;

  /*
   * ========================================================
   * LOAD
   * ========================================================
   */

  const fetchAppointments = useCallback(async () => {
    try {
      const response = await api.get<Appointment[]>("/appointments");

      setAppointments(response.data ?? []);
    } catch (error) {
      console.error("Erro ao buscar agendamentos:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  /*
   * ========================================================
   * DATA / HORÁRIO
   * ========================================================
   */

  const getAppointmentTime = (appointment: Appointment) => {
    const start = new Date(appointment.date);

    if (!isValid(start)) {
      return "Data inválida";
    }

    const duration = appointment.service?.durationMinutes ?? 0;

    const end = new Date(start.getTime() + duration * 60 * 1000);

    return `${format(start, "dd/MM/yyyy HH:mm")} - ${format(end, "HH:mm")}`;
  };

  /*
   * ========================================================
   * CONFIRMAR / CONCLUIR / NO SHOW
   * ========================================================
   */

  const updateStatus = async (
    appointment: Appointment,
    status: AppointmentStatus,
  ) => {
    let message = "";

    if (status === "CONFIRMED") {
      message = "Deseja confirmar este agendamento?";
    }

    if (status === "COMPLETED") {
      message = "Deseja marcar este atendimento como concluído?";
    }

    if (status === "NO_SHOW") {
      message = "Deseja marcar que o cliente não compareceu?";
    }

    if (message && !window.confirm(message)) {
      return;
    }

    setUpdatingId(appointment.id);

    try {
      const response = await api.patch<Appointment>(
        `/appointments/${appointment.id}/status`,
        {
          status,
        },
      );

      setAppointments((current) =>
        current.map((item) =>
          item.id === appointment.id ? response.data : item,
        ),
      );
    } catch (error) {
      alert(getErrorMessage(error, "Erro ao atualizar agendamento."));
    } finally {
      setUpdatingId(null);
    }
  };

  /*
   * ========================================================
   * RECUSAR / CANCELAR COM MOTIVO
   * ========================================================
   */

  const openCancellation = (appointment: Appointment) => {
    setCancellationTarget(appointment);

    setCancellationReason("");
  };

  const submitCancellation = async () => {
    if (!cancellationTarget) {
      return;
    }

    const reason = cancellationReason.trim();

    if (!reason) {
      alert("Informe o motivo do cancelamento.");

      return;
    }

    setCancelling(true);

    try {
      const response = await api.patch<Appointment>(
        `/appointments/${cancellationTarget.id}/status`,
        {
          status: "CANCELLED",

          reason,
        },
      );

      setAppointments((current) =>
        current.map((item) =>
          item.id === cancellationTarget.id ? response.data : item,
        ),
      );

      setCancellationTarget(null);

      setCancellationReason("");
    } catch (error) {
      alert(getErrorMessage(error, "Erro ao cancelar agendamento."));
    } finally {
      setCancelling(false);
    }
  };

  /*
   * ========================================================
   * EXCLUIR UM FINALIZADO
   * ========================================================
   */

  const handleDeleteAppointment = async (appointment: Appointment) => {
    if (!isFinishedStatus(appointment.status)) {
      alert("Este agendamento ainda está ativo e não pode ser excluído.");

      return;
    }

    if (!window.confirm("Deseja excluir este agendamento definitivamente?")) {
      return;
    }

    setDeletingId(appointment.id);

    try {
      await api.delete(`/appointments/${appointment.id}`);

      setAppointments((current) =>
        current.filter((item) => item.id !== appointment.id),
      );
    } catch (error) {
      alert(getErrorMessage(error, "Erro ao excluir agendamento."));
    } finally {
      setDeletingId(null);
    }
  };

  /*
   * ========================================================
   * LIMPAR TODOS OS FINALIZADOS
   * ========================================================
   */

  const handleCleanup = async () => {
    const count = finishedAppointments.length;

    if (count === 0) {
      alert("Não existem agendamentos finalizados para remover.");

      return;
    }

    if (
      !window.confirm(
        `Deseja excluir ${count} ${
          count === 1 ? "agendamento finalizado" : "agendamentos finalizados"
        }?\n\nPendentes e confirmados serão preservados.`,
      )
    ) {
      return;
    }

    setCleaning(true);

    try {
      const response = await api.delete<CleanupResponse>(
        "/appointments/cleanup",
      );

      const deletedIds = response.data?.deletedIds ?? [];

      setAppointments((current) =>
        current.filter((appointment) => !deletedIds.includes(appointment.id)),
      );

      const deletedCount = response.data?.count ?? 0;

      if (deletedCount === 0) {
        alert("Nenhum agendamento finalizado para remover.");

        return;
      }

      alert(
        `${deletedCount} ${
          deletedCount === 1
            ? "agendamento foi removido"
            : "agendamentos foram removidos"
        } com sucesso.`,
      );
    } catch (error) {
      alert(getErrorMessage(error, "Erro ao limpar os agendamentos."));
    } finally {
      setCleaning(false);
    }
  };

  /*
   * ========================================================
   * LOADING
   * ========================================================
   */

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6 p-4 sm:p-6">
        {/* ===============================================
            HEADER
        =============================================== */}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Meus Agendamentos
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Acompanhe solicitações, atendimentos e histórico.
            </p>
          </div>

          <Badge variant="secondary" className="w-fit">
            {appointments.length}{" "}
            {appointments.length === 1 ? "agendamento" : "agendamentos"}
          </Badge>
        </div>

        {/* ===============================================
            RESUMO
        =============================================== */}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-medium text-amber-700">
              Aguardando confirmação
            </p>

            <p className="mt-1 text-2xl font-bold text-amber-900">
              {pendingCount}
            </p>
          </div>

          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <p className="text-xs font-medium text-blue-700">Confirmados</p>

            <p className="mt-1 text-2xl font-bold text-blue-900">
              {confirmedCount}
            </p>
          </div>

          <div className="col-span-2 rounded-xl border border-gray-200 bg-white p-4 sm:col-span-1">
            <p className="text-xs font-medium text-gray-500">Finalizados</p>

            <p className="mt-1 text-2xl font-bold text-gray-900">
              {finishedAppointments.length}
            </p>
          </div>
        </div>

        {/* ===============================================
            DUAS LISTAS
        =============================================== */}

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          {/* =============================================
              ATIVOS
          ============================================= */}

          <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <CalendarClock className="h-5 w-5 text-blue-600" />

                  <h3 className="text-lg font-bold text-gray-900">
                    Agendamentos ativos
                  </h3>
                </div>

                <p className="mt-1 text-sm text-gray-500">
                  Ordenados pelo atendimento mais próximo.
                </p>
              </div>

              <Badge variant="secondary">{activeAppointments.length}</Badge>
            </div>

            {activeAppointments.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center">
                  <CalendarClock className="mx-auto h-8 w-8 text-gray-300" />

                  <p className="mt-3 font-medium text-gray-700">
                    Nenhum agendamento ativo
                  </p>

                  <p className="mt-1 text-sm text-gray-500">
                    Novas solicitações aparecerão aqui.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {activeAppointments.map((appointment) => {
                  const status = statusConfig[appointment.status];

                  const busy = updatingId === appointment.id;

                  const isPending = appointment.status === "PENDING";

                  return (
                    <Card
                      key={appointment.id}
                      className={`overflow-hidden transition-shadow hover:shadow-md ${
                        isPending ? "border-amber-200" : "border-blue-200"
                      }`}
                    >
                      {/* barra visual */}
                      <div
                        className={`h-1 w-full ${
                          isPending ? "bg-amber-400" : "bg-blue-500"
                        }`}
                      />

                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <CardTitle className="text-lg">
                              {appointment.customer?.name ??
                                "Cliente não informado"}
                            </CardTitle>

                            {appointment.customer?.phone && (
                              <a
                                href={formatWhatsApp(
                                  appointment.customer.phone,
                                )}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-1 inline-block text-sm font-medium text-green-600 hover:text-green-700"
                              >
                                📱 {appointment.customer.phone}
                              </a>
                            )}
                          </div>

                          <Badge variant={status.variant}>{status.label}</Badge>
                        </div>
                      </CardHeader>

                      <CardContent>
                        <div className="space-y-4">
                          {appointment.service && (
                            <div>
                              <p className="text-sm font-semibold text-gray-800">
                                {appointment.service.name}
                              </p>

                              <div className="mt-1 flex flex-wrap gap-3 text-xs text-gray-500">
                                <span>
                                  ⏱ {appointment.service.durationMinutes}{" "}
                                  minutos
                                </span>

                                <span>
                                  {Number(
                                    appointment.service.price,
                                  ).toLocaleString("pt-BR", {
                                    style: "currency",

                                    currency: "BRL",
                                  })}
                                </span>
                              </div>
                            </div>
                          )}

                          <div
                            className={`rounded-lg p-3 ${
                              isPending ? "bg-amber-50" : "bg-blue-50"
                            }`}
                          >
                            <p className="text-sm font-semibold text-gray-700">
                              🗓️ {getAppointmentTime(appointment)}
                            </p>
                          </div>

                          {/* PENDENTE */}
                          {appointment.status === "PENDING" && (
                            <div className="flex flex-col gap-2 sm:flex-row">
                              <Button
                                type="button"
                                disabled={busy}
                                onClick={() =>
                                  updateStatus(appointment, "CONFIRMED")
                                }
                                className="bg-green-600 text-white hover:bg-green-700"
                              >
                                <Check className="mr-2 h-4 w-4" />

                                {busy ? "Atualizando..." : "Confirmar"}
                              </Button>

                              <Button
                                type="button"
                                variant="destructive"
                                disabled={busy}
                                onClick={() => openCancellation(appointment)}
                              >
                                <X className="mr-2 h-4 w-4" />
                                Recusar
                              </Button>
                            </div>
                          )}

                          {/* CONFIRMADO */}
                          {appointment.status === "CONFIRMED" && (
                            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                              <Button
                                type="button"
                                disabled={busy}
                                onClick={() =>
                                  updateStatus(appointment, "COMPLETED")
                                }
                                className="bg-green-600 text-white hover:bg-green-700"
                              >
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                Concluir
                              </Button>

                              <Button
                                type="button"
                                variant="outline"
                                disabled={busy}
                                onClick={() =>
                                  updateStatus(appointment, "NO_SHOW")
                                }
                              >
                                Não compareceu
                              </Button>

                              <Button
                                type="button"
                                variant="destructive"
                                disabled={busy}
                                onClick={() => openCancellation(appointment)}
                              >
                                <X className="mr-2 h-4 w-4" />
                                Cancelar
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>

          {/* =============================================
              FINALIZADOS
          ============================================= */}

          <section className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between lg:flex-col lg:items-stretch xl:flex-row xl:items-center">
              <div>
                <div className="flex items-center gap-2">
                  <History className="h-5 w-5 text-gray-500" />

                  <h3 className="text-lg font-bold text-gray-900">
                    Finalizados
                  </h3>
                </div>

                <p className="mt-1 text-sm text-gray-500">Histórico recente.</p>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={cleaning || finishedAppointments.length === 0}
                onClick={handleCleanup}
                className="text-red-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700"
              >
                <Trash2 className="mr-2 h-4 w-4" />

                {cleaning ? "Limpando..." : "Limpar finalizados"}
              </Button>
            </div>

            {finishedAppointments.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center">
                  <History className="mx-auto h-8 w-8 text-gray-300" />

                  <p className="mt-3 text-sm font-medium text-gray-600">
                    Nenhum histórico
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {finishedAppointments.map((appointment) => {
                  const status = statusConfig[appointment.status];

                  const deleting = deletingId === appointment.id;

                  return (
                    <Card
                      key={appointment.id}
                      className="border-gray-200 bg-gray-50/50"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-gray-800">
                              {appointment.customer?.name ?? "Cliente"}
                            </p>

                            <p className="mt-0.5 truncate text-sm text-gray-500">
                              {appointment.service?.name ?? "Serviço"}
                            </p>
                          </div>

                          <Badge variant={status.variant} className="shrink-0">
                            {status.label}
                          </Badge>
                        </div>

                        <div className="mt-3 rounded-lg bg-white p-3">
                          <p className="text-xs font-medium text-gray-600">
                            🗓️ {getAppointmentTime(appointment)}
                          </p>
                        </div>

                        {appointment.status === "CANCELLED" &&
                          appointment.cancellationReason && (
                            <div className="mt-3 rounded-lg border border-red-100 bg-red-50 p-3">
                              <p className="text-xs font-semibold text-red-700">
                                Motivo
                              </p>

                              <p className="mt-1 text-xs leading-5 text-gray-600">
                                {appointment.cancellationReason}
                              </p>
                            </div>
                          )}

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={deleting}
                          onClick={() => handleDeleteAppointment(appointment)}
                          className="mt-3 w-full text-red-600 hover:bg-red-50 hover:text-red-700"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />

                          {deleting ? "Excluindo..." : "Excluir agendamento"}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* ================================================
          MOTIVO DO CANCELAMENTO
      ================================================ */}

      <Sheet
        open={!!cancellationTarget}
        onOpenChange={(open) => {
          if (!open) {
            setCancellationTarget(null);

            setCancellationReason("");
          }
        }}
      >
        <SheetContent className="p-6 sm:max-w-[430px]">
          <SheetHeader>
            <SheetTitle>
              {cancellationTarget?.status === "PENDING"
                ? "Recusar agendamento"
                : "Cancelar agendamento"}
            </SheetTitle>

            <SheetDescription>
              O motivo será exibido para o cliente ao consultar o agendamento.
            </SheetDescription>
          </SheetHeader>

          {cancellationTarget && (
            <div className="mt-6 space-y-5">
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="font-medium text-gray-900">
                  {cancellationTarget.customer?.name ?? "Cliente"}
                </p>

                <p className="mt-1 text-sm text-gray-600">
                  {cancellationTarget.service?.name ?? "Serviço"}
                </p>

                <p className="mt-1 text-sm text-gray-500">
                  {getAppointmentTime(cancellationTarget)}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cancellationReason">Motivo</Label>

                <Textarea
                  id="cancellationReason"
                  rows={5}
                  maxLength={500}
                  placeholder="Ex.: Preciso me ausentar neste horário. Por favor, escolha um novo horário disponível."
                  value={cancellationReason}
                  onChange={(event) =>
                    setCancellationReason(event.target.value)
                  }
                />

                <p className="text-right text-xs text-gray-400">
                  {cancellationReason.length}
                  /500
                </p>
              </div>

              <SheetFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setCancellationTarget(null);

                    setCancellationReason("");
                  }}
                >
                  Voltar
                </Button>

                <Button
                  type="button"
                  variant="destructive"
                  disabled={cancelling || !cancellationReason.trim()}
                  onClick={submitCancellation}
                >
                  {cancelling
                    ? "Salvando..."
                    : cancellationTarget.status === "PENDING"
                      ? "Recusar agendamento"
                      : "Cancelar agendamento"}
                </Button>
              </SheetFooter>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
