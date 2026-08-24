'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import type { Professional, Service } from '@/types';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SlotItem {
  time: string;
  available: boolean;
}

export default function ProfessionalPage({ params }: { params: Promise<{ slug: string }> }) {
  const [slug, setSlug] = useState<string>('');
  const [professional, setProfessional] = useState<Professional | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [slots, setSlots] = useState<SlotItem[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [selectedService, setSelectedService] = useState<string>('');
  const [clientName, setClientName] = useState('');
  const [clientWhats, setClientWhats] = useState('');
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    (async () => {
      const p = await params;
      setSlug(p.slug);
      const res = await api.get(`/professionals/slug/${p.slug}`);
      setProfessional(res.data.professional || res.data);
      const res2 = await api.get(`/services/professional/${res.data.id}`);
      setServices(res2.data);
      setLoading(false);
    })();
  }, [params]);

  useEffect(() => {
    if (!selectedDate || !professional) return;
    setSelectedSlot('');
    api.get('/appointments/available', {
      params: { date: selectedDate, professionalId: professional.id },
    }).then((res) => setSlots(res.data.slots || []));
  }, [selectedDate, professional]);

  const handleBooking = async () => {
    if (!selectedService || !selectedSlot || !professional) return;
    setBooking(true);
    try {
      const dateTime = `${selectedDate}T${selectedSlot}:00`;
      await api.post('/appointments', {
        professionalId: professional.id,
        serviceId: selectedService,
        dateTime,
        clientName,
        clientWhats,
      });
      window.location.href = `/agendamentos?phone=${encodeURIComponent(clientWhats)}`;
    } catch {
      alert('Erro ao agendar. Tente outro horário.');
    } finally {
      setBooking(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  if (!professional) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Profissional não encontrada.</p>
      </div>
    );
  }

  const theme = professional.themeColors;
  const daysList = Array.from({ length: 14 }, (_, i) => {
    const d = addDays(new Date(), i);
    return { value: format(d, 'yyyy-MM-dd'), label: format(d, "EEE, dd MMM", { locale: ptBR }) };
  });

  return (
    <div style={{ background: theme.accent || '#fff' }} className="min-h-screen">
      <header style={{ backgroundColor: theme.primary || '#FF69B4' }} className="text-white py-12 px-6 text-center">
        <h1 className="text-4xl font-bold">{professional.name}</h1>
        <p className="mt-2 opacity-80">{professional.bio}</p>
        {professional.instagram && (
          <a href={`https://instagram.com/${professional.instagram.replace('@', '')}`} target="_blank" rel="noreferrer" className="inline-block mt-4 underline opacity-90">
            {professional.instagram}
          </a>
        )}
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8 -mt-8">
        {success ? (
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-2xl font-bold mb-2">Agendamento Realizado!</h2>
            <p className="text-gray-600">Seu agendamento foi registrado com sucesso.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg p-8 space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">Agendar Horário</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">1. Escolha o Serviço</label>
              <select className="w-full px-4 py-2 border rounded-lg" value={selectedService} onChange={(e) => setSelectedService(e.target.value)}>
                <option value="">Selecione...</option>
                {services.filter((s) => s.isActive).map((s) => (
                  <option key={s.id} value={s.id}>{s.name} - R${s.price.toFixed(2)} ({s.durationMinutes}min)</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">2. Escolha a Data</label>
              <select className="w-full px-4 py-2 border rounded-lg" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}>
                <option value="">Selecione...</option>
                {daysList.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>

            {selectedDate && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">3. Escolha o Horário</label>
                <div className="grid grid-cols-4 gap-2">
                  {slots.map((slot) => (
                    <button
                      key={slot.time}
                      disabled={!slot.available}
                      onClick={() => setSelectedSlot(slot.time)}
                      className={`py-2 px-3 rounded-lg text-sm font-medium transition ${
                        !slot.available
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : selectedSlot === slot.time
                          ? 'bg-pink-500 text-white'
                          : 'bg-green-50 text-green-700 hover:bg-green-100'
                      }`}
                    >
                      {slot.time}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">4. Seus Dados</label>
              <input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)} className="w-full px-4 py-2 border rounded-lg mb-3" placeholder="Seu nome" />
              <input type="tel" value={clientWhats} onChange={(e) => setClientWhats(e.target.value)} className="w-full px-4 py-2 border rounded-lg" placeholder="WhatsApp (ex: +5511999999999)" />
            </div>

            <button
              onClick={handleBooking}
              disabled={booking || !selectedService || !selectedDate || !selectedSlot || !clientName || !clientWhats}
              className="w-full py-3 rounded-lg font-semibold text-white transition disabled:opacity-50"
              style={{ backgroundColor: theme.primary || '#FF69B4' }}
            >
              {booking ? 'Agendando...' : 'Confirmar Agendamento'}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}