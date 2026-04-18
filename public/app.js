import { api, getApiBaseUrl, setApiBaseUrl } from './api.js';
import { createToastManager } from './components/toasts.js';
import { createOrderForm } from './components/orderForm.js';
import { createOrderBook } from './components/orderBook.js';
import { createTradesTable } from './components/trades.js';
import { createOpenOrdersTable } from './components/openOrders.js';

const dom = {
  pairSelect: document.getElementById('pair'),
  apiUrlInput: document.getElementById('apiUrl'),
  saveApiUrl: document.getElementById('saveApiUrl'),
  status: document.getElementById('status'),
  lastUpdated: document.getElementById('lastUpdated'),
  refreshState: document.getElementById('refreshState'),
  toastRoot: document.getElementById('toastRoot'),
  buyTab: document.getElementById('buyTab'),
  sellTab: document.getElementById('sellTab'),
  typeSelect: document.getElementById('type'),
  priceInput: document.getElementById('price'),
  quantityInput: document.getElementById('quantity'),
  submitButton: document.getElementById('placeOrder'),
  buyBookBody: document.getElementById('buyBook'),
  sellBookBody: document.getElementById('sellBook'),
  tradesBody: document.getElementById('tradesTable'),
  openOrdersBody: document.getElementById('openOrders')
};

const toast = createToastManager(dom.toastRoot);
const orderForm = createOrderForm({
  formRoot: document.querySelector('.form-panel'),
  buyTab: dom.buyTab,
  sellTab: dom.sellTab,
  typeSelect: dom.typeSelect,
  priceInput: dom.priceInput,
  quantityInput: dom.quantityInput,
  submitButton: dom.submitButton
});
const orderBook = createOrderBook({
  buyBody: dom.buyBookBody,
  sellBody: dom.sellBookBody
});
const tradesTable = createTradesTable({
  body: dom.tradesBody
});
let openOrdersTable;

const state = {
  pairs: [],
  selectedPair: '',
  orderBook: { buy: [], sell: [] },
  trades: [],
  loading: true,
  refreshing: false,
  submitting: false,
  lastUpdated: null,
  pollId: null
};

function shortId(id) {
  return String(id).slice(0, 8);
}

function formatUpdatedAt(date) {
  if (!date) {
    return 'Never';
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(date);
}

function setStatus(message, isError = false) {
  dom.status.textContent = message;
  dom.status.className = isError ? 'status error' : 'status';
}

function openOrdersFromBook(book) {
  return [...(book.buy || []), ...(book.sell || [])].filter(
    (order) => order.status === 'open' || order.status === 'partially_filled'
  );
}

function render() {
  orderBook.render({
    buy: state.orderBook.buy,
    sell: state.orderBook.sell,
    loading: state.loading
  });

  tradesTable.render({
    trades: state.trades,
    loading: state.loading
  });

  openOrdersTable.render({
    orders: openOrdersFromBook(state.orderBook),
    loading: state.loading
  });

  dom.lastUpdated.textContent = formatUpdatedAt(state.lastUpdated);
  dom.refreshState.textContent = state.refreshing ? 'Refreshing...' : 'Auto-refresh active';
  dom.pairSelect.disabled = state.loading || state.submitting;
}

async function loadPairs() {
  const pairs = await api.getPairs();
  state.pairs = pairs;
  state.selectedPair = pairs[0] || '';
  dom.pairSelect.innerHTML = pairs.map((pair) => `<option value="${pair}">${pair}</option>`).join('');
}

async function refreshData({ silent = false } = {}) {
  if (state.refreshing) {
    return;
  }

  state.refreshing = true;

  if (!silent && state.loading) {
    render();
  }

  try {
    const [book, trades] = await Promise.all([
      api.getOrderBook(state.selectedPair),
      api.getTrades(state.selectedPair)
    ]);

    state.orderBook = book;
    state.trades = trades;
    state.lastUpdated = new Date();

    if (!silent) {
      setStatus('Connected');
    }
  } catch (error) {
    setStatus(error.message, true);
    if (!silent) {
      toast.show(error.message, 'error');
    }
  } finally {
    state.loading = false;
    state.refreshing = false;
    render();
  }
}

async function placeOrder() {
  if (state.submitting) {
    return;
  }

  const payload = {
    pair: state.selectedPair,
    type: dom.typeSelect.value,
    price: Number(dom.priceInput.value),
    quantity: Number(dom.quantityInput.value)
  };

  if (!payload.pair) {
    throw new Error('Select a trading pair');
  }

  if (!payload.price || payload.price <= 0) {
    throw new Error('Price must be greater than zero');
  }

  if (!payload.quantity || payload.quantity <= 0) {
    throw new Error('Quantity must be greater than zero');
  }

  state.submitting = true;
  orderForm.setLoading(true);

  try {
    const result = await api.placeOrder(payload);
    toast.show(`Order ${shortId(result.id)} placed`, 'success');
    setStatus(`Order ${shortId(result.id)} placed`);
    orderForm.reset();
    await refreshData();
  } catch (error) {
    toast.show(error.message, 'error');
    setStatus(error.message, true);
  } finally {
    state.submitting = false;
    orderForm.setLoading(false);
  }
}

async function cancelOrder(orderId) {
  try {
    state.submitting = true;
    orderForm.setLoading(true);
    const result = await api.cancelOrder(orderId);
    toast.show(`Order ${shortId(result.id)} cancelled`, 'success');
    setStatus(`Order ${shortId(result.id)} cancelled`);
    await refreshData();
  } catch (error) {
    toast.show(error.message, 'error');
    setStatus(error.message, true);
  } finally {
    state.submitting = false;
    orderForm.setLoading(false);
  }
}

function bindEvents() {
  dom.pairSelect.addEventListener('change', async (event) => {
    state.selectedPair = event.target.value;
    await refreshData();
  });

  dom.saveApiUrl.addEventListener('click', async () => {
    const nextBaseUrl = dom.apiUrlInput.value.trim();

    if (!nextBaseUrl) {
      toast.show('Enter an API URL first', 'error');
      return;
    }

    setApiBaseUrl(nextBaseUrl);
    dom.apiUrlInput.value = getApiBaseUrl();
    toast.show(`API URL saved: ${getApiBaseUrl()}`, 'info');
    setStatus(`API connected to ${getApiBaseUrl()}`);
    state.loading = true;
    await refreshData();
  });

  dom.submitButton.addEventListener('click', async () => {
    await placeOrder();
  });
}

function initComponents() {
  openOrdersTable = createOpenOrdersTable({
    body: dom.openOrdersBody,
    onCancel: cancelOrder
  });
}

async function init() {
  dom.apiUrlInput.value = getApiBaseUrl();
  initComponents();
  bindEvents();

  try {
    await loadPairs();
    state.loading = true;
    orderForm.setSide('buy');
    await refreshData();
  } catch (error) {
    setStatus(error.message, true);
    toast.show(error.message, 'error');
  }

  state.pollId = window.setInterval(() => {
    refreshData({ silent: true }).catch((error) => {
      setStatus(error.message, true);
    });
  }, 1800);
}

init();
