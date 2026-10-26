# Alan Alves Dev TV

Projeto Android nativo em Java com WebView para TV TCL Android TV / Google TV e teste em telefones Android.

- Site carregado: https://alan-alves-dev.lovable.app/
- Tela horizontal, suporte a Launcher Android TV e navegação básica por D-pad.
- Necessita de conexão com a internet e Android System WebView compatível.
- Sites construídos para toque ou mouse podem exigir alterações CSS/JS e gerenciamento de foco para funcionar bem com um controle remoto. Ainda não foi testado numa TV física.

## Build automático
Envie o **conteúdo desta pasta** para a raiz de um repositório GitHub (preferivelmente em branch isolada, sem substituir projeto existente). Em GitHub Actions, abra o fluxo **Compilar APK Android TV** e clique em **Run workflow**. Ao terminar, baixe o artefato Alan-Alves-Dev-TV-debug e extraia o APK.

O APK será assinado com chave de depuração gerada no runner. Este é um app de teste, com package `com.alanalves.devtv`. NÃO substituirá nem atualizará o APK anterior, que possui outra assinatura/applicationId.

## Instalação
Transfira o APK para a TV (por USB, por exemplo), habilite instalação de fontes desconhecidas no aplicativo gerenciador de arquivos quando o Android TV solicitar, e instale. Como alternativa, use `adb install app-debug.apk` via rede com depuração habilitada. Se não aparecer no launcher, procure em Configurações > Apps.

## Segurança e limites
Sem tratamento de downloads, compartilhamento, upload/seleção de arquivo, permissões de câmera/microfone ou autenticação por pop-ups externos. Acrescente código e testes específicos se o site usar essas funções. A compatibilidade real de todas as páginas não está comprovada.
