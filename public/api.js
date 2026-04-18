var STORAGE_KEY = 'tradingApiBaseUrl';

function normalizeBaseUrl(value) {
  // Remove empty values
  if (value === null || value === undefined || value === '') {
    return '';
  }

  // Convert to string
  var stringValue = String(value);
  
  // Remove whitespace from both ends
  stringValue = stringValue.trim();
  
  // Remove trailing slashes
  while (stringValue.charAt(stringValue.length - 1) === '/') {
    stringValue = stringValue.substring(0, stringValue.length - 1);
  }
  
  return stringValue;
}

function getInitialBaseUrl() {
  // Check URL query parameter first
  var urlParams = new URLSearchParams(window.location.search);
  var queryBaseUrl = urlParams.get('api');
  
  if (queryBaseUrl) {
    return normalizeBaseUrl(queryBaseUrl);
  }

  // Check localStorage next
  var storedBaseUrl = window.localStorage.getItem(STORAGE_KEY);
  if (storedBaseUrl) {
    return normalizeBaseUrl(storedBaseUrl);
  }

  // Check global config variable
  if (typeof window.__API_BASE_URL__ === 'string' && window.__API_BASE_URL__) {
    return normalizeBaseUrl(window.__API_BASE_URL__);
  }

  // Use current page origin as fallback
  return normalizeBaseUrl(window.location.origin);
}

var apiBaseUrl = getInitialBaseUrl();

function getApiBaseUrl() {
  return apiBaseUrl;
}

function setApiBaseUrl(nextBaseUrl) {
  var normalized = normalizeBaseUrl(nextBaseUrl);
  apiBaseUrl = normalized;
  
  // Save to localStorage if not empty
  if (normalized) {
    window.localStorage.setItem(STORAGE_KEY, normalized);
  }
}


function buildUrl(path) {
  // Build complete URL by combining base URL with path
  var completeUrl = apiBaseUrl + '/' + path;
  // Create URL object to ensure proper formatting
  var urlObject = new URL(completeUrl);
  return urlObject.toString();
}

function request(path, options) {
  // Set default options if not provided
  if (!options) {
    options = {};
  }

  // Prepare headers
  var headers = {
    'Content-Type': 'application/json'
  };
  
  // Add any custom headers from options
  if (options.headers) {
    var customHeaders = options.headers;
    for (var headerKey in customHeaders) {
      headers[headerKey] = customHeaders[headerKey];
    }
  }

  // Build fetch request options
  var fetchOptions = {
    headers: headers,
    method: options.method || 'GET'
  };
  
  // Add body if present
  if (options.body) {
    fetchOptions.body = options.body;
  }

  // Execute fetch and handle response
  return fetch(buildUrl(path), fetchOptions)
    .catch(function(error) {
      // Handle network errors
      var networkError = new Error('Network error. Could not reach ' + apiBaseUrl);
      throw networkError;
    })
    .then(function(response) {
      // Read response text
      return response.text().then(function(text) {
        return {
          response: response,
          text: text
        };
      });
    })
    .then(function(data) {
      var response = data.response;
      var text = data.text;
      
      // Parse JSON if response has content
      var payload = null;
      if (text) {
        try {
          payload = JSON.parse(text);
        } catch (parseError) {
          payload = { raw: text };
        }
      }

      // Check if response status is OK
      if (!response.ok) {
        // Extract error message from payload
        var errorMessage = null;
        if (payload && payload.error) {
          errorMessage = payload.error;
        } else if (payload && payload.message) {
          errorMessage = payload.message;
        } else {
          errorMessage = 'Request failed (' + response.status + ')';
        }

        // Create error object with details
        var error = new Error(errorMessage);
        error.status = response.status;
        error.payload = payload;
        throw error;
      }

      return payload;
    });
}


// API object with methods for communicating with the backend
var api = {};

api.getPairs = function() {
  return request('/pairs');
};

api.getOrderBook = function(pair) {
  var query = '';
  if (pair) {
    query = '?pair=' + encodeURIComponent(pair);
  }
  var path = '/orderbook' + query;
  return request(path);
};

api.getTrades = function(pair) {
  var query = '';
  if (pair) {
    query = '?pair=' + encodeURIComponent(pair);
  }
  var path = '/trades' + query;
  return request(path);
};

api.placeOrder = function(order) {
  var options = {
    method: 'POST',
    body: JSON.stringify(order)
  };
  return request('/order', options);
};

api.cancelOrder = function(orderId) {
  var options = {
    method: 'DELETE'
  };
  var path = '/order/' + orderId;
  return request(path, options);
};
