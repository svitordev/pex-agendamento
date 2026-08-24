# PROJETO.md — Visão Geral Executiva

## Objetivo
Plataforma de agendamento para manicures/profissionais da beleza, iniciando como MVP para uma profissional parceira e evoluindo para SaaS multi-tenant.

## Fases
**Fase 1 (MVP):**
- Fluxo completo de agendamento de clientes
- Visualização de horários e gestão de disponibilidade/serviços
- Dashboard do profissional

**Fase 2 (SaaS):**
- Landing page institucional
- Múltiplos profissionais/tenants
- Customização visual de páginas públicas (cores/tema)
- Autenticação robusta

## Stack
- Backend: NestJS + Prisma + PostgreSQL + JWT/Passport
- Frontend: Next.js App Router + Tailwind + TypeScript strict

## Regras Críticas
- Sempre responder em português BR
- Nunca hardcodar `professionalId`. Usar contexto de autenticação `useAuth`
- Atualizar documentação `.md` após mudanças de código
- TypeScript strict em 100% do projeto

## Documentação
- README.md na raiz
- AGENTS.md, .clinerules/
- docs/ técnico e de produto
- memory-bank/ histórico/contexto