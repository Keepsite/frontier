const { Model } = require('../../src');

const Email = require('./Email');

class User extends Model {
  static schema() {
    return {
      name: 'string',
      username: 'string',
      email: { ref: Email },
    };
  }
}

module.exports = User;
