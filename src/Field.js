/* eslint-disable no-use-before-define */
const {
  GraphQLBoolean,
  GraphQLID,
  GraphQLInt,
  GraphQLFloat,
  GraphQLList,
  GraphQLString,
  GraphQLUnionType,
} = require('graphql');
const GraphQLDate = require('graphql-date');
const { GraphQLJSON } = require('graphql-type-json');

const gqlTypeMap = {
  string: GraphQLString,
  number: GraphQLFloat,
  integer: GraphQLInt,
  boolean: GraphQLBoolean,
  Date: GraphQLDate,
};

const coreTypes = [
  'string',
  'number',
  'integer',
  'boolean',
  'object',
  'Mixed',
  'Date',
];

const corePrototypes = {
  string: String,
  number: Number,
  integer: Number,
  boolean: Boolean,
};

const defaultValues = {
  string: '',
  number: 0,
  integer: 0,
  boolean: 0,
  array: [],
  object: {},
};

class Field {
  static getModelType(definition) {
    if (typeof definition.type === 'function') {
      if (Field.isModelType(definition.type)) return definition.type;
      return Field.getModelType({ type: definition.type() });
    }
    return null;
  }

  static isModelType(t) {
    const prototype = Object.getPrototypeOf(t);
    if (prototype.name === 'Model') return true;
    if (typeof prototype === 'function') return Field.isModelType(prototype);
    return false;
  }

  static isModelRef(t) {
    return t instanceof ModelRef;
  }

  static isList(type) {
    if (type.constructor === List) return Field.isValidType(type.type);
    return false;
  }

  static isCoreType(type) {
    return coreTypes.includes(type);
  }

  static isValidType(type) {
    if (Field.isCoreType(type)) return true;
    if (Field.isModelType(type)) return true;
    if (Field.isModelRef(type)) return true;
    if (Field.isList(type)) return true;
    return false;
  }

  constructor({ name, definition, type, value, repository }) {
    Object.assign(this, {
      name,
      value: null,
      type: type || this.getFieldType(definition),
      readonly: false,
      required: false,
      default: undefined,
      validator: null,
      definition,
      repository,
    });

    if (definition.constructor === Object && this.type !== 'object')
      Object.assign(this, {
        readonly: definition.readonly,
        required: definition.required,
        default: definition.default,
        validator: definition.validator,
      });

    if (![undefined, null].includes(value)) {
      this.value = this.getValue(value);
      this.validate();
    }
    if (!this.type || !Field.isValidType(this.type))
      throw new TypeError(
        `invalid field type '${this.type}' for field '${name}'`
      );

    return new Proxy(this, {
      get(target, key) {
        if (key === 'value' && !target.value) {
          target.value = target.defaultValue();
          return target.value;
        }
        return Reflect.get(target, key);
      },
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

  graphQLType() {
    const fieldType = this.getFieldType(this.definition);
    // TODO: replace this with a Frontier ID type
    if (this.name === '$id') return GraphQLID;
    if (Field.isModelType(fieldType)) return fieldType.graphQLType();
    if (fieldType instanceof ModelRef) {
      if (fieldType.type === 'Mixed') {
        const { unionName, typeRange } = this.definition;
        if (!unionName)
          throw new TypeError(
            `Unknown Mixed ModelRef type for field '${
              this.name
            }'. It may be missing a 'unionName' property in the model definition.`
          );
        if (!typeRange)
          throw new TypeError(
            `'typeRange' definition missing from Union '${unionName}' on Field '${
              this.name
            }'`
          );
        return new GraphQLUnionType({
          name: unionName,
          types: typeRange.map(model => model.graphQLType()),
          resolveType: obj => obj.constructor.graphQLType(),
        });
      }
      if (fieldType.type.graphQLType) return fieldType.type.graphQLType();
      throw new Error(
        `Cannot get GraphQLType for Field: '${this.name} ${fieldType}'`
      );
    }
    if (fieldType instanceof List) return fieldType.graphQLType();
    if (['Mixed', 'object'].includes(fieldType)) return GraphQLJSON;
    if (!Object.keys(gqlTypeMap).includes(fieldType))
      throw new TypeError(`Missing GraphQL type for '${fieldType}'`);
    return gqlTypeMap[this.type];
  }

  validate() {
    if (this.validator && ![undefined, null, ''].includes(this.value)) {
      this.validator(this.value);
    }
    if (this.type === 'object') {
      Object.values(this.value).forEach(f => {
        if (f && f.constructor === Field) f.validate();
      });
    }
  }

  getFieldType(definition) {
    const { name } = this;
    if (definition.constructor === Object) {
      if (definition.ref) return new ModelRef(definition);
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
    const fieldType = this.type;
    if ([undefined, null].includes(data)) return this.defaultValue();

    // TODO: remove auto casting once type validation has been implemented
    if (corePrototypes[this.type]) return corePrototypes[this.type](data);
    if (fieldType === 'Mixed') {
      return data.$type ? this.getModelInstance(data) : data;
    }
    if (fieldType === 'Date') return new Date(data);
    if (Field.isModelType(fieldType)) return data;

    // Get Value of Nested and Reference models
    if (Field.isModelRef(fieldType)) {
      if (typeof data !== 'object')
        throw new Error(
          `ModelRef field '${this.name}' must not have primitive value`
        );
      return data.$type ? this.getModelInstance(data) : data;
    }
    if (fieldType instanceof List) {
      if (!(data instanceof Array))
        throw new TypeError(`invalid value for array type '${data}'`);

      const ArrayType = this.getFieldType(this.definition[0]);
      if (Field.isModelRef(ArrayType) || Field.isModelType(ArrayType))
        return data.map(value => {
          if (Field.isModelType(value.constructor)) return value;
          if (Field.isModelType(ArrayType)) {
            const nestedType = new ArrayType(value, {
              repository: this.repository,
            });
            return Object.assign(nestedType, { $: { cas: true } });
          }
          return this.getModelInstance(value);
        });
      return data;
    }

    if (fieldType === 'object') {
      const object = Object.entries(this.definition).reduce(
        (result, [name, definition]) => {
          result[name] = new Field({
            name,
            definition,
            value: data ? data[name] : this.defaultValue(definition),
          });
          return result;
        },
        {}
      );
      return new Proxy(object, {
        get(target, key) {
          if (target[key]) return Reflect.get(target[key], 'value');
          return Reflect.get(target, key);
        },
        set(target, key, value) {
          if (target[key]) Reflect.set(target[key], 'value', value);
          return Reflect.get(target, key);
        },
      });
    }
    throw new TypeError(
      `Field(${this.name})::getValue() can't handle type '${this.type}'`
    );
  }

  getModelInstance(data) {
    const modelName = data.modelName || data.$type;

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
    if (Field.isModelRef(field.type)) return undefined;
    if (field.default !== undefined)
      return typeof field.default === 'function'
        ? field.default()
        : field.default;

    if (field.type === 'object')
      return this.getValue(defaultValues[field.type]);
    if (field.required) return defaultValues[field.type];
    return undefined;
  }
}

class ModelRef {
  constructor({ ref }) {
    const type = ref.constructor === Function && !ref.getSchema ? ref() : ref;
    if (typeof type.type === 'string' && type !== 'Mixed')
      throw new TypeError(`Invalid ModelRef type ${type}`);
    this.type = type;
  }

  toString() {
    return `ModelRef(type: ${JSON.stringify(this.type)})`;
  }
}

class List extends Field {
  constructor({ name, definition, value }) {
    super({ name, definition, value });
  }

  graphQLType() {
    return new GraphQLList(super.graphQLType());
  }
}

Field.List = List;
Field.ModelRef = ModelRef;
module.exports = Field;
