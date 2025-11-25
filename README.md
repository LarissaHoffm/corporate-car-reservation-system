# Sistema de Reservas de Carros Corporativos

Este sistema visa otimizar a gestão da frota de veículos corporativos, permitindo controle e reserva de carros por diferentes tipos de usuários: Administradores, Aprovadores e Usuários.

## 🚀 Tecnologias Utilizadas

- **Frontend**: React.js, Tailwind CSS, React Router, Axios
- **Backend**: NestJS, TypeORM/Prisma, Passport.js + JWT, Class Validator, Swagger
- **Banco de Dados**: PostgreSQL
- **Cache**: Redis
- **Segurança**: OAuth2, JWT
- **Infraestrutura**: Docker, Azure
- **Monitoramento**: Prometheus + Grafana
- **CI/CD**: GitHub Actions

## CI/CD e Qualidade de Código

Este repositório possui esteira de CI/CD configurada com GitHub Actions, SonarCloud e deploy automatizado para a VM na Azure.  
- **CI & SonarCloud**: executa lint, testes, build e análise estática para backend e frontend.
- **Deploy to Production**: atualiza a aplicação em produção após o CI e o Quality Gate do SonarCloud estarem verdes.

