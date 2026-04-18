var STORAGE_KEY = 'tradingApiBaseUrl';

function normalizeBaseUrl(value) {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  var stringValue = String(value).trim();
  
  while (stringValue.charAt(stringValue.length - 1) === '/') {
    stringValue = stringValue.substring(0, stringValue.length - 1);
  }
  
  return stringValue;
}

function getInitialBaseUrl() {
  var urlParams = new URLSearchParams(window.location.search);
  var queryBaseUrl = urlParams.get('api');
  
  if (queryBaseUrl) {
    return normalizeBaseUrl(queryBaseUrl);
  }

  var storedBaseUrl = window.localStorage.getItem(STORAGE_KEY);
  if (storedBaseUrl) {
    return normalizeBaseUrl(storedBaseUrl);
  }

  if (typeof window.__API_BASE_URL__ === 'string' && window.__API_BASE_URL__) {
    return normalizeBaseUrl(window.__API_BASE_URL__);
  }

  return normalizeBaseUrl(window.location.origin);
}

var apiBaseUrl = getInitialBaseUrl();

function getApiBaseUrl() {
  return apiBaseUrl;
}

function setApiBaseUrl(nextBaseUrl) {
  var normalized = normalizeBaseUrl(nextBaseUrl);
  apiBaseUrl = normalized;
  
  if (normalized) {
    window.localStorage.setItem(STORAGE_KEY, normalized);
  }
}


function buildUrl(path) {
  if (path.charAt(0) === '/') {
    return apiBaseUrl + path;
  }
  return apiBaseUrl + '/' + path;
}

function request(path, options) {
  if (!options) {
    options = {};
  }

  var headers = {
    'Content-Type': 'application/json'
  };
  
  if (options.headers) {
    for (var key in options.headers) {
      headers[key] = options.headers[key];
    }
  }

  var fetchOptions = {
    headers: headers,
    method: options.method || 'GET'
  };
  
  if (options.body) {
    fetchOptions.body = options.body;
  }

  return fetch(buildUrl(path), fetchOptions)
    .catch(function(error) {
      throw new Error('Network error. Could not reach ' + apiBaseUrl);
    })
    .then(function(response) {
      return response.text().then(function(text) {
        return { response: response, text: text };
      });
    })
    .then(function(data) {
      var response = data.response;
      var text = data.text;
      var payload = null;

      if (text) {
        try {
          payload = JSON.parse(text);
        } catch (e) {
          payload = { raw: text };
        }
      }

      if (!response.ok) {
        var msg = (payload && payload.error) || (payload && payload.message) || ('Request failed (' + response.status + ')');
        var error = new Error(msg);
        error.status = response.status;
        error.payload = payload;
        throw error;
      }

      return payload;
    });
}


var api = {};

api.getPairs = function() {
  return request('/pairs');
};

api.getOrderBook = function(pair) {
  var path = '/orderbook';
  if (pair) {
    path += '?pair=' + encodeURIComponent(pair);
  }
  return request(path);
};

api.getTrades = function(pair) {
  var path = '/trades';
  if (pair) {
    path += '?pair=' + encodeURIComponent(pair);
  }
  return request(path);
};

api.placeOrder = function(order) {
  return request('/order', {
    method: 'POST',
    body: JSON.stringify(order)
  });
};

api.cancelOrder = function(orderId) {
  return request('/order/' + orderId, {
    method: 'DELETE'
  });
};

export { getApiBaseUrl, setApiBaseUrl, api };
