# 🚗 ReservCar — Sistema de Reserva de Carros Corporativos

> Trabalho de Conclusão de Curso em Engenharia de Software — Católica de Santa Catarina  
> Autora: **Larissa Hoffmann**

---

## 🔗 Links rápidos

- 🌐 **Produção:** https://reservcar.app.br   
- 📄 **Swagger da API:** https://reservcar.app.br/api/docs  
- 📊 **Observabilidade (Grafana):** `http://132.196.142.24:3001` (ambiente de produção)
- 📊 **SonarCloud:** https://sonarcloud.io/project/overview?id=LarissaHoffm_corporate-car-reservation-system
- 📚 **Documentação detalhada (RFC, C4, UML, QA):** ver Wiki do repositório e pasta [`/docs`](./docs)

---

## Visão geral

O **ReservCar** é um sistema corporativo para **controle de reservas e uso de veículos da frota** em organizações com múltiplas filiais.  
Ele centraliza, em uma única plataforma:

- a **solicitação de reservas** por colaboradores;
- a **aprovação operacional** por gestores (aprovadores);
- o **registro de evidências** (CNH, recibos, fotos de quilometragem, outros gastos);
- o **preenchimento de checklists** de devolução e validação;
- a **emissão de relatórios filtráveis** por usuário, veículo, filial e período.

A aplicação foi projetada seguindo o RFC do projeto com:

- arquitetura cliente-servidor baseada em **React (frontend)** e **NestJS (backend)**;
- banco de dados relacional **PostgreSQL** com **Prisma ORM**;
- **autenticação e autorização via JWT + RBAC** (Admin, Approver, Requester);
- **containerização com Docker** e deploy em **VM na Azure** atrás de um proxy reverso (Caddy);
- **CI/CD com GitHub Actions**, análise estática com **SonarCloud** e **monitoramento em produção** com Prometheus + Grafana.

---

## Problemas e dores mapeadas

O ReservCar foi concebido para atacar problemas identificados no contexto corporativo de uso de veículos:

- **Ausência de controle formal da frota**  
  Veículos são emprestados sem registro consolidado de quem usou, quando, para onde e com qual finalidade.

- **Conflitos de reserva e indisponibilidade de veículos**  
  Sem sistema centralizado, múltiplos colaboradores disputam o mesmo carro para o mesmo período.

- **Dificuldade de auditoria e prestação de contas**  
  Recibos de combustível, comprovantes de pedágio e fotos de quilometragem são enviados por e-mail ou mensageria, sem vínculo estruturado à reserva.

- **Falta de padronização na devolução dos veículos**  
  Checklists são inexistentes ou feitos em papel, dificultando controlar avarias, limpeza e condições gerais do carro.

- **Baixa visibilidade gerencial**  
  Administradores não possuem relatórios consolidados por **usuário, carro, filial e período**, dificultando análises de uso, custos e desvios.

O sistema endereça essas dores oferecendo **fluxos estruturados**, **trilha de auditoria** e **camadas de segurança**, conforme descrito no RFC.

---

## 🎯 Objetivos do sistema

### Objetivo geral

Desenvolver um sistema web corporativo que **gerencie de forma integrada as reservas e o uso de veículos da frota**, garantindo rastreabilidade, segurança da informação, padronização de processos e apoio à gestão operacional.

### Objetivos específicos

- **Controlar o ciclo de vida das reservas**  
  Permitir que colaboradores solicitem reservas informando origem, destino, datas e horários, com aprovação por responsáveis designados.

- **Gerenciar frota e postos credenciados**  
  Disponibilizar CRUD de veículos e postos de abastecimento vinculados a filiais e tenants, com controle de ativação/inativação.

- **Centralizar documentos relacionados às viagens**  
  Permitir upload de CNH, comprovantes de abastecimento, fotos de quilometragem e outros gastos, vinculados diretamente à reserva.

- **Padronizar checklists de devolução e validação**  
  Definir modelos de checklist configuráveis e permitir que usuários e aprovadores registrem as condições do veículo na devolução.

- **Oferecer relatórios para auditoria e gestão**  
  Gerar relatórios filtráveis por usuário, carro, filial e período, além de permitir que cada colaborador acompanhe seu próprio histórico de uso.

- **Garantir segurança, rastreabilidade e governança**  
  Implementar autenticação segura, autorização baseada em papéis (RBAC), logs de auditoria e monitoramento de métricas em ambiente de produção.

- **Atender aos requisitos acadêmicos da linha Web Apps**  
  Manter o sistema publicado com CI/CD, testes automatizados, análise estática, observabilidade e documentação arquitetural (C4, UML, RFC).

---

## 🏛 Arquitetura do sistema

O sistema segue uma arquitetura **cliente-servidor** baseada em **React (frontend)** e **NestJS (backend)**, organizada em módulos de domínio e empacotada em containers Docker. A solução foi desenhada a partir de modelos C4 (Contexto, Containers, Componentes e Código), disponíveis na Wiki e na pasta [`/docs`](./docs).

### Visão em alto nível

- O **usuário final** acessa o sistema pelo navegador, autenticando-se na aplicação React.
- O **frontend** consome a **API REST** exposta pelo backend NestJS, através de um proxy reverso (Caddy), sempre via HTTPS.
- O backend persiste dados em **PostgreSQL**, utiliza **Redis** como mecanismo de cache/sessão e exporta métricas para o **Prometheus**.
- As métricas são visualizadas em painéis do **Grafana**, permitindo acompanhar a saúde da API em produção.
- Todos os serviços de aplicação são executados em containers Docker e orquestrados por **Docker Compose**, tanto em desenvolvimento quanto em produção.

Os diagramas C4 completos (contexto, containers, componentes e detalhes de código) podem ser consultados na **Wiki do repositório** e em `docs/architecture/`.

### Módulos de domínio (backend)

O backend NestJS é dividido em módulos alinhados ao domínio descrito no RFC:

- `auth` – autenticação, emissão de tokens JWT, fluxo de login.
- `users` – gestão de usuários, papéis (ADMIN, APPROVER, REQUESTER) e status.
- `cars` – cadastro, atualização, inativação e consulta de veículos.
- `stations` – postos credenciados, endereços e status.
- `reservations` – criação, listagem, aprovação, cancelamento e conclusão de reservas.
- `documents` – upload, listagem e validação de documentos vinculados às reservas.
- `checklists` – modelos de checklist e submissões (usuário na devolução / aprovador na validação).
- `shared` – componentes compartilhados (guards de RBAC, interceptors, filtros de exceção, utilitários).

Cada módulo expõe **controllers** (camada de entrada HTTP), **services** com as regras de negócio e integrações com o banco via **Prisma**, seguindo o padrão MVC e as boas práticas do NestJS.

### Fluxo básico de uma requisição

1. O usuário autentica-se via **login** e recebe um **JWT**.
2. O frontend envia requisições HTTP com o token no header `Authorization: Bearer <token>`.
3. O NestJS aplica **guards de autenticação e autorização**, validando o JWT e o papel do usuário.
4. O controller invoca o service correspondente, que aplica as regras de negócio e interage com o banco via Prisma.
5. A resposta é retornada ao frontend, que atualiza a interface (listas, tabelas, dashboards, etc.).
6. Em paralelo, métricas da requisição são expostas em `/metrics` e coletadas pelo Prometheus.

---

## 🧰 Stack tecnológica

A implementação foi feita com foco em tecnologias modernas, tipadas e amplamente utilizadas no mercado.

### Frontend

- **Linguagem:** TypeScript  
- **Framework:** React.js (SPA, Vite)  
- **Estilização:** Tailwind CSS  
- **Roteamento:** React Router  
- **HTTP client:** Axios    
- **Controle de acesso na UI:** componente `RoleGuard`, que restringe rotas e menus conforme o papel (Admin, Approver, Requester)

Estrutura lógica:

- **Layouts por papel:** `/admin`, `/approver`, `/requester`, cada um com sua navegação e páginas específicas.
- **Páginas compartilhadas:** frota, documentos, relatórios e perfil de usuário reutilizados entre perfis quando aplicável.
- **Componentes reutilizáveis:** botões, badges de status, cards, tabelas, formulários e toasts, garantindo consistência visual.

### Backend

- **Linguagem:** TypeScript  
- **Framework:** NestJS (arquitetura modular, controllers/services/providers)  
- **ORM:** Prisma (mapeamento para PostgreSQL)  
- **Banco de dados:** PostgreSQL (modelo relacional, aderente a ACID)  
- **Cache / sessão:** Redis  
- **Autenticação:** Passport.js com JWT (access token + controle de roles)  
- **Validação:** `class-validator` / `class-transformer` em DTOs  
- **Documentação de API:** Swagger, exposto em `/api/docs`  
- **Métricas:** exportação em formato Prometheus via `/api/metrics`

Responsabilidades principais:

- Implementar as regras de negócio de reservas, conflitos de horário, estados de veículos e status das reservas.
- Manter a consistência dos dados de usuários, veículos, postos, documentos e checklists.
- Garantir segurança via autenticação, autorização e validação de entrada.
- Expor APIs REST claras e tipadas para o frontend.

### Infra / DevOps

- **Containerização:** Docker para todos os serviços (frontend, backend, banco, cache, proxy, monitoramento).  
- **Orquestração local e em produção:** Docker Compose com arquivos específicos para desenvolvimento e produção (`docker-compose.yml`, `docker-compose.prod.yml`).  
- **Proxy reverso e HTTPS:** Caddy, responsável por:
  - roteamento de `/` para o frontend;
  - roteamento de `/api` para o backend NestJS;
  - terminação TLS (HTTPS) e redirecionamentos.
- **Cloud:** Máquina virtual na **Azure**, onde os containers de produção são executados.
- **CI/CD:** GitHub Actions, configurado para:
  - build do frontend e backend;
  - execução de testes automatizados;
  - análise de qualidade com SonarCloud;
  - deploy automatizado para a VM (sem uso de FTP/SSH manual).
- **Monitoramento:** Prometheus coletando métricas da API + Grafana com dashboards para acompanhar:
  - throughput de requisições,
  - latência,
  - códigos de resposta,
  - saúde geral da aplicação.

---

## 🛠 Como rodar o projeto

A aplicação foi desenvolvida em arquitetura monorepo, com frontend e backend independentes, mas integrados via proxy reverso.  
O ambiente pode ser executado tanto localmente quanto via Docker, de forma semelhante ao ambiente de produção.

###  Serviços disponíveis após subir com Docker

- Frontend: `http://localhost`  
- API: `http://localhost/api`  
- Swagger: `http://localhost/api/docs`  
- Serviços auxiliares: PostgreSQL, Redis, Caddy e demais containers sobem automaticamente

###  Rodando o backend sem Docker

1. Acessar a pasta: `backend/server`  
2. Copiar as variáveis de ambiente de exemplo: `cp .env.example .env`  
3. Instalar dependências: `npm install`  
4. Aplicar migrations do Prisma: `npx prisma migrate dev`  
5. Iniciar o servidor de desenvolvimento: `npm run start:dev`  

Após esses passos, a API ficará disponível em: `http://localhost:3000`

###  Rodando o frontend sem Docker

1. Acessar a pasta: `frontend`  
2. Copiar as variáveis de ambiente de exemplo: `cp .env.example .env`  
3. Instalar dependências: `npm install`  
4. Iniciar o servidor de desenvolvimento: `npm run dev`  

Após esses passos, o frontend ficará disponível em: `http://localhost:5173`

---

## 🧪 Testes, cobertura e qualidade

A aplicação utiliza práticas de TDD, testes automatizados e análise estática para garantir segurança, confiabilidade e manutenibilidade do código.  
No backend foi utilizado principalmente **Jest** (NestJS), e no frontend **React Testing Library** com Jest. A análise de qualidade é feita com **SonarCloud**, integrada ao pipeline de CI/CD no GitHub Actions.

###  Backend – Cobertura REAL

Cobertura consolidada do backend (NestJS):

- Statements: **92.08%**  
- Branches: **74.78%**  
- Functions: **97.24%**  
- Lines: **93.12%**

As evidências completas de execução e relatórios de cobertura estão documentadas em: `docs/qa/coverage-backend.md`.

###  Frontend – Cobertura REAL

Cobertura consolidada do frontend (React + TypeScript):

- Statements: **59.85%**  
- Branches: **40.58%**  
- Functions: **66.66%**  
- Lines: **61.29%**

As evidências e prints de cobertura estão em: `docs/qa/coverage-frontend.md`.

###  Análise de qualidade — SonarCloud

A branch principal (`main`) é analisada continuamente pelo **SonarCloud**, com os seguintes indicadores de qualidade:

- Security: **A**  
- Maintainability: **A**  
- Reliability: **C** (impacto apenas em trechos classificados como *new code*)  
- Hotspots: **100% revisados**  
- Duplicações: **1.9%** das linhas de código

O pipeline de CI/CD no GitHub Actions executa build, testes e análise do SonarCloud a cada push e Pull Request, garantindo que a qualidade do código seja acompanhada de forma contínua.

---

## 📈 Monitoramento e observabilidade

O sistema adota observabilidade em ambiente real de produção através de **Prometheus + Grafana**.  
O backend NestJS expõe métricas em formato compatível com Prometheus, e o Grafana é utilizado para visualização.

###  Prometheus

O Prometheus está configurado para coletar métricas da API por meio do endpoint:

- Endpoint de métricas da API: `/api/metrics`

Principais grupos de métricas coletadas:

- Número de requisições por rota e método HTTP  
- Latência das requisições (p50, p95, p99)  
- Códigos de status HTTP  
- Métricas internas do runtime Node.js (uso de heap, event loop, etc.)

Essas métricas são armazenadas como séries temporais e utilizadas para diagnóstico de performance, erros e comportamento da aplicação em produção.

###  Grafana

O **Grafana** é utilizado para criar dashboards que consolidam visualmente as métricas do Prometheus.

Dashboards configurados incluem:

- Saúde geral da API HTTP (erros, taxa de sucesso, requisições por segundo)  
- Performance e latência por rota  
- Distribuição de códigos de status (2xx, 4xx, 5xx)  
- Visão operacional da API em produção

O acesso ao Grafana em produção é feito via URL do servidor da VM (por exemplo: `http://132.196.142.24:3001`), restringido apenas aos responsáveis pela operação e pela avaliação do projeto.

###  Infraestrutura de observabilidade

- Prometheus executando na mesma VM de produção, configurado para fazer *scrape* periódico do backend.  
- Dashboards do Grafana importados e versionados, com variáveis, legendas e painéis organizados para facilitar a análise.  
- Uso das métricas para validar comportamento em produção durante o Demo Day (reservas, aprovações, uploads, checklists, etc.).

---

## 🟩 Conformidade com a banca (Web Apps)

A tabela abaixo sintetiza o atendimento aos **requisitos obrigatórios** da linha de projeto **Web Apps**:

| Requisito obrigatório | Status | Evidência |
|-----------------------|--------|-----------|
| Sistema publicado e acessível publicamente | ✔ | Aplicação rodando em produção em VM na Azure (domínio `reservcar.app.br`) |
| Arquitetura definida (RFC, C4, UML) | ✔ | RFC do projeto + diagramas C4 e UML disponíveis na Wiki e em `docs/diagrams` |
| CI/CD implementado (ex.: GitHub Actions) | ✔ | Pipelines de build, testes, SonarCloud e deploy configurados no repositório |
| Documentação mínima (requisitos, casos de uso, arquitetura, deploy) | ✔ | README, RFC, C4, UML, documentação de deploy em `docs/deploy.md` |
| Cobertura de testes no backend ≥ 75% | ✔ | Cobertura real de ~92% (statements) no backend, registrada em `docs/qa/coverage-backend.md` |
| Cobertura de testes no frontend ≥ 25% | ✔ | Cobertura real de ~59% (statements) no frontend, registrada em `docs/qa/coverage-frontend.md` |
| Análise estática de código (SonarCloud) | ✔ | Projeto integrado ao SonarCloud com Security A, Maintainability A e duplicações controladas |
| Uso de ferramenta de monitoramento/observabilidade | ✔ | Prometheus + Grafana configurados em produção com métricas reais da API |
| Pelo menos 3 fluxos de negócio completos | ✔ | Fluxos de Reserva (Requester), Aprovação/Validação (Approver) e Gestão/Relatórios (Admin) |
| Uso de banco de dados real (SQL/NoSQL) | ✔ | Banco PostgreSQL com schema definido via Prisma ORM |
| Uso de containerização (Docker) | ✔ | Docker + Docker Compose para frontend, backend, banco, cache, proxy e monitoramento |
| Autenticação segura e RBAC | ✔ | JWT, controle de papéis (ADMIN, APPROVER, REQUESTER) e guards em todos os endpoints sensíveis |
| Implementação dos RF01–RF19 | ✔ | Todos os requisitos funcionais implementados conforme RFC (gestão de usuários, carros, postos, reservas, documentos, checklists e relatórios) |

**Conclusão:** o ReservCar atende integralmente aos critérios obrigatórios da banca para projetos da linha Web Apps, incluindo publicação online, CI/CD, testes, análise de qualidade e observabilidade.

---

## 🛣 Roadmap — Funcionalidades Futuras (RF20–RF23)

O RFC do projeto também prevê um conjunto de funcionalidades futuras, planejadas como evolução pós-entrega do TCC:

- **RF21 – Vinculação de multas à reserva ativa**  
  Registro de multas associadas à placa do veículo e vinculação automática à reserva e ao usuário responsável naquele período.

- **RF22 – Integração com Active Directory (AD)**  
  Suporte a autenticação corporativa (SSO) utilizando contas centralizadas de diretório, reduzindo gestão manual de usuários.

- **RF23 – Integração com Microsoft Teams e Outlook**  
  Envio de notificações de reservas e aprovações via Teams e criação de eventos de calendário no Outlook para as viagens aprovadas.

Essas extensões foram desenhadas para manter coerência com a arquitetura atual e evoluir o sistema rumo a um cenário corporativo mais integrado.

---

## 👩‍💻 Autora

**Larissa Hoffmann**  
Trabalho de Conclusão de Curso — Engenharia de Software  
Centro Universitário Católica de Santa Catarina

- GitHub: `https://github.com/LarissaHoffm`  


