# 39 Café & Bistrot — Menù Digitale Dinamico in Tempo Reale

Applicazione web moderna, minimalista ed elegante per il menù digitale di **39 Café & Bistrot**.
Progettata per essere **veloce, 100% dinamica, responsive su tutti i dispositivi (smartphone, tablet, desktop)** e con **sincronizzazione Cloud in tempo reale** senza necessità di server dedicati o configurazioni complesse.

---

## 🚀 Caratteristiche Principali

### 1. Esperienza Cliente (Mobile-First & Minimal)
- **Design Raffinato**: Tipografia editoriale con *Playfair Display* e *Plus Jakarta Sans*, palette colori calda e lussuosa (toni bistro crema, oro satinato, antracite profondo).
- **Hero Banner con Foto Copertina**: Mostra l'atmosfera del bistrot, le info Wi-Fi per i clienti, l'indirizzo e l'orario di cucina.
- **Indicatore Live Real-Time**: Pallino pulsante che conferma ai clienti che i prezzi e la disponibilità sono aggiornati in diretta.
- **Barra Sticky Orizzontale**:
  - **Ricerca Istantanea**: Cerca per nome piatto, bevanda, ingrediente o allergene con filtro in tempo reale.
  - **Pillole Categorie**: Scorrimento orizzontale fluido con conteggio delle voci disponibili.
  - **Filtri Dietetici Veloci**: Filtra con un tocco tra *Tutti*, *🍃 Vegetariano*, *🌱 Vegano*, *🌾 Senza Glutine*.
- **Schede Piatti con Foto Ben Visibili**:
  - Immagini in alta risoluzione in formato 16:9 con zoom al passaggio del mouse.
  - Badge in evidenza (*Consigliato*, *Specialità dello Chef*, *Artigianale*, ecc.).
  - Overlay "Esaurito" immediato per piatti non disponibili.
  - Prezzi chiari formattati in Euro (€).
  - Modale dettagliata al tocco per ingredienti completi e allergeni.

### 2. Nuova Sezione "Bibite & Beverage"
- **Caffetteria**: Espresso Monorigine 100% Arabica Specialty Coffee.
- **Acqua & Bibite**: Acqua minerale in vetro, linea vintage Lurisia (Chinotto, Cedrata Tassoni, Aranciata) e bibite classiche.
- **Birre Artigianali**: Bionda alla spina non filtrata, IPA e birre speciali.
- **Vini & Bollicine**: Prosecco Superiore di Valdobbiadene DOCG al calice e in bottiglia, bianchi e rossi selezionati.
- **Distillati & Amari**: Amari d'autore (Amaro del Capo, Jefferson, Montenegro, Braulio Riserva) e Grappe barrique.

### 3. Pannello Admin & Gestione Dinamica al 100%
- **Accesso Protetto da PIN**: Accessibile dal footer tramite il pulsante *"Area Riservata / Gestione Menù"* con protezione PIN (PIN predefinito: `3939`, modificabile nelle impostazioni).
- **Toggle Disponibilità a 1 Tocco**: Spunta o tocca *"Disp. / Esaurito"* per aggiornare istantaneamente tutti i telefoni dei clienti in sala in <100ms.
- **Modifica Rapida Prezzi**: Modifica il prezzo direttamente dal campo numerico senza aprire modali.
- **CRUD Completo Piatti & Bibite**: Crea, modifica o elimina qualsiasi portata con foto, descrizione, categoria, prezzo, allergeni e tag dietetici.
- **Gestione Categorie Libera**: Aggiungi nuove categorie personalizzate (es. *Cocktail*, *Pizze*, *Tapas*), riordinali con i pulsanti *Sposta Su/Giù* o eliminali.
- **Profilo Locale**: Modifica titolo, sottotitolo, immagine di copertina, iniziale logo, info Wi-Fi e PIN.
- **Generatore QR Code Tavoli**: Genera dinamicamente il QR Code puntato all'URL del sito con pulsante di stampa segnatavolo da posizionare sui tavoli.
- **Backup & Ripristino JSON**: Scarica con un click l'intero menù in formato JSON per sicurezza, ricaricalo su qualsiasi altro dispositivo o ripristina i valori iniziali di fabbrica.

### 4. Sincronizzazione Cloud Multi-Device (<100ms)
- **Livello 1 (0ms Locale)**: `localStorage` per rendering immediato all'apertura anche senza connessione internet.
- **Livello 2 (0ms Multi-Tab)**: `BroadcastChannel` per sincronizzare schede aperte sullo stesso computer/dispositivo.
- **Livello 3 (<100ms Cross-Device)**: Canale **Server-Sent Events (SSE)** su `ntfy.sh` (integrato, gratuito, zero configurazione). Quando il ristoratore modifica un piatto dal suo smartphone (4G/5G/Wi-Fi), il cambiamento arriva al computer della cassa e ai clienti in sala senza dover ricaricare la pagina.
- **Livello 4 (Opzionale)**: Supporto per endpoint Firebase Realtime Database se si desidera collegare un proprio database personalizzato.

---

## 📁 Struttura Modulare dei File

```
39cafe/
│
├── index.html              # Pagina principale menù e pannello admin integrato
├── menu-ristorante.html    # Reindirizzamento automatico a index.html per retrocompatibilità
├── style.css               # Design system completo, responsive e ottimizzato per stampa
├── cover.jpg               # Fotografia copertina del bistrot
│
├── js/
│   ├── data.js             # Dati seed iniziali (Piatti, Bibite, Categorie, Locale, Allergeni)
│   ├── sync.js             # Motore di sincronizzazione Real-Time Cloud (SSE, LocalStorage, Broadcast)
│   ├── admin.js            # Controller pannello admin (PIN, CRUD piatti/categorie, QR code, backup)
│   └── app.js              # Controller pubblico (ricerca, filtri dietetici, card piatti, modali)
│
└── README.md               # Documentazione e guida d'uso
```

---

## 🌐 Come Pubblicare su GitHub Pages

1. Crea un repository su GitHub (es. `39cafe`).
2. Carica tutti i file di questa cartella nel repository.
3. Vai nelle impostazioni del repository: **Settings** > **Pages**.
4. Sotto **Build and deployment** seleziona:
   - **Source**: `Deploy from a branch`
   - **Branch**: `main` (o `master`) / root (`/`)
5. Clicca **Save**. Entro 1-2 minuti il menù sarà online all'indirizzo:
   `https://<tuo-username>.github.io/39cafe/`
6. Il QR Code nella sezione Admin si aggiornerà automaticamente con il nuovo indirizzo online!

---

## 🔑 Credenziali Predefinite

- **PIN Admin**: `3939` (modificabile dalla scheda *"Info Locale"* del pannello admin)
- **Canale Cloud SSE**: `cafe39_menu_realtime_stream` (personalizzabile nella scheda *"Cloud & Backup"*)
