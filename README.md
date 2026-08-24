# PEX Agendamento

Plataforma de agendamento para manicures/profissionais da beleza.
Fase 1: MVP para profissional parceira. Fase 2: SaaS multi-tenant.

## Tecnologias
- Backend: NestJS, Prisma, PostgreSQL, JWT/Passport
- Frontend: Next.js App Router, Tailwind CSS, TypeScript strict

## Estrutura
- `backend/` - API NestJS modular
- `frontend/` - Web app Next.js
- `.clinerules/` - Regras por área
- `docs/` - Documentação técnica/produto
- `memory-bank/` - Histórico do projeto

## Regras Essenciais
- Sempre responder em português BR
- Nunca hardcodar `professionalId`. Usar contexto de autenticação
- Atualizar documentação `.md` após mudanças de código
- TypeScript strict em 100% do projeto