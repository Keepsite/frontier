const _ = require('lodash');

class ModelRef {
  constructor(type) {
    Object.assign(this, { type });
  }
}

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

  static isModelRef(type) {
    if (type.constructor === ModelRef) {
      return type.type === 'Mixed' || Field.isModelType(type.type);
    }
    return false;
  }

  static isValidType(type) {
    const coreTypes = ['string', 'number', 'integer', 'boolean'];
    if (Field.isModelType(type)) return true;
    if (Field.isModelRef(type)) return true;
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
      if (definition.ref) return new ModelRef(definition.ref);
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
    // console.log({
    //   name: this.name,
    //   definition: this.definition,
    //   modelRef: Field.isModelRef(this.type),
    // });

    // Get Value of Nested and Reference models
    if (Field.isModelRef(this.type)) {
      if (typeof data !== 'object')
        throw new Error(
          `ModelRef field '${this.name}' must not have primitive value`
        );
      if (_.has(data, '$type')) return this.getModelInstance(data);
      if (_.has(data, 'meta.type')) return this.getModelInstance(data);
      return data;
    }
    if (Field.isModelType(this.type)) return data;

    const coreTypes = {
      string: String,
      number: Number,
      integer: Number,
      boolean: Boolean,
    };

    if (coreTypes[this.type]) return coreTypes[this.type](data);

    if (this.type === 'array') {
      if (data.constructor !== Array)
        throw new TypeError(`invalid value for array type '${data}'`);

      const arrayType = this.getFieldType(this.definition[0]);
      if (arrayType.constructor === ModelRef)
        return data.map(value => {
          if (Field.isModelType(value.constructor)) return value;
          return this.getModelInstance(value);
        });
      return data;
    }

    if (this.type === 'object') {
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
    if (this.type === 'Mixed') {
      if (_.has(data, 'meta.type')) return this.getModelInstance(data);
      // TODO: this probably requires more work
      return data;
    }
    if (this.type === 'Date') return new Date(data);
    throw new TypeError(
      `Field(${this.name})::getValue() can't handle type '${this.type}'`
    );
  }

  getModelInstance(data) {
    const modelName =
      data.modelName || _.get(data, 'meta.type') || _.get(data, '$type');
    // console.log({ modelName, data });
    if (!modelName)
      throw new Error(
        `Field::getModelInstance() data is not a model '${data}'`
      );
    if (!this.repository)
      throw new Error(
        'Frontier::Repository instance required to load child models'
      );
    const ModelType = this.repository.models[modelName];
    if (!ModelType) throw new Error(`Model '${modelName}' not found`);
    return new ModelType(data);
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

Field.ModelRef = ModelRef;
module.exports = Field;
