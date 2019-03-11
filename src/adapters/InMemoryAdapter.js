const uuid = require('uuid');
const Adapter = require('../Adapter');

class InMemoryAdapter extends Adapter {
  constructor(args) {
    const { config } = Object.assign({ config: {} }, args);
    super();
    Object.assign(this, { db: {} }, config);
  }

  getModelKey(model) {
    const keySeperator = this.keySeperator || '|';
    return `${model.modelName}${keySeperator}${model.id()}`;
  }

  find(modelName, query /* options */) {
    const typeValues = Object.values(this.db).filter(
      v => v.meta.type === modelName
    );

    const values = typeValues.filter(v =>
      Object.entries(query).reduce(
        (result, [key, value]) => result && v[key] === value,
        true
      )
    );

    return values.reduce(
      (result, value) => ({
        ...result,
        [`${modelName}|${value.$id}`]: { value, cas: uuid.v4() },
      }),
      {}
    );
  }

  count(modelName, query, options) {
    const results = this.find(modelName, query, options);
    return Object.values(results).length;
  }

  flush() {
    this.db = {};
  }

  load(model) {
    const key = this.getModelKey(model);
    const value = this.db[key];
    if (!value) throw new Error(`record '${key}' missing`);
    return { cas: uuid.v4(), value };
  }

  save(model) {
    const key = this.getModelKey(model);
    this.db[key] = model.toJSON();
    return { cas: uuid.v4() };
  }

  remove(model) {
    const key = this.getModelKey(model);
    delete this.db[key];
    return { cas: uuid.v4() };
  }
}

module.exports = InMemoryAdapter;
