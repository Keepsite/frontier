/* eslint-disable no-use-before-define */
const _ = require('lodash');
const {
  GraphQLBoolean,
  GraphQLID,
  GraphQLInt,
  GraphQLFloat,
  GraphQLList,
  GraphQLString,
  GraphQLUnionType,
} = require('graphql');
const { GraphQLJSON } = require('graphql-type-json');

class Field {
  static getModelType(definition) {
    if (typeof definition.type === 'function') {
      if (Field.isModelType(definition.type)) return definition.type;
      return Field.getModelType({ type: definition.type() });
    }
    return null;
  }

  static isModelType(type) {
    const prototype = Object.getPrototypeOf(type);
    if (prototype.name === 'Model') return true;
    if (typeof prototype === 'function') return Field.isModelType(prototype);
    return false;
  }

  static isModelRef(type) {
    if (type.constructor === ModelRef) {
      return type.type === 'Mixed' || Field.isModelType(type.type);
    }
    return false;
  }

  static isList(type) {
    if (type.constructor === List) {
      return Field.isValidType(type.type);
    }
    return false;
  }

  static isValidType(type) {
    const coreTypes = ['string', 'number', 'integer', 'boolean'];
    if (Field.isModelType(type)) return true;
    if (Field.isModelRef(type)) return true;
    if (Field.isList(type)) return true;
    return [...coreTypes, 'object', 'Mixed', 'Date'].includes(type);
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

  GraphQLType() {
    const typeMap = {
      string: GraphQLString,
      number: GraphQLFloat,
      integer: GraphQLInt,
      boolean: GraphQLBoolean,
    };

    const fieldType = this.getFieldType(this.definition);
    // TODO: replace this with a Frontier ID type
    if (this.name === '$id') return GraphQLID;
    if (fieldType instanceof ModelRef) {
      if (fieldType.type === 'Mixed') {
        const { unionName, typeRange } = this.definition;
        if (!unionName)
          throw new TypeError(
            `Unknown Mixed ModelRef type for field '${
              this.name
            }'. It may be missing a 'unionName' property in the model definition.`
          );
        return new GraphQLUnionType({
          name: unionName,
          types: typeRange.map(model => model.GraphQLType()),
          resolveType: obj => obj.constructor.GraphQLType(),
        });
      }
      return fieldType.type.GraphQLType();
    }
    if (fieldType instanceof List) return fieldType.GraphQLType();
    if (['Mixed', 'object'].includes(fieldType)) return GraphQLJSON;
    if (!Object.keys(typeMap).includes(fieldType))
      throw new TypeError(`Missing GraphQL type for '${fieldType}'`);
    return typeMap[this.type];
  }

  validate() {
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
      return new List({ name, definition: definition[0] });
    }
    return definition;
  }

  getValue(data = this.value) {
    if (!data && data !== false) return this.defaultValue();

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

    if (this.type instanceof List) {
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

    if (field.type === 'object') return this.getValue(defaults[field.type]);
    if (field.required) return defaults[field.type];
    return undefined;
  }
}

class ModelRef {
  constructor(type) {
    Object.assign(this, { type });
  }
}

class List extends Field {
  constructor({ name, definition, value }) {
    super({ name, definition, value });
  }

  GraphQLType() {
    return new GraphQLList(super.GraphQLType());
  }
}

Field.List = List;
Field.ModelRef = ModelRef;
module.exports = Field;
