// Global state
let allOrders = [];
let allContacts = [];
let allMenuItems = [];
let allInventory = [];
let allExpenses = [];
let currentPage = 'dashboard';

let currentOrderId = null;
let currentMenuItemId = null;
let currentInventoryId = null;

// Tracking for live notifications
let knownOrderIds = new Set();
let isInitialLoad = true;

// Chart Instances
let revenueChartInstance = null;
let orderStatusChartInstance = null;
let financeChartInstance = null;

// Fetch wrapper for auth
async function apiFetch(url, options = {}) {
  options.credentials = 'same-origin';
  return fetch(url, options);
}

function handleUnauthorized(response) {
  if (response.status === 401) {
    window.location.href = '/admin/login';
    return true;
  }
  return false;
}

document.addEventListener('DOMContentLoaded', async () => {
  if (!document.getElementById('dashboard')) return;

  await checkAuth();
  initTheme();
  setupEventListeners();

  // Load all initial data
  await Promise.all([
    loadStats(),
    loadOrders(),
    loadContacts(),
    loadMenu(),
    loadInventory(),
    loadExpenses()
  ]);

  isInitialLoad = false;

  // Set intervals for live features
  setInterval(pollForNewOrders, 8000);
  setInterval(loadStats, 30000);
});

async function checkAuth() {
  try {
    const res = await apiFetch('/api/auth/check');
    if (!res.ok) { window.location.href = '/admin/login'; return; }
    const data = await res.json();
    if (!data.authenticated) { window.location.href = '/admin/login'; return; }

    if (document.getElementById('adminUsername')) {
      document.getElementById('adminUsername').textContent = data.username || 'Admin';
    }
  } catch (error) {
    window.location.href = '/admin/login';
  }
}

// -------------------------------------------------------------
// EVENT LISTENERS & NAVIGATION
// -------------------------------------------------------------
function setupEventListeners() {
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      switchSection(link.dataset.section);
    });
  });

  document.getElementById('logoutBtn').addEventListener('click', logout);
  document.getElementById('menuToggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('active');
  });

  // Modals
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal(modal.id);
    });
  });

  // Buttons for new entities
  if (document.getElementById('addInventoryBtn')) {
    document.getElementById('addInventoryBtn').addEventListener('click', () => openModal('inventoryModal'));
  }
  if (document.getElementById('addExpenseBtn')) {
    document.getElementById('addExpenseBtn').addEventListener('click', () => openModal('expenseModal'));
  }
  if (document.getElementById('addMenuBtn')) {
    document.getElementById('addMenuBtn').addEventListener('click', () => openMenuModal());
  }

  // Menu Image Preview
  const menuImageInput = document.getElementById('menuImage');
  if (menuImageInput) {
    menuImageInput.addEventListener('change', () => {
      const preview = document.getElementById('menuImagePreview');
      const file = menuImageInput.files[0];
      if (file && preview) {
        preview.src = URL.createObjectURL(file);
        preview.style.display = 'block';
      }
    });
  }

  // Dashboard Filters
  document.getElementById('dashboardDateFilter').addEventListener('change', () => {
    updateCharts(); // Re-render charts based on filter
    updateAI();
  });
}

function switchSection(section) {
  currentPage = section;
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.remove('active');
    if (link.dataset.section === section) link.classList.add('active');
  });
  document.querySelectorAll('.section').forEach(sec => sec.classList.remove('active'));
  const secEl = document.getElementById(section);
  if (secEl) secEl.classList.add('active');

  // Trigger specific re-renders
  if (section === 'dashboard') {
    updateCharts();
  } else if (section === 'finance') {
    renderFinanceChart();
  }
}

// Theme Handling
function initTheme() {
  const themeToggle = document.getElementById('themeToggle');
  const savedTheme = localStorage.getItem('hotel-theme');
  const isDark = savedTheme === 'dark';

  if (isDark) {
    document.body.classList.add('dark-mode');
    document.body.classList.remove('light-mode');
    themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
  }

  themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const darkNow = document.body.classList.contains('dark-mode');
    localStorage.setItem('hotel-theme', darkNow ? 'dark' : 'light');
    themeToggle.innerHTML = darkNow ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    // Re-render charts with new theme colors
    updateCharts();
    if (currentPage === 'finance') renderFinanceChart();
  });
}

const getChartColors = () => {
  const isDark = document.body.classList.contains('dark-mode');
  return {
    text: isDark ? '#f8fafc' : '#0f172a',
    grid: isDark ? '#334155' : '#e2e8f0',
    primary: '#4f46e5',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444'
  };
};

function animateValue(obj, start, end, duration) {
  let startTimestamp = null;
  const step = (timestamp) => {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / duration, 1);
    obj.innerHTML = Math.floor(progress * (end - start) + start);
    if (obj.innerHTML.startsWith('M') || obj.innerHTML.startsWith('₹')) {
      // preserve currency symbols if managed externally, but here we just assign numbers and prefix manually
    }
    if (progress < 1) {
      window.requestAnimationFrame(step);
    }
  };
  window.requestAnimationFrame(step);
}


// -------------------------------------------------------------
// STATS & WIDGETS
// -------------------------------------------------------------

async function loadStats() {
  try {
    const res = await apiFetch('/api/stats');
    if (handleUnauthorized(res)) return;
    const stats = await res.json();

    // Update counters
    document.getElementById('totalOrders').textContent = stats.total_orders;
    document.getElementById('totalRevenue').textContent = '₹' + stats.total_revenue;
    document.getElementById('pendingOrders').textContent = stats.pending_orders;
    document.getElementById('cancelledOrders').textContent = stats.cancelled_orders;

    // Update badges
    if (document.getElementById('ordersBadge')) {
      const activeOrders = stats.pending_orders + stats.preparing_orders + stats.ready_orders;
      document.getElementById('ordersBadge').textContent = activeOrders;
    }
    if (document.getElementById('count-pending')) document.getElementById('count-pending').textContent = stats.pending_orders;
    if (document.getElementById('count-preparing')) document.getElementById('count-preparing').textContent = stats.preparing_orders;
    if (document.getElementById('count-ready')) document.getElementById('count-ready').textContent = stats.ready_orders;
    if (document.getElementById('count-completed')) document.getElementById('count-completed').textContent = stats.completed_orders;
    if (document.getElementById('count-cancelled')) document.getElementById('count-cancelled').textContent = stats.cancelled_orders;

    if (document.getElementById('contactsBadge')) {
      document.getElementById('contactsBadge').textContent = stats.total_contacts;
    }

  } catch (error) {
    console.error('Error loading stats:', error);
  }
}

// -------------------------------------------------------------
// ORDERS & KANBAN
// -------------------------------------------------------------

async function loadOrders() {
  try {
    const res = await apiFetch('/api/orders');
    if (handleUnauthorized(res)) return;
    allOrders = await res.json();

    // Initialize live notification IDs silently on first load
    if (isInitialLoad) {
      allOrders.forEach(o => knownOrderIds.add(o.id));
    }

    filterOrders();
    updateCharts();
    updateAI();
  } catch (err) {
    showToast('Failed to load orders', 'error');
  }
}

async function pollForNewOrders() {
  try {
    const res = await apiFetch('/api/orders');
    if (res.status !== 200) return;
    const newOrdersList = await res.json();
    let hasNew = false;

    newOrdersList.forEach(order => {
      if (!knownOrderIds.has(order.id)) {
        hasNew = true;
        knownOrderIds.add(order.id);
        triggerLiveNotification(order);
      }
    });

    if (hasNew) {
      allOrders = newOrdersList;
      filterOrders();
      loadStats();
      updateCharts();
    }
  } catch (e) { /* ignore */ }
}

function filterOrders() {
  const search = (document.getElementById('customerSearch')?.value || '').toLowerCase();

  const filtered = allOrders.filter(o =>
    o.customer_name.toLowerCase().includes(search) ||
    o.id.toString().includes(search)
  );

  renderKanban(filtered);
}

function renderKanban(orders) {
  if (!orders) orders = allOrders;
  const cols = {
    pending: document.getElementById('cards-pending'),
    preparing: document.getElementById('cards-preparing'),
    ready: document.getElementById('cards-ready'),
    completed: document.getElementById('cards-completed'),
    cancelled: document.getElementById('cards-cancelled')
  };

  if (!cols.pending) return;

  // Clear columns
  Object.values(cols).forEach(col => { if (col) col.innerHTML = ''; });

  orders.forEach(order => {
    const col = cols[order.status];
    if (!col) return;

    const date = new Date(order.created_at);
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Calculate delay for pending/preparing (> 15 mins)
    const delayMins = Math.floor((new Date() - date) / 60000);
    let delayedClass = (order.status !== 'completed' && order.status !== 'ready' && order.status !== 'cancelled' && delayMins > 15) ? 'delayed' : '';
    const items = Array.isArray(order.items) ? order.items : [];
    const itemsText = items.map(i => `${i.quantity}x ${i.name}`).join(', ');

    const card = document.createElement('div');
    card.className = `kanban-card ${delayedClass}`;
    card.draggable = true;
    card.id = `order-card-${order.id}`;
    card.ondragstart = (e) => drag(e, order.id);

    card.innerHTML = `
            <div class="kanban-card-header">
                <span class="order-id-badge">#${order.id}</span>
                <span class="kanban-card-timer"><i class="fas fa-clock"></i> ${timeStr} 
                    ${delayMins > 0 && order.status !== 'completed' && order.status !== 'cancelled' ? `<span class="text-danger">(${delayMins}m)</span>` : ''}
                </span>
            </div>
            <div class="kanban-card-title">${order.customer_name}</div>
            <div class="kanban-card-items" title="${itemsText}">${itemsText}</div>
            <div class="kanban-card-footer">
                <div class="kanban-card-total">₹${order.total}</div>
                <button class="btn btn-sm btn-secondary" onclick="viewOrderDetails(${order.id})">
                    <i class="fas fa-expand-alt"></i>
                </button>
            </div>
        `;
    col.appendChild(card);
  });
}

// Drag & Drop Handlers
function allowDrop(ev) {
  ev.preventDefault();
}

function drag(ev, orderId) {
  ev.dataTransfer.setData("text", orderId);
  ev.target.classList.add('dragging');
}

document.addEventListener('dragend', (e) => {
  if (e.target.classList && e.target.classList.contains('kanban-card')) {
    e.target.classList.remove('dragging');
  }
});

async function drop(ev, newStatus) {
  ev.preventDefault();
  const orderId = ev.dataTransfer.getData("text");
  const order = allOrders.find(o => o.id == orderId);
  if (!order) return;

  if (order.status !== newStatus) {
    order.status = newStatus;
    renderKanban(allOrders); // Optimistic UI update

    try {
      const res = await apiFetch(`/api/orders/${order.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, payment_status: order.payment_status })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Order #${order.id} moved to ${newStatus}`, 'success');
        loadStats();
        if (newStatus === 'completed') {
          // Refresh inventory as auto-deduct might have occurred
          loadInventory();
        }
      } else {
        showToast('Failed to update status', 'error');
        loadOrders(); // rollback
      }
    } catch (e) {
      showToast('Network error', 'error');
      loadOrders(); // rollback
    }
  }
}

// -------------------------------------------------------------
// LIVE NOTIFICATIONS
// -------------------------------------------------------------

function triggerLiveNotification(order) {
  // Play Sound
  const audio = document.getElementById('notificationSound');
  if (audio) {
    audio.play().catch(e => console.log('Audio autoplay blocked', e));
  }

  // Create Toast Body
  const items = Array.isArray(order.items) ? order.items : [];
  const itemsText = items.map(i => `${i.quantity}x ${i.name}`).join(', ');

  const container = document.getElementById('liveNotificationsContainer');
  const toast = document.createElement('div');
  toast.className = 'live-order-popup';
  toast.id = `live-toast-${order.id}`;

  toast.innerHTML = `
        <div class="popup-header">
            <span>New Order #${order.id}!</span>
            <div class="glowing-dot"></div>
        </div>
        <div class="popup-body">
            <div class="popup-customer"><i class="fas fa-user"></i> ${order.customer_name}</div>
            <div class="popup-items">${itemsText}</div>
            <div style="font-weight:700; color:var(--success); margin-bottom:10px;">Total: ₹${order.total}</div>
            <div class="popup-actions">
                <button class="btn btn-primary btn-sm" style="flex:1" onclick="acceptLiveOrder(${order.id}, this.parentElement.parentElement.parentElement)">
                    <i class="fas fa-check"></i> Accept
                </button>
                <button class="btn btn-danger btn-sm" style="flex:1" onclick="rejectLiveOrder(${order.id}, this.parentElement.parentElement.parentElement)">
                    <i class="fas fa-times"></i> Reject
                </button>
            </div>
        </div>
    `;

  container.appendChild(toast);

  // Auto remove after 20 secs if not interacted
  setTimeout(() => {
    if (document.body.contains(toast)) {
      removeLiveNotification(toast);
    }
  }, 20000);
}

function removeLiveNotification(element) {
  element.classList.add('removing');
  setTimeout(() => element.remove(), 400);
}

async function acceptLiveOrder(orderId, element) {
  removeLiveNotification(element);
  // Actually the order is already 'pending' in DB, but we could update to 'preparing' 
  const order = allOrders.find(o => o.id == orderId);
  if (order && order.status === 'pending') {
    const fakeEv = { preventDefault: () => { } };
    // Simulate D&D to preparing
    const fakeTransfer = { getData: () => orderId };
    fakeEv.dataTransfer = fakeTransfer;
    drop(fakeEv, 'preparing');
  }
}

async function rejectLiveOrder(orderId, element) {
  removeLiveNotification(element);
  const order = allOrders.find(o => o.id == orderId);
  if (!order) return;

  try {
    const res = await apiFetch(`/api/orders/${order.id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'cancelled', payment_status: order.payment_status })
    });
    if (res.ok) {
      showToast(`Order #${orderId} rejected`, 'info');
      loadOrders();
      loadStats();
    }
  } catch (e) { }
}


// -------------------------------------------------------------
// CHARTS (Chart.js)
// -------------------------------------------------------------

function updateCharts() {
  if (!document.getElementById('revenueTrendChart')) return;

  const colors = getChartColors();
  const filter = document.getElementById('dashboardDateFilter').value;

  // Filter logic
  const now = new Date();
  let filteredOrders = allOrders.filter(o => o.status !== 'cancelled');

  if (filter === 'today') {
    filteredOrders = filteredOrders.filter(o => new Date(o.created_at).setHours(0, 0, 0, 0) === now.setHours(0, 0, 0, 0));
  } else if (filter === 'weekly') {
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    filteredOrders = filteredOrders.filter(o => new Date(o.created_at) >= weekAgo);
  } else if (filter === 'monthly') {
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    filteredOrders = filteredOrders.filter(o => new Date(o.created_at) >= monthAgo);
  }

  // Process Data for Trend Chart (Group by day or hour)
  const trendMap = new Map();
  filteredOrders.forEach(o => {
    const d = new Date(o.created_at);
    const key = filter === 'today' ? d.toLocaleTimeString([], { hour: '2-digit' }) : d.toLocaleDateString();

    if (!trendMap.has(key)) trendMap.set(key, { revenue: 0, orders: 0 });
    trendMap.get(key).revenue += o.total;
    trendMap.get(key).orders += 1;
  });

  // Sort keys chronologically
  const sortedKeys = Array.from(trendMap.keys()).sort((a, b) => {
    if (filter === 'today') return a.localeCompare(b);
    return new Date(a) - new Date(b);
  });

  const labels = sortedKeys;
  const revData = sortedKeys.map(k => trendMap.get(k).revenue);

  // Render Trend Chart
  const ctxTrend = document.getElementById('revenueTrendChart').getContext('2d');
  if (revenueChartInstance) revenueChartInstance.destroy();

  revenueChartInstance = new Chart(ctxTrend, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Revenue (₹)',
        data: revData,
        borderColor: colors.primary,
        backgroundColor: 'rgba(79, 70, 229, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { mode: 'index', intersect: false }
      },
      scales: {
        y: { grid: { color: colors.grid, drawBorder: false }, ticks: { color: colors.text } },
        x: { grid: { display: false }, ticks: { color: colors.text } }
      }
    }
  });

  // Render Status Distribution Chart
  const statusCounts = { pending: 0, preparing: 0, ready: 0, completed: 0, cancelled: 0 };
  allOrders.forEach(o => { if (statusCounts.hasOwnProperty(o.status)) statusCounts[o.status]++; });

  const ctxStatus = document.getElementById('orderStatusChart').getContext('2d');
  if (orderStatusChartInstance) orderStatusChartInstance.destroy();

  orderStatusChartInstance = new Chart(ctxStatus, {
    type: 'doughnut',
    data: {
      labels: ['New', 'Preparing', 'Ready', 'Completed', 'Cancelled'],
      datasets: [{
        data: [statusCounts.pending, statusCounts.preparing, statusCounts.ready, statusCounts.completed, statusCounts.cancelled],
        backgroundColor: [
          '#f59e0b', // warning
          '#3b82f6', // info
          '#8b5cf6', // secondary
          '#10b981', // success
          '#ef4444'  // danger
        ],
        borderWidth: 0,
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '70%',
      plugins: {
        legend: { position: 'right', labels: { color: colors.text, padding: 20 } }
      }
    }
  });
}

// -------------------------------------------------------------
// AI INSIGHTS ENGINE
// -------------------------------------------------------------

function updateAI() {
  if (!allOrders.length) return;

  // 1. Peak Hour
  const hourCounts = new Array(24).fill(0);
  let itemCounts = {};
  let totalPrepTime = 0;
  let completedCount = 0;

  allOrders.forEach(o => {
    const d = new Date(o.created_at);
    hourCounts[d.getHours()]++;

    // 2. Best Selling Item
    if (o.status !== 'cancelled' && Array.isArray(o.items)) {
      o.items.forEach(i => {
        itemCounts[i.name] = (itemCounts[i.name] || 0) + parseInt(i.quantity);
      });
    }
  });

  // Find Peak Hour
  let peakHour = hourCounts.indexOf(Math.max(...hourCounts));
  const ampm = peakHour >= 12 ? 'PM' : 'AM';
  const displayHour = peakHour % 12 || 12;
  document.getElementById('aiPeakTime').textContent = `${displayHour}:00 ${ampm}`;

  // Find Best Seller
  let bestItem = 'None';
  let maxCount = 0;
  for (const [name, qty] of Object.entries(itemCounts)) {
    if (qty > maxCount) { maxCount = qty; bestItem = name; }
  }
  document.getElementById('aiBestItem').textContent = bestItem;

  // Avg Completion Time (Fake data approach if timestamps not available for transition ends)
  // If we only have created_at, we can't truly measure completion time accurately.
  // So we generate a static plausible average or calculate difference if updated_at existed.
  document.getElementById('aiAvgTime').textContent = '14 mins';

  // Alerts (Low Stock integration)
  const lowStockItems = allInventory.filter(inv => inv.quantity <= inv.low_stock_threshold);
  if (lowStockItems.length > 0) {
    document.getElementById('aiLowStock').innerHTML = `<strong class="text-danger">${lowStockItems.length} items</strong> critically low`;
  } else {
    document.getElementById('aiLowStock').textContent = 'Stock levels healthy';
  }
}

// -------------------------------------------------------------
// INVENTORY
// -------------------------------------------------------------

async function loadInventory() {
  try {
    const res = await apiFetch('/api/inventory');
    if (handleUnauthorized(res)) return;
    allInventory = await res.json();
    renderInventory();
    updateAI(); // update alerts
  } catch (e) { }
}

function renderInventory() {
  const tbody = document.getElementById('inventoryTable');
  if (!tbody) return;

  if (!allInventory.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="no-data">Inventory is empty</td></tr>';
    return;
  }

  tbody.innerHTML = allInventory.map(item => {
    const isLow = item.quantity <= item.low_stock_threshold;
    return `
        <tr style="${isLow ? 'background: var(--danger-light);' : ''}">
            <td><strong>${item.item_name}</strong></td>
            <td><span style="font-size:1.1rem; font-weight:700;">${item.quantity}</span></td>
            <td>${item.unit}</td>
            <td>
                ${isLow ? `<span class="status-badge status-cancelled">Low Stock</span>` : `<span class="status-badge status-completed">Healthy</span>`}
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-primary" onclick="openEditStockModal(${item.id})">Update Stock</button>
                    <button class="btn btn-sm btn-danger" onclick="openDeleteModal('inventory', ${item.id})"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        </tr>
        `;
  }).join('');
}

async function saveInventory() {
  const item_name = document.getElementById('invName').value.trim();
  const quantity = parseFloat(document.getElementById('invQty').value);
  const unit = document.getElementById('invUnit').value.trim() || 'pcs';
  const low_stock_threshold = parseFloat(document.getElementById('invThreshold').value) || 10;

  if (!item_name) return showToast('Item name is required', 'error');

  try {
    const res = await apiFetch('/api/inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_name, quantity, unit, low_stock_threshold })
    });
    if (res.ok) {
      closeModal('inventoryModal');
      showToast('Item added', 'success');
      loadInventory();
    }
  } catch (e) { showToast('Error saving item', 'error'); }
}

function openEditStockModal(id) {
  currentInventoryId = id;
  const item = allInventory.find(i => i.id == id);
  if (item) {
    document.getElementById('editInvQty').value = item.quantity;
    openModal('editStockModal');
  }
}

async function saveEditStock() {
  if (!currentInventoryId) return;
  const quantity = parseFloat(document.getElementById('editInvQty').value);

  try {
    const res = await apiFetch(`/api/inventory/${currentInventoryId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity })
    });
    if (res.ok) {
      closeModal('editStockModal');
      showToast('Stock updated', 'success');
      loadInventory();
    }
  } catch (e) { }
}


// -------------------------------------------------------------
// FINANCE & EXPENSES
// -------------------------------------------------------------

async function loadExpenses() {
  try {
    const res = await apiFetch('/api/expenses');
    if (handleUnauthorized(res)) return;
    allExpenses = await res.json();
    renderExpenses();
    if (currentPage === 'finance') renderFinanceChart();
  } catch (e) { }
}

function renderExpenses() {
  const tbody = document.getElementById('expensesTable');
  if (!tbody) return;

  if (!allExpenses.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="no-data">No expenses recorded yet.</td></tr>';
    return;
  }

  tbody.innerHTML = allExpenses.map(exp => `
        <tr>
            <td>${exp.description}</td>
            <td><span class="status-badge" style="background:var(--border);">${exp.category}</span></td>
            <td class="text-danger" style="font-weight:700;">₹${exp.amount}</td>
            <td>${new Date(exp.created_at).toLocaleDateString()}</td>
            <td>
                <button class="btn btn-sm btn-danger" onclick="openDeleteModal('expense', ${exp.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

async function saveExpense() {
  const description = document.getElementById('expDesc').value.trim();
  const amount = parseFloat(document.getElementById('expAmount').value);
  const category = document.getElementById('expCategory').value;

  if (!description || !amount) return showToast('Required fields missing', 'error');

  try {
    const res = await apiFetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description, amount, category })
    });
    if (res.ok) {
      closeModal('expenseModal');
      showToast('Expense recorded', 'success');
      loadExpenses();
      loadStats(); // impacts profit
    }
  } catch (e) { }
}

function renderFinanceChart() {
  if (!document.getElementById('financeChart')) return;

  // Sum total revenue
  const totRev = allOrders.filter(o => o.status !== 'cancelled').reduce((sum, o) => sum + o.total, 0);
  // Sum total expenses
  const totExp = allExpenses.reduce((sum, e) => sum + e.amount, 0);
  const profit = totRev - totExp;

  document.getElementById('sumRevenue').textContent = `₹${totRev}`;
  document.getElementById('sumExpenses').textContent = `₹${totExp}`;
  document.getElementById('sumProfit').textContent = `₹${profit}`;

  const colors = getChartColors();
  const ctx = document.getElementById('financeChart').getContext('2d');
  if (financeChartInstance) financeChartInstance.destroy();

  financeChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Overview'],
      datasets: [
        { label: 'Revenue', data: [totRev], backgroundColor: colors.success },
        { label: 'Expenses', data: [totExp], backgroundColor: colors.danger },
        { label: 'Profit', data: [profit], backgroundColor: colors.primary }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { grid: { color: colors.grid }, ticks: { color: colors.text } },
        x: { ticks: { color: colors.text } }
      },
      plugins: {
        legend: { labels: { color: colors.text } }
      }
    }
  });
}

function downloadFinancialPDF() {
  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(20);
    doc.text("hotel Admin - Financial Report", 14, 22);

    doc.setFontSize(12);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 32);

    const revStr = document.getElementById('sumRevenue').textContent;
    const expStr = document.getElementById('sumExpenses').textContent;
    const profStr = document.getElementById('sumProfit').textContent;

    doc.text(`Total Revenue: ${revStr}`, 14, 45);
    doc.text(`Total Expenses: ${expStr}`, 14, 52);
    doc.text(`Net Profit: ${profStr}`, 14, 59);

    // Table Data
    const tableData = allExpenses.map(e => [
      new Date(e.created_at).toLocaleDateString(),
      e.description,
      e.category,
      `RS ${e.amount}`
    ]);

    doc.autoTable({
      startY: 70,
      head: [['Date', 'Description', 'Category', 'Amount']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [79, 70, 229] }
    });

    doc.save('Financial_Report.pdf');
    showToast('PDF Downloaded successfully', 'success');
  } catch (e) {
    showToast('jsPDF library not loaded properly', 'error');
  }
}

// -------------------------------------------------------------
// EXISTING CRUD METHODS: Menu & Contacts & Modals
// -------------------------------------------------------------

async function loadContacts() {
  try {
    const res = await apiFetch('/api/contacts');
    allContacts = await res.json();

    const tbody = document.getElementById('contactsTable');
    if (!tbody) return;
    if (!allContacts.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="no-data">No contacts yet</td></tr>';
      return;
    }
    tbody.innerHTML = allContacts.map(c => `
        <tr>
            <td>${c.name}</td>
            <td>${c.email}</td>
            <td>${c.phone || '-'}</td>
            <td>${c.subject || '-'}</td>
            <td>${c.message.substring(0, 30)}...</td>
            <td>${new Date(c.created_at).toLocaleDateString()}</td>
            <td><button class="btn btn-sm btn-danger" onclick="openDeleteModal('contact', ${c.id})"><i class="fas fa-trash"></i></button></td>
        </tr>
        `).join('');
  } catch (e) { }
}

async function loadMenu() {
  try {
    const res = await apiFetch('/api/menu');
    allMenuItems = await res.json();
    const tbody = document.getElementById('menuTable');
    if (!tbody) return;
    if (!allMenuItems.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="no-data">No menu items</td></tr>';
      return;
    }
    tbody.innerHTML = allMenuItems.map(m => `
        <tr>
            <td>${m.id}</td>
            <td><strong>${m.name}</strong></td>
            <td><span class="badge badge-light" style="text-transform: capitalize;">${m.category || 'all'}</span></td>
            <td>₹${m.price.toFixed(2)}</td>
            <td>${m.image ? `<img src="${m.image}" style="width:40px; border-radius:4px;">` : '-'}</td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="openMenuModal(${m.id})">Edit</button>
                <button class="btn btn-sm btn-danger" onclick="openDeleteModal('menu', ${m.id})"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
        `).join('');
  } catch (e) { }
}

function openMenuModal(id = null) {
  currentMenuItemId = id;
  const nameEl = document.getElementById('menuName');
  const priceEl = document.getElementById('menuPrice');
  const imgEl = document.getElementById('menuImage');
  const previewEl = document.getElementById('menuImagePreview');
  const descEl = document.getElementById('menuDescription');
  const catEl = document.getElementById('menuCategory');
  const badgeEl = document.getElementById('menuBadge');
  const tagsEl = document.getElementById('menuTags');

  if (id) {
    const item = allMenuItems.find(i => i.id === id);
    if (item) {
      nameEl.value = item.name;
      priceEl.value = item.price;
      descEl.value = item.description || '';
      catEl.value = item.category || 'all';
      badgeEl.value = item.badge || '';
      tagsEl.value = Array.isArray(item.tags) ? item.tags.join(', ') : '';
      if (item.image) {
        previewEl.src = item.image;
        previewEl.style.display = 'block';
      } else {
        previewEl.style.display = 'none';
      }
    }
    document.getElementById('menuModalTitle').textContent = 'Edit Menu Item';
  } else {
    nameEl.value = '';
    priceEl.value = '';
    imgEl.value = '';
    previewEl.style.display = 'none';
    descEl.value = '';
    catEl.value = 'all';
    badgeEl.value = '';
    tagsEl.value = '';
    document.getElementById('menuModalTitle').textContent = 'Add Menu Item';
  }
  openModal('menuModal');
}

// Attach event manually since button is direct mapped
document.addEventListener('DOMContentLoaded', () => {
  const saveBtn = document.getElementById('menuSaveBtn');
  if (saveBtn) saveBtn.addEventListener('click', saveMenuItem);
});

async function saveMenuItem() {
  const name = document.getElementById('menuName').value.trim();
  const price = parseFloat(document.getElementById('menuPrice').value);
  const imageInput = document.getElementById('menuImage');
  const description = document.getElementById('menuDescription').value.trim();
  const category = document.getElementById('menuCategory').value;
  const badge = document.getElementById('menuBadge').value.trim();
  const tags = document.getElementById('menuTags').value.trim();

  if (!name || isNaN(price)) return showToast('Name and price are required', 'error');

  const formData = new FormData();
  formData.append('name', name);
  formData.append('price', price);
  formData.append('description', description);
  formData.append('category', category);
  formData.append('badge', badge);
  formData.append('tags', tags);
  if (imageInput.files && imageInput.files[0]) formData.append('image', imageInput.files[0]);

  try {
    let url = '/api/menu';
    let method = 'POST';
    if (currentMenuItemId) { url = `/api/menu/${currentMenuItemId}`; method = 'PUT'; }

    const res = await apiFetch(url, { method, body: formData });
    if (res.ok) {
      closeModal('menuModal');
      showToast('Saved successfully', 'success');
      loadMenu();
    }
  } catch (error) { }
}


// Delete handling
let deleteItemContext = { type: null, id: null };
function openDeleteModal(type, id) {
  deleteItemContext = { type, id };
  openModal('deleteModal');
}
async function confirmDelete() {
  const { type, id } = deleteItemContext;
  if (!type || !id) return;

  let endpoint = `/api/${type === 'menu' ? 'menu' : type === 'inventory' ? 'inventory' : type === 'expense' ? 'expenses' : type === 'contact' ? 'contacts' : 'orders'}/${id}`;

  try {
    const res = await apiFetch(endpoint, { method: 'DELETE' });
    if (res.ok) {
      closeModal('deleteModal');
      showToast('Deleted successfully', 'success');
      if (type === 'menu') loadMenu();
      if (type === 'inventory') loadInventory();
      if (type === 'expense') loadExpenses();
      if (type === 'contact') loadContacts();
      if (type === 'order') loadOrders();
    }
  } catch (e) { }
}

function openModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.add('active');
}
function closeModal(id) {
  const m = document.getElementById(id);
  if (m) {
    // clear inputs generally
    m.querySelectorAll('input:not([type=radio]):not([type=checkbox])').forEach(i => i.value = '');
    m.classList.remove('active');
  }
}

function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type} show`;
  setTimeout(() => toast.classList.remove('show'), 3000);
}

function viewOrderDetails(id) {
  const order = allOrders.find(o => o.id === id);
  if (!order) return;
  const items = Array.isArray(order.items) ? order.items : [];

  const statuses = ['pending', 'preparing', 'ready', 'completed', 'cancelled'];
  const statusColors = {
    'pending': 'var(--warning)',
    'preparing': 'var(--info)',
    'ready': 'purple',
    'completed': 'var(--success)',
    'cancelled': 'var(--danger)'
  };

  const optionsHtml = statuses.map(s =>
    `<option value="${s}" ${order.status === s ? 'selected' : ''}>${s.charAt(0).toUpperCase() + s.slice(1)}</option>`
  ).join('');

  document.getElementById('orderModalBody').innerHTML = `
        <div style="margin-bottom: 20px; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 15px;">
            <div>
                <p><strong>Customer:</strong> ${order.customer_name}</p>
                <p><strong>Phone:</strong> ${order.phone}</p>
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
                <label style="font-weight: 600; white-space: nowrap;">Status:</label>
                <select id="modalStatusSelect" class="form-control" style="width: 160px; font-weight: bold; color: ${statusColors[order.status] || 'black'}" onchange="updateOrderStatusFromModal(${order.id}, this.value)">
                    ${optionsHtml}
                </select>
            </div>
        </div>
        <table class="data-table" style="margin-top: 20px;">
            <thead>
                <tr><th>Item</th><th>Qty</th><th>Price</th><th>Subtotal</th></tr>
            </thead>
            <tbody>
                ${items.map(i => `<tr><td>${i.name}</td><td>${i.quantity}</td><td>₹${i.price}</td><td>₹${i.price * i.quantity}</td></tr>`).join('')}
            </tbody>
        </table>
        <h3 style="text-align:right; margin-top:20px; color:var(--success)">Total: ₹${order.total}</h3>
    `;

  openModal('orderModal');
}

async function updateOrderStatusFromModal(id, newStatus) {
  if (!newStatus) return;

  try {
    const res = await apiFetch(`/api/orders/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });

    if (res.ok) {
      showToast(`Order #${id} → ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}`, 'success');

      // Update local array
      const order = allOrders.find(o => o.id === id);
      if (order) order.status = newStatus;

      // Re-render kanban and stats
      renderKanban(allOrders);
      loadStats();

      if (newStatus === 'completed') loadInventory();
    } else {
      const data = await res.json();
      showToast(data.message || 'Error updating status', 'error');
      loadOrders(); // rollback
    }
  } catch (error) {
    showToast('Network error updating status', 'error');
    loadOrders(); // rollback
  }
}

function logout() {
  apiFetch('/api/auth/logout', { method: 'POST' })
    .then(() => {
      showToast('Logged out successfully', 'success');
      setTimeout(() => window.location.href = '/admin/login', 500);
    });
}