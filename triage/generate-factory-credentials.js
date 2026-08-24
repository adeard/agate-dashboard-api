require('dotenv').config();
const crypto = require('crypto');
const connectToDatabase = require('../lib/db-connect');
const FactoryModel = require('../models/factory');

function generateApiKey() {
  return 'fk_' + crypto.randomBytes(16).toString('hex');
}

function generateApiSecret() {
  return 'fs_' + crypto.randomBytes(32).toString('hex');
}

async function run() {
  try {
    await connectToDatabase();
    console.log('Connected to database');

    const factoryId = process.argv[2];

    if (factoryId) {
      const factory = await FactoryModel.findById(factoryId);
      if (!factory) {
        console.error(`Factory with ID ${factoryId} not found`);
        process.exit(1);
      }

      const api_key = generateApiKey();
      const api_secret = generateApiSecret();

      factory.api_key = api_key;
      factory.api_secret = api_secret;
      await factory.save();

      console.log(`\nSuccessfully generated credentials for factory: "${factory.name}" (${factory._id})`);
      console.log(`API Key:    ${api_key}`);
      console.log(`API Secret: ${api_secret}\n`);
    } else {
      const factories = await FactoryModel.find({});
      console.log(`Found ${factories.length} factories. Generating credentials for factories missing credentials...`);

      for (const factory of factories) {
        if (!factory.api_key || !factory.api_secret) {
          factory.api_key = generateApiKey();
          factory.api_secret = generateApiSecret();
          await factory.save();
          console.log(`Generated for factory "${factory.name}": API Key = ${factory.api_key}`);
        } else {
          console.log(`Factory "${factory.name}" already has API Key: ${factory.api_key}`);
        }
      }
    }

    process.exit(0);
  } catch (err) {
    console.error('Error generating credentials:', err);
    process.exit(1);
  }
}

run();
