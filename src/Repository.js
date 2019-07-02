const DataLoader = require('dataloader');

// A Repository takes a Datastore instance and optional Model Definitions
// It is used with model instances to provide data access with a passthrough cache
class Repository {
  static isInterface() {
    return false;
  }

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

    this.cache = new DataLoader(
      keys =>
        Promise.all(keys.map(({ Model, id }) => this.store.getById(Model, id))),
      { cacheKeyFn: ({ id }) => id }
    );
    // this.findCache = new DataLoader(keys =>
    //   Promise.all(keys.map(({ fullQS, options }) =>
    //     this.executeN1qlQuery(
    //       fullQS,
    //       _.pick(options, ['consistency', 'profile'])
    //     )
    //   )),
    //   { cacheKeyFn: ({ fullQS }) => fullQS }
    // )
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
    // console.log('Repository::addModel()', { Model });
    if (Object.constructor === Object)
      throw new Error(`Invalid Model '${Model}'`);
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

  async getById(Model, id, options) {
    return this.cache.load({ Model, id }).then(({ cas, value }) => {
      const model = new Model(value, options);
      Object.assign(model, { $: { cas } });
      return model;
    });
  }

  async create(modelInstance, options) {
    await this.store.save(modelInstance, options);
    return modelInstance;
  }

  async findOne(Model, query, options) {
    // TODO: inspect the cache
    const [result] = await this.find(Model, query, {
      ...options,
      limit: 1,
    });
    return result;
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

  async load(modelInstance, paths) {
    if (!paths || !paths.length) {
      return this.cache
        .load({ Model: modelInstance.constructor, id: modelInstance.id() })
        .then(result =>
          Object.assign(modelInstance, result.value, { $: { cas: result.cas } })
        );
    }
    return this.store.load(modelInstance, paths).then(() => modelInstance);
  }

  async save(modelInstance) {
    this.cache.clear({ id: modelInstance.id() });
    await this.store.save(modelInstance);
    return modelInstance;
  }

  async remove(modelInstance) {
    this.cache.clear({ id: modelInstance.id() });
    await this.store.remove(modelInstance);
    return modelInstance;
  }
}

module.exports = Repository;
