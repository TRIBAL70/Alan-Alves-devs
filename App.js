import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, Linking, SafeAreaView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';

const URL = 'https://alan-alves-dev.lovable.app/';
export default function App() {
  const browser = useRef(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canGoBack) { browser.current?.goBack(); return true; }
      return false;
    });
    return () => subscription.remove();
  }, [canGoBack]);
  const navigate = useCallback((request) => {
    const uri = request.url || '';
    if (/^(whatsapp:|mailto:|tel:|sms:|intent:)/i.test(uri) || /^https:\/\/(wa\.me|api\.whatsapp\.com)(\/|$)/i.test(uri)) {
      Linking.openURL(uri).catch(() => {});
      return false;
    }
    return /^(https?:\/\/|about:blank)/i.test(uri);
  }, []);
  return <SafeAreaView style={styles.container}>
    <StatusBar backgroundColor="#050B1B" barStyle="light-content" />
    {error ? <View style={styles.center}>
      <Text style={styles.title}>Não foi possível carregar o site</Text>
      <Text style={styles.subtitle}>Verifique sua internet e tente novamente.</Text>
      <TouchableOpacity style={styles.button} onPress={() => { setError(false); browser.current?.reload(); }}>
        <Text style={styles.buttonText}>Tentar novamente</Text>
      </TouchableOpacity>
    </View> : <WebView ref={browser} source={{uri:URL}} style={styles.webview}
      javaScriptEnabled domStorageEnabled sharedCookiesEnabled startInLoadingState
      renderLoading={() => <View style={styles.center}><ActivityIndicator color="#00D5FF" size="large" /></View>}
      onNavigationStateChange={state => setCanGoBack(state.canGoBack)}
      onShouldStartLoadWithRequest={navigate}
      onError={() => setError(true)}
      onHttpError={({nativeEvent}) => { if (nativeEvent.isForMainFrame && nativeEvent.statusCode >= 400) setError(true); }}
      setSupportMultipleWindows={false} originWhitelist={['https://*','http://*']} />}
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  container:{flex:1,backgroundColor:'#050B1B'}, webview:{flex:1,backgroundColor:'#050B1B'},
  center:{flex:1,alignItems:'center',justifyContent:'center',padding:24,backgroundColor:'#050B1B'},
  title:{fontSize:20,fontWeight:'bold',color:'#FFF',textAlign:'center'},
  subtitle:{fontSize:14,color:'#ADC4D9',textAlign:'center',marginTop:12,marginBottom:24},
  button:{backgroundColor:'#006FFF',borderRadius:12,paddingHorizontal:22,paddingVertical:14},
  buttonText:{color:'#FFF',fontWeight:'bold'}
});
