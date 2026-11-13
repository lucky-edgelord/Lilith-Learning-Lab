package com.lilith.learninglab;

import android.content.Context;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.os.Build;
import android.speech.tts.TextToSpeech;

import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Owns the text-to-speech engine. All calls from the page are serialised on one thread (so stop-then-speak keeps its order),
 * speak waits for a starting engine instead of failing, a dead engine is restarted, and audio focus is requested so calls
 * and other media pause the Teacher cleanly.
 */
class Speaker implements TextToSpeech.OnInitListener {
    private final MainActivity a;
    private final ExecutorService ex = Executors.newSingleThreadExecutor();
    private final Object lock = new Object();
    private TextToSpeech tts;
    private volatile boolean ready = false;
    private boolean initing = false;
    private final AudioManager am;
    private AudioFocusRequest focusReq;
    private final AudioManager.OnAudioFocusChangeListener focusListener;

    Speaker(MainActivity a) {
        this.a = a;
        focusListener = change -> {
            if (change == AudioManager.AUDIOFOCUS_LOSS || change == AudioManager.AUDIOFOCUS_LOSS_TRANSIENT) {
                ex.execute(() -> { stopEngine(); });
                this.a.event("u0", "focusloss", null);
            }
        };
        am = (AudioManager) a.getSystemService(Context.AUDIO_SERVICE);
        a.runOnUiThread(this::start);
    }

    boolean isReady() { return ready; }

    private void start() {
        synchronized (lock) {
            initing = true; ready = false;
            try { tts = new TextToSpeech(a.getApplicationContext(), this); } catch (Exception e) { initing = false; lock.notifyAll(); }
        }
    }

    @Override
    public void onInit(int status) {
        synchronized (lock) {
            if (status == TextToSpeech.SUCCESS && tts != null) {
                int r = tts.setLanguage(Locale.US);
                if (r == TextToSpeech.LANG_MISSING_DATA || r == TextToSpeech.LANG_NOT_SUPPORTED) tts.setLanguage(Locale.getDefault());
                tts.setPitch(1.05f);
                tts.setOnUtteranceProgressListener(new Progress(a, this));
                ready = true;
            } else ready = false;
            initing = false;
            lock.notifyAll();
        }
    }

    /** Waits (off the main thread) until the engine is ready. */
    private boolean awaitReady(long ms) {
        long end = System.currentTimeMillis() + ms;
        synchronized (lock) {
            while (!ready && initing) {
                long left = end - System.currentTimeMillis();
                if (left <= 0) break;
                try { lock.wait(left); } catch (InterruptedException e) { return ready; }
            }
            return ready;
        }
    }

    /** Throws the engine away and starts a fresh one. Safe to call repeatedly; runs on the speech thread. */
    void restart() {
        ex.execute(() -> {
            synchronized (lock) { ready = false; }
            try { if (tts != null) { tts.stop(); tts.shutdown(); } } catch (Exception e) { /* engine already gone */ }
            tts = null;
            a.runOnUiThread(this::start);
        });
    }

    void speak(final String text, final float rate, final int id) {
        ex.execute(() -> {
            if (!awaitReady(4000)) {
                a.runOnUiThread(this::start);
                if (!awaitReady(5000)) { a.event("u" + id, "error", "notready"); return; }
            }
            requestFocus();
            try {
                tts.setSpeechRate(Math.max(0.5f, Math.min(2.5f, rate)));
                int res = tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, "u" + id);
                if (res != TextToSpeech.SUCCESS) { a.event("u" + id, "error", "speak" + res); restart(); }
            } catch (Exception e) {
                a.event("u" + id, "error", "throw"); restart();
            }
        });
    }

    void stop() { ex.execute(() -> { stopEngine(); abandonFocus(); }); }

    private void stopEngine() { try { if (tts != null && ready) tts.stop(); } catch (Exception e) { /* ignore */ } }

    void shutdown() {
        ex.execute(() -> {
            abandonFocus();
            try { if (tts != null) { tts.stop(); tts.shutdown(); } } catch (Exception e) { /* ignore */ }
            tts = null; ready = false;
        });
        ex.shutdown();
    }

    private void requestFocus() {
        if (am == null) return;
        try {
            if (Build.VERSION.SDK_INT >= 26) {
                if (focusReq == null) {
                    focusReq = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK)
                        .setAudioAttributes(new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA).setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build())
                        .setOnAudioFocusChangeListener(focusListener).build();
                }
                am.requestAudioFocus(focusReq);
            } else {
                am.requestAudioFocus(focusListener, AudioManager.STREAM_MUSIC, AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK);
            }
        } catch (Exception e) { /* speak anyway */ }
    }

    private void abandonFocus() {
        if (am == null) return;
        try {
            if (Build.VERSION.SDK_INT >= 26) { if (focusReq != null) am.abandonAudioFocusRequest(focusReq); }
            else am.abandonAudioFocus(focusListener);
        } catch (Exception e) { /* ignore */ }
    }
}
