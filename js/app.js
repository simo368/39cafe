/**
 * 39 CAFÉ & BISTROT - CONTROLLER MENÙ CLIENTI
 * Accordion animato, ricerca, filtri dietetici, modale piatto, sync in tempo reale.
 */

(function () {
  let menuData = null;
  let activeDietFilter = "all"; // 'all', 'veg', 'vegan', 'glutenFree'
  let searchQuery = "";
  let openCats = null; // Set degli id categoria aperti (null = non ancora inizializzato)

  const DIET_LABELS = { veg: "Vegetariano", vegan: "Vegano", glutenFree: "Senza glutine" };

  function formatEuro(price) {
    return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(Number(price) || 0);
  }

  function showToast(text, duration = 2800) {
    const old = document.querySelector(".toast");
    if (old) old.remove();
    const e = document.createElement("div");
    e.className = "toast";
    e.textContent = text;
    document.body.appendChild(e);
    setTimeout(() => e.remove(), duration);
  }
  window.showToast = showToast;

  function initApp() {
    menuData = window.SyncEngine.init({
      onUpdate: (updatedData, source) => {
        menuData = updatedData;
        renderPublicMenu();
        if (source === "remote") showToast("Menù aggiornato", 2200);
        if (window.AdminApp && typeof window.AdminApp.onDataUpdated === "function") {
          window.AdminApp.onDataUpdated(updatedData);
        }
      },
      onStatus: (status) => updateLiveIndicator(status)
    });

    renderPublicMenu();
    setupEventListeners();
  }

  function updateLiveIndicator(status) {
    const dot = document.getElementById("live-dot");
    const text = document.getElementById("live-status-text");
    if (!dot || !text) return;

    dot.className = "live-dot";
    if (status === "online") {
      dot.classList.add("online");
      text.textContent = "In diretta";
    } else if (status === "syncing") {
      dot.classList.add("syncing");
      text.textContent = "Aggiornamento…";
    } else {
      dot.classList.add("offline");
      text.textContent = "Offline";
    }
  }

  function renderPublicMenu() {
    const root = document.getElementById("public-menu-container");
    if (!root) return;

    const { restaurant, categories, dishes } = menuData;

    const set = (id, fn) => { const el = document.getElementById(id); if (el) fn(el); };

    set("brand-hero-title", el => el.textContent = restaurant.name);
    set("brand-hero-subtitle", el => el.textContent = restaurant.subtitle || "");
    set("brand-logo-mark", el => el.textContent = restaurant.logo || "39");
    set("brand-address-text", el => el.textContent = restaurant.address || "");
    set("brand-wifi-text", el => el.textContent = restaurant.wifi ? `Wi-Fi ${restaurant.wifi}` : "");

    const photoWrap = document.getElementById("brand-photo-wrap");
    const heroImg = document.getElementById("brand-hero-img");
    if (heroImg && photoWrap) {
      if (restaurant.photo) {
        if (heroImg.getAttribute("src") !== restaurant.photo) heroImg.src = restaurant.photo;
        photoWrap.style.display = "";
      } else {
        photoWrap.style.display = "none";
      }
    }

    renderDishesSection(categories, dishes);
  }

  function renderDishesSection(categories, dishes) {
    const listContainer = document.getElementById("categories-content-container");
    if (!listContainer) return;

    const query = searchQuery.trim().toLowerCase();
    const filtering = Boolean(query) || activeDietFilter !== "all";
    const sortedCats = [...categories].sort((a, b) => a.order - b.order);

    // Alla prima visualizzazione tutte le categorie sono chiuse
    if (openCats === null) {
      openCats = new Set();
    }

    let html = "";
    let totalVisible = 0;

    sortedCats.forEach(cat => {
      let catDishes = dishes.filter(d => d.categoryId === cat.id);

      if (query) {
        catDishes = catDishes.filter(d =>
          (d.name && d.name.toLowerCase().includes(query)) ||
          (d.description && d.description.toLowerCase().includes(query)) ||
          (d.allergens && d.allergens.toLowerCase().includes(query))
        );
      }

      if (activeDietFilter !== "all") {
        catDishes = catDishes.filter(d => Array.isArray(d.dietary) && d.dietary.includes(activeDietFilter));
      }

      if (catDishes.length === 0 && filtering) return;

      totalVisible += catDishes.length;
      const isOpen = filtering || openCats.has(cat.id);

      html += `
        <section class="category ${isOpen ? "open" : ""}" id="cat-${escapeHtml(cat.id)}" data-cat="${escapeHtml(cat.id)}">
          <button class="category-head" type="button" aria-expanded="${isOpen}">
            <span class="cat-name">${escapeHtml(cat.name)}</span>
            <span class="cat-count">${catDishes.length}</span>
            <span class="chevron" aria-hidden="true"></span>
          </button>
          <div class="category-panel">
            <div class="category-inner">
              <div class="category-body">
                ${cat.description ? `<p class="category-desc">${escapeHtml(cat.description)}</p>` : ""}
                ${catDishes.length > 0
                  ? catDishes.map((dish, i) => renderDish(dish, i)).join("")
                  : `<div class="empty">Nessun piatto disponibile al momento.</div>`}
              </div>
            </div>
          </div>
        </section>
      `;
    });

    if (totalVisible === 0) {
      html = `
        <div class="empty">
          Nessun risultato per i criteri selezionati.<br />
          <button class="btn sm" type="button" onclick="window.App.resetFilters()">Azzera i filtri</button>
        </div>
      `;
    }

    listContainer.innerHTML = html;
  }

  function renderDish(dish, index) {
    const isSoldOut = !dish.available;
    const diet = (Array.isArray(dish.dietary) ? dish.dietary : [])
      .map(k => DIET_LABELS[k]).filter(Boolean);

    const meta = [];
    if (diet.length) meta.push(`<span>${diet.join(" · ")}</span>`);
    if (dish.allergens && dish.allergens.toLowerCase() !== "nessuno") {
      meta.push(`<span>Allergeni: ${escapeHtml(dish.allergens)}</span>`);
    }

    return `
      <article class="dish ${isSoldOut ? "unavailable" : ""}" id="dish-${escapeHtml(dish.id)}" style="--i:${index}">
        <div>
          <h3>
            <span class="name">${escapeHtml(dish.name)}</span>
            ${dish.badge ? `<span class="dish-badge">${escapeHtml(dish.badge)}</span>` : ""}
            ${isSoldOut ? `<span class="sold">Esaurito</span>` : ""}
          </h3>
          ${dish.description ? `<p>${escapeHtml(dish.description)}</p>` : ""}
          <div class="dish-meta">
            <span class="price">${formatEuro(dish.price)}</span>
            ${meta.join("")}
          </div>
        </div>
        ${dish.image ? `
          <button class="dish-photo" type="button" data-dish="${escapeHtml(dish.id)}" aria-label="Apri ${escapeHtml(dish.name)}">
            <img loading="lazy" src="${escapeHtml(dish.image)}" alt="" onerror="this.closest('.dish-photo').style.display='none'" />
          </button>
        ` : ""}
      </article>
    `;
  }

  function closeModal() {
    const m = document.getElementById("dish-detail-modal");
    if (m) m.remove();
  }

  function openDishModal(dishId) {
    const dish = menuData.dishes.find(d => d.id === dishId);
    if (!dish) return;
    closeModal();

    const diet = (Array.isArray(dish.dietary) ? dish.dietary : []).map(k => DIET_LABELS[k]).filter(Boolean);
    const notes = [];
    if (diet.length) notes.push(diet.join(" · "));
    notes.push(dish.allergens ? `Allergeni: ${escapeHtml(dish.allergens)}` : "Nessun allergene dichiarato");

    document.body.insertAdjacentHTML("beforeend", `
      <div class="modal-bg" id="dish-detail-modal">
        <section class="modal" role="dialog" aria-modal="true" aria-label="${escapeHtml(dish.name)}">
          ${dish.image ? `<div class="modal-photo"><img src="${escapeHtml(dish.image)}" alt="${escapeHtml(dish.name)}" /></div>` : ""}
          <div class="modal-title">
            <h2>${escapeHtml(dish.name)}</h2>
            <span class="price">${formatEuro(dish.price)}</span>
          </div>
          ${dish.badge ? `<span class="dish-badge">${escapeHtml(dish.badge)}</span>` : ""}
          ${dish.description ? `<p class="modal-text">${escapeHtml(dish.description)}</p>` : ""}
          <div class="modal-note">${notes.join("<br />")}</div>
          <div class="modal-actions">
            <span class="spacer"></span>
            <button type="button" class="btn primary" data-close>Chiudi</button>
          </div>
        </section>
      </div>
    `);

    const modal = document.getElementById("dish-detail-modal");
    modal.addEventListener("click", (e) => {
      if (e.target === modal || e.target.hasAttribute("data-close")) closeModal();
    });
  }

  function toggleCategory(section) {
    const id = section.getAttribute("data-cat");
    const willOpen = !section.classList.contains("open");
    section.classList.toggle("open", willOpen);
    section.querySelector(".category-head").setAttribute("aria-expanded", String(willOpen));
    if (willOpen) openCats.add(id); else openCats.delete(id);
  }

  function setupEventListeners() {
    const searchInput = document.getElementById("search-input");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        searchQuery = e.target.value;
        renderDishesSection(menuData.categories, menuData.dishes);
      });
    }

    document.querySelectorAll(".chip").forEach(chip => {
      chip.addEventListener("click", () => {
        document.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
        chip.classList.add("active");
        activeDietFilter = chip.getAttribute("data-diet");
        renderDishesSection(menuData.categories, menuData.dishes);
      });
    });

    // Delegazione: apertura categorie e foto piatti
    const list = document.getElementById("categories-content-container");
    if (list) {
      list.addEventListener("click", (e) => {
        const head = e.target.closest(".category-head");
        if (head) {
          toggleCategory(head.closest(".category"));
          return;
        }
        const photo = e.target.closest(".dish-photo");
        if (photo) openDishModal(photo.getAttribute("data-dish"));
      });
    }

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeModal();
    });
  }

  function escapeHtml(str) {
    return String(str ?? "").replace(/[&<>"']/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  window.App = {
    init: initApp,
    openDishModal: openDishModal,
    resetFilters: function () {
      searchQuery = "";
      activeDietFilter = "all";
      const s = document.getElementById("search-input");
      if (s) s.value = "";
      document.querySelectorAll(".chip").forEach((c, i) => c.classList.toggle("active", i === 0));
      renderPublicMenu();
    }
  };

  document.addEventListener("DOMContentLoaded", initApp);
})();
