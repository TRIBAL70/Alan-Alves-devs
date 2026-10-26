# Alan Alves Dev Android

App Android Expo/React Native que carrega https://alan-alves-dev.lovable.app/.

## Compilar sem Android Studio
1. Envie todos os arquivos para a raiz do repositório GitHub (inclusive `.github/workflows/android-apk.yml`).
2. Abra a aba **Actions** do GitHub.
3. Selecione **Build Android APK** e toque **Run workflow**.
4. Após a conclusão, abra a execução e baixe o arquivo `alan-alves-dev-debug-apk` em **Artifacts**.
5. Extraia o ZIP para obter `app-debug.apk`.

O APK de debug terá assinatura nova e não substituirá uma instalação existente assinada com outra chave. Para atualizar sem desinstalar é necessário preservar o `applicationId` original, a assinatura original e aumentar o `versionCode`. O package atual é provisório.
