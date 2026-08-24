'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.professional) {
      api.get(`/professionals/${user.professional.id}`)
        .then(res => setProfile(res.data))
        .finally(() => setLoading(false));
    }
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch(`/professionals/${profile.id}`, profile);
      alert('Perfil atualizado!');
    } catch {
      alert('Erro ao atualizar perfil');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-12 text-center">Carregando...</div>;
  if (!profile) return <div className="p-12 text-center">Perfil não encontrado</div>;

  const updateField = (k: string, v: any) => setProfile((p: any) => ({ ...p, [k]: v }));

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-4">
      <h2 className="text-2xl font-bold">Perfil Profissional</h2>
      <Card>
        <CardHeader><CardTitle>Dados</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input value={profile.name || ''} onChange={e => updateField('name', e.target.value)} />
            </div>
            <div>
              <Label>Bio</Label>
              <Textarea value={profile.bio || ''} onChange={e => updateField('bio', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Instagram</Label>
                <Input value={profile.instagram || ''} onChange={e => updateField('instagram', e.target.value)} />
              </div>
              <div>
                <Label>Facebook</Label>
                <Input value={profile.facebook || ''} onChange={e => updateField('facebook', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Cor Primária</Label>
                <Input type="color" value={profile.themeColors?.primary || '#FF69B4'} onChange={e => updateField('themeColors', { ...profile.themeColors, primary: e.target.value })} />
              </div>
              <div>
                <Label>Cor Secundária</Label>
                <Input type="color" value={profile.themeColors?.secondary || '#fff'} onChange={e => updateField('themeColors', { ...profile.themeColors, secondary: e.target.value })} />
              </div>
              <div>
                <Label>Acento</Label>
                <Input type="color" value={profile.themeColors?.accent || '#FFE4E1'} onChange={e => updateField('themeColors', { ...profile.themeColors, accent: e.target.value })} />
              </div>
            </div>
            <div className="p-4 rounded border" style={{ background: profile.themeColors?.accent }}>
              <p>Preview do tema</p>
              <button type="button" className="mt-2 px-4 py-2 rounded text-white" style={{ background: profile.themeColors?.primary }}>Botão</button>
            </div>
            <Button type="submit" disabled={saving} className="w-full cursor-pointer hover:bg-blue-700 transition-colors">
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}