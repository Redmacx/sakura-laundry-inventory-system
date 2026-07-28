// ==========================================
// STATIC GITHUB PAGES MOCK FETCH
// ==========================================
const originalFetch = window.fetch;

// Initial Mock Data
let db = {
    inventory: [],
    orders: [],
    customers: [
        { id: 1, name: "Walk-in Customer", phone: "", email: "", address: "" }
    ],
    notifications: [],
    activities: []
};

// Load from LocalStorage
const savedDb = localStorage.getItem('sakura_db');
if (savedDb) {
    db = JSON.parse(savedDb);
}

const saveMockDb = () => localStorage.setItem('sakura_db', JSON.stringify(db));

window.fetch = async (url, options = {}) => {
    // Only intercept /api/ calls
    if (typeof url === 'string' && url.includes('api/')) {
        const method = options.method || 'GET';
        let body = {};
        if (options.body) {
            body = JSON.parse(options.body);
        }

        const createResponse = (data, status = 200) => {
            return Promise.resolve(new Response(JSON.stringify(data), {
                status,
                headers: { 'Content-Type': 'application/json' }
            }));
        };

        // Auth
        if (url.includes('auth.php')) {
            if (method === 'POST') {
                if (body.username === 'admin' && body.password === 'admin123') {
                    localStorage.setItem('sakura_user', 'admin');
                    return createResponse({ success: true, message: 'Logged in', user: { name: 'System Admin', role: 'Admin' } });
                }
                return createResponse({ error: 'Invalid credentials' }, 401);
            }
        }

        if (url.includes('auth.php?action=me')) {
            if (localStorage.getItem('sakura_user')) {
                return createResponse({ loggedIn: true, user: { name: 'System Admin', role: 'Admin' }});
            }
            return createResponse({ loggedIn: false });
        }

        // Data Bulk Fetch
        if (url.includes('data.php') && method === 'GET') {
            return createResponse({
                inventory: db.inventory,
                orders: db.orders,
                customers: db.customers,
                notifications: db.notifications,
                activities: db.activities
            });
        }

        // POST/PUT/DELETE generic handling
        if (url.includes('inventory.php')) {
            if (method === 'POST') {
                const item = { ...body, id: Date.now() };
                db.inventory.push(item);
                saveMockDb();
                return createResponse({ success: true, id: item.id });
            }
            if (method === 'PUT') {
                const index = db.inventory.findIndex(i => i.id == body.id);
                if (index !== -1) db.inventory[index] = { ...db.inventory[index], ...body };
                saveMockDb();
                return createResponse({ success: true });
            }
            if (method === 'DELETE') {
                db.inventory = db.inventory.filter(i => i.id != body.id);
                saveMockDb();
                return createResponse({ success: true });
            }
        }

        if (url.includes('orders.php')) {
            if (method === 'POST') {
                const item = { ...body, id: Date.now() };
                db.orders.push(item);
                saveMockDb();
                return createResponse({ success: true, id: item.id });
            }
            if (method === 'PUT') {
                const index = db.orders.findIndex(i => i.id == body.id);
                if (index !== -1) db.orders[index] = { ...db.orders[index], ...body };
                saveMockDb();
                return createResponse({ success: true });
            }
        }

        if (url.includes('customers.php')) {
            if (method === 'POST') {
                const item = { ...body, id: Date.now() };
                db.customers.push(item);
                saveMockDb();
                return createResponse({ success: true, id: item.id });
            }
        }
        
        return createResponse({ error: 'Not found' }, 404);
    }

    return originalFetch(url, options);
};

// ==========================================
// END STATIC MOCK FETCH
// ==========================================

/* ==========================================================================
   SAKURA LAUNDRY INVENTORY SYSTEM - APP.JS
   ========================================================================== */

// --- INITIAL STATE / DATA LAYER (SQLITE REST API) ---
let inventory = [];
let orders = [];
let users = [];
let customers = [];
let notifications = [];
let activities = [];

const API_URL = 'api';

async function loadDataFromAPI() {
    try {
        const response = await fetch(`${API_URL}/data.php`);
        const data = await response.json();
        inventory = data.inventory || [];
        orders = data.orders || [];
        users = data.users || [];
        customers = data.customers || [];
    } catch (err) {
        console.error("Failed to load DB from server:", err);
    }
}

// Compat shim for old local storage save structure.
// This now posts to the SQLite backend.
async function saveDb(key, value) {
    const entity = key.replace("sakura_", ""); // 'inventory', 'orders', etc
    try {
        await fetch(`${API_URL}/${entity}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(value)
        });
    } catch (err) {
        console.error(`Error saving ${entity} to server:`, err);
    }
}

// --- GLOBAL APP STATE ---
const state = {
    activeTab: "dashboard",
    inspectedItem: null,
    editingItemId: null,
    editingOrderId: null,
    editingUserId: null,
    currentDragOrderId: null
};

// --- DOM ELEMENTS REFERENCE ---
const DOM = {
    toastContainer: document.getElementById("toast-container"),
    navItems: document.querySelectorAll(".nav-item"),
    tabPanes: document.querySelectorAll(".tab-pane"),
    pageTitle: document.getElementById("page-title"),
    pageSubtitle: document.getElementById("page-subtitle"),
    
    // KPI
    kpiTotalItems: document.getElementById("kpi-total-items"),
    kpiActiveOrders: document.getElementById("kpi-active-orders"),
    kpiWashingLabel: document.getElementById("kpi-washing-label"),
    kpiCompletedOrders: document.getElementById("kpi-completed-orders"),
    kpiAlerts: document.getElementById("kpi-alerts"),
    kpiAlertSubtext: document.getElementById("kpi-alert-subtext"),
    
    // Lists & Timelines
    activityLog: document.getElementById("dashboard-activity-log"),
    criticalStock: document.getElementById("dashboard-critical-stock"),
    inventoryTbody: document.getElementById("inventory-tbody"),
    usersTbody: document.getElementById("users-tbody"),
    
    // Search & Filters
    globalSearch: document.getElementById("global-search"),
    inventorySearch: document.getElementById("inventory-search"),
    inventoryCategoryFilter: document.getElementById("inventory-category-filter"),
    inventoryStockFilter: document.getElementById("inventory-stock-filter"),
    trackingSearch: document.getElementById("tracking-search"),
    trackingServiceFilter: document.getElementById("tracking-service-filter"),
    
    // ThreeJS 3D rack
    threeContainer: document.getElementById("three-container"),
    inspectPanel: document.getElementById("inspect-panel"),
    inspectCategory: document.getElementById("inspect-category"),
    inspectName: document.getElementById("inspect-name"),
    inspectId: document.getElementById("inspect-id"),
    inspectStock: document.getElementById("inspect-stock"),
    inspectMinStock: document.getElementById("inspect-min-stock"),
    inspectProgressBar: document.getElementById("inspect-stock-progress-bar"),
    inspectQtyInput: document.getElementById("inspect-quantity-input"),
    inspectMinusBtn: document.getElementById("inspect-minus-btn"),
    inspectPlusBtn: document.getElementById("inspect-plus-btn"),
    saveInspectBtn: document.getElementById("save-inspect-btn"),
    closeInspectBtn: document.getElementById("close-inspect-btn"),
    shelfCategoryFilter: document.getElementById("shelf-category-filter"),

    // Modals
    modalBackdrop: document.getElementById("modal-backdrop"),
    modalInventory: document.getElementById("modal-inventory"),
    modalOrder: document.getElementById("modal-order"),
    modalUser: document.getElementById("modal-user"),
    
    // Buttons
    btnQuickOrder: document.getElementById("btn-quick-order"),
    btnNewOrderTracking: document.getElementById("btn-new-order-tracking"),
    btnAddItem: document.getElementById("btn-add-item"),
    btnAddUser: document.getElementById("btn-add-user"),
    clearActivityLog: document.getElementById("clear-activity-log"),
    
    // Forms
    inventoryForm: document.getElementById("inventory-form"),
    orderForm: document.getElementById("order-form"),
    userForm: document.getElementById("user-form"),
    
    // Notifications Drawer
    notiBellBtn: document.getElementById("notification-bell-btn"),
    notiDropdown: document.getElementById("notification-dropdown"),
    notiList: document.getElementById("notification-list"),
    notiBadge: document.getElementById("bell-badge-count"),
    markAllReadBtn: document.getElementById("mark-all-read-btn")
};

// --- INITIALIZE & ROUTING ---
document.addEventListener("DOMContentLoaded", async () => {
    
    initCharts();
    setupEventListeners();
    await loadDataFromAPI();
    renderApp();
    checkStockLevels();
});

// Switch Tab logic
function switchTab(tabId) {
    state.activeTab = tabId;
    
    DOM.navItems.forEach(item => {
        if (item.dataset.tab === tabId) {
            item.classList.add("active");
        } else {
            item.classList.remove("active");
        }
    });

    DOM.tabPanes.forEach(pane => {
        if (pane.id === `tab-${tabId}`) {
            pane.classList.add("active");
        } else {
            pane.classList.remove("active");
        }
    });

    // Update Header Text
    switch (tabId) {
        case "dashboard":
            DOM.pageTitle.textContent = "Dashboard Overview";
            updateActiveUserBadge();
            break;
        case "3d-shelf":
            DOM.pageTitle.textContent = "3D Interactive Supply Rack";
            DOM.pageSubtitle.textContent = "Click on items to inspect stock levels, scale box size, and restock.";
            break;
        case "inventory":
            DOM.pageTitle.textContent = "Inventory Supplies List";
            DOM.pageSubtitle.textContent = "Standard table view for shop chemicals, hangers, detergents and equipment.";
            break;
        case "tracking":
            DOM.pageTitle.textContent = "Laundry Order Tracking";
            DOM.pageSubtitle.textContent = "Drag and drop laundry cards to progress orders through washing stages.";
            break;
        case "users":
            DOM.pageTitle.textContent = "Staff Accounts & Management";
            DOM.pageSubtitle.textContent = "Manage shop operators, permissions and access credentials.";
            break;
    }

    // Refresh charts on tab changes to handle layout triggers
    if (tabId === "dashboard" && window.stockChart && window.orderChart) {
        window.stockChart.resize();
        window.orderChart.resize();
    }
    
    // Fix: Force resize event so Three.js canvas correctly sizes itself after display:none is removed
    if (tabId === "3d-shelf") {
        setTimeout(() => window.dispatchEvent(new Event("resize")), 10);
    }
}

// --- DRAG & DROP FOR KANBAN ---
function setupDragAndDrop() {
    const kanbanColumns = document.querySelectorAll(".kanban-cards-container");
    
    kanbanColumns.forEach(col => {
        col.addEventListener("dragover", (e) => {
            e.preventDefault();
            col.classList.add("drag-over");
        });

        col.addEventListener("dragleave", () => {
            col.classList.remove("drag-over");
        });

        col.addEventListener("drop", (e) => {
            e.preventDefault();
            col.classList.remove("drag-over");
            const newStatus = col.dataset.status;
            const orderId = state.currentDragOrderId;
            if (orderId && newStatus) {
                updateOrderStatus(orderId, newStatus);
            }
        });
    });
}

function updateOrderStatus(orderId, status) {
    const orderIndex = orders.findIndex(o => o.id === orderId);
    if (orderIndex !== -1) {
        const oldStatus = orders[orderIndex].status;
        if (oldStatus !== status) {
            orders[orderIndex].status = status;
            saveDb("sakura_orders", orders);
            
            // Add activity log
            addActivityLog(`Order #${orderId} for ${orders[orderIndex].customer} moved to ${status}`, "green");
            
            // Create notification if complete
            if (status === "Ready") {
                addNotification(`Order #${orderId} is Ready`, `Laundry for ${orders[orderIndex].customer} is washed & dried.`, "success");
            }

            createToast(`Status Updated`, `${orders[orderIndex].customer}'s laundry is now: ${status}`, "success");
            renderApp();
        }
    }
}

// --- CRUD OPERATIONS ---

// Add Activity Log
function addActivityLog(text, color = "blue") {
    activities.unshift({ text, time: "Just now", color });
    if (activities.length > 20) activities.pop(); // Keep last 20
    saveDb("sakura_activities", activities);
}

// Add Notification
function addNotification(title, desc, type = "info") {
    notifications.unshift({
        id: "noti_" + Date.now(),
        title,
        desc,
        type,
        unread: true,
        time: "Just now"
    });
    saveDb("sakura_notifications", notifications);
    renderApp();
}

// Create Notification Toast
function createToast(title, desc, type = "info") {
    const toast = document.createElement("div");
    toast.className = `toast glass`;
    
    let icon = "fa-info-circle text-blue";
    if (type === "success") icon = "fa-check-circle text-green";
    if (type === "warning") icon = "fa-exclamation-triangle text-orange";
    if (type === "danger") icon = "fa-times-circle text-red";

    toast.innerHTML = `
        <div class="noti-icon ${type}"><i class="fa-solid ${icon}"></i></div>
        <div class="toast-content">
            <h4>${title}</h4>
            <p>${desc}</p>
        </div>
    `;
    DOM.toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add("removing");
        setTimeout(() => toast.remove(), 400);
    }, 4500);
}

// Check stock warnings
function checkStockLevels() {
    inventory.forEach(item => {
        if (item.quantity <= item.minStock) {
            // Check if warning already exists in notifications
            const warningExists = notifications.some(n => n.desc.includes(item.name) && n.unread);
            if (!warningExists) {
                addNotification("Low Stock Warning", `${item.name} is running low (${item.quantity} ${item.unit} left).`, "warning");
                createToast("Low Stock Warning", `${item.name} needs restock!`, "warning");
            }
        }
    });
}

// --- MODAL UTILS ---
function openModal(modal) {
    DOM.modalBackdrop.classList.add("active");
    modal.classList.add("active");
}

function closeAllModals() {
    DOM.modalBackdrop.classList.remove("active");
    DOM.modalInventory.classList.remove("active");
    DOM.modalOrder.classList.remove("active");
    DOM.modalUser.classList.remove("active");
    
    // Clear forms
    DOM.inventoryForm.reset();
    DOM.orderForm.reset();
    DOM.userForm.reset();
    
    state.editingItemId = null;
    state.editingOrderId = null;
    state.editingUserId = null;
}

// --- EVENT LISTENERS SETUP ---
function setupEventListeners() {
    // SPA Tabs Click
    DOM.navItems.forEach(item => {
        item.addEventListener("click", (e) => {
            e.preventDefault();
            const tabId = item.dataset.tab;
            switchTab(tabId);
        });
    });

    // Toggle Notifications Dropdown
    DOM.notiBellBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        DOM.notiDropdown.classList.toggle("active");
    });
    
    document.addEventListener("click", () => {
        DOM.notiDropdown.classList.remove("active");
    });

    DOM.notiDropdown.addEventListener("click", (e) => {
        e.stopPropagation();
    });

    DOM.markAllReadBtn.addEventListener("click", () => {
        notifications = [];
        saveDb("sakura_notifications", notifications);
        createToast("Notifications Cleared", "All alerts have been cleared.", "info");
        renderApp();
    });

    // Clear Activity Log
    DOM.clearActivityLog.addEventListener("click", () => {
        activities = [];
        saveDb("sakura_activities", activities);
        renderApp();
    });
    // Quick Order & Add Order Buttons
    const openOrderModal = () => {
        document.getElementById("order-modal-title").textContent = "Add Laundry Order";
        openModal(DOM.modalOrder);
    };
    DOM.btnQuickOrder.addEventListener("click", openOrderModal);
    DOM.btnNewOrderTracking.addEventListener("click", openOrderModal);

    // Add Supply Item Button
    DOM.btnAddItem.addEventListener("click", () => {
        document.getElementById("inventory-modal-title").textContent = "Add Supply Item";
        openModal(DOM.modalInventory);
    });

    // Add User Button
    DOM.btnAddUser.addEventListener("click", () => {
        document.getElementById("user-modal-title").textContent = "Add Staff Account";
        openModal(DOM.modalUser);
    });

    // Inventory form submit
    DOM.inventoryForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const id = document.getElementById("inventory-id-field").value;
        const name = document.getElementById("inv-name").value;
        const category = document.getElementById("inv-category").value;
        const quantity = parseFloat(document.getElementById("inv-quantity").value);
        const capacity = parseFloat(document.getElementById("inv-capacity").value);
        const unit = document.getElementById("inv-unit").value;
        const minStock = parseFloat(document.getElementById("inv-min-alert").value);

        if (state.editingItemId) {
            // Update
            const idx = inventory.findIndex(item => item.id === state.editingItemId);
            if (idx !== -1) {
                inventory[idx] = { id: state.editingItemId, name, category, quantity, capacity, unit, minStock };
                addActivityLog(`Supply item '${name}' updated`, "blue");
                createToast("Item Updated", `Item '${name}' has been updated.`, "success");
            }
        } else {
            // Create
            const newItem = { id: "inv_" + Date.now(), name, category, quantity, capacity, unit, minStock };
            inventory.push(newItem);
            addActivityLog(`New supply item '${name}' added`, "blue");
            createToast("Item Added", `Item '${name}' successfully added.`, "success");
        }
        
        saveDb("sakura_inventory", inventory);
        closeAllModals();
        renderApp();
        checkStockLevels();
         // Re-render the 3D rack
    });

    // Order form submit
    DOM.orderForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const customer = document.getElementById("ord-customer").value;
        const phone = document.getElementById("ord-phone").value;
        const service = document.getElementById("ord-service").value;
        const weight = document.getElementById("ord-weight").value;
        const status = document.getElementById("ord-status").value;
        const price = parseInt(document.getElementById("ord-price").value);
        const notes = document.getElementById("ord-notes").value;

        if (state.editingOrderId) {
            // Update
            const idx = orders.findIndex(o => o.id === state.editingOrderId);
            if (idx !== -1) {
                orders[idx] = { id: state.editingOrderId, customer, phone, service, weight, status, price, notes };
                addActivityLog(`Order #${state.editingOrderId} for ${customer} updated`, "blue");
                createToast("Order Updated", `Order for ${customer} updated.`, "success");
            }
        } else {
            // Create
            const newId = "ord_" + Date.now().toString().slice(-4);
            const newOrder = { id: newId, customer, phone, service, weight, status, price, notes };
            orders.push(newOrder);
            addActivityLog(`New Order #${newId} received for ${customer}`, "blue");
            createToast("Order Placed", `Laundry order #${newId} created.`, "success");
        }

        saveDb("sakura_orders", orders);
        closeAllModals();
        renderApp();
    });

    // User form submit
    DOM.userForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const name = document.getElementById("usr-fullname").value;
        const username = document.getElementById("usr-username").value;
        const email = document.getElementById("usr-email").value;
        const role = document.getElementById("usr-role").value;
        const status = document.getElementById("usr-status").value;
        const seed = document.getElementById("usr-avatar-seed").value || username;

        if (state.editingUserId) {
            // Update
            const idx = users.findIndex(u => u.id === state.editingUserId);
            if (idx !== -1) {
                users[idx] = { id: state.editingUserId, name, username, email, role, status, avatar: seed };
                addActivityLog(`User account for ${name} updated`, "orange");
                createToast("Account Updated", `Staff account for ${name} has been updated.`, "success");
            }
        } else {
            // Create
            const newUser = { id: "usr_" + Date.now(), name, username, email, role, status, avatar: seed };
            users.push(newUser);
            addActivityLog(`Staff account created for ${name} (${role})`, "orange");
            createToast("Account Created", `Staff account for ${name} created.`, "success");
        }

        saveDb("sakura_users", users);
        closeAllModals();
        renderApp();
    });

    // Search and Filters Handlers
    const runSearchFilter = () => renderApp();
    DOM.globalSearch.addEventListener("input", runSearchFilter);
    DOM.inventorySearch.addEventListener("input", runSearchFilter);
    DOM.inventoryCategoryFilter.addEventListener("change", runSearchFilter);
    DOM.inventoryStockFilter.addEventListener("change", runSearchFilter);
    DOM.trackingSearch.addEventListener("input", runSearchFilter);
    DOM.trackingServiceFilter.addEventListener("change", runSearchFilter);

    // 3D Shelf Category filter
    DOM.shelfCategoryFilter.addEventListener("change", () => {
        filterRackItems(DOM.shelfCategoryFilter.value);
    });

    // Close 3D Inspect Panel
    DOM.closeInspectBtn.addEventListener("click", () => {
        DOM.inspectPanel.classList.remove("active");
        state.inspectedItem = null;
    });

    // 3D Stock Quick Adjust Spinners
    DOM.inspectMinusBtn.addEventListener("click", () => {
        let val = parseFloat(DOM.inspectQtyInput.value) || 0;
        if (val > 0) DOM.inspectQtyInput.value = val - 1;
    });
    DOM.inspectPlusBtn.addEventListener("click", () => {
        let val = parseFloat(DOM.inspectQtyInput.value) || 0;
        DOM.inspectQtyInput.value = val + 1;
    });

    // 3D Inspect Panel Save
    DOM.saveInspectBtn.addEventListener("click", () => {
        if (state.inspectedItem) {
            const newQty = parseFloat(DOM.inspectQtyInput.value);
            const idx = inventory.findIndex(item => item.id === state.inspectedItem.id);
            if (idx !== -1 && newQty >= 0) {
                const oldQty = inventory[idx].quantity;
                inventory[idx].quantity = Math.min(newQty, inventory[idx].capacity);
                saveDb("sakura_inventory", inventory);
                
                // Track activity log
                const diff = inventory[idx].quantity - oldQty;
                if (diff !== 0) {
                    addActivityLog(`Adjusted ${inventory[idx].name} stock: ${inventory[idx].quantity} ${inventory[idx].unit} (${diff > 0 ? '+' : ''}${diff})`, "blue");
                    createToast("Stock Adjusted", `Updated stock of ${inventory[idx].name}`, "success");
                }
                
                // Recalculate and scale the visual block in ThreeJS scene
                
                
                // Refresh Panel and Page
                
                renderApp();
                checkStockLevels();
            }
        }
    });
}

// --- RENDER WEB PAGES & SECTIONS ---
function renderApp() {
    renderKPIs();
    renderActivityLog();
    renderCriticalStock();
    renderInventoryTable();
    renderKanbanBoard();
    renderUsersTable();
    updateActiveUserBadge();
    updateChartsData();
}

function updateActiveUserBadge() {
    const userAvatarImg = document.getElementById("user-avatar");
    const userDisplayNameEl = document.getElementById("user-display-name");
    const userRoleEl = document.getElementById("user-role");
    
    const activeUser = users.find(u => u.status === "Active") || users[0];
    
    if (activeUser) {
        if (userAvatarImg) userAvatarImg.src = `https://api.dicebear.com/7.x/adventurer/svg?seed=${activeUser.avatar || activeUser.username}`;
        if (userDisplayNameEl) userDisplayNameEl.textContent = activeUser.name;
        if (userRoleEl) userRoleEl.textContent = activeUser.role;
        
        if (state.activeTab === "dashboard") {
            DOM.pageSubtitle.textContent = `Welcome back, ${activeUser.name}. Here is today's laundry status.`;
        }
    } else {
        if (userAvatarImg) userAvatarImg.src = `https://api.dicebear.com/7.x/adventurer/svg?seed=guest-operator`;
        if (userDisplayNameEl) userDisplayNameEl.textContent = "Guest Staff";
        if (userRoleEl) userRoleEl.textContent = "Operator";
        
        if (state.activeTab === "dashboard") {
            DOM.pageSubtitle.textContent = "Welcome back. Please add a staff account to get started.";
        }
    }
}

function renderKPIs() {
    DOM.kpiTotalItems.textContent = inventory.length;
    
    // Active orders
    const active = orders.filter(o => o.status !== "Delivered").length;
    DOM.kpiActiveOrders.textContent = active;
    
    const washing = orders.filter(o => o.status === "Washing").length;
    DOM.kpiWashingLabel.textContent = `${washing} currently washing`;

    // Completed today
    const ready = orders.filter(o => o.status === "Ready" || o.status === "Delivered").length;
    DOM.kpiCompletedOrders.textContent = ready;

    // Low stock alerts
    const alerts = inventory.filter(item => item.quantity <= item.minStock).length;
    DOM.kpiAlerts.textContent = alerts;
    DOM.kpiAlertSubtext.textContent = alerts > 0 ? `${alerts} items need reorder` : "All systems healthy";
}

function renderActivityLog() {
    DOM.activityLog.innerHTML = "";
    if (activities.length === 0) {
        DOM.activityLog.innerHTML = `<div class="text-muted p-3 text-center">No recent activities logged.</div>`;
        return;
    }
    activities.forEach(act => {
        const node = document.createElement("div");
        node.className = "activity-node";
        node.innerHTML = `
            <div class="activity-dot ${act.color || 'blue'}"></div>
            <div class="activity-content">
                <p>${act.text}</p>
                <span class="activity-time">${act.time}</span>
            </div>
        `;
        DOM.activityLog.appendChild(node);
    });
}

function renderCriticalStock() {
    DOM.criticalStock.innerHTML = "";
    const lowStockItems = inventory.filter(item => item.quantity <= item.minStock);
    
    if (lowStockItems.length === 0) {
        DOM.criticalStock.innerHTML = `
            <div class="text-center p-3 text-muted">
                <i class="fa-solid fa-circle-check text-green mb-2" style="font-size: 24px;"></i>
                <p>Stock levels are optimal!</p>
            </div>
        `;
        return;
    }

    lowStockItems.forEach(item => {
        const itemBox = document.createElement("div");
        itemBox.className = "critical-stock-item";
        itemBox.innerHTML = `
            <div class="critical-details">
                <h4>${item.name}</h4>
                <span>Min Required: ${item.minStock} ${item.unit}</span>
            </div>
            <div class="critical-qty">
                <span class="danger-qty">${item.quantity}</span>
                <span>${item.unit} left</span>
            </div>
        `;
        DOM.criticalStock.appendChild(itemBox);
    });
}

function renderInventoryTable() {
    DOM.inventoryTbody.innerHTML = "";
    
    const searchVal = DOM.inventorySearch.value.toLowerCase();
    const categoryVal = DOM.inventoryCategoryFilter.value;
    const stockVal = DOM.inventoryStockFilter.value;

    const filtered = inventory.filter(item => {
        // Name filter
        const matchName = item.name.toLowerCase().includes(searchVal) || item.category.toLowerCase().includes(searchVal);
        // Category filter
        const matchCategory = (categoryVal === "all") || (item.category === categoryVal);
        // Stock level filter
        let matchStock = true;
        if (stockVal === "low") matchStock = item.quantity <= item.minStock;
        if (stockVal === "in-stock") matchStock = item.quantity > item.minStock;
        if (stockVal === "out") matchStock = item.quantity === 0;

        return matchName && matchCategory && matchStock;
    });

    if (filtered.length === 0) {
        DOM.inventoryTbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted">No supplies found matching filters.</td></tr>`;
        return;
    }

    filtered.forEach(item => {
        const tr = document.createElement("tr");
        
        let badgeClass = "badge-success";
        let statusText = "Healthy";
        if (item.quantity === 0) {
            badgeClass = "badge-danger";
            statusText = "Out of Stock";
        } else if (item.quantity <= item.minStock) {
            badgeClass = "badge-warning";
            statusText = "Low Stock";
        }

        tr.innerHTML = `
            <td><strong>${item.name}</strong></td>
            <td><span class="badge badge-blue">${item.category}</span></td>
            <td>${item.quantity} ${item.unit}</td>
            <td>${item.capacity} ${item.unit}</td>
            <td>${item.minStock} ${item.unit}</td>
            <td><span class="badge ${badgeClass}">${statusText}</span></td>
            <td class="text-right">
                <div class="actions-cell">
                    <button class="btn-icon" onclick="editInventoryItem('${item.id}')" title="Edit Item"><i class="fa-solid fa-pencil"></i></button>
                    <button class="btn-icon" onclick="deleteInventoryItem('${item.id}')" title="Delete Item"><i class="fa-solid fa-trash"></i></button>
                </div>
            </td>
        `;
        DOM.inventoryTbody.appendChild(tr);
    });
}

function renderKanbanBoard() {
    // Clear all columns
    const containers = {
        Received: document.getElementById("cards-received"),
        Washing: document.getElementById("cards-washing"),
        Drying: document.getElementById("cards-drying"),
        Ready: document.getElementById("cards-ready"),
        Delivered: document.getElementById("cards-delivered")
    };

    Object.values(containers).forEach(c => c.innerHTML = "");

    const searchVal = DOM.trackingSearch.value.toLowerCase() || DOM.globalSearch.value.toLowerCase();
    const serviceVal = DOM.trackingServiceFilter.value;

    const filteredOrders = orders.filter(o => {
        const matchSearch = o.customer.toLowerCase().includes(searchVal) || o.id.toLowerCase().includes(searchVal) || o.phone.includes(searchVal);
        const matchService = (serviceVal === "all") || (o.service === serviceVal);
        return matchSearch && matchService;
    });

    // Counts mapping
    const counts = { Received: 0, Washing: 0, Drying: 0, Ready: 0, Delivered: 0 };

    filteredOrders.forEach(ord => {
        counts[ord.status]++;
        
        const card = document.createElement("div");
        card.className = "order-card";
        card.draggable = true;
        card.id = `card-${ord.id}`;
        
        // Drag events
        card.addEventListener("dragstart", () => {
            state.currentDragOrderId = ord.id;
            card.style.opacity = "0.5";
        });
        card.addEventListener("dragend", () => {
            state.currentDragOrderId = null;
            card.style.opacity = "1";
        });

        // Pick background tag color
        let tagClass = "tag-wash";
        if (ord.service === "Dry Cleaning") tagClass = "tag-dryclean";
        if (ord.service === "Ironing") tagClass = "tag-iron";
        if (ord.service === "Premium Care") tagClass = "tag-premium";

        card.innerHTML = `
            <div class="order-card-header">
                <h4>${ord.customer}</h4>
                <span class="order-id">#${ord.id}</span>
            </div>
            <div class="order-service-tag ${tagClass}">${ord.service}</div>
            <p style="font-size: 13px; margin-bottom: 8px;">${ord.notes ? ord.notes : 'No extra instructions'}</p>
            <div class="order-card-details">
                <span>Weight/Qty: <strong>${ord.weight}</strong></span>
                <span class="price">¥${ord.price.toLocaleString()}</span>
            </div>
            <div class="order-card-actions">
                <button onclick="editLaundryOrder('${ord.id}')" title="Edit OrderDetails"><i class="fa-solid fa-pen-to-square"></i> Edit</button>
                <button class="btn-delete-order" onclick="deleteLaundryOrder('${ord.id}')" title="Delete Order"><i class="fa-solid fa-trash"></i> Delete</button>
            </div>
        `;

        if (containers[ord.status]) {
            containers[ord.status].appendChild(card);
        }
    });

    // Update Counts Badges
    document.getElementById("count-received").textContent = counts.Received;
    document.getElementById("count-washing").textContent = counts.Washing;
    document.getElementById("count-drying").textContent = counts.Drying;
    document.getElementById("count-ready").textContent = counts.Ready;
    document.getElementById("count-delivered").textContent = counts.Delivered;

    setupDragAndDrop();
}

function renderUsersTable() {
    DOM.usersTbody.innerHTML = "";
    
    users.forEach(user => {
        const tr = document.createElement("tr");
        
        let statusBadge = "badge-success";
        if (user.status !== "Active") statusBadge = "badge-danger";

        tr.innerHTML = `
            <td>
                <div class="staff-member-cell">
                    <img src="https://api.dicebear.com/7.x/adventurer/svg?seed=${user.avatar || user.username}" alt="${user.name}" class="avatar">
                    <strong>${user.name}</strong>
                </div>
            </td>
            <td>@${user.username}</td>
            <td><span class="badge badge-blue">${user.role}</span></td>
            <td>${user.email}</td>
            <td><span class="badge ${statusBadge}">${user.status}</span></td>
            <td class="text-right">
                <div class="actions-cell">
                    <button class="btn-icon" onclick="editUserAccount('${user.id}')" title="Edit Staff"><i class="fa-solid fa-user-pen"></i></button>
                    <button class="btn-icon" onclick="deleteUserAccount('${user.id}')" title="Delete Staff"><i class="fa-solid fa-trash"></i></button>
                </div>
            </td>
        `;
        DOM.usersTbody.appendChild(tr);
    });
}

// Render Notifications dropdown
function renderNotificationsDropdown() {
    DOM.notiList.innerHTML = "";
    
    const unreadCount = notifications.filter(n => n.unread).length;
    DOM.notiBadge.textContent = unreadCount;
    DOM.notiBadge.style.display = unreadCount > 0 ? "flex" : "none";

    if (notifications.length === 0) {
        DOM.notiList.innerHTML = `<div class="text-center p-4 text-muted">All caught up! No notifications.</div>`;
        return;
    }

    notifications.forEach(noti => {
        const item = document.createElement("div");
        item.className = `notification-item ${noti.unread ? 'unread' : ''}`;
        item.onclick = () => markNotificationRead(noti.id);
        
        let icon = "fa-info-circle text-blue";
        if (noti.type === "success") icon = "fa-circle-check text-green";
        if (noti.type === "warning") icon = "fa-triangle-exclamation text-orange";
        if (noti.type === "danger") icon = "fa-skull-crossbones text-red";

        item.innerHTML = `
            <div class="noti-icon ${noti.type}"><i class="fa-solid ${icon}"></i></div>
            <div class="noti-info">
                <p><strong>${noti.title}</strong>: ${noti.desc}</p>
                <span>${noti.time}</span>
            </div>
        `;
        DOM.notiList.appendChild(item);
    });
}

function markNotificationRead(id) {
    const idx = notifications.findIndex(n => n.id === id);
    if (idx !== -1) {
        notifications[idx].unread = false;
        saveDb("sakura_notifications", notifications);
        renderNotificationsDropdown();
    }
}

// Edit Handlers for buttons (global functions)
window.editInventoryItem = function(id) {
    const item = inventory.find(i => i.id === id);
    if (item) {
        state.editingItemId = id;
        document.getElementById("inventory-modal-title").textContent = "Edit Supply Item";
        document.getElementById("inventory-id-field").value = item.id;
        document.getElementById("inv-name").value = item.name;
        document.getElementById("inv-category").value = item.category;
        document.getElementById("inv-quantity").value = item.quantity;
        document.getElementById("inv-capacity").value = item.capacity;
        document.getElementById("inv-unit").value = item.unit;
        document.getElementById("inv-min-alert").value = item.minStock;
        
        openModal(DOM.modalInventory);
    }
};

window.deleteInventoryItem = function(id) {
    const item = inventory.find(i => i.id === id);
    if (item && confirm(`Are you sure you want to delete ${item.name}?`)) {
        inventory = inventory.filter(i => i.id !== id);
        saveDb("sakura_inventory", inventory);
        addActivityLog(`Supply item '${item.name}' deleted`, "orange");
        createToast("Item Deleted", `${item.name} removed from inventory.`, "info");
        renderApp();
        
    }
};

window.editLaundryOrder = function(id) {
    const ord = orders.find(o => o.id === id);
    if (ord) {
        state.editingOrderId = id;
        document.getElementById("order-modal-title").textContent = "Edit Laundry Order Details";
        document.getElementById("order-id-field").value = ord.id;
        document.getElementById("ord-customer").value = ord.customer;
        document.getElementById("ord-phone").value = ord.phone;
        document.getElementById("ord-service").value = ord.service;
        document.getElementById("ord-weight").value = ord.weight;
        document.getElementById("ord-status").value = ord.status;
        document.getElementById("ord-price").value = ord.price;
        document.getElementById("ord-notes").value = ord.notes;
        
        openModal(DOM.modalOrder);
    }
};

window.deleteLaundryOrder = function(id) {
    if (confirm(`Cancel and delete order #${id}?`)) {
        const ord = orders.find(o => o.id === id);
        orders = orders.filter(o => o.id !== id);
        saveDb("sakura_orders", orders);
        addActivityLog(`Order #${id} deleted`, "orange");
        createToast("Order Deleted", `Order #${id} has been cancelled.`, "info");
        renderApp();
    }
};

window.editUserAccount = function(id) {
    const usr = users.find(u => u.id === id);
    if (usr) {
        state.editingUserId = id;
        document.getElementById("user-modal-title").textContent = "Edit Staff Member Details";
        document.getElementById("user-id-field").value = usr.id;
        document.getElementById("usr-fullname").value = usr.name;
        document.getElementById("usr-username").value = usr.username;
        document.getElementById("usr-email").value = usr.email;
        document.getElementById("usr-role").value = usr.role;
        document.getElementById("usr-status").value = usr.status;
        document.getElementById("usr-avatar-seed").value = usr.avatar;
        
        openModal(DOM.modalUser);
    }
};

window.deleteUserAccount = function(id) {
    const usr = users.find(u => u.id === id);
    if (usr && confirm(`Delete staff account for ${usr.name}?`)) {
        users = users.filter(u => u.id !== id);
        saveDb("sakura_users", users);
        addActivityLog(`Staff account for ${usr.name} deleted`, "orange");
        createToast("Staff Deleted", `Account removed.`, "info");
        renderApp();
    }
};

// --- CHARTS SYSTEM (CHART.JS) ---
let stockChartInstance = null;
let orderChartInstance = null;

function initCharts() {
    const ctxStock = document.getElementById("stock-chart").getContext("2d");
    const ctxOrder = document.getElementById("order-chart").getContext("2d");

    Chart.defaults.color = '#d0c0c7';
    Chart.defaults.font.family = 'Outfit';

    // Stock Level Chart (Bar chart)
    stockChartInstance = new Chart(ctxStock, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Current Quantity',
                    data: [],
                    backgroundColor: 'rgba(255, 71, 126, 0.75)',
                    borderColor: '#ff477e',
                    borderWidth: 1,
                    borderRadius: 5
                },
                {
                    label: 'Max Capacity',
                    data: [],
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                    borderWidth: 1,
                    borderRadius: 5
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255, 179, 198, 0.05)' }
                },
                x: {
                    grid: { display: false }
                }
            },
            plugins: {
                legend: { position: 'top', labels: { boxWidth: 12 } }
            }
        }
    });

    // Order Tracking Distribution Chart (Doughnut)
    orderChartInstance = new Chart(ctxOrder, {
        type: 'doughnut',
        data: {
            labels: ['Received', 'Washing', 'Drying', 'Ready', 'Delivered'],
            datasets: [{
                data: [0, 0, 0, 0, 0],
                backgroundColor: [
                    'rgba(79, 168, 255, 0.7)',
                    'rgba(174, 122, 255, 0.7)',
                    'rgba(255, 157, 66, 0.7)',
                    'rgba(255, 133, 161, 0.7)',
                    'rgba(60, 208, 112, 0.7)'
                ],
                borderColor: [
                    '#4fa8ff',
                    '#ae7aff',
                    '#ff9d42',
                    '#ff85a1',
                    '#3cd070'
                ],
                borderWidth: 1.5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: { boxWidth: 12 }
                }
            },
            cutout: '65%'
        }
    });
    
    window.stockChart = stockChartInstance;
    window.orderChart = orderChartInstance;
}

function updateChartsData() {
    if (!stockChartInstance || !orderChartInstance) return;

    // Update Stock Levels
    const stockLabels = inventory.map(item => item.name.length > 20 ? item.name.slice(0, 17) + "..." : item.name);
    const stockQty = inventory.map(item => item.quantity);
    const stockCap = inventory.map(item => item.capacity);

    stockChartInstance.data.labels = stockLabels;
    stockChartInstance.data.datasets[0].data = stockQty;
    stockChartInstance.data.datasets[1].data = stockCap;
    stockChartInstance.update();

    // Update Order stages
    const counts = { Received: 0, Washing: 0, Drying: 0, Ready: 0, Delivered: 0 };
    orders.forEach(o => {
        if (counts[o.status] !== undefined) counts[o.status]++;
    });

    orderChartInstance.data.datasets[0].data = [
        counts.Received,
        counts.Washing,
        counts.Drying,
        counts.Ready,
        counts.Delivered
    ];
    orderChartInstance.update();
    
    // Also update notification list
    renderNotificationsDropdown();
}


// Background sakura petals animation removed for professional look





// ==========================================
// PHP BACKEND INTEGRATION (LOGIN & CUSTOMERS)
// ==========================================

// --- LOGIN LOGIC ---
const loginForm = document.getElementById('login-form');
const loginOverlay = document.getElementById('login-overlay');
const appContainer = document.getElementById('app-container');
const loginError = document.getElementById('login-error');

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;
        
        try {
            const res = await fetch('api/auth.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            if (res.ok) {
                loginOverlay.style.display = 'none';
                appContainer.style.display = 'flex';
                showToast('Login Successful', 'Welcome back to Sakura Systems.');
                // Update UI with user info
                if (document.getElementById('user-display-name')) {
                    document.getElementById('user-display-name').textContent = data.user.name;
                    document.getElementById('user-role').textContent = data.user.role;
                }
                await initApp();
            } else {
                loginError.textContent = data.error || 'Invalid credentials';
                loginError.style.display = 'block';
            }
        } catch (err) {
            loginError.textContent = 'Server error. Is XAMPP running?';
            loginError.style.display = 'block';
        }
    });
}

// Check session on load
async function checkSession() {
    try {
        const res = await fetch('api/auth.php?action=me');
        const data = await res.json();
        if (data.loggedIn) {
            loginOverlay.style.display = 'none';
            appContainer.style.display = 'flex';
            if (document.getElementById('user-display-name')) {
                document.getElementById('user-display-name').textContent = data.user.name;
                document.getElementById('user-role').textContent = data.user.role;
            }
            await initApp();
        } else {
            loginOverlay.style.display = 'flex';
            appContainer.style.display = 'none';
        }
    } catch(err) {
        loginOverlay.style.display = 'flex';
        appContainer.style.display = 'none';
        loginError.textContent = 'Could not connect to PHP server.';
        loginError.style.display = 'block';
    }
}
window.addEventListener('DOMContentLoaded', checkSession);

// --- CUSTOMERS TAB LOGIC ---
const btnAddCustomer = document.getElementById('btn-add-customer');
const modalCustomer = document.getElementById('modal-customer');
const customerForm = document.getElementById('customer-form');
const customersTbody = document.getElementById('customers-tbody');
let editingCustomerId = null;

if (btnAddCustomer) {
    btnAddCustomer.addEventListener('click', () => {
        editingCustomerId = null;
        customerForm.reset();
        document.getElementById('customer-modal-title').textContent = 'New Client Profile';
        modalCustomer.style.display = 'flex';
    });
}

if (customerForm) {
    customerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            id: editingCustomerId,
            name: document.getElementById('cust-name').value,
            phone: document.getElementById('cust-phone').value,
            email: document.getElementById('cust-email').value,
            address: document.getElementById('cust-address').value
        };
        
        try {
            const method = editingCustomerId ? 'PUT' : 'POST';
            const res = await fetch('api/customers.php', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                showToast('Success', 'Client saved successfully.');
                closeAllModals();
                // Refresh data
                await loadDataFromAPI();
                renderCustomers();
            }
        } catch (err) {
            showToast('Error', 'Failed to save client.');
        }
    });
}

function renderCustomers() {
    if (!customersTbody) return;
    customersTbody.innerHTML = '';
    customers.forEach(c => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${c.name}</td>
            <td>${c.phone}</td>
            <td>${c.email}</td>
            <td>${c.address}</td>
            <td class="text-right">
                <button class="btn-icon" onclick="editCustomer(${c.id})"><i class="fa-solid fa-pen"></i></button>
                <button class="btn-icon text-pink" onclick="deleteCustomer(${c.id})"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        customersTbody.appendChild(tr);
    });
}

window.editCustomer = function(id) {
    const c = customers.find(x => x.id == id);
    if (!c) return;
    editingCustomerId = id;
    document.getElementById('customer-modal-title').textContent = 'Edit Client Profile';
    document.getElementById('cust-name').value = c.name;
    document.getElementById('cust-phone').value = c.phone;
    document.getElementById('cust-email').value = c.email;
    document.getElementById('cust-address').value = c.address;
    modalCustomer.style.display = 'flex';
}

window.deleteCustomer = async function(id) {
    if (confirm('Delete this client?')) {
        try {
            await fetch('api/customers.php?id=' + id, { method: 'DELETE' });
            await loadDataFromAPI();
            renderCustomers();
            showToast('Deleted', 'Client removed.');
        } catch (err) {}
    }
}

// Hook into navigation to render customers when tab is clicked
document.querySelectorAll('.nav-item').forEach(nav => {
    nav.addEventListener('click', (e) => {
        if (e.currentTarget.getAttribute('data-tab') === 'customers') {
            renderCustomers();
        }
    });
});
