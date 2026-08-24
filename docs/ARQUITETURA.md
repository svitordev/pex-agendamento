# Arquitetura do Projeto

## Visão Geral
Monorepo com backend NestJS e frontend Next.js. Backend modular por domínio, frontend com App Router.

## Backend (NestJS)
- Módulos: appointments, professionals, services, availabilities, auth, prisma
- Prisma como camada de acesso a dados PostgreSQL
- DTOs com class-validator / class-transformer
- JWT + Passport para autenticação

## Frontend (Next.js)
- App Router em `frontend/app/`
- Componentes UI em `frontend/components/ui/`
- Autenticação via `useAuth` hook
- API centralizada em `frontend/lib/api.ts`

## Banco de Dados
PostgreSQL + Prisma ORM. Schema definido em `backend/prisma/schema.prisma`.

## Fluxos Principais
1. Login profissional -> dashboard protegido
2. Gestão de serviços e disponibilidade
3. Página pública por slug para agendamento
4. Confirmação/cancelamento de agendamentos

## Regras
- Nunca hardcodar professionalId
- Sempre atualizar docs após mudanças de código
- TypeScript strict em todo projeto