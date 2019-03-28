const _ = require('lodash');
const util = require('util');
const uuid = require('uuid');

const Field = require('./Field');

const hooks = [
  'preSave',
  'preLoad',
  'preRemove',
  'postSave',
  'postLoad',
  'postRemove',
];

// A Model takes a definition object
class Model {
  static idKey() {
    return '$id';
  }

  static typeKey() {
    return '$type';
  }

  static validate() {
    const instance = new this();
    return !!instance;
  }

  static ref(id, options) {
    return new this({ id }, { ...options });
  }

  static async create(data = {}, options = {}) {
    const repository = options.repository || this.prototype.repository;
    if (!repository)
      throw new Error(`${this.name}::create() called without a repository`);
    const modelInstance = new this(data, options);
    return repository.create(modelInstance, options);
  }

  static async getById(id, options = {}) {
    const repository = options.repository || this.prototype.repository;
    if (!repository)
      throw new Error(`${this.name}::getById() called without a repository`);

    const model = this.ref(id, options);
    return model.load();
  }

  static async find(query, options = {}) {
    const repository = options.repository || this.prototype.repository;
    if (!repository)
      throw new Error(`${this.name}::find() called without a repository`);

    return repository.find(this, query, options);
  }

  static async count(query, options = {}) {
    const repository = options.repository || this.prototype.repository;
    if (!repository)
      throw new Error(`${this.name}::count() called without a repository`);

    return repository.count(this, query, options);
  }

  static async findOne(query, options = {}) {
    const repository = options.repository || this.prototype.repository;
    if (!repository)
      throw new Error(`${this.name}::findOne() called without a repository`);

    return repository.findOne(this, query, options);
  }

  static async loadAll(models, options = {}) {
    const repo = options.repository || this.prototype.repository;
    if (!repo)
      throw new Error(
        `${this.modelName}::loadAll() called without a repository`
      );
    await Promise.all(
      models.map(async m => {
        await m.preLoad();
        await repo.load(m);
        await m.postLoad();
      })
    );
    return models;
  }

  constructor(data = {}, options) {
    const { repository } = Object.assign({}, options);
    const idKey = this.constructor.idKey();
    const typeKey = this.constructor.typeKey();

    // this.modelName = this.constructor.name.replace(/Repository$/, '');
    this.modelName = this.constructor.name;
    this.schema = this.constructor.schema();
    if (repository) this.repository = repository;
    if (!this.schema)
      throw new Error(`Model '${this.modelName}' is missing a schema object`);
    if (!this.schema.id && !this.schema[idKey])
      Object.assign(this.schema, {
        [idKey]: {
          type: 'string',
          default: () => uuid.v4(),
          required: 'true',
        },
      });
    if (typeof this.schema[idKey].default !== 'function')
      throw new Error(
        `Model '${this.modelName}' is missing a default function for Field 'id'`
      );

    Field.prototype.repository = this.repository;
    this.fields = Object.entries(this.schema).reduce(
      (result, [name, definition]) => ({
        ...result,
        [name]: new Field({
          name,
          definition,
          value:
            name === idKey ? data.$ref || data.id || data[idKey] : data[name],
        }),
      }),
      {}
    );

    const schemaKeys = Object.keys(this.schema);
    return new Proxy(this, {
      get(target, key) {
        if (hooks.includes(key)) return target[key] || _.noop;
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

  id() {
    const idKey = this.constructor.idKey();
    return this[idKey];
  }

  toJSON(options = {}) {
    const { shallow } = Object.assign({ shallow: false }, options);
    const model = this;
    return Object.entries(model.fields).reduce(
      (result, [name, field]) => {
        if (name === 'meta') return result;
        const value = this[name];
        if (value) {
          if (value.constructor === Array) {
            return {
              ...result,
              [name]: value.map(v => (typeof v === 'object' ? v.toJSON() : v)),
            };
          }
          if (typeof value === 'object') {
            if (value.constructor === Date)
              return { ...result, [name]: value.toJSON() };
            if (
              field.type === 'Mixed' ||
              field.type.constructor === Field.ModelRef
            ) {
              if (
                Field.isModelRef(field.type) &&
                (!value.loaded() || shallow)
              ) {
                const ref = {
                  $ref: value.id(),
                  $type: value.modelName,
                };
                return { ...result, [name]: ref };
              }
              return { ...result, [name]: value.toJSON() };
            }
          }
        }
        return { ...result, [name]: value };
      },
      { meta: { ...model.schema.meta, type: this.modelName } }
    );
  }

  loaded() {
    return _.has(this, '$.cas');
  }

  [util.inspect.custom]() {
    return this.toJSON();
  }

  async save(options = {}) {
    await this.preSave();
    const repo = options.repository || this.repository;
    if (!repo)
      throw new Error(`${this.modelName}::save() called without a repository`);
    repo.save(this);
    await this.postSave();
    return this;
  }

  async load(...args) {
    let paths = [];
    let options = {};
    if (args[0]) {
      if (args[0].constructor === Object) {
        [options] = args;
      } else {
        [paths, options] = args;
      }
    }

    await this.preLoad();
    const repo = options.repository || this.repository;
    if (!repo)
      throw new Error(`${this.modelName}::load() called without a repository`);
    await repo.load(this, [].concat(paths));
    await this.postLoad();
    return this;
  }

  async remove(options = {}) {
    await this.preRemove();
    const repo = options.repository || this.repository;
    if (!repo)
      throw new Error(`${this.modelName}::load() called without a repository`);
    await repo.remove(this);
    await this.postRemove();
    return this;
  }
}

module.exports = Model;
