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
