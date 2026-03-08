<div align="center">
  <img src="./src/medias/logo_vidronox.jpg" width="180" alt="FleetCheck Logo"/>
  <h1>FleetCheck - Controle Avançado de Frota</h1>
</div>

FleetCheck é um sistema completo e moderno para a gestão de veículos, checklists diários e controle de avarias, idealizado para operações logísticas críticas (como frotas de entrega, serviços em campo e vidraçarias). Construído seguindo fortes princípios de UI/UX contemporâneos (Glassmorphism e Dark Mode dinâmico), combinando performance de frontend de última geração com um backend realtime em nuvem.

---

## 🚀 Funcionalidades Principais

- **Dashboard Administrativo**: Visão panóptica de toda a frota, métricas em tempo real, avarias pendentes, veículos ativos e checklists recentes através de gráficos dinâmicos e cards modulares.
- **Gerador de Relatórios Avançados (PDF)**: Motor de relatórios configuráveis com filtros de data granulares, gerando PDFs profissionais com histórico de checklists, abastecimentos e avarias estruturados para impressão.
- **Histórico e Relatórios Mensais**: Repositório centralizado de relatórios salvos e geração automática pelo sistema ao final de cada mês, garantindo backup histórico da operação sem esforço manual.
- **Gestão de Perfil Segura**: Motoristas e Supervisores possuem áreas de perfis próprios com controle de foto (Uploads para cloud storage), alteração de senha e configuração de WhatsApp para alertas críticos.
- **Sistema de Versionamento Integrado**: O sistema exibe o número de versão `v1.0.x` e o hash do commit diretamente na interface (Login e Sidebar), garantindo transparência sobre as atualizações em produção.
- **Checklist Diário Passo a Passo**: UX moderna através de sub-formulários onde os motoristas atestam a saúde diária do carro de maneira fluida pelo celular ou desktop.
- **Relatos Multimídia de Avarias**: Registro rápido detalhando prioridades de manutenção (Baixa, Média, Alta) com upload de provas visuais para auditoria.
- **💡 [SISTEMA PIONEIRO] Alerta Recorrente de Negligência**: Para que nenhum supervisor esqueça resoluções vitais no pátio:
  - **Prioridade Alta**: Relembra a pendência a cada **1 Dia**.
  - **Prioridade Média**: Relembra a pendência a cada **4 Dias**.
  - **Prioridade Baixa**: Relembra a pendência a cada **7 Dias**.
- **Sincronia Global (Sockets)**: Componentes 100% reativos que dispensam o uso de `F5`. Graças à tecnologia `Realtime Subscriptions`, os dados inseridos no pátio atualizam as telas do escritório instantaneamente.

---

## 🛠️ Stack de Tecnologias

**Frontend Moderno**
- ⚛️ [React 19](https://react.dev/) + TypeScript - Arquitetura de Componentes
- ⚡ [Vite](https://vitejs.dev/) - Bundler Ultra Rápido e HMR
- 🎨 [Tailwind CSS 4](https://tailwindcss.com/) - Motor visual atômico para personalização
- 🎭 [Framer Motion](https://motion.dev/) - Biblioteca física para animações e modais vivos
- 📊 [Recharts](https://recharts.org/) - Desenho e renderização dos gráficos com base em SVG
- 🖼️ [Lucide React](https://lucide.dev/) - Design limpo de ícones vetorizados

**Backend (Baas)**
- ☁️ [Supabase](https://supabase.com/): 
  - Banco de Dados Escalável em `PostgreSQL 17`
  - Realtime subscriptions nativas para Websockets DB->UI
  - Autenticação Nativa Integrada
  - Storage Files System (S3-Like)
  - Nuvem de Scripts (Serveless Edge Functions em Deno)

---

## 📦 Como Instalar e Rodar Localmente

1. **Clone este repositório**
   ```bash
   git clone https://github.com/DevCled85/freetVeiculos.git
   cd freetVeiculos
   ```

2. **Instale todas as dependências do ecossistema**
   ```bash
   npm install
   ```

3. **Variáveis de Conexão com a Nuvem**
   Duplique ou renomeie o arquivo `.env.example` para `.env` na raiz do projeto e configure as credenciais públicas do seu projeto Supabase:
   ```env
   VITE_SUPABASE_URL=https://<SUA-URL>.supabase.co
   VITE_SUPABASE_ANON_KEY=<SUA-CHAVE-PUBLICA>
   ```

4. **Acione a Ignição**
   Inicie a compilação local:
   ```bash
   npm run dev
   ```
   Acesse no navegador: `http://localhost:3000` (ou similar apresentado no seu console).

---

## 🗄️ Publicação Automática (Deploy)

A infraestrutura contínua já foi configurada para enviar e hospedar todas as versões geradas do frontend empacotadas de graça nos Servidores de Rede Global do GitHub. Não necessita de comandos complicados de CI/CD:

Sempre que a sua versão local (a que está testando) estiver pronta para ir pro ar:
```bash
# Compila e lança à Branch de subida da Hospedagem:
npm run deploy
```

Em poucos minutos as atualizações já limpam os caches e se encontram online no link `.github.io` público do seu projeto.
