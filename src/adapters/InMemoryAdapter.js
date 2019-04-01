const uuid = require('uuid');
const Adapter = require('../Adapter');
const Model = require('../Model');

// (model -> query) -> Bool
const runQueryFilter = (
  model,
  query,
  fn = result => !result.includes(false)
) => {
  const result = Object.entries(query).map(([k, value]) => {
    const key = String(k).toLowerCase();
    if (key === '$missing' && value && model === undefined) return true;
    if (key === '$exists' && value && model !== undefined) return true;

    if (key === '$contains') {
      if (!Array.isArray(model)) return false;
      if (value instanceof Object) {
        const r = model.map(m => runQueryFilter(m, value));
        return !r.includes(false);
      }
      return model.includes(value);
    }

    if (key === '$not') {
      if (!(model instanceof Object)) return false;

      if (Array.isArray(value)) {
        const r = value.map(v =>
          runQueryFilter(model, v, list => !list.includes(true))
        );
        return !r.includes(false);
      }

      if (value instanceof Object) {
        const r = runQueryFilter(model, value, list => !list.includes(true));
        return r;
      }
      return false;
    }

    if (key === '$or') {
      if (!(model instanceof Object)) return false;

      if (Array.isArray(value)) {
        const r = value.map(v =>
          runQueryFilter(model, v, list => list.includes(true))
        );
        return r.includes(true);
      }

      if (value instanceof Object) {
        const r = runQueryFilter(model, value, list => list.includes(true));
        return r;
      }

      return false;
    }

    if (key === '$like') {
      if (typeof value !== 'string' || typeof model !== 'string') {
        throw new Error('can not use $like on a non-string field');
      }

      let regString = value;
      if (regString[0] === '%') {
        regString = `^.*${regString.slice(1)}`;
      } else {
        regString = `^${regString}`;
      }

      if (regString[regString.length - 1] === '%') {
        regString = `${regString.slice(0, -1)}.*$`;
      } else {
        regString = `${regString}$`;
      }
      const reg = new RegExp(regString, 'i');
      return reg.test(model);
    }

    if (value instanceof Model) {
      return value.id() === model[key].$ref;
    }

    if (value instanceof Object) {
      return runQueryFilter(model[key], value);
    }

    if (model === undefined) return false;
    return model[key] === value;
  });

  return fn(result);
};

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

  async find(modelName, query /* options */) {
    const typeValues = Object.values(this.db).filter(
      v => v.meta.type === modelName
    );

    const values = typeValues.filter(v => runQueryFilter(v, query));

    return values.reduce(
      (result, value) => ({
        ...result,
        [`${modelName}|${value.$id}`]: { value, cas: uuid.v4() },
      }),
      {}
    );
  }

  async count(modelName, query, options) {
    const results = this.find(modelName, query, options);
    return Object.values(results).length;
  }

  async flush() {
    this.db = {};
  }

  async load(model) {
    const key = this.getModelKey(model);
    const value = this.db[key];
    if (!value) throw new Error(`record '${key}' missing`);
    return { cas: uuid.v4(), value };
  }

  async save(model) {
    const key = this.getModelKey(model);
    this.db[key] = model.toJSON();
    return { cas: uuid.v4() };
  }

  async remove(model) {
    const key = this.getModelKey(model);
    delete this.db[key];
    return { cas: uuid.v4() };
  }
}

module.exports = InMemoryAdapter;
