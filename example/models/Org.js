const { Model } = require('../../src');

const User = require('./User');

class Org extends Model {
  static schema() {
    return {
      name: 'string',
      users: [{ ref: User }],
      createdByUser: { ref: User },
    };
  }
}

module.exports = Org;
