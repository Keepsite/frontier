// A Repository takes a Datastore instance and optional Model Definitions
// It is used with model instances to provide data access with a passthrough cache
class Repository {
  constructor({ models, store, options = {} }) {
    Object.assign(this, { models: {}, store, options });
    // TODO: convert to allow for multiple stores per repository
    // TODO: add FB dataloader as a cache

    if (!store) {
      if (!options.defaultStore)
        throw new Error('Repository must have at least one Datastore');
      this.store = options.defaultStore;
    }

    models.forEach(M => this.addModel(M));
  }

  hasInterface(model = this.constructor) {
    const prototype = Object.getPrototypeOf(model);
    if (prototype.name === 'Interface') {
      // Interfaces themselves should return false
      if (model === this.constructor) return false;
      return true;
    }
    if (typeof prototype === 'function') return this.hasInterface(prototype);
    return false;
  }

  addModel(Model) {
    const repository = this;
    if (this.models[Model.name])
      throw new Error(`Duplicate Model '${Model.name}'`);
    if (Model.isInterface()) {
      throw new Error(`Attempted to use Interface '${Model.name}' as Model`);
    }
    // eslint-disable-next-line no-new
    Model.validate();
    class RepositoryModel extends Model {}
    RepositoryModel.prototype.repository = repository;
    Object.defineProperty(RepositoryModel, 'name', {
      value: Model.name, // `${Model.name}Repository`
    });

    this.models[Model.name] = RepositoryModel;
  }

  async create(modelInstance, options) {
    await this.store.save(modelInstance, options);
    return modelInstance;
  }

  async find(Model, query, options) {
    // TODO: inspect the query cache
    const results = await this.store.find(Model, query, options);
    return results;
  }

  async count(Model, query, options) {
    // TODO: inspect the query cache
    const result = await this.store.count(Model, query, options);
    return result;
  }

  // TODO: review findOne implementation
  async findOne(Model, query, options) {
    // TODO: inspect the cache
    const [result] = await this.store.find(Model, query, {
      ...options,
      limit: 1,
    });
    return result;
  }

  async load(modelInstance, paths) {
    // TODO: inspect the cache
    await this.store.load(modelInstance, paths);
    return modelInstance;
    // throw new Error('Repository::load() is not yet implemented');
  }

  async save(modelInstance) {
    // TODO: update the cache
    await this.store.save(modelInstance);
    return modelInstance;
    // throw new Error('Repository::save() is not yet implemented');
  }

  async remove(modelInstance) {
    // TODO: update the cache
    await this.store.remove(modelInstance);
    return modelInstance;
    // throw new Error('Repository::remove() is not yet implemented');
  }
}

module.exports = Repository;
