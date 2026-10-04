# SnapLift — Workout Tracker & PWA

**SnapLift** è una Progressive Web App (PWA) mobile-first per la gestione delle schede di allenamento, il sovraccarico progressivo e il tracciamento dei carichi in palestra.

---

## ✨ Funzionalità Principali

- 📱 **Progressive Web App (PWA) Offline-First:**
  - Installabile su iOS (Safari "Aggiungi a Home") e Android / Chrome / Desktop.
  - Caching dell'app shell, pagina `/offline` di fallback e avviso di nuova versione disponibile.
  - Funzionamento completo in palestra anche in assenza di rete con coda persistente **IndexedDB** e sincronizzazione automatica idempotente appena torna la connessione.
  - Indicatore di sincronizzazione visivo discreto (Sincronizzato, In attesa, Offline).

- 🏋️ **Esperienza in Allenamento (Gym Polish):**
  - **Screen Wake Lock:** lo schermo rimane sempre acceso durante l'allenamento attivo.
  - **Timer di recupero di precisione:** calcolato su timestamp reali (non sballa se lo smartphone va in stand-by), con allarme sonoro integrato Web Audio, vibrazione e notifiche in background.
  - **Recupero sessione interrotta:** banner intelligente per riprendere subito un allenamento in corso se l'app viene chiusa per errore.

- 🤖 **Importazione Schede con AI (Google Gemini):**
  - Importa schede da fotocamera o screenshot (fino a 5 immagini contemporaneamente).
  - Estrazione strutturata in JSON con fallback automatico multi-modello (`gemini-3.8-flash` $\rightarrow$ `gemini-3.7-flash` $\rightarrow$ `gemini-3.5-flash` $\rightarrow$ ...).
  - Schermata di revisione interattiva con Drag & Drop (@dnd-kit) per riordinare giorni ed esercizi.

- 📈 **Sovraccarico Progressivo & Grafici:**
  - Suggerimento automatico carichi calcolato in base alle ripetizioni massime raggiunte nella sessione precedente.
  - Grafici di carico massimo e volume totale settimana per settimana nella pagina *Progressi*.

- 🔒 **Dati & Privacy (GDPR Compliance):**
  - **Esportazione completa:** download dei propri dati in formato standard **JSON** e **CSV**.
  - **Eliminazione totale:** cancellazione permanente di profilo, schede, sessioni, serie e utente Supabase Auth con doppia conferma.
  - Pagine dedicate per Informativa sulla Privacy (`/privacy`) e Termini di Servizio (`/terms`).

---

## 🚀 Avvio in Sviluppo

```bash
# Installa le dipendenze
npm install

# Avvia il server di sviluppo
npm run dev

# Esegui i test unitari
npm test

# Esegui la build di produzione
npm run build
```

Per le istruzioni di pubblicazione in produzione su Vercel, consulta la guida dettagliata in [DEPLOY.md](file:///D:/Archivio/Workspace/Lavoro/snap-lift/DEPLOY.md).
