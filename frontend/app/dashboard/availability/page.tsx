'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  addMonths,
  format,
  parse,
} from 'date-fns';

import Calendar from 'react-calendar';

import {
  Ban,
  ChevronDown,
  ChevronUp,
  Clock3,
  Edit2,
  Plus,
  Trash2,
} from 'lucide-react';

import { useForm } from 'react-hook-form';

import api from '@/lib/api';

import {
  Button,
} from '@/components/ui/button';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import {
  Input,
} from '@/components/ui/input';

import {
  Label,
} from '@/components/ui/label';

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

import 'react-calendar/dist/Calendar.css';

type AvailabilityPeriod = {
  id: string;
  startTime: string;
  endTime: string;
};

type Availability = {
  id: string;
  dayOfWeek: number;
  isActive: boolean;
  periods: AvailabilityPeriod[];
};

type AvailabilityException = {
  id: string;
  date: string;
  allDay: boolean;
  startTime: string | null;
  endTime: string | null;
  reason: string | null;
};

type PeriodForm = {
  startTime: string;
  endTime: string;
};

type BlockForm = {
  startTime: string;
  endTime: string;
  reason: string;
};

const DAYS = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];

function getErrorMessage(
  error: unknown,
  fallback: string,
) {
  const axiosError = error as {
    response?: {
      data?: {
        message?: string | string[];
      };
    };
  };

  const message =
    axiosError.response?.data?.message;

  if (Array.isArray(message)) {
    return message.join('\n');
  }

  return message ?? fallback;
}

function exceptionDateKey(
  exception: AvailabilityException,
) {
  return exception.date.substring(0, 10);
}

export default function AvailabilityPage() {
  const [
    availabilities,
    setAvailabilities,
  ] = useState<Record<number, Availability>>({});

  const [
    exceptions,
    setExceptions,
  ] = useState<AvailabilityException[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    saving,
    setSaving,
  ] = useState(false);

  /*
   * Apenas usado no mobile.
   *
   * No desktop os cards sempre ficam abertos
   * através de sm:block.
   */
  const [
    expandedDays,
    setExpandedDays,
  ] = useState<Set<number>>(new Set());

  const [
    selectedDate,
    setSelectedDate,
  ] = useState(
    format(new Date(), 'yyyy-MM-dd'),
  );

  /*
   * Sheet dos períodos.
   */
  const [
    periodSheetOpen,
    setPeriodSheetOpen,
  ] = useState(false);

  const [
    selectedDay,
    setSelectedDay,
  ] = useState<number | null>(null);

  const [
    editingPeriod,
    setEditingPeriod,
  ] =
    useState<AvailabilityPeriod | null>(
      null,
    );

  /*
   * Sheet dos bloqueios.
   */
  const [
    blockSheetOpen,
    setBlockSheetOpen,
  ] = useState(false);

  const {
    register: registerPeriod,
    handleSubmit: handlePeriodSubmit,
    reset: resetPeriod,
  } = useForm<PeriodForm>({
    defaultValues: {
      startTime: '08:00',
      endTime: '18:00',
    },
  });

  const {
    register: registerBlock,
    handleSubmit: handleBlockSubmit,
    reset: resetBlock,
  } = useForm<BlockForm>({
    defaultValues: {
      startTime: '10:00',
      endTime: '12:00',
      reason: '',
    },
  });

  const calendarStart = format(
    new Date(),
    'yyyy-MM-dd',
  );

  const calendarEnd = format(
    addMonths(new Date(), 2),
    'yyyy-MM-dd',
  );

  /*
   * ========================================================
   * MOBILE ACCORDION
   * ========================================================
   */

  const toggleDayExpanded = (
    dayOfWeek: number,
  ) => {
    setExpandedDays((current) => {
      const next = new Set(current);

      if (next.has(dayOfWeek)) {
        next.delete(dayOfWeek);
      } else {
        next.add(dayOfWeek);
      }

      return next;
    });
  };

  /*
   * ========================================================
   * LOAD
   * ========================================================
   */

  const fetchAvailabilities =
    useCallback(async () => {
      const response =
        await api.get<Availability[]>(
          '/availabilities',
        );

      const map: Record<
        number,
        Availability
      > = {};

      for (
        const availability of
        response.data ?? []
      ) {
        map[availability.dayOfWeek] =
          availability;
      }

      setAvailabilities(map);
    }, []);

  const fetchExceptions =
    useCallback(async () => {
      const response =
        await api.get<
          AvailabilityException[]
        >(
          '/availabilities/exceptions',
          {
            params: {
              startDate: calendarStart,
              endDate: calendarEnd,
            },
          },
        );

      setExceptions(
        response.data ?? [],
      );
    }, [calendarStart, calendarEnd]);

  const reload =
    useCallback(async () => {
      await Promise.all([
        fetchAvailabilities(),
        fetchExceptions(),
      ]);
    }, [
      fetchAvailabilities,
      fetchExceptions,
    ]);

  useEffect(() => {
    const load = async () => {
      try {
        await reload();
      } catch (error) {
        console.error(
          'Erro ao carregar disponibilidade:',
          error,
        );
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [reload]);

  /*
   * ========================================================
   * PERÍODOS
   * ========================================================
   */

  const openPeriodSheet = (
    dayOfWeek: number,
    period?: AvailabilityPeriod,
  ) => {
    setSelectedDay(dayOfWeek);

    /*
     * Se o usuário abrir um período no mobile,
     * mantém aquele dia expandido.
     */
    setExpandedDays((current) => {
      const next = new Set(current);
      next.add(dayOfWeek);
      return next;
    });

    if (period) {
      setEditingPeriod(period);

      resetPeriod({
        startTime: period.startTime,
        endTime: period.endTime,
      });
    } else {
      setEditingPeriod(null);

      resetPeriod({
        startTime: '08:00',
        endTime: '18:00',
      });
    }

    setPeriodSheetOpen(true);
  };

  const savePeriod = async (
    data: PeriodForm,
  ) => {
    if (selectedDay === null) {
      return;
    }

    setSaving(true);

    try {
      let availability =
        availabilities[selectedDay];

      /*
       * Se o dia ainda não existe,
       * cria Availability primeiro.
       */
      if (!availability) {
        const response =
          await api.post<Availability>(
            '/availabilities',
            {
              dayOfWeek: selectedDay,
              isActive: true,
            },
          );

        availability = response.data;
      }

      if (editingPeriod) {
        await api.patch(
          `/availabilities/periods/${editingPeriod.id}`,
          data,
        );
      } else {
        await api.post(
          `/availabilities/${availability.id}/periods`,
          data,
        );
      }

      await fetchAvailabilities();

      setPeriodSheetOpen(false);
    } catch (error) {
      console.error(
        'Erro ao salvar período:',
        error,
      );

      alert(
        getErrorMessage(
          error,
          'Erro ao salvar horário.',
        ),
      );
    } finally {
      setSaving(false);
    }
  };

  const removePeriod = async (
    id: string,
  ) => {
    if (
      !window.confirm(
        'Deseja remover este período?',
      )
    ) {
      return;
    }

    try {
      await api.delete(
        `/availabilities/periods/${id}`,
      );

      await fetchAvailabilities();
    } catch (error) {
      alert(
        getErrorMessage(
          error,
          'Erro ao remover horário.',
        ),
      );
    }
  };

  const toggleAvailability = async (
    availability: Availability,
  ) => {
    try {
      await api.patch(
        `/availabilities/${availability.id}`,
        {
          isActive:
            !availability.isActive,
        },
      );

      await fetchAvailabilities();
    } catch (error) {
      alert(
        getErrorMessage(
          error,
          'Erro ao alterar disponibilidade.',
        ),
      );
    }
  };

  const removeAvailability = async (
    availability: Availability,
  ) => {
    if (
      !window.confirm(
        `Remover toda a configuração de ${DAYS[availability.dayOfWeek]}?`,
      )
    ) {
      return;
    }

    try {
      await api.delete(
        `/availabilities/${availability.id}`,
      );

      await fetchAvailabilities();
    } catch (error) {
      alert(
        getErrorMessage(
          error,
          'Erro ao remover configuração.',
        ),
      );
    }
  };

  /*
   * ========================================================
   * BLOQUEIOS
   * ========================================================
   */

  const selectedDateObject =
    useMemo(
      () =>
        parse(
          selectedDate,
          'yyyy-MM-dd',
          new Date(),
        ),
      [selectedDate],
    );

  const selectedAvailability =
    availabilities[
      selectedDateObject.getDay()
    ];

  const selectedExceptions =
    exceptions.filter(
      (exception) =>
        exceptionDateKey(exception) ===
        selectedDate,
    );

  const fullDayException =
    selectedExceptions.find(
      (exception) =>
        exception.allDay,
    );

  const openBlockSheet = () => {
    const firstPeriod =
      selectedAvailability?.periods?.[0];

    resetBlock({
      startTime:
        firstPeriod?.startTime ??
        '10:00',

      endTime:
        firstPeriod?.endTime ??
        '12:00',

      reason: '',
    });

    setBlockSheetOpen(true);
  };

  const saveBlock = async (
    data: BlockForm,
  ) => {
    setSaving(true);

    try {
      await api.post(
        '/availabilities/exceptions',
        {
          date: selectedDate,
          allDay: false,
          startTime: data.startTime,
          endTime: data.endTime,

          reason:
            data.reason.trim() ||
            undefined,
        },
      );

      await fetchExceptions();

      setBlockSheetOpen(false);
    } catch (error) {
      console.error(
        'Erro ao criar bloqueio:',
        error,
      );

      alert(
        getErrorMessage(
          error,
          'Erro ao criar bloqueio.',
        ),
      );
    } finally {
      setSaving(false);
    }
  };

  const blockWholeDay =
    async () => {
      if (
        !window.confirm(
          `Deseja deixar ${format(
            selectedDateObject,
            'dd/MM/yyyy',
          )} indisponível o dia inteiro?`,
        )
      ) {
        return;
      }

      setSaving(true);

      try {
        await api.post(
          '/availabilities/exceptions',
          {
            date: selectedDate,
            allDay: true,
            reason:
              'Dia indisponível',
          },
        );

        await fetchExceptions();
      } catch (error) {
        alert(
          getErrorMessage(
            error,
            'Erro ao bloquear o dia.',
          ),
        );
      } finally {
        setSaving(false);
      }
    };

  const removeException = async (
    id: string,
  ) => {
    if (
      !window.confirm(
        'Deseja remover este bloqueio?',
      )
    ) {
      return;
    }

    try {
      await api.delete(
        `/availabilities/exceptions/${id}`,
      );

      await fetchExceptions();
    } catch (error) {
      alert(
        getErrorMessage(
          error,
          'Erro ao remover bloqueio.',
        ),
      );
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
      <div className="space-y-8">
        {/* ===================================================
            HORÁRIO SEMANAL
        =================================================== */}

        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Disponibilidade
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Configure sua rotina semanal e bloqueios para datas específicas.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
            {DAYS.map(
              (
                dayName,
                dayOfWeek,
              ) => {
                const availability =
                  availabilities[
                    dayOfWeek
                  ];

                const isExpanded =
                  expandedDays.has(
                    dayOfWeek,
                  );

                const periodsCount =
                  availability?.periods
                    .length ?? 0;

                return (
                  <Card
                    key={
                      dayOfWeek
                    }
                    className="overflow-hidden transition-shadow hover:shadow-md"
                  >
                    <CardHeader className="p-4 sm:pb-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <CardTitle className="text-base">
                            {
                              dayName
                            }
                          </CardTitle>

                          {/*
                            Resumo exibido somente
                            no mobile quando fechado.
                          */}
                          <p className="mt-1 text-xs text-gray-500 sm:hidden">
                            {periodsCount >
                            0
                              ? `${periodsCount} ${
                                  periodsCount ===
                                  1
                                    ? 'período'
                                    : 'períodos'
                                }`
                              : 'Não configurado'}
                          </p>
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          {availability && (
                            <button
                              type="button"
                              onClick={() =>
                                toggleAvailability(
                                  availability,
                                )
                              }
                              className={`cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition ${
                                availability.isActive
                                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                              }`}
                            >
                              {availability.isActive
                                ? 'Ativo'
                                : 'Inativo'}
                            </button>
                          )}

                          {/*
                            A seta só aparece
                            no mobile.
                          */}
                          <button
                            type="button"
                            onClick={() =>
                              toggleDayExpanded(
                                dayOfWeek,
                              )
                            }
                            className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-600 transition hover:bg-gray-100 sm:hidden"
                            aria-label={
                              isExpanded
                                ? `Fechar ${dayName}`
                                : `Abrir ${dayName}`
                            }
                            aria-expanded={
                              isExpanded
                            }
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-5 w-5" />
                            ) : (
                              <ChevronDown className="h-5 w-5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </CardHeader>

                    {/*
                      MOBILE:
                      depende de isExpanded.

                      TABLET/DESKTOP:
                      sm:block força o conteúdo
                      a permanecer aberto.
                    */}
                    <CardContent
                      className={`space-y-3 px-4 pb-4 pt-0 ${
                        isExpanded
                          ? 'block'
                          : 'hidden'
                      } sm:block`}
                    >
                      {availability?.periods
                        .length ? (
                        <div className="space-y-2">
                          {availability.periods.map(
                            (
                              period,
                            ) => (
                              <div
                                key={
                                  period.id
                                }
                                className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5"
                              >
                                <span className="flex items-center gap-2 text-sm text-gray-700">
                                  <Clock3 className="h-4 w-4 text-gray-500" />

                                  {
                                    period.startTime
                                  }{' '}
                                  -{' '}
                                  {
                                    period.endTime
                                  }
                                </span>

                                <div className="flex gap-1">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 w-8 p-0"
                                    onClick={() =>
                                      openPeriodSheet(
                                        dayOfWeek,
                                        period,
                                      )
                                    }
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Button>

                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 w-8 p-0"
                                    onClick={() =>
                                      removePeriod(
                                        period.id,
                                      )
                                    }
                                  >
                                    <Trash2 className="h-4 w-4 text-red-600" />
                                  </Button>
                                </div>
                              </div>
                            ),
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400">
                          Nenhum período configurado.
                        </p>
                      )}

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() =>
                          openPeriodSheet(
                            dayOfWeek,
                          )
                        }
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Adicionar período
                      </Button>

                      {availability && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="w-full text-red-500 hover:bg-red-50 hover:text-red-600"
                          onClick={() =>
                            removeAvailability(
                              availability,
                            )
                          }
                        >
                          Remover configuração
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              },
            )}
          </div>
        </section>

        {/* ===================================================
            CALENDÁRIO
        =================================================== */}

        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Calendário de disponibilidade
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Bloqueie dias ou períodos específicos sem alterar sua rotina semanal.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(340px,440px)_1fr]">
            <Card className="overflow-hidden border-gray-200 shadow-sm">
              <CardContent className="p-3 sm:p-4">
                <Calendar
                  locale="pt-BR"
                  className="availability-calendar"
                  minDate={
                    new Date()
                  }
                  maxDate={addMonths(
                    new Date(),
                    2,
                  )}
                  minDetail="month"
                  maxDetail="month"
                  prev2Label={null}
                  next2Label={null}
                  value={
                    selectedDateObject
                  }
                  onClickDay={(
                    date,
                  ) =>
                    setSelectedDate(
                      format(
                        date,
                        'yyyy-MM-dd',
                      ),
                    )
                  }
                  tileContent={({
                    date,
                    view,
                  }) => {
                    if (
                      view !==
                      'month'
                    ) {
                      return null;
                    }

                    const key =
                      format(
                        date,
                        'yyyy-MM-dd',
                      );

                    const dayAvailability =
                      availabilities[
                        date.getDay()
                      ];

                    const dayExceptions =
                      exceptions.filter(
                        (
                          exception,
                        ) =>
                          exceptionDateKey(
                            exception,
                          ) ===
                          key,
                      );

                    const allDay =
                      dayExceptions.some(
                        (
                          exception,
                        ) =>
                          exception.allDay,
                      );

                    const partial =
                      dayExceptions.some(
                        (
                          exception,
                        ) =>
                          !exception.allDay,
                      );

                    return (
                      <div className="mt-1 flex justify-center">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            allDay
                              ? 'bg-red-500'
                              : partial
                                ? 'bg-orange-500'
                                : dayAvailability?.isActive &&
                                    dayAvailability.periods.length >
                                      0
                                  ? 'bg-green-500'
                                  : 'bg-gray-300'
                          }`}
                        />
                      </div>
                    );
                  }}
                />

                {/*
                  Legenda compacta.
                  No mobile quebra somente se
                  realmente faltar largura.
                */}
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl bg-gray-50 px-3 py-2.5 text-[11px] text-gray-600 sm:text-xs">
                  <span className="flex items-center gap-1.5 whitespace-nowrap">
                    <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
                    Atendimento
                  </span>

                  <span className="flex items-center gap-1.5 whitespace-nowrap">
                    <span className="h-2.5 w-2.5 rounded-full bg-orange-500" />
                    Parcial
                  </span>

                  <span className="flex items-center gap-1.5 whitespace-nowrap">
                    <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                    Bloqueado
                  </span>

                  <span className="flex items-center gap-1.5 whitespace-nowrap">
                    <span className="h-2.5 w-2.5 rounded-full border border-gray-400 bg-white" />
                    Sem atendimento
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* ===============================================
                DATA SELECIONADA
            =============================================== */}

            <Card className="border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">
                  {
                    DAYS[
                      selectedDateObject.getDay()
                    ]
                  }
                  ,{' '}
                  {format(
                    selectedDateObject,
                    'dd/MM/yyyy',
                  )}
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-5">
                <div>
                  <p className="mb-2 text-sm font-semibold text-gray-800">
                    Horário padrão
                  </p>

                  {selectedAvailability?.isActive &&
                  selectedAvailability.periods
                    .length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {selectedAvailability.periods.map(
                        (
                          period,
                        ) => (
                          <div
                            key={
                              period.id
                            }
                            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700"
                          >
                            <Clock3 className="h-4 w-4 text-gray-500" />

                            {
                              period.startTime
                            }{' '}
                            -{' '}
                            {
                              period.endTime
                            }
                          </div>
                        ),
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">
                      Não há expediente configurado para este dia da semana.
                    </p>
                  )}
                </div>

                <div>
                  <p className="mb-2 text-sm font-semibold text-gray-800">
                    Bloqueios desta data
                  </p>

                  {selectedExceptions.length ===
                  0 ? (
                    <p className="text-sm text-gray-500">
                      Nenhum bloqueio.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {selectedExceptions.map(
                        (
                          exception,
                        ) => (
                          <div
                            key={
                              exception.id
                            }
                            className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white p-3"
                          >
                            <div>
                              <p className="text-sm font-medium text-gray-800">
                                {exception.allDay
                                  ? 'Dia inteiro indisponível'
                                  : `${exception.startTime} - ${exception.endTime}`}
                              </p>

                              {exception.reason && (
                                <p className="mt-0.5 text-xs text-gray-500">
                                  {
                                    exception.reason
                                  }
                                </p>
                              )}
                            </div>

                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 shrink-0 p-0"
                              onClick={() =>
                                removeException(
                                  exception.id,
                                )
                              }
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        ),
                      )}
                    </div>
                  )}
                </div>

                {selectedAvailability?.isActive &&
                  selectedAvailability.periods
                    .length > 0 &&
                  !fullDayException && (
                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={
                          openBlockSheet
                        }
                        className="w-full sm:w-auto"
                      >
                        <Clock3 className="mr-2 h-4 w-4" />
                        Bloquear período
                      </Button>

                      <Button
                        type="button"
                        variant="destructive"
                        disabled={
                          saving
                        }
                        onClick={
                          blockWholeDay
                        }
                        className="w-full sm:w-auto"
                      >
                        <Ban className="mr-2 h-4 w-4" />
                        Indisponível o dia inteiro
                      </Button>
                    </div>
                  )}
              </CardContent>
            </Card>
          </div>
        </section>

        {/* ===================================================
            SHEET PERÍODO
        =================================================== */}

        <Sheet
          open={
            periodSheetOpen
          }
          onOpenChange={
            setPeriodSheetOpen
          }
        >
          <SheetContent className="p-6 sm:max-w-[425px]">
            <SheetHeader>
              <SheetTitle>
                {editingPeriod
                  ? 'Editar período'
                  : 'Adicionar período'}
              </SheetTitle>

              <SheetDescription>
                {selectedDay !==
                  null &&
                  DAYS[
                    selectedDay
                  ]}
              </SheetDescription>
            </SheetHeader>

            <form
              onSubmit={handlePeriodSubmit(
                savePeriod,
              )}
              className="mt-6 space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>
                    Início
                  </Label>

                  <Input
                    type="time"
                    {...registerPeriod(
                      'startTime',
                      {
                        required:
                          true,
                      },
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label>
                    Fim
                  </Label>

                  <Input
                    type="time"
                    {...registerPeriod(
                      'endTime',
                      {
                        required:
                          true,
                      },
                    )}
                  />
                </div>
              </div>

              <SheetFooter>
                <Button
                  type="submit"
                  disabled={
                    saving
                  }
                >
                  {saving
                    ? 'Salvando...'
                    : 'Salvar'}
                </Button>
              </SheetFooter>
            </form>
          </SheetContent>
        </Sheet>

        {/* ===================================================
            SHEET BLOQUEIO
        =================================================== */}

        <Sheet
          open={
            blockSheetOpen
          }
          onOpenChange={
            setBlockSheetOpen
          }
        >
          <SheetContent className="p-6 sm:max-w-106.25">
            <SheetHeader>
              <SheetTitle>
                Bloquear período
              </SheetTitle>

              <SheetDescription>
                {format(
                  selectedDateObject,
                  'dd/MM/yyyy',
                )}
              </SheetDescription>
            </SheetHeader>

            <form
              onSubmit={handleBlockSubmit(
                saveBlock,
              )}
              className="mt-6 space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>
                    Início
                  </Label>

                  <Input
                    type="time"
                    {...registerBlock(
                      'startTime',
                      {
                        required:
                          true,
                      },
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label>
                    Fim
                  </Label>

                  <Input
                    type="time"
                    {...registerBlock(
                      'endTime',
                      {
                        required:
                          true,
                      },
                    )}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>
                  Motivo
                </Label>

                <Input
                  placeholder="Ex.: Consulta médica"
                  {...registerBlock(
                    'reason',
                  )}
                />
              </div>

              <SheetFooter>
                <Button
                  type="submit"
                  disabled={
                    saving
                  }
                >
                  {saving
                    ? 'Salvando...'
                    : 'Criar bloqueio'}
                </Button>
              </SheetFooter>
            </form>
          </SheetContent>
        </Sheet>
      </div>

      {/*
        Estilo do react-calendar limitado
        a esta classe.
      */}
      <style jsx global>{`
        .availability-calendar {
          width: 100%;
          max-width: none;
          border: 0;
          background: transparent;
          font-family: inherit;
        }

        .availability-calendar
          .react-calendar__navigation {
          display: flex;
          align-items: center;
          gap: 6px;
          height: 44px;
          margin-bottom: 8px;
        }

        .availability-calendar
          .react-calendar__navigation
          button {
          min-width: 40px;
          border-radius: 10px;
          color: #374151;
          font-size: 14px;
          font-weight: 600;
          transition:
            background-color 0.15s ease,
            color 0.15s ease;
        }

        .availability-calendar
          .react-calendar__navigation
          button:hover:not(:disabled),
        .availability-calendar
          .react-calendar__navigation
          button:focus:not(:disabled) {
          background: #f3f4f6;
        }

        .availability-calendar
          .react-calendar__navigation
          button:disabled {
          background: transparent;
          color: #d1d5db;
        }

        .availability-calendar
          .react-calendar__navigation__label {
          flex-grow: 1 !important;
          background: #f8fafc;
        }

        .availability-calendar
          .react-calendar__month-view__weekdays {
          margin-bottom: 4px;
          color: #6b7280;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
        }

        .availability-calendar
          .react-calendar__month-view__weekdays__weekday {
          padding: 7px 2px;
        }

        .availability-calendar
          .react-calendar__month-view__weekdays__weekday
          abbr {
          text-decoration: none;
        }

        .availability-calendar
          .react-calendar__month-view__days {
          gap: 0;
        }

        .availability-calendar
          .react-calendar__tile {
          position: relative;
          min-height: 48px;
          border-radius: 10px;
          padding: 7px 3px 4px;
          color: #374151;
          font-size: 13px;
          transition:
            background-color 0.15s ease,
            color 0.15s ease,
            transform 0.15s ease;
        }

        .availability-calendar
          .react-calendar__tile:hover:not(
            :disabled
          ) {
          background: #eff6ff;
          color: #1d4ed8;
        }

        .availability-calendar
          .react-calendar__tile:focus {
          background: #eff6ff;
        }

        .availability-calendar
          .react-calendar__month-view__days__day--neighboringMonth {
          color: #d1d5db;
        }

        .availability-calendar
          .react-calendar__tile--now {
          background: #f3f4f6;
          color: #111827;
          font-weight: 700;
        }

        .availability-calendar
          .react-calendar__tile--active,
        .availability-calendar
          .react-calendar__tile--active:hover,
        .availability-calendar
          .react-calendar__tile--active:focus {
          background: #2563eb;
          color: white;
          font-weight: 700;
        }

        .availability-calendar
          .react-calendar__tile:disabled {
          background: transparent;
          color: #d1d5db;
        }

        @media (max-width: 639px) {
          .availability-calendar
            .react-calendar__navigation {
            height: 40px;
            margin-bottom: 5px;
          }

          .availability-calendar
            .react-calendar__navigation
            button {
            min-width: 36px;
            font-size: 13px;
          }

          .availability-calendar
            .react-calendar__tile {
            min-height: 43px;
            border-radius: 9px;
            padding: 6px 2px 3px;
            font-size: 12px;
          }

          .availability-calendar
            .react-calendar__month-view__weekdays {
            font-size: 9px;
          }
        }
      `}</style>
    </>
  );
}