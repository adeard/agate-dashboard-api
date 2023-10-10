const { schemas } = require('./schemas');

module.exports = {
  vBody: async (schema, body) => await schemas[schema].validateAsync(body),
};
