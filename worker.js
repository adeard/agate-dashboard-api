require('dotenv').config();
const connectToDatabase = require('./lib/db-connect');
const agenda = require('./lib/agenda');

(async () => {
  try {
    console.log('Connecting to database...');
    await connectToDatabase();
    console.log('Database Connected!');

    console.log('Starting Agenda worker...');
    await agenda.start();
    console.log('Worker process started and listening for jobs...');
  } catch (err) {
    console.error('Failed to start worker:', err);
    process.exit(1);
  }
})();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server and Agenda worker');
  await agenda.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT signal received: closing HTTP server and Agenda worker');
  await agenda.stop();
  process.exit(0);
});
