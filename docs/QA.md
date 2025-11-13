# QA — Smoke Tests (09/11)

## Ambiente
- Base URL local (via proxy): `http://localhost`
- Swagger: `/api/docs`
- Perfis seed: 
  - ADMIN: `admin@reservcar.com` / `Admin@123`
  - APPROVER: `approver@reservcar.com` / `Approver@123`
  - REQUESTER: `requester@reservcar.com` / `Requester@123`

## Fluxo comum (todos os perfis)
1. `POST /auth/login` → receber `accessToken` + `user`.
2. Executar rotas do perfil.
3. `POST /auth/refresh` → retornar 200.
4. `POST /auth/logout` → retornar 200.

## ADMIN
### Users
- `GET /users` → 200 (lista)
- `POST /users` (body exemplo no Swagger) → 201
- `PATCH /users/{id}` → 200
- `PATCH /users/{id}/password` (ADMIN define senha) → 200
- `POST /users/{id}/reset-password` → 200
- `DELETE /users/{id}` → 200

### Cars
- `GET /cars` → 200
- `POST /cars` → 201
- `PATCH /cars/{id}` → 200
- `DELETE /cars/{id}` → 200

### Stations
- `GET /stations` → 200
- `POST /stations` → 201
- `PATCH /stations/{id}` → 200
- `DELETE /stations/{id}` → 200

### Reservations (geral)
- `GET /reservations` (filtros opcionais) → 200

## APPROVER
- `GET /cars`, `POST/PATCH/DELETE /cars` → 200/201/200/200
- `GET /stations`, `POST/PATCH/DELETE /stations` → 200/201/200/200
- `GET /reservations` → 200
- `PATCH /reservations/{id}/approve` (atribui carro disponível) → 200

## REQUESTER
- `GET /cars` (somente consulta) → 200
- `GET /stations` (somente consulta) → 200
- `POST /reservations` (criar pendente) → 201
- `GET /reservations/me` → 200
- `PATCH /reservations/{id}/cancel` (se status = PENDING e dono) → 200
- `PATCH /reservations/{id}/complete` (pré-condições conforme regras) → 200

## Payloads de referência
- Todos os **exemplos** estão descritos nos decorators do Swagger (Users, Cars, Stations, Reservations).

## RBAC (esperado)
- Rotas ADMIN/APPROVER retornam **403** para REQUESTER.
- Rotas ADMIN retornam **403** para APPROVER/REQUESTER.
- Rotas autenticadas retornam **401** sem token.

## Métricas básicas (a preencher em 10/11)
- p95 de `POST /auth/login` e `POST /reservations` (autocannon/k6) — adicionar seção quando coletado.

## Observações
- Índices confirmados (inclui `res_car_time_idx` para janelas por carro).
- Auditoria: eventos aparecem na tabela `AuditLog` e/ou nos logs da API (JSON estruturado).
