const _ = require('lodash');

const Model = require('./Model');
const Field = require('./Field');
const Interface = require('./Interface');
const Datastore = require('./Datastore');
const Repository = require('./Repository');
const InMemoryAdapter = require('./adapters/InMemoryAdapter');

// Stores Model definitions / datastores and creates repositories from those
class Frontier {
  constructor({ models = [], datastores = [], options = {} }) {
    Object.assign(this, {
      models,
      datastores,
      options: Object.assign(
        {
          defaultStore: new Datastore({ Adapter: InMemoryAdapter }),
        },
        options
      ),
    });

    Object.assign(this, {
      defaultRepository: this.createRepository(_.first(datastores)),
    });
  }

  createRepository(store) {
    const {
      models,
      datastores,
      options: { defaultStore },
    } = this;

    if (!store) return new Repository({ models, store: defaultStore });
    if (typeof store === 'string') {
      // find store name in datastores
      const datastore = datastores.find(s => s.name === store);
      if (!datastore) throw new Error(`Could not find store '${store}'`);
      return new Repository({ models, store: datastore });
    }
    return new Repository({ models, store });
  }

  // TODO: complete this
  async ensureIndices() {
    this.models.forEach(m => {
      if (m.indices) {
        console.log({ model: m.name, indices: m.indices() });
      }
    });
  }

  addModel(NewModel) {
    if (this.models.find(M => M.name === NewModel.name))
      throw new Error(`Duplicate NewModel '${NewModel.name}'`);
    this.models.push(NewModel);
    this.defaultRepository.addModel(NewModel);
  }

  fromJSON(json, type) {
    const modelName = type || _.get(json, 'meta.type');
    if (!modelName)
      throw new TypeError('meta.type required to desearilise json objects');
    const ModelType = this.defaultRepository.models[modelName];
    if (!ModelType)
      throw new TypeError(`No model named '${modelName}' was found`);
    return new ModelType(json);
  }
}

Frontier.Model = Model;
Frontier.Field = Field;
Frontier.Interface = Interface;
Frontier.Datastore = Datastore;
Frontier.Repository = Repository;
module.exports = Frontier;
