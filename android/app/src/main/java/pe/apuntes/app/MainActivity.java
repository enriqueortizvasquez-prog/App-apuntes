package pe.apuntes.app;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;
import androidx.webkit.WebViewAssetLoader;
import org.json.JSONObject;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

/** Offline APK: trusted bundled assets only in WebView; external pages open outside it. */
public class MainActivity extends Activity {
    private static final String START = "https://appassets.androidplatform.net/assets/site/index.html";
    private static final int SAVE = 41, OPEN = 42;
    private WebView web;
    private ValueCallback<Uri[]> fileCallback;
    private byte[] pendingFile;
    public WebView getWebView() { return web; }

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        web = new WebView(this);
        web.setBackgroundColor(Color.rgb(17,17,17));
        setContentView(web);
        // Keep content clear of Android 15 status/navigation bars and the keyboard.
        if (android.os.Build.VERSION.SDK_INT >= 30) {
            web.setOnApplyWindowInsetsListener((view,insets)-> {
                android.graphics.Insets bars = insets.getInsets(android.view.WindowInsets.Type.systemBars() | android.view.WindowInsets.Type.ime());
                view.setPadding(bars.left,bars.top,bars.right,bars.bottom);
                return insets;
            });
        }
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setGeolocationEnabled(false);
        android.webkit.CookieManager.getInstance().setAcceptThirdPartyCookies(web,false);
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);
        final WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
            .addPathHandler("/assets/",new WebViewAssetLoader.AssetsPathHandler(this)).build();
        web.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return loader.shouldInterceptRequest(request.getUrl());
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri=request.getUrl();
                if (isLocal(uri)) return false;
                if ("apuntes".equals(uri.getScheme())) { openInvitation(uri); return true; }
                if ("https".equals(uri.getScheme()) || "http".equals(uri.getScheme())) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW,uri)); }
                    catch(ActivityNotFoundException e) { notice("No hay un navegador disponible para abrir el enlace."); }
                }
                return true;
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView view,ValueCallback<Uri[]> callback,FileChooserParams params) {
                if(fileCallback!=null)fileCallback.onReceiveValue(null);
                fileCallback=callback;
                Intent intent=new Intent(Intent.ACTION_OPEN_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("*/*");
                intent.putExtra(Intent.EXTRA_MIME_TYPES,new String[]{"application/json","text/plain"});
                try { startActivityForResult(intent,OPEN); }
                catch(ActivityNotFoundException e) { fileCallback.onReceiveValue(null);fileCallback=null;notice("No se pudo abrir el selector de archivos."); }
                return true;
            }
        });
        web.addJavascriptInterface(new FileBridge(),"ApuntesAndroid");
        String fragment=invitationFragment(getIntent().getData());
        web.loadUrl(START+(fragment==null?"":"#"+fragment));
    }
    private boolean isLocal(Uri uri) {
        return "https".equals(uri.getScheme()) && "appassets.androidplatform.net".equals(uri.getHost())
            && uri.getPort()==-1 && uri.getPath()!=null && uri.getPath().startsWith("/assets/site/");
    }
    private String invitationFragment(Uri uri) {
        if(uri==null || !"apuntes".equals(uri.getScheme()) || !"open".equals(uri.getHost()))return null;
        String fragment=uri.getEncodedFragment();
        if(fragment==null || fragment.length()>30009 || !(fragment.startsWith("apuntes=") || fragment.startsWith("join=")))return null;
        return fragment;
    }
    private void openInvitation(Uri uri) {
        String fragment=invitationFragment(uri);
        if(fragment!=null)web.loadUrl(START+"#"+fragment);
    }
    @Override protected void onNewIntent(Intent intent) { super.onNewIntent(intent);setIntent(intent);openInvitation(intent.getData()); }
    @Override public void onBackPressed() {
        web.evaluateJavascript("(()=>{const d=[...document.querySelectorAll('dialog[open]')].pop();if(d){if(document.querySelector('#save-task')?.disabled)return true;d.close();return true;}const s=document.querySelector('#sidebar.open');if(s){document.querySelector('#close-menu').click();return true;}return false;})()",value->{
            if(!"true".equals(value)){if(web.canGoBack())web.goBack();else MainActivity.super.onBackPressed();}
        });
    }
    private void notice(String text) {
        if(web==null)return;
        web.evaluateJavascript("window.dispatchEvent(new CustomEvent('apuntes-native-notice',{detail:"+JSONObject.quote(text)+"}))",null);
    }
    private class FileBridge {
        @JavascriptInterface public void saveFile(String name,String text,String mime) {
            if(text==null || text.length()>5*1024*1024)return;
            final byte[] bytes=text.getBytes(StandardCharsets.UTF_8);
            final String safeName=(name==null?"apuntes.json":name).replaceAll("[^a-zA-Z0-9._-]","_");
            runOnUiThread(()->{
                if(web==null || !isLocal(Uri.parse(web.getUrl())) || pendingFile!=null)return;
                pendingFile=bytes;
                Intent intent=new Intent(Intent.ACTION_CREATE_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("application/json");
                intent.putExtra(Intent.EXTRA_TITLE,safeName.substring(0,Math.min(safeName.length(),120)));
                try { startActivityForResult(intent,SAVE); }
                catch(ActivityNotFoundException e) {pendingFile=null;notice("No se pudo abrir el selector para guardar el respaldo.");}
            });
        }
    }
    @Override protected void onActivityResult(int request,int result,Intent data) {
        super.onActivityResult(request,result,data);
        if(request==OPEN && fileCallback!=null){
            Uri uri=result==RESULT_OK && data!=null?data.getData():null;
            fileCallback.onReceiveValue(uri==null?null:new Uri[]{uri});fileCallback=null;
        }
        if(request==SAVE){
            byte[] bytes=pendingFile;pendingFile=null;
            if(result!=RESULT_OK || data==null || data.getData()==null){notice("Guardado cancelado. Tus datos siguen en la app.");return;}
            try(OutputStream stream=getContentResolver().openOutputStream(data.getData())){
                if(stream==null || bytes==null)throw new java.io.IOException();
                stream.write(bytes);notice("Respaldo guardado en la ubicación elegida.");
            }catch(Exception e){notice("No se pudo guardar el archivo. Tus datos siguen en la app.");}
        }
    }
    @Override protected void onDestroy(){
        if(fileCallback!=null){fileCallback.onReceiveValue(null);fileCallback=null;}
        if(web!=null){web.removeJavascriptInterface("ApuntesAndroid");web.destroy();web=null;}
        super.onDestroy();
    }
}
