const uuid = require('uuid');

const Field = require('./Field');

// A Model takes a definition object
class Model {
  static ref(id, options) {
    return new this({ id }, { ...options, loaded: false });
  }

  static async getById(id, options = {}) {
    // console.log('Model::getById()');
    const { repository } = options;
    if (!repository)
      throw new Error(
        `${this.modelName}::getById() called without a repository`
      );

    // await this.models[Model.name].getById(id);
    const model = this.ref(id, options);
    return model.load();
    // return this.datastore.load(model);

    // return repository.getById(this, id);
  }

  static validate() {
    // console.log('Frontier.Model::validate()');
    Object.entries(this.schema()).forEach(([name, field]) => {
      // catch array definitions
      const type = Field.getType(name, field);
      return new Field({ name, ...type });
    });
  }

  constructor(data, options) {
    const { repository, loaded } = Object.assign({}, options);

    this.constructor.validate();
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

    Object.assign(this, this.getFieldValues(data));
  }

  getFieldValues(data = {}) {
    return Object.entries(this.schema).reduce(
      (result, [name, schemaField]) => ({
        ...result,
        [name]: Field.getType(name, schemaField).getValue(data[name]),
      }),
      {}
    );
  }

  toJSON(model = this) {
    return Object.entries(model.schema).reduce(
      (result, [name, field]) => {
        if (name === 'meta') return result;
        const value = this[name];
        if (typeof value === 'object') {
          if (value.constructor === Date)
            return { ...result, [name]: value.toJSON() };
          if (Field.getType(name, field).type === 'Mixed') {
            throw new Error(`Model::toJSON for Mixed is not implemented`);
            // TODO: Handle Mixed fields toJSON
          }
          if (Field.getType(name, field).type === 'object') {
            return { ...result, [name]: value };
          }
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
