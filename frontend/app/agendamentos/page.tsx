'use client';

import { useState } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AgendamentosPublicos() {
  const [phone, setPhone] = useState('');
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const search = async () => {
    if (!phone) return;
    setLoading(true);
    try {
      const res = await api.get('/appointments/public', { params: { phone } });
      let data = res.data;
      if (Array.isArray(data)) {
        data = data.filter(a => a.status !== 'CANCELLED' && new Date(a.start) >= new Date());
      }
      setAppointments(data);
    } catch {
      alert('Nenhum agendamento encontrado');
    } finally {
      setLoading(false);
    }
  };

  const cancel = async (id: string) => {
    if (!confirm('Cancelar este agendamento?')) return;
    await api.patch(`/appointments/${id}/status`, { status: 'CANCELLED' });
    search();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader><CardTitle>Consultar Agendamentos</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Input placeholder="WhatsApp (ex: 11999999999)" value={phone} onChange={e => setPhone(e.target.value)} />
          <Button onClick={search} disabled={loading} className="w-full cursor-pointer hover:bg-blue-700 transition-colors">Buscar</Button>
          {appointments.length > 0 && (
            <div className="space-y-2">
              {appointments.map(a => {
                const start = new Date(a.start);
                if (isNaN(start.getTime())) return null;
                return (
                  <div key={a.id} className="border p-3 rounded">
                    <p><strong>{a.service?.name}</strong></p>
                    <p>{start.toLocaleString('pt-BR')}</p>
                    <p>Status: {a.status}</p>
                    {['PENDING','CONFIRMED'].includes(a.status) && (
                      <Button size="sm" variant="destructive" onClick={() => cancel(a.id)} className="mt-2 cursor-pointer hover:bg-red-700 transition-colors">Cancelar</Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}