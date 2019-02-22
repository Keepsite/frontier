const _ = require('lodash');

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

  static isObjectFieldType(type) {
    return type.name === 'ObjectField';
  }

  static isValidType(type) {
    const coreTypes = ['string', 'number', 'integer', 'boolean'];
    if (Field.isModelType(type)) return true;
    if (Field.isObjectFieldType(type)) return true;
    return [...coreTypes, 'array', 'object', 'Mixed', 'Date'].includes(type);
  }

  constructor({ name, definition, value }) {
    Object.assign(this, {
      name,
      value: null,
      type: this.getFieldType(definition),
      readonly: false,
      required: false,
      default: undefined,
      validator: null,
      definition,
    });
    if (definition.constructor === Object && this.type !== 'object')
      Object.assign(
        this,
        _.pick(definition, ['readonly', 'required', 'default', 'validator'])
      );

    this.value = this.getValue(value);
    this.validate();
    if (!this.type || !Field.isValidType(this.type))
      throw new TypeError(
        `invalid field type '${this.type}' for field '${name}'`
      );

    return new Proxy(this, {
      set(target, key, v) {
        if (key === 'value') {
          Reflect.set(target, key, target.getValue(v));
          target.validate();
        } else {
          Reflect.set(target, key, v);
        }
        return true;
      },
    });
  }

  validate() {
    // console.log('Field::validate()', { name: this.name, value: this.value });
    if (this.validator) this.validator(this.value);
    if (this.type === 'object') {
      Object.values(this.value).forEach(f => {
        if (f && f.constructor === Field) f.validate();
      });
    }
  }

  getFieldType(definition) {
    const { name } = this;
    if (definition.constructor === Object) {
      if (!definition.type || definition.type.type !== undefined)
        return 'object';
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
    if (!data && data !== false) return this.defaultValue();

    // Get Value of Nested and Reference models
    // TODO: may want to do model checking here
    if (Field.isModelType(this.type)) return data;

    const coreTypes = {
      string: String,
      number: Number,
      integer: Number,
      boolean: Boolean,
    };

    if (coreTypes[this.type]) return coreTypes[this.type](data);

    switch (this.type) {
      case 'array': {
        if (data.constructor !== Array)
          throw new TypeError(`invalid value for array type '${data}'`);
        return data;
      }
      case 'object': {
        const object = Object.entries(this.definition).reduce(
          (result, [name, definition]) => ({
            ...result,
            [name]: new Field({
              name,
              definition,
              value: data ? data[name] : this.defaultValue(definition),
            }),
          }),
          {}
        );
        return new Proxy(object, {
          get(target, key) {
            // TODO: check for object keys
            if (target[key]) return Reflect.get(target[key], 'value');
            return Reflect.get(target, key);
          },
          set(target, key, value) {
            // TODO: check for object keys
            if (target[key]) Reflect.set(target[key], 'value', value);
            return Reflect.get(target, key);
          },
        });
      }
      case 'Mixed': {
        const modelName = _.get(data, 'meta.type');
        if (modelName) {
          if (!this.frontier)
            throw new Error('frontier instance required for mixed model types');
          const ModelType = this.frontier.models.find(
            m => m.name === modelName
          );
          if (!ModelType) throw new Error(`Model '${modelName}' not found`);
          return new ModelType(data);
        }
        // TODO: this probably requires more work
        return data;
      }
      case 'Date':
        return new Date(data);
      default:
        throw new TypeError(
          `Field(${this.name})::getValue() can't handle type '${this.type}'`
        );
    }
  }

  defaultValue(field = this) {
    // Get default value for feild
    if (field.default !== undefined)
      return typeof field.default === 'function'
        ? field.default()
        : field.default;

    const defaults = {
      string: '',
      number: 0,
      integer: 0,
      boolean: 0,
      array: [],
      object: {},
    };

    if (['array', 'object'].includes(field.type))
      return this.getValue(defaults[field.type]);
    if (field.required) return defaults[field.type];
    return undefined;
  }
}

module.exports = Field;
