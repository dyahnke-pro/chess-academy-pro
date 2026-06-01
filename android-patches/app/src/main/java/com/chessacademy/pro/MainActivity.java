package com.chessacademy.pro;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebView;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.BridgeActivity;

/**
 * Chess Academy Pro — Android entry point.
 *
 * Overrides Capacitor's default {@link BridgeActivity} to grant the
 * WebView microphone permission. Without this, Android's WebView
 * denies {@code getUserMedia({ audio: true })} / Web Speech mic
 * access by default and voice chat with the coach silently fails
 * (the Android twin of the iOS AVAudioSession patch in
 * {@code ios-patches/}).
 *
 * Two layers are needed:
 *   1. OS-level RECORD_AUDIO runtime permission (requested on launch).
 *   2. WebView-level PermissionRequest grant (onPermissionRequest),
 *      so the embedded web app's getUserMedia call is allowed.
 *
 * Copied over the Capacitor-generated MainActivity by
 * {@code npm run setup:android}. Keep the package path in sync with
 * {@code appId} (com.chessacademy.pro).
 */
public class MainActivity extends BridgeActivity {

    private static final int RECORD_AUDIO_REQUEST = 4001;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // 1. Ask for the OS-level mic permission up front so the user's
        //    first voice-chat tap doesn't fail before the prompt lands.
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
                != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(
                    this,
                    new String[]{Manifest.permission.RECORD_AUDIO},
                    RECORD_AUDIO_REQUEST);
        }

        // 2. Grant the WebView's own permission request for audio
        //    capture (getUserMedia / webkitSpeechRecognition).
        WebView webView = getBridge().getWebView();
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(() -> {
                    for (String resource : request.getResources()) {
                        if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource)) {
                            request.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
                            return;
                        }
                    }
                    request.deny();
                });
            }
        });
    }
}
