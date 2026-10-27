/**
 * 39 CAFÉ & BISTROT - CUSTOMER MENU & INTERFACE CONTROLLER
 * Gestione navigazione, filtri di ricerca, tag dietetici, animazioni e modali piatti.
 */

(function () {
  let menuData = null;
  let activeCategoryFilter = "all";
  let activeDietFilter = "all"; // 'all', 'veg', 'vegan', 'glutenFree'
  let searchQuery = "";

  // Helper formattazione euro
  function formatEuro(price) {
    return new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: "EUR"
    }).format(Number(price) || 0);
  }

  // Toast notification
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

  // Inizializzazione Applicazione
  function initApp() {
    menuData = window.SyncEngine.init({
      onUpdate: (updatedData, source) => {
        menuData = updatedData;
        renderPublicMenu();
        if (source === "remote") {
          showToast("✨ Menù aggiornato in tempo reale!", 2500);
        }
        if (window.AdminApp && typeof window.AdminApp.onDataUpdated === "function") {
          window.AdminApp.onDataUpdated(updatedData);
        }
      },
      onStatus: (status, message) => {
        updateLiveIndicator(status, message);
      }
    });

    renderPublicMenu();
    setupEventListeners();
  }

  // Aggiorna il pallino e lo stato del cloud
  function updateLiveIndicator(status, message) {
    const dot = document.getElementById("live-dot");
    const text = document.getElementById("live-status-text");
    if (!dot || !text) return;

    dot.className = "live-dot";
    if (status === "online") {
      dot.classList.add("online");
      text.textContent = "Online Live";
    } else if (status === "syncing") {
      dot.classList.add("syncing");
      text.textContent = "Sincronizzazione…";
    } else {
      dot.classList.add("offline");
      text.textContent = "Offline (Locale)";
    }
  }

  // Render dell'intero menù pubblico
  function renderPublicMenu() {
    const root = document.getElementById("public-menu-container");
    if (!root) return;

    const { restaurant, categories, dishes } = menuData;

    // Aggiorna Hero Brand
    const heroTitle = document.getElementById("brand-hero-title");
    const heroSubtitle = document.getElementById("brand-hero-subtitle");
    const heroMark = document.getElementById("brand-logo-mark");
    const heroImg = document.getElementById("brand-hero-img");
    const heroAddress = document.getElementById("brand-address-text");
    const heroWifi = document.getElementById("brand-wifi-text");

    if (heroTitle) heroTitle.textContent = restaurant.name;
    if (heroSubtitle) heroSubtitle.textContent = restaurant.subtitle;
    if (heroMark) heroMark.textContent = restaurant.logo || "39";
    if (heroImg && restaurant.photo) heroImg.src = restaurant.photo;
    if (heroAddress) heroAddress.textContent = restaurant.address || "Roma Centro";
    if (heroWifi) heroWifi.textContent = restaurant.wifi || "WiFi Gratuito";

    // Genera Pills Categorie
    renderCategoryPills(categories, dishes);

    // Filtra e renderizza i piatti
    renderDishesSection(categories, dishes);
  }

  // Renderizza le pillole di navigazione categoria
  function renderCategoryPills(categories, dishes) {
    const navBar = document.getElementById("category-nav-bar");
    if (!navBar) return;

    const sortedCats = [...categories].sort((a, b) => a.order - b.order);

    let html = `
      <button class="cat-pill-btn ${activeCategoryFilter === 'all' ? 'active' : ''}" data-cat="all">
        Tutti i Piatti <span class="count">(${dishes.length})</span>
      </button>
    `;

    sortedCats.forEach(cat => {
      const count = dishes.filter(d => d.categoryId === cat.id).length;
      html += `
        <button class="cat-pill-btn ${activeCategoryFilter === cat.id ? 'active' : ''}" data-cat="${cat.id}">
          ${escapeHtml(cat.name)} <span class="count">(${count})</span>
        </button>
      `;
    });

    navBar.innerHTML = html;

    // Listener click sulle pillole
    navBar.querySelectorAll(".cat-pill-btn").forEach(btn => {
      btn.onclick = () => {
        const catId = btn.getAttribute("data-cat");
        activeCategoryFilter = catId;
        renderCategoryPills(categories, dishes);
        if (catId === "all") {
          renderDishesSection(categories, dishes);
        } else {
          renderDishesSection(categories, dishes);
          const targetEl = document.getElementById(`section-${catId}`);
          if (targetEl) {
            targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }
      };
    });
  }

  // Renderizza le sezioni e i piatti
  function renderDishesSection(categories, dishes) {
    const listContainer = document.getElementById("categories-content-container");
    if (!listContainer) return;

    const query = searchQuery.trim().toLowerCase();
    const sortedCats = [...categories].sort((a, b) => a.order - b.order);

    // Filtro attivo
    const visibleCats = activeCategoryFilter === "all"
      ? sortedCats
      : sortedCats.filter(c => c.id === activeCategoryFilter);

    let html = "";
    let totalVisibleDishes = 0;

    visibleCats.forEach(cat => {
      let catDishes = dishes.filter(d => d.categoryId === cat.id);

      // Filtro ricerca testuale
      if (query) {
        catDishes = catDishes.filter(d =>
          (d.name && d.name.toLowerCase().includes(query)) ||
          (d.description && d.description.toLowerCase().includes(query)) ||
          (d.allergens && d.allergens.toLowerCase().includes(query))
        );
      }

      // Filtro regime dietetico
      if (activeDietFilter !== "all") {
        catDishes = catDishes.filter(d => Array.isArray(d.dietary) && d.dietary.includes(activeDietFilter));
      }

      if (catDishes.length === 0 && (query || activeDietFilter !== "all")) {
        return; // Salta categorie vuote se c'è un filtro attivo
      }

      totalVisibleDishes += catDishes.length;

      html += `
        <section class="category-section" id="section-${cat.id}">
          <div class="category-header">
            <div>
              <h2>${escapeHtml(cat.name)}</h2>
              ${cat.description ? `<p class="cat-desc">${escapeHtml(cat.description)}</p>` : ""}
            </div>
          </div>
          
          <div class="dishes-grid">
            ${catDishes.length > 0 ? catDishes.map(dish => renderDishCard(dish)).join("") : `
              <div class="empty-notice">
                Nessun piatto disponibile in questa categoria al momento.
              </div>
            `}
          </div>
        </section>
      `;
    });

    if (totalVisibleDishes === 0) {
      html = `
        <div class="empty-notice" style="padding: 50px 20px;">
          <p style="font-size: 16px; margin-bottom: 8px;">Nessun piatto trovato con i criteri selezionati.</p>
          <button class="btn sm" onclick="window.App.resetFilters()">Azzera filtri di ricerca</button>
        </div>
      `;
    }

    listContainer.innerHTML = html;

    // Setup listener click foto per ingrandimento
    listContainer.querySelectorAll(".dish-card-img-wrap").forEach(wrap => {
      wrap.onclick = () => {
        const dishId = wrap.getAttribute("data-dish-id");
        openDishModal(dishId);
      };
    });
  }

  // Renderizza la singola card di un piatto (con foto grande e ben visibile)
  function renderDishCard(dish) {
    const isSoldOut = !dish.available;
    const dietaryBadges = renderDietaryTags(dish.dietary);

    return `
      <article class="dish-card ${isSoldOut ? 'unavailable' : ''}" id="dish-${dish.id}">
        <div class="dish-card-img-wrap" data-dish-id="${dish.id}">
          <img 
            class="dish-card-img" 
            src="${escapeHtml(dish.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=700&q=80')}" 
            alt="${escapeHtml(dish.name)}"
            loading="lazy"
            onerror="this.src='https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=700&q=80'"
          />
          ${dish.badge ? `<span class="dish-badge gold">${escapeHtml(dish.badge)}</span>` : ""}
          ${isSoldOut ? `<div class="sold-out-overlay">Esaurito</div>` : ""}
        </div>

        <div class="dish-card-body">
          <div class="dish-title-row">
            <h3 class="dish-name">${escapeHtml(dish.name)}</h3>
            <span class="dish-price">${formatEuro(dish.price)}</span>
          </div>

          <p class="dish-desc">${escapeHtml(dish.description || "")}</p>

          <div class="dish-card-footer">
            <div class="dietary-tags">
              ${dietaryBadges}
            </div>
            ${dish.allergens ? `
              <span class="allergens-pill" onclick="window.App.showAllergensModal('${escapeHtml(dish.name)}', '${escapeHtml(dish.allergens)}')">
                ⚠️ Allergeni
              </span>
            ` : ""}
          </div>
        </div>
      </article>
    `;
  }

  // Helper tag alimentari (Veg, Vegan, Senza Glutine)
  function renderDietaryTags(dietary) {
    if (!Array.isArray(dietary)) return "";
    let html = "";
    if (dietary.includes("veg")) {
      html += `<span class="diet-pill" title="Vegetariano">🍃 Veg</span>`;
    }
    if (dietary.includes("vegan")) {
      html += `<span class="diet-pill" title="Vegano">🌱 Vegan</span>`;
    }
    if (dietary.includes("glutenFree")) {
      html += `<span class="diet-pill" title="Senza Glutine">🌾 Gluten Free</span>`;
    }
    return html;
  }

  // Modale visualizzazione dettagliata del piatto
  function openDishModal(dishId) {
    const dish = menuData.dishes.find(d => d.id === dishId);
    if (!dish) return;

    const modalHtml = `
      <div class="modal-backdrop" id="dish-detail-modal" onclick="if(event.target===this)this.remove()">
        <div class="modal-box" style="max-width: 500px;">
          <div style="position: relative; height: 260px; overflow: hidden;">
            <img 
              src="${escapeHtml(dish.image)}" 
              alt="${escapeHtml(dish.name)}"
              style="width: 100%; height: 100%; object-fit: cover;"
            />
            <button 
              class="modal-close-btn" 
              onclick="document.getElementById('dish-detail-modal').remove()"
              style="position: absolute; top: 12px; right: 12px; background: rgba(0,0,0,0.6); color: #fff; width: 34px; height: 34px; border-radius: 50%;"
            >×</button>
            ${dish.badge ? `<span class="dish-badge gold" style="top: 12px; left: 12px;">${escapeHtml(dish.badge)}</span>` : ""}
          </div>
          
          <div class="modal-body">
            <div class="dish-title-row" style="margin-bottom: 10px;">
              <h2 style="font-family: var(--font-serif); font-size: 22px;">${escapeHtml(dish.name)}</h2>
              <span class="dish-price" style="font-size: 18px;">${formatEuro(dish.price)}</span>
            </div>
            
            <p style="font-size: 13.5px; line-height: 1.5; color: var(--ink-secondary); margin-bottom: 16px;">
              ${escapeHtml(dish.description)}
            </p>

            <div style="padding: 12px; background: var(--bg-subtle); border-radius: var(--radius-sm); font-size: 12px; margin-bottom: 12px;">
              <strong>Allergeni presenti:</strong> ${dish.allergens ? escapeHtml(dish.allergens) : "Nessun allergene dichiarato"}
            </div>

            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              ${renderDietaryTags(dish.dietary)}
            </div>
          </div>
          
          <div class="modal-footer">
            <button class="btn primary" onclick="document.getElementById('dish-detail-modal').remove()">Chiudi</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML("beforeend", modalHtml);
  }

  // Modale allergeni
  function showAllergensModal(dishName, allergens) {
    const modalHtml = `
      <div class="modal-backdrop" id="allergens-modal" onclick="if(event.target===this)this.remove()">
        <div class="modal-box" style="max-width: 400px;">
          <div class="modal-header">
            <h2>Allergeni</h2>
            <button class="modal-close-btn" onclick="document.getElementById('allergens-modal').remove()">×</button>
          </div>
          <div class="modal-body">
            <p style="font-size: 13px; font-weight: 600; margin-bottom: 6px;">${escapeHtml(dishName)}</p>
            <p style="font-size: 13px; color: var(--ink-secondary);">${escapeHtml(allergens)}</p>
            <p style="font-size: 11px; color: var(--ink-muted); margin-top: 15px;">
              * Per chiarimenti su contaminazioni crociate si prega di fare sempre riferimento al nostro personale di sala.
            </p>
          </div>
          <div class="modal-footer">
            <button class="btn primary" onclick="document.getElementById('allergens-modal').remove()">Ho capito</button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML("beforeend", modalHtml);
  }

  // Setup Event Listeners (Ricerca, Chips dietetici)
  function setupEventListeners() {
    const searchInput = document.getElementById("search-input");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        searchQuery = e.target.value;
        renderDishesSection(menuData.categories, menuData.dishes);
      });
    }

    // Chips dietetici
    document.querySelectorAll(".chip-btn").forEach(chip => {
      chip.addEventListener("click", () => {
        document.querySelectorAll(".chip-btn").forEach(c => c.classList.remove("active"));
        chip.classList.add("active");
        activeDietFilter = chip.getAttribute("data-diet");
        renderDishesSection(menuData.categories, menuData.dishes);
      });
    });
  }

  // Utility escape HTML per sicurezza XSS
  function escapeHtml(str) {
    return String(str ?? "").replace(/[&<>"']/g, c => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[c]));
  }

  // Esporta interfaccia pubblica
  window.App = {
    init: initApp,
    showAllergensModal: showAllergensModal,
    openDishModal: openDishModal,
    resetFilters: function () {
      searchQuery = "";
      activeDietFilter = "all";
      activeCategoryFilter = "all";
      const s = document.getElementById("search-input");
      if (s) s.value = "";
      document.querySelectorAll(".chip-btn").forEach((c, i) => {
        if (i === 0) c.classList.add("active");
        else c.classList.remove("active");
      });
      renderPublicMenu();
    }
  };

  // Avvio al caricamento del DOM
  document.addEventListener("DOMContentLoaded", initApp);
})();
