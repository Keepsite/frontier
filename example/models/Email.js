const { Model } = require('../../src');

const User = require('./User');

class Email extends Model {
  static schema() {
    return {
      address: 'string',
      verified: 'boolean',
      createdByUser: { ref: User },
    };
  }
}

module.exports = Email;
