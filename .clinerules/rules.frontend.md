# Frontend - Regras de Desenvolvimento

## Linguagem e Qualidade
- TypeScript 100% com strict habilitado.
- Componentes funcionais com React Hooks.
- Uso obrigatório de `useAuth` para proteção de rotas.

## Arquitetura
- Next.js App Router em `frontend/app/`.
- Componentes UI em `frontend/components/ui/`.
- Lógica de API centralizada em `frontend/lib/api.ts`.

## Estilo e UX
- Tailwind CSS para estilização.
- Design responsivo mobile-first.
- Estados de loading, erro e empty state em todas as páginas.

## Integração
- Nunca hardcodar `professionalId`. Usar contexto de autenticação.
- Formatação de datas com `date-fns` locale pt-BR.
- Mensagens/avisos em português BR.

## Documentação
- Atualizar README.md do frontend ao criar nova rota/página.
- Comentários claros em hooks e componentes complexos.