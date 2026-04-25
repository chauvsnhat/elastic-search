const { Client } = require('@elastic/elasticsearch');

const esClient = new Client({
  node: 'http://127.0.0.1:9200', // Update if ES runs on different host/port
  // Note: we disabled xpack security in docker-compose.yml so no auth needed for dev
});

module.exports = esClient;
