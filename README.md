
# Sistema de Reserva de Carros Corporativos

## Visão Geral

**Nome do Projeto:** Sistema de Reserva de Carros Corporativos  
**Responsável:** Larissa Hoffmann de Souza  
**Curso:** Engenharia de Software  
**Data de Entrega:** 24/03/2025  
**Resumo:** Sistema web corporativo para controle de reservas de veículos, rastreamento de deslocamento, dashboard de KPIs e notificações automáticas. O sistema será modular, escalável e seguro, utilizando práticas de CI/CD, TDD, SOLID e Clean Code.

## Contexto
Empresas com frotas corporativas enfrentam desafios na gestão de reservas de veículos, controle de uso e monitoramento de deslocamentos. O uso de planilhas ou sistemas descentralizados pode gerar conflitos de agenda e dificuldades na análise de dados. O sistema proposto automatiza esse processo, garantindo maior eficiência e controle.

### Justificativa
A solução é relevante pois promove:
- Redução de conflitos e melhora na disponibilidade dos veículos;
- Rastreabilidade e segurança no uso dos carros corporativos;
- Otimização de trajetos com seleção de rotas e postos permitidos;
- Notificações automáticas via Outlook e Teams.

## Objetivos

### Objetivo Geral
Desenvolver um sistema seguro e eficiente para gerenciamento de reservas de veículos corporativos, integrando funcionalidades de autenticação, rastreio, alertas e geração de relatórios.

### Objetivos Específicos
- Criar um dashboard de KPIs;
- Monitoramento com Prometheus e Grafana
- Integração com Google Maps para rotas e abastecimento
- Geração de relatórios em Excel/PDF
- Testes automatizados via TDD
- CI/CD estruturado com versionamento

## Escopo

### Funcionalidades
- Cadastro e reserva de veículos
- Dashboard de indicadores
- Notificações via e-mail e Teams
- Geração de rotas e pontos de abastecimento
- Logs de uso e auditoria de acesso

## Descrição do Projeto

###Tema do Projeto
Sistema para reserva e gestão de frotas corporativas, permitindo agendamento de veículos, monitoramento de uso e otimização de rotas.

### Problemas a Resolver
- Falta de controle eficiente nas reservas;
- Dificuldade na gestão de trajetos e abastecimento;
- Ausência de integração com serviços corporativos.

### Limitações
Não incluirá funcionalidades de manutenção veicular;
Não contemplará gestão financeira da frota.


## Especificação Técnica

### Requisitos Funcionais

| Código | Descrição |
|--------|-----------|
| RF01   | CRUD de veículos e reservas |
| RF02   | Visualização de disponibilidade por calendário |
| RF03   | Geração de rota e postos de abastecimento via Google Maps |
| RF04   | Notificações via integração com Outloook/Teams |
| RF05   | Geração de relatórios em Excel/PDF |
| RF06   | Dashboard com métricas de uso |

### Requisitos Não-Funcionais
| Código | Descrição |
|--------|-----------|
| RNF01   | Disponibilidade ≥ 99% |
| RNF02   | Segurança de autenticação e criptografia |
| RNF03   | Responsividade|
| RNF04   | Logs de auditoria|
| RNF05   | Acessibilidade |
| RNF06   | Interface com principio de UX/UI |


## Arquitetura e Design

### Arquitetura
- Estilo: Microserviços
- Frontend: React com padrão MVC
- Backend: NestJS (Node.js) com padrão MVC
- Modelagem: C4 Model
- Infra: Docker + AWS ou Azure

### Segurança
- Autenticação com JWT e OAuth2
- Criptografia de dados sensíveis
- Logs de auditoria com rastreabilidade

## Stack Tecnológica

| Camada     | Tecnologias                  | 
|------------|------------------------------|
| Frontend   | React.js                     | 
| Backend    | Node.js (NestJS)             | 
| Banco de Dados | PostgreSQL               | 
| Cache      | Redis                        | 
| Monitoramento | Prometheus, Grafana       |
| Observabilidade | OpenTelemetry           | 
| Deploy     | CI/CD com GitHub Actions     | 
| Gerenciamento de Projeto | GitHub Projects | 


##  Considerações de Segurança



## Próximos Passos
| Fase | Título                                   | Descrição |
|------|------------------------------------------|-----------|
| 1    | Levantamento de Requisitos               | Entrevistas e modelagem C4 |
| 2    | Configuração do Ambiente e Infra         | Docker, GitHub, estrutura CI/CD |
| 3    | Desenvolvimento do Backend               | Módulo de autenticação, reservas, logs |
| 4    | Desenvolvimento do Frontend              | Telas de login, dashboard, reservas |
| 5    | Integrações e Testes                     | Maps, notificações, testes automatizados |
| 6    | Documentação e Apresentação Final        | Wiki + slides + deploy final |
