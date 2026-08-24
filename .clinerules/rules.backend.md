# Backend - Regras de Desenvolvimento

## Linguagem e Qualidade
- TypeScript 100% com strict habilitado.
- Usar `class-validator` / `class-transformer` em todos os DTOs.
- Injeção de dependência NestJS obrigatória.

## Estrutura
- Módulos por domínio: appointments, professionals, services, availabilities, auth, prisma.
- Serviços não expõem Prisma diretamente; usar camada PrismaService.
- Controllers enxutos, apenas roteamento/HTTP.

## Banco e ORM
- PostgreSQL + Prisma ORM.
- Migrations em `backend/prisma/migrations`.
- Nunca editar `schema.prisma` sem criar migration.

## Autenticação
- JWT + Passport, bcrypt para hash.
- Guards em rotas protegidas.

## Documentação
- Atualizar README.md do backend ao adicionar endpoint.
- Comentários JSDoc em serviços críticos.

## Observações
- Sempre responder em português BR.