package com.lilith.learninglab;

import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;

/** Forwards text-to-speech events to the page (window.__ttsEvent) and restarts a dead engine. */
class Progress extends UtteranceProgressListener {
    private final MainActivity a;
    private final Speaker sp;
    Progress(MainActivity a, Speaker sp) { this.a = a; this.sp = sp; }
    @Override public void onStart(String id) { a.event(id, "start", null); a.keepAwake(true); }
    @Override public void onDone(String id) { a.event(id, "done", null); a.keepAwake(false); }
    @Override public void onError(String id) { onError(id, -1); }
    @Override public void onError(String id, int code) {
        a.event(id, "error", String.valueOf(code)); a.keepAwake(false);
        if (code == TextToSpeech.ERROR_SERVICE || code == TextToSpeech.ERROR_NOT_INSTALLED_YET || code == TextToSpeech.ERROR) sp.restart();
    }
    @Override public void onStop(String id, boolean interrupted) { a.keepAwake(false); }
    @Override public void onRangeStart(String id, int start, int end, int frame) { a.event(id, "range", null); }
}
