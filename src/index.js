const Repository = require('./Repository');

// Stores Model definitions and datastores
class Frontier {
  constructor({ models, datastores }) {
    // Object.assign(this, {
    //   models,
    //   datastores,
    // });

    // TODO: work out interaction between multiple datastores and Repositories
    const repository = new Repository({ models, datastores });
    return repository;
  }
}

module.exports = Frontier;
