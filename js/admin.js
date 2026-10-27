/**
 * 39 CAFÉ & BISTROT - ADMIN DASHBOARD CONTROLLER (PAGINA DEDICATA ADMIN.HTML)
 * Gestione completa: Piatti, Bibite, Categorie Dinamiche, Locale, QR Code Tavoli, Firebase & Cloud Sync.
 * Accesso protetto da codice PIN (Default: 3939).
 */

(function () {
  let adminActiveTab = "dishes";
  let adminCategoryFilter = "all";

  // Helper toast notification (funziona anche standalone in admin.html)
  function showToast(text, duration = 3000) {
    let container = document.querySelector(".toast-container");
    if (!container) {
      container = document.createElement("div");
      container.className = "toast-container";
      document.body.appendChild(container);
    }
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.innerHTML = `<span>${text}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(10px)";
      setTimeout(() => toast.remove(), 250);
    }, duration);
  }
  window.showToast = showToast;

  // Inizializzazione della pagina admin standalone
  function initAdmin() {
    // Inizializza SyncEngine
    window.SyncEngine.init({
      onUpdate: (updatedData) => {
        renderAdminPanel();
      },
      onStatus: (status, message) => {
        const dot = document.getElementById("live-dot");
        const text = document.getElementById("live-status-text");
        if (dot && text) {
          dot.className = "live-dot " + (status === "online" ? "online" : (status === "syncing" ? "syncing" : "offline"));
          text.textContent = status === "online" ? "Online Live" : (status === "syncing" ? "Sincronizzazione…" : "Offline");
        }
      }
    });

    const authScreen = document.getElementById("admin-auth-screen");
    const dashScreen = document.getElementById("admin-dashboard-screen");

    // Se siamo su admin.html
    if (authScreen && dashScreen) {
      const isAuth = sessionStorage.getItem("cafe39_admin_auth") === "true";
      if (isAuth) {
        authScreen.style.display = "none";
        dashScreen.style.display = "block";
        renderAdminPanel();
      } else {
        authScreen.style.display = "block";
        dashScreen.style.display = "none";

        const form = document.getElementById("admin-pin-login-form");
        const pinInput = document.getElementById("admin-standalone-pin-input");
        if (form && pinInput) {
          form.onsubmit = (e) => {
            e.preventDefault();
            const data = window.SyncEngine.getData();
            const correctPin = (data.restaurant && data.restaurant.pin) || "3939";
            if (pinInput.value.trim() === correctPin) {
              sessionStorage.setItem("cafe39_admin_auth", "true");
              authScreen.style.display = "none";
              dashScreen.style.display = "block";
              renderAdminPanel();
              showToast("✓ Accesso effettuato con successo!");
            } else {
              showToast("❌ PIN errato. Riprova.");
              pinInput.value = "";
              pinInput.focus();
            }
          };
        }
      }
    } else {
      // Compatibilità modale legacy
      renderAdminPanel();
    }
  }

  // Renderizza il pannello di controllo
  function renderAdminPanel() {
    const container = document.getElementById("admin-dashboard-screen") || document.getElementById("admin-view-container");
    if (!container) return;

    const data = window.SyncEngine.getData();
    const { restaurant, categories, dishes } = data;

    container.innerHTML = `
      <section class="admin-view" style="margin-top: 0;">
        <header class="admin-header">
          <div>
            <small style="text-transform: uppercase; letter-spacing: 1px; color: #d4d4d8; font-size: 11px;">Area Riservata Ristoratore</small>
            <h1 style="color: #fff; margin-top: 4px;">${escapeHtml(restaurant.name)} — Gestione</h1>
            <p>Le modifiche effettuate qui vengono sincronizzate all'istante sui telefoni di tutti i clienti in sala.</p>
          </div>
          <div class="admin-header-actions">
            <a href="index.html" class="btn primary">
              👁️ Visualizza Menù Clienti
            </a>
          </div>
        </header>

        <nav class="admin-nav-tabs">
          <button class="admin-tab ${adminActiveTab === 'dishes' ? 'active' : ''}" onclick="window.AdminApp.switchTab('dishes')">
            🍽️ Piatti & Bibite (${dishes.length})
          </button>
          <button class="admin-tab ${adminActiveTab === 'categories' ? 'active' : ''}" onclick="window.AdminApp.switchTab('categories')">
            📂 Categorie (${categories.length})
          </button>
          <button class="admin-tab ${adminActiveTab === 'restaurant' ? 'active' : ''}" onclick="window.AdminApp.switchTab('restaurant')">
            ⚙️ Info Locale
          </button>
          <button class="admin-tab ${adminActiveTab === 'qrcode' ? 'active' : ''}" onclick="window.AdminApp.switchTab('qrcode')">
            📱 QR Code Tavoli
          </button>
          <button class="admin-tab ${adminActiveTab === 'sync' ? 'active' : ''}" onclick="window.AdminApp.switchTab('sync')">
            🔥 Firebase & Cloud Sync
          </button>
        </nav>

        <div class="admin-content-body">
          ${renderTabContent(adminActiveTab, data)}
        </div>
      </section>
    `;

    attachTabEventListeners(adminActiveTab, data);
  }

  // Selettore del contenuto per Tab
  function renderTabContent(tab, data) {
    switch (tab) {
      case "dishes":
        return renderDishesTab(data);
      case "categories":
        return renderCategoriesTab(data);
      case "restaurant":
        return renderRestaurantTab(data);
      case "qrcode":
        return renderQrCodeTab(data);
      case "sync":
        return renderSyncTab(data);
      default:
        return "<p>Caricamento…</p>";
    }
  }

  // ================= TAB 1: PIATTI & BIBITE =================
  function renderDishesTab(data) {
    const { categories, dishes } = data;
    const sortedCats = [...categories].sort((a, b) => a.order - b.order);

    let filteredDishes = dishes;
    if (adminCategoryFilter !== "all") {
      filteredDishes = dishes.filter(d => d.categoryId === adminCategoryFilter);
    }

    return `
      <div class="admin-toolbar">
        <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
          <select id="admin-category-filter" class="form-control" style="width: auto; min-width: 190px;">
            <option value="all" ${adminCategoryFilter === 'all' ? 'selected' : ''}>Tutte le Categorie (${dishes.length})</option>
            ${sortedCats.map(c => `
              <option value="${c.id}" ${adminCategoryFilter === c.id ? 'selected' : ''}>
                ${escapeHtml(c.name)} (${dishes.filter(d => d.categoryId === c.id).length})
              </option>
            `).join("")}
          </select>
          <span style="font-size: 12px; color: var(--ink-muted);">Modifica prezzi e disponibilità con 1 tocco</span>
        </div>

        <div class="admin-action-btn-group">
          <button class="btn primary" onclick="window.AdminApp.openDishModal()">
            ＋ Aggiungi Piatto o Bibita
          </button>
        </div>
      </div>

      <div class="admin-dishes-list">
        ${sortedCats.map(cat => {
          const catDishes = (adminCategoryFilter === "all" || adminCategoryFilter === cat.id)
            ? dishes.filter(d => d.categoryId === cat.id)
            : [];

          if (catDishes.length === 0 && adminCategoryFilter !== "all") return "";

          return `
            <div class="admin-category-card">
              <div class="admin-category-head">
                <div class="admin-category-title-wrap">
                  <h3>${escapeHtml(cat.name)}</h3>
                  <span class="admin-category-desc">(${catDishes.length} voci)</span>
                </div>
                <button class="btn sm" onclick="window.AdminApp.openDishModal(null, '${cat.id}')">
                  ＋ Aggiungi qui
                </button>
              </div>

              <div class="admin-dishes-body">
                ${catDishes.length > 0 ? catDishes.map(dish => `
                  <div class="admin-dish-row" id="admin-row-${dish.id}">
                    <img 
                      class="admin-dish-thumb" 
                      src="${escapeHtml(dish.image || '')}" 
                      alt="" 
                      onerror="this.src='https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=200&q=80'"
                    />

                    <div class="admin-dish-info">
                      <h4>${escapeHtml(dish.name)} ${dish.badge ? `<span class="dish-badge gold" style="position:static; margin-left:6px; font-size:9.5px; padding:2px 6px;">${escapeHtml(dish.badge)}</span>` : ''}</h4>
                      <p>${escapeHtml(dish.description || 'Nessuna descrizione')}</p>
                    </div>

                    <div style="display:flex; align-items:center; gap:4px;">
                      <span style="font-size:12px; color:var(--ink-muted);">€</span>
                      <input 
                        type="number" 
                        step="0.5" 
                        min="0"
                        class="admin-dish-price-input" 
                        value="${dish.price}" 
                        title="Modifica prezzo istantaneo (salva all'uscita o invio)"
                        onchange="window.SyncEngine.updateDishPrice('${dish.id}', this.value); window.showToast('✓ Prezzo aggiornato online!');"
                      />
                    </div>

                    <div 
                      class="avail-toggle ${dish.available ? 'in-stock' : 'out-of-stock'}" 
                      onclick="window.SyncEngine.toggleAvailability('${dish.id}'); window.showToast('Stato disponibilità aggiornato!');"
                      title="Tocca per cambiare istantaneamente tra Disponibile ed Esaurito"
                    >
                      ${dish.available ? '✓ Disp.' : '✕ Esaurito'}
                    </div>

                    <div style="display: flex; gap: 5px;">
                      <button class="btn sm" onclick="window.AdminApp.openDishModal('${dish.id}')" title="Modifica dettagli completi">
                        ✎
                      </button>
                      <button class="btn sm danger" onclick="window.AdminApp.deleteDishConfirm('${dish.id}', '${escapeHtml(dish.name)}')" title="Elimina piatto">
                        🗑
                      </button>
                    </div>
                  </div>
                `).join("") : `
                  <div style="padding: 18px; text-align: center; color: var(--ink-muted); font-size: 12px;">
                    Nessun piatto presente in questa categoria. Tocca "Aggiungi qui" per inserirlo.
                  </div>
                `}
              </div>
            </div>
          `;
        }).join("")}
      </div>
    `;
  }

  // ================= TAB 2: CATEGORIE DINAMICHE =================
  function renderCategoriesTab(data) {
    const { categories, dishes } = data;
    const sortedCats = [...categories].sort((a, b) => a.order - b.order);

    return `
      <div class="admin-toolbar">
        <div>
          <h3 style="font-family: var(--font-serif); font-size: 18px;">Gestione Categorie & Sezioni</h3>
          <p style="font-size: 12px; color: var(--ink-muted);">Crea liberamente sezioni (es. Bibite, Pizze, Cocktail, Dolci) e riordinali.</p>
        </div>
        <button class="btn primary" onclick="window.AdminApp.openCategoryModal()">
          ＋ Nuova Categoria
        </button>
      </div>

      <div style="display: flex; flex-direction: column; gap: 10px;">
        ${sortedCats.map((cat, index) => {
          const count = dishes.filter(d => d.categoryId === cat.id).length;
          return `
            <div style="background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 14px 18px; display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap;">
              <div>
                <div style="display: flex; align-items: baseline; gap: 8px;">
                  <span style="font-weight: 700; font-size: 13px; color: var(--accent);">#${index + 1}</span>
                  <strong style="font-size: 15px;">${escapeHtml(cat.name)}</strong>
                  <span style="font-size: 12px; color: var(--ink-muted);">(${count} piatti)</span>
                </div>
                <p style="font-size: 12px; color: var(--ink-secondary); margin-top: 3px;">${escapeHtml(cat.description || "Nessuna descrizione")}</p>
              </div>

              <div style="display: flex; gap: 6px; align-items: center;">
                <button class="btn sm" onclick="window.AdminApp.moveCategory('${cat.id}', -1)" ${index === 0 ? 'disabled style="opacity:0.4"' : ''} title="Sposta su">
                  ▲
                </button>
                <button class="btn sm" onclick="window.AdminApp.moveCategory('${cat.id}', 1)" ${index === sortedCats.length - 1 ? 'disabled style="opacity:0.4"' : ''} title="Sposta giù">
                  ▼
                </button>
                <button class="btn sm" onclick="window.AdminApp.openCategoryModal('${cat.id}')">
                  ✎ Modifica
                </button>
                <button class="btn sm danger" onclick="window.AdminApp.deleteCategoryConfirm('${cat.id}', '${escapeHtml(cat.name)}', ${count})">
                  🗑
                </button>
              </div>
            </div>
          `;
        }).join("")}
      </div>
    `;
  }

  // ================= TAB 3: INFORMAZIONI LOCALE =================
  function renderRestaurantTab(data) {
    const { restaurant } = data;

    return `
      <div style="max-width: 600px;">
        <h3 style="font-family: var(--font-serif); font-size: 18px; margin-bottom: 16px;">Profilo e Identità del Locale</h3>
        
        <form id="restaurant-info-form">
          <div class="form-group">
            <label>Nome del Locale</label>
            <input type="text" name="name" class="form-control" value="${escapeHtml(restaurant.name)}" required />
          </div>

          <div class="form-group">
            <label>Sottotitolo / Filosofia</label>
            <input type="text" name="subtitle" class="form-control" value="${escapeHtml(restaurant.subtitle)}" />
          </div>

          <div class="form-group">
            <label>URL Immagine di Copertina (Hero Banner)</label>
            <input type="text" name="photo" class="form-control" value="${escapeHtml(restaurant.photo)}" />
            <small style="color:var(--ink-muted); font-size:11px;">Puoi usare <code>cover.jpg</code> oppure un link HTTPS a qualsiasi immagine online.</small>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Logo / Lettere Sigla</label>
              <input type="text" name="logo" class="form-control" maxlength="4" value="${escapeHtml(restaurant.logo || '39')}" />
            </div>
            <div class="form-group">
              <label>Codice PIN Admin (per accedere alla gestione)</label>
              <input type="text" name="pin" class="form-control" maxlength="8" value="${escapeHtml(restaurant.pin || '3939')}" required />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Indirizzo e Città</label>
              <input type="text" name="address" class="form-control" value="${escapeHtml(restaurant.address || '')}" />
            </div>
            <div class="form-group">
              <label>Rete WiFi & Password per Clienti</label>
              <input type="text" name="wifi" class="form-control" value="${escapeHtml(restaurant.wifi || '')}" />
            </div>
          </div>

          <div style="margin-top: 24px;">
            <button type="submit" class="btn primary">
              Salva e Applica Online
            </button>
          </div>
        </form>
      </div>
    `;
  }

  // ================= TAB 4: QR CODE TAVOLI =================
  function renderQrCodeTab(data) {
    const currentUrl = window.location.href.replace(/admin\.html.*$/, "index.html");
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(currentUrl)}`;

    return `
      <div class="qr-box">
        <h3 style="font-family: var(--font-serif); font-size: 20px;">QR Code Menù Digitale</h3>
        <p style="font-size: 12.5px; color: var(--ink-secondary); margin-top: 6px;">
          I clienti inquadrano questo codice per aprire istantaneamente il menù sul loro smartphone.
        </p>

        <div style="margin: 18px 0;">
          <img src="${qrApiUrl}" alt="QR Code Tavolo" class="qr-img" />
        </div>

        <p style="font-size: 11.5px; color: var(--ink-muted); margin-bottom: 20px; word-break: break-all;">
          Indirizzo URL del Menù: <code>${escapeHtml(currentUrl)}</code>
        </p>

        <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
          <button class="btn primary" onclick="window.print()">
            🖨️ Stampa Segnatavolo
          </button>
          <a class="btn" href="${qrApiUrl}" download="QRCode_39Cafe.png" target="_blank">
            ⬇️ Scarica Immagine QR
          </a>
        </div>
      </div>
    `;
  }

  // ================= TAB 5: FIREBASE & CLOUD SYNC =================
  function renderSyncTab(data) {
    const { restaurant } = data;
    const syncStatus = window.SyncEngine.getStatus();

    return `
      <div style="max-width: 680px;">
        <h3 style="font-family: var(--font-serif); font-size: 18px; margin-bottom: 8px;">Sincronizzazione in Tempo Reale (PC ↔ Smartphone)</h3>
        <p style="font-size: 12.5px; color: var(--ink-secondary); margin-bottom: 20px;">
          Tutto ciò che modifichi da computer si propaga online e viene visto istantaneamente sul telefono.
        </p>

        <!-- Box 1: Sincronizzazione Live Gratuita Già Attiva -->
        <div style="background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 18px; margin-bottom: 20px; box-shadow: var(--shadow-sm);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <strong style="font-size: 13.5px;">Canale Cloud SSE (Attivo Subito):</strong>
            <span class="live-indicator" style="background: var(--bg-subtle);">
              <span class="live-dot ${syncStatus.status === 'online' ? 'online' : 'syncing'}"></span>
              ${syncStatus.status === 'online' ? 'Connesso e Funzionante' : 'In Connessione…'}
            </span>
          </div>

          <div class="form-group" style="margin-bottom: 8px;">
            <label>Identificativo Canale Cloud</label>
            <input type="text" id="sync-channel-input" class="form-control" value="${escapeHtml(restaurant.syncChannel || 'cafe39_menu_realtime_stream')}" />
            <small style="color:var(--ink-muted); font-size:11px;">Qualsiasi smartphone o computer che usa questo ID si aggiorna in meno di 100ms.</small>
          </div>

          <div style="display:flex; gap:8px; margin-top:12px;">
            <button class="btn sm primary" onclick="window.AdminApp.saveSyncConfig()">Salva Canale</button>
            <button class="btn sm" onclick="window.SyncEngine.forceCloudSync(); window.showToast('Sincronizzazione forzata inviata al cloud!');">Forza Sincronizzazione</button>
          </div>
        </div>

        <!-- Box 2: Collegamento Firebase Realtime Database -->
        <div style="background: var(--surface); border: 1.5px solid #d97706; border-radius: var(--radius-md); padding: 18px; margin-bottom: 20px; box-shadow: var(--shadow-sm);">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <span style="font-size: 20px;">🔥</span>
            <strong style="font-size: 15px; color: #b45309;">Integrazione Google Firebase Realtime Database</strong>
          </div>
          
          <p style="font-size: 12px; color: var(--ink-secondary); line-height: 1.5; margin-bottom: 14px;">
            Quando vorrai collegare il tuo database Firebase permanente, basterà incollare l'URL qui sotto.
            <br><strong>Come fare (Gratuito in 2 minuti):</strong>
            <br>1. Vai su <a href="https://console.firebase.google.com" target="_blank" style="text-decoration: underline; color: #b45309;">console.firebase.google.com</a> e crea un progetto gratuito.
            <br>2. Crea un <strong>Realtime Database</strong> e imposta nelle Regole: <code>{ ".read": true, ".write": true }</code>.
            <br>3. Copia l'URL del database (es. <code>https://tuo-progetto-default-rtdb.firebaseio.com</code>) e incollalo qui:
          </p>

          <div class="form-group">
            <label>URL Firebase Realtime Database</label>
            <input 
              type="url" 
              id="sync-firebase-input" 
              class="form-control" 
              placeholder="https://tuo-progetto-default-rtdb.firebaseio.com" 
              value="${escapeHtml(restaurant.firebaseUrl || '')}" 
            />
          </div>

          <div style="display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap;">
            <button class="btn sm primary" onclick="window.AdminApp.saveSyncConfig()">
              💾 Salva URL Firebase
            </button>
            <button class="btn sm" onclick="window.AdminApp.testFirebase()">
              🧪 Testa Connessione Firebase
            </button>
          </div>
        </div>

        <!-- Box 3: Backup & Ripristino -->
        <h3 style="font-family: var(--font-serif); font-size: 18px; margin-bottom: 8px;">Salvataggio & Backup Offline</h3>
        <div style="display: flex; flex-direction: column; gap: 12px;">
          <div style="display: flex; gap: 10px; flex-wrap: wrap;">
            <button class="btn" onclick="window.AdminApp.downloadBackup()">
              📥 Scarica Backup Menù (JSON)
            </button>
            <button class="btn" onclick="document.getElementById('import-file-input').click()">
              📤 Ripristina da File JSON
            </button>
            <input type="file" id="import-file-input" accept=".json" style="display: none;" onchange="window.AdminApp.uploadBackup(event)" />
          </div>

          <div style="margin-top: 18px; padding-top: 18px; border-top: 1px dashed var(--border);">
            <button class="btn danger sm" onclick="window.AdminApp.resetSeedConfirm()">
              ⚠️ Ripristina Menù Iniziale di Fabbrica
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // ================= MODALI PIATTO & CATEGORIA =================
  function openDishModal(dishId = null, defaultCatId = null) {
    const data = window.SyncEngine.getData();
    const isEdit = Boolean(dishId);
    const dish = isEdit ? data.dishes.find(d => d.id === dishId) : null;

    const initialCat = dish ? dish.categoryId : (defaultCatId || (data.categories[0] && data.categories[0].id) || "");
    const dietary = (dish && dish.dietary) || [];

    const modalHtml = `
      <div class="modal-backdrop" id="dish-form-modal" onclick="if(event.target===this)this.remove()">
        <div class="modal-box" style="max-width: 540px;">
          <div class="modal-header">
            <h2>${isEdit ? 'Modifica Piatto o Bibita' : 'Nuovo Piatto o Bibita'}</h2>
            <button class="modal-close-btn" onclick="document.getElementById('dish-form-modal').remove()">×</button>
          </div>

          <form id="dish-form">
            <div class="modal-body">
              <div class="form-row">
                <div class="form-group" style="grid-column: span 2;">
                  <label>Nome Piatto o Bibita *</label>
                  <input type="text" name="name" class="form-control" value="${escapeHtml(dish ? dish.name : '')}" required placeholder="es. Tiramisù all'Espresso o Birra IPA" />
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Categoria *</label>
                  <select name="categoryId" class="form-control" required>
                    ${data.categories.map(c => `
                      <option value="${c.id}" ${c.id === initialCat ? 'selected' : ''}>${escapeHtml(c.name)}</option>
                    `).join("")}
                  </select>
                </div>

                <div class="form-group">
                  <label>Prezzo (€) *</label>
                  <input type="number" step="0.5" min="0" name="price" class="form-control" value="${dish ? dish.price : '10.00'}" required />
                </div>
              </div>

              <div class="form-group">
                <label>Descrizione / Ingredienti</label>
                <textarea name="description" class="form-control" placeholder="Descrivi il piatto, la cottura, le materie prime…">${escapeHtml(dish ? dish.description : '')}</textarea>
              </div>

              <div class="form-group">
                <label>URL Immagine (Link foto HD)</label>
                <input type="url" name="image" id="dish-image-input" class="form-control" value="${escapeHtml(dish ? dish.image : '')}" placeholder="https://images.unsplash.com/…" />
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Badge in evidenza (opzionale)</label>
                  <input type="text" name="badge" class="form-control" value="${escapeHtml(dish ? (dish.badge || '') : '')}" placeholder="es. Consigliato, Novità, Specialità" />
                </div>

                <div class="form-group">
                  <label>Allergeni dichiarati</label>
                  <input type="text" name="allergens" class="form-control" value="${escapeHtml(dish ? (dish.allergens || '') : '')}" placeholder="es. Glutine, Latte, Uova" />
                </div>
              </div>

              <div class="form-group">
                <label>Caratteristiche Dietetiche</label>
                <div class="checkbox-group">
                  <label class="checkbox-label">
                    <input type="checkbox" name="diet_veg" ${dietary.includes('veg') ? 'checked' : ''} />
                    🍃 Vegetariano
                  </label>
                  <label class="checkbox-label">
                    <input type="checkbox" name="diet_vegan" ${dietary.includes('vegan') ? 'checked' : ''} />
                    🌱 Vegano
                  </label>
                  <label class="checkbox-label">
                    <input type="checkbox" name="diet_glutenFree" ${dietary.includes('glutenFree') ? 'checked' : ''} />
                    🌾 Senza Glutine
                  </label>
                </div>
              </div>

              <div class="form-group" style="margin-top: 10px;">
                <label class="checkbox-label" style="background: transparent; border: none; padding: 0;">
                  <input type="checkbox" name="available" ${dish ? (dish.available ? 'checked' : '') : 'checked'} />
                  <strong>Attualmente disponibile per l'ordine</strong>
                </label>
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn" onclick="document.getElementById('dish-form-modal').remove()">Annulla</button>
              <button type="submit" class="btn primary">${isEdit ? 'Salva Modifiche' : 'Aggiungi al Menù'}</button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML("beforeend", modalHtml);

    document.getElementById("dish-form").onsubmit = (e) => {
      e.preventDefault();
      const form = e.target;
      const formData = new FormData(form);

      const dietaryArr = [];
      if (formData.has("diet_veg")) dietaryArr.push("veg");
      if (formData.has("diet_vegan")) dietaryArr.push("vegan");
      if (formData.has("diet_glutenFree")) dietaryArr.push("glutenFree");

      const savedDish = {
        id: dishId || ("dish_" + Math.random().toString(36).slice(2, 9)),
        categoryId: formData.get("categoryId"),
        name: formData.get("name").trim(),
        price: Number(formData.get("price")),
        description: formData.get("description").trim(),
        image: formData.get("image").trim(),
        badge: formData.get("badge").trim(),
        allergens: formData.get("allergens").trim(),
        dietary: dietaryArr,
        available: formData.has("available")
      };

      window.SyncEngine.saveDish(savedDish);
      document.getElementById("dish-form-modal").remove();
      renderAdminPanel();
      showToast("✓ Piatto salvato e sincronizzato online!");
    };
  }

  function openCategoryModal(catId = null) {
    const data = window.SyncEngine.getData();
    const isEdit = Boolean(catId);
    const cat = isEdit ? data.categories.find(c => c.id === catId) : null;

    const modalHtml = `
      <div class="modal-backdrop" id="cat-form-modal" onclick="if(event.target===this)this.remove()">
        <div class="modal-box" style="max-width: 440px;">
          <div class="modal-header">
            <h2>${isEdit ? 'Modifica Categoria' : 'Nuova Categoria'}</h2>
            <button class="modal-close-btn" onclick="document.getElementById('cat-form-modal').remove()">×</button>
          </div>

          <form id="category-form">
            <div class="modal-body">
              <div class="form-group">
                <label>Nome Categoria *</label>
                <input type="text" name="name" class="form-control" value="${escapeHtml(cat ? cat.name : '')}" required placeholder="es. Cocktail & Mixology, Pizze…" />
              </div>

              <div class="form-group">
                <label>Descrizione / Sottotitolo</label>
                <input type="text" name="description" class="form-control" value="${escapeHtml(cat ? cat.description : '')}" placeholder="es. Drink d'autore miscelati a regola d'arte" />
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn" onclick="document.getElementById('cat-form-modal').remove()">Annulla</button>
              <button type="submit" class="btn primary">${isEdit ? 'Salva Modifiche' : 'Crea Categoria'}</button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML("beforeend", modalHtml);

    document.getElementById("category-form").onsubmit = (e) => {
      e.preventDefault();
      const form = e.target;
      const formData = new FormData(form);

      const savedCat = {
        id: catId || ("cat_" + Math.random().toString(36).slice(2, 9)),
        name: formData.get("name").trim(),
        description: formData.get("description").trim(),
        order: isEdit ? cat.order : data.categories.length
      };

      window.SyncEngine.saveCategory(savedCat);
      document.getElementById("cat-form-modal").remove();
      renderAdminPanel();
      showToast("✓ Categoria salvata e sincronizzata online!");
    };
  }

  function moveCategory(catId, direction) {
    const data = window.SyncEngine.getData();
    const sorted = [...data.categories].sort((a, b) => a.order - b.order);
    const index = sorted.findIndex(c => c.id === catId);
    if (index < 0) return;

    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= sorted.length) return;

    const temp = sorted[index].order;
    sorted[index].order = sorted[targetIndex].order;
    sorted[targetIndex].order = temp;

    sorted.sort((a, b) => a.order - b.order);
    sorted.forEach((c, i) => c.order = i);

    window.SyncEngine.reorderCategories(sorted);
    renderAdminPanel();
  }

  function deleteDishConfirm(dishId, dishName) {
    if (confirm(`Eliminare il piatto "${dishName}"?`)) {
      window.SyncEngine.deleteDish(dishId);
      renderAdminPanel();
      showToast("Piatto eliminato");
    }
  }

  function deleteCategoryConfirm(catId, catName, dishCount) {
    const msg = dishCount > 0
      ? `Eliminando "${catName}" verranno rimossi anche i ${dishCount} piatti al suo interno. Procedere?`
      : `Eliminare la categoria "${catName}"?`;

    if (confirm(msg)) {
      window.SyncEngine.deleteCategory(catId);
      renderAdminPanel();
      showToast("Categoria eliminata");
    }
  }

  function downloadBackup() {
    const jsonStr = window.SyncEngine.exportJSON();
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `39Cafe_Menu_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Backup JSON scaricato!");
  }

  function uploadBackup(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const res = window.SyncEngine.importJSON(e.target.result);
      if (res.success) {
        renderAdminPanel();
        showToast("✓ Menù ripristinato con successo!");
      } else {
        alert("Errore nel file: " + res.error);
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  function resetSeedConfirm() {
    if (confirm("Vuoi davvero ripristinare il menù di default iniziale? Tutte le modifiche verranno azzerate.")) {
      window.SyncEngine.resetToSeed();
      renderAdminPanel();
      showToast("Menù ripristinato ai valori iniziali");
    }
  }

  function saveSyncConfig() {
    const channelInput = document.getElementById("sync-channel-input");
    const fbInput = document.getElementById("sync-firebase-input");

    const channelVal = channelInput ? channelInput.value.trim() : "";
    const fbVal = fbInput ? fbInput.value.trim() : "";

    window.SyncEngine.updateRestaurantInfo({
      syncChannel: channelVal || "cafe39_menu_realtime_stream",
      firebaseUrl: fbVal
    });

    showToast("✓ Configurazione salvata e connessa!");
    renderAdminPanel();
  }

  async function testFirebase() {
    const fbInput = document.getElementById("sync-firebase-input");
    const url = fbInput ? fbInput.value.trim() : "";
    showToast("Test connessione Firebase in corso…");
    const res = await window.SyncEngine.testFirebaseConnection(url);
    if (res.success) {
      alert("✅ Connessione Firebase riuscita al 100%! Il database risponde correttamente.");
    } else {
      alert("❌ Errore connessione Firebase:\n" + res.error);
    }
  }

  function attachTabEventListeners(tab, data) {
    if (tab === "dishes") {
      const filterSelect = document.getElementById("admin-category-filter");
      if (filterSelect) {
        filterSelect.onchange = (e) => {
          adminCategoryFilter = e.target.value;
          renderAdminPanel();
        };
      }
    } else if (tab === "restaurant") {
      const form = document.getElementById("restaurant-info-form");
      if (form) {
        form.onsubmit = (e) => {
          e.preventDefault();
          const fd = new FormData(form);
          window.SyncEngine.updateRestaurantInfo({
            name: fd.get("name").trim(),
            subtitle: fd.get("subtitle").trim(),
            photo: fd.get("photo").trim(),
            logo: fd.get("logo").trim(),
            pin: fd.get("pin").trim(),
            address: fd.get("address").trim(),
            wifi: fd.get("wifi").trim()
          });
          showToast("✓ Informazioni locale aggiornate online!");
        };
      }
    }
  }

  function escapeHtml(str) {
    return String(str ?? "").replace(/[&<>"']/g, c => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[c]));
  }

  // Esporta interfaccia Admin
  window.AdminApp = {
    init: initAdmin,
    logout: function () {
      sessionStorage.removeItem("cafe39_admin_auth");
      window.location.reload();
    },
    switchTab: function (tab) {
      adminActiveTab = tab;
      renderAdminPanel();
    },
    openDishModal: openDishModal,
    openCategoryModal: openCategoryModal,
    moveCategory: moveCategory,
    deleteDishConfirm: deleteDishConfirm,
    deleteCategoryConfirm: deleteCategoryConfirm,
    downloadBackup: downloadBackup,
    uploadBackup: uploadBackup,
    resetSeedConfirm: resetSeedConfirm,
    saveSyncConfig: saveSyncConfig,
    testFirebase: testFirebase
  };

  // Avvio al caricamento del DOM
  document.addEventListener("DOMContentLoaded", initAdmin);
})();
