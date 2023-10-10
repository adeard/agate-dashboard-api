require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 3079;
const server = require('http').createServer(app);

const routes = require('./routes');
const connectToDatabase = require('./lib/db-connect');

(() => {
  connectToDatabase()
    .then((response) => {
      console.log(response);

      // All your controllers should live here
      app.get('/', function rootHandler(req, res) {
        res.end('Selamat Datang.');
      });

      app.use(cors());
      app.use(morgan('dev'));
      app.use(
        express.urlencoded({
          limit: '100mb',
          extended: true,
          parameterLimit: 1000000,
        })
      );
      app.use(express.json({ limit: '100mb' }));

      routes(app, express);

      app.set('port', PORT);

      server.listen(PORT, () => {
        console.log('App Connected on PORT:', PORT);
      });
      server.setTimeout(1000000000);
    })
    .catch((err) => {
      console.log('Failed to Connect with Error');
      console.error(err);
    });
})();
