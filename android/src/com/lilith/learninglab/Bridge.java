package com.lilith.learninglab;

import android.webkit.JavascriptInterface;

/** JavaScript bridge: window.AndroidTTS.speak(text, rate, id) / stop() / isReady() / copy(text) / share(title, text) / fetchUrl(url, id) / httpStart(...) / httpAbort(id). Runs on a WebView background thread. */
class Bridge {
    private final MainActivity a;
    Bridge(MainActivity a) { this.a = a; }

    @JavascriptInterface
    public void speak(String text, float rate, int id) { a.speaker.speak(text, rate, id); }

    @JavascriptInterface
    public void stop() { a.speaker.stop(); }

    @JavascriptInterface
    public boolean isReady() { return a.speaker.isReady(); }

    @JavascriptInterface
    public void restartEngine() { a.speaker.restart(); }

    @JavascriptInterface
    public void copy(final String text) {
        a.runOnUiThread(() -> {
            android.content.ClipboardManager cm = (android.content.ClipboardManager) a.getSystemService(android.content.Context.CLIPBOARD_SERVICE);
            if (cm != null) cm.setPrimaryClip(android.content.ClipData.newPlainText("Lilith Learning Lab", text));
        });
    }

    @JavascriptInterface
    public void share(final String title, final String text) {
        a.runOnUiThread(() -> {
            android.content.Intent i = new android.content.Intent(android.content.Intent.ACTION_SEND);
            i.setType("text/plain");
            i.putExtra(android.content.Intent.EXTRA_SUBJECT, title);
            i.putExtra(android.content.Intent.EXTRA_TEXT, text);
            try { a.startActivity(android.content.Intent.createChooser(i, title)); } catch (Exception e) { /* no share target */ }
        });
    }

    /** Downloads a text file over HTTPS from raw.githubusercontent.com only (course catalog and course files). Result goes to window.__netDone(id, ok, text). */
    @JavascriptInterface
    public void fetchUrl(final String url, final int id) {
        new Thread(() -> {
            String text; boolean ok = false;
            try {
                java.net.URL u = new java.net.URL(url);
                if (!"https".equals(u.getProtocol()) || !"raw.githubusercontent.com".equals(u.getHost())) throw new java.io.IOException("Only raw.githubusercontent.com is allowed");
                java.net.HttpURLConnection c = (java.net.HttpURLConnection) u.openConnection();
                c.setConnectTimeout(15000); c.setReadTimeout(30000); c.setInstanceFollowRedirects(true);
                c.setRequestProperty("User-Agent", "LilithLearningLab");
                int code = c.getResponseCode();
                if (code != 200) throw new java.io.IOException("HTTP " + code);
                java.io.InputStream in = c.getInputStream();
                java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();
                byte[] buf = new byte[16384]; int n; long total = 0;
                while ((n = in.read(buf)) > 0) { total += n; if (total > 20L * 1024 * 1024) throw new java.io.IOException("File too large"); out.write(buf, 0, n); }
                in.close();
                text = out.toString("UTF-8"); ok = true;
            } catch (Exception e) {
                text = String.valueOf(e.getMessage() == null ? e.toString() : e.getMessage());
            }
            final String q = org.json.JSONObject.quote(text); final boolean fok = ok;
            a.runOnUiThread(() -> a.web.evaluateJavascript("window.__netDone&&window.__netDone(" + id + "," + fok + "," + q + ")", null));
        }).start();
    }

    private static final java.util.Map<Integer, java.net.HttpURLConnection> CONNS = new java.util.concurrent.ConcurrentHashMap<>();

    /** General HTTP for the AI features (ollama.com and other servers send no CORS headers, so the page cannot call them itself).
     *  Only http/https. Events go to window.__httpEv(id, kind, a, b): 'h' (status, headers JSON), 'd' (base64 chunk), 'e' (end), 'x' (error message). */
    @JavascriptInterface
    public void httpStart(final int id, final String method, final String url, final String headersJson, final String body) {
        new Thread(() -> {
            java.net.HttpURLConnection c = null;
            try {
                java.net.URL u = new java.net.URL(url);
                String pr = u.getProtocol();
                if (!"https".equals(pr) && !"http".equals(pr)) throw new java.io.IOException("Only http and https are allowed");
                c = (java.net.HttpURLConnection) u.openConnection();
                CONNS.put(id, c);
                c.setConnectTimeout(20000); c.setReadTimeout(300000); c.setInstanceFollowRedirects(true);
                c.setRequestMethod(method == null || method.isEmpty() ? "GET" : method);
                c.setRequestProperty("User-Agent", "LilithLearningLab");
                if (headersJson != null && !headersJson.isEmpty()) {
                    org.json.JSONObject h = new org.json.JSONObject(headersJson);
                    java.util.Iterator<String> it = h.keys();
                    while (it.hasNext()) { String k = it.next(); c.setRequestProperty(k, h.optString(k)); }
                }
                if (body != null && !body.isEmpty()) {
                    c.setDoOutput(true);
                    byte[] b = body.getBytes("UTF-8");
                    c.setFixedLengthStreamingMode(b.length);
                    java.io.OutputStream os = c.getOutputStream(); os.write(b); os.close();
                }
                int code = c.getResponseCode();
                org.json.JSONObject hs = new org.json.JSONObject();
                for (java.util.Map.Entry<String, java.util.List<String>> e : c.getHeaderFields().entrySet())
                    if (e.getKey() != null && e.getValue() != null && !e.getValue().isEmpty()) hs.put(e.getKey().toLowerCase(java.util.Locale.ROOT), e.getValue().get(0));
                ev(id, "h", String.valueOf(code), hs.toString());
                java.io.InputStream in = code >= 400 ? c.getErrorStream() : c.getInputStream();
                if (in != null) {
                    byte[] buf = new byte[16384]; int n; long total = 0;
                    while ((n = in.read(buf)) > 0) {
                        total += n; if (total > 64L * 1024 * 1024) throw new java.io.IOException("Response too large");
                        ev(id, "d", android.util.Base64.encodeToString(buf, 0, n, android.util.Base64.NO_WRAP), "");
                    }
                    in.close();
                }
                ev(id, "e", "", "");
            } catch (Exception e) {
                ev(id, "x", String.valueOf(e.getMessage() == null ? e.toString() : e.getMessage()), "");
            } finally {
                CONNS.remove(id);
                if (c != null) c.disconnect();
            }
        }).start();
    }

    @JavascriptInterface
    public void httpAbort(final int id) {
        final java.net.HttpURLConnection c = CONNS.remove(id);
        if (c != null) new Thread(c::disconnect).start();
    }

    private void ev(int id, String kind, String x, String y) {
        final String js = "window.__httpEv&&window.__httpEv(" + id + ",'" + kind + "'," + org.json.JSONObject.quote(x) + "," + org.json.JSONObject.quote(y) + ")";
        a.runOnUiThread(() -> a.web.evaluateJavascript(js, null));
    }
}
