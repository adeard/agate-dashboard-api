const dayjs = require('dayjs');
const isBetween = require('dayjs/plugin/isBetween');
dayjs.extend(isBetween);
const fs = require('fs');
const path = require('path');

class TestingController {
  static async getAllByTickets(req, res, next) {
    try {
      const { start_date, end_date, ticket_number } = req.query;

      // Load dummy data
      const filePath = path.join(__dirname, '../triage/dummy-tickets.json');
      const rawData = fs.readFileSync(filePath, 'utf8');
      let tickets = JSON.parse(rawData);

      // Filter by date range (if provided)
      if (start_date || end_date) {
        tickets = tickets.filter(ticket => {
          const ticketDate = dayjs(ticket.summary.date);
          if (start_date && end_date) {
            const start = dayjs(start_date).startOf('day');
            const end = dayjs(end_date).endOf('day');
            return ticketDate.isAfter(start) && ticketDate.isBefore(end) || ticketDate.isSame(start, 'day') || ticketDate.isSame(end, 'day');
          } else if (start_date) {
            const start = dayjs(start_date).startOf('day');
            return ticketDate.isAfter(start) || ticketDate.isSame(start, 'day');
          } else if (end_date) {
            const end = dayjs(end_date).endOf('day');
            return ticketDate.isBefore(end) || ticketDate.isSame(end, 'day');
          }
          return true;
        });
      }

      // Filter by ticket number (if provided)
      if (ticket_number) {
        const queryTicketNum = ticket_number.toLowerCase().trim();
        tickets = tickets.filter(ticket => 
          ticket.summary.ticket_number.toLowerCase().includes(queryTicketNum)
        );
      }

      // Map to the requested list format
      const result = tickets.map(ticket => {
        const summary = ticket.summary;
        const result = ticket.grading_result;

        // Sum helper functions
        const getClassificationTotal = (cat) => result.classification_summary[cat]?.TOTAL || 0;
        const getSubclassSum = (subclass) => {
          return Object.keys(result.classification_summary).reduce((sum, cat) => {
            return sum + (result.classification_summary[cat][subclass] || 0);
          }, 0);
        };

        const abnormal = result.manual_parameter?.ABNORMAL || 0;
        const loss_fruit = result.manual_parameter?.BERONDOLAN || 0;
        const rotten = result.manual_parameter?.["BUAH BUSUK"] || 0;

        return {
          unripe: getClassificationTotal('MENTAH'),
          ripe: getClassificationTotal('MATANG'),
          over_ripe: getClassificationTotal('LEWAT MATANG'),
          empty_bunch: getClassificationTotal('JANJANG KOSONG'),
          abnormal: abnormal,
          rotten: rotten,
          long_stalk: getSubclassSum('TANGKAI PANJANG'),
          rat_damage: getSubclassSum('RUSAK DIMAKAN TIKUS'),
          loss_fruit: loss_fruit,
          ticket_number: summary.ticket_number,
          delivery_number: summary.delivery_number,
          vehicle_number: summary.vehicle_number,
          date: summary.date
        };
      });

      return res.status(200).json({
        status: 'success',
        message: 'Berhasil mendapatkan data.',
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  static async getDetailByTicket(req, res, next) {
    try {
      const { ticket_number } = req.query;

      if (!ticket_number) {
        return res.status(400).json({
          status: 'error',
          message: 'ticket_number query parameter is required'
        });
      }

      const filePath = path.join(__dirname, '../triage/dummy-tickets.json');
      const rawData = fs.readFileSync(filePath, 'utf8');
      const tickets = JSON.parse(rawData);

      const ticket = tickets.find(t => t.summary.ticket_number.toLowerCase() === ticket_number.toLowerCase().trim());

      if (!ticket) {
        return res.status(404).json({
          status: 'error',
          message: `Ticket with number ${ticket_number} not found`
        });
      }

      return res.status(200).json({
        status: 'success',
        message: 'Berhasil mendapatkan data.',
        data: ticket
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = TestingController;
