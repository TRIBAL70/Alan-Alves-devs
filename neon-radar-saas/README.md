# NEON RADAR SaaS — versão funcional com integrações condicionadas às credenciais

## O que está implementado

- Abertura cinematográfica usando **o vídeo original** e botão INICIAR, seguido por dashboard React/TypeScript + Framer Motion.
- Painel futurista com 12 seções, responsividade, menu inferior mobile, mapa Google oficial quando configurado.
- API Node na **mesma origem**: Text Search (New), Nearby Search (New), Place Details (New), Autocomplete e Routes API. Field Masks explícitas, validação e timeout.
- Análise NEON AI baseada somente nos dados da consulta, pela API OpenAI **no servidor**.
- Autenticação Supabase (login, cadastro, recuperação) e banco PostgreSQL com RLS, favoritos, nr_leads, notas, tarefas, interações, histórico e controle de quotas por função SQL.
- Comparação de até 5 negócios, filtros, índice de oportunidade explicado, gráficos reais, relatórios imprimíveis em PDF.
- Zero cartões fictícios nas pesquisas. Sem integração Google, a UI sinaliza que a conexão está pendente.

## Instalar / executar

Requer Node 20+.

```bash
cp .env.example .env
npm install
npm run build
npm start
# porta padrão 3000
```

Para desenvolvimento frontend: execute `npm run dev` e em outro terminal `npm start` (após compilar uma vez). O proxy Vite encaminha `/api` ao backend.

## Integração Google Cloud

1. Crie um projeto Google Cloud com faturamento e quotas sob controle do proprietário.
2. Ative **Places API (New)**, **Maps JavaScript API** e **Routes API**.
3. Crie duas chaves de API com restrições diferentes: servidor `GOOGLE_MAPS_SERVER_KEY` para Places/Routes (restrições de API e de IP quando o serviço tiver egress fixo); navegador `VITE_GOOGLE_MAPS_BROWSER_KEY` para Maps JavaScript (restrição de sites HTTP referrers; inclua o domínio Render e seu próprio domínio).
4. Insira chaves secretas **somente** no ambiente do servidor Render, não no GitHub. A chave de navegador é pública, mas deve ser limitada por domínio e API.
5. No Google Cloud Billing, configure alertas/orçamento e quotas. Alertas de orçamento **não** bloqueiam cobranças automaticamente. Há quotas por IP e conta na aplicação, porém para escala utilize um rate limiter persistente compartilhado.

## Supabase

1. Crie projeto Supabase. Execute `sql/schema.sql` em **SQL Editor**. Configure `SUPABASE_URL`, `SUPABASE_ANON_KEY` (sem segredo no navegador) e opcionalmente `SUPABASE_SERVICE_ROLE_KEY` apenas no backend.
2. Configure URLs de redirecionamento Auth para seu domínio. Decida se confirmação por e-mail é obrigatória.
3. `auth.uid()` controla permissões e `nr_consume_quota` aplica cotas SQL atômicas aos usuários autenticados. Os perfis não podem alterar o próprio plano.
4. Para contas sem login, o backend limita a 3 chamadas por categoria por IP/dia **em memória** (reinícios repõem o limite); desative consultas públicas ou use Redis/WAF antes de produção com custos elevados.
5. Colunas CRM e favoritos armazenam `place_id`, status e conteúdo próprio do usuário, **não replicam** listagens do Google.

## IA

Configure `OPENAI_API_KEY` e opcionalmente `OPENAI_MODEL`. Envia contexto de até 5 resultados da tela e limita saída. Sem chave exibe o motivo da indisponibilidade.

## Vídeo original

`npm run build` reconstrói `dist/intro.mp4` a partir das partes já presentes em `../neon-radar-site/assets/intro-part-*.txt` no repositório. Também funciona com `public/intro.mp4` diretamente, se usar este projeto em outro repositório. O vídeo fica em loop na entrada.

## Publicação Render

Serviço Web Node: branch `neon-radar-saas` do repositório `TRIBAL70/Alan-Alves-devs`.

- **Build:** `cd neon-radar-saas && npm install && npm run build`
- **Start:** `cd neon-radar-saas && npm start`
- **Plan:** Free durante testes (o serviço pode adormecer). Acrescente as variáveis via Environment.

O antigo site estático Render pode continuar como backup; a versão SaaS usa outro serviço e link. Não alterar chaves no código nem colar segredos em mensagens.

## Limites / próximos passos antes de operação comercial

- Configurar credenciais e testar API real, mapa e rotas. Não há chaves privadas pré-configuradas.
- Testar migração SQL e políticas com usuários diferentes. Atualmente CRM opera em navegador por RLS.
- Ativar domínio, HTTPS, controles de origem/CSRF quando houver sessão baseada em cookies, monitoramento de erros, logs de custo e alertas.
- Integrações de pagamento, multi-tenant empresarial, tarefas e interações possuem tabelas/arquitetura, mas **não** há UI operacional completa nem faturamento automatizado.
- Relatório PDF utiliza impressão do navegador; funcionalidades avançadas de PDF são extensão futura.
- Clusterização avançada de marcadores, Google Photos licenciadas e cálculo visual da polilinha do trajeto ainda requerem implementação adicional.
- A versão depende da disponibilidade e das condições de uso do Google Maps Platform. Não usar listas Google para enriquecimento offline, raspagem ou exportação em massa.