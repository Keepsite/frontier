const Adapter = require('../Adapter');

class InMemoryAdapter extends Adapter {
  constructor(args) {
    const { config } = Object.assign({ config: {} }, args);
    super();
    Object.assign(this, { db: {} }, config);
  }

  getModelKey({ modelName, id }) {
    const keySeperator = this.keySeperator || '|';
    return `${modelName}${keySeperator}${id}`;
  }

  load(model) {
    const key = this.getModelKey(model);
    const result = this.db[key];
    if (!result) throw new Error(`record '${key}' missing`);
    return result;
  }

  save(model) {
    const key = this.getModelKey(model);
    this.db[key] = model.toJSON();
    return model;
  }

  remove(model) {
    const key = this.getModelKey(model);
    delete this.db[key];
    return model;
  }
}

module.exports = InMemoryAdapter;
