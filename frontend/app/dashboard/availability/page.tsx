'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import type { Availability } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';
import { Trash2, Plus, Edit2 } from 'lucide-react';

const DAYS_CONFIG = [
  { id: 0, name: 'Domingo' },
  { id: 1, name: 'Segunda' },
  { id: 2, name: 'Terça' },
  { id: 3, name: 'Quarta' },
  { id: 4, name: 'Quinta' },
  { id: 5, name: 'Sexta' },
  { id: 6, name: 'Sábado' }
];

interface AvailabilityFormValues {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

export default function AvailabilityPage() {
  const [availabilities, setAvailabilities] = useState<Record<number, Availability>>({});
  const [loading, setLoading] = useState(true);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { register, handleSubmit, reset, setValue } = useForm<AvailabilityFormValues>();

  const fetchAvailabilities = async () => {
    try {
      const res = await api.get('/availabilities');
      const data = res.data as Availability[];
      const map: Record<number, Availability> = {};

      data.forEach((a) => (map[a.dayOfWeek] = a));
      setAvailabilities(map);
    } catch (err) {
      console.error('Erro ao buscar disponibilidades:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAvailabilities();
  }, []);

  const handleOpenModal = (dayId: number, current?: Availability) => {
    if (current) {
      setEditingId(current.id);
      setValue('dayOfWeek', current.dayOfWeek);
      setValue('startTime', current.startTime);
      setValue('endTime', current.endTime);
      setValue('isActive', current.isActive);
    } else {
      setEditingId(null);
      reset({
        dayOfWeek: dayId,
        startTime: '08:00',
        endTime: '18:00',
        isActive: true,
      });
    }
    setIsSheetOpen(true);
  };

  const onSubmit = async (data: AvailabilityFormValues) => {
    try {
      if (editingId) {
        await api.patch(`/availabilities/${editingId}`, data);
      } else {
        await api.post('/availabilities', data);
      }
      fetchAvailabilities();
      setIsSheetOpen(false);
    } catch (err) {
      alert('Erro ao salvar disponibilidade');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja remover este horário?')) return;
    try {
      await api.delete(`/availabilities/${id}`);
      fetchAvailabilities();
    } catch (err) {
      alert('Erro ao excluir');
    }
  };

  const toggleActive = async (dayOfWeek: number) => {
    const current = availabilities[dayOfWeek];
    if (!current) return;
    try {
      await api.patch(`/availabilities/${current.id}`, { isActive: !current.isActive });
      fetchAvailabilities(); 
    } catch (err) {
      alert('Erro ao alternar status');
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Disponibilidade Semanal</h2>
        <Button onClick={() => handleOpenModal(0)} className="cursor-pointer hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4 mr-2" /> Adicionar Horário
        </Button>
      </div>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="sm:max-w-[425px]">
          <SheetHeader>
            <SheetTitle>{editingId ? 'Editar Horário' : 'Novo Horário'}</SheetTitle>
            <SheetDescription>Configure o atendimento para um dia da semana.</SheetDescription>
          </SheetHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="dayOfWeek">Dia da Semana</Label>
              <select 
                id="dayOfWeek"
                className="w-full p-2 border rounded-md text-black bg-white"
                {...register('dayOfWeek', { valueAsNumber: true })}
              >
                {DAYS_CONFIG.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startTime">Início</Label>
                <Input id="startTime" type="time" {...register('startTime')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">Fim</Label>
                <Input id="endTime" type="time" {...register('endTime')} />
              </div>
            </div>
            <div className="flex items-center space-x-2">
               <input 
                  type="checkbox" 
                className="w-4 h-4" 
                  {...register('isActive', { setValueAs: (v) => !!v })} 
                />
               <Label htmlFor="isActive">Ativo</Label>
            </div>
            <SheetFooter className="pt-4">
              <Button type="submit">Salvar</Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {DAYS_CONFIG.map((dia) => {
                  const avail = availabilities[dia.id];
          return (
            <Card key={dia.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{dia.name}</CardTitle>
              </CardHeader>
              <CardContent>
                {avail ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">🕐 {avail.startTime} - {avail.endTime}</span>
                   <button
                      onClick={() => toggleActive(avail.dayOfWeek)}
                      className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 transition ${avail.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}
                    >
                      {avail.isActive ? 'Ativo' : 'Inativo'}
                    </button>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleOpenModal(dia.id, avail)} className="cursor-pointer hover:bg-gray-100 transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(avail.id)} className="cursor-pointer hover:bg-red-700 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button 
                    variant="ghost" 
                    className="w-full text-gray-400 hover:text-blue-600"
                    onClick={() => handleOpenModal(dia.id)}
                  >
                    <Plus className="w-4 h-4 mr-2" /> Configurar
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}