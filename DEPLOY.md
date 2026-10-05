# Guida al Deploy di SnapLift su Vercel

Questa guida riassume la checklist completa per pubblicare SnapLift su **Vercel** con supporto PWA, autenticazione Supabase (email + Google OAuth) e intelligenza artificiale Gemini.

---

## 1. Variabili d'Ambiente su Vercel

Nel pannello di Vercel (**Project Settings $\rightarrow$ Environment Variables**), aggiungi le seguenti variabili:

| Variabile | Descrizione | Visibilità |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del progetto Supabase (es. `https://xyz.supabase.co`) | Pubblica (Client + Server) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chiave anon/pubblica di Supabase | Pubblica (Client + Server) |
| `SUPABASE_SERVICE_ROLE_KEY` | Chiave `service_role` (segreta, per cancellazione totale account/dati) | Solo Server (Secret) |
| `GEMINI_API_KEY` | Chiave API di Google AI Studio per l'estrazione schede da foto | Solo Server (Secret) |
| `GEMINI_MODEL` | *(Opzionale)* Modello primario Gemini (default: `gemini-3.8-flash`) | Solo Server |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Chiave pubblica VAPID per Notifiche Push (Web Push su iOS / Android) | Pubblica (Client + Server) |
| `VAPID_PRIVATE_KEY` | Chiave privata VAPID per firma crittografica notifiche push | Solo Server (Secret) |
| `VAPID_SUBJECT` | Indirizzo email o contatto (`mailto:support@snaplift.app`) per protocollo VAPID | Solo Server |
| `QSTASH_TOKEN` | *(Opzionale)* Token Upstash QStash per scheduling push serverless distribuito | Solo Server |

---

## 2. Configurazione Redirect URLs su Supabase

Nella dashboard di Supabase (**Authentication $\rightarrow$ URL Configuration**):

1. **Site URL:**
   ```text
   https://tuo-progetto.vercel.app
   ```
2. **Redirect URLs:**
   Aggiungi:
   - `http://localhost:3000/**` *(per sviluppo locale)*
   - `https://tuo-progetto.vercel.app/**`
   - `https://tuo-progetto.vercel.app/auth/callback`

---

## 3. Configurazione Google Cloud OAuth (per Login con Google)

Nella [Google Cloud Console](https://console.cloud.google.com/apis/credentials) del tuo Client OAuth Web:

1. **Origini JavaScript autorizzate:**
   - `http://localhost:3000`
   - `https://tuo-progetto.vercel.app`
2. **URI di reindirizzamento autorizzati:**
   - Incolla l'URL di callback di Supabase:
     ```text
     https://<project-ref>.supabase.co/auth/v1/callback
     ```

---

## 4. Verifica PWA & Installazione

- **Manifest PWA:** servito automaticamente da `/manifest.webmanifest`.
- **Service Worker:** memorizza l'app shell in cache e fornisce fallback per l'esperienza offline (`/offline`).
- **Supporto iOS:** safe areas gestite per iPhone/iPad con notch e dynamic island (`viewport-fit=cover`).
- **Aggiornamenti controllati:** banner automatico quando viene distribuita una nuova versione su Vercel.

---

## 5. Notifiche Push di Fine Recupero (iOS & Android)

- Su **iOS (da iOS 16.4 in poi)**: Le notifiche push Web funzionano **esclusivamente se l'app è aggiunta alla schermata Home** (PWA installata da Safari tramite *"Condividi $\rightarrow$ Aggiungi alla schermata Home"*). In una normale scheda Safari mobile, Apple disabilita la Web Push API per motivi di privacy/sistema.
- **Server Push & APNs**: Quando il timer parte, il server pianifica l'invio push crittografato tramite le chiavi VAPID. Quando il timer scade, i server Apple (APNs) inviano la notifica direttamente al dispositivo, svegliando il telefono anche con schermo bloccato o se si sta usando un'altra app (es. Spotify).
- **Test rapido**: Dalla pagina **Profilo**, è presente la sezione *"Notifiche Push Timer"* con pulsante di autorizzazione e tasto *"Invia Notifica di Test"* (5s) per verificare la ricezione con schermo bloccato.
