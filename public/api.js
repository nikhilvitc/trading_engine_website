const STORAGE_KEY = 'tradingApiBaseUrl';

function normalizeBaseUrl(value) {
  if (!value) {
    return '';
  }

  return String(value).trim().replace(/\/+$/, '');
}

function getInitialBaseUrl() {
  const params = new URLSearchParams(window.location.search);
  const queryBaseUrl = params.get('api');

  if (queryBaseUrl) {
    return normalizeBaseUrl(queryBaseUrl);
  }

  const storedBaseUrl = window.localStorage.getItem(STORAGE_KEY);
  if (storedBaseUrl) {
    return normalizeBaseUrl(storedBaseUrl);
  }

  if (typeof window.__API_BASE_URL__ === 'string' && window.__API_BASE_URL__) {
    return normalizeBaseUrl(window.__API_BASE_URL__);
  }

  return normalizeBaseUrl(window.location.origin);
}

let apiBaseUrl = getInitialBaseUrl();

export function getApiBaseUrl() {
  return apiBaseUrl;
}

export function setApiBaseUrl(nextBaseUrl) {
  apiBaseUrl = normalizeBaseUrl(nextBaseUrl);
  if (apiBaseUrl) {
    window.localStorage.setItem(STORAGE_KEY, apiBaseUrl);
  }
}

function buildUrl(path) {
  return new URL(path, `${apiBaseUrl}/`).toString();
}

async function request(path, options = {}) {
  let response;

  try {
    response = await fetch(buildUrl(path), {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      ...options
    });
  } catch (error) {
    throw new Error(`Network error. Could not reach ${apiBaseUrl}`);
  }

  const text = await response.text();
  let payload = null;

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch (_error) {
      payload = { raw: text };
    }
  }

  if (!response.ok) {
    const message = payload?.error || payload?.message || `Request failed (${response.status})`;
    const error = new Error(message);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

export const api = {
  getPairs() {
    return request('/pairs');
  },

  getOrderBook(pair) {
    const query = pair ? `?pair=${encodeURIComponent(pair)}` : '';
    return request(`/orderbook${query}`);
  },

  getTrades(pair) {
    const query = pair ? `?pair=${encodeURIComponent(pair)}` : '';
    return request(`/trades${query}`);
  },

  placeOrder(order) {
    return request('/order', {
      method: 'POST',
      body: JSON.stringify(order)
    });
  },

  cancelOrder(orderId) {
    return request(`/order/${orderId}`, {
      method: 'DELETE'
    });
  }
};
