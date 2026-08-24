'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import type { Service } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { Trash2, Plus, Edit2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function ServicesPage() {
  const { user } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  const { register, handleSubmit, reset, setValue } = useForm<{
    name: string;
    description: string;
    durationMinutes: number;
    price: number;
    professionalId: string;
  }>({
    defaultValues: {
      name: '',
      description: '',
      durationMinutes: 30,
      price: 0,
      professionalId: user?.professional?.id || '',
    }
  });

  useEffect(() => {
    fetchServices();
  }, [user]);

  const fetchServices = async () => {
    try {
      const res = await api.get('/services');
      setServices(res.data);
    } catch (err) {
      console.error('Erro ao buscar serviços:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (service: Service | null = null) => {
    if (service) {
      setEditingService(service);
      setValue('name', service.name);
      setValue('description', service.description);
      setValue('durationMinutes', service.durationMinutes);
      setValue('price', service.price);
    } else {
      setEditingService(null);
      reset({ 
        name: '', 
        description: '', 
        durationMinutes: 30, 
        price: 0,
        professionalId: user?.professional?.id || ''
      });
    }
    setIsSheetOpen(true);
  };

  const onSubmit = async (data: any) => {
    try {
      if (editingService) {
        await api.patch(`/services/${editingService.id}`, data);
      } else {
        await api.post('/services', data);
      }
      fetchServices();
      setIsSheetOpen(false);
    } catch (err) {
      alert('Erro ao salvar serviço');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este serviço?')) return;
    try {
      await api.delete(`/services/${id}`);
      fetchServices();
    } catch (err) {
      alert('Erro ao excluir serviço');
    }
  };

  const toggleActive = async (id: string, current: boolean) => {
    await api.patch(`/services/${id}`, { isActive: !current });
    setServices((prev) => prev.map((s) => (s.id === id ? { ...s, isActive: !current } : s)));
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
        <h2 className="text-2xl font-bold text-gray-900">Meus Serviços</h2>
        <Button onClick={() => handleOpenModal()} className="cursor-pointer hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4 mr-2" /> Novo Serviço
        </Button>
      </div>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="sm:max-w-[425px] overflow-y-auto p-6">
          <SheetHeader className="mb-4">
            <SheetTitle>{editingService ? 'Editar Serviço' : 'Novo Serviço'}</SheetTitle>
          <SheetDescription>Preencha os detalhes do serviço.</SheetDescription>
          </SheetHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" {...register('name', { required: true })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea id="description" {...register('description')} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="durationMinutes">Duração (min)</Label>
                <Input id="durationMinutes" type="number" {...register('durationMinutes', { valueAsNumber: true })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Preço (R$)</Label>
                <Input id="price" type="number" step="0.01" {...register('price', { valueAsNumber: true })} />
              </div>
            </div>
            <SheetFooter className="pt-4">
              <Button type="submit">Salvar</Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <div className="space-y-4">
        {services.map((service) => (
          <Card key={service.id}>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{service.name}</CardTitle>
                  <p className="text-sm text-gray-500 mt-1">{service.description}</p>
                </div>
                <button
                  onClick={() => toggleActive(service.id, service.isActive)}
                  className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 transition ${
                    service.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {service.isActive ? 'Ativo' : 'Inativo'}
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <div className="flex gap-3 text-sm text-gray-600">
                  <span>⏱ {service.durationMinutes} min</span>
                  <span className="font-semibold text-blue-600">R${service.price.toFixed(2)}</span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleOpenModal(service)} className="cursor-pointer hover:bg-gray-100 transition-colors">
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(service.id)} className="cursor-pointer hover:bg-red-700 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}