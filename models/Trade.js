const { v4: uuidv4 } = require('uuid');

class Trade {
  constructor({ pair, buyOrderId, sellOrderId, price, quantity }) {
    this.id = uuidv4();
    this.pair = pair;
    this.buyOrderId = buyOrderId;
    this.sellOrderId = sellOrderId;
    this.price = price;
    this.quantity = quantity;
    this.timestamp = Date.now();
  }
}

module.exports = Trade;
