"use client";

import { useCallback, useEffect, useState } from "react";
import { format, isValid } from "date-fns";
import { Trash2 } from "lucide-react";

import api from "@/lib/api";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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

const statusConfig: Record<
  AppointmentStatus,
  {
    label: string;
    variant: "default" | "destructive" | "outline" | "secondary" | "ghost";
  }
> = {
  PENDING: {
    label: "Pendente",
    variant: "secondary",
  },

  CONFIRMED: {
    label: "Confirmado",
    variant: "default",
  },

  CANCELLED: {
    label: "Cancelado",
    variant: "destructive",
  },

  COMPLETED: {
    label: "Concluído",
    variant: "outline",
  },

  NO_SHOW: {
    label: "Não compareceu",
    variant: "outline",
  },
};

/*
 * Gera o link do WhatsApp.
 */
function formatWhatsApp(phone: string) {
  const clean = phone.replace(/\D/g, "");

  let formattedPhone = clean;

  /*
   * Telefone brasileiro sem código do país.
   */
  if (clean.length === 11 && !clean.startsWith("55")) {
    formattedPhone = `55${clean}`;
  } else if (clean.length === 10) {
    formattedPhone = `55${clean}`;
  }

  return `https://wa.me/${formattedPhone}`;
}

export default function DashboardPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  /*
   * ID do agendamento que está sendo cancelado.
   */
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  /*
   * Controla o botão de limpeza.
   */
  const [cleaning, setCleaning] = useState(false);

  /*
   * Busca os agendamentos do profissional logado.
   */
  const fetchAppointments = useCallback(async () => {
    try {
      const response = await api.get<Appointment[]>("/appointments");

      setAppointments(response.data ?? []);
    } catch (err) {
      console.error("Erro ao buscar agendamentos:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  /*
   * Carrega os agendamentos ao abrir a página.
   */
  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  /*
   * Cancela um agendamento.
   */
  const handleStatusChange = async (id: string, status: AppointmentStatus) => {
    let confirmationMessage = "";

    if (status === "CONFIRMED") {
      confirmationMessage = "Deseja confirmar este agendamento?";
    }

    if (status === "CANCELLED") {
      confirmationMessage = "Deseja realmente cancelar este agendamento?";
    }

    if (status === "COMPLETED") {
      confirmationMessage = "Deseja marcar este atendimento como concluído?";
    }

    if (confirmationMessage && !window.confirm(confirmationMessage)) {
      return;
    }

    setUpdatingId(id);

    try {
      await api.patch(`/appointments/${id}/status`, {
        status,
      });

      setAppointments((currentAppointments) =>
        currentAppointments.map((appointment) =>
          appointment.id === id
            ? {
                ...appointment,
                status,
              }
            : appointment,
        ),
      );
    } catch (err) {
      console.error("Erro ao alterar status do agendamento:", err);

      alert("Erro ao alterar status do agendamento.");
    } finally {
      setUpdatingId(null);
    }
  };

  /*
   * Remove:
   *
   * - agendamentos cancelados;
   * - agendamentos que já terminaram.
   *
   * A decisão de quais registros podem ser apagados
   * é feita no backend.
   */
  const handleCleanup = async () => {
    const confirmed = window.confirm(
      "Deseja remover os agendamentos antigos?\n\nEssa ação não poderá ser desfeita.",
    );

    if (!confirmed) return;

    setCleaning(true);

    try {
      const response = await api.delete<CleanupResponse>(
        "/appointments/cleanup",
      );

      /*
       * Busca novamente os registros existentes
       * depois da limpeza.
       */
      await fetchAppointments();

      const count = response.data?.count ?? 0;

      if (count === 0) {
        alert("Nenhum agendamento cancelado ou antigo para remover.");

        return;
      }

      alert(
        `${count} ${
          count === 1
            ? "agendamento foi removido"
            : "agendamentos foram removidos"
        } com sucesso.`,
      );
    } catch (err) {
      console.error("Erro ao limpar agendamentos:", err);

      alert("Erro ao limpar os agendamentos.");
    } finally {
      setCleaning(false);
    }
  };

  /*
   * Calcula e formata:
   *
   * Data
   * Horário inicial
   * Horário final
   *
   * O backend armazena somente o horário inicial.
   * O horário final é calculado usando a duração
   * do serviço.
   */
  const getAppointmentTime = (appointment: Appointment) => {
    const startDate = new Date(appointment.date);

    if (!isValid(startDate)) {
      return "Data inválida";
    }

    const durationMinutes = appointment.service?.durationMinutes ?? 0;

    const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);

    return `${format(
      startDate,
      "dd/MM/yyyy HH:mm",
    )} - ${format(endDate, "HH:mm")}`;
  };

  /*
   * Loading inicial.
   */
  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Meus Agendamentos
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Gerencie seus horários e clientes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Quantidade de agendamentos */}
          <Badge variant="secondary">
            {appointments.length}{" "}
            {appointments.length === 1 ? "agendamento" : "agendamentos"}
          </Badge>

          {/* Limpar antigos */}
          <Button
            type="button"
            variant="outline"
            disabled={cleaning || appointments.length === 0}
            onClick={handleCleanup}
            className="cursor-pointer"
          >
            <Trash2 className="mr-2 h-4 w-4" />

            {cleaning ? "Limpando..." : "Limpar antigos"}
          </Button>
        </div>
      </div>

      {/* Nenhum agendamento */}
      {appointments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="font-medium text-gray-700">
              Nenhum agendamento encontrado
            </p>

            <p className="mt-1 text-sm text-gray-500">
              Novos agendamentos aparecerão aqui.
            </p>
          </CardContent>
        </Card>
      ) : (
        /*
         * Lista de agendamentos.
         */
        <div className="space-y-4">
          {appointments.map((appointment) => {
            const status = statusConfig[appointment.status];

            /*
             * Somente agendamentos pendentes
             * ou confirmados podem ser
             * cancelados manualmente.
             */
            const canConfirm = appointment.status === "PENDING";

            const canComplete = appointment.status === "CONFIRMED";

            const canCancel =
              appointment.status === "PENDING" ||
              appointment.status === "CONFIRMED";

            const isUpdating = updatingId === appointment.id;

            return (
              <Card
                key={appointment.id}
                className="transition-shadow hover:shadow-md"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      {/* Cliente */}
                      <CardTitle className="text-lg">
                        {appointment.customer?.name ?? "Cliente não informado"}
                      </CardTitle>

                      {/* WhatsApp */}
                      {appointment.customer?.phone && (
                        <a
                          href={formatWhatsApp(appointment.customer.phone)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="cursor-pointer text-sm font-medium text-green-600 transition-colors hover:text-green-700"
                        >
                          📱 {appointment.customer.phone}
                        </a>
                      )}
                    </div>

                    {/* Status */}
                    <Badge variant={status?.variant ?? "secondary"}>
                      {status?.label ?? appointment.status}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="space-y-4">
                    {/* Informações do serviço */}
                    {appointment.service && (
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          {appointment.service.name}
                        </p>

                        <div className="mt-1 flex flex-wrap gap-3 text-xs text-gray-500">
                          <span>
                            ⏱ {appointment.service.durationMinutes} minutos
                          </span>

                          <span>
                            {Number(appointment.service.price).toLocaleString(
                              "pt-BR",
                              {
                                style: "currency",
                                currency: "BRL",
                              },
                            )}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      {/* Data e horário */}
                      <p className="text-sm text-gray-500">
                        🗓️ {getAppointmentTime(appointment)}
                      </p>

                      <div className="flex flex-wrap gap-2">
                        {/* Confirmar solicitação */}
                        {canConfirm && (
                          <Button
                            type="button"
                            size="sm"
                            disabled={isUpdating}
                            onClick={() =>
                              handleStatusChange(appointment.id, "CONFIRMED")
                            }
                            className="cursor-pointer bg-green-600 text-white transition-colors hover:bg-green-700"
                          >
                            {isUpdating ? "Atualizando..." : "Confirmar"}
                          </Button>
                        )}

                        {/* Concluir atendimento */}
                        {canComplete && (
                          <Button
                            type="button"
                            size="sm"
                            disabled={isUpdating}
                            onClick={() =>
                              handleStatusChange(appointment.id, "COMPLETED")
                            }
                            className="cursor-pointer bg-blue-600 text-white transition-colors hover:bg-blue-700"
                          >
                            {isUpdating ? "Atualizando..." : "Concluir"}
                          </Button>
                        )}

                        {/* Cancelar */}
                        {canCancel && (
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            disabled={isUpdating}
                            onClick={() =>
                              handleStatusChange(appointment.id, "CANCELLED")
                            }
                            className="cursor-pointer transition-colors hover:bg-red-700 hover:text-white"
                          >
                            {isUpdating ? "Atualizando..." : "Cancelar"}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
