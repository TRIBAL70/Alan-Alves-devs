package com.alanalves.devtv;

import android.app.Activity;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.View;
import android.webkit.WebChromeClient;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.widget.FrameLayout;
import android.widget.TextView;
import android.graphics.Color;
import android.view.Gravity;

public class MainActivity extends Activity {
    private static final String HOME_URL = "https://alan-alves-dev.lovable.app/";
    private WebView webView;
    private TextView message;

    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(6, 12, 26));
        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(6, 12, 26));
        webView.setFocusable(true);
        webView.setFocusableInTouchMode(true);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        webView.setWebChromeClient(new WebChromeClient());
        webView.setWebViewClient(new WebViewClient() {
            @Override public void onPageFinished(WebView view, String url) {
                message.setVisibility(View.GONE);
            }
            @Override public void onReceivedError(WebView view, WebResourceRequest request,
                                                   android.webkit.WebResourceError error) {
                if (request.isForMainFrame()) {
                    message.setText("Não foi possível carregar o site. Verifique a internet e pressione OK para tentar novamente.");
                    message.setVisibility(View.VISIBLE);
                }
            }
        });
        root.addView(webView, new FrameLayout.LayoutParams(-1, -1));
        message = new TextView(this);
        message.setText("Carregando Alan Alves Dev...");
        message.setTextColor(Color.WHITE);
        message.setTextSize(22);
        message.setGravity(Gravity.CENTER);
        message.setPadding(32, 24, 32, 24);
        message.setBackgroundColor(0xDD06101F);
        FrameLayout.LayoutParams msgParams = new FrameLayout.LayoutParams(-1, -2, Gravity.CENTER);
        root.addView(message, msgParams);
        message.setOnClickListener(v -> webView.loadUrl(HOME_URL));
        message.setFocusable(true);
        setContentView(root);
        webView.loadUrl(HOME_URL);
        webView.requestFocus();
    }

    @Override public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK || keyCode == KeyEvent.KEYCODE_ESCAPE) {
            if (webView.canGoBack()) webView.goBack(); else finish();
            return true;
        }
        if (keyCode == KeyEvent.KEYCODE_DPAD_CENTER || keyCode == KeyEvent.KEYCODE_ENTER) {
            if (message.getVisibility() == View.VISIBLE && message.getText().toString().startsWith("Não foi")) {
                message.setText("Carregando Alan Alves Dev...");
                webView.loadUrl(HOME_URL);
                return true;
            }
        }
        return super.onKeyDown(keyCode, event);
    }

    @Override protected void onDestroy() {
        webView.destroy();
        super.onDestroy();
    }
}
