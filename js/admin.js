/**
 * 39 CAFÉ & BISTROT - CONTROLLER PANNELLO DI GESTIONE (ADMIN.HTML)
 * Piatti, categorie, locale, QR code, cloud sync e backup. Accesso con PIN.
 */

(function () {
  let adminActiveTab = "dishes";

  const TABS = [
    { id: "dishes", label: "Menu" },
    { id: "categories", label: "Categorie" },
    { id: "restaurant", label: "Locale" },
    { id: "qrcode", label: "QR code" },
    { id: "sync", label: "Sincronizzazione" }
  ];

  function showToast(text, duration = 2600) {
    const old = document.querySelector(".toast");
    if (old) old.remove();
    const e = document.createElement("div");
    e.className = "toast";
    e.textContent = text;
    document.body.appendChild(e);
    setTimeout(() => e.remove(), duration);
  }
  window.showToast = showToast;

  function statusLabel(status) {
    return status === "online" ? "In diretta" : (status === "syncing" ? "Aggiornamento…" : "Offline");
  }

  function initAdmin() {
    window.SyncEngine.init({
      onUpdate: () => renderAdminPanel(true),
      onStatus: (status) => {
        const dot = document.getElementById("live-dot");
        const text = document.getElementById("live-status-text");
        if (dot && text) {
          dot.className = "live-dot " + (["online", "syncing"].includes(status) ? status : "offline");
          text.textContent = statusLabel(status);
        }
      }
    });

    const authScreen = document.getElementById("admin-auth-screen");
    const dashScreen = document.getElementById("admin-dashboard-screen");
    if (!authScreen || !dashScreen) return;

    if (sessionStorage.getItem("cafe39_admin_auth") === "true") {
      authScreen.style.display = "none";
      dashScreen.style.display = "block";
      renderAdminPanel();
      return;
    }

    authScreen.style.display = "grid";
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
        } else {
          showToast("PIN errato, riprova");
          pinInput.value = "";
          pinInput.focus();
        }
      };
    }
  }

  function renderAdminPanel(isRefresh) {
    const container = document.getElementById("admin-dashboard-screen");
    if (!container || container.style.display === "none") return;

    // Non interrompere chi sta scrivendo in un campo
    if (isRefresh) {
      const a = document.activeElement;
      if (a && container.contains(a) && /INPUT|TEXTAREA|SELECT/.test(a.tagName) && a.type !== "checkbox") return;
      if (document.getElementById("dish-form-modal") || document.getElementById("cat-form-modal")) return;
    }

    const data = window.SyncEngine.getData();
    const { restaurant, categories, dishes } = data;
    const status = window.SyncEngine.getStatus().status;
    const filterEl = document.getElementById("admin-filter");
    const filterValue = filterEl ? filterEl.value : "";

    container.innerHTML = `
      <header class="admin-top">
        <div class="admin-brand">
          <div class="brand-mark">${escapeHtml(restaurant.logo || "39")}</div>
          <div>
            <strong>${escapeHtml(restaurant.name)}</strong>
            <small>Gestione menu</small>
          </div>
        </div>
        <div class="admin-tools">
          <span class="live">
            <span class="live-dot ${["online", "syncing"].includes(status) ? status : "offline"}" id="live-dot"></span>
            <span id="live-status-text">${statusLabel(status)}</span>
          </span>
          <a href="index.html" class="btn sm">Vedi menu</a>
          <button class="btn sm ghost" type="button" onclick="window.AdminApp.logout()">Esci</button>
        </div>
      </header>

      <nav class="tabs" role="tablist">
        ${TABS.map(t => `
          <button class="tab ${adminActiveTab === t.id ? "active" : ""}" type="button" role="tab"
                  onclick="window.AdminApp.switchTab('${t.id}')">${t.label}</button>
        `).join("")}
      </nav>

      <div class="tab-body" ${isRefresh ? 'style="animation:none"' : ""}>
        ${renderTabContent(adminActiveTab, data)}
      </div>
    `;

    attachTabEventListeners(adminActiveTab);

    if (filterValue) {
      const f = document.getElementById("admin-filter");
      if (f) { f.value = filterValue; filterRows(filterValue); }
    }
  }

  function renderTabContent(tab, data) {
    switch (tab) {
      case "dishes": return renderDishesTab(data);
      case "categories": return renderCategoriesTab(data);
      case "restaurant": return renderRestaurantTab(data);
      case "qrcode": return renderQrCodeTab(data);
      case "sync": return renderSyncTab(data);
      default: return "";
    }
  }

  // ================= MENU: PIATTI & PREZZI =================
  function renderDishesTab(data) {
    const { categories, dishes } = data;
    const sortedCats = [...categories].sort((a, b) => a.order - b.order);

    return `
      <div class="toolbar">
        <input type="search" id="admin-filter" class="filter" placeholder="Cerca un piatto" autocomplete="off" />
        <button class="btn primary" type="button" onclick="window.AdminApp.openDishModal()">Nuovo piatto</button>
      </div>

      ${sortedCats.length === 0 ? `<div class="panel group-empty">Crea prima una categoria dalla sezione Categorie.</div>` : ""}

      ${sortedCats.map(cat => {
        const catDishes = dishes.filter(d => d.categoryId === cat.id);
        return `
          <section class="group" data-group>
            <div class="group-head">
              <h2>${escapeHtml(cat.name)}</h2>
              <span class="count">${catDishes.length}</span>
              <span class="spacer"></span>
              <button class="btn sm" type="button" onclick="window.AdminApp.openDishModal(null, '${cat.id}')">Aggiungi</button>
            </div>

            ${catDishes.length ? catDishes.map(d => `
              <div class="item ${d.available ? "" : "is-off"}" data-search="${escapeHtml((d.name + " " + (d.description || "")).toLowerCase())}">
                <div class="item-main">
                  <div class="item-thumb">${d.image ? `<img src="${escapeHtml(d.image)}" alt="" loading="lazy" onerror="this.remove()" />` : ""}</div>
                  <div class="item-text">
                    <div class="item-name">${escapeHtml(d.name)}${d.badge ? `<span class="dish-badge">${escapeHtml(d.badge)}</span>` : ""}</div>
                    <div class="item-desc">${escapeHtml(d.description || "Nessuna descrizione")}</div>
                  </div>
                </div>

                <label class="price-field" title="Modifica il prezzo">
                  <input type="number" step="0.5" min="0" value="${d.price}"
                    onchange="window.SyncEngine.updateDishPrice('${d.id}', this.value); window.showToast('Prezzo aggiornato');" />
                  <span>€</span>
                </label>

                <label class="switch" title="${d.available ? "Disponibile" : "Esaurito"}">
                  <input type="checkbox" ${d.available ? "checked" : ""} aria-label="Disponibile"
                    onchange="window.SyncEngine.toggleAvailability('${d.id}'); window.showToast(this.checked ? 'Segnato disponibile' : 'Segnato esaurito');" />
                  <i></i>
                </label>

                <button class="btn sm ghost" type="button" onclick="window.AdminApp.openDishModal('${d.id}')">Modifica</button>
              </div>
            `).join("") : `<div class="group-empty">Nessun piatto in questa categoria.</div>`}
          </section>
        `;
      }).join("")}
    `;
  }

  function filterRows(value) {
    const q = String(value || "").trim().toLowerCase();
    document.querySelectorAll("[data-group]").forEach(group => {
      let visible = 0;
      group.querySelectorAll(".item").forEach(row => {
        const show = !q || row.getAttribute("data-search").includes(q);
        row.style.display = show ? "" : "none";
        if (show) visible++;
      });
      group.style.display = (q && visible === 0) ? "none" : "";
    });
  }

  // ================= CATEGORIE =================
  function renderCategoriesTab(data) {
    const { categories, dishes } = data;
    const sortedCats = [...categories].sort((a, b) => a.order - b.order);

    return `
      <div class="toolbar">
        <span></span>
        <button class="btn primary" type="button" onclick="window.AdminApp.openCategoryModal()">Nuova categoria</button>
      </div>

      <section class="group">
        ${sortedCats.length ? sortedCats.map((cat, index) => {
          const count = dishes.filter(d => d.categoryId === cat.id).length;
          return `
            <div class="cat-row">
              <span class="num">${index + 1}</span>
              <div>
                <strong>${escapeHtml(cat.name)}</strong>
                <small>${count} ${count === 1 ? "piatto" : "piatti"}${cat.description ? " · " + escapeHtml(cat.description) : ""}</small>
              </div>
              <div class="row-actions">
                <button class="btn sm ghost" type="button" onclick="window.AdminApp.moveCategory('${cat.id}', -1)" ${index === 0 ? "disabled" : ""}>Su</button>
                <button class="btn sm ghost" type="button" onclick="window.AdminApp.moveCategory('${cat.id}', 1)" ${index === sortedCats.length - 1 ? "disabled" : ""}>Giù</button>
                <button class="btn sm ghost" type="button" onclick="window.AdminApp.openCategoryModal('${cat.id}')">Modifica</button>
                <button class="btn sm danger" type="button" onclick="window.AdminApp.deleteCategoryConfirm('${cat.id}')">Elimina</button>
              </div>
            </div>
          `;
        }).join("") : `<div class="group-empty">Nessuna categoria. Creane una per iniziare.</div>`}
      </section>
    `;
  }

  // ================= LOCALE =================
  function renderRestaurantTab(data) {
    const { restaurant } = data;

    return `
      <form id="restaurant-info-form">
        <section class="panel narrow">
          <h2>Identità</h2>
          <p class="lead">Quello che i clienti vedono in cima al menu.</p>

          <label class="field"><span>Nome del locale</span>
            <input type="text" name="name" value="${escapeHtml(restaurant.name)}" required />
          </label>
          <label class="field"><span>Sottotitolo</span>
            <input type="text" name="subtitle" value="${escapeHtml(restaurant.subtitle)}" />
          </label>
          <div class="field-row">
            <label class="field"><span>Sigla nel cerchio</span>
              <input type="text" name="logo" maxlength="4" value="${escapeHtml(restaurant.logo || "39")}" />
            </label>
            <label class="field"><span>Foto di copertina</span>
              <input type="text" name="photo" value="${escapeHtml(restaurant.photo)}" />
            </label>
          </div>
          <small style="color:var(--muted); font-size:11px;">Per la foto usa <code>cover.jpg</code> oppure un link a un'immagine online.</small>
        </section>

        <section class="panel narrow">
          <h2>Contatti</h2>
          <p class="lead">Mostrati sotto il titolo.</p>

          <label class="field"><span>Indirizzo</span>
            <input type="text" name="address" value="${escapeHtml(restaurant.address || "")}" />
          </label>
          <label class="field"><span>Wi-Fi e password</span>
            <input type="text" name="wifi" value="${escapeHtml(restaurant.wifi || "")}" />
          </label>
        </section>

        <section class="panel narrow">
          <h2>Accesso</h2>
          <p class="lead">PIN richiesto per entrare in questa area.</p>

          <label class="field"><span>PIN</span>
            <input type="text" name="pin" maxlength="8" value="${escapeHtml(restaurant.pin || "3939")}" required />
          </label>
        </section>

        <button type="submit" class="btn primary">Salva modifiche</button>
      </form>
    `;
  }

  // ================= QR CODE =================
  function renderQrCodeTab() {
    const currentUrl = window.location.href.replace(/admin\.html.*$/, "index.html");
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(currentUrl)}`;

    return `
      <section class="panel qr-card">
        <h2>QR code per i tavoli</h2>
        <p class="lead" style="margin-bottom:0">I clienti lo inquadrano per aprire il menu aggiornato.</p>
        <img src="${qrApiUrl}" alt="QR code del menu" />
        <p class="qr-url">${escapeHtml(currentUrl)}</p>
        <div class="btn-row" style="justify-content:center">
          <button class="btn primary" type="button" onclick="window.print()">Stampa</button>
          <a class="btn" href="${qrApiUrl}" download="QRCode_39Cafe.png" target="_blank" rel="noopener">Scarica immagine</a>
        </div>
      </section>
    `;
  }

  // ================= SINCRONIZZAZIONE & BACKUP =================
  function renderSyncTab(data) {
    const { restaurant } = data;

    return `
      <section class="panel narrow">
        <h2>Canale in tempo reale</h2>
        <p class="lead">Telefoni e computer con lo stesso canale si aggiornano all'istante.</p>

        <label class="field"><span>Nome del canale</span>
          <input type="text" id="sync-channel-input" value="${escapeHtml(restaurant.syncChannel || "cafe39_menu_realtime_stream")}" />
        </label>
        <div class="btn-row">
          <button class="btn primary" type="button" onclick="window.AdminApp.saveSyncConfig()">Salva</button>
          <button class="btn" type="button" onclick="window.SyncEngine.forceCloudSync(); window.showToast('Sincronizzazione inviata');">Forza sincronizzazione</button>
        </div>
      </section>

      <section class="panel narrow">
        <h2>Firebase</h2>
        <p class="lead">Facoltativo: collega un tuo Realtime Database per conservare i dati.</p>

        <label class="field"><span>URL del database</span>
          <input type="url" id="sync-firebase-input" placeholder="https://tuo-progetto-default-rtdb.firebaseio.com" value="${escapeHtml(restaurant.firebaseUrl || "")}" />
        </label>
        <div class="btn-row">
          <button class="btn primary" type="button" onclick="window.AdminApp.saveSyncConfig()">Salva</button>
          <button class="btn" type="button" onclick="window.AdminApp.testFirebase()">Testa connessione</button>
        </div>
      </section>

      <section class="panel narrow">
        <h2>Backup</h2>
        <p class="lead">Scarica una copia del menu o ripristinane una precedente.</p>

        <div class="btn-row">
          <button class="btn" type="button" onclick="window.AdminApp.downloadBackup()">Scarica backup</button>
          <button class="btn" type="button" onclick="document.getElementById('import-file-input').click()">Carica backup</button>
          <input type="file" id="import-file-input" accept=".json" style="display:none" onchange="window.AdminApp.uploadBackup(event)" />
        </div>

        <hr class="divider" />
        <button class="btn danger sm" type="button" onclick="window.AdminApp.resetSeedConfirm()">Ripristina il menu iniziale</button>
      </section>
    `;
  }

  // ================= MODALI =================
  function closeModal(id) {
    const m = document.getElementById(id);
    if (m) m.remove();
  }

  function bindModalClose(id) {
    const modal = document.getElementById(id);
    modal.addEventListener("click", (e) => {
      if (e.target === modal || e.target.hasAttribute("data-close")) modal.remove();
    });
  }

  function openDishModal(dishId = null, defaultCatId = null) {
    const data = window.SyncEngine.getData();
    const isEdit = Boolean(dishId);
    const dish = isEdit ? data.dishes.find(d => d.id === dishId) : null;

    const initialCat = dish ? dish.categoryId : (defaultCatId || (data.categories[0] && data.categories[0].id) || "");
    const dietary = (dish && dish.dietary) || [];

    document.body.insertAdjacentHTML("beforeend", `
      <div class="modal-bg" id="dish-form-modal">
        <section class="modal" role="dialog" aria-modal="true">
          <h2>${isEdit ? "Modifica piatto" : "Nuovo piatto"}</h2>

          <div class="preview-label">Anteprima nel menu</div>
          <div class="preview" id="dish-preview"></div>

          <form id="dish-form">
            <label class="field"><span>Nome</span>
              <input type="text" name="name" value="${escapeHtml(dish ? dish.name : "")}" required placeholder="Es. Tiramisù" />
            </label>

            <div class="field-row">
              <label class="field"><span>Categoria</span>
                <select name="categoryId" required>
                  ${data.categories.map(c => `<option value="${c.id}" ${c.id === initialCat ? "selected" : ""}>${escapeHtml(c.name)}</option>`).join("")}
                </select>
              </label>
              <label class="field"><span>Prezzo (€)</span>
                <input type="number" step="0.5" min="0" name="price" value="${dish ? dish.price : "10.00"}" required />
              </label>
            </div>

            <label class="field"><span>Descrizione</span>
              <textarea name="description" placeholder="Ingredienti e preparazione">${escapeHtml(dish ? dish.description : "")}</textarea>
            </label>

            <div class="modal-section">Dettagli</div>

            <label class="field"><span>Link alla foto</span>
              <input type="url" name="image" value="${escapeHtml(dish ? dish.image : "")}" placeholder="https://" />
            </label>
            <div class="field-row">
              <label class="field"><span>Etichetta (facoltativa)</span>
                <input type="text" name="badge" value="${escapeHtml(dish ? (dish.badge || "") : "")}" placeholder="Es. Consigliato" />
              </label>
              <label class="field"><span>Allergeni</span>
                <input type="text" name="allergens" value="${escapeHtml(dish ? (dish.allergens || "") : "")}" placeholder="Es. Glutine, latte" />
              </label>
            </div>

            <div class="field"><span>Regime alimentare</span>
              <div class="choices">
                <label class="choice"><input type="checkbox" name="diet_veg" ${dietary.includes("veg") ? "checked" : ""} /><span>Vegetariano</span></label>
                <label class="choice"><input type="checkbox" name="diet_vegan" ${dietary.includes("vegan") ? "checked" : ""} /><span>Vegano</span></label>
                <label class="choice"><input type="checkbox" name="diet_glutenFree" ${dietary.includes("glutenFree") ? "checked" : ""} /><span>Senza glutine</span></label>
              </div>
            </div>

            <div class="field" style="display:flex; align-items:center; gap:12px; margin-top:20px;">
              <label class="switch"><input type="checkbox" name="available" ${dish ? (dish.available ? "checked" : "") : "checked"} /><i></i></label>
              <span style="margin:0; font-size:13px; color:var(--ink);">Disponibile</span>
            </div>

            <div class="modal-actions">
              ${isEdit ? `<button type="button" class="btn danger" id="dish-delete-btn">Elimina</button>` : ""}
              <span class="spacer"></span>
              <button type="button" class="btn ghost" data-close>Annulla</button>
              <button type="submit" class="btn primary">Salva</button>
            </div>
          </form>
        </section>
      </div>
    `);

    bindModalClose("dish-form-modal");

    // Anteprima live: stesso aspetto del menu pubblico
    const form = document.getElementById("dish-form");
    const preview = document.getElementById("dish-preview");
    const DIET = { diet_veg: "Vegetariano", diet_vegan: "Vegano", diet_glutenFree: "Senza glutine" };

    function updatePreview() {
      const fd = new FormData(form);
      const name = (fd.get("name") || "").trim() || "Nome del piatto";
      const desc = (fd.get("description") || "").trim();
      const image = (fd.get("image") || "").trim();
      const badge = (fd.get("badge") || "").trim();
      const allergens = (fd.get("allergens") || "").trim();
      const price = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(Number(fd.get("price")) || 0);
      const sold = !fd.has("available");
      const diet = Object.keys(DIET).filter(k => fd.has(k)).map(k => DIET[k]);

      const meta = [];
      if (diet.length) meta.push(`<span>${diet.join(" · ")}</span>`);
      if (allergens && allergens.toLowerCase() !== "nessuno") meta.push(`<span>Allergeni: ${escapeHtml(allergens)}</span>`);

      preview.innerHTML = `
        <article class="dish ${sold ? "unavailable" : ""}">
          <div>
            <h3>
              <span class="name">${escapeHtml(name)}</span>
              ${badge ? `<span class="dish-badge">${escapeHtml(badge)}</span>` : ""}
              ${sold ? `<span class="sold">Esaurito</span>` : ""}
            </h3>
            ${desc ? `<p>${escapeHtml(desc)}</p>` : ""}
            <div class="dish-meta">
              <span class="price">${price}</span>
              ${meta.join("")}
            </div>
          </div>
          ${image ? `<div class="dish-photo"><img src="${escapeHtml(image)}" alt="" onerror="this.parentNode.style.display='none'" /></div>` : ""}
        </article>
      `;
    }

    form.addEventListener("input", updatePreview);
    form.addEventListener("change", updatePreview);
    updatePreview();


    if (isEdit) {
      document.getElementById("dish-delete-btn").onclick = () => deleteDishConfirm(dishId);
    }

    document.getElementById("dish-form").onsubmit = (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);

      const dietaryArr = [];
      if (fd.has("diet_veg")) dietaryArr.push("veg");
      if (fd.has("diet_vegan")) dietaryArr.push("vegan");
      if (fd.has("diet_glutenFree")) dietaryArr.push("glutenFree");

      window.SyncEngine.saveDish({
        id: dishId || ("dish_" + Math.random().toString(36).slice(2, 9)),
        categoryId: fd.get("categoryId"),
        name: fd.get("name").trim(),
        price: Number(fd.get("price")),
        description: fd.get("description").trim(),
        image: fd.get("image").trim(),
        badge: fd.get("badge").trim(),
        allergens: fd.get("allergens").trim(),
        dietary: dietaryArr,
        available: fd.has("available")
      });

      closeModal("dish-form-modal");
      renderAdminPanel();
      showToast("Piatto salvato");
    };
  }

  function openCategoryModal(catId = null) {
    const data = window.SyncEngine.getData();
    const isEdit = Boolean(catId);
    const cat = isEdit ? data.categories.find(c => c.id === catId) : null;

    document.body.insertAdjacentHTML("beforeend", `
      <div class="modal-bg" id="cat-form-modal">
        <section class="modal" role="dialog" aria-modal="true" style="max-width:440px">
          <h2>${isEdit ? "Modifica categoria" : "Nuova categoria"}</h2>

          <form id="category-form">
            <label class="field"><span>Nome</span>
              <input type="text" name="name" value="${escapeHtml(cat ? cat.name : "")}" required placeholder="Es. Primi piatti" />
            </label>
            <label class="field"><span>Descrizione (facoltativa)</span>
              <input type="text" name="description" value="${escapeHtml(cat ? cat.description : "")}" placeholder="Es. Pasta fresca fatta in casa" />
            </label>

            <div class="modal-actions">
              <span class="spacer"></span>
              <button type="button" class="btn ghost" data-close>Annulla</button>
              <button type="submit" class="btn primary">Salva</button>
            </div>
          </form>
        </section>
      </div>
    `);

    bindModalClose("cat-form-modal");

    document.getElementById("category-form").onsubmit = (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);

      window.SyncEngine.saveCategory({
        id: catId || ("cat_" + Math.random().toString(36).slice(2, 9)),
        name: fd.get("name").trim(),
        description: fd.get("description").trim(),
        order: isEdit ? cat.order : data.categories.length
      });

      closeModal("cat-form-modal");
      renderAdminPanel();
      showToast("Categoria salvata");
    };
  }

  function moveCategory(catId, direction) {
    const data = window.SyncEngine.getData();
    const sorted = [...data.categories].sort((a, b) => a.order - b.order);
    const index = sorted.findIndex(c => c.id === catId);
    if (index < 0) return;

    const target = index + direction;
    if (target < 0 || target >= sorted.length) return;

    const tmp = sorted[index].order;
    sorted[index].order = sorted[target].order;
    sorted[target].order = tmp;

    sorted.sort((a, b) => a.order - b.order);
    sorted.forEach((c, i) => c.order = i);

    window.SyncEngine.reorderCategories(sorted);
    renderAdminPanel();
  }

  function deleteDishConfirm(dishId) {
    const dish = window.SyncEngine.getData().dishes.find(d => d.id === dishId);
    if (!dish) return;
    if (confirm(`Eliminare "${dish.name}"?`)) {
      window.SyncEngine.deleteDish(dishId);
      closeModal("dish-form-modal");
      renderAdminPanel();
      showToast("Piatto eliminato");
    }
  }

  function deleteCategoryConfirm(catId) {
    const data = window.SyncEngine.getData();
    const cat = data.categories.find(c => c.id === catId);
    if (!cat) return;
    const count = data.dishes.filter(d => d.categoryId === catId).length;
    const msg = count > 0
      ? `Eliminando "${cat.name}" verranno rimossi anche i ${count} piatti al suo interno. Procedere?`
      : `Eliminare la categoria "${cat.name}"?`;

    if (confirm(msg)) {
      window.SyncEngine.deleteCategory(catId);
      renderAdminPanel();
      showToast("Categoria eliminata");
    }
  }

  function downloadBackup() {
    const blob = new Blob([window.SyncEngine.exportJSON()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `39Cafe_Menu_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Backup scaricato");
  }

  function uploadBackup(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const res = window.SyncEngine.importJSON(e.target.result);
      if (res.success) {
        renderAdminPanel();
        showToast("Menu ripristinato");
      } else {
        alert("Errore nel file: " + res.error);
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  function resetSeedConfirm() {
    if (confirm("Ripristinare il menu iniziale? Tutte le modifiche verranno perse.")) {
      window.SyncEngine.resetToSeed();
      renderAdminPanel();
      showToast("Menu iniziale ripristinato");
    }
  }

  function saveSyncConfig() {
    const channelInput = document.getElementById("sync-channel-input");
    const fbInput = document.getElementById("sync-firebase-input");

    window.SyncEngine.updateRestaurantInfo({
      syncChannel: (channelInput ? channelInput.value.trim() : "") || "cafe39_menu_realtime_stream",
      firebaseUrl: fbInput ? fbInput.value.trim() : ""
    });

    showToast("Configurazione salvata");
    renderAdminPanel();
  }

  async function testFirebase() {
    const fbInput = document.getElementById("sync-firebase-input");
    const url = fbInput ? fbInput.value.trim() : "";
    showToast("Test in corso…");
    const res = await window.SyncEngine.testFirebaseConnection(url);
    alert(res.success ? "Connessione a Firebase riuscita." : "Errore di connessione a Firebase:\n" + res.error);
  }

  function attachTabEventListeners(tab) {
    if (tab === "dishes") {
      const f = document.getElementById("admin-filter");
      if (f) f.addEventListener("input", (e) => filterRows(e.target.value));
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
          showToast("Informazioni aggiornate");
        };
      }
    }
  }

  function escapeHtml(str) {
    return String(str ?? "").replace(/[&<>"']/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

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
    openDishModal,
    openCategoryModal,
    moveCategory,
    deleteDishConfirm,
    deleteCategoryConfirm,
    downloadBackup,
    uploadBackup,
    resetSeedConfirm,
    saveSyncConfig,
    testFirebase
  };

  document.addEventListener("DOMContentLoaded", initAdmin);
})();
