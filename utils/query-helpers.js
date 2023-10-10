const dayjs = require('dayjs');
const { deleteEmptyObjectValue } = require('./helpers');

const ObjectId = require('mongoose').Types.ObjectId;

const whitelistObjectId = ['plant', 'machine', 'customer', 'device'];

module.exports = {
  getBasicQuery: (query, options = {}) => {
    const dateFilterKey = options.dateFilterKey || 'createdAt';
    const parseDateKey = options.parseDateKey || false;
    const parseToNumber = options.parseToNumber || [];
    let dateKeys = options.dateKeys || [];

    let page = query.page;
    let limit = query.limit;

    let dateQuery = {};

    deleteEmptyObjectValue(query);

    let basicQuery = Object.keys(query).reduce((curr, key) => {
      const isDateKey = key.includes('date');

      if (whitelistObjectId.includes(key)) {
        curr[key] = new ObjectId(query[key]);
        return curr;
      }

      if (isDateKey && !parseDateKey) {
        if (key.includes('from') || key.includes('start')) {
          dateQuery['$gte'] = new Date(dayjs(query[key]).startOf('day'));
          return curr;
        }
        if (key.includes('to') || key.includes('end')) {
          dateQuery['$lte'] = new Date(dayjs(query[key]).endOf('day'));
          return curr;
        }
      }

      if (key === 'page' || key === 'limit') {
        return curr;
      }

      if (parseToNumber.includes(key)) {
        curr[key] = Number(query[key]);
      } else {
        curr[key] = query[key];
      }

      return curr;
    }, {});

    if (Object.keys(dateQuery).length >= 1 && !parseDateKey) {
      basicQuery[dateFilterKey] = dateQuery;
    }

    if (dateKeys.length && parseDateKey) {
      for (let keys of dateKeys) {
        let tempQuery = {};

        if (query[keys[0]]) {
          tempQuery['$gte'] = new Date(dayjs(query[keys[0]]).startOf('day'));
        }
        if (query[keys[1]]) {
          tempQuery['$lte'] = new Date(dayjs(query[keys[1]]).startOf('day'));
        }

        if (query[keys[0]]) {
          const key = keys[0]
            .split('_')
            .filter(
              (s) =>
                s !== 'date' ||
                s !== 'from' ||
                s !== 'start' ||
                s !== 'to' ||
                s !== 'end'
            )
            .join('_');

          basicQuery[key] = tempQuery;
        }

        if (query[keys[1]]) {
          const key1 = keys[1]
            .split('_')
            .filter(
              (s) =>
                s !== 'date' ||
                s !== 'from' ||
                s !== 'start' ||
                s !== 'to' ||
                s !== 'end'
            )
            .join('_');

          basicQuery[key1] = tempQuery;
        }
      }
    }

    return {
      query: basicQuery,
      page: Number(page || 0),
      limit: Number(limit || 10),
    };
  },
};
