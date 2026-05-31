/* Grundkenntnistest Zürich – Übungs-App
   Reine Frontend-Logik, Fortschritt in localStorage. */
(function () {
  'use strict';

  var STORAGE_KEY = 'zh-gkt-v1';
  var QUESTIONS = window.QUESTIONS || [];

  // ---------- Fortschritt laden / speichern ----------
  var state = loadState();

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && parsed.stats) return parsed;
      }
    } catch (e) { /* ignorieren */ }
    return { version: 1, stats: {} };
  }
  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch (e) { /* Speicher evtl. voll/blockiert */ }
    scheduleSyncPush(); // bei aktivem Sync den Stand (debounced) hochladen
  }
  function statFor(id) {
    if (!state.stats[id]) {
      state.stats[id] = { gesehen: 0, richtig: 0, falsch: 0, markiert: false, letztesErgebnis: null, zuletzt: 0 };
    }
    return state.stats[id];
  }

  // ---------- Frage-Kategorien ----------
  // "sicher": zuletzt richtig beantwortet und nicht markiert
  function isMastered(id) {
    var s = state.stats[id];
    return !!s && s.letztesErgebnis === 'richtig' && !s.markiert;
  }
  function isHard(id) {
    var s = state.stats[id];
    if (!s) return false;
    return s.markiert || s.falsch > 0 || s.letztesErgebnis === 'falsch';
  }
  function isWrong(id) {
    var s = state.stats[id];
    return !!s && (s.letztesErgebnis === 'falsch' || (s.falsch > 0 && s.letztesErgebnis !== 'richtig'));
  }
  function isUnseen(id) {
    var s = state.stats[id];
    return !s || s.gesehen === 0;
  }

  // ---------- DOM-Helfer ----------
  function $(sel) { return document.querySelector(sel); }
  function show(screenId) {
    ['#screen-start', '#screen-quiz', '#screen-result'].forEach(function (s) {
      $(s).classList.toggle('hidden', s !== screenId);
    });
    window.scrollTo(0, 0);
  }
  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  // ---------- Startseite: Auswahlzustand ----------
  var selMode = 'all';
  var selSize = 20;
  var selTheme = '';

  function initThemeSelect() {
    var themes = [];
    QUESTIONS.forEach(function (q) {
      if (themes.indexOf(q.thema) === -1) themes.push(q.thema);
    });
    var sel = $('#theme-select');
    themes.forEach(function (t) {
      var o = document.createElement('option');
      o.value = t; o.textContent = t;
      sel.appendChild(o);
    });
  }

  function eligiblePool() {
    return QUESTIONS.filter(function (q) {
      if (selTheme && q.thema !== selTheme) return false;
      if (selMode === 'hard') return isHard(q.id);
      if (selMode === 'wrong') return isWrong(q.id);
      if (selMode === 'unseen') return isUnseen(q.id);
      return true; // all
    });
  }

  function updatePoolInfo() {
    var n = eligiblePool().length;
    var info = $('#pool-info');
    if (n === 0) {
      info.textContent = 'Keine Fragen in dieser Auswahl. Wähle einen anderen Modus oder ein anderes Thema.';
    } else {
      var take = (selSize === 'all') ? n : Math.min(selSize, n);
      info.textContent = take + ' von ' + n + ' verfügbaren Fragen werden geübt.';
    }
    $('#btn-start').disabled = (n === 0);
  }

  function updateOverview() {
    var total = QUESTIONS.length;
    var seen = 0, mastered = 0, marked = 0;
    QUESTIONS.forEach(function (q) {
      var s = state.stats[q.id];
      if (s && s.gesehen > 0) seen++;
      if (isMastered(q.id)) mastered++;
      if (s && s.markiert) marked++;
    });
    var openOrWrong = total - mastered;
    $('#stat-seen').textContent = seen;
    $('#stat-mastered').textContent = mastered;
    $('#stat-wrong').textContent = openOrWrong;
    $('#stat-marked').textContent = marked;
    var pct = total ? Math.round((mastered / total) * 100) : 0;
    $('#overall-progress').style.width = pct + '%';
    $('#overall-progress-text').textContent = mastered + ' von ' + total + ' Fragen sicher beantwortet (' + pct + '%)';
  }

  // ---------- Quiz-Ablauf ----------
  var session = null; // { questions:[], index, results:{} }

  function startSession(questionList) {
    session = { questions: questionList, index: 0, results: {} };
    show('#screen-quiz');
    renderQuestion();
  }

  function buildSession() {
    var pool = eligiblePool().slice();
    // Reihenfolge: im Modus "all" ungesehene & falsche zuerst, sonst zufällig
    if (selMode === 'all') {
      var priority = [], rest = [];
      shuffle(pool).forEach(function (q) {
        if (isUnseen(q.id) || isWrong(q.id)) priority.push(q); else rest.push(q);
      });
      pool = priority.concat(rest);
    } else {
      shuffle(pool);
    }
    var n = (selSize === 'all') ? pool.length : Math.min(selSize, pool.length);
    startSession(pool.slice(0, n));
  }

  function renderQuestion() {
    var q = session.questions[session.index];
    $('#quiz-counter').textContent = 'Frage ' + (session.index + 1) + ' / ' + session.questions.length;
    $('#quiz-progress').style.width = (session.index / session.questions.length * 100) + '%';
    $('#q-theme').textContent = q.thema + ' · ' + q.bereich;
    $('#q-text').textContent = q.frage;

    var s = statFor(q.id);
    updateStarButton(s.markiert);

    var box = $('#q-options');
    box.innerHTML = '';
    ['a', 'b', 'c', 'd'].forEach(function (letter) {
      var btn = document.createElement('button');
      btn.className = 'option';
      btn.dataset.letter = letter;
      var span = document.createElement('span');
      span.className = 'letter';
      span.textContent = letter.toUpperCase();
      var txt = document.createElement('span');
      txt.className = 'opt-text';
      txt.textContent = q[letter];
      btn.appendChild(span);
      btn.appendChild(txt);
      btn.addEventListener('click', function () { answer(letter); });
      box.appendChild(btn);
    });

    var fb = $('#q-feedback');
    fb.className = 'feedback hidden';
    fb.textContent = '';
    $('#btn-next').classList.add('hidden');
  }

  function answer(letter) {
    var q = session.questions[session.index];
    var s = statFor(q.id);
    var correct = (letter === q.richtig);

    // Buttons sperren + einfärben
    var opts = $('#q-options').querySelectorAll('.option');
    opts.forEach(function (btn) {
      btn.disabled = true;
      var l = btn.dataset.letter;
      if (l === q.richtig) btn.classList.add('correct');
      if (l === letter && !correct) btn.classList.add('wrong');
    });

    // Statistik aktualisieren
    s.gesehen += 1;
    s.zuletzt = Date.now();
    if (correct) { s.richtig += 1; s.letztesErgebnis = 'richtig'; }
    else { s.falsch += 1; s.letztesErgebnis = 'falsch'; }
    session.results[q.id] = { correct: correct, gewaehlt: letter };
    saveState();

    var fb = $('#q-feedback');
    if (correct) {
      fb.className = 'feedback ok';
      fb.textContent = 'Richtig!';
    } else {
      fb.className = 'feedback no';
      fb.innerHTML = 'Falsch. <span class="hint">Richtig ist ' + q.richtig.toUpperCase() + ') ' + escapeHtml(q[q.richtig]) + '</span>';
    }

    var nextBtn = $('#btn-next');
    nextBtn.textContent = (session.index + 1 >= session.questions.length) ? 'Ergebnis anzeigen' : 'Weiter';
    nextBtn.classList.remove('hidden');
  }

  function nextQuestion() {
    if (session.index + 1 >= session.questions.length) {
      showResult();
    } else {
      session.index += 1;
      renderQuestion();
    }
  }

  function updateStarButton(marked) {
    var btn = $('#btn-mark');
    btn.textContent = marked ? '★' : '☆';
    btn.title = marked ? 'Markierung entfernen' : 'Als schwierig markieren';
  }

  function toggleMark() {
    var q = session.questions[session.index];
    var s = statFor(q.id);
    s.markiert = !s.markiert;
    saveState();
    updateStarButton(s.markiert);
  }

  // ---------- Ergebnis ----------
  function showResult() {
    $('#quiz-progress').style.width = '100%';
    var ids = session.questions.map(function (q) { return q.id; });
    var richtig = 0, wrongQs = [];
    ids.forEach(function (id) {
      var r = session.results[id];
      if (r && r.correct) richtig++;
      else {
        var q = findQ(id);
        if (q) wrongQs.push(q);
      }
    });
    var total = ids.length;
    var pct = total ? Math.round(richtig / total * 100) : 0;
    $('#result-score').textContent = richtig + ' von ' + total + ' richtig (' + pct + '%)';
    $('#result-progress').style.width = pct + '%';

    var list = $('#result-wrong-list');
    list.innerHTML = '';
    if (wrongQs.length) {
      var h = document.createElement('h3');
      h.textContent = 'Falsch beantwortet (' + wrongQs.length + ')';
      h.style.fontSize = '1rem';
      list.appendChild(h);
      wrongQs.forEach(function (q) {
        var div = document.createElement('div');
        div.className = 'wrong-item';
        var qs = document.createElement('span');
        qs.className = 'wq'; qs.textContent = q.frage;
        var wa = document.createElement('span');
        wa.className = 'wa'; wa.textContent = '✓ ' + q.richtig.toUpperCase() + ') ' + q[q.richtig];
        div.appendChild(qs); div.appendChild(wa);
        list.appendChild(div);
      });
    } else {
      var p = document.createElement('p');
      p.className = 'muted';
      p.textContent = 'Alles richtig – stark! 🎉';
      list.appendChild(p);
    }

    // "Falsche wiederholen" nur anbieten, wenn es welche gibt
    $('#btn-retry-wrong').classList.toggle('hidden', wrongQs.length === 0);
    session.lastWrong = wrongQs;
    show('#screen-result');
  }

  function findQ(id) {
    for (var i = 0; i < QUESTIONS.length; i++) if (QUESTIONS[i].id === id) return QUESTIONS[i];
    return null;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // ---------- Export / Import (Geräte-Abgleich) ----------
  function exportPayload() {
    return { app: 'zh-grundkenntnistest', v: 1, exportedAt: new Date().toISOString(), state: state };
  }
  // UTF-8-sicheres Base64
  function toCode(obj) {
    return btoa(unescape(encodeURIComponent(JSON.stringify(obj))));
  }
  // Akzeptiert einen Base64-Code ODER rohes JSON; liefert {version, stats}
  function parseImport(text) {
    text = (text || '').trim();
    if (!text) throw new Error('Kein Code eingegeben und keine Datei gewählt.');
    var json = null;
    try { json = decodeURIComponent(escape(atob(text.replace(/\s+/g, '')))); JSON.parse(json); }
    catch (e) { json = null; }
    if (!json) json = text; // dann als rohes JSON versuchen
    var obj;
    try { obj = JSON.parse(json); } catch (e) { throw new Error('Code/Datei nicht lesbar.'); }
    var st = (obj && obj.stats) ? obj : (obj && obj.state && obj.state.stats ? obj.state : null);
    if (!st || typeof st.stats !== 'object') throw new Error('Keine gültigen Fortschrittsdaten gefunden.');
    return st;
  }
  // Reine Merge-Funktion: pro Frage gewinnt der zuletzt bearbeitete Stand,
  // Zähler = Max, markiert = ODER. Genutzt von Import und Auto-Sync.
  function mergeStats(localStats, otherStats) {
    var ids = {}, merged = {};
    Object.keys(localStats || {}).forEach(function (k) { ids[k] = 1; });
    Object.keys(otherStats || {}).forEach(function (k) { ids[k] = 1; });
    Object.keys(ids).forEach(function (id) {
      var a = localStats[id], b = otherStats[id];
      if (!a) { merged[id] = b; return; }
      if (!b) { merged[id] = a; return; }
      var newer = (b.zuletzt || 0) >= (a.zuletzt || 0) ? b : a;
      merged[id] = {
        gesehen: Math.max(a.gesehen || 0, b.gesehen || 0),
        richtig: Math.max(a.richtig || 0, b.richtig || 0),
        falsch: Math.max(a.falsch || 0, b.falsch || 0),
        markiert: !!(a.markiert || b.markiert),
        letztesErgebnis: newer.letztesErgebnis,
        zuletzt: Math.max(a.zuletzt || 0, b.zuletzt || 0)
      };
    });
    return merged;
  }

  function applyImport(incoming, mode) {
    if (mode === 'replace') {
      state = { version: 1, stats: incoming.stats };
    } else {
      state = { version: 1, stats: mergeStats(state.stats, incoming.stats) };
    }
    saveState();
    updateOverview();
    updatePoolInfo();
  }

  function doExport() {
    $('#export-code').value = toCode(exportPayload());
    $('#export-panel').classList.remove('hidden');
    $('#import-panel').classList.add('hidden');
    var n = Object.keys(state.stats).length;
    $('#export-msg').textContent = n + ' Fragen mit Fortschritt im Export enthalten.';
  }
  function doDownload() {
    var blob = new Blob([JSON.stringify(exportPayload(), null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'zh-fortschritt-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    $('#export-msg').textContent = 'Datei gespeichert. Übertrage sie auf das andere Gerät und importiere sie dort.';
  }
  function doCopyCode() {
    var ta = $('#export-code');
    ta.focus(); ta.select();
    var ok = function () { $('#export-msg').textContent = 'Code kopiert – auf dem anderen Gerät unter „Fortschritt importieren" einfügen.'; };
    var fallback = function () { try { document.execCommand('copy'); ok(); } catch (e) { $('#export-msg').textContent = 'Bitte den Code manuell markieren und kopieren.'; } };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(ta.value).then(ok, fallback);
    } else { fallback(); }
  }
  function doImport(mode) {
    var run = function (text) {
      var st;
      try { st = parseImport(text); }
      catch (e) { $('#import-msg').textContent = '⚠ ' + e.message; return; }
      var n = Object.keys(st.stats).length;
      applyImport(st, mode);
      $('#import-msg').textContent = '✓ ' + n + ' Fragen importiert (' + (mode === 'replace' ? 'ersetzt' : 'zusammengeführt') + '). Siehe „Dein Fortschritt" oben.';
      $('#import-code').value = ''; $('#import-file').value = '';
    };
    var f = $('#import-file').files[0];
    if (f) {
      var r = new FileReader();
      r.onload = function () { run(r.result); };
      r.onerror = function () { $('#import-msg').textContent = '⚠ Datei konnte nicht gelesen werden.'; };
      r.readAsText(f);
    } else {
      run($('#import-code').value);
    }
  }

  // ---------- Automatische Synchronisation (Cloudflare Worker) ----------
  var SYNC_KEY = 'zh-gkt-sync';
  var syncCfg = null;          // { url, code } oder null
  var lastSyncAt = 0;
  var syncInFlight = false, syncQueued = false;
  var pushTimer = null, lastTrigger = 0;

  function loadSyncCfg() {
    try {
      var raw = localStorage.getItem(SYNC_KEY);
      if (raw) { var c = JSON.parse(raw); if (c && c.url && c.code) return c; }
    } catch (e) { /* ignorieren */ }
    return null;
  }
  function saveSyncCfg(url, code) {
    syncCfg = { url: url, code: code };
    try { localStorage.setItem(SYNC_KEY, JSON.stringify(syncCfg)); } catch (e) { }
  }
  function clearSyncCfg() {
    syncCfg = null;
    try { localStorage.removeItem(SYNC_KEY); } catch (e) { }
  }

  function b64urlEncode(str) {
    return btoa(unescape(encodeURIComponent(str))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function b64urlDecode(s) {
    s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '=';
    return decodeURIComponent(escape(atob(s)));
  }
  function generateCode() {
    var bytes = new Uint8Array(18);
    (window.crypto || window.msCrypto).getRandomValues(bytes);
    var s = ''; for (var i = 0; i < bytes.length; i++) s += ('0' + bytes[i].toString(16)).slice(-2);
    return s; // 36 Hex-Zeichen
  }
  function normalizeUrl(u) {
    u = (u || '').trim();
    if (!u) return '';
    if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
    try { var x = new URL(u); return x.origin + x.pathname.replace(/\/$/, ''); } catch (e) { return ''; }
  }
  function appBaseUrl() { return location.origin + location.pathname; }
  function connectLink() {
    if (!syncCfg) return '';
    return appBaseUrl() + '#sync=' + b64urlEncode(JSON.stringify({ u: syncCfg.url, c: syncCfg.code }));
  }
  function syncUrl() { return syncCfg.url + '?code=' + encodeURIComponent(syncCfg.code); }

  function fetchWithTimeout(url, opts, ms) {
    opts = opts || {};
    var ctrl = ('AbortController' in window) ? new AbortController() : null, t = null;
    if (ctrl) { opts.signal = ctrl.signal; t = setTimeout(function () { try { ctrl.abort(); } catch (e) { } }, ms || 8000); }
    var p = fetch(url, opts);
    if (t) p = p.then(function (r) { clearTimeout(t); return r; }, function (e) { clearTimeout(t); throw e; });
    return p;
  }

  function syncPull() {
    return fetchWithTimeout(syncUrl(), { method: 'GET', cache: 'no-store' }, 8000)
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (obj) { return (obj && typeof obj.stats === 'object') ? obj : (obj === null ? null : { stats: {} }); })
      .catch(function () { return null; });
  }
  function syncPush() {
    var body = JSON.stringify({ stats: state.stats, updatedAt: Date.now() });
    return fetchWithTimeout(syncUrl(), { method: 'PUT', headers: { 'Content-Type': 'text/plain' }, body: body }, 8000)
      .then(function (r) { return r.ok; })
      .catch(function () { return false; });
  }

  function syncNow() {
    if (!syncCfg) return;
    if (syncInFlight) { syncQueued = true; return; }
    syncInFlight = true;
    setSyncStatus('Synchronisiere …', 'busy');
    syncPull().then(function (remote) {
      if (remote && remote.stats) {
        state = { version: 1, stats: mergeStats(state.stats, remote.stats) };
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { }
        updateOverview(); updatePoolInfo();
      }
      return syncPush().then(function (okPush) {
        if (okPush) { lastSyncAt = Date.now(); setSyncStatus('Synchronisiert ✓', 'ok'); }
        else setSyncStatus('Offline – lokal gespeichert', 'warn');
      });
    }).catch(function () {
      setSyncStatus('Offline – lokal gespeichert', 'warn');
    }).then(function () {
      syncInFlight = false;
      if (syncQueued) { syncQueued = false; setTimeout(syncNow, 50); }
    });
  }
  function scheduleSyncPush() {
    if (!syncCfg) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(syncNow, 2000);
  }
  function throttledSync() {
    if (!syncCfg) return;
    var now = Date.now();
    if (now - lastTrigger < 8000) return;
    lastTrigger = now;
    syncNow();
  }
  function syncBeacon() {
    if (!syncCfg || !navigator.sendBeacon) return;
    try {
      var body = JSON.stringify({ stats: state.stats, updatedAt: Date.now() });
      navigator.sendBeacon(syncUrl(), new Blob([body], { type: 'text/plain' }));
    } catch (e) { }
  }

  // -- Sync-UI --
  function setSyncStatus(text, kind) {
    var el = $('#sync-status');
    if (!el) return;
    el.textContent = text;
    el.className = 'sync-status ' + (kind || 'idle');
  }
  function renderSyncUI() {
    var on = !!syncCfg;
    $('#sync-setup').classList.toggle('hidden', on);
    $('#sync-active').classList.toggle('hidden', !on);
    if (on) {
      $('#sync-link').value = connectLink();
      if (!lastSyncAt) setSyncStatus('Bereit – wird beim Öffnen abgeglichen', 'idle');
    } else {
      setSyncStatus('Nicht eingerichtet', 'idle');
    }
  }
  function doSyncActivate() {
    var url = normalizeUrl($('#sync-url').value);
    if (!url) { $('#sync-msg').textContent = '⚠ Bitte eine gültige Worker-URL eingeben (z. B. https://…workers.dev).'; return; }
    var code = (syncCfg && syncCfg.code) ? syncCfg.code : generateCode();
    saveSyncCfg(url, code);
    $('#sync-msg').textContent = '';
    renderSyncUI();
    syncNow();
  }
  function doSyncDisconnect() {
    if (!confirm('Automatische Synchronisation auf diesem Gerät trennen? Dein lokaler Fortschritt bleibt erhalten.')) return;
    clearSyncCfg();
    lastSyncAt = 0;
    renderSyncUI();
  }
  function doCopyLink() {
    var ta = $('#sync-link');
    ta.focus(); ta.select();
    var ok = function () { $('#sync-msg').textContent = 'Link kopiert – einmal auf dem iPhone öffnen, dann synchronisiert es automatisch.'; };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(ta.value).then(ok, function () { try { document.execCommand('copy'); ok(); } catch (e) { } });
    } else { try { document.execCommand('copy'); ok(); } catch (e) { } }
  }
  function handleSyncHash() {
    var m = (location.hash || '').match(/^#sync=(.+)$/);
    if (!m) return false;
    try {
      var obj = JSON.parse(b64urlDecode(m[1]));
      if (obj && obj.u && obj.c) {
        saveSyncCfg(normalizeUrl(obj.u), obj.c);
        history.replaceState(null, '', appBaseUrl());
        return true;
      }
    } catch (e) { }
    return false;
  }
  function bindSyncControls() {
    $('#btn-sync-activate').addEventListener('click', doSyncActivate);
    $('#btn-sync-copylink').addEventListener('click', doCopyLink);
    $('#btn-sync-now').addEventListener('click', function () { if (syncCfg) syncNow(); });
    $('#btn-sync-disconnect').addEventListener('click', doSyncDisconnect);
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') throttledSync(); });
    window.addEventListener('focus', throttledSync);
    window.addEventListener('pagehide', syncBeacon);
  }
  function initSync() {
    handleSyncHash();          // evtl. Konfig aus #sync=… übernehmen
    syncCfg = loadSyncCfg();
    bindSyncControls();
    renderSyncUI();
    if (syncCfg) syncNow();    // Erst-Abgleich beim Laden
  }

  // ---------- Event-Bindings ----------
  function bindStartControls() {
    $('#mode-buttons').addEventListener('click', function (e) {
      var b = e.target.closest('.choice'); if (!b) return;
      this.querySelectorAll('.choice').forEach(function (x) { x.classList.remove('active'); });
      b.classList.add('active');
      selMode = b.dataset.mode;
      updatePoolInfo();
    });
    $('#size-buttons').addEventListener('click', function (e) {
      var b = e.target.closest('.choice'); if (!b) return;
      this.querySelectorAll('.choice').forEach(function (x) { x.classList.remove('active'); });
      b.classList.add('active');
      selSize = (b.dataset.size === 'all') ? 'all' : parseInt(b.dataset.size, 10);
      updatePoolInfo();
    });
    $('#theme-select').addEventListener('change', function () {
      selTheme = this.value;
      updatePoolInfo();
    });
    $('#btn-start').addEventListener('click', buildSession);
    $('#btn-reset').addEventListener('click', function () {
      if (confirm('Wirklich den gesamten Fortschritt löschen? Das kann nicht rückgängig gemacht werden.')) {
        state = { version: 1, stats: {} };
        saveState();
        updateOverview();
        updatePoolInfo();
      }
    });
  }

  function bindDataControls() {
    $('#btn-export').addEventListener('click', doExport);
    $('#btn-download').addEventListener('click', doDownload);
    $('#btn-copy-code').addEventListener('click', doCopyCode);
    $('#btn-import-toggle').addEventListener('click', function () {
      $('#import-panel').classList.toggle('hidden');
      $('#export-panel').classList.add('hidden');
      $('#import-msg').textContent = '';
    });
    $('#btn-import-merge').addEventListener('click', function () { doImport('merge'); });
    $('#btn-import-replace').addEventListener('click', function () {
      if (confirm('Den lokalen Fortschritt durch den importierten ersetzen?')) doImport('replace');
    });
  }

  function bindQuizControls() {
    $('#btn-next').addEventListener('click', nextQuestion);
    $('#btn-mark').addEventListener('click', toggleMark);
    $('#btn-quit').addEventListener('click', function () {
      goStart();
    });
    $('#btn-retry-wrong').addEventListener('click', function () {
      if (session && session.lastWrong && session.lastWrong.length) {
        startSession(shuffle(session.lastWrong.slice()));
      }
    });
    $('#btn-back-start').addEventListener('click', goStart);
  }

  function goStart() {
    updateOverview();
    updatePoolInfo();
    show('#screen-start');
  }

  // ---------- Init ----------
  function init() {
    if (!QUESTIONS.length) {
      $('#app').innerHTML = '<div class="card"><h2>Fehler</h2><p>Die Fragendatei konnte nicht geladen werden.</p></div>';
      return;
    }
    initThemeSelect();
    bindStartControls();
    bindQuizControls();
    bindDataControls();
    updateOverview();
    updatePoolInfo();
    show('#screen-start');
    initSync();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
