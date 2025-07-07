require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3079;
const server = require('http').createServer(app);

const routes = require('./routes');
const connectToDatabase = require('./lib/db-connect');
const {
  runBlasReportCron,
  runUpdateDataDemo,
} = require('./lib/cron/blast-report');
const { generateExcel } = require('./utils/generate-excel-daily');
const dayjs = require('dayjs');
const XLSX = require('xlsx');

(() => {
  connectToDatabase()
    .then((response) => {
      console.log(response);

      // All your controllers should live here
      app.get('/', function rootHandler(req, res) {
        res.end('Selamat Datang.');
      });

      app.get('/daily-excel', (req, res) => {
        res.sendFile(
          path.join(__dirname, '/lib/html/generate-excel-daily.html')
        ); // Serve the HTML file
      });

      // Route to generate and download the Excel file
      app.get('/generate-daily-excel', async (req, res) => {
        try {
          const { date } = req.query; // Get the date from query parameters

          if (!date) {
            return res
              .status(400)
              .send('Date is required in the query parameters.');
          }

          // Call your generateExcel function
          const workbook = await generateExcel(date);

          // Set headers for file download
          const fileName = `${dayjs(date).format('DD_MM_YYYY')}_Daily.xlsx`;
          res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          );
          res.setHeader(
            'Content-Disposition',
            `attachment; filename=${fileName}`
          );

          // Send the Excel file as a response
          const buffer = XLSX.write(workbook, {
            type: 'buffer',
            bookType: 'xlsx',
          });
          res.end(buffer);
        } catch (err) {
          console.error('Error generating Excel file:', err);
          res.status(500).send('Failed to generate Excel file.');
        }
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

      runBlasReportCron().start();
      runUpdateDataDemo().start();

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
