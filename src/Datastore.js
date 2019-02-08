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

  async load(model) {
    if (!model) throw new Error('Datastore::load() called without a model');
    const result = await this.adapter.load(model);
    Object.assign(model, result, { loaded: true });
    return result;
  }

  async save(model) {
    if (!model) throw new Error('Datastore::save() called without a model');
    const result = await this.adapter.save(model);
    Object.assign(model, result);
    return model;
  }

  async remove(model) {
    if (!model) throw new Error('Datastore::remove() called without a model');
    const result = await this.adapter.remove(model);
    Object.assign(model, result);
    return model;
  }
}

module.exports = Datastore;
