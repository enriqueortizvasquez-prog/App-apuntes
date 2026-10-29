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
    @Test public void offlineAppCrudBackupPersistenceAndDeepLink() throws Exception {
        Intents.init();
        try(ActivityScenario<MainActivity> scenario=ActivityScenario.launch(MainActivity.class)){
            scenario.onActivity(a->activity=a);
            waitFor("!!document.querySelector('#install-app:disabled') && document.querySelector('#connection-status').textContent.toLowerCase().includes('sin conexión')");
            assertEquals("0",js("document.querySelectorAll('.task').length"));
            js("document.querySelector('[data-view=courses]').click();document.querySelector('#add-course').click();document.querySelector('#course-name').value='Física móvil';document.querySelector('#course-form').requestSubmit();");
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
            scenario.recreate();scenario.onActivity(a->activity=a);
            waitFor("document.querySelector('.task-title-button')?.textContent==='Editada en Android'");
            // Links generated by the APK must target this app, never appassets.androidplatform.net.
            js("document.querySelector('.task-menu summary').click();document.querySelector('.share-task').click()");
            assertEquals("Enlace generado: "+js("document.querySelector('#share-link').value")+"; puente: "+js("[window.APUNTES_ANDROID,typeof ApuntesAndroid?.saveFile,document.querySelector('#toast-text').textContent]"),"true",js("document.querySelector('#share-link').value.startsWith('apuntes://open#apuntes=')"));
            String link=new org.json.JSONTokener(js("document.querySelector('#share-link').value")).nextValue().toString();
            js("document.querySelector('#share-dialog [data-close]').click()");
            InstrumentationRegistry.getInstrumentation().runOnMainSync(()->activity.startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse(link)).setPackage("pe.apuntes.app")));
            waitFor("document.querySelector('#invite-dialog')?.open===true");
            js("document.querySelector('#accept-invite').click()");
            waitFor("document.querySelectorAll('#task-list .task').length===2");
            scenario.recreate();scenario.onActivity(a->activity=a);
            waitFor("document.querySelectorAll('#task-list .task').length===2");
            // Import bridge hands a content URI to the page. Exercise file reading and restore.
            intending(hasAction(Intent.ACTION_OPEN_DOCUMENT)).respondWith(new Instrumentation.ActivityResult(Activity.RESULT_OK,new Intent().setData(uri)));
            js("document.querySelector('#reset-demo').click();window.confirm=()=>true");
            tap(".file-label");
            waitFor("!document.querySelector('#settings-dialog').open && document.querySelectorAll('#task-list .task').length===1");
            // Native wrapper should never navigate into a remotely hosted document.
            assertEquals("true",js("location.hostname==='appassets.androidplatform.net'"));
            Bitmap screen=InstrumentationRegistry.getInstrumentation().getUiAutomation().takeScreenshot();
            try(FileOutputStream stream=new FileOutputStream(new File(activity.getFilesDir(),"android-prueba.png"))){screen.compress(Bitmap.CompressFormat.PNG,100,stream);}
        }finally{Intents.release();}
    }
}
