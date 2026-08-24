# AGENTS.md - Guia para Agentes de IA

## Visão Geral do Projeto
Plataforma de agendamento para manicures/profissionais da beleza. Fase 1: MVP para uma profissional parceira. Fase 2: SaaS multi-tenant.

## Stack Tecnológica
- Backend: NestJS (TypeScript strict) + Prisma ORM + PostgreSQL
- Frontend: Next.js App Router + Tailwind CSS + TypeScript strict
- Autenticação: JWT + Passport + bcrypt

## Regras Essenciais
- **Sempre responder em português BR**
- Sempre que editar código, atualizar os documentos .md correspondentes
- Nunca hardcodar `professionalId`. Usar contexto de autenticação (`useAuth`)
- Manter TypeScript strict em 100% do projeto
- Documentar mudanças no README e docs/

## Estrutura de Pastas
- `backend/src/` módulos por domínio: appointments, professionals, services, availabilities, auth, prisma
- `frontend/app/` rotas Next.js App Router
- `frontend/components/ui/` componentes de UI reutilizáveis
- `.clinerules/` regras específicas por área
- `docs/` documentação técnica e de produto
- `memory-bank/` histórico/contexto do projeto

## Fluxo de Trabalho
1. Analisar contexto existente antes de alterar código
2. Seguir regras em `.clinerules/`
3. Atualizar documentação após mudanças
4. Validar tipos e testes existentes

## Documentação Obrigatória
- README.md na raiz e por módulo
- PROJETO.md com visão geral executiva
- docs/ com guias técnicos específicos