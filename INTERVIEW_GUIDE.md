# Trading Engine - Complete Interview Guide

## Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture Deep Dive](#architecture-deep-dive)
3. [Core Concepts](#core-concepts)
4. [Code Files Explained](#code-files-explained)
5. [API Endpoints](#api-endpoints)
6. [Key Design Decisions](#key-design-decisions)
7. [Interview Talking Points](#interview-talking-points)

---

## Project Overview

### What is the Trading Engine?
A simplified in-memory trading engine with a REST API backend and interactive dashboard frontend. It handles order placement, matching, and trade execution for multiple trading pairs.

### Key Features
- **Place Orders**: Users can place limit buy/sell orders
- **FIFO Matching**: Orders matched using price-time priority (FIFO at same price)
- **Partial Fills**: Orders can be partially filled when quantity doesn't fully match
- **Order Management**: Cancel open or partially-filled orders
- **Multi-Pair Support**: Separate order books for different trading pairs (BTC/USD, KGEN/USDT)
- **Trade History**: Complete records of executed trades

### Tech Stack
- **Backend**: Node.js + Express.js
- **Frontend**: Vanilla JavaScript (ES6 modules)
- **Storage**: In-memory (no database)
- **API**: RESTful with CORS support
- **Deployment**: Render (https://trading-engine-7efm.onrender.com/)

---

## Architecture Deep Dive

### High-Level Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Frontend Client                    │
│  (Vanilla JS, React-like state management)          │
│  - Place Order Form                                 │
│  - Order Book View (Buy/Sell)                       │
│  - Trades Table                                     │
│  - Open Orders with Cancel                          │
└────────────────┬────────────────────────────────────┘
                 │ HTTP REST API
                 ▼
┌─────────────────────────────────────────────────────┐
│              Express.js Backend                      │
│ ┌──────────────────────────────────────────────┐   │
│ │ Routes Layer (orderRoutes.js)                 │   │
│ │ - POST /order                                │   │
│ │ - DELETE /order/:id                          │   │
│ │ - GET /orderbook                             │   │
│ │ - GET /trades                                │   │
│ │ - GET /pairs                                 │   │
│ └──────────────────────────────────────────────┘   │
│                     ▼                               │
│ ┌──────────────────────────────────────────────┐   │
│ │ Controllers (orderController.js)             │   │
│ │ - Validates input                            │   │
│ │ - Calls service layer                        │   │
│ │ - Returns JSON responses                     │   │
│ └──────────────────────────────────────────────┘   │
│                     ▼                               │
│ ┌──────────────────────────────────────────────┐   │
│ │ Service Layer (orderBookService.js)          │   │
│ │ - createOrder()                              │   │
│ │ - cancelOrder()                              │   │
│ │ - getOrderBook()                             │   │
│ │ - getTrades()                                │   │
│ └──────────────────────────────────────────────┘   │
│                     ▼                               │
│ ┌──────────────────────────────────────────────┐   │
│ │ Matching Engine (matchingEngine.js)          │   │
│ │ - matchBuyOrder()                            │   │
│ │ - matchSellOrder()                           │   │
│ │ - Executes trades when matches found         │   │
│ └──────────────────────────────────────────────┘   │
│                     ▼                               │
│ ┌──────────────────────────────────────────────┐   │
│ │ In-Memory Data Storage                       │   │
│ │ - orderBook: { BTC/USD: {bid[], ask[]}, ... }│   │
│ │ - trades: []                                 │   │
│ │ - ordersById: {}                             │   │
│ └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### Data Flow: Placing an Order

```
Frontend -> POST /order 
{pair: "BTC/USD", type: "buy", price: 100, quantity: 5}

Controller validates:
✓ Pair exists
✓ Type is buy/sell
✓ Price > 0
✓ Quantity > 0

Service creates Order:
- Assigns UUID, timestamps
- Status = "open"
- Remaining = quantity

Matching Engine processes:
- For BUY order: find lowest SELL price <= buy price
- For SELL order: find highest BUY price >= sell price
- FIFO at same price level

If match found:
- Create Trade record
- Update order remaining
- Update counterparty order remaining
- If fully filled: remove from order book

Send response to Frontend:
- Order ID
- Status
- Matched trades (if any)
```

---

## Core Concepts

### 1. FIFO (First In First Out) Matching

**What it means**: When multiple orders exist at the same price, older orders match before newer ones.

**Example**:
```
Order Book at price 100:
- BUY Order A placed at 10:00:00 (quantity: 10)
- BUY Order B placed at 10:00:05 (quantity: 5)

New SELL Order arrives at 10:00:10 (quantity: 8) at price 100

Result:
- Order A (older) matches FIRST: 8 units executed
- Order A remaining: 2 units
- Order B: untouched (still waiting)
```

### 2. Price-Time Priority

The matching engine uses two criteria:
1. **Price**: Best price first
   - Buy orders match against lowest seller first
   - Sell orders match against highest buyer first

2. **Time**: FIFO at same price level
   - Older orders have priority over newer ones

**Example**:
```
SELL Order Book:
- Price 100: 10 units (oldest)
- Price 100: 5 units (newest)
- Price 101: 20 units

New BUY Order at price 100 (quantity: 12):
Result:
- First matches 10 units at price 100 (oldest order)
- Then matches 2 units at price 100 (newest order, 3 remaining)
- Does NOT match the 101 order (wrong price)
```

### 3. Partial Fills

An order can be filled in multiple trades.

**Statuses**:
- `open`: Just created, no trades yet
- `partially_filled`: Some trades executed, quantity remains
- `filled`: All quantity executed
- `cancelled`: Manually cancelled

**Example**:
```
Original BUY Order: 100 units at price 50

Trade 1: 30 units executed → remaining: 70
Status: partially_filled

Trade 2: 50 units executed → remaining: 20
Status: still partially_filled

Trade 3: 20 units executed → remaining: 0
Status: filled (automatically removed from order book)
```

### 4. Pair Isolation

Each trading pair has its own separate order book.

**Example**:
```
BTC/USD Order Book:
- BID: 100 units at 49000
- ASK: 50 units at 49500

KGEN/USDT Order Book:
- BID: 1000 units at 50
- ASK: 500 units at 51

A BUY order in BTC/USD will NEVER match with orders in KGEN/USDT
```

---

## Code Files Explained

### 1. **app.js** - Express Server Entry Point

**Purpose**: Initialize Express server, set up middleware, handle errors

**Full Code**:
```javascript
const express = require('express');
const path = require('path');
const orderRoutes = require('./routes/orderRoutes');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware: Parse JSON
app.use(express.json());

// Middleware: CORS
app.use((req, res, next) => {
  const allowedOrigin = process.env.CORS_ORIGIN || '*';

  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
});

// Middleware: Serve static files (frontend)
app.use(express.static(path.join(__dirname, 'public')));

// Middleware: Request logging (skip noisy GET endpoints)
app.use((req, res, next) => {
  const noisyGetPaths = new Set(['/orderbook', '/trades', '/pairs', '/health']);

  if (!(req.method === 'GET' && noisyGetPaths.has(req.path))) {
    logger.info('HTTP request', {
      method: req.method,
      path: req.path
    });
  }

  next();
});

// Routes
app.use('/', orderRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Error handler
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({ error: message });
});

// Start server
const server = app.listen(PORT, () => {
  logger.info('Trading engine API started', { port: PORT });
});

// Handle EADDRINUSE gracefully
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    logger.error('Port is already in use', {
      port: PORT,
      hint: 'Stop the existing process or use a different PORT'
    });
    process.exit(1);
  }
});
```

**Key Concepts**:
- Express middleware stack (JSON, CORS, logging, static files)
- OPTIONS preflight for CORS
- Error handling and graceful shutdown
- Environment variable for PORT

---

### 2. **config/marketConfig.js** - Market Configuration

**Purpose**: Define supported trading pairs

**Full Code**:
```javascript
const PAIRS = ['BTC/USD', 'KGEN/USDT'];

const validatePair = (pair) => {
  if (!PAIRS.includes(pair)) {
    throw new Error(`Invalid pair. Supported: ${PAIRS.join(', ')}`);
  }
};

module.exports = {
  PAIRS,
  validatePair
};
```

**Why This Design**:
- Centralized pair management (easy to add/remove pairs)
- Validation function reused across codebase
- Single source of truth

---

### 3. **models/Order.js** - Order Data Model

**Purpose**: Define Order object structure

**Full Code**:
```javascript
const { v4: uuidv4 } = require('uuid');

class Order {
  constructor(pair, type, price, quantity) {
    this.id = uuidv4();
    this.pair = pair;
    this.type = type; // 'buy' or 'sell'
    this.price = price;
    this.quantity = quantity;
    this.remaining = quantity; // Quantity not yet matched
    this.status = 'open'; // 'open', 'partially_filled', 'filled', 'cancelled'
    this.createdAt = new Date();
  }
}

module.exports = Order;
```

**Key Fields**:
- `id`: Unique identifier (UUID)
- `type`: 'buy' or 'sell'
- `remaining`: Tracks unfilled quantity (crucial for partial fills)
- `status`: Order lifecycle status
- `createdAt`: Timestamp for FIFO matching

---

### 4. **models/Trade.js** - Trade Record Model

**Purpose**: Record executed trades

**Full Code**:
```javascript
const { v4: uuidv4 } = require('uuid');

class Trade {
  constructor(pair, buyOrderId, sellOrderId, price, quantity) {
    this.id = uuidv4();
    this.pair = pair;
    this.buyOrderId = buyOrderId;
    this.sellOrderId = sellOrderId;
    this.price = price;
    this.quantity = quantity;
    this.timestamp = new Date();
  }
}

module.exports = Trade;
```

**Why This Structure**:
- Immutable record of what happened
- Links to both buy and sell orders
- Useful for audit trail and trade history

---

### 5. **engine/matchingEngine.js** - Core Matching Logic

**Purpose**: Match buy/sell orders and create trades

**Full Code**:
```javascript
const { Trade } = require('../models');

class MatchingEngine {
  constructor(orderBook, trades) {
    this.orderBook = orderBook;
    this.trades = trades;
  }

  /**
   * Match a new BUY order against existing SELL orders
   * Buy order matches against LOWEST sell price first
   */
  matchBuyOrder(buyOrder) {
    const pair = buyOrder.pair;
    const sellOrders = this.orderBook[pair]?.ask || [];

    // Sort by price ascending, then by time (createdAt)
    const sortedSells = sellOrders
      .sort((a, b) => {
        if (a.price !== b.price) {
          return a.price - b.price; // Lowest price first
        }
        return a.createdAt - b.createdAt; // FIFO at same price
      });

    for (const sellOrder of sortedSells) {
      if (buyOrder.remaining === 0) break;

      // Match condition: buy.price >= sell.price
      if (buyOrder.price < sellOrder.price) {
        break; // No more matches possible
      }

      // Execute trade
      const tradeQty = Math.min(buyOrder.remaining, sellOrder.remaining);
      const trade = new (require('../models/Trade'))(
        pair,
        buyOrder.id,
        sellOrder.id,
        sellOrder.price, // Trade at seller's price
        tradeQty
      );

      this.trades.push(trade);

      buyOrder.remaining -= tradeQty;
      sellOrder.remaining -= tradeQty;

      // Update statuses
      if (buyOrder.remaining === 0) {
        buyOrder.status = 'filled';
      } else {
        buyOrder.status = 'partially_filled';
      }

      if (sellOrder.remaining === 0) {
        sellOrder.status = 'filled';
      } else {
        sellOrder.status = 'partially_filled';
      }
    }
  }

  /**
   * Match a new SELL order against existing BUY orders
   * Sell order matches against HIGHEST buy price first
   */
  matchSellOrder(sellOrder) {
    const pair = sellOrder.pair;
    const buyOrders = this.orderBook[pair]?.bid || [];

    // Sort by price descending, then by time (createdAt)
    const sortedBuys = buyOrders
      .sort((a, b) => {
        if (a.price !== b.price) {
          return b.price - a.price; // Highest price first
        }
        return a.createdAt - b.createdAt; // FIFO at same price
      });

    for (const buyOrder of sortedBuys) {
      if (sellOrder.remaining === 0) break;

      // Match condition: buy.price >= sell.price
      if (buyOrder.price < sellOrder.price) {
        break; // No more matches possible
      }

      // Execute trade
      const tradeQty = Math.min(sellOrder.remaining, buyOrder.remaining);
      const trade = new (require('../models/Trade'))(
        pair,
        buyOrder.id,
        sellOrder.id,
        buyOrder.price, // Trade at buyer's price
        tradeQty
      );

      this.trades.push(trade);

      sellOrder.remaining -= tradeQty;
      buyOrder.remaining -= tradeQty;

      // Update statuses
      if (sellOrder.remaining === 0) {
        sellOrder.status = 'filled';
      } else {
        sellOrder.status = 'partially_filled';
      }

      if (buyOrder.remaining === 0) {
        buyOrder.status = 'filled';
      } else {
        buyOrder.status = 'partially_filled';
      }
    }
  }
}

module.exports = MatchingEngine;
```

**Interview Talking Points**:
1. **Why sort by price then time?**
   - Best price for market efficiency
   - FIFO ensures fairness among same-price orders

2. **Why trade at specific price?**
   - Buy order matches: trade at SELL price (seller's asking price)
   - Sell order matches: trade at BUY price (buyer's offer price)
   - Follows market convention

3. **Why break when no match possible?**
   - Optimization: remaining orders impossible to match
   - Reduces unnecessary iterations

---

### 6. **services/orderBookService.js** - Order Book Management

**Purpose**: Manage order book state (create, cancel, retrieve orders)

**Full Code** (abbreviated):
```javascript
const Order = require('../models/Order');
const { validatePair } = require('../config/marketConfig');
const MatchingEngine = require('../engine/matchingEngine');

class OrderBookService {
  constructor() {
    this.orderBook = {};
    this.trades = [];
    this.ordersById = {};
    this.matchingEngine = new MatchingEngine(this.orderBook, this.trades);

    // Initialize empty order books for each pair
    const { PAIRS } = require('../config/marketConfig');
    PAIRS.forEach(pair => {
      this.orderBook[pair] = { bid: [], ask: [] };
    });
  }

  /**
   * Create a new order and attempt to match it
   */
  createOrder(pair, type, price, quantity) {
    validatePair(pair);

    if (type !== 'buy' && type !== 'sell') {
      throw new Error('Invalid type. Use "buy" or "sell"');
    }

    const order = new Order(pair, type, price, quantity);
    this.ordersById[order.id] = order;

    // Attempt matching
    if (type === 'buy') {
      this.matchingEngine.matchBuyOrder(order);
    } else {
      this.matchingEngine.matchSellOrder(order);
    }

    // Add unfilled portion to order book
    if (order.remaining > 0) {
      const side = type === 'buy' ? 'bid' : 'ask';
      this.orderBook[pair][side].push(order);
    }

    return order;
  }

  /**
   * Cancel an order (only if open or partially_filled)
   */
  cancelOrder(orderId) {
    const order = this.ordersById[orderId];

    if (!order) {
      throw new Error('Order not found');
    }

    if (order.status === 'filled') {
      throw new Error('Cannot cancel a filled order');
    }

    if (order.status === 'cancelled') {
      throw new Error('Order already cancelled');
    }

    // Remove from order book
    const side = order.type === 'buy' ? 'bid' : 'ask';
    const index = this.orderBook[order.pair][side].findIndex(o => o.id === orderId);
    if (index !== -1) {
      this.orderBook[order.pair][side].splice(index, 1);
    }

    order.status = 'cancelled';
    return order;
  }

  /**
   * Get order book for a pair (or all pairs)
   */
  getOrderBook(pair = null) {
    if (pair) {
      validatePair(pair);
      const bid = this.orderBook[pair].bid.map(o => ({
        id: o.id,
        price: o.price,
        quantity: o.remaining,
        status: o.status
      }));
      const ask = this.orderBook[pair].ask.map(o => ({
        id: o.id,
        price: o.price,
        quantity: o.remaining,
        status: o.status
      }));
      return { pair, bid, ask };
    }

    // Return for all pairs
    const result = {};
    const { PAIRS } = require('../config/marketConfig');
    PAIRS.forEach(p => {
      result[p] = this.getOrderBook(p);
    });
    return result;
  }

  /**
   * Get trades (optionally filtered by pair)
   */
  getTrades(pair = null) {
    if (!pair) return this.trades;
    return this.trades.filter(t => t.pair === pair);
  }

  /**
   * Get all configured pairs
   */
  getPairs() {
    const { PAIRS } = require('../config/marketConfig');
    return PAIRS;
  }
}

// Singleton instance
let service = null;

const getInstance = () => {
  if (!service) {
    service = new OrderBookService();
  }
  return service;
};

module.exports = { getInstance };
```

**Key Design Decisions**:
1. **Singleton Pattern**: One instance shared across all requests
   - Maintains consistent state across API calls
   - Easy to reset for testing

2. **Separate bid/ask arrays**: 
   - Performance: Quick filtering by side
   - Clarity: Easy to understand structure

3. **ordersById map**: 
   - Quick order lookup (O(1) vs O(n))
   - Needed for cancel operations

---

### 7. **controllers/orderController.js** - HTTP Request Handlers

**Purpose**: Validate requests and call service layer

**Full Code** (abbreviated):
```javascript
const { getInstance: getOrderBookService } = require('../services/orderBookService');
const logger = require('../utils/logger');

const orderBookService = getOrderBookService();

const placeOrder = (req, res, next) => {
  try {
    const { pair, type, price, quantity } = req.body;

    // Validation
    if (!pair || !type || price === undefined || quantity === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (price <= 0) {
      return res.status(400).json({ error: 'Price must be greater than 0' });
    }

    if (quantity <= 0) {
      return res.status(400).json({ error: 'Quantity must be greater than 0' });
    }

    const order = orderBookService.createOrder(pair, type, price, quantity);

    logger.info('Order processed', { orderId: order.id, status: order.status });

    res.status(201).json(order);
  } catch (error) {
    logger.error('Order placement failed', { error: error.message });
    res.status(400).json({ error: error.message });
  }
};

const cancelOrder = (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: 'Order ID required' });
    }

    const order = orderBookService.cancelOrder(id);

    logger.info('Order cancelled', { orderId: id });

    res.status(200).json(order);
  } catch (error) {
    logger.error('Order cancellation failed', { error: error.message });
    res.status(400).json({ error: error.message });
  }
};

// ... other handlers

module.exports = {
  placeOrder,
  cancelOrder,
  getOrderBook,
  getTrades,
  getPairs
};
```

**Design Pattern**: MVC (Model-View-Controller)
- **Model**: Order, Trade classes
- **View**: JSON responses
- **Controller**: Business logic orchestration

---

### 8. **routes/orderRoutes.js** - API Route Definitions

**Purpose**: Define HTTP endpoints

**Full Code**:
```javascript
const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

router.post('/order', orderController.placeOrder);
router.delete('/order/:id', orderController.cancelOrder);
router.get('/orderbook', orderController.getOrderBook);
router.get('/trades', orderController.getTrades);
router.get('/pairs', orderController.getPairs);

module.exports = router;
```

**REST Conventions**:
- POST for create
- DELETE for remove
- GET for retrieve
- Query params for filtering (e.g., ?pair=BTC/USD)

---

### 9. **utils/logger.js** - Logging Utility

**Purpose**: Structured logging for debugging

**Full Code**:
```javascript
const logger = {
  info: (message, data = {}) => {
    console.log(`[INFO] ${message}`, JSON.stringify(data));
  },
  error: (message, data = {}) => {
    console.error(`[ERROR] ${message}`, JSON.stringify(data));
  }
};

module.exports = logger;
```

**Why This Matters**:
- Consistent log format
- Easy to filter and search logs
- Structured data for debugging

---

## Frontend Code Files

### 10. **public/api.js** - Centralized API Service

**Purpose**: Single source of truth for backend communication

**Key Features**:
```javascript
// Configurable API base URL
// Priority: localStorage → query param → window.origin
getApiBaseUrl()

// All API methods encapsulated
await api.getPairs()
await api.getOrderBook(pair)
await api.getTrades(pair)
await api.placeOrder(orderData)
await api.cancelOrder(orderId)
```

**Benefits**:
- Easy to change backend URL without modifying components
- Centralized error handling
- Consistent header configuration

---

### 11. **public/app.js** - Frontend Application Logic

**Purpose**: Main frontend controller

**Key Responsibilities**:
- State management (pairs, selectedPair, orderBook, trades)
- Poll API every 1.8 seconds
- Handle form submission
- Manage loading states
- Toast notifications

**Architecture**:
- React-like `useState` pattern in vanilla JS
- Functional components (orderForm, orderBook, trades, etc.)
- Event delegation for cancel buttons

---

### 12. **public/components/** - Modular Components

**5 Separate Component Files**:

1. **orderForm.js**: Buy/Sell form with loading state
2. **orderBook.js**: Bid/Ask order display with skeleton loaders
3. **trades.js**: Trade history table with time formatting
4. **openOrders.js**: Open orders with cancel functionality
5. **toasts.js**: Toast notifications (success, error, info)

**Component Pattern**:
```javascript
const component = {
  render(data) { /* return HTML */ },
  onEvent(callback) { /* attach listeners */ }
}
```

---

### 13. **public/index.html** - Single Page App Shell

**Structure**:
```html
<header class="topbar">
  <!-- API URL Config -->
</header>

<main class="shell">
  <section class="hero">
    <!-- Status + Last Update -->
  </section>

  <div class="workspace">
    <div class="panel place-order">
      <!-- Order Form: Pair selector, Buy/Sell tabs, Price, Qty -->
    </div>

    <div class="panel order-book">
      <!-- Order Book: Bid/Ask tables -->
    </div>

    <div class="panel trades">
      <!-- Trades Table -->
    </div>

    <div class="panel open-orders">
      <!-- Open Orders with Cancel -->
    </div>
  </div>
</main>

<div id="toast-root"></div>
```

---

### 14. **public/style.css** - Terminal Aesthetic Styling

**Design Principles**:
- Terminal/hacker aesthetic
- Neon green for buy, red for sell
- Smooth animations and transitions
- Responsive grid layout
- Accessible color contrasts

**Key Features**:
- Skeleton loaders for loading states
- Toast notifications with auto-dismiss
- Color-coded rows (buy=green, sell=red)
- Dark mode optimized

---

## API Endpoints

### POST /order
**Create a new order**

```bash
curl -X POST http://localhost:3000/order \
  -H "Content-Type: application/json" \
  -d '{
    "pair": "BTC/USD",
    "type": "buy",
    "price": 100,
    "quantity": 5
  }'
```

**Response**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "pair": "BTC/USD",
  "type": "buy",
  "price": 100,
  "quantity": 5,
  "remaining": 2,
  "status": "partially_filled",
  "createdAt": "2024-04-18T10:30:00.000Z"
}
```

### DELETE /order/:id
**Cancel an order**

```bash
curl -X DELETE http://localhost:3000/order/550e8400-e29b-41d4-a716-446655440000
```

**Response**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "cancelled"
}
```

### GET /orderbook?pair=BTC%2FUSD
**Retrieve order book**

```bash
curl http://localhost:3000/orderbook?pair=BTC%2FUSD
```

**Response**:
```json
{
  "pair": "BTC/USD",
  "bid": [
    {
      "id": "order-123",
      "price": 99,
      "quantity": 10,
      "status": "open"
    }
  ],
  "ask": [
    {
      "id": "order-456",
      "price": 101,
      "quantity": 5,
      "status": "open"
    }
  ]
}
```

### GET /trades?pair=BTC%2FUSD
**Get executed trades**

```bash
curl http://localhost:3000/trades?pair=BTC%2FUSD
```

**Response**:
```json
[
  {
    "id": "trade-123",
    "pair": "BTC/USD",
    "buyOrderId": "order-111",
    "sellOrderId": "order-222",
    "price": 100,
    "quantity": 5,
    "timestamp": "2024-04-18T10:31:00.000Z"
  }
]
```

### GET /pairs
**Get configured trading pairs**

```bash
curl http://localhost:3000/pairs
```

**Response**:
```json
["BTC/USD", "KGEN/USDT"]
```

### GET /health
**Health check**

```bash
curl http://localhost:3000/health
```

**Response**:
```json
{"status": "ok"}
```

---

## Key Design Decisions

### 1. **In-Memory Storage (No Database)**
**Decision**: Store everything in Node process memory

**Pros**:
- Fast access (O(1) for lookups)
- No network latency
- Simple implementation
- Perfect for demo/prototype

**Cons**:
- Data lost on restart
- No persistence
- Single-instance only
- Memory limitations

**Interview Answer**:
> "We chose in-memory storage because it's a simplified demo. For production, we'd use a database like PostgreSQL or MongoDB for persistence. The architecture is designed to support this switch via the Service layer abstraction—we could swap the storage implementation without changing the API or matching engine."

### 2. **Singleton Pattern for Order Book**
**Decision**: Single instance shared across all requests

**Pros**:
- Consistent state across API calls
- Easy to reason about
- Simple implementation

**Cons**:
- Not thread-safe in multithreaded environments
- Can't have multiple instances

**Production Approach**:
> "Move state to database. OrderBookService would query/update DB instead of in-memory maps."

### 3. **REST API Instead of WebSockets**
**Decision**: Traditional REST polling

**Pros**:
- Simple to implement
- Works everywhere
- Easy debugging (standard HTTP tools)

**Cons**:
- Polling latency (1.8s in our demo)
- Network overhead

**For Production**:
> "We'd add WebSocket support for real-time updates. Frontend would open persistent connection, receive trade/order updates instantly."

### 4. **Vanilla JS Frontend**
**Decision**: No React, Vue, or frameworks

**Pros**:
- No build step
- Lightweight
- Educational (see pure JS patterns)
- Works in older browsers

**Cons**:
- More boilerplate than modern frameworks
- Manual DOM updates
- State management complexity

**Trade-off Explanation**:
> "For a learning project, vanilla JS is perfect. For a real app, React would reduce code verbosity. We used component patterns to mimic modern frameworks."

### 5. **FIFO Matching (Not Price-Weighted)**
**Decision**: Same-price orders execute FIFO, not by order size

**Alternative**: Pro-rata (match by size allocation)

**Why FIFO**:
- Fair to all order sizes
- Easy to understand
- Prevents large orders from jumping queue
- Matches real exchange behavior (most exchanges use FIFO)

---

## Interview Talking Points

### "Walk us through how an order gets matched"

```
Step 1: Frontend sends POST /order
  Payload: {pair: "BTC/USD", type: "buy", price: 100, quantity: 10}

Step 2: Server validates
  ✓ Pair exists (BTC/USD)
  ✓ Type is buy/sell
  ✓ Price > 0 and quantity > 0

Step 3: Create Order object
  - Assign UUID
  - Set status = "open"
  - Set remaining = quantity

Step 4: Matching Engine processes
  - For BUY order: find SELL orders with price <= 100
  - Sort by price (lowest first), then time (FIFO)
  - For each matching SELL order:
    * Trade quantity = min(buy.remaining, sell.remaining)
    * Create Trade record
    * Update both remaining quantities
    * Update both statuses

Step 5: Add to order book
  - If remaining > 0, add to bid queue
  - If remaining = 0, don't add (fully filled)

Step 6: Return to frontend
  - Include order ID and status
  - Frontend displays result

Step 7: Frontend polls
  - Every 1.8 seconds, fetch /orderbook and /trades
  - Display real-time updates
```

### "How do you ensure orders are matched fairly?"

```
1. Price Priority: Best price matches first
   - Buy orders match lowest seller
   - Sell orders match highest buyer
   
2. Time Priority (FIFO): Same price = oldest first
   - Prevents newer orders from jumping queue
   - Fair to all traders
   
3. FIFO at Execution: Process matches in queue order
   - No skipping or cherry-picking
   - Consistent with market standards

Example of fairness:
  Order A: BUY 10 @ 100 (placed at 10:00)
  Order B: BUY 5 @ 100 (placed at 10:01)
  Order C: SELL 12 @ 100 (placed at 10:02)
  
  Result:
  - Order A gets 10 units (older = priority)
  - Order B gets 2 units (remaining from C)
  - No unfair advantage to either B
```

### "What happens with partial fills?"

```
Original Order: BUY 100 @ price 50

Status Flow:
  1. open → no trades yet
  2. partially_filled → some quantity matched
  3. filled → all quantity matched, removed from orderbook
  4. cancelled → manually cancelled while open/partially_filled

Example with multiple trades:
  Trade 1: 30 units @ 50 → remaining: 70, status: partially_filled
  Trade 2: 50 units @ 50 → remaining: 20, status: partially_filled
  Trade 3: 20 units @ 50 → remaining: 0, status: filled (auto-removed)
  
The Trade history would show all 3 trades linked to the original order ID
```

### "How would you scale this for production?"

```
Current bottlenecks:
1. In-memory storage
   → Add database (PostgreSQL/MongoDB)
   → OrderBookService queries DB instead of arrays
   
2. Single-instance limitation
   → Use Redis for distributed state
   → Ensure instance consistency with transactions
   
3. REST polling latency
   → Add WebSocket support
   → Instant trade/order notifications
   
4. Order matching speed
   → Optimize matching engine (use trees/heaps for prices)
   → Consider Rust for performance-critical parts
   
5. Frontend responsiveness
   → Server-Sent Events (SSE) instead of polling
   → Or switch to WebSockets
   
6. Security
   → User authentication (JWT)
   → Order rate limiting
   → Input validation (already done)
   → API authentication

Architecture would remain same:
Routes → Controllers → Service → Matching Engine
Only swap storage implementation
```

### "What edge cases did you handle?"

```
1. Price/quantity validation
   → Must be > 0
   → Prevents invalid orders
   
2. Status transitions
   → Can only cancel open/partially_filled orders
   → Prevents cancelling already-filled orders
   
3. Insufficient remaining quantity
   → Matches only available quantity
   → Updates remaining correctly
   
4. Pair-specific order books
   → BTC/USD separate from KGEN/USDT
   → Prevents cross-pair matching
   
5. Duplicate order ID prevention
   → Using UUID (essentially impossible collision)
   
6. CORS preflight
   → Handle OPTIONS requests
   → Allow cross-origin API calls
   
7. Server port already in use
   → Graceful error handling
   → Clear error message to user
```

### "Describe the matching algorithm"

```
BUY Order Matching (matchBuyOrder):
  1. Get all SELL orders for pair
  2. Sort by price ascending (lowest first)
  3. For each SELL at same price, sort by createdAt (FIFO)
  4. For each SELL:
     - If sell.price > buy.price: STOP (no more matches)
     - tradeQty = min(buy.remaining, sell.remaining)
     - Create Trade record
     - Update both remaining
     - Update both statuses
  5. Done

SELL Order Matching (matchSellOrder):
  1. Get all BUY orders for pair
  2. Sort by price descending (highest first)
  3. For each BUY at same price, sort by createdAt (FIFO)
  4. For each BUY:
     - If buy.price < sell.price: STOP (no more matches)
     - tradeQty = min(sell.remaining, buy.remaining)
     - Create Trade record
     - Update both remaining
     - Update both statuses
  5. Done

Why this works:
  - Buy orders match sellers willing to accept lower prices
  - Sell orders match buyers willing to pay higher prices
  - FIFO ensures fairness at same price
  - Early termination optimization
```

### "How do you prevent race conditions?"

```
In our implementation:
  - Single-threaded Node.js (JavaScript)
  - Async operations don't overlap order matching
  - Each request fully processed before next

However, improvements for scale:
  - Use transactions in database
  - Lock order book during matching
  - Queue orders, process sequentially
  
Example of potential issue:
  User A places BUY order
  User B places SELL order
  
  If processed in parallel:
  - Both see old order book state
  - Wrong quantities matched
  
  Solution:
  - Queue or lock mechanism
  - Process strictly sequential
  - Database transactions
```

### "Why is FIFO important?"

```
Without FIFO (random/arbitrary):
  - Unfair advantage to some traders
  - Can be manipulated
  - Traders lose trust
  
With FIFO:
  - Predictable
  - Fair (first come, first served)
  - Matches real-world exchanges
  
Example of unfairness without FIFO:
  Order A: BUY 10 @ 100 (placed at 10:00)
  Order B: BUY 5 @ 100 (placed at 10:01)
  
  Without FIFO:
  - Could randomly pick B first (newer = disadvantage to A)
  - No guarantee
  
  With FIFO:
  - Always A first
  - A knows: oldest orders get priority
  - Encourages early participation
```

### "What is your frontend architecture?"

```
Core pattern:
  - State object: { pairs, selectedPair, orderBook, trades, loading }
  - Modular components: each manages own rendering
  - Polling loop: every 1.8s fetch /orderbook and /trades
  - Event handlers: form submit, cancel button, config save
  
Why modular components:
  - Separation of concerns
  - Easy to test individual components
  - Easy to modify UI
  - Reusable patterns

Data flow:
  1. init() → fetch initial data
  2. render() → display UI based on state
  3. event listener → user interaction
  4. API call → get/post/delete
  5. state update → update state object
  6. render() → update UI
  7. setInterval(refresh) → keeps polling

Component structure:
  - orderForm: manages form state
  - orderBook: displays bid/ask
  - trades: displays trade history
  - openOrders: displays open orders, cancel handler
  - toasts: notification system
```

---

## Summary

This trading engine demonstrates:

1. **Backend Architecture**:
   - Clean separation of concerns (routes → controllers → services)
   - Core matching engine with FIFO/price-time priority
   - In-memory order book and trade history
   - REST API with proper error handling

2. **Matching Logic**:
   - Price-time priority matching
   - FIFO at same price level
   - Partial fill support
   - Pair isolation

3. **Frontend Implementation**:
   - Vanilla JavaScript with component pattern
   - Real-time polling (1.8s refresh)
   - Loading states and error handling
   - Toast notifications

4. **Production Readiness**:
   - Deployed on Render
   - Complete API documentation
   - Graceful error handling
   - Configurable API URLs

**Key Takeaways for Interview**:
- Understand WHY each design choice was made
- Be able to explain tradeoffs
- Know how to scale it
- Understand the matching algorithm deeply
- Explain edge cases and how you handled them

Good luck with your interview! 🚀
