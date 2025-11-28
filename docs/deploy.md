# 📦 Guia de Deploy — ReservCar

Este documento descreve como executar e publicar o sistema **ReservCar** em três contextos:

1. Ambiente de desenvolvimento local  
2. Execução via Docker em ambiente local  
3. Deploy em produção na VM da Azure, utilizando Docker Compose e GitHub Actions (CI/CD)

---

## 1. Visão geral do deploy

O ReservCar foi desenhado para ser executado em containers Docker, com os seguintes serviços principais:

- **web** – frontend React + Vite (porta interna 5173, exposta via Caddy em `/`)  
- **api** – backend NestJS (porta interna 3000, exposta via Caddy em `/api`)  
- **db** – banco de dados PostgreSQL  
- **redis** – cache e suporte a sessões / filas  
- **proxy** – Caddy (proxy reverso + HTTPS + roteamento)  
- **prometheus** – coleta de métricas da API  
- **grafana** – visualização de métricas

Em produção, todos esses serviços são orquestrados via **Docker Compose** em uma **VM na Azure**, com domínio configurado e HTTPS habilitado no Caddy.

---

## 2. Pré-requisitos

Para seguir este guia, considere:

- Sistema operacional Linux (para o servidor de produção)  
- Docker e Docker Compose instalados na máquina local e na VM  
- Acesso ao repositório GitHub: `LarissaHoffm/corporate-car-reservation-system`  
- Acesso SSH à VM de produção (usuário configurado na Azure)  
- Domínio configurado apontando para o IP público da VM (por exemplo, `reservcar.app.br`)

---

## 3. Estrutura de pastas relevante

Dentro do repositório:

- `backend/server` – código do backend NestJS, Prisma e Dockerfile  
- `frontend` – código do frontend React + Vite e Dockerfile  
- `docker-compose.yml` – orquestração para ambiente local  
- `docker-compose.prod.yml` – orquestração para produção  
- `Caddyfile` – configuração do proxy reverso Caddy  
- `prometheus.yml` – configuração do Prometheus  
- `docs/` – documentação (incluindo este `deploy.md`)

A ideia é que a raiz do projeto contenha os arquivos de orquestração (`docker-compose.yml`, `docker-compose.prod.yml`, `Caddyfile` e `prometheus.yml`) utilizados tanto para desenvolvimento quanto para produção.

---

## 4. Ambientes e variáveis de ambiente

O projeto utiliza arquivos `.env` específicos para **desenvolvimento** e **produção**.

### 4.1. Backend (NestJS)

Arquivo típico em desenvolvimento: `backend/server/.env`.

Principais variáveis:

- `DATABASE_URL` — string de conexão PostgreSQL  
- `SHADOW_DATABASE_URL` — banco shadow para Prisma  
- `JWT_SECRET` — chave secreta para assinatura de tokens  
- `REDIS_URL` — URL de conexão do Redis  
- `NODE_ENV` — `development` ou `production`

Em produção, essas variáveis podem ser definidas diretamente no ambiente da VM ou em um arquivo `.env` carregado pelo Docker Compose.

### 4.2. Frontend (React + Vite)

Arquivo típico em desenvolvimento: `frontend/.env`.

Principais variáveis:

- `VITE_API_BASE_URL` — base da API (por exemplo, `/api` quando o frontend está atrás do Caddy)  
- `VITE_GOOGLE_MAPS_EMBED_KEY` — chave para uso do Google Maps embed

Em produção, essas variáveis são injetadas na build do frontend antes da geração da imagem Docker.

---

## 5. Ambiente de desenvolvimento local (sem Docker)

### 5.1. Rodando o backend

Passos típicos:

1. Acessar a pasta do backend: `cd backend/server`.  
2. Copiar o arquivo de variáveis de ambiente de exemplo: `cp .env.example .env`.  
3. Ajustar as variáveis no arquivo `.env` conforme necessário (especialmente `DATABASE_URL` e `JWT_SECRET`).  
4. Instalar dependências: `npm install`.  
5. Aplicar migrations do Prisma: `npx prisma migrate dev`.  
6. Iniciar o servidor NestJS: `npm run start:dev`.

Após esses passos, a API ficará disponível em `http://localhost:3000`.

### 5.2. Rodando o frontend

Passos típicos:

1. Acessar a pasta do frontend: `cd frontend`.  
2. Copiar o arquivo de variáveis de ambiente de exemplo: `cp .env.example .env`.  
3. Ajustar `VITE_API_BASE_URL` para apontar para a API local (`http://localhost:3000` ou `/api`, caso exista proxy local).  
4. Instalar dependências: `npm install`.  
5. Iniciar o servidor de desenvolvimento: `npm run dev`.

O frontend ficará disponível em `http://localhost:5173`.

---

## 6. Ambiente local com Docker

Para simular o ambiente completo em containers, utiliza-se o arquivo `docker-compose.yml` na raiz do projeto.

### 6.1. Subindo toda a stack local

Passos típicos:

1. Na raiz do projeto, executar `docker compose up --build`.  
2. Aguardar a construção das imagens e a subida de todos os serviços.

Com isso, a stack sobe com:

- frontend acessível em `http://localhost`;  
- API acessível em `http://localhost/api`;  
- Swagger acessível em `http://localhost/api/docs`;  
- banco PostgreSQL e Redis rodando em containers dedicados;  
- Caddy atuando como proxy reverso local (se configurado no compose).

Em caso de alteração de código, pode-se reconstruir um serviço específico com `docker compose build nome-do-servico`.

---

## 7. Deploy em produção (VM Azure)

### 7.1. Visão geral

O deploy em produção é realizado em uma máquina virtual na Azure, utilizando:

- `docker-compose.prod.yml` para orquestrar todos os serviços;  
- Caddy como proxy reverso responsável por HTTPS e roteamento;  
- GitHub Actions para automatizar build, testes, análise de qualidade e atualização da stack na VM.

### 7.2. Estrutura na VM

Na VM, o repositório é geralmente clonado para um diretório como:

- `/opt/reservcar/` ou similar.

Dentro dele, ficam:

- `docker-compose.prod.yml`  
- `Caddyfile`  
- `prometheus.yml`  
- scripts ou arquivos auxiliares necessários para o deploy.

Os volumes Docker persistem os dados de:

- PostgreSQL (banco de produção);  
- uploads de arquivos (documentos, imagens);  
- Grafana (dashboards);  
- outros dados de estado.

### 7.3. Comandos de deploy na VM

A partir da pasta de deploy (por exemplo, `/opt/reservcar/docker`), o fluxo típico de atualização é:

1. Atualizar o código ou as imagens (via pipeline e `docker pull`).  
2. Executar `docker compose -f docker-compose.prod.yml pull` para garantir que as imagens mais recentes foram obtidas.  
3. Executar `docker compose -f docker-compose.prod.yml up -d` para recriar os serviços com a nova versão.

Esse processo mantém os volumes de dados intactos, atualizando apenas as versões dos containers.

### 7.4. Pipeline de CI/CD (GitHub Actions)

O GitHub Actions é responsável por:

1. Executar build do backend e do frontend.  
2. Rodar testes automatizados de backend e frontend.  
3. Executar análise de qualidade com SonarCloud.  
4. Construir imagens Docker do backend e frontend.  
5. Publicar as imagens em um registry (por exemplo, GitHub Container Registry ou Docker Hub).  
6. Conectar-se à VM de produção (via SSH ou runner self-hosted) e disparar os comandos de `docker compose` para atualizar a stack.

Com isso, o deploy passa a ser **automatizado**, reprodutível e audível, evitando o uso de FTP ou processos manuais ad-hoc.

---

## 8. Caddy e HTTPS

O Caddy é utilizado como proxy reverso front-end para o ReservCar.

Responsabilidades do Caddy:

- Receber conexões HTTP (porta 80) e HTTPS (porta 443).  
- Redirecionar todo o tráfego HTTP para HTTPS.  
- Encaminhar requisições para o frontend (rota `/`) e para o backend (rota `/api`).  
- Gerenciar certificados TLS e configurações de segurança (HSTS, headers, etc., conforme configurado).

O arquivo `Caddyfile` contém a configuração do domínio, por exemplo:

- domínio `reservcar.app.br` apontando para o serviço `web` (frontend) e `api` (backend) definidos no Docker Compose.

---

## 9. Monitoramento em produção (Prometheus + Grafana)

Em produção, os serviços de monitoramento também rodam em containers Docker.

- O backend NestJS expõe métricas em `/api/metrics` no formato Prometheus.  
- O Prometheus utiliza o arquivo `prometheus.yml` para configurar os targets de *scrape* (incluindo o serviço `api`).  
- O Grafana é configurado para utilizar o Prometheus como fonte de dados e exibir dashboards customizados.

Métricas observadas incluem:

- taxa de requisições por rota;  
- latência p50, p95, p99;  
- códigos de status;  
- métricas do runtime Node.js (uso de memória, event loop, etc.).

O Grafana geralmente é acessado em uma porta específica da VM (por exemplo, `http://<IP_DA_VM>:3001`), restrita a usuários autorizados.

---

## 10. Rollback e recuperação

Caso uma nova versão apresente instabilidade, é possível realizar rollback de duas formas principais:

1. **Rollback por imagem Docker**  
   - Utilizar uma tag de imagem anterior (por exemplo, uma tag estável como `v1.0.0-tcc`).  
   - Atualizar o `docker-compose.prod.yml` para apontar para essa tag e executar novamente `docker compose -f docker-compose.prod.yml up -d`.

2. **Rollback por Git**  
   - Fazer checkout de uma commit ou tag estável na pasta de deploy.  
   - Reconstruir e subir os serviços com base nessa versão.

Como os dados são armazenados em volumes Docker (especialmente o banco PostgreSQL e os uploads), o rollback de aplicação não implica perda de dados.

---

## 11. Checklist rápido de deploy em produção

Antes de considerar um deploy como concluído, recomenda-se passar pelo seguinte checklist:

1. Verificar se a branch `main` está com o pipeline verde (build, testes, SonarCloud).  
2. Garantir que as imagens mais recentes foram enviadas para o registry.  
3. Na VM, executar `docker compose -f docker-compose.prod.yml ps` e verificar se todos os serviços estão `Up` e saudáveis.  
4. Testar manualmente:
   - acesso ao domínio (por exemplo, `https://reservcar.app.br`);  
   - login de usuário;  
   - criação e aprovação de uma reserva;  
   - upload e validação de documentos;  
   - preenchimento e validação de checklists;  
   - visualização dos dashboards do Grafana com métricas recentes.

Se todos esses pontos estiverem ok, o deploy pode ser considerado bem-sucedido.

---
