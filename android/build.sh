#!/bin/sh
set -eu
: "${ANDROID_SDK_ROOT:?Set Android SDK directory}"
: "${JAVA_HOME:?Set JDK directory}"
: "${ALAN_APP_ORIGIN:?Set the deployed HTTPS site origin}"
: "${ALAN_KEYSTORE:?Set the private signing keystore path}"
: "${ALAN_KEY_PASS:?Set the private keystore password}"
cd "$(dirname "$0")"
TOOLS="$ANDROID_SDK_ROOT/build-tools/35.0.0"
PLATFORM="$ANDROID_SDK_ROOT/platforms/android-35/android.jar"
mkdir -p build/classes build/dex build/gen res/values
printf '<resources><string name="app_origin">%s</string></resources>\n' "$ALAN_APP_ORIGIN" > res/values/config.xml
"$TOOLS/aapt" package -f -m -J build/gen -M AndroidManifest.xml -S res -I "$PLATFORM"
"$JAVA_HOME/bin/javac" -source 8 -target 8 -bootclasspath "$TOOLS/core-lambda-stubs.jar:$PLATFORM" -d build/classes src/com/alanbarber/app/MainActivity.java build/gen/com/alanbarber/app/R.java
"$TOOLS/d8" --lib "$PLATFORM" --min-api 26 --output build/dex build/classes/com/alanbarber/app/*.class
"$TOOLS/aapt" package -f -M AndroidManifest.xml -S res -I "$PLATFORM" -F build/unsigned.apk
(cd build/dex && zip -q ../unsigned.apk classes.dex)
"$TOOLS/zipalign" -f -p 4 build/unsigned.apk build/aligned.apk
"$TOOLS/apksigner" sign --ks "$ALAN_KEYSTORE" --ks-key-alias alanbarber --ks-pass env:ALAN_KEY_PASS --key-pass env:ALAN_KEY_PASS --out ../public/downloads/alan-barber.apk build/aligned.apk
"$TOOLS/apksigner" verify --verbose ../public/downloads/alan-barber.apk
