const { GraphQLInterfaceType } = require('graphql');

const Model = require('./Model');

class Interface extends Model {
  static hasInterface() {
    return true;
  }

  static isInterface() {
    return Object.getPrototypeOf(this).name === 'Interface';
  }

  static GraphQLType() {
    if (this._gqlType) return this._gqlType;
    const modelInstance = new this();

    if (Object.getPrototypeOf(this).name === 'Interface') {
      this._gqlType = new GraphQLInterfaceType({
        name: this.name,
        fields: modelInstance.getGqlFields(),
        resolveType: obj => obj.constructor.GraphQLType(),
      });
    } else {
      super.GraphQLType();
    }

    return this._gqlType;
  }
  // Auto Generate Common Schema Fields
  // typeRange.reduce((fields, Model) => {
  //   const modelFields = Model.GraphQLType()._fields;
  //   if (!fields) return modelFields;
  //   Object.keys(fields).forEach(fieldName => {
  //     if (!_.has(modelFields, fieldName)) delete fields[fieldName];
  //   });
  //   const x = _.reduce(
  //     fields,
  //     (result, value, key) => ({
  //       ...result,
  //       [key]: _.pick(value, ['type', 'resolve']),
  //     }),
  //     {}
  //   );
  //   return x;
  // }, null),
}

module.exports = Interface;
