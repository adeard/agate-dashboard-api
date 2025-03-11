const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
dayjs.extend(utc);

module.exports = {
  createResponseSuccess: (code, title, m, data, meta) => {
    return {
      success: true,
      code,
      message: {
        title,
        m,
      },
      data,
      meta: meta || {},
    };
  },

  checkEmptyObject: (object) => {
    const oKeys = Object.keys(object);
    return oKeys.length === 0 || oKeys.some((key) => !object[key]);
  },

  generateRandomPassword: (length) => {
    const alphanum =
      'ABCDEFGHIJKLMNOPRSTUVWXYZabcdefghijklmnopqrstuvwxyz123456789';
    let result = '';

    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * alphanum.length);
      result += alphanum[randomIndex];
    }

    return result;
  },

  deleteEmptyObjectValue: (object) => {
    return Object.keys(object).forEach((key) => {
      if (
        object[key] === null ||
        !object[key] === undefined ||
        typeof object[key] === 'undefined' ||
        object[key] === ''
      ) {
        delete object[key];
      }
    });
  },

  generateDatesByYear: (year) => {
    const currentYear = dayjs().year();
    const startDate = dayjs(`${year}-01-01`);
    const today = dayjs().startOf('day');
    const endDate =
      String(currentYear) === String(year) ? today : dayjs(`${year}-12-31`);
    const dates = [];

    let currentDate = startDate;

    while (
      currentDate.isSame(endDate, 'day') ||
      currentDate.isBefore(endDate, 'day')
    ) {
      dates.push(currentDate.format('DD/MM/YYYY'));
      currentDate = currentDate.add(1, 'day');
    }

    return dates;
  },
  generateWeeks: (year) => {
    const currentYear = dayjs().year();
    const startDate = dayjs(`${year}-01-01`);
    const today = dayjs().startOf('day');
    const endDate =
      String(currentYear) === String(year) ? today : dayjs(`${year}-12-31`);
    const weeks = [];

    let currentDate = startDate;
    let currentWeek = 1;

    while (
      currentDate.isSame(endDate, 'day') ||
      currentDate.isBefore(endDate, 'day')
    ) {
      weeks.push(String(currentWeek));
      currentDate = currentDate.add(7, 'day');
      currentWeek += 1;
    }

    return weeks;
  },
  generateMonths: (year) => {
    const currentYear = dayjs().year();
    const startDate = dayjs(`${year}-01-01`);
    const today = dayjs().startOf('day');
    const endDate =
      String(currentYear) === String(year) ? today : dayjs(`${year}-12-31`);
    const months = [];

    let currentDate = startDate;

    while (
      currentDate.isSame(endDate, 'month') ||
      currentDate.isBefore(endDate, 'month')
    ) {
      months.push(currentDate.format('MMMM YYYY'));
      currentDate = currentDate.add(1, 'month');
    }

    return months;
  },
  getDateMonthYearDay: (date, useUtcOffset = true) => {
    const mod = useUtcOffset ? dayjs(date).utcOffset(7.1 * 60) : dayjs(date);
    return {
      day: mod.format('DD/MM/YYYY'),
      monthYear: mod.format('MMMM YYYY'),
    };
  },

  getWeekNumber: (date) => {
    const modifiedDate = dayjs(date).utcOffset(7.1 * 60);
    const firstDayOfYear = new Date(new Date(modifiedDate).getFullYear(), 0, 1);
    const pastDaysOfYear = (new Date(modifiedDate) - firstDayOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  },

  sortDataByKey: (data = [], key) => {
    return data.sort((a, b) => Number(b[key]) - Number(a[key]));
  },

  capitalizeString: (string) => {
    return string
      .toLowerCase()
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  },

  sleep: async (duration) => {
    return new Promise((resolve, reject) => {
      setTimeout(function () {
        resolve(true);
      }, duration);
    });
  },

  countPercentage(number, total, round = false) {
    let percent = Number(((number || 0) / (total || 1)) * 100);
    return round ? Math.round(percent) : percent;
  },

  getStats(data) {
    const total = data.reduce((sum, value) => sum + value, 0);
    const average = total / data.length;
    const lowest = Math.min(...data);
    const highest = Math.max(...data);

    return {
      total: total,
      average: average,
      lowest: lowest,
      highest: highest,
    };
  },
  formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours.toString().padStart(2, '0')}:${mins
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  },
  analyzeVendors(vendorData) {
    let bestVendor = null;
    let bestScore = -1;
    let mostProductiveVendor = null;
    let highestProductivity = -1;

    for (const [vendorCode, data] of Object.entries(vendorData)) {
      if (data.final_score > bestScore) {
        bestScore = data.final_score;
        bestVendor = { code: vendorCode, data: data, score: data.final_score };
      }

      const productivity = data.jumlah_truk;
      if (productivity > highestProductivity) {
        highestProductivity = productivity;
        mostProductiveVendor = {
          code: vendorCode,
          data: data,
          productivity: productivity,
        };
      }
    }

    return {
      bestVendor,
      mostProductiveVendor,
    };
  },
};
