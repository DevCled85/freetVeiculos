<div align="center">
  <img src="./src/medias/logo_vidronox.jpg" width="180" alt="FleetCheck Logo"/>
  <h1>FleetCheck - Controle Avançado de Frota</h1>
</div>

FleetCheck é um sistema completo e moderno para a gestão de veículos, checklists diários e controle de avarias, idealizado para operações logísticas críticas (como frotas de entrega, serviços em campo e vidraçarias). Construído seguindo fortes princípios de UI/UX contemporâneos (Glassmorphism e Dark Mode dinâmico), combinando performance de frontend de última geração com um backend realtime em nuvem.

---

## 🚀 Funcionalidades Principais

- **Dashboard Administrativo**: Visão panóptica de toda a frota, métricas em tempo real, avarias pendentes, veículos ativos e checklists recentes através de gráficos atualizados nativamente e cards modulares.
- **Gestão de Perfil Segura**: Motoristas e Supervisores possuem áreas de perfis próprios com controle de foto (Uploads para storage na nuvem), alteração de senha segura e configuração de números de Telefone/WhatsApp para recebimento de alertas.
- **Checklist Diário Passo a Passo**: UX moderna através de sub-formulários onde os motoristas atestam a saúde diária do carro (Pneus, Limpeza, Motor, Elétrica, etc) de maneira fluida pelo celular ou desktop.
- **Relatos Multimídia de Avarias**: Registro rápido detalhando prioridades de manutenção (Baixa, Média, Alta) e upload das provas visuais do prejuízo ou ocorrência.
- **💡 [SISTEMA PIONEIRO] Alerta Recorrente de Negligência**: Para que nenhum supervisor esqueça resoluções vitais no pátio:
  - **Prioridade Alta**: Relembra a pendência a cada **1 Dia**.
  - **Prioridade Média**: Relembra a pendência a cada **4 Dias**.
  - **Prioridade Baixa**: Relembra a pendência a cada **7 Dias**.
  *(Possui motor lógico de "Elapsed Time", cobrando a manutenção retroativamente mesmo se o sistema e computadores da empresa passarem dias desligados no servidor ou durante a falta de um funcionário)*
- **Disparo Expresso WhatsApp (wa.me)**: Com 1 clique em qualquer alerta pipocando na tela, os dados estruturados da avaria e do veículo pulam gerando uma conversa nativa do WhatsApp (desktop ou mobile) encaminhada imediatamente.
- **Integração Edge-Webhooks Backend Pronta**: Arquitetura conta com a rotina `send-whatsapp-alert` instalada remotamente em Edge Functions Deno/Supabase, perfeita para espetar provedores SaaS Z-API ou Evolution API e não necessitar sequer desse único 1 clique manual no futuro.
- **Sincronia Global (Sockets)**: Os componentes gráficos não requerem botão de `Atualizar/F5`. Graças à assinatura `supabase.channel()`, inserts feitos no pátio com o celular acendem telas gráficas no escritório automaticamente.

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
