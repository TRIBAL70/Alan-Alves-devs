# Alan Alves Dev para Android TV / TCL

Este pacote adapta a versão Expo/WebView existente ao Android TV. É uma edição independente: use uma branch chamada `android-tv` e **não substitua o app móvel na `main`**.

## GitHub
1. No repositório `TRIBAL70/Alan-Alves-devs`, crie a branch `android-tv` baseada em `main`.
2. Envie os arquivos deste pacote, preservando a estrutura das pastas. Mantenha o `package.json` existente na branch.
3. Vá a Actions > Compilar APK Android TV > Run workflow e selecione `android-tv`.
4. Baixe o artefato `Alan-Alves-Dev-Android-TV`, extraia o arquivo `.apk` do ZIP.

## Instalação na TCL
1. Transfira o APK para um pendrive ou use um app de transferência de arquivos para Android TV.
2. Na TCL, abra um gerenciador de arquivos e o APK. Autorize instalar apps desconhecidos apenas para o gerenciador utilizado, se solicitado.
3. Conclua a instalação. O app deve aparecer nos aplicativos da TV graças ao LEANBACK_LAUNCHER.

## Observações
- É um pacote de código, **não um APK já compilado**. A compilação e navegação precisam ser testadas no dispositivo real.
- Botões nativos da tela de abertura aceitam foco remoto. O site embutido na WebView pode conter formulários, carrosséis e menus que não sejam navegáveis pelo controle, pois isso depende também da versão web.
- A URL do WhatsApp abre aplicativo/navegador disponível na TV; nem toda TCL terá um tratador compatível.
- O pacote usa `com.alanalves.dev.tv`, diferente do aplicativo de celular.
- Compilações release locais geradas pela GitHub Actions normalmente são assinadas com chave própria/de desenvolvimento de release; mantenha a mesma chave para atualizações futuras, ou será necessário desinstalar antes de substituir.
