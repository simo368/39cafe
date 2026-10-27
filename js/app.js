/**
 * 39 CAFÉ & BISTROT - CUSTOMER MENU & INTERFACE CONTROLLER
 * Render minimalista a libro/carta con fisarmonica e sincronizzazione real-time.
 */

(function () {
  let menuData = null;
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
      text.textContent = "Online";
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

    // Aggiorna Header Brand
    const heroTitle = document.getElementById("brand-hero-title");
    const heroSubtitle = document.getElementById("brand-hero-subtitle");
    const heroMark = document.getElementById("brand-logo-mark");
    const heroImg = document.getElementById("brand-hero-img");
    const photoWrap = document.getElementById("brand-photo-wrap");
    const heroAddress = document.getElementById("brand-address-text");
    const heroWifi = document.getElementById("brand-wifi-text");

    if (heroTitle) heroTitle.textContent = restaurant.name;
    if (heroSubtitle) heroSubtitle.textContent = restaurant.subtitle;
    if (heroMark) heroMark.textContent = restaurant.logo || "39";
    if (heroAddress) heroAddress.textContent = restaurant.address ? `📍 ${restaurant.address}` : "📍 Roma";
    if (heroWifi) heroWifi.textContent = restaurant.wifi ? `📶 WiFi: ${restaurant.wifi}` : "";

    if (heroImg && photoWrap) {
      if (restaurant.photo) {
        heroImg.src = restaurant.photo;
        photoWrap.style.display = "grid";
      } else {
        photoWrap.style.display = "none";
      }
    }

    // Filtra e renderizza categorie e piatti
    renderDishesSection(categories, dishes);
  }

  // Renderizza le sezioni a fisarmonica e i piatti
  function renderDishesSection(categories, dishes) {
    const listContainer = document.getElementById("categories-content-container");
    if (!listContainer) return;

    const query = searchQuery.trim().toLowerCase();
    const sortedCats = [...categories].sort((a, b) => a.order - b.order);

    let html = "";
    let totalVisibleDishes = 0;

    sortedCats.forEach(cat => {
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
        <details class="category" open id="cat-${cat.id}">
          <summary>${escapeHtml(cat.name)}</summary>
          <div class="category-body">
            ${cat.description ? `<p class="category-desc">${escapeHtml(cat.description)}</p>` : ""}
            ${catDishes.length > 0 ? catDishes.map(dish => renderDish(dish)).join("") : `
              <div class="empty">Nessun piatto disponibile in questa categoria al momento.</div>
            `}
          </div>
        </details>
      `;
    });

    if (totalVisibleDishes === 0) {
      html = `
        <div class="empty" style="padding: 40px 20px;">
          <p style="font-size: 14px; margin-bottom: 12px;">Nessun piatto trovato con i criteri selezionati.</p>
          <button class="btn sm" onclick="window.App.resetFilters()">Azzera filtri di ricerca</button>
        </div>
      `;
    }

    listContainer.innerHTML = html;
  }

  // Renderizza il singolo articolo piatto
  function renderDish(dish) {
    const isSoldOut = !dish.available;

    return `
      <article class="dish ${isSoldOut ? 'unavailable' : ''}" id="dish-${dish.id}">
        <div>
          <h3>
            ${escapeHtml(dish.name)}
            ${dish.badge ? `<span class="dish-badge">${escapeHtml(dish.badge)}</span>` : ""}
            ${isSoldOut ? ' · Esaurito' : ''}
          </h3>
          <p>${escapeHtml(dish.description || '')}</p>
          ${dish.allergens ? `<small class="allergens">ALLERGENI · ${escapeHtml(dish.allergens)}</small>` : ''}
          <div class="price">${formatEuro(dish.price)}</div>
        </div>
        ${dish.image ? `
          <img 
            loading="lazy" 
            src="${escapeHtml(dish.image)}" 
            alt="${escapeHtml(dish.name)}" 
            onclick="window.App.openDishModal('${dish.id}')"
            onerror="this.style.display='none'"
          />
        ` : ''}
      </article>
    `;
  }

  // Modale visualizzazione dettagliata del piatto
  function openDishModal(dishId) {
    const dish = menuData.dishes.find(d => d.id === dishId);
    if (!dish) return;

    const modalHtml = `
      <div class="modal-bg" id="dish-detail-modal" onclick="if(event.target===this)this.remove()">
        <section class="modal">
          ${dish.image ? `
            <div style="width: 100%; height: 210px; border-radius: 8px; overflow: hidden; margin-bottom: 16px; background: #ecebe5;">
              <img 
                src="${escapeHtml(dish.image)}" 
                alt="${escapeHtml(dish.name)}"
                style="width: 100%; height: 100%; object-fit: cover;"
              />
            </div>
          ` : ''}

          <div style="display: flex; justify-content: space-between; align-items: baseline; gap: 10px; margin-bottom: 6px;">
            <h2>${escapeHtml(dish.name)} ${dish.badge ? `<span class="dish-badge">${escapeHtml(dish.badge)}</span>` : ''}</h2>
            <div class="price" style="font-size: 15px;">${formatEuro(dish.price)}</div>
          </div>

          <p style="font-size: 13px; color: #77766f; line-height: 1.5; margin: 8px 0 14px;">
            ${escapeHtml(dish.description || 'Nessuna descrizione disponibile.')}
          </p>

          <div style="padding: 10px 14px; background: #fff; border: 1px solid var(--line); border-radius: 8px; font-size: 11px; margin-bottom: 14px;">
            <strong>Allergeni:</strong> ${dish.allergens ? escapeHtml(dish.allergens) : "Nessun allergene dichiarato"}
          </div>

          <div class="modal-buttons">
            <button type="button" class="btn primary" onclick="document.getElementById('dish-detail-modal').remove()">Chiudi</button>
          </div>
        </section>
      </div>
    `;

    document.body.insertAdjacentHTML("beforeend", modalHtml);
  }

  // Setup Event Listeners
  function setupEventListeners() {
    const searchInput = document.getElementById("search-input");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        searchQuery = e.target.value;
        renderDishesSection(menuData.categories, menuData.dishes);
      });
    }

    // Chips dietetici
    document.querySelectorAll(".diet-chip, .chip-btn").forEach(chip => {
      chip.addEventListener("click", () => {
        document.querySelectorAll(".diet-chip, .chip-btn").forEach(c => c.classList.remove("active"));
        chip.classList.add("active");
        activeDietFilter = chip.getAttribute("data-diet");
        renderDishesSection(menuData.categories, menuData.dishes);
      });
    });
  }

  // Utility escape HTML
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
    openDishModal: openDishModal,
    resetFilters: function () {
      searchQuery = "";
      activeDietFilter = "all";
      const s = document.getElementById("search-input");
      if (s) s.value = "";
      document.querySelectorAll(".diet-chip, .chip-btn").forEach((c, i) => {
        if (i === 0) c.classList.add("active");
        else c.classList.remove("active");
      });
      renderPublicMenu();
    }
  };

  // Avvio al caricamento del DOM
  document.addEventListener("DOMContentLoaded", initApp);
})();
