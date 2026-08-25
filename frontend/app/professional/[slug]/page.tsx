"use client";

import { useEffect, useState } from "react";
import Calendar from "react-calendar";
import { addMonths, format, parse } from "date-fns";

import api from "@/lib/api";
import type { Professional, Service } from "@/types";

import "react-calendar/dist/Calendar.css";

interface SlotItem {
  time: string;
  available: boolean;
}

interface AvailableSlotsResponse {
  available: boolean;
  slots: SlotItem[];
  message?: string;
}

export default function ProfessionalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  /* ==============================
   * Estados
   * ============================== */

  const [professional, setProfessional] = useState<Professional | null>(null);

  const [services, setServices] = useState<Service[]>([]);

  const [selectedService, setSelectedService] = useState("");

  const [selectedDate, setSelectedDate] = useState("");

  const [slots, setSlots] = useState<SlotItem[]>([]);

  const [selectedSlot, setSelectedSlot] = useState("");

  const [clientName, setClientName] = useState("");

  const [clientWhats, setClientWhats] = useState("");

  const [loading, setLoading] = useState(true);

  const [loadingSlots, setLoadingSlots] = useState(false);

  const [booking, setBooking] = useState(false);

  const [slotsMessage, setSlotsMessage] = useState("");

  /* ==============================
   * Carrega profissional + serviços
   * ============================== */

  useEffect(() => {
    const loadProfessional = async () => {
      try {
        const { slug } = await params;

        const professionalResponse = await api.get<Professional>(
          `/professionals/slug/${slug}`,
        );

        const professionalData = professionalResponse.data;

        setProfessional(professionalData);

        const servicesResponse = await api.get<Service[]>(
          `/services/professional/${professionalData.id}`,
        );

        setServices(servicesResponse.data ?? []);
      } catch (err) {
        console.error("Erro ao carregar profissional:", err);

        setProfessional(null);
      } finally {
        setLoading(false);
      }
    };

    loadProfessional();
  }, [params]);

  /* ==============================
   * Busca horários disponíveis
   * ============================== */

  useEffect(() => {
    const fetchSlots = async () => {
      /*
       * Agora precisamos ter:
       *
       * profissional
       * serviço
       * data
       */
      if (!professional || !selectedService || !selectedDate) {
        setSlots([]);
        setSelectedSlot("");
        setSlotsMessage("");

        return;
      }

      setLoadingSlots(true);
      setSelectedSlot("");
      setSlotsMessage("");

      try {
        const response = await api.get<AvailableSlotsResponse>(
          "/appointments/available",
          {
            params: {
              date: selectedDate,
              professionalId: professional.id,
              serviceId: selectedService,
            },
          },
        );

        setSlots(response.data.slots ?? []);

        if (!response.data.available || response.data.slots.length === 0) {
          setSlotsMessage(
            response.data.message ?? "Nenhum horário disponível nesta data.",
          );
        }
      } catch (err: any) {
        console.error("Erro ao buscar horários:", err);

        const message = err.response?.data?.message;

        setSlots([]);

        setSlotsMessage(
          Array.isArray(message)
            ? message.join(", ")
            : (message ?? "Erro ao buscar horários disponíveis."),
        );
      } finally {
        setLoadingSlots(false);
      }
    };

    fetchSlots();
  }, [selectedDate, selectedService, professional]);

  /* ==============================
   * Troca de serviço
   * ============================== */

  const handleServiceChange = (serviceId: string) => {
    setSelectedService(serviceId);

    /*
     * Remove horário selecionado anteriormente,
     * pois a duração do novo serviço pode ser
     * diferente.
     */
    setSelectedSlot("");
  };

  /* ==============================
   * Realiza agendamento
   * ============================== */

  const handleBooking = async () => {
    if (!professional) {
      alert("Profissional não identificado.");

      return;
    }

    if (!selectedService) {
      alert("Selecione um serviço.");

      return;
    }

    if (!selectedDate) {
      alert("Selecione uma data.");

      return;
    }

    if (!selectedSlot) {
      alert("Selecione um horário.");

      return;
    }

    if (!clientName.trim()) {
      alert("Informe seu nome.");

      return;
    }

    /*
     * Mantemos somente números.
     *
     * Exemplo:
     * (81) 99999-9999
     *
     * vira:
     * 81999999999
     */
    const normalizedWhats = clientWhats.replace(/\D/g, "");

    if (normalizedWhats.length < 10) {
      alert("Informe um WhatsApp válido.");

      return;
    }

    setBooking(true);

    try {
      const payload = {
        professionalId: professional.id,

        serviceId: selectedService,

        /*
         * IMPORTANTE:
         *
         * Backend espera "dateTime"
         *
         * e NÃO "datetime".
         */
        dateTime: `${selectedDate}T${selectedSlot}:00`,

        clientName: clientName.trim(),

        clientWhats: normalizedWhats,
      };

      console.log("Enviando agendamento:", payload);

      await api.post("/appointments", payload);

      /*
       * Redireciona para a página
       * onde o cliente consulta seus
       * agendamentos.
       */
      window.location.href = `/agendamentos?phone=${encodeURIComponent(
        normalizedWhats,
      )}&confirmed=1`;
    } catch (err: any) {
      console.error("Erro ao criar agendamento:", err);

      console.error("Status:", err.response?.status);

      console.error("Resposta backend:", err.response?.data);

      const backendMessage = err.response?.data?.message;

      const message = Array.isArray(backendMessage)
        ? backendMessage.join("\n")
        : (backendMessage ?? "Erro ao realizar agendamento.");

      alert(message);

      /*
       * Caso outra pessoa tenha ocupado
       * o horário enquanto o cliente estava
       * preenchendo os dados, atualiza os slots.
       */
      if (err.response?.status === 409) {
        setSelectedSlot("");

        try {
          const response = await api.get<AvailableSlotsResponse>(
            "/appointments/available",
            {
              params: {
                date: selectedDate,

                professionalId: professional.id,

                serviceId: selectedService,
              },
            },
          );

          setSlots(response.data.slots ?? []);
        } catch {
          // O erro principal já foi exibido.
        }
      }
    } finally {
      setBooking(false);
    }
  };

  /* ==============================
   * Loading
   * ============================== */

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-pink-500" />
      </div>
    );
  }

  /* ==============================
   * Profissional não encontrado
   * ============================== */

  if (!professional) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-600">Profissional não encontrada.</p>
      </div>
    );
  }

  /* ==============================
   * Renderização
   * ============================== */

  return (
    <main
      style={{
        background: "#fff",
      }}
      className="min-h-screen px-4 pb-10 pt-6 lg:px-0"
    >
      {/* Header */}
      <header
        style={{
          backgroundColor: "#F00",
        }}
        className="p-6 text-center text-white"
      >
        <h1 className="text-3xl font-bold">{professional.name}</h1>

        {professional.bio && (
          <p className="mt-2 opacity-80">{professional.bio}</p>
        )}
      </header>

      {/* Conteúdo */}
      <div className="mx-auto mt-8 max-w-xl space-y-8 px-4">
        {/* ==============================
         * Serviços
         * ============================== */}

        <section>
          <h2 className="mb-3 text-xl font-semibold">1. Escolha o serviço</h2>

          <select
            value={selectedService}
            onChange={(e) => handleServiceChange(e.target.value)}
            className="w-full rounded border p-3"
          >
            <option value="">Selecione um serviço...</option>

            {services
              .filter((service) => service.isActive)
              .map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name} –{" "}
                  {Number(service.price).toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}{" "}
                  ({service.durationMinutes} min)
                </option>
              ))}
          </select>

          {services.filter((service) => service.isActive).length === 0 && (
            <p className="mt-2 text-sm text-gray-500">
              Nenhum serviço disponível no momento.
            </p>
          )}
        </section>

        {/* ==============================
         * Calendário
         * ============================== */}

        <section>
          <h2 className="mb-3 text-xl font-semibold">2. Selecione a data</h2>

          {!selectedService && (
            <p className="mb-3 text-sm text-gray-500">
              Escolha primeiro um serviço para visualizar os horários.
            </p>
          )}

          <div
            className={!selectedService ? "pointer-events-none opacity-50" : ""}
          >
            <Calendar
              onChange={(value) => {
                if (value instanceof Date) {
                  setSelectedDate(format(value, "yyyy-MM-dd"));

                  setSelectedSlot("");
                }
              }}
              /*
               * Evitamos:
               *
               * new Date("2026-08-25")
               *
               * porque strings YYYY-MM-DD
               * podem ser interpretadas como
               * UTC pelo JavaScript.
               */
              value={
                selectedDate
                  ? parse(selectedDate, "yyyy-MM-dd", new Date())
                  : null
              }
              minDate={new Date()}
              maxDate={addMonths(new Date(), 2)}
            />
          </div>
        </section>

        {/* ==============================
         * Horários
         * ============================== */}

        {selectedDate && selectedService && (
          <section>
            <h2 className="mb-3 text-xl font-semibold">3. Escolha o horário</h2>

            {loadingSlots ? (
              <div className="flex items-center gap-2 py-4 text-sm text-gray-500">
                <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-pink-500" />
                Buscando horários...
              </div>
            ) : slots.length > 0 ? (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {slots.map((slot) => (
                  <button
                    type="button"
                    key={slot.time}
                    disabled={!slot.available}
                    onClick={() => setSelectedSlot(slot.time)}
                    className={`rounded px-3 py-2 text-sm transition ${
                      !slot.available
                        ? "cursor-not-allowed bg-gray-200 text-gray-400"
                        : selectedSlot === slot.time
                          ? "bg-pink-600 text-white"
                          : "bg-green-100 hover:bg-green-200"
                    }`}
                  >
                    {slot.time}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                {slotsMessage || "Nenhum horário disponível nesta data."}
              </p>
            )}
          </section>
        )}

        {/* ==============================
         * Dados cliente
         * ============================== */}

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">4. Seus dados</h2>

          <div>
            <label
              htmlFor="clientName"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Nome completo
            </label>

            <input
              id="clientName"
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Digite seu nome"
              autoComplete="name"
              className="w-full rounded border p-3"
            />
          </div>

          <div>
            <label
              htmlFor="clientWhats"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              WhatsApp
            </label>

            <input
              id="clientWhats"
              type="tel"
              value={clientWhats}
              onChange={(e) => setClientWhats(e.target.value)}
              placeholder="Ex.: (81) 99999-9999"
              autoComplete="tel"
              className="w-full rounded border p-3"
            />
          </div>
        </section>

        {/* ==============================
         * Resumo
         * ============================== */}

        {selectedService && selectedDate && selectedSlot && (
          <section className="rounded-lg border bg-gray-50 p-4">
            <p className="text-sm font-semibold text-gray-800">
              Resumo do agendamento
            </p>

            <p className="mt-2 text-sm text-gray-600">
              Serviço:{" "}
              {services.find((service) => service.id === selectedService)?.name}
            </p>

            <p className="text-sm text-gray-600">
              Data:{" "}
              {format(
                parse(selectedDate, "yyyy-MM-dd", new Date()),
                "dd/MM/yyyy",
              )}
            </p>

            <p className="text-sm text-gray-600">Horário: {selectedSlot}</p>
          </section>
        )}

        {/* ==============================
         * Confirmar
         * ============================== */}

        <button
          type="button"
          disabled={
            !selectedService ||
            !selectedDate ||
            !selectedSlot ||
            !clientName.trim() ||
            !clientWhats.trim() ||
            booking
          }
          onClick={handleBooking}
          className="w-full cursor-pointer rounded bg-pink-600 py-3 font-medium text-white transition-colors hover:bg-pink-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {booking ? "Agendando..." : "Confirmar Agendamento"}
        </button>
      </div>
    </main>
  );
}
