const _ = require('lodash');

// Stores Model definitions, datastores and repositories
class Frontier {
  constructor(args) {
    Object.assign(
      this,
      {
        models: [],
        plugins: [],
        datastores: {},
      },
      args
    );
    this.validate();
  }

  validate() {
    // console.log('Frontier::validate()');
    this.models.reduce((modelNames, M) => {
      if (modelNames.includes(M.name))
        throw new Error(`Duplicate Model '${M.name}'`);
      // eslint-disable-next-line no-new
      new M(); // validate model
      return [...modelNames, M.name];
    }, []);
  }

  addModel(model) {
    const modelNames = this.models.map(m => m.name);
    if (modelNames.includes(model.name))
      throw new Error(`Duplicate Model '${model.name}'`);
    this.models = [...this.models, model];
  }

  fromJSON(json, type) {
    const modelName = type || _.get(json, 'meta.type');
    if (!modelName)
      throw new TypeError('meta.type required to desearilise json objects');
    const ModelType = this.models.find(m => m.name === modelName);
    if (!ModelType)
      throw new TypeError(`No model named '${modelName}' was found`);
    return new ModelType(json);
  }
}

module.exports = Frontier;
