'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import type { Appointment } from '@/types';
import { format, isValid } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const statusConfig: Record<string, { label: string; variant: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' }> = {
  PENDING: { label: 'Pendente', variant: 'secondary' },
  CONFIRMED: { label: 'Confirmado', variant: 'default' },
  CANCELLED: { label: 'Cancelado', variant: 'destructive' },
  COMPLETED: { label: 'Concluído', variant: 'outline' },
  NO_SHOW: { label: 'No Show', variant: 'outline' },
};

function formatWhatsApp(phone: string) {
  const clean = phone.replace(/\D/g, '');
  let f = clean;
  if (f.length === 11 && !f.startsWith('55')) f = '55' + f;
  else if (f.length === 10) f = '55' + f;
  return `https://wa.me/${f}`;
}

export default function DashboardPage() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/appointments')
      .then((res) => setAppointments(res.data))
      .catch((err) => console.error('Erro ao buscar agendamentos:', err))
      .finally(() => setLoading(false));
  }, []);

  const handleCancel = async (id: string) => {
    if (!window.confirm('Deseja realmente cancelar este agendamento?')) return;
    try {
      await api.patch(`/appointments/${id}/status`, { status: 'CANCELLED' });
      setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status: 'CANCELLED' } : a)));
    } catch (err) {
      alert('Erro ao cancelar agendamento');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Meus Agendamentos</h2>
        <Badge variant="secondary">{appointments.length} agendamentos</Badge>
      </div>

      {appointments.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-gray-500">Nenhum agendamento encontrado.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {appointments.map((apt) => (
            <Card key={apt.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{apt.customer?.name}</CardTitle>
                    {apt.customer?.phone && (
                      <a
                        href={formatWhatsApp(apt.customer.phone)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-green-600 hover:text-green-700 cursor-pointer font-medium"
                      >
                        📱 {apt.customer.phone}
                      </a>
                    )}
                  </div>
                  <Badge variant={statusConfig[apt.status]?.variant || 'secondary'}>
                    {statusConfig[apt.status]?.label || apt.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-500">
                    {isValid(new Date(apt.start)) && isValid(new Date(apt.end))
                      ? `${format(new Date(apt.start), 'dd/MM HH:mm')} - ${format(new Date(apt.end), 'HH:mm')}`
                      : 'Data inválida'}
                  </p>
                  {(apt.status === 'CONFIRMED' || apt.status === 'PENDING') && (
                    <Button 
                      variant="destructive" 
                      size="sm"
                      className="cursor-pointer hover:bg-red-700 transition-colors"
                      onClick={() => handleCancel(apt.id)}
                    >
                      Cancelar
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}