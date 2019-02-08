// A adaptor is used as the interface between Frontier and a Database
class Adapter {
  async getById(/* id */) {
    throw new Error(
      `${this.constructor.name}::getById() is not yet implemented`
    );
  }

  async find(/* query, options */) {
    throw new Error(`${this.constructor.name}::find() is not yet implemented`);
  }

  async findOne(/* query, options */) {
    throw new Error(
      `${this.constructor.name}::findOne() is not yet implemented`
    );
  }

  async load() {
    throw new Error(`${this.constructor.name}::load() is not yet implemented`);
  }

  async save() {
    throw new Error(`${this.constructor.name}::save() is not yet implemented`);
  }

  async remove() {
    throw new Error(
      `${this.constructor.name}::remove() is not yet implemented`
    );
  }
}

module.exports = Adapter;
