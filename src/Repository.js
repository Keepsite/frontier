// A Repository takes a Datastore instance and optional Model Definitions
// It is used with model instances to provide data access with a passthrough cache
class Repository {
  constructor(options) {
    const { models, datastore } = Object.assign(
      this,
      // TODO: convert to allow for multiple datastores per repository
      // TODO: add FB dataloader as a cache
      { models: {}, datastore: null },
      options
    );

    if (!datastore)
      throw new Error('Repository must have at least one Datastore');

    models.forEach(M => this.addModel(M));
  }

  addModel(Model) {
    const repository = this;
    if (this.models[Model.name])
      throw new Error(`Duplicate Model '${Model.name}'`);
    // eslint-disable-next-line no-new
    Model.validate(); // validate model
    class RepositoryModel extends Model {}
    RepositoryModel.prototype.repository = repository;
    Object.defineProperty(RepositoryModel, 'name', {
      value: `${Model.name}Repository`,
    });

    this.models[Model.name] = RepositoryModel;
  }

  async find(Model, query, options) {
    // TODO: inspect the query cache
    const results = await this.datastore.find(Model, query, options);
    return results;
  }

  // TODO: review findOne implementation
  async findOne(Model, query, options) {
    // TODO: inspect the cache
    const [result] = await this.datastore.find(Model, query, {
      ...options,
      limit: 1,
    });
    return result;
  }

  async load(model) {
    // console.log('Repository::load()');
    // TODO: inspect the cache
    await this.datastore.load(model);
    return model;
    // throw new Error('Repository::load() is not yet implemented');
  }

  async save(model) {
    // TODO: update the cache
    await this.datastore.save(model);
    return model;
    // throw new Error('Repository::save() is not yet implemented');
  }

  async remove(model) {
    // TODO: update the cache
    await this.datastore.remove(model);
    return model;
    // throw new Error('Repository::remove() is not yet implemented');
  }
}

module.exports = Repository;
