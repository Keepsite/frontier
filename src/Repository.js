/* eslint-disable class-methods-use-this */

// A Repository takes a Datastore instance and optional Model Definitions
// It is used with model instances to provide data access with a passthrough cache
class Repository {
  constructor(options) {
    const { models, datastore } = Object.assign(
      { models: [], datastore: null },
      options
    );

    const repository = this;
    Object.assign(this, {
      models: models.reduce((result, M) => {
        class RepositoryModel extends M {
          constructor(fields, modelOptions) {
            super(fields, { repository, ...modelOptions });
          }

          static getById(id, modelOptions) {
            // console.log('Repository::getById()');
            return M.getById(id, { repository, ...modelOptions });
          }
        }
        Object.defineProperty(RepositoryModel, 'name', {
          value: `${M.name}Repository`,
        });

        return { ...result, [M.name]: RepositoryModel };
      }, {}),
      datastore,
    });
  }

  // async find(modelName, query, options) {
  //   // TODO: inspect the cache
  //   throw new Error('Repository::find() is not yet implemented');
  // }

  // async findOne(modelName, query, options) {
  //   // TODO: inspect the cache
  //   throw new Error('Repository::findOne() is not yet implemented');
  // }

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
