"use client";

import { useCallback, useEffect, useState } from "react";

import { format, isValid } from "date-fns";

import { CalendarPlus, MessageCircle } from "lucide-react";

import api from "@/lib/api";

import { Badge } from "@/components/ui/badge";

import { Button } from "@/components/ui/button";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Input } from "@/components/ui/input";

type AppointmentStatus =
  | "PENDING"
  | "CONFIRMED"
  | "CANCELLED"
  | "COMPLETED"
  | "NO_SHOW";

type CancelledBy = "PROFESSIONAL" | "CUSTOMER";

type Appointment = {
  id: string;
  date: string;
  status: AppointmentStatus;

  cancellationReason?: string | null;
  cancelledBy?: CancelledBy | null;
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
    slug?: string;
    whatsapp?: string | null;
  };
};

type Props = {
  professionalId?: string;

  initialPhone?: string;

  /*
   * Incrementar esse número força
   * uma nova busca mesmo que o telefone
   * seja o mesmo.
   */
  refreshKey?: number;

  bookingConfirmed?: boolean;

  primaryColor?: string;

  /*
   * Usado apenas pela página /agendamentos
   * para manter compatibilidade com:
   *
   * ?phone=...&confirmed=1
   */
  readQueryParams?: boolean;

  /*
   * Dentro da página do profissional,
   * podemos rolar para o formulário
   * em vez de navegar.
   */
  onRebook?: () => void;
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

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

function formatWhatsAppLink(phone: string, message?: string) {
  const clean = normalizePhone(phone);

  const normalized = clean.startsWith("55") ? clean : `55${clean}`;

  const text = message ? `?text=${encodeURIComponent(message)}` : "";

  return `https://wa.me/${normalized}${text}`;
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

export default function CustomerAppointments({
  professionalId,
  initialPhone,
  refreshKey = 0,
  bookingConfirmed = false,
  primaryColor = "#2563eb",
  readQueryParams = false,
  onRebook,
}: Props) {
  const [phone, setPhone] = useState(initialPhone ?? "");

  const [appointments, setAppointments] = useState<Appointment[]>([]);

  const [loading, setLoading] = useState(false);

  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const [error, setError] = useState("");

  const [confirmedFromQuery, setConfirmedFromQuery] = useState(false);

  const fetchAppointmentsByPhone = useCallback(
    async (phoneToSearch: string) => {
      const normalizedPhone = normalizePhone(phoneToSearch);

      if (normalizedPhone.length < 10) {
        setError("Informe um WhatsApp válido.");

        return;
      }

      setLoading(true);
      setError("");

      try {
        const response = await api.get<Appointment[]>(
          "/appointments/by-phone",
          {
            params: {
              phone: normalizedPhone,

              ...(professionalId
                ? {
                    professionalId,
                  }
                : {}),
            },
          },
        );

        const now = new Date();

        const visible = (response.data ?? []).filter((appointment) => {
          const end = getAppointmentEnd(appointment);

          if (!end) {
            return false;
          }

          /*
           * Concluídos e ausência não
           * precisam aparecer nesta tela.
           */
          if (
            appointment.status === "COMPLETED" ||
            appointment.status === "NO_SHOW"
          ) {
            return false;
          }

          /*
           * Cancelado pelo próprio cliente:
           * não mostramos.
           */
          if (
            appointment.status === "CANCELLED" &&
            appointment.cancelledBy !== "PROFESSIONAL"
          ) {
            return false;
          }

          /*
           * Ativos ou cancelados pelo
           * profissional permanecem
           * visíveis até passar o
           * horário original.
           */
          return end >= now;
        });

        setAppointments(visible);

        if (visible.length === 0) {
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
    [professionalId],
  );

  /*
   * Compatibilidade com /agendamentos?phone=...
   */
  useEffect(() => {
    if (!readQueryParams) {
      return;
    }

    const query = new URLSearchParams(window.location.search);

    const phoneFromUrl = query.get("phone");

    const confirmed = query.get("confirmed") === "1";

    setConfirmedFromQuery(confirmed);

    if (phoneFromUrl) {
      setPhone(phoneFromUrl);

      fetchAppointmentsByPhone(phoneFromUrl);
    }
  }, [readQueryParams, fetchAppointmentsByPhone]);

  /*
   * Quando um agendamento acaba
   * de ser criado na página do
   * profissional.
   */
  useEffect(() => {
    if (!initialPhone) {
      return;
    }

    setPhone(initialPhone);

    if (refreshKey > 0) {
      fetchAppointmentsByPhone(initialPhone);
    }
  }, [initialPhone, refreshKey, fetchAppointmentsByPhone]);

  const search = async () => {
    await fetchAppointmentsByPhone(phone);
  };

  const cancel = async (id: string) => {
    if (!window.confirm("Deseja realmente cancelar este agendamento?")) {
      return;
    }

    const normalizedPhone = normalizePhone(phone);

    setCancellingId(id);

    try {
      await api.patch(`/appointments/${id}/cancel-public`, {
        phone: normalizedPhone,
      });

      setAppointments((current) =>
        current.filter((appointment) => appointment.id !== id),
      );

      alert("Agendamento cancelado com sucesso.");
    } catch (err: any) {
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

  const clearSearch = () => {
    setAppointments([]);

    setPhone("");

    setError("");

    setConfirmedFromQuery(false);

    if (readQueryParams) {
      window.history.replaceState({}, "", "/agendamentos");
    }
  };

  const showConfirmation = bookingConfirmed || confirmedFromQuery;

  return (
    <div className="space-y-4">
      {showConfirmation && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4">
          <p className="font-semibold text-green-800">
            Agendamento realizado com sucesso!
          </p>

          <p className="mt-1 text-sm text-green-700">
            Seu pedido foi enviado ao profissional. Acompanhe o status abaixo.
          </p>
        </div>
      )}

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Meus agendamentos</CardTitle>

          <p className="text-sm text-gray-500">
            Informe o WhatsApp utilizado no agendamento.
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Input
              type="tel"
              placeholder="WhatsApp (ex.: 81999999999)"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  search();
                }
              }}
            />

            <Button
              type="button"
              disabled={loading || !phone.trim()}
              onClick={search}
              className="w-full text-white hover:opacity-90"
              style={{
                backgroundColor: primaryColor,
              }}
            >
              {loading ? "Buscando..." : "Buscar agendamentos"}
            </Button>
          </div>

          {error && (
            <div className="rounded-lg bg-gray-100 p-3 text-sm text-gray-600">
              {error}
            </div>
          )}

          {appointments.length > 0 && (
            <div className="space-y-4 pt-2">
              {appointments.map((appointment) => {
                const status = statusConfig[appointment.status];

                const cancelledByProfessional =
                  appointment.status === "CANCELLED" &&
                  appointment.cancelledBy === "PROFESSIONAL";

                const canCancel =
                  appointment.status === "PENDING" ||
                  appointment.status === "CONFIRMED";

                const professional = appointment.professional;

                const whatsappMessage = `Olá${
                  professional?.name ? ` ${professional.name}` : ""
                }! Meu agendamento de ${
                  appointment.service?.name ?? "serviço"
                } em ${formatAppointmentTime(
                  appointment,
                )} foi cancelado e gostaria de verificar um novo horário.`;

                return (
                  <div
                    key={appointment.id}
                    className={`rounded-xl border p-4 ${
                      cancelledByProfessional
                        ? "border-red-200 bg-red-50/50"
                        : "bg-white"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900">
                          {appointment.service?.name ?? "Serviço"}
                        </p>

                        {professional?.name && (
                          <p className="mt-0.5 text-sm text-gray-500">
                            Com {professional.name}
                          </p>
                        )}
                      </div>

                      <Badge variant={status.variant}>
                        {cancelledByProfessional
                          ? "Cancelado pelo profissional"
                          : status.label}
                      </Badge>
                    </div>

                    <div className="mt-4 rounded-lg bg-gray-50 p-3">
                      <p className="text-sm font-medium text-gray-700">
                        🗓️ {formatAppointmentTime(appointment)}
                      </p>
                    </div>

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

                    {cancelledByProfessional && (
                      <div className="mt-4 rounded-lg border border-red-200 bg-white p-3">
                        <p className="text-sm font-semibold text-red-700">
                          Motivo informado
                        </p>

                        <p className="mt-1 text-sm text-gray-700">
                          {appointment.cancellationReason ??
                            "O profissional informou que não poderá realizar este atendimento."}
                        </p>
                      </div>
                    )}

                    {canCancel && (
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        disabled={cancellingId === appointment.id}
                        onClick={() => cancel(appointment.id)}
                        className="mt-4"
                      >
                        {cancellingId === appointment.id
                          ? "Cancelando..."
                          : "Cancelar agendamento"}
                      </Button>
                    )}

                    {cancelledByProfessional && (
                      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                        {professional?.slug && (
                          <Button
                            type="button"
                            onClick={() => {
                              if (onRebook) {
                                onRebook();

                                return;
                              }

                              window.location.href = `/professional/${professional.slug}#agendar`;
                            }}
                            className="text-white hover:opacity-90"
                            style={{
                              backgroundColor: primaryColor,
                            }}
                          >
                            <CalendarPlus className="mr-2 h-4 w-4" />
                            Agendar novo horário
                          </Button>
                        )}

                        {professional?.whatsapp && (
                          <Button type="button" variant="outline" asChild>
                            <a
                              href={formatWhatsAppLink(
                                professional.whatsapp,
                                whatsappMessage,
                              )}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <MessageCircle className="mr-2 h-4 w-4 text-green-600" />
                              Falar no WhatsApp
                            </a>
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              <div className="text-center">
                <Button type="button" variant="ghost" onClick={clearSearch}>
                  Limpar busca
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
