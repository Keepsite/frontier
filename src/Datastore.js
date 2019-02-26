// A datastore takes an adaptor and some DB config settings to manage a DB connection
class Datastore {
  constructor(args) {
    const { Adapter, config } = Object.assign(
      { Adapter: null, config: {} },
      args
    );

    if (!Adapter) throw new Error('missing Adapter reference for Datastore');
    this.adapter = new Adapter({ config });
  }

  async find(ModelDefinition, query, options) {
    if (!ModelDefinition)
      throw new Error('Datastore::find() called without a Model Definition');

    // TODO: parse find query
    const { values } = await this.adapter.find(
      ModelDefinition.name,
      query,
      options
    );
    return values.map(value => new ModelDefinition(value, options));
  }

  async load(model) {
    if (!model) throw new Error('Datastore::load() called without a model');
    const { value, ...$ } = await this.adapter.load(model);
    Object.assign(model, value, { $ });
    return model;
  }

  async save(model) {
    if (!model) throw new Error('Datastore::save() called without a model');
    const $ = await this.adapter.save(model);
    Object.assign(model, { $ });
    return model;
  }

  async remove(model) {
    if (!model) throw new Error('Datastore::remove() called without a model');
    const $ = await this.adapter.remove(model);
    Object.assign(model, { $ });
    return model;
  }
}

module.exports = Datastore;
