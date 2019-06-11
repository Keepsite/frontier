const _ = require('lodash');
const { Cluster, N1qlQuery } = require('couchbase');

const Adapter = require('../Adapter');
const Model = require('../Model');

// More info on N1qlQuery class
// http://docs.couchbase.com/sdk-api/couchbase-node-client-2.6.1/N1qlQuery.html
const ProfileType = {
  // Disables profiling. This is the default
  PROFILE_NONE: 'off',
  // This enables phase profiling.
  PROFILE_PHASES: 'phases',
  // This enables general timing profiling.
  PROFILE_TIMINGS: 'timings',
};

const Consistency = {
  // This is the default (for single-statement requests).
  NOT_BOUNDED: 1,
  // This implements strong consistency per request.
  REQUEST_PLUS: 2,
  // This implements strong consistency per statement.
  STATEMENT_PLUS: 3,
};

class CouchbaseAdapter extends Adapter {
  constructor({ config }) {
    super();
    this.config = Object.assign(
      {
        cluster:
          'couchbase://localhost?http_poolsize=5&operation_timeout=60000',
        bucketName: 'default',
        username: 'default',
        password: 'password1',
        consistency: Consistency.STATEMENT_PLUS,
      },
      // {
      //   cluster: null,
      //   bucket: null,
      //   username: null,
      //   password: null,
      //   consistency: Consistency.NOT_BOUNDED,
      // },
      config
    );
  }

  connected() {
    return this.bucket && this.bucket.connected;
  }

  async connect() {
    const { cluster, bucketName, password } = this.config;
    this.cluster = new Cluster(cluster);
    await new Promise((resolve, reject) => {
      this.bucket = this.cluster.openBucket(bucketName, password, error => {
        if (error) return reject(error);
        return resolve();
      });
    });

    const indexes = await this.executeN1qlQuery(
      `SELECT index_key, name, condition, state FROM system:indexes where keyspace_id = '${
        this.bucket._name
      }'`
    );

    if (!indexes.find(i => i.name === '#primary'))
      await this.executeN1qlQuery(
        `CREATE PRIMARY INDEX ON \`${this.bucket._name}\` USING GSI`
      );

    // {
    //   index_key: ['`$type`'], // use type key
    //   name: 'all_type',
    // },
    // {
    //   index_key: ['`$id`'], // use id key
    //   name: 'all_id',
    // },
    // {
    //   index_key: ['`$type`', '`$id`'], // use id and type keys
    //   name: 'all_type_id',
    // },
  }

  async flush() {
    if (!this.connected()) await this.connect();
    const { bucketName } = this.config;
    await this.executeN1qlQuery(`DELETE from \`${bucketName}\``);
  }

  getModelKey(model) {
    const keySeperator = this.keySeperator || '|';
    return `${model.modelName}${keySeperator}${model.id()}`;
  }

  executeN1qlQuery(queryString, options = {}) {
    const { bucket, config } = this;
    const { consistency, profile } = Object.assign(
      {
        profile: config.profile,
        consistency: config.consistency,
      },
      options
    );
    return new Promise((resolve, reject) => {
      const query = N1qlQuery.fromString(queryString);
      query.profile(profile);
      query.consistency(consistency);
      bucket.query(query, (error, res) => {
        if (error) return reject(error);
        return resolve(res);
      });
    });
  }

  buildFilterExpression(filters = {}, nodes = []) {
    const expressions = [];
    const SPECIAL_KEYS = [
      '$EXISTS',
      '$CONTAINS',
      '$LIKE',
      '$MISSING',
      '$OR',
      '$NOT',
    ];

    Object.entries(filters).forEach(([key, value]) => {
      const KEY = key.toUpperCase();
      const nodePath = `\`${nodes.join('`.`')}\``;
      const keyNodes = [...nodes, ...key.split('.')];
      const keyPath = `\`${keyNodes.join('`.`')}\``;

      if (SPECIAL_KEYS.includes(KEY)) {
        if (KEY === '$MISSING') expressions.push(`${nodePath} IS MISSING`);
        if (KEY === '$EXISTS') expressions.push(`${nodePath} IS VALUED`);
        if (KEY === '$LIKE')
          expressions.push(`lower(${nodePath}) LIKE lower('${value}')`);
        if (KEY === '$CONTAINS') {
          if (value instanceof Object) {
            const subexpression = this.buildFilterExpression(value, ['x']);
            expressions.push(
              `ANY x IN ${nodePath} SATISFIES ${subexpression.join(
                ' AND '
              )} END`
            );
          } else {
            expressions.push(
              `ANY x IN ${nodePath} SATISFIES x = '${value}' END`
            );
          }
        }
        if (KEY === '$OR') {
          const booleanExpression =
            value.constructor === Array
              ? value.reduce(
                  (result, v) => [
                    ...result,
                    ...this.buildFilterExpression(v, nodes),
                  ],
                  []
                )
              : this.buildFilterExpression(value, nodes);

          expressions.push(`(${booleanExpression.join(' OR ')})`);
        }
        if (KEY === '$NOT') {
          const booleanExpression =
            value.constructor === Array
              ? value.reduce(
                  (result, v) => [
                    ...result,
                    ...this.buildFilterExpression(v, nodes),
                  ],
                  []
                )
              : this.buildFilterExpression(value, nodes);

          expressions.push(`NOT (${booleanExpression.join(' OR ')})`);
        }
      } else if (value instanceof Model) {
        // const model = { $ref: value.id(), $type: value.constructor.type };
        expressions.push(
          ...this.buildFilterExpression(value.ref(), [...nodes, key])
        );
      } else if (value instanceof Object) {
        expressions.push(...this.buildFilterExpression(value, [...nodes, key]));
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        expressions.push(`${keyPath}=${value}`);
      } else if (typeof value === 'string') {
        expressions.push(`${keyPath}="${value}"`);
      }
    });

    return expressions;
  }

  async find(modelName, query, options) {
    if (!this.connected()) await this.connect();
    const { bucket } = this;
    const bucketName = bucket._name;
    const typeQS = ` WHERE \`$type\`='${modelName}'`;
    const where = this.buildFilterExpression(query);
    const whereQS = where.length ? `AND ${where.join(' AND ')}` : '';
    const limitQS = options.limit ? `LIMIT ${options.limit}` : '';
    const fullQS = `SELECT META(b).id AS id FROM \`${bucketName}\` b ${typeQS} ${whereQS} ${limitQS}`;

    const results = await this.executeN1qlQuery(
      fullQS,
      _.pick(options, ['consistency', 'profile'])
    );
    if (!results.length) return [];
    return new Promise((resolve, reject) => {
      const keys = results.map(r => r.id);
      bucket.getMulti(keys, (error, res) => {
        if (error) return reject(error);
        return resolve(res);
      });
    });
  }

  async load(model) {
    if (!this.connected()) await this.connect();
    const { bucket } = this;
    const key = this.getModelKey(model);
    const result = await new Promise((resolve, reject) => {
      bucket.get(key, (error, res) => {
        if (error) return reject(error);
        return resolve(res);
      });
    }).catch(error => {
      if (error.code === 13)
        throw new Error(`The key '${key}' does not exist on the server`);
      throw error;
    });
    return result;
  }

  async save(model) {
    if (!this.connected()) await this.connect();
    const { bucket } = this;
    const key = this.getModelKey(model);
    const options = { cas: _.get(model, '$.cas') };
    const result = new Promise((resolve, reject) => {
      bucket.upsert(
        key,
        model.toJSON({ shallow: true }),
        options,
        (error, res) => {
          if (error) return reject(error);
          return resolve(res);
        }
      );
    });
    return result;
  }

  async remove(model) {
    if (!this.connected()) await this.connect();
    const { bucket } = this;
    const key = this.getModelKey(model);
    const options = { cas: _.get(model, '$.cas') };
    const result = new Promise((resolve, reject) => {
      bucket.remove(key, options, (error, res) => {
        if (error) return reject(error);
        return resolve(res);
      });
    });
    return result;
  }
}

CouchbaseAdapter.ProfileType = ProfileType;
CouchbaseAdapter.Consistency = Consistency;
module.exports = CouchbaseAdapter;
