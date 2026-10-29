package pe.apuntes.app;

import android.app.Activity;
import android.app.Instrumentation;
import android.content.Intent;
import android.graphics.Bitmap;
import android.net.Uri;
import androidx.core.content.FileProvider;
import androidx.test.core.app.ActivityScenario;
import androidx.test.espresso.intent.Intents;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import org.json.JSONObject;
import org.junit.Test;
import org.junit.runner.RunWith;
import java.io.File;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import static androidx.test.espresso.intent.Intents.intending;
import static androidx.test.espresso.intent.matcher.IntentMatchers.hasAction;
import static org.junit.Assert.*;

@RunWith(AndroidJUnit4.class)
public class AppTest {
    private MainActivity activity;
    private String js(String expression) throws Exception {
        CountDownLatch latch=new CountDownLatch(1);AtomicReference<String> result=new AtomicReference<>();
        InstrumentationRegistry.getInstrumentation().runOnMainSync(()->activity.getWebView().evaluateJavascript(expression,v->{result.set(v);latch.countDown();}));
        assertTrue("JavaScript debe responder",latch.await(10,TimeUnit.SECONDS));return result.get();
    }
    private void waitFor(String expression) throws Exception {
        long end=System.currentTimeMillis()+20000;
        while(System.currentTimeMillis()<end){if("true".equals(js(expression)))return;Thread.sleep(150);}
        fail("No se cumplió: "+expression+"; texto="+js("document.body?.innerText"));
    }
    private void tap(String selector) throws Exception {
        js("document.querySelector("+JSONObject.quote(selector)+").scrollIntoView({block:'center'})");
        JSONObject point=new JSONObject(js("(()=>{const r=document.querySelector("+JSONObject.quote(selector)+").getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()"));
        float scale=Float.parseFloat(js("devicePixelRatio"));int[] location=new int[2];
        InstrumentationRegistry.getInstrumentation().runOnMainSync(()->activity.getWebView().getLocationOnScreen(location));
        float x=location[0]+activity.getWebView().getPaddingLeft()+(float)point.getDouble("x")*scale;
        float y=location[1]+activity.getWebView().getPaddingTop()+(float)point.getDouble("y")*scale;
        long now=android.os.SystemClock.uptimeMillis();
        android.view.MotionEvent down=android.view.MotionEvent.obtain(now,now,android.view.MotionEvent.ACTION_DOWN,x,y,0);
        android.view.MotionEvent up=android.view.MotionEvent.obtain(now,now+80,android.view.MotionEvent.ACTION_UP,x,y,0);
        InstrumentationRegistry.getInstrumentation().sendPointerSync(down);InstrumentationRegistry.getInstrumentation().sendPointerSync(up);down.recycle();up.recycle();
    }
    @Test public void strictOAuthCallbackRouting() {
        assertEquals("oauth=code=valid-code_123", MainActivity.navigationFragment(Uri.parse("apuntes://open?code=valid-code_123")));
        assertEquals("oauth=error=cancelled", MainActivity.navigationFragment(Uri.parse("apuntes://open?error=access_denied&error_description=private")));
        for(String url:new String[]{"https://open?code=foo", "apuntes://evil?code=foo", "apuntes://user@open?code=foo", "apuntes://open:99?code=foo", "apuntes://open/evil?code=foo", "apuntes://open?code=%3Cscript%3E", "apuntes://open#access_token=evil", "apuntes://open#oauth=code=evil"})
            assertNull(url,MainActivity.navigationFragment(Uri.parse(url)));
    }
    @Test public void coldOAuthReturnIsScrubbedAndNotReplayedOnRecreate() throws Exception {
        android.content.Context context=InstrumentationRegistry.getInstrumentation().getTargetContext();
        Intent callback=new Intent(context,MainActivity.class).setAction(Intent.ACTION_VIEW).setData(Uri.parse("apuntes://open?code=cold-forged-code"));
        try(ActivityScenario<MainActivity> scenario=ActivityScenario.launch(callback)) {
            scenario.onActivity(a->activity=a);
            waitFor("document.querySelector('#cloud-dialog')?.open && document.querySelector('#cloud-message').textContent.includes('no se inició aquí')");
            assertEquals("true",js("location.hash==='' && !sessionStorage.getItem('apuntes-session')"));
            scenario.recreate();scenario.onActivity(a->activity=a);
            waitFor("!!document.querySelector('#cloud-dialog')");
            assertEquals("false",js("document.querySelector('#cloud-dialog').open"));
            assertEquals("true",js("location.hash===''"));
        }
    }
    @Test public void pastedSharedMessagePreviewsWithoutJoiningOrLoggingIn() throws Exception {
        try(ActivityScenario<MainActivity> scenario=ActivityScenario.launch(MainActivity.class)) {
            scenario.onActivity(a->activity=a);
            waitFor("!!document.querySelector('#install-app:disabled')");
            js("window.previewRequests=0;window.fetch=async(url,options)=>{if(!url.endsWith('/rpc/preview_invite'))throw Error('No se debe aceptar ni autenticar todavía');window.previewRequests++;return new Response(JSON.stringify({title:'Espacio recibido',role:'member',count:1,expires_at:'2030-01-01T00:00:00Z'}),{status:200,headers:{'Content-Type':'application/json'}})};document.querySelector('#reset-demo').click();document.querySelector('#open-invitation').click();document.querySelector('#paste-invite-text').value='Te invito a mi curso\\napuntes://open#join=10000000-0000-0000-0000-000000000001';document.querySelector('#paste-invite-form').requestSubmit()");
            waitFor("document.querySelector('#invite-dialog')?.open && document.querySelector('#invite-title').textContent==='Espacio recibido'");
            assertEquals("1",js("window.previewRequests"));
            assertEquals("true",js("document.querySelector('#accept-invite').textContent.includes('Iniciar sesión') && !sessionStorage.getItem('apuntes-session') && location.hostname==='appassets.androidplatform.net'"));
            js("document.querySelector('#accept-invite').click()");
            waitFor("document.querySelector('#cloud-dialog').open");
            assertEquals("1",js("window.previewRequests"));
        }
    }
    @Test public void googleUsesExternalBrowser() throws Exception {
        Intents.init();
        try(ActivityScenario<MainActivity> scenario=ActivityScenario.launch(MainActivity.class)) {
            scenario.onActivity(a->activity=a);
            waitFor("!!document.querySelector('#install-app:disabled') && window.APUNTES_ANDROID===true");
            intending(hasAction(Intent.ACTION_VIEW)).respondWith(new Instrumentation.ActivityResult(Activity.RESULT_CANCELED,null));
            js("window.fetch=async()=>new Response(JSON.stringify({external:{google:true}}),{status:200,headers:{'Content-Type':'application/json'}});document.querySelector('#reset-demo').click();document.querySelector('#open-cloud').click();document.querySelector('#sign-in-google').click()");
            waitFor("!!localStorage.getItem('apuntes-oauth-pending') && document.querySelector('#cloud-message').textContent.includes('Continúa en Google')");
            InstrumentationRegistry.getInstrumentation().waitForIdleSync();
            boolean found=false;
            for(Intent intent:Intents.getIntents()) {
                Uri u=intent.getData();
                if(Intent.ACTION_VIEW.equals(intent.getAction()) && u!=null && "/auth/v1/authorize".equals(u.getPath())) {
                    assertEquals("https",u.getScheme());assertEquals("google",u.getQueryParameter("provider"));
                    assertEquals("apuntes://open",u.getQueryParameter("redirect_to"));
                    assertEquals("s256",u.getQueryParameter("code_challenge_method"));
                    assertNull(u.getQueryParameter("code_verifier"));found=true;
                }
            }
            assertTrue("Google debe abrirse mediante ACTION_VIEW fuera del WebView",found);
            assertEquals("true",js("location.hostname==='appassets.androidplatform.net'"));
            js("localStorage.removeItem('apuntes-oauth-pending')");
        } finally { Intents.release(); }
    }
    @Test public void offlineAppCrudBackupPersistenceAndDeepLink() throws Exception {
        Intents.init();
        try(ActivityScenario<MainActivity> scenario=ActivityScenario.launch(MainActivity.class)){
            scenario.onActivity(a->activity=a);
            waitFor("!!document.querySelector('#install-app:disabled') && document.querySelector('#connection-status').textContent.toLowerCase().includes('sin conexión')");
            assertEquals("Tareas",activity.getApplicationInfo().loadLabel(activity.getPackageManager()).toString());
            assertEquals("20",js("document.querySelector('#course-color').options.length"));
            assertEquals("0",js("document.querySelectorAll('.task').length"));
            js("document.querySelector('[data-view=courses]').click();document.querySelector('#add-course').click();document.querySelector('#course-name').value='Física móvil';document.querySelector('#course-color').value='#99d2c8';document.querySelector('#course-form').requestSubmit();");
            waitFor("document.querySelector('#courses-count').textContent==='1'");
            js("document.querySelector('[data-view=pending]').click();document.querySelector('#new-task').click();document.querySelector('#task-title').value='Entrega Android';document.querySelector('#task-due').value='2030-01-01';document.querySelector('#task-notes').value='Notas ñ 🎓';document.querySelector('#task-form').requestSubmit();");
            waitFor("document.querySelectorAll('#task-list .task').length===1");
            js("document.querySelector('.task-title-button').click();document.querySelector('#task-title').value='Editada en Android';document.querySelector('#task-time').value='18:30';document.querySelector('#task-form').requestSubmit();");
            waitFor("document.querySelector('.task-title-button').textContent==='Editada en Android'");
            js("document.querySelector('.task-check').click()");
            waitFor("document.querySelector('#completed-count').textContent==='1'");
            js("document.querySelector('#undo-button').click()");
            waitFor("document.querySelectorAll('#task-list .task').length===1");
            // Use Android's real ContentResolver via a controlled document-picker response.
            File dir=new File(activity.getCacheDir(),"backups");assertTrue(dir.mkdirs()||dir.isDirectory());
            File output=new File(dir,"respaldo.json");assertTrue(output.createNewFile()||output.isFile());
            Uri uri=FileProvider.getUriForFile(activity,"pe.apuntes.app.files",output);
            intending(hasAction(Intent.ACTION_CREATE_DOCUMENT)).respondWith(new Instrumentation.ActivityResult(Activity.RESULT_OK,new Intent().setData(uri)));
            js("document.querySelector('#reset-demo').click();document.querySelector('#export-backup').click()");
            long end=System.currentTimeMillis()+15000;while(output.length()==0&&System.currentTimeMillis()<end)Thread.sleep(100);
            JSONObject backup=new JSONObject(new String(Files.readAllBytes(output.toPath()),StandardCharsets.UTF_8));
            assertEquals("Editada en Android",backup.getJSONArray("tasks").getJSONObject(0).getString("title"));
            assertEquals("Notas ñ 🎓",backup.getJSONArray("tasks").getJSONObject(0).getString("notes"));
            assertEquals("#99d2c8",backup.getJSONArray("courses").getJSONObject(0).getString("color"));
            scenario.recreate();scenario.onActivity(a->activity=a);
            waitFor("document.querySelector('.task-title-button')?.textContent==='Editada en Android'");
            // Links generated by the APK must target this app, never appassets.androidplatform.net.
            js("document.querySelector('.task-menu summary').click();document.querySelector('.share-task').click()");
            assertEquals("Enlace generado: "+js("document.querySelector('#share-link').value")+"; puente: "+js("[window.APUNTES_ANDROID,typeof ApuntesAndroid?.saveFile,document.querySelector('#toast-text').textContent]"),"true",js("document.querySelector('#share-link').value.startsWith('apuntes://open#apuntes=')"));
            String link=new org.json.JSONTokener(js("document.querySelector('#share-link').value")).nextValue().toString();
            js("document.querySelector('#share-dialog [data-close]').click()");
            // Paste a whole WhatsApp-style message; no clickable link is needed.
            js("document.querySelector('#reset-demo').click();document.querySelector('#open-invitation').click();document.querySelector('#paste-invite-text').value="+JSONObject.quote("Te comparto una copia:\n"+link+"\nAbre Tareas y pega este mensaje.")+";document.querySelector('#paste-invite-form').requestSubmit()");
            waitFor("document.querySelector('#invite-dialog')?.open===true && !document.querySelector('#paste-invite-dialog').open");
            assertEquals("1",js("document.querySelectorAll('#task-list .task').length"));
            assertEquals("\"\"",js("document.querySelector('#paste-invite-text').value"));
            js("document.querySelector('#accept-invite').click()");
            waitFor("document.querySelectorAll('#task-list .task').length===2");
            // Import bridge hands a content URI to the page. Exercise file reading and restore.
            intending(hasAction(Intent.ACTION_OPEN_DOCUMENT)).respondWith(new Instrumentation.ActivityResult(Activity.RESULT_OK,new Intent().setData(uri)));
            js("document.querySelector('#reset-demo').click();window.confirm=()=>true");
            tap(".file-label");
            waitFor("!document.querySelector('#settings-dialog').open && document.querySelectorAll('#task-list .task').length===1");
            // Native wrapper should never navigate into a remotely hosted document.
            assertEquals("true",js("location.hostname==='appassets.androidplatform.net'"));
            // A forged browser callback must be scrubbed and must NOT log in.
            InstrumentationRegistry.getInstrumentation().runOnMainSync(()->activity.startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse("apuntes://open?code=not-started-here")).setPackage("pe.apuntes.app")));
            waitFor("document.querySelector('#cloud-dialog')?.open && document.querySelector('#cloud-message').textContent.includes('no se inició aquí')");
            assertEquals("true",js("location.hash==='' && !sessionStorage.getItem('apuntes-session') && location.hostname==='appassets.androidplatform.net'"));
            js("document.querySelector('#cloud-dialog [data-close]').click()");
            // Exercise the actual exported Android deep link last: ActivityScenario does
            // not reliably track RESUMED after singleTask onNewIntent delivery.
            InstrumentationRegistry.getInstrumentation().runOnMainSync(()->activity.startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse(link)).setPackage("pe.apuntes.app")));
            waitFor("document.querySelector('#invite-dialog')?.open===true");
            js("document.querySelector('#accept-invite').click()");
            waitFor("document.querySelectorAll('#task-list .task').length===2");
            Bitmap screen=InstrumentationRegistry.getInstrumentation().getUiAutomation().takeScreenshot();
            try(FileOutputStream stream=new FileOutputStream(new File(activity.getFilesDir(),"android-prueba.png"))){screen.compress(Bitmap.CompressFormat.PNG,100,stream);}
        }finally{Intents.release();}
    }
}
