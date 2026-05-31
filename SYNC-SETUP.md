# Automatische Synchronisation einrichten (einmalig, ~10 Minuten)

Damit dein Lernfortschritt automatisch auf **allen Geräten** (Laptop, iPhone …)
aktuell ist, brauchst du einen winzigen, **kostenlosen** Speicher bei Cloudflare.
Du richtest ihn **einmal** ein – danach läuft alles automatisch.

> Es wird **nur** dein Lernfortschritt gespeichert (Frage-Nummern, Zähler,
> Markierungen) – keine persönlichen Daten. Der Zugriff ist nur mit deinem
> geheimen Sync-Code möglich.

---

## Schritt 1 – Cloudflare-Konto

1. Gehe zu **https://dash.cloudflare.com/sign-up** und erstelle ein kostenloses Konto
   (E-Mail + Passwort bestätigen).

## Schritt 2 – Worker erstellen

1. Links im Menü **„Workers & Pages"** öffnen.
2. **„Create application"** → **„Create Worker"**.
3. Einen Namen vergeben, z. B. `zh-sync` → **„Deploy"** (der Beispielcode ist egal).
4. Nach dem Deploy auf **„Edit code"** klicken.
5. Den **gesamten** Inhalt löschen und durch den Inhalt der Datei
   [`sync/worker.js`](sync/worker.js) aus diesem Projekt ersetzen.
6. Oben rechts **„Deploy"** klicken.

## Schritt 3 – Speicher (KV) anlegen und verbinden

1. Wieder zu **„Workers & Pages"** → links **„KV"** → **„Create a namespace"**,
   z. B. Name `zh-progress` → erstellen.
2. Deinen Worker `zh-sync` öffnen → **„Settings"** → **„Variables & Bindings"**
   (bzw. **„KV Namespace Bindings"**) → **„Add binding"**:
   - **Variable name:** `KV`  ← genau so schreiben
   - **KV namespace:** `zh-progress` auswählen
   - **„Save"**.

## Schritt 4 – URL kopieren

1. Auf der Übersichtsseite deines Workers steht die Adresse, z. B.
   `https://zh-sync.dein-name.workers.dev` → **kopieren**.

## Schritt 5 – In der App aktivieren (auf dem Laptop)

1. Lern-App öffnen → Bereich **„Daten & Geräte-Abgleich"** →
   **„Automatische Synchronisation"**.
2. Die kopierte **Worker-URL** einfügen → **„Aktivieren"**.
3. Status wechselt auf **„Synchronisiert ✓"**. Fertig auf diesem Gerät.

## Schritt 6 – iPhone (und weitere Geräte) verbinden

> **Wichtig:** Beide Geräte müssen **dieselbe Worker-URL UND denselben Sync-Code**
> verwenden. Sonst hat jedes Gerät ein eigenes, getrenntes „Konto" – beide zeigen
> dann zwar „Synchronisiert ✓", teilen aber keine Daten.

**Empfohlen (zuverlässig) – mit dem Sync-Code:**

1. Auf dem **Laptop** in der App den **Sync-Code** anzeigen lassen
   (unter „Automatische Synchronisation") und **„Code kopieren"**.
2. Code (und die Worker-URL) aufs iPhone bringen (Nachricht/E-Mail an dich selbst).
3. Auf dem **iPhone** die App öffnen → **Worker-URL** einfügen → **Sync-Code** in das
   Feld „Sync-Code" einfügen → **„Aktivieren"**. Fertig – beide Geräte teilen jetzt
   denselben Stand.

**Alternativ – mit Verbindungs-Link:** Auf dem Laptop **„Link kopieren"**, den Link
aufs iPhone bringen und dort öffnen. Öffne ihn **im selben Browser**, in dem du auch
lernst (am iPhone am besten den Link in Safari einfügen und öffnen – nicht nur in der
Vorschau einer Nachrichten-App), sonst landet die Verbindung in einem anderen
Browser-Speicher.

> Prüfen, ob es geklappt hat: Auf **beiden** Geräten muss unter „Automatische
> Synchronisation" **derselbe Sync-Code** stehen.

---

## Gut zu wissen

- **Automatik:** Abgleich passiert beim Öffnen der Seite, beim Zurückwechseln zum
  Tab und kurz nach jeder Antwort. Du musst nichts mehr tun.
- **Offline:** Ohne Internet lernst du normal weiter; sobald wieder online,
  wird automatisch abgeglichen.
- **Geheim halten:** Der Verbindungs-Link enthält deinen Sync-Code – nicht
  öffentlich teilen.
- **Kostenlos:** Cloudflares Gratis-Kontingent (100 000 Anfragen/Tag) reicht für
  diese App bei Weitem.
- **Trennen:** In der App unter „Automatische Synchronisation" → **„Trennen"**.
- Der **manuelle Export/Import** bleibt als Backup zusätzlich verfügbar.
