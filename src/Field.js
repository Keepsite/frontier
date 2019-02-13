// A Field takes a field definition object
class Field {
  static getModelType(definition) {
    if (typeof definition.type === 'function') {
      if (Field.isModelType(definition.type)) return definition.type;
      return Field.getModelType({ type: definition.type() });
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

  constructor({ name, definition, value }) {
    Object.assign(this, {
      name,
      value: null,
      type: null,
      readonly: false,
      required: false,
      default: undefined,
      validator: null,
      definition,
    });
    Object.assign(this, this.getFieldSchema(definition));
    this.value = this.getValue(value);
    if (!this.type || !Field.isValidType(this.type))
      throw new TypeError(
        `invalid field type '${this.type}' for field '${name}'`
      );

    return new Proxy(this, {
      get(target, key) {
        return Reflect.get(target, key);
      },
      set(target, key, v) {
        if (key === 'value') {
          target.validate(v);
          return Reflect.set(target, key, target.getValue(v));
        }
        return Reflect.set(target, key, v);
      },
    });
  }

  validate(data) {
    if (this.type === 'object') {
      // TODO: replace this with child fields
      Object.entries(this.definition).forEach(([key, definition]) => {
        if (definition.validator) definition.validator(data[key]);
      });
    }
    if (this.validator) this.validator(data);
  }

  getFieldSchema(definition) {
    const type = this.getFieldType(definition);
    if (definition.constructor === Object) return { ...definition, type };
    return { type };
  }

  getFieldType(definition) {
    const { name } = this;
    if (definition.constructor === Object) {
      if (!definition.type || definition.type.type !== undefined)
        return 'object'; // TODO: needs more work { type: 'object', fields: definition };
      const modelType = Field.getModelType(definition);
      if (modelType) return modelType;
      return definition.type;
    }
    if (Array.isArray(definition)) {
      const arrayType = this.getFieldType(definition[0]);
      if (definition.length > 1)
        throw new TypeError(
          `Array Field '${name}' has more than one type definition`
        );
      if (!Field.isValidType(arrayType))
        throw new TypeError(
          `Array Field '${name}' has an invalid type '${arrayType}'`
        );
      return 'array';
    }
    return definition;
  }

  getValue(data = this.value) {
    // console.log(`Field(${this.name})::getValue()`);
    if (!data) return this.defaultValue();
    this.validate(data);

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
        // TODO: this probably requires more work
        // console.log('Field:', { name: this.name, type: this.type, data });
        return new Proxy(data, {
          set: (target, key, value) => {
            // console.log({ target, key, value });
            // if (data[key].validator) data[key].validator(value);
            target[key] = value;
          },
        });
      // return data;
      case 'Mixed':
        // TODO: this probably requires more work
        // console.log('Field:', { name: this.name, type: this.type, data });
        return data;
      case 'Date':
        return new Date(data);
      default:
        throw new TypeError(
          `Field(${this.name})::getValue() can't handle type '${this.type}'`
        );
    }
  }

  defaultValue() {
    const { type, required } = this;
    // Get default value for feild
    if (this.default !== undefined)
      return typeof this.default === 'function' ? this.default() : this.default;

    // TODO: if required do we create an instance of the nested model
    // if (Field.isModelType(this.type)) {
    //   const NestedModel = this.type;
    //   return new NestedModel();
    // }

    const defaults = {
      string: '',
      number: 0,
      integer: 0,
      boolean: 0,
      array: [],
      object: {},
    };

    if (['array', 'object'].includes(type)) return defaults[type];
    if (required) return defaults[type];
    return undefined;
  }
}

module.exports = Field;
