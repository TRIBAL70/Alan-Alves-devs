# NEON RADAR — OpenStreetMap

Versão 1.1: mapa e busca de estabelecimentos sem Google Maps Platform e sem chaves Google.

## Executar

Node 20 ou superior. Na pasta `neon-radar-saas`:

```sh
npm install
npm run build
npm start
```

`npm run build` executa os testes, valida TypeScript e inclui o vídeo original na abertura.

## Mapa e busca

- Leaflet 1.9.4, com mapa OpenStreetMap e atribuição visível. Marcadores são coordenadas reais dos resultados.
- Consultas de baixo volume via Overpass no servidor, por nome/categoria e raio, ou município brasileiro no texto. Categorias: restaurantes, lanchonetes, barbearias, mercados, farmácias, clínicas, academias, oficinas, padarias e outras.
- Exemplos: `lanchonetes em Porto Alegre`, `restaurantes em Viamão`, ou nome de empresa com uma região selecionada.
- Dados colaborativos ODbL. Contatos, endereço e horários só aparecem quando cadastrados; não existe promessa de cobertura completa.
- Notas/avaliações Google não são carregadas, filtradas nem inventadas. A ausência de avaliações não aumenta o índice de oportunidade.
- Horários cadastrados são exibidos como texto. Não inferir “aberto agora” a partir de regras não interpretadas; a única exceção explícita é `24/7`.
- Detalhes, favoritos e CRM usam IDs com namespace `osm_node_…`, `osm_way_…` ou `osm_relation_…`. IDs antigos são preservados e não são interpretados como IDs OSM.
- Rotas abrem o OpenStreetMap em nova aba com origem/destino e modo de transporte. Não há cálculo de percurso/tempo ou polilinha dentro do Neon Radar.
- Nenhuma chamada à API pública Nominatim, nenhum autocomplete remoto, raspagem, busca sistemática ou varredura em lote.

## Limites e provedores

Esta configuração usa serviços públicos comunitários para uso inicial de baixo volume, sem garantia de disponibilidade. Não é uma infraestrutura de busca ilimitada para SaaS em escala.

- Cache de 30 minutos, até 150 consultas; respostas limitadas a 60 registros e 1,5 MB.
- Uma consulta upstream por vez, intervalo mínimo de dois segundos, no máximo duas consultas aguardando/executando.
- Limite máximo de 20 chamadas upstream por dia UTC/instância, 26 segundos por consulta e raio de até 20 km. Sem retries automáticos em instâncias públicas.
- Limite de 30 operações OSM por usuário/dia. Os contadores e o cache são em memória e reiniciam com a instância. Para múltiplas instâncias, usar um limitador/cache compartilhado e um provedor com capacidade contratada ou infraestrutura própria.
- `OSM_WARM_QUERY`, opcional, pré-carrega uma única consulta no início da instância e registra apenas contagem/fonte para verificação operacional.
- `OSM_OVERPASS_URL` permite trocar o servidor sem alterar código. `OSM_MAX_UPSTREAM_DAILY` pode reduzir o limite, nunca ultrapassando 20 nesta configuração pública.
- `OSM_TILE_URL` permite trocar o provedor de imagens do mapa. Ao trocar, revisar também a atribuição exigida pelo provedor.
- Respeitar https://operations.osmfoundation.org/policies/tiles/ e a política do operador Overpass escolhido. Tiles são carregados normalmente pelo navegador, sem prefetch ou download offline.

## Conta, CRM e IA

Supabase, autenticação, banco e políticas RLS foram preservados. `REQUIRE_AUTH_FOR_PAID_APIS=true` mantém login obrigatório para pesquisas; não desabilitar em produção. A NEON AI mantém a chave exclusivamente no servidor e utiliza as cotas SQL existentes. Os contadores Google legados da tabela SQL não representam consumo OSM.

Variáveis: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, opcionalmente `SUPABASE_SERVICE_ROLE_KEY`; `OPENAI_API_KEY` e opcionalmente `OPENAI_MODEL`. Nunca usar prefixo `VITE_` para segredos. Não inserir valores no repositório ou chat. Chaves Google já salvas no ambiente são ignoradas por esta versão.

Migrações existentes `sql/schema.sql`, `002_cost_controls.sql`, `003_usage_status.sql`, `004_admin.sql` continuam válidas. Nenhuma mudança de schema é necessária para os IDs OSM de texto. Não alterar planos/admin automaticamente.

## Render

Serviço existente `neon-radar-saas-tribal70`, branch `neon-radar-saas`, repositório `TRIBAL70/Alan-Alves-devs`.

- Build: `cd neon-radar-saas && npm install --no-audit --no-fund && npm run build`
- Start: `cd neon-radar-saas && npm start`
- Health: `/api/health`
- Configuração pública sem segredos: `/api/config`; provedor `openstreetmap` indica configuração, não garante disponibilidade do serviço externo.

Validação: testes de autenticação e API, pesquisa sem chaves Google usando upstream HTTP simulado apenas no teste, cache, IDs, campos ausentes e escape de consultas. Além dos testes, verificar uma consulta real e o mapa na publicação.
