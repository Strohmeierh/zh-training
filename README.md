# Grundkenntnistest Kanton Zürich – Übungs-Tool

Eine einfache, statische Web-App zum Üben für den **Kantonalen Grundkenntnistest
im Einbürgerungsverfahren (Kanton Zürich)**. Alle **350 Fragen** aus dem offiziellen
Übungstest sind enthalten. Der Lernfortschritt wird **lokal im Browser** gespeichert –
es ist kein Server, Login oder Internet (nach dem Laden) nötig.

## Funktionen

- **Fragenpakete** mit 10, 20, 50 oder allen Fragen.
- **Modi:**
  - *Alle Fragen* – ungesehene und zuvor falsche Fragen kommen zuerst.
  - *Nur schwierige* – Fragen, die du markiert (★) oder schon einmal falsch beantwortet hast.
  - *Nur falsch beantwortete* – gezielt die zuletzt falschen Fragen.
  - *Noch nicht gesehen* – Fragen, die du noch nie beantwortet hast.
- **Filter nach Thema** (Demokratie & Föderalismus, Sozialstaat & Zivilgesellschaft,
  Geschichte, Geografie, Kultur & Alltagskultur).
- **Fragen markieren** (★), die dir schwerfallen, um sie gezielt zu wiederholen.
- **Sofortiges Feedback** mit Hervorhebung der richtigen Antwort.
- **Fortschritt** wird automatisch gespeichert (`localStorage`) und übersteht das
  Schliessen des Browsers. Mit einem Klick zurücksetzbar.
- **Automatischer Geräte-Abgleich (optional):** Mit einem eigenen, kostenlosen
  Cloudflare-Worker ist der Fortschritt automatisch auf allen Geräten aktuell –
  Einrichtung siehe [`SYNC-SETUP.md`](SYNC-SETUP.md).
- **Manueller Geräte-Abgleich (Backup):** Fortschritt als Code oder Datei
  exportieren und auf einem anderen Gerät importieren (zusammenführen/ersetzen).

## Benutzung

### Online (GitHub Pages)
Sobald GitHub Pages aktiviert ist, ist die Seite direkt über die Pages-URL des
Repositorys erreichbar – einfach im Browser öffnen.

### Lokal
Die Seite ist komplett statisch und kommt ohne Build-Schritt aus.
`index.html` einfach im Browser öffnen (Doppelklick).

### Fortschritt zwischen Geräten abgleichen

**Automatisch (empfohlen):** einmalig einen kostenlosen Cloudflare-Worker
einrichten – Schritt-für-Schritt in [`SYNC-SETUP.md`](SYNC-SETUP.md). Danach ist
der Stand auf allen Geräten automatisch aktuell.

**Manuell (Backup, ohne Einrichtung):**

1. Auf Gerät A unter **„Daten & Geräte-Abgleich" → „Fortschritt exportieren"** den
   Code kopieren (oder als Datei speichern).
2. Code/Datei auf Gerät B übertragen (AirDrop, Nachricht, E-Mail, Cloud …).
3. Auf Gerät B **„Fortschritt importieren"**, Code einfügen bzw. Datei wählen und
   **„Zusammenführen"** (oder „Ersetzen") wählen.

Beim Zusammenführen gewinnt pro Frage der zuletzt bearbeitete Stand; Markierungen
gehen nie verloren. Dieselbe Merge-Logik nutzt auch der automatische Abgleich.

## Aufbau

| Datei | Zweck |
|-------|-------|
| `index.html` | Seitengerüst und Screens |
| `style.css` | Layout (responsiv, auch fürs Handy) |
| `app.js` | Logik: Auswahl, Quiz, Markieren, Fortschritt, Statistik |
| `questions.js` | Die 350 Fragen als Daten (`window.QUESTIONS`) |
| `tools/` | Perl-Skripte, mit denen die Fragen aus dem PDF extrahiert wurden |

## Herkunft der Fragen

Die Fragen stammen aus dem offiziellen Dokument *„Kantonaler Grundkenntnistest im
Einbürgerungsverfahren"* (Kanton Zürich, Direktion der Justiz und des Innern,
Gemeindeamt). Der Text wurde mit `pdftotext` extrahiert und mit den Skripten in
`tools/` strukturiert. Drei ursprünglich **bildbasierte** Fragen (Schweizer
Nationalfahne, Wappen des Kantons Zürich, Lage des Kantons Zürich) wurden in
**beschreibende Textfragen** umgewandelt, da die Bilder nicht extrahierbar waren.

> Inoffizielles Lern-Tool. Ohne Gewähr für Vollständigkeit und Richtigkeit –
> massgebend ist immer der offizielle Test.
