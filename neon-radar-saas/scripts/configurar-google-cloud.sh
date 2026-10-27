#!/usr/bin/env bash
# NEON RADAR — Google Cloud bootstrap (executar em Google Cloud Shell, conta proprietária)
# Apenas prepara APIs e chave de navegador restrita. NÃO vincula cartão/faturamento.
set -Eeuo pipefail

PROJECT_ID="${1:-$(gcloud config get-value project 2>/dev/null || true)}"
SITE="${SITE_URL:-https://neon-radar-saas-tribal70.onrender.com}"

if ! command -v gcloud >/dev/null 2>&1; then
  echo 'ERRO: execute pelo Google Cloud Shell (gcloud não instalado).' >&2; exit 2
fi
if [[ -z "$PROJECT_ID" || "$PROJECT_ID" == '(unset)' ]]; then
  echo 'ERRO: selecione projeto pelo menu do Cloud Shell ou forneça PROJECT_ID como argumento.' >&2; exit 2
fi
if ! [[ "$SITE" =~ ^https://[a-zA-Z0-9._-]+(:[0-9]+)?$ ]]; then
  echo 'ERRO: SITE_URL deve ser uma origem HTTPS sem caminho.' >&2; exit 2
fi

echo "Projeto: $PROJECT_ID"
gcloud projects describe "$PROJECT_ID" --format='value(projectId)' >/dev/null
BILLING="$(gcloud billing projects describe "$PROJECT_ID" --format='value(billingEnabled)' 2>/dev/null || true)"
if [[ "${BILLING,,}" != 'true' ]]; then
  echo 'BLOQUEADO: o projeto não tem faturamento habilitado ou a conta não tem permissão para vê-lo.' >&2
  echo 'Vincule faturamento diretamente no Google Cloud Console, revise custos e volte a executar.' >&2
  exit 3
fi

cat <<NOTICE
ATENÇÃO: essas APIs são tarifadas conforme uso e podem gerar cobranças.
Não há cobrança na execução do script, mas o USO POSTERIOR pode ser cobrado.
Antes de liberar o acesso público, configure quotas e alertas de orçamento:
  https://console.cloud.google.com/billing
  https://console.cloud.google.com/apis/dashboard?project=$PROJECT_ID

A chave do backend requer SERVER_EGRESS_IPS com os CIDRs de saída do Render.
Encontre os ranges no painel Render: serviço -> Connect -> Outbound.
Essas faixas são compartilhadas; IP dedicado oferece isolamento mais forte.
NOTICE

if [[ "${CONFIRMO_ATIVACAO_APIS:-}" != 'SIM' ]]; then
  echo 'Sem alteração. Reexecute com CONFIRMO_ATIVACAO_APIS=SIM após revisar custos.'
  exit 4
fi

echo 'Habilitando as APIs e o serviço de gerenciamento de chaves...'
gcloud services enable \
  places.googleapis.com \
  routes.googleapis.com \
  maps-backend.googleapis.com \
  apikeys.googleapis.com \
  --project "$PROJECT_ID" --quiet

echo 'Criando chave restrita ao domínio e à Maps JavaScript API...'
gcloud services api-keys create \
  --project "$PROJECT_ID" \
  --display-name="NEON-RADAR-BROWSER" \
  --allowed-referrers="$SITE/*" \
  --api-target=service=maps-backend.googleapis.com \
  --format='value(name)'

if [[ -n "${SERVER_EGRESS_IPS:-}" ]]; then
  echo 'Criando chave de servidor restrita aos IPs informados e às APIs Places/Routes...'
  gcloud services api-keys create \
    --project "$PROJECT_ID" \
    --display-name="NEON-RADAR-SERVER" \
    --allowed-ips="$SERVER_EGRESS_IPS" \
    --api-target=service=places.googleapis.com \
    --api-target=service=routes.googleapis.com \
    --format='value(name)'
else
  echo 'CHAVE DE SERVIDOR NÃO CRIADA: informe SERVER_EGRESS_IPS com as faixas Outbound do Render.'
  echo 'Essas faixas são compartilhadas; chave com IP dedicado é mais segura.'
fi

cat <<NEXT

PRÓXIMOS PASSOS (NÃO ENVIE SEGREDOS NO CHAT):
1. Google Cloud Console -> APIs e serviços -> Credenciais: copie as chaves em ambiente seguro.
2. Render -> Neon Radar SaaS -> Environment:
     VITE_GOOGLE_MAPS_BROWSER_KEY = chave NEON-RADAR-BROWSER
     GOOGLE_MAPS_SERVER_KEY  = chave NEON-RADAR-SERVER (somente quando restrita adequadamente)
3. Configure quotas no Google Cloud, limites de custos e teste uma busca real autenticada.
4. A chave de navegador é exposta aos visitantes por definição; restrição por HTTP referrer é obrigatória.
NEXT