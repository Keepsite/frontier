const _ = require('lodash');
const { Cluster, N1qlQuery } = require('couchbase');

const Adapter = require('../Adapter');

class CouchbaseAdapter extends Adapter {
  constructor({ config }) {
    super();
    this.config = Object.assign(
      {
        cluster: null,
        bucket: null,
        username: null,
        password: null,
      },
      config
    );
  }

  connected() {
    return this.bucket && this.bucket.connected;
  }

  async connect() {
    const { cluster, bucket, password } = this.config;
    this.cluster = new Cluster(cluster);
    await new Promise((resolve, reject) => {
      this.bucket = this.cluster.openBucket(bucket, password, error => {
        if (error) return reject(error);
        return resolve();
      });
    });
  }

  getModelKey({ modelName, id }) {
    const keySeperator = this.keySeperator || '|';
    return `${modelName}${keySeperator}${id}`;
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
    });
    if (!result) throw new Error(`record '${key}' missing`);
    return result;
  }

  async save(model) {
    if (!this.connected()) await this.connect();
    const { bucket } = this;
    const key = this.getModelKey(model);
    const options = { cas: _.get(model, '$.cas') };
    const result = new Promise((resolve, reject) => {
      bucket.upsert(key, model.toJSON(), options, (error, res) => {
        if (error) return reject(error);
        return resolve(res);
      });
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

module.exports = CouchbaseAdapter;
