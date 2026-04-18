const { v4: uuidv4 } = require('uuid');

class Order {
  constructor({ pair, type, price, quantity }) {
    this.id = uuidv4();
    this.pair = pair;
    this.type = type;
    this.price = Number(price);
    this.quantity = Number(quantity);
    this.remaining = Number(quantity);
    this.status = 'open';
    this.timestamp = Date.now();
  }
}

module.exports = Order;
