const { GraphQLInterfaceType } = require('graphql');

const Model = require('./Model');

class Interface extends Model {
  static hasInterface() {
    return true;
  }

  static isInterface() {
    return Object.getPrototypeOf(this) === Interface;
  }

  static graphQLType() {
    if (this.isInterface()) {
      if (this._gqlInterfaceType) return this._gqlInterfaceType;
      this._gqlInterfaceType = new GraphQLInterfaceType({
        name: this.name,
        fields: this.graphQLFields(),
        resolveType: obj => obj.constructor.graphQLType(),
      });
      return this._gqlInterfaceType;
    }

    return super.graphQLType();
  }

  // Auto Generate Common Schema Fields
  // typeRange.reduce((fields, Model) => {
  //   const modelFields = Model.graphQLType()._fields;
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
