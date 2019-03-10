const _ = require('lodash');
const Datastore = require('./Datastore');
const Repository = require('./Repository');
const InMemoryAdapter = require('./adapters/InMemoryAdapter');

// Stores Model definitions / datastores and creates repositories from those
class Frontier {
  constructor({ models, datastores = [] }) {
    Object.assign(this, { models, datastores });

    // TODO: use options for default repository flag
    if (!datastores.length)
      datastores.push(new Datastore({ Adapter: InMemoryAdapter }));

    const datastore = _.first(datastores);
    const defaultRepository = new Repository({ models, datastore });
    Object.assign(this, { models: defaultRepository.models, datastores });
  }

  createRepository() {
    const { models, datastores } = this;
    return new Repository({ models, datastores });
  }

  // TODO: complete this
  async ensureIndices() {
    this.models.forEach(m => {
      if (m.indices) {
        console.log({ model: m.name, indices: m.indices() });
      }
    });
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

  fromJSON(json, type) {
    const modelName = type || _.get(json, 'meta.type');
    if (!modelName)
      throw new TypeError('meta.type required to desearilise json objects');
    const ModelType = this.models[modelName];
    if (!ModelType)
      throw new TypeError(`No model named '${modelName}' was found`);
    return new ModelType(json);
  }
}

module.exports = Frontier;
