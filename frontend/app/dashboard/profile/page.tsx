"use client";

import { useEffect, useState } from "react";

import { ExternalLink, Palette, Save, UserRound } from "lucide-react";

import api from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";

import { Label } from "@/components/ui/label";

import { Textarea } from "@/components/ui/textarea";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FaFacebookF, FaInstagram, FaWhatsapp } from "react-icons/fa";

type ThemeColors = {
  primary: string;
  secondary: string;
  accent: string;
};

type ProfessionalProfile = {
  id: string;
  slug: string;
  name: string;
  bio: string | null;
  avatarUrl: string | null;
  instagram: string | null;
  facebook: string | null;
  whatsapp: string | null;
  themeColors: Partial<ThemeColors> | null;
};

/*
 * Tema padrão da própria plataforma.
 *
 * Inspirado na Landing Page:
 * blue + indigo + violet.
 */
const DEFAULT_THEME: ThemeColors = {
  primary: "#2563EB",
  secondary: "#4F46E5",
  accent: "#7C3AED",
};

/*
 * Escolhe automaticamente preto/branco
 * dependendo da luminosidade da cor.
 */
function getContrastColor(hex: string) {
  const normalized = hex.replace("#", "");

  if (normalized.length !== 6) {
    return "#ffffff";
  }

  const r = parseInt(normalized.substring(0, 2), 16);

  const g = parseInt(normalized.substring(2, 4), 16);

  const b = parseInt(normalized.substring(4, 6), 16);

  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance > 0.62 ? "#111827" : "#ffffff";
}

export default function ProfilePage() {
  const { user } = useAuth();

  const [profile, setProfile] = useState<ProfessionalProfile | null>(null);

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) {
      return;
    }

    const loadProfile = async () => {
      try {
        const response =
          await api.get<ProfessionalProfile>("/professionals/me");

        const data = response.data;

        setProfile({
          ...data,

          themeColors: {
            ...DEFAULT_THEME,
            ...(data.themeColors ?? {}),
          },
        });
      } catch (error) {
        console.error("Erro ao carregar perfil:", error);

        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [user]);

  const updateField = <K extends keyof ProfessionalProfile>(
    key: K,
    value: ProfessionalProfile[K],
  ) => {
    setProfile((current) =>
      current
        ? {
            ...current,
            [key]: value,
          }
        : current,
    );
  };

  const updateThemeColor = (key: keyof ThemeColors, value: string) => {
    if (!profile) {
      return;
    }

    updateField("themeColors", {
      ...DEFAULT_THEME,
      ...(profile.themeColors ?? {}),
      [key]: value,
    });
  };

  const resetTheme = () => {
    updateField("themeColors", {
      ...DEFAULT_THEME,
    });
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!profile) {
      return;
    }

    setSaving(true);

    try {
      const response = await api.patch<ProfessionalProfile>(
        "/professionals/me/profile",
        {
          name: profile.name,

          bio: profile.bio,

          avatarUrl: profile.avatarUrl,

          instagram: profile.instagram,

          facebook: profile.facebook,

          whatsapp: profile.whatsapp,

          themeColors: profile.themeColors,
        },
      );

      setProfile({
        ...response.data,

        themeColors: {
          ...DEFAULT_THEME,
          ...(response.data.themeColors ?? {}),
        },
      });

      alert("Perfil atualizado com sucesso!");
    } catch (error: any) {
      console.error("Erro ao atualizar perfil:", error);

      const message = error.response?.data?.message;

      alert(
        Array.isArray(message)
          ? message.join("\n")
          : (message ?? "Erro ao atualizar perfil."),
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-12 text-center text-gray-500">
        Perfil não encontrado.
      </div>
    );
  }

  const theme: ThemeColors = {
    ...DEFAULT_THEME,
    ...(profile.themeColors ?? {}),
  };

  const primaryText = getContrastColor(theme.primary);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6">
      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
              <UserRound className="h-5 w-5" />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Perfil profissional
              </h1>

              <p className="text-sm text-gray-500">
                Personalize como seus clientes verão sua página.
              </p>
            </div>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          asChild
          className="w-full sm:w-auto"
        >
          <a
            href={`/professional/${profile.slug}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Ver página pública
          </a>
        </Button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          {/* ==========================================
              DADOS
          ========================================== */}

          <Card className="border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Informações públicas</CardTitle>

              <p className="text-sm text-gray-500">
                Estes dados serão exibidos na sua página de agendamento.
              </p>
            </CardHeader>

            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name">Nome profissional</Label>

                <Input
                  id="name"
                  value={profile.name ?? ""}
                  onChange={(event) => updateField("name", event.target.value)}
                  placeholder="Seu nome profissional"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Apresentação</Label>

                <Textarea
                  id="bio"
                  rows={5}
                  value={profile.bio ?? ""}
                  onChange={(event) => updateField("bio", event.target.value)}
                  placeholder="Conte brevemente sobre seu trabalho, experiência e especialidades."
                />

                <p className="text-xs text-gray-400">
                  Uma descrição curta ajuda o cliente a conhecer melhor seu
                  trabalho.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="instagram">Instagram</Label>

                  <div className="relative">
                    <FaInstagram className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

                    <Input
                      id="instagram"
                      className="pl-9"
                      placeholder="@seuperfil"
                      value={profile.instagram ?? ""}
                      onChange={(event) =>
                        updateField("instagram", event.target.value)
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="facebook">Facebook</Label>

                  <div className="relative">
                    <FaFacebookF className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

                    <Input
                      id="facebook"
                      className="pl-9"
                      placeholder="Perfil ou link"
                      value={profile.facebook ?? ""}
                      onChange={(event) =>
                        updateField("facebook", event.target.value)
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="whatsapp">WhatsApp profissional</Label>

                <div className="relative">
                  <FaWhatsapp className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-green-600" />

                  <Input
                    id="whatsapp"
                    type="tel"
                    className="pl-9"
                    placeholder="(81) 99999-9999"
                    value={profile.whatsapp ?? ""}
                    onChange={(event) =>
                      updateField("whatsapp", event.target.value)
                    }
                  />
                </div>

                <p className="text-xs text-gray-400">
                  Seus clientes poderão entrar em contato por este número.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* ==========================================
              TEMA
          ========================================== */}

          <Card className="border-gray-200 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-blue-600" />

                <CardTitle className="text-lg">Identidade visual</CardTitle>
              </div>

              <p className="text-sm text-gray-500">
                As cores são usadas apenas nos destaques. O fundo da página
                continuará claro.
              </p>
            </CardHeader>

            <CardContent className="space-y-4">
              <ColorSelector
                label="Cor primária"
                description="Botões e ações principais"
                color={theme.primary}
                onChange={(color) => updateThemeColor("primary", color)}
              />

              <ColorSelector
                label="Cor secundária"
                description="Ícones e elementos auxiliares"
                color={theme.secondary}
                onChange={(color) => updateThemeColor("secondary", color)}
              />

              <ColorSelector
                label="Cor de acento"
                description="Detalhes e destaques"
                color={theme.accent}
                onChange={(color) => updateThemeColor("accent", color)}
              />

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={resetTheme}
              >
                Restaurar cores da plataforma
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* ==========================================
            PREVIEW
        ========================================== */}

        <Card className="overflow-hidden border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Prévia da página pública</CardTitle>

            <p className="text-sm text-gray-500">
              Exemplo de como suas cores serão utilizadas.
            </p>
          </CardHeader>

          <CardContent>
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-slate-50">
              {/* HERO */}
              <div className="relative overflow-hidden border-b bg-white px-5 py-6 text-center">
                <div
                  className="absolute left-0 top-0 h-1.5 w-full"
                  style={{
                    background: `linear-gradient(90deg, ${theme.primary}, ${theme.secondary}, ${theme.accent})`,
                  }}
                />

                <div
                  className="mx-auto flex h-14 w-14 items-center justify-center rounded-full text-xl font-bold"
                  style={{
                    backgroundColor: `${theme.primary}18`,
                    color: theme.primary,
                  }}
                >
                  {profile.name?.charAt(0).toUpperCase() || "P"}
                </div>

                <p className="mt-3 text-lg font-bold text-gray-900">
                  {profile.name}
                </p>

                <p className="mx-auto mt-1 max-w-md text-xs text-gray-500">
                  {profile.bio || "Sua apresentação aparecerá aqui."}
                </p>
              </div>

              {/* CONTENT */}
              <div className="space-y-4 p-5">
                <div className="rounded-xl border bg-white p-4">
                  <p className="text-xs font-medium text-gray-500">
                    Serviço selecionado
                  </p>

                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-900">
                      Serviço exemplo
                    </span>

                    <span
                      className="rounded-full px-2 py-1 text-xs font-semibold"
                      style={{
                        color: theme.secondary,
                        backgroundColor: `${theme.secondary}12`,
                      }}
                    >
                      60 min
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    className="flex-1 rounded-lg px-4 py-2 text-sm font-semibold shadow-sm"
                    style={{
                      backgroundColor: theme.primary,
                      color: primaryText,
                    }}
                  >
                    Agendar horário
                  </button>

                  <button
                    type="button"
                    className="rounded-lg border bg-white px-4 py-2 text-sm font-medium"
                    style={{
                      borderColor: `${theme.secondary}50`,
                      color: theme.secondary,
                    }}
                  >
                    Consultar
                  </button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SALVAR */}
        <div className="sticky bottom-3 z-10">
          <div className="rounded-xl border bg-white/95 p-3 shadow-lg backdrop-blur">
            <Button
              type="submit"
              disabled={saving}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              <Save className="mr-2 h-4 w-4" />

              {saving ? "Salvando..." : "Salvar alterações"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

function ColorSelector({
  label,
  description,
  color,
  onChange,
}: {
  label: string;
  description: string;
  color: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="rounded-xl border border-gray-200 p-3">
      <div className="flex items-center gap-3">
        <Input
          type="color"
          value={color}
          onChange={(event) => onChange(event.target.value)}
          className="h-11 w-14 shrink-0 cursor-pointer p-1"
        />

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-800">{label}</p>

          <p className="text-xs text-gray-400">{description}</p>
        </div>

        <span className="hidden font-mono text-xs text-gray-400 sm:block">
          {color.toUpperCase()}
        </span>
      </div>
    </div>
  );
}
