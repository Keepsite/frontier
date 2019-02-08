const Adapter = require('../Adapter');

class CouchbaseAdapter extends Adapter {
  constructor(args) {
    super();
    console.log('CouchbaseAdapter', { args });
  }
}

module.exports = CouchbaseAdapter;
