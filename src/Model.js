const uuid = require('uuid');

const Field = require('./Field');

// A Model takes a definition object
class Model {
  static ref(id, options) {
    return new this({ id }, { ...options, loaded: false });
  }

  static async getById(id, options = {}) {
    const { repository } = options;
    if (!repository)
      throw new Error(
        `${this.modelName}::getById() called without a repository`
      );

    const model = this.ref(id, options);
    return model.load();
  }

  constructor(data = {}, options) {
    const { repository, loaded } = Object.assign({}, options);
    this.modelName = this.constructor.name.replace(/Repository$/, '');
    this.schema = this.constructor.schema();
    this.loaded = loaded === undefined ? true : loaded;
    if (repository) this.repository = repository;
    if (!this.schema.id)
      Object.assign(this.schema, {
        id: { type: 'string', default: () => uuid.v4(), required: 'true' },
      });
    if (typeof this.schema.id.default !== 'function')
      throw new Error(
        `Model '${this.modelName}' is missing a default function for Field 'id'`
      );

    this.fields = Object.entries(this.schema).reduce(
      (result, [name, definition]) => ({
        ...result,
        [name]: new Field({ name, definition, value: data[name] }),
      }),
      {}
    );

    const schemaKeys = Object.keys(this.schema);
    return new Proxy(this, {
      get(target, key) {
        if (schemaKeys.includes(key))
          return Reflect.get(target.fields[key], 'value');
        return Reflect.get(target, key);
      },
      set(target, key, value) {
        if (schemaKeys.includes(key))
          return Reflect.set(target.fields[key], 'value', value);
        return Reflect.set(target, key, value);
      },
    });
  }

  toJSON(model = this) {
    return Object.entries(model.fields).reduce(
      (result, [name, field]) => {
        if (name === 'meta') return result;
        const value = this[name];
        if (typeof value === 'object') {
          if (value.constructor === Date)
            return { ...result, [name]: value.toJSON() };
          if (field.type === 'Mixed') {
            throw new Error(`Model::toJSON for Mixed is not implemented`);
            // TODO: Handle Mixed fields toJSON
          }
          // if (field.type === 'object') {
          //   return { ...result, [name]: value };
          // }
          // if (value.constructor === Object) {
          //   // TODO: test and fix this
          //   return { ...result, [name]: value };
          // }
        }
        return { ...result, [name]: value };
      },
      { meta: { ...model.schema.meta, type: this.modelName } }
    );
  }

  async save(options = {}) {
    const repo = options.repository || this.repository;
    if (!repo)
      throw new Error(`${this.modelName}::save() called without a repository`);
    return repo.save(this);
  }

  async load(options = {}) {
    const repo = options.repository || this.repository;
    if (!repo)
      throw new Error(`${this.modelName}::load() called without a repository`);
    return repo.load(this);
  }

  async remove(options = {}) {
    const repo = options.repository || this.repository;
    if (!repo)
      throw new Error(`${this.modelName}::load() called without a repository`);
    await repo.remove(this);
    this.loaded = false;
    return this;
  }
}

module.exports = Model;
