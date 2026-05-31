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
  function applyImport(incoming, mode) {
    if (mode === 'replace') {
      state = { version: 1, stats: incoming.stats };
    } else { // zusammenführen: pro Frage gewinnt der zuletzt bearbeitete Stand
      var ids = {}, merged = {};
      Object.keys(state.stats).forEach(function (k) { ids[k] = 1; });
      Object.keys(incoming.stats).forEach(function (k) { ids[k] = 1; });
      Object.keys(ids).forEach(function (id) {
        var a = state.stats[id], b = incoming.stats[id];
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
      state = { version: 1, stats: merged };
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
  }

  document.addEventListener('DOMContentLoaded', init);
})();
