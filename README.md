# Interfaceamento · Frontend

Painel administrativo em português para o Interfaceamento.Cloud localizado em `../sasainterfaceamento`. React, TypeScript e Vite.

## Executar

Requer Node.js 22 ou superior.

```bash
npm install
npm run dev
```

Abra o endereço informado pelo Vite (normalmente http://127.0.0.1:5173). O painel autentica no backend SaaS e carrega os laboratórios disponíveis para a sessão.

## Conectar ao backend

1. Inicie o Phoenix e PostgreSQL conforme o README do backend, configurando `ADMIN_API_TOKEN` no Cloud.
2. O proxy de desenvolvimento encaminha `/api` para `http://127.0.0.1:4000`. Para outro endereço, copie `.env.example` para `.env.local`, altere `CLOUD_API_URL` e reinicie o Vite.
3. Clique em **Conectar ao Cloud** e informe o token administrativo. O token fica apenas em memória, é descartado ao recarregar ou desconectar e não vai em variáveis VITE, URLs ou localStorage.
4. Selecione o tenant. Se não houver tenants, abra Tenants e crie o primeiro.

A credencial do backend atual é um administrador global da plataforma, não uma sessão de usuário com isolamento por tenant. Este painel é uma primeira interface administrativa, não um portal para clientes finais com autenticação e RBAC.

## Funcionalidades

- Visão geral com contadores de mensagens recebidas, prontas para entrega, entregues, falhas e Edges vinculados ao laboratório.
- Listagem e criação de tenants, laboratórios e Edges.
- Seleção de tenant na conexão real, busca e filtros de habilitação.
- Geração de código de ativação de Edge, exibido apenas enquanto o diálogo estiver aberto.
- Auditoria por tenant, limitada aos 50 eventos mais recentes.
- Estados de carregamento, vazio, erro e adaptação para celular.

Contratos conferidos no router, ControlController e ControlJSON do backend. Não há chamadas para endpoints inexistentes. O backend não disponibiliza GET de instrumentos/destinos nem métricas de mensagens; essas telas e métricas ficam para uma próxima etapa. Habilitado não significa online. O diagrama representa a arquitetura, não tráfego em tempo real. O aceite Cloud não confirma entrega ao LIS.

## Verificar e publicar

```bash
npm test
npm run build
npm run preview
```

`dist/` contém os arquivos estáticos. Em produção, configure HTTPS e um reverse proxy de `/api` para o Cloud na mesma origem. O proxy do Vite é apenas para desenvolvimento; `preview` não substitui esse proxy de produção. Não injete o token administrativo no bundle. A fonte DM Sans é opcional e carregada do Google Fonts, com fallback sans-serif.

Testes automatizados verificam o cliente HTTP, autenticação, filtros por tenant, erros e formato das chamadas. A integração com backend ativo precisa ser validada com um token e banco disponíveis.
