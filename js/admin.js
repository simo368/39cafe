/**
 * 39 CAFÉ & BISTROT - ADMIN DASHBOARD CONTROLLER (ADMIN.HTML)
 * Gestione completa: Piatti, Bibite, Categorie, Locale, QR Code Tavoli, Firebase & Cloud Sync.
 * Interfaccia grafica minimalista su carta e inchiostro (Georgia & Green).
 */

(function () {
  let adminActiveTab = "dishes";
  let adminCategoryFilter = "all";

  // Helper toast notification
  function showToast(text, duration = 2800) {
    let e = document.querySelector(".toast");
    if (!e) {
      e = document.createElement("div");
      e.className = "toast";
      document.body.appendChild(e);
    }
    e.textContent = text;
    setTimeout(() => {
      if (e) e.remove();
    }, duration);
  }
  window.showToast = showToast;

  // Inizializzazione della pagina admin standalone
  function initAdmin() {
    window.SyncEngine.init({
      onUpdate: (updatedData) => {
        renderAdminPanel();
      },
      onStatus: (status, message) => {
        const dot = document.getElementById("live-dot");
        const text = document.getElementById("live-status-text");
        if (dot && text) {
          dot.className = "live-dot " + (status === "online" ? "online" : (status === "syncing" ? "syncing" : "offline"));
          text.textContent = status === "online" ? "Online" : (status === "syncing" ? "Sincronizzazione…" : "Offline");
        }
      }
    });

    const authScreen = document.getElementById("admin-auth-screen");
    const dashScreen = document.getElementById("admin-dashboard-screen");

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
      renderAdminPanel();
    }
  }

  // Renderizza il pannello di controllo
  function renderAdminPanel() {
    const container = document.getElementById("admin-dashboard-screen");
    if (!container) return;

    const data = window.SyncEngine.getData();
    const { restaurant, categories, dishes } = data;

    container.innerHTML = `
      <div class="admin-top">
        <div>
          <small>AREA RISTORANTE</small>
          <h1>Gestisci il menu</h1>
          <p>Le modifiche si vedono subito in anteprima e in tempo reale sui telefoni dei clienti.</p>
        </div>
        <div style="display:flex; gap:8px; align-items:center;">
          <span class="live-status-pill" style="font-size:11px; color:var(--muted); display:inline-flex; align-items:center; gap:6px;">
            <span class="live-dot online" id="live-dot"></span>
            <span id="live-status-text">Online</span>
          </span>
          <a href="index.html" class="btn">← Menu</a>
          <button class="btn" onclick="window.AdminApp.logout()" style="color:var(--muted);">Esci</button>
        </div>
      </div>

      <div class="admin-actions">
        <button class="btn primary" onclick="window.AdminApp.openDishModal()">＋ Aggiungi piatto</button>
        <button class="btn" onclick="window.AdminApp.openCategoryModal()">＋ Categoria</button>
        <button class="btn" onclick="window.AdminApp.switchTab('restaurant')">Titolo e foto</button>
        <button class="btn" onclick="window.AdminApp.switchTab('qrcode')">📱 QR Code</button>
        <button class="btn" onclick="window.AdminApp.switchTab('sync')">☁️ Cloud & Backup</button>
      </div>

      <nav class="admin-tabs">
        <button class="admin-tab ${adminActiveTab === 'dishes' ? 'active' : ''}" onclick="window.AdminApp.switchTab('dishes')">
          🍽️ Piatti & Prezzi (${dishes.length})
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
          ☁️ Cloud & Backup
        </button>
      </nav>

      <div class="admin-content-body">
        ${renderTabContent(adminActiveTab, data)}
      </div>
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
        return "<p class='loading'>Caricamento…</p>";
    }
  }

  // ================= TAB 1: PIATTI & BIBITE =================
  function renderDishesTab(data) {
    const { categories, dishes } = data;
    const sortedCats = [...categories].sort((a, b) => a.order - b.order);

    return `
      ${sortedCats.map(cat => {
        const catDishes = dishes.filter(d => d.categoryId === cat.id);

        return `
          <section class="admin-cat">
            <h2>
              <span>${escapeHtml(cat.name)} <small style="font-size:11px; color:var(--muted); font-family:var(--font-sans);">(${catDishes.length})</small></span>
              <div style="display:flex; gap:6px;">
                <button class="btn sm" onclick="window.AdminApp.openCategoryModal('${cat.id}')">Modifica</button>
                <button class="btn sm primary" onclick="window.AdminApp.openDishModal(null, '${cat.id}')">＋ Aggiungi</button>
              </div>
            </h2>

            ${catDishes.length > 0 ? catDishes.map(d => `
              <div class="admin-row" id="admin-row-${d.id}">
                <div>
                  ${d.image ? `<img src="${escapeHtml(d.image)}" alt="" class="admin-row-thumb" onerror="this.style.display='none'">` : ''}
                  <b>${escapeHtml(d.name)}</b>${d.badge ? ` <span class="dish-badge">${escapeHtml(d.badge)}</span>` : ''}
                  <small>${escapeHtml(d.description || 'Nessuna descrizione')}</small>
                  ${d.allergens ? `<small class="allergens">ALLERGENI · ${escapeHtml(d.allergens)}</small>` : ''}
                </div>

                <div class="admin-price-box">
                  <input 
                    type="number" 
                    step="0.5" 
                    min="0" 
                    class="admin-price-input" 
                    value="${d.price}" 
                    title="Modifica prezzo istantaneo (salva all'uscita o invio)"
                    onchange="window.SyncEngine.updateDishPrice('${d.id}', this.value); window.showToast('✓ Prezzo aggiornato!');"
                  />
                  <span class="price">€</span>
                </div>

                <label class="admin-avail-label" title="Disponibilità istantanea">
                  <input 
                    type="checkbox" 
                    ${d.available ? 'checked' : ''} 
                    onchange="window.SyncEngine.toggleAvailability('${d.id}'); window.showToast('Disponibilità aggiornata!');"
                  /> Disp.
                </label>

                <div class="admin-row-actions">
                  <button class="btn sm" onclick="window.AdminApp.openDishModal('${d.id}')" title="Modifica piatto">✎</button>
                  <button class="btn sm danger" onclick="window.AdminApp.deleteDishConfirm('${d.id}', '${escapeHtml(d.name)}')" title="Elimina piatto">×</button>
                </div>
              </div>
            `).join("") : `
              <div style="padding: 16px; text-align: center; color: var(--muted); font-size: 12px;">
                Nessun piatto presente in questa categoria. Tocca "＋ Aggiungi" per inserirne uno.
              </div>
            `}
          </section>
        `;
      }).join("")}
    `;
  }

  // ================= TAB 2: CATEGORIE DINAMICHE =================
  function renderCategoriesTab(data) {
    const { categories, dishes } = data;
    const sortedCats = [...categories].sort((a, b) => a.order - b.order);

    return `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
        <h2 style="font: 20px var(--font-serif); margin: 0; font-weight: 400;">Organizzazione Categorie</h2>
        <button class="btn primary" onclick="window.AdminApp.openCategoryModal()">＋ Nuova Categoria</button>
      </div>

      <div style="display: flex; flex-direction: column; gap: 8px;">
        ${sortedCats.map((cat, index) => {
          const count = dishes.filter(d => d.categoryId === cat.id).length;
          return `
            <div style="background: white; border: 1px solid var(--line); border-radius: var(--radius-sm); padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap;">
              <div>
                <div style="display: flex; align-items: baseline; gap: 8px;">
                  <span style="font-weight: 600; font-size: 12px; color: var(--green);">#${index + 1}</span>
                  <strong style="font-size: 14px; font-family: var(--font-serif);">${escapeHtml(cat.name)}</strong>
                  <span style="font-size: 11px; color: var(--muted);">(${count} voci)</span>
                </div>
                <p style="font-size: 11.5px; color: #77766f; margin: 3px 0 0;">${escapeHtml(cat.description || "Nessuna descrizione")}</p>
              </div>

              <div style="display: flex; gap: 5px; align-items: center;">
                <button class="btn sm" onclick="window.AdminApp.moveCategory('${cat.id}', -1)" ${index === 0 ? 'disabled style="opacity:0.35"' : ''} title="Sposta su">▲</button>
                <button class="btn sm" onclick="window.AdminApp.moveCategory('${cat.id}', 1)" ${index === sortedCats.length - 1 ? 'disabled style="opacity:0.35"' : ''} title="Sposta giù">▼</button>
                <button class="btn sm" onclick="window.AdminApp.openCategoryModal('${cat.id}')">✎ Modifica</button>
                <button class="btn sm danger" onclick="window.AdminApp.deleteCategoryConfirm('${cat.id}', '${escapeHtml(cat.name)}', ${count})">×</button>
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
      <div style="max-width: 580px; background: white; border: 1px solid var(--line); border-radius: 10px; padding: 22px;">
        <h2 style="font: 21px var(--font-serif); margin: 0 0 16px; font-weight: 400;">Profilo & Identità del Bistrot</h2>
        
        <form id="restaurant-info-form">
          <label>Nome del Locale *
            <input type="text" name="name" value="${escapeHtml(restaurant.name)}" required />
          </label>

          <label>Sottotitolo / Filosofia
            <input type="text" name="subtitle" value="${escapeHtml(restaurant.subtitle)}" />
          </label>

          <label>URL Immagine di Copertina (Hero Banner)
            <input type="text" name="photo" value="${escapeHtml(restaurant.photo)}" />
            <small style="color:var(--muted); font-size:10px;">Puoi inserire <code>cover.jpg</code> oppure qualsiasi link HTTPS a una foto.</small>
          </label>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <label>Logo / Lettere Sigla (es. 39)
              <input type="text" name="logo" maxlength="4" value="${escapeHtml(restaurant.logo || '39')}" />
            </label>
            <label>Codice PIN Admin (per accedere) *
              <input type="text" name="pin" maxlength="8" value="${escapeHtml(restaurant.pin || '3939')}" required />
            </label>
          </div>

          <label>Indirizzo e Città
            <input type="text" name="address" value="${escapeHtml(restaurant.address || '')}" />
          </label>

          <label>Rete WiFi & Password per Clienti
            <input type="text" name="wifi" value="${escapeHtml(restaurant.wifi || '')}" />
          </label>

          <div style="margin-top: 18px;">
            <button type="submit" class="btn primary">Salva e Applica Online</button>
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
      <div class="qr-card">
        <h2 style="font: 22px var(--font-serif); margin: 0; font-weight: 400;">QR Code Segnatavolo</h2>
        <p style="font-size: 12px; color: var(--muted); margin: 6px 0 16px;">
          I clienti inquadrano questo codice per visualizzare all'istante il menù aggiornato sul proprio smartphone.
        </p>

        <img src="${qrApiUrl}" alt="QR Code Tavolo" />

        <p style="font-size: 11px; color: var(--muted); margin-bottom: 18px; word-break: break-all;">
          Indirizzo menù: <code>${escapeHtml(currentUrl)}</code>
        </p>

        <div style="display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;">
          <button class="btn primary" onclick="window.print()">🖨️ Stampa Segnatavolo</button>
          <a class="btn" href="${qrApiUrl}" download="QRCode_39Cafe.png" target="_blank">⬇️ Scarica Immagine</a>
        </div>
      </div>
    `;
  }

  // ================= TAB 5: CLOUD & BACKUP =================
  function renderSyncTab(data) {
    const { restaurant } = data;
    const syncStatus = window.SyncEngine.getStatus();

    return `
      <div style="max-width: 620px; display: flex; flex-direction: column; gap: 14px;">
        <div style="background: white; border: 1px solid var(--line); border-radius: 10px; padding: 20px;">
          <h2 style="font: 18px var(--font-serif); margin: 0 0 6px; font-weight: 400;">Canale Cloud SSE (Tempo Reale Attivo)</h2>
          <p style="font-size: 12px; color: var(--muted); margin-bottom: 12px;">
            Sincronizzazione automatica istantanea tra PC e smartphone tramite Server-Sent Events.
          </p>

          <label>Identificativo Canale Cloud
            <input type="text" id="sync-channel-input" value="${escapeHtml(restaurant.syncChannel || 'cafe39_menu_realtime_stream')}" />
          </label>

          <div style="display:flex; gap:8px; margin-top:12px;">
            <button class="btn primary sm" onclick="window.AdminApp.saveSyncConfig()">Salva Canale</button>
            <button class="btn sm" onclick="window.SyncEngine.forceCloudSync(); window.showToast('Sincronizzazione inviata al cloud!');">Forza Sincronizzazione</button>
          </div>
        </div>

        <div style="background: white; border: 1px solid var(--line); border-radius: 10px; padding: 20px;">
          <h2 style="font: 18px var(--font-serif); margin: 0 0 6px; font-weight: 400;">Integrazione Google Firebase (Opzionale)</h2>
          <p style="font-size: 12px; color: var(--muted); margin-bottom: 12px;">
            Puoi collegare un tuo Realtime Database Firebase permanente per conservare i dati nel cloud di Google.
          </p>

          <label>URL Firebase Realtime Database
            <input 
              type="url" 
              id="sync-firebase-input" 
              placeholder="https://tuo-progetto-default-rtdb.firebaseio.com" 
              value="${escapeHtml(restaurant.firebaseUrl || '')}" 
            />
          </label>

          <div style="display: flex; gap: 8px; margin-top: 12px;">
            <button class="btn primary sm" onclick="window.AdminApp.saveSyncConfig()">Salva URL Firebase</button>
            <button class="btn sm" onclick="window.AdminApp.testFirebase()">Testa Connessione</button>
          </div>
        </div>

        <div style="background: white; border: 1px solid var(--line); border-radius: 10px; padding: 20px;">
          <h2 style="font: 18px var(--font-serif); margin: 0 0 6px; font-weight: 400;">Backup Locale & Ripristino</h2>
          <p style="font-size: 12px; color: var(--muted); margin-bottom: 12px;">
            Scarica una copia di sicurezza dell'intero menù in JSON o ripristina un file precedente.
          </p>

          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button class="btn" onclick="window.AdminApp.downloadBackup()">📥 Scarica Backup (JSON)</button>
            <button class="btn" onclick="document.getElementById('import-file-input').click()">📤 Carica File JSON</button>
            <input type="file" id="import-file-input" accept=".json" style="display: none;" onchange="window.AdminApp.uploadBackup(event)" />
          </div>

          <div style="margin-top: 16px; padding-top: 14px; border-top: 1px dashed var(--line);">
            <button class="btn danger sm" onclick="window.AdminApp.resetSeedConfirm()">⚠️ Ripristina Dati di Fabbrica</button>
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
      <div class="modal-bg" id="dish-form-modal" onclick="if(event.target===this)this.remove()">
        <section class="modal">
          <h2>${isEdit ? 'Modifica piatto' : 'Nuovo piatto'}</h2>

          <form id="dish-form">
            <label>Nome piatto o bibita *
              <input type="text" name="name" value="${escapeHtml(dish ? dish.name : '')}" required placeholder="es. Carbonara 'Origini' o Tiramisù" />
            </label>

            <label>Categoria *
              <select name="categoryId" required>
                ${data.categories.map(c => `
                  <option value="${c.id}" ${c.id === initialCat ? 'selected' : ''}>${escapeHtml(c.name)}</option>
                `).join("")}
              </select>
            </label>

            <label>Descrizione / Ingredienti
              <textarea name="description" rows="3" placeholder="Descrivi il piatto, gli ingredienti freschi…">${escapeHtml(dish ? dish.description : '')}</textarea>
            </label>

            <label>Prezzo (€) *
              <input type="number" step="0.5" min="0" name="price" value="${dish ? dish.price : '10.00'}" required />
            </label>

            <label>URL foto
              <input type="url" name="image" value="${escapeHtml(dish ? dish.image : '')}" placeholder="https://images.unsplash.com/…" />
            </label>

            <label>Badge in evidenza (opzionale)
              <input type="text" name="badge" value="${escapeHtml(dish ? (dish.badge || '') : '')}" placeholder="es. Consigliato, Popolare, Specialità" />
            </label>

            <label>Allergeni dichiarati
              <input type="text" name="allergens" value="${escapeHtml(dish ? (dish.allergens || '') : '')}" placeholder="es. Glutine, Latte, Uova" />
            </label>

            <div style="margin: 12px 0 6px;">
              <small style="color:var(--muted); font-size:11px; display:block; margin-bottom:5px;">Regime dietetico:</small>
              <div style="display:flex; gap:10px; flex-wrap:wrap; font-size:12px;">
                <label style="display:inline-flex; align-items:center; gap:4px; margin:0; cursor:pointer;">
                  <input type="checkbox" name="diet_veg" ${dietary.includes('veg') ? 'checked' : ''} style="width:auto; margin:0;" /> 🍃 Veg
                </label>
                <label style="display:inline-flex; align-items:center; gap:4px; margin:0; cursor:pointer;">
                  <input type="checkbox" name="diet_vegan" ${dietary.includes('vegan') ? 'checked' : ''} style="width:auto; margin:0;" /> 🌱 Vegan
                </label>
                <label style="display:inline-flex; align-items:center; gap:4px; margin:0; cursor:pointer;">
                  <input type="checkbox" name="diet_glutenFree" ${dietary.includes('glutenFree') ? 'checked' : ''} style="width:auto; margin:0;" /> 🌾 Gluten Free
                </label>
              </div>
            </div>

            <div class="modal-checkbox-row">
              <input type="checkbox" name="available" id="m-avail" ${dish ? (dish.available ? 'checked' : '') : 'checked'} />
              <label for="m-avail" style="margin:0; cursor:pointer; font-size:12px;">Disponibile per l'ordine</label>
            </div>

            <div class="modal-buttons">
              <button type="button" class="btn" onclick="document.getElementById('dish-form-modal').remove()">Annulla</button>
              <button type="submit" class="btn primary">Salva</button>
            </div>
          </form>
        </section>
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
      <div class="modal-bg" id="cat-form-modal" onclick="if(event.target===this)this.remove()">
        <section class="modal">
          <h2>${isEdit ? 'Modifica categoria' : 'Nuova categoria'}</h2>

          <form id="category-form">
            <label>Nome categoria *
              <input type="text" name="name" value="${escapeHtml(cat ? cat.name : '')}" required placeholder="es. Primi Piatti o Birre Artigianali" />
            </label>

            <label>Descrizione / Sottotitolo
              <input type="text" name="description" value="${escapeHtml(cat ? cat.description : '')}" placeholder="es. Fatti in casa ogni giorno" />
            </label>

            <div class="modal-buttons">
              <button type="button" class="btn" onclick="document.getElementById('cat-form-modal').remove()">Annulla</button>
              <button type="submit" class="btn primary">Salva</button>
            </div>
          </form>
        </section>
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
      showToast("✓ Categoria salvata e sincronizzata!");
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
    if (tab === "restaurant") {
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
