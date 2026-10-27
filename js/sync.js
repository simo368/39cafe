/**
 * 39 CAFÉ & BISTROT - REAL-TIME ONLINE SYNC ENGINE
 * Architettura multi-livello per sincronizzazione istantanea cross-device (PC <-> Telefono):
 * - Livello 1: LocalStorage (0ms, rendering istantaneo, offline-ready)
 * - Livello 2: BroadcastChannel (sincronizzazione istantanea multi-tab locale)
 * - Livello 3: Server-Sent Events (SSE) Cloud Channel su ntfy.sh (Cross-Device 4G/5G/Wi-Fi <100ms con message replay)
 * - Livello 4: Supporto Firebase Realtime Database nativo (REST + EventSource stream continuo)
 */

(function () {
  const STORAGE_KEY = "cafe39_menu_data_v2";
  const BROADCAST_KEY = "cafe39_broadcast_sync";
  const DEFAULT_CLOUD_CHANNEL = "cafe39_menu_realtime_stream";

  let currentData = null;
  let broadcastChannel = null;
  let ntfyEventSource = null;
  let firebaseEventSource = null;
  let isOnline = navigator.onLine;
  let syncStatus = "connecting"; // 'online', 'syncing', 'offline'
  let onUpdateCallback = null;
  let onStatusCallback = null;
  let lastTimestamp = 0;

  // Carica i dati salvati o il seed iniziale
  function loadInitialData() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.restaurant && Array.isArray(parsed.categories) && Array.isArray(parsed.dishes)) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn("[Sync] Errore lettura localStorage:", e);
    }
    return structuredClone(window.SEED_DATA);
  }

  // Salva in localStorage con timestamp
  function saveToLocal(data, skipBroadcast = false) {
    try {
      data._lastModified = Date.now();
      lastTimestamp = data._lastModified;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      currentData = data;

      if (!skipBroadcast && broadcastChannel) {
        broadcastChannel.postMessage({
          type: "FULL_UPDATE",
          timestamp: lastTimestamp,
          data: currentData
        });
      }
    } catch (e) {
      console.error("[Sync] Errore salvataggio locale:", e);
    }
  }

  // Notifica lo stato di connessione all'interfaccia
  function notifyStatus(status, message) {
    syncStatus = status;
    if (typeof onStatusCallback === "function") {
      onStatusCallback(status, message);
    }
  }

  // Avvia il listener BroadcastChannel (stesso browser, schede diverse)
  function initBroadcastChannel() {
    try {
      if ("BroadcastChannel" in window) {
        broadcastChannel = new BroadcastChannel(BROADCAST_KEY);
        broadcastChannel.onmessage = (event) => {
          if (!event.data) return;
          const { type, data, timestamp, action } = event.data;

          if (type === "FULL_UPDATE" && data && timestamp > (currentData._lastModified || 0)) {
            currentData = data;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(currentData));
            if (onUpdateCallback) onUpdateCallback(currentData, "broadcast");
          } else if (type === "ACTION" && action) {
            applyAction(action, false);
          }
        };
      }
    } catch (e) {
      console.warn("[Sync] BroadcastChannel non supportato:", e);
    }
  }

  // Connessione Server-Sent Events (SSE) per sincronizzazione cloud tra dispositivi (telefono <-> computer)
  function initCloudSSE() {
    const channelId = (currentData && currentData.restaurant && currentData.restaurant.syncChannel) || DEFAULT_CLOUD_CHANNEL;
    const sseUrl = `https://ntfy.sh/${encodeURIComponent(channelId)}/sse`;

    if (ntfyEventSource) {
      try { ntfyEventSource.close(); } catch (_) {}
    }

    notifyStatus("syncing", "Connessione Cloud Real-Time…");

    try {
      ntfyEventSource = new EventSource(sseUrl);

      ntfyEventSource.onopen = () => {
        notifyStatus("online", "Online Live");
        // Verifica messaggi recenti su ntfy
        pollLatestCloudUpdate();
      };

      ntfyEventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload && payload.event === "message" && payload.message) {
            let actionData;
            try {
              actionData = JSON.parse(payload.message);
            } catch {
              return;
            }

            if (actionData && actionData.senderId !== window.__CLIENT_SESSION_ID__) {
              handleRemoteAction(actionData);
            }
          }
        } catch (err) {
          console.warn("[Sync] Errore elaborazione evento SSE:", err);
        }
      };

      ntfyEventSource.onerror = () => {
        notifyStatus("offline", "Riconnessione cloud…");
      };
    } catch (e) {
      console.error("[Sync] Errore inizializzazione SSE:", e);
      notifyStatus("offline", "Sincronizzazione offline");
    }

    // Se Firebase è configurato, connetti anche il sync Firebase
    if (currentData && currentData.restaurant && currentData.restaurant.firebaseUrl) {
      initFirebaseSync();
    }
  }

  // Esegue un poll dei messaggi recenti su ntfy per recuperare modifiche fatte prima che questo dispositivo si connettesse
  async function pollLatestCloudUpdate() {
    const channelId = (currentData && currentData.restaurant && currentData.restaurant.syncChannel) || DEFAULT_CLOUD_CHANNEL;
    try {
      // Prende tutti i messaggi recenti conservati nel canale
      const res = await fetch(`https://ntfy.sh/${encodeURIComponent(channelId)}/json?poll=1`);
      if (!res.ok) return;
      const text = await res.text();
      const lines = text.trim().split("\n");
      for (const line of lines) {
        if (!line) continue;
        try {
          const item = JSON.parse(line);
          if (item.event === "message" && item.message) {
            const actionData = JSON.parse(item.message);
            if (actionData && actionData.senderId !== window.__CLIENT_SESSION_ID__) {
              handleRemoteAction(actionData);
            }
          }
        } catch (_) {}
      }
    } catch (err) {
      // Fallback silenzioso
    }
  }

  // Connessione diretta a Firebase Realtime Database (se URL inserito)
  async function initFirebaseSync() {
    const firebaseUrl = currentData.restaurant && currentData.restaurant.firebaseUrl;
    if (!firebaseUrl) return;

    const fbBase = firebaseUrl.replace(/\/+$/, "");
    const fbEndpoint = `${fbBase}/menu.json`;

    // 1. Download iniziale stato più recente da Firebase
    try {
      const res = await fetch(fbEndpoint);
      if (res.ok) {
        const fbData = await res.json();
        if (fbData && fbData.restaurant && Array.isArray(fbData.dishes)) {
          if (!currentData._lastModified || (fbData._lastModified && fbData._lastModified >= currentData._lastModified)) {
            currentData = fbData;
            saveToLocal(currentData, false);
            if (onUpdateCallback) onUpdateCallback(currentData, "firebase");
            notifyStatus("online", "Sincronizzato con Firebase");
          }
        }
      }
    } catch (err) {
      console.warn("[Firebase] Errore lettura iniziale:", err);
    }

    // 2. Stream Realtime EventSource di Firebase
    if (firebaseEventSource) {
      try { firebaseEventSource.close(); } catch (_) {}
    }

    try {
      firebaseEventSource = new EventSource(fbEndpoint);
      firebaseEventSource.addEventListener("put", (e) => {
        try {
          const res = JSON.parse(e.data);
          if (res && res.data) {
            const updated = res.path === "/" ? res.data : null;
            if (updated && updated.restaurant && Array.isArray(updated.dishes)) {
              if (updated.senderId !== window.__CLIENT_SESSION_ID__) {
                currentData = updated;
                saveToLocal(currentData, false);
                if (onUpdateCallback) onUpdateCallback(currentData, "remote");
                notifyStatus("online", "Online Live (Firebase)");
              }
            }
          }
        } catch (_) {}
      });
    } catch (e) {
      console.warn("[Firebase SSE]", e);
    }
  }

  // Gestisce un'azione ricevuta dal cloud da un altro dispositivo
  function handleRemoteAction(actionData) {
    if (!actionData || !actionData.type) return;

    if (actionData.timestamp && actionData.timestamp <= (currentData._lastModified || 0) && actionData.type === "FULL_UPDATE") {
      return; // Già aggiornato
    }

    applyAction(actionData, false);
    notifyStatus("online", "Online Live");
  }

  // Pubblica un'azione o modifica al canale cloud (e a Firebase se configurato)
  async function publishToCloud(actionData) {
    actionData.senderId = window.__CLIENT_SESSION_ID__;
    actionData.timestamp = Date.now();

    const channelId = (currentData && currentData.restaurant && currentData.restaurant.syncChannel) || DEFAULT_CLOUD_CHANNEL;
    const postUrl = `https://ntfy.sh/${encodeURIComponent(channelId)}`;

    // Invia al BroadcastChannel locale
    if (broadcastChannel) {
      try {
        broadcastChannel.postMessage({
          type: "ACTION",
          action: actionData
        });
      } catch (_) {}
    }

    // Invia al Cloud SSE topic (ricevuto in <100ms da smartphone e altri pc)
    try {
      fetch(postUrl, {
        method: "POST",
        headers: { "Title": "39Cafe_Live" },
        body: JSON.stringify(actionData)
      }).catch(err => console.warn("[Sync Cloud POST error]:", err));
    } catch (e) {
      console.warn("[Sync fetch failed]:", e);
    }

    // Supporto per Firebase se configurato
    if (currentData && currentData.restaurant && currentData.restaurant.firebaseUrl) {
      try {
        const fbUrl = currentData.restaurant.firebaseUrl.replace(/\/+$/, "") + "/menu.json";
        const fbPayload = {
          ...currentData,
          senderId: window.__CLIENT_SESSION_ID__,
          _lastModified: Date.now()
        };
        fetch(fbUrl, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(fbPayload)
        }).catch(err => console.warn("[Firebase sync error]:", err));
      } catch (_) {}
    }
  }

  // Applica una mutazione atomica ai dati locali e aggiorna la UI
  function applyAction(action, shouldBroadcast = true) {
    let modified = false;

    switch (action.type) {
      case "TOGGLE_AVAILABILITY": {
        const dish = currentData.dishes.find(d => d.id === action.dishId);
        if (dish) {
          dish.available = typeof action.available === "boolean" ? action.available : !dish.available;
          modified = true;
        }
        break;
      }
      case "UPDATE_PRICE": {
        const dish = currentData.dishes.find(d => d.id === action.dishId);
        if (dish) {
          dish.price = Number(action.price);
          modified = true;
        }
        break;
      }
      case "SAVE_DISH": {
        const idx = currentData.dishes.findIndex(d => d.id === action.dish.id);
        if (idx >= 0) {
          currentData.dishes[idx] = { ...currentData.dishes[idx], ...action.dish };
        } else {
          currentData.dishes.push(action.dish);
        }
        modified = true;
        break;
      }
      case "DELETE_DISH": {
        currentData.dishes = currentData.dishes.filter(d => d.id !== action.dishId);
        modified = true;
        break;
      }
      case "SAVE_CATEGORY": {
        const idx = currentData.categories.findIndex(c => c.id === action.category.id);
        if (idx >= 0) {
          currentData.categories[idx] = { ...currentData.categories[idx], ...action.category };
        } else {
          currentData.categories.push(action.category);
        }
        currentData.categories.sort((a, b) => a.order - b.order);
        modified = true;
        break;
      }
      case "DELETE_CATEGORY": {
        currentData.categories = currentData.categories.filter(c => c.id !== action.categoryId);
        currentData.dishes = currentData.dishes.filter(d => d.categoryId !== action.categoryId);
        modified = true;
        break;
      }
      case "REORDER_CATEGORIES": {
        if (Array.isArray(action.categories)) {
          currentData.categories = action.categories;
          modified = true;
        }
        break;
      }
      case "UPDATE_RESTAURANT": {
        currentData.restaurant = { ...currentData.restaurant, ...action.restaurant };
        modified = true;
        break;
      }
      case "FULL_UPDATE": {
        if (action.data && action.data.restaurant) {
          currentData = action.data;
          modified = true;
        }
        break;
      }
      default:
        console.warn("[Sync] Tipo azione non riconosciuto:", action.type);
    }

    if (modified) {
      saveToLocal(currentData, true);
      if (onUpdateCallback) {
        onUpdateCallback(currentData, shouldBroadcast ? "local" : "remote");
      }
      if (shouldBroadcast) {
        publishToCloud(action);
      }
    }
  }

  // ID univoco sessione per non processare i propri messaggi di rimbalzo
  window.__CLIENT_SESSION_ID__ = "client_" + Math.random().toString(36).slice(2, 10);

  // API Pubblica SyncEngine
  const SyncEngine = {
    init: function (options = {}) {
      onUpdateCallback = options.onUpdate || null;
      onStatusCallback = options.onStatus || null;

      currentData = loadInitialData();
      lastTimestamp = currentData._lastModified || Date.now();

      initBroadcastChannel();
      initCloudSSE();

      window.addEventListener("online", () => {
        isOnline = true;
        initCloudSSE();
      });

      window.addEventListener("offline", () => {
        isOnline = false;
        notifyStatus("offline", "Dispositivo Offline (Dati locali pronti)");
      });

      return currentData;
    },

    getData: function () {
      if (!currentData) currentData = loadInitialData();
      return currentData;
    },

    getStatus: function () {
      return {
        status: syncStatus,
        isOnline: isOnline,
        channel: (currentData && currentData.restaurant && currentData.restaurant.syncChannel) || DEFAULT_CLOUD_CHANNEL,
        firebaseUrl: (currentData && currentData.restaurant && currentData.restaurant.firebaseUrl) || "",
        lastModified: lastTimestamp
      };
    },

    // Azione atomica: toggle disponibilità (1 tocco)
    toggleAvailability: function (dishId) {
      const dish = currentData.dishes.find(d => d.id === dishId);
      if (!dish) return;
      applyAction({
        type: "TOGGLE_AVAILABILITY",
        dishId: dishId,
        available: !dish.available
      }, true);
    },

    // Azione atomica: modifica prezzo
    updateDishPrice: function (dishId, newPrice) {
      applyAction({
        type: "UPDATE_PRICE",
        dishId: dishId,
        price: Number(newPrice)
      }, true);
    },

    // Azione atomica: salva/modifica piatto
    saveDish: function (dishData) {
      applyAction({
        type: "SAVE_DISH",
        dish: dishData
      }, true);
    },

    // Azione atomica: elimina piatto
    deleteDish: function (dishId) {
      applyAction({
        type: "DELETE_DISH",
        dishId: dishId
      }, true);
    },

    // Azione atomica: salva/modifica categoria
    saveCategory: function (catData) {
      applyAction({
        type: "SAVE_CATEGORY",
        category: catData
      }, true);
    },

    // Azione atomica: elimina categoria
    deleteCategory: function (catId) {
      applyAction({
        type: "DELETE_CATEGORY",
        categoryId: catId
      }, true);
    },

    // Azione atomica: riordina categorie
    reorderCategories: function (categoriesList) {
      applyAction({
        type: "REORDER_CATEGORIES",
        categories: categoriesList
      }, true);
    },

    // Azione atomica: info ristorante
    updateRestaurantInfo: function (info) {
      applyAction({
        type: "UPDATE_RESTAURANT",
        restaurant: info
      }, true);
      // Se il canale o l'URL Firebase è cambiato, riconnetti
      if (info.syncChannel || info.firebaseUrl !== undefined) {
        initCloudSSE();
      }
    },

    // Test connessione Firebase
    testFirebaseConnection: async function (url) {
      if (!url) return { success: false, error: "Inserisci l'URL del tuo database Firebase." };
      const endpoint = url.replace(/\/+$/, "") + "/menu.json";
      try {
        const res = await fetch(endpoint, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...currentData,
            _testPing: Date.now()
          })
        });
        if (res.ok) {
          return { success: true };
        } else {
          return { success: false, error: `Risposta Firebase: ${res.status} ${res.statusText}. Verifica le Regole del database.` };
        }
      } catch (err) {
        return { success: false, error: `Errore di rete: ${err.message}` };
      }
    },

    // Esportazione JSON
    exportJSON: function () {
      return JSON.stringify(currentData, null, 2);
    },

    // Importazione JSON completo
    importJSON: function (jsonStr) {
      try {
        const parsed = JSON.parse(jsonStr);
        if (parsed && parsed.restaurant && Array.isArray(parsed.categories) && Array.isArray(parsed.dishes)) {
          applyAction({
            type: "FULL_UPDATE",
            data: parsed
          }, true);
          return { success: true };
        } else {
          return { success: false, error: "Formato JSON non conforme al modello del menù." };
        }
      } catch (err) {
        return { success: false, error: "JSON non valido: " + err.message };
      }
    },

    // Reset ai dati di fabbrica (Seed iniziale)
    resetToSeed: function () {
      applyAction({
        type: "FULL_UPDATE",
        data: structuredClone(window.SEED_DATA)
      }, true);
    },

    // Forza sincronizzazione cloud
    forceCloudSync: function () {
      initCloudSSE();
      publishToCloud({
        type: "FULL_UPDATE",
        data: currentData
      });
    }
  };

  window.SyncEngine = SyncEngine;
})();
