"use client";

import { useCallback, useEffect, useState } from "react";

import { format, isValid } from "date-fns";

import api from "@/lib/api";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
    slug?: string;
  };
};

const statusConfig: Record<
  AppointmentStatus,
  {
    label: string;
    variant: "default" | "destructive" | "outline" | "secondary";
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

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

function getAppointmentEnd(appointment: Appointment) {
  const start = new Date(appointment.date);

  if (!isValid(start)) {
    return null;
  }

  const duration = appointment.service?.durationMinutes ?? 0;

  return new Date(start.getTime() + duration * 60 * 1000);
}

function formatAppointmentTime(appointment: Appointment) {
  const start = new Date(appointment.date);

  if (!isValid(start)) {
    return "Data inválida";
  }

  const end = getAppointmentEnd(appointment);

  if (!end) {
    return format(start, "dd/MM/yyyy 'às' HH:mm");
  }

  return `${format(start, "dd/MM/yyyy 'às' HH:mm")} - ${format(end, "HH:mm")}`;
}

export default function AgendamentosPublicos() {
  const [phone, setPhone] = useState("");

  const [appointments, setAppointments] = useState<Appointment[]>([]);

  const [loading, setLoading] = useState(false);

  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const [error, setError] = useState("");

  const [bookingConfirmed, setBookingConfirmed] = useState(false);

  /*
   * Busca os agendamentos pelo telefone.
   */
  const fetchAppointmentsByPhone = useCallback(
    async (phoneToSearch: string) => {
      const normalizedPhone = normalizePhone(phoneToSearch);

      if (!normalizedPhone) {
        setError("Informe seu WhatsApp.");

        return;
      }

      setLoading(true);
      setError("");

      try {
        /*
         * IMPORTANTE:
         *
         * O backend possui:
         *
         * GET /appointments/by-phone
         *
         * e não:
         *
         * GET /appointments/public
         */
        const response = await api.get<Appointment[]>(
          "/appointments/by-phone",
          {
            params: {
              phone: normalizedPhone,
            },
          },
        );

        const now = new Date();

        /*
         * Mostra somente:
         *
         * - agendamentos não cancelados
         * - agendamentos que ainda
         *   não terminaram
         */
        const activeAppointments = (response.data ?? []).filter(
          (appointment) => {
            if (appointment.status === "CANCELLED" || appointment.status === "COMPLETED") {
              return false;
            }

            const end = getAppointmentEnd(appointment);

            if (!end) {
              return false;
            }

            return end >= now;
          },
        );

        setAppointments(activeAppointments);

        if (activeAppointments.length === 0) {
          setError("Nenhum agendamento futuro encontrado para este WhatsApp.");
        }
      } catch (err: any) {
        console.error("Erro ao buscar agendamentos:", err);

        setAppointments([]);

        const message = err.response?.data?.message;

        setError(
          Array.isArray(message)
            ? message.join(", ")
            : (message ?? "Nenhum agendamento encontrado."),
        );
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /*
   * Quando o cliente vem diretamente
   * da página onde acabou de agendar:
   *
   * /agendamentos?phone=81999999999&confirmed=1
   *
   * Preenche o telefone e pesquisa
   * automaticamente.
   */
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);

    const phoneFromUrl = query.get("phone");

    const confirmed = query.get("confirmed") === "1";

    if (confirmed) {
      setBookingConfirmed(true);
    }

    if (phoneFromUrl) {
      setPhone(phoneFromUrl);

      fetchAppointmentsByPhone(phoneFromUrl);
    }
  }, [fetchAppointmentsByPhone]);

  /*
   * Busca manual.
   */
  const search = async () => {
    await fetchAppointmentsByPhone(phone);
  };

  /*
   * Cancelamento público.
   *
   * Utiliza uma rota própria,
   * porque /:id/status é protegida
   * pelo JwtAuthGuard e pertence
   * ao painel profissional.
   */
  const cancel = async (id: string) => {
    const confirmed = window.confirm(
      "Deseja realmente cancelar este agendamento?",
    );

    if (!confirmed) {
      return;
    }

    const normalizedPhone = normalizePhone(phone);

    setCancellingId(id);

    try {
      await api.patch(`/appointments/${id}/cancel-public`, {
        phone: normalizedPhone,
      });

      /*
       * Remove imediatamente
       * da visualização.
       */
      setAppointments((currentAppointments) =>
        currentAppointments.filter((appointment) => appointment.id !== id),
      );

      alert("Agendamento cancelado com sucesso.");
    } catch (err: any) {
      console.error("Erro ao cancelar agendamento:", err);

      const message = err.response?.data?.message;

      alert(
        Array.isArray(message)
          ? message.join("\n")
          : (message ?? "Não foi possível cancelar o agendamento."),
      );
    } finally {
      setCancellingId(null);
    }
  };

  /*
   * Limpa somente a tela.
   *
   * Não apaga nada do banco.
   */
  const clearSearch = () => {
    setAppointments([]);
    setPhone("");
    setError("");

    setBookingConfirmed(false);

    window.history.replaceState({}, "", "/agendamentos");
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto w-full max-w-lg space-y-4 py-8">
        {/* Confirmação */}
        {bookingConfirmed && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4">
            <p className="font-semibold text-green-800">
              Agendamento realizado com sucesso!
            </p>

            <p className="mt-1 text-sm text-green-700">
              Confira abaixo os dados do seu agendamento.
            </p>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Consultar Agendamentos</CardTitle>

            <p className="text-sm text-gray-500">
              Informe o WhatsApp utilizado no agendamento.
            </p>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Pesquisa */}
            <div className="space-y-2">
              <Input
                type="tel"
                placeholder="WhatsApp (ex: 81999999999)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    search();
                  }
                }}
              />

              <Button
                type="button"
                onClick={search}
                disabled={loading || !phone.trim()}
                className="w-full cursor-pointer transition-colors hover:bg-blue-700"
              >
                {loading ? "Buscando..." : "Buscar agendamentos"}
              </Button>
            </div>

            {/* Erro / vazio */}
            {error && (
              <div className="rounded-md bg-gray-100 p-3 text-sm text-gray-600">
                {error}
              </div>
            )}

            {/* Agendamentos */}
            {appointments.length > 0 && (
              <div className="mt-6 space-y-4">
                {appointments.map((appointment) => {
                  const status = statusConfig[appointment.status];

                  const canCancel =
                    appointment.status === "PENDING" ||
                    appointment.status === "CONFIRMED";

                  const isCancelling = cancellingId === appointment.id;

                  return (
                    <div
                      key={appointment.id}
                      className="rounded-lg border bg-white p-4"
                    >
                      {/* Topo */}
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-lg font-semibold text-gray-900">
                            {appointment.service?.name ?? "Serviço"}
                          </p>

                          {appointment.professional?.name && (
                            <p className="text-sm text-gray-500">
                              Com {appointment.professional.name}
                            </p>
                          )}
                        </div>

                        <Badge variant={status?.variant ?? "secondary"}>
                          {status?.label ?? appointment.status}
                        </Badge>
                      </div>

                      {/* Data */}
                      <div className="mt-4 rounded-md bg-gray-50 p-3">
                        <p className="text-sm font-medium text-gray-700">
                          🗓️ {formatAppointmentTime(appointment)}
                        </p>
                      </div>

                      {/* Serviço */}
                      {appointment.service && (
                        <div className="mt-3 flex flex-wrap gap-3 text-sm text-gray-500">
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
                      )}

                      {/* Cliente */}
                      {appointment.customer && (
                        <p className="mt-3 text-sm text-gray-500">
                          Agendado para:{" "}
                          <strong>{appointment.customer.name}</strong>
                        </p>
                      )}

                      {/* Cancelamento */}
                      {canCancel && (
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          disabled={isCancelling}
                          onClick={() => cancel(appointment.id)}
                          className="mt-4 cursor-pointer transition-colors hover:bg-red-700"
                        >
                          {isCancelling
                            ? "Cancelando..."
                            : "Cancelar agendamento"}
                        </Button>
                      )}
                    </div>
                  );
                })}

                {/* Limpar visualização */}
                <div className="pt-2 text-center">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={clearSearch}
                    className="cursor-pointer hover:bg-gray-100"
                  >
                    Limpar busca
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
