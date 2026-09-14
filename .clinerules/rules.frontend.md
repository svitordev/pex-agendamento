s5ycdzx$grontend - Regras de Desenvolvimento

## Linguagem e Qualidade
- TypeScript com `strict: true` ✅
- Componentes funcionais com React Hooks.
- Uso obrigatório de `useAuth` para proteção de rotas.

## professionalId — Regra de Ownership

### Rotas Protegidas (Dashboard)
- Usar `useAuth()` para obter `professionalId` do usuário logado.
- Nunca hardcodar `professionalId` no frontend.
- **Problema confirmado:** `dashboard/services/page.tsx:76` usa `api.get('/services')`
  sem filtrar — retorna serviços de todos os profissionais.

### Rotas Públicas
- `/professional/[slug]` e `/agendamentos` carregam dados por slug ou telefone.
- NÃO usar `useAuth()` para obter profissionalId nestas rotas — o usuário
  pode estar vendo a página de qualquer profissional.
- `professionalId` como query param é permitido para identificar o alvo.

## Arquitetura
- Next.js App Router em `frontend/app/`.
- Componentes UI em `frontend/components/ui/`.
- Lógica de API centralizada em `frontend/lib/api.ts` (Axios com interceptors).

## Estilo e UX
- Tailwind CSS para estilização.
- Design responsivo mobile-first.
- Estados de loading, erro e empty state em todas as páginas.

## Segurança
- JWT armazenado em `localStorage` ⚠️ — vulnerável a XSS
  - **Melhoria planejada:** migrar para HTTP-only cookie ou memória efêmera
- **Problema confirmado:** `CustomerAppointments.tsx` existe em `components/public/`
  E `components/Public/` (casing diferente) — risco em ambientes case-sensitive

## Integração
- Formatação de datas com `date-fns` locale pt-BR.
- Mensagens/avisos em português BR.
- **Problema confirmado:** `types/index.ts` — `themeColors` não opcional no tipo,
  mas `Json?` no schema Prisma

## Documentação
- Atualizar README.md do frontend ao criar nova rota/página.
- Comentários claros em hooks e componentes complexos.
- Atualizar documentação APENAS para mudanças relevantes (ver AGENTS.md)

## Observações
- Sempre responder em português BR.