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

1. Auf dem Laptop in der App **„Link kopieren"** klicken (Verbindungs-Link).
2. Diesen Link **einmal aufs iPhone** bringen (z. B. AirDrop, Nachricht oder
   E-Mail an dich selbst) und **auf dem iPhone öffnen**.
3. Die App übernimmt die Verbindung automatisch – ab jetzt ist alles synchron.

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
