// A Field takes a field definition object
class Field {
  static getType(name, field) {
    if (field.constructor === Object) {
      if (!field.type || field.type.type !== undefined)
        return new Field({ type: 'object', fields: field });
      const modelType = Field.getModelType(name, field);
      if (modelType) return modelType;
      return new Field({ name, ...field });
    }
    if (Array.isArray(field)) {
      const arrayType = Field.getType(name, field[0]).type;
      if (field.length > 1)
        throw new TypeError(
          `Array Field '${name}' has more than one type definition`
        );
      if (!Field.isValidType(arrayType))
        throw new TypeError(
          `Array Field '${name}' has an invalid type '${arrayType}'`
        );
      return new Field({ name, type: 'array' });
    }
    return new Field({ name, type: field });
  }

  static getModelType(name, field) {
    if (typeof field.type === 'function') {
      if (Field.isModelType(field.type)) {
        return new Field({ name, ...field }); // TODO: finish this
      }
      return Field.getModelType(name, { ...field, type: field.type() });
    }
    return null;
  }

  static isModelType(type) {
    return Object.getPrototypeOf(type).name === 'Model';
  }

  static isValidType(type) {
    const coreTypes = ['string', 'number', 'integer', 'boolean'];
    // const models = frontier.models;
    if (Field.isModelType(type)) return true;
    return [...coreTypes, 'array', 'object', 'Mixed', 'Date'].includes(type);
  }

  constructor(definition) {
    // console.log('Field Constructor:', { args });
    if (!Field.isValidType(definition.type))
      throw new TypeError(
        `invalid field type '${definition.type}' for field '${definition.name}'`
      );

    Object.assign(
      this,
      {
        name: '',
        type: null,
        readonly: false,
        required: false,
        default: undefined,
        validator: null,
      },
      definition
    );
  }

  validate(data) {
    if (this.validator) this.validator(data);
  }

  getValue(data) {
    this.validate(data);
    if (data) {
      // Get Value of Nested and Reference models
      if (Field.isModelType(this.type)) return data; // TODO: may want to do model checking here
      switch (this.type) {
        case 'string':
          return String(data);
        case 'number':
          return Number(data);
        case 'integer':
          return Number(data);
        case 'boolean':
          return Boolean(data);
        case 'array': {
          if (data.constructor !== Array)
            throw new TypeError(`invalid value for array type '${data}'`);
          return data;
        }
        case 'object':
          console.log('Field::getValue', { object: data });
          return data;
        case 'Mixed':
          console.log('Field::getValue', { Mixed: data });
          return data;
        default:
          throw new TypeError(
            `Field::getValue can't handle type '${this.type}'`
          );
      }
    }
    return this.defaultValue();
  }

  defaultValue() {
    // Get default value for feild
    if (this.default !== undefined)
      return typeof this.default === 'function' ? this.default() : this.default;

    // TODO: if required do we create an instance of the nested model
    // if (Field.isModelType(this.type)) {
    //   const NestedModel = this.type;
    //   return new NestedModel();
    // }
    switch (this.type) {
      // case 'string':
      //   return '';
      // case 'number':
      //   return 0;
      // case 'integer':
      //   return 0;
      // case 'boolean':
      //   return false;
      case 'array':
        return [];
      case 'object':
        return {};
      default:
        return undefined;
    }
  }
}

module.exports = Field;
