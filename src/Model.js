const _ = require('lodash');
const util = require('util');
const uuid = require('uuid');
const { GraphQLObjectType } = require('graphql');

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

  static validate() {
    const instance = new this();
    return !!instance;
  }

  static ref(id, options) {
    return new this({ id }, { ...options });
  }

  static hasInterface() {
    return false;
  }

  static isInterface() {
    return false;
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
    return model.load(options.load);
  }

  static async find(query = {}, options = {}) {
    const repository = options.repository || this.prototype.repository;
    if (!repository)
      throw new Error(`${this.name}::find() called without a repository`);

    const results = await repository.find(this, query, options);
    if (results.length && options.load)
      return Promise.all(results.map(r => r.load(options.load)));
    return results;
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
        await m.preLoad(m);
        await repo.load(m);
        await m.postLoad(m);
      })
    );
    return models;
  }

  static getSchema() {
    const idKey = this.idKey();
    if (!this.schema)
      throw new Error(`Model '${this.modelName}' is missing a schema object`);

    const schema = this.schema();
    if (!schema.id && !schema[idKey])
      Object.assign(schema, {
        [idKey]: {
          type: 'string',
          default: () => uuid.v4(),
          required: 'true',
        },
      });
    if (typeof schema[idKey].default !== 'function')
      throw new Error(
        `Model '${this.modelName}' is missing a default function for Field 'id'`
      );
    return schema;
  }

  static getFields(data = {}, repository) {
    const idKey = this.idKey();
    const schemaFields = Object.entries(this.getSchema());
    return schemaFields.reduce(
      (result, [name, definition]) => ({
        ...result,
        [name]: new Field({
          name,
          definition,
          value:
            name === idKey ? data.$ref || data[idKey] || data.id : data[name],
          repository,
        }),
      }),
      {}
    );
  }

  static graphQLType() {
    if (this._gqlType) return this._gqlType;
    this._gqlType = new GraphQLObjectType({
      name: this.name,
      interfaces: () => {
        if (this.hasInterface())
          return [Object.getPrototypeOf(this).graphQLType()];
        return [];
      },
      fields: () => this.graphQLFields(),
    });

    return this._gqlType;
  }

  static graphQLFields() {
    const calculatedFields = this.resolvers ? this.resolvers() : {};
    return _.reduce(
      this.getFields(),
      (modelFields, modelField) => {
        // TODO: remove this when $id idKey issue is fixed
        const fieldName = modelField.name.replace('$', '');
        if (modelFields[fieldName]) return modelFields;
        return {
          ...modelFields,
          [fieldName]: {
            type: modelField.graphQLType(),
            resolve: async parent => {
              if (fieldName === 'id') return parent.id();
              const fieldModel = parent[fieldName];
              if (fieldModel instanceof Model && !fieldModel.loaded())
                await fieldModel.load();
              if (modelField.type instanceof Field.List) {
                await parent.load(`${fieldName}[*]`);
              }
              return fieldModel;
            },
          },
        };
      },
      calculatedFields
    );
  }

  constructor(data = {}, options) {
    const { repository } = Object.assign({}, options);

    // this.modelName = this.constructor.name.replace(/Repository$/, '');
    this.modelName = this.constructor.name;
    this.schema = this.constructor.getSchema();
    if (!this.schema)
      throw new Error(`Model '${this.modelName}' is missing a schema object`);

    if (repository) this.repository = repository;
    this.fields = this.constructor.getFields(data, this.repository);

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

  id(data) {
    const idKey = this.constructor.idKey();
    if (data) return data.$ref || data[idKey] || data.id;
    return this[idKey];
  }

  ref() {
    return { $ref: this.id(), $type: this.modelName };
  }

  toJSON(options = {}) {
    const { shallow } = Object.assign({ shallow: false }, options);
    const model = this;
    return Object.entries(model.fields).reduce(
      (result, [name, field]) => {
        if (['$type', 'meta'].includes(name)) return result;
        const value = this[name];
        if (value) {
          if (value.constructor === Array) {
            return {
              ...result,
              [name]: value.map(v => {
                if (typeof v === 'object')
                  return v instanceof Model ? v.ref() : v;
                return v;
              }),
            };
          }
          if (typeof value === 'object') {
            if (value.constructor === Date)
              return { ...result, [name]: value.toJSON(options) };
            if (
              field.type === 'Mixed' ||
              field.type.constructor === Field.ModelRef
            ) {
              if (
                Field.isModelRef(field.type) &&
                (!value.loaded() || shallow)
              ) {
                return { ...result, [name]: value.ref() };
              }
              return { ...result, [name]: value.toJSON(options) };
            }
          }
        }
        return { ...result, [name]: value };
      },
      {
        $type: this.modelName,
        meta: { ...model.schema.meta, type: this.modelName },
      }
    );
  }

  loaded() {
    return _.has(this, '$.cas');
  }

  [util.inspect.custom]() {
    return this.toJSON();
  }

  async save(options = {}) {
    await this.preSave(this);
    const repo = options.repository || this.repository;
    if (!repo)
      throw new Error(`${this.modelName}::save() called without a repository`);
    repo.save(this);
    await this.postSave(this);
    return this;
  }

  async load(...args) {
    let paths = [];
    let options = {};
    if (args[0]) {
      let optionsArg;
      if (args[0].constructor === Object) {
        [optionsArg] = args;
      } else {
        [paths, optionsArg] = args;
      }
      if (optionsArg) options = optionsArg;
    }

    await this.preLoad(this);
    const repo = options.repository || this.repository;
    if (!repo)
      throw new Error(`${this.modelName}::load() called without a repository`);
    await repo.load(this, [].concat(paths));
    await this.postLoad(this);
    return this;
  }

  async remove(options = {}) {
    await this.preRemove(this);
    const repo = options.repository || this.repository;
    if (!repo)
      throw new Error(`${this.modelName}::load() called without a repository`);
    await repo.remove(this);
    await this.postRemove(this);
    return this;
  }
}

module.exports = Model;
