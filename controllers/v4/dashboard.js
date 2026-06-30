const dayjs = require("dayjs");
const XLSX = require("xlsx");
const {
  createResponseSuccess,
  generateWeeks,
  generateDatesByYear,
  generateMonths,
  getDateMonthYearDay,
  getWeekNumber,
  sortDataByKey,
  countPercentage,
  sortObjectByValues,
  isObjectEmpty,
} = require("../../utils/helpers");
const InspectionDataModel = require("../../models/inspection-data");
const { scoringMultiplier } = require("../../utils/enum");
const { getCompanyLimitTandan } = require("../../utils/inspection");
const FactoryModel = require("../../models/factory");

const utilsInspection = {
  getTotalAndPercentClassification: (item, isLngm = false) => {
    const totalTandan = item.grading_result["total_tandan"];
    const totalRejectedModified =
      Object.keys(item.grading_result["accepted_summary"] || {}).reduce(
        (n, k) =>
          n +
          Number(
            (item.grading_result["accepted_summary"][k] || {})[
              "BUAH KECIL DIBAWAH 5KG"
            ] || 0,
          ),
        0,
      ) + Number(item.grading_result["total_rejected"] || 0);
    const totalAcceptedModified =
      Number(item.grading_result["total_accepted"] || 0) -
      Object.keys(item.grading_result["accepted_summary"] || {}).reduce(
        (n, k) =>
          n +
          Number(
            (item.grading_result["accepted_summary"][k] || {})[
              "BUAH KECIL DIBAWAH 5KG"
            ] || 0,
          ),
        0,
      );
    const totalFined = item.grading_result["total_fined"];

    const percentAcceptedModified = countPercentage(
      totalAcceptedModified,
      totalTandan,
    );

    const percentAccepted = countPercentage(
      item["grading_result"]["total_accepted"],
      item["grading_result"]["total_tandan"],
    );

    const totalMatang = item.grading_result["accepted_summary"]?.["MATANG"]
      ? (item.grading_result["accepted_summary"]["MATANG"]["TOTAL"] || 0) -
        (item.grading_result["accepted_summary"]["MATANG"][
          "BUAH KECIL DIBAWAH 3KG"
        ] || 0) -
        (item.grading_result["accepted_summary"]["MATANG"][
          "BUAH KECIL DIBAWAH 5KG"
        ] || 0)
      : 0;
    const totalLewatMatang = item.grading_result["accepted_summary"]?.[
      "LEWAT MATANG"
    ]
      ? (item.grading_result["accepted_summary"]["LEWAT MATANG"]["TOTAL"] ||
          0) -
        (item.grading_result["accepted_summary"]["LEWAT MATANG"][
          "BUAH KECIL DIBAWAH 3KG"
        ] || 0) -
        (item.grading_result["accepted_summary"]["LEWAT MATANG"][
          "BUAH KECIL DIBAWAH 5KG"
        ] || 0)
      : 0;

    const totalMentahDiterima = item.grading_result["accepted_summary"]?.[
      "MENTAH"
    ]
      ? (item.grading_result["accepted_summary"]["MENTAH"]["TOTAL"] || 0) -
        (item.grading_result["accepted_summary"]["MENTAH"][
          "BUAH KECIL DIBAWAH 3KG"
        ] || 0) -
        (item.grading_result["accepted_summary"]["MENTAH"][
          "BUAH KECIL DIBAWAH 5KG"
        ] || 0)
      : 0;
    const totalJanjangKosongDiterima = item.grading_result[
      "accepted_summary"
    ]?.["JANJANG KOSONG"]
      ? (item.grading_result["accepted_summary"]["JANJANG KOSONG"]["TOTAL"] ||
          0) -
        (item.grading_result["accepted_summary"]["JANJANG KOSONG"][
          "BUAH KECIL DIBAWAH 3KG"
        ] || 0) -
        (isLngm
          ? item.grading_result["accepted_summary"]["JANJANG KOSONG"][
              "BUAH KECIL DIBAWAH 2KG"
            ] || 0
          : 0) -
        (item.grading_result["accepted_summary"]["JANJANG KOSONG"][
          "BUAH KECIL DIBAWAH 5KG"
        ] || 0)
      : 0;

    const totalMentah = item.grading_result["rejected_summary"]?.["MENTAH"]
      ? (item.grading_result["rejected_summary"]["MENTAH"]["TOTAL"] || 0) -
        (item.grading_result["rejected_summary"]["MENTAH"][
          "BUAH KECIL DIBAWAH 3KG"
        ] || 0) -
        (item.grading_result["rejected_summary"]["MENTAH"][
          "BUAH KECIL DIBAWAH 5KG"
        ] || 0)
      : 0;
    const totalJanjangKosong = item.grading_result["rejected_summary"]?.[
      "JANJANG KOSONG"
    ]
      ? (item.grading_result["rejected_summary"]["JANJANG KOSONG"]["TOTAL"] ||
          0) -
        (item.grading_result["rejected_summary"]["JANJANG KOSONG"][
          "BUAH KECIL DIBAWAH 3KG"
        ] || 0) -
        (item.grading_result["rejected_summary"]["JANJANG KOSONG"][
          "BUAH KECIL DIBAWAH 5KG"
        ] || 0)
      : 0;

    const { totalRusakDimakanTikus } = Object.keys(
      item.grading_result["rejected_summary"],
    ).reduce(
      (obj, key) => {
        const data = item["grading_result"]["rejected_summary"][key];

        obj["totalRusakDimakanTikus"] += data["RUSAK DIMAKAN TIKUS"] || 0;

        return obj;
      },
      { totalRusakDimakanTikus: 0 },
    );

    const { totalBuahKecil3, totalBuahKecil5, totalBuahKecil2 } = Object.keys(
      item.grading_result["rejected_summary"],
    ).reduce(
      (obj, key) => {
        const data = item["grading_result"]["rejected_summary"][key];

        obj["totalBuahKecil3"] += data["BUAH KECIL DIBAWAH 3KG"];
        obj["totalBuahKecil5"] += data["BUAH KECIL DIBAWAH 5KG"];
        obj["totalBuahKecil2"] += data["BUAH KECIL DIBAWAH 2KG"] || 0;

        return obj;
      },
      { totalBuahKecil3: 0, totalBuahKecil5: 0, totalBuahKecil2: 0 },
    );

    const { totalBuahKecil5Diterima } = Object.keys(
      item.grading_result["accepted_summary"],
    ).reduce(
      (obj, key) => {
        const data = item["grading_result"]["accepted_summary"][key];

        obj["totalBuahKecil5Diterima"] += data["BUAH KECIL DIBAWAH 5KG"] || 0;

        return obj;
      },
      { totalBuahKecil5Diterima: 0 },
    );
    const { totalTangkaiPanjang } = Object.keys(
      item.grading_result["accepted_summary"],
    ).reduce(
      (obj, key) => {
        const data = item["grading_result"]["accepted_summary"][key];

        obj["totalTangkaiPanjang"] += data["TANGKAI PANJANG"] || 0;

        return obj;
      },
      { totalTangkaiPanjang: 0 },
    );

    const percentMatang = countPercentage(totalMatang, totalTandan);
    const percentLewatMatang = countPercentage(totalLewatMatang, totalTandan);
    const percentTangkaiPanjang = countPercentage(
      totalTangkaiPanjang,
      totalAcceptedModified,
    );
    const percentMentah = countPercentage(totalMentah, totalTandan);
    const percentJangkos = countPercentage(totalJanjangKosong, totalTandan);
    const percentBuahKecil3 = countPercentage(totalBuahKecil3, totalTandan);
    const percentBuahKecil5 = countPercentage(totalBuahKecil5, totalTandan);
    const percentBuahKecil2 = countPercentage(totalBuahKecil2, totalTandan);
    const percentBuahKecil = countPercentage(
      totalBuahKecil3 + totalBuahKecil5 + (isLngm ? totalBuahKecil2 : 0),
      totalTandan,
    );
    const percentRusakDimakanTikus = countPercentage(
      totalRusakDimakanTikus,
      totalTandan,
    );

    const percentMentahDiterima = countPercentage(
      totalMentahDiterima,
      totalTandan,
    );
    const percentJanjangKosongDiterima = countPercentage(
      totalJanjangKosongDiterima,
      totalTandan,
    );
    const percentBuahKecil5Diterima = countPercentage(
      totalBuahKecil5Diterima,
      totalTandan,
    );

    // console.log({
    //   percentMLM: percentMatang + percentLewatMatang,
    //   percentAccepted,
    // });

    return {
      totalMatang,
      totalLewatMatang,
      totalMentah,
      totalJanjangKosong,
      totalBuahKecil3,
      totalBuahKecil5,
      totalBuahKecil2,
      totalTangkaiPanjang,
      percentBuahKecil,
      percentJangkos,
      percentBuahKecil3,
      percentBuahKecil5,
      percentBuahKecil2,
      percentLewatMatang,
      percentMatang,
      percentMentah,
      percentTangkaiPanjang,
      percentAcceptedModified: percentAccepted,
      totalAcceptedModified: item["grading_result"]["total_accepted"],
      totalRejectedModified: item["grading_result"]["total_rejected"],
      totalTandan,
      totalFined,

      totalMentahDiterima,
      totalJanjangKosongDiterima,
      totalBuahKecil5Diterima,
      percentMentahDiterima,
      percentJanjangKosongDiterima,
      percentBuahKecil5Diterima,
      totalRusakDimakanTikus,
      percentRusakDimakanTikus,
    };
  },
  getAllMonitoringData: (inspections) => {
    const totalTandan = inspections.reduce(
      (curr, acc) => Number(acc.grading_result.total_tandan || 0) + curr,
      0,
    );

    const totalRejected = inspections.reduce((curr, item) => {
      return (
        Object.keys(item.grading_result["rejected_summary"] || {}).reduce(
          (n, k) =>
            n +
            Number(
              (item.grading_result["rejected_summary"][k] || {})[
                "BUAH KECIL DIBAWAH 5KG"
              ] || 0,
            ),
          0,
        ) +
        Number(item.grading_result["total_rejected"] || 0) +
        curr
      );
    }, 0);

    const totalPassed = inspections.reduce((curr, item) => {
      return (
        Number(item.grading_result["total_accepted"]) -
        Object.keys(item.grading_result["accepted_summary"]).reduce(
          (n, k) =>
            n +
            Number(
              item.grading_result["accepted_summary"][k][
                "BUAH KECIL DIBAWAH 5KG"
              ] || 0,
            ),
          0,
        ) +
        curr
      );
    }, 0);
    const totalFined = inspections.reduce(
      (curr, acc) => Number(acc.grading_result.total_fined || 0) + curr,
      0,
    );
    const totalInspection = inspections.length;

    const percentRejected = (totalRejected / totalTandan) * 100;
    const percentAccepted = (totalPassed / totalTandan) * 100;
    const percentFined = (totalFined / totalPassed) * 100;

    return {
      totalTandan,
      totalRejected,
      totalAccepted: totalPassed,
      totalFined,
      totalInspection,
      percentAccepted,
      percentFined,
      percentRejected,
    };
  },
  getAllMonitoringDataNew: (inspections) => {
    const totalTandan = inspections.reduce(
      (curr, acc) => Number(acc.grading_result.total_tandan || 0) + curr,
      0,
    );

    const totalRejected = inspections.reduce((curr, item) => {
      return Number(item.grading_result["total_rejected"] || 0) + curr;
    }, 0);

    const totalPassed = inspections.reduce((curr, item) => {
      return Number(item.grading_result["total_accepted"] || 0) + curr;
    }, 0);
    const totalFined = inspections.reduce(
      (curr, acc) => Number(acc.grading_result.total_fined || 0) + curr,
      0,
    );
    const totalInspection = inspections.length;

    const percentRejected = (totalRejected / totalTandan) * 100;
    const percentAccepted = (totalPassed / totalTandan) * 100;
    const percentFined = (totalFined / totalPassed) * 100;

    return {
      totalTandan,
      totalRejected,
      totalAccepted: totalPassed,
      totalFined,
      totalInspection,
      percentAccepted,
      percentFined,
      percentRejected,
    };
  },

  getTotalAndPercentClassificationNew: (item, isLngm = false) => {
    const totalTandan = item.grading_result["total_tandan"];
    let totalRejectedModified =
      Object.keys(item.grading_result["accepted_summary"] || {}).reduce(
        (n, k) =>
          n +
          Number(
            (item.grading_result["accepted_summary"][k] || {})[
              "BUAH KECIL DIBAWAH 5KG"
            ] || 0,
          ),
        0,
      ) + Number(item.grading_result["total_rejected"] || 0);
    let totalAcceptedModified =
      Number(item.grading_result["total_accepted"] || 0) -
      Object.keys(item.grading_result["accepted_summary"] || {}).reduce(
        (n, k) =>
          n +
          Number(
            (item.grading_result["accepted_summary"][k] || {})[
              "BUAH KECIL DIBAWAH 5KG"
            ] || 0,
          ),
        0,
      );
    const totalFined = item.grading_result["total_fined"];

    const percentAcceptedModified = countPercentage(
      totalAcceptedModified,
      totalTandan,
    );

    const percentAccepted = countPercentage(
      item["grading_result"]["total_accepted"],
      item["grading_result"]["total_tandan"],
    );

    const totalMatang = item.grading_result["accepted_summary"]?.["MATANG"]
      ? (item.grading_result["accepted_summary"]["MATANG"]["TOTAL"] || 0) -
        (item.grading_result["accepted_summary"]["MATANG"][
          "BUAH KECIL DIBAWAH 3KG"
        ] || 0) -
        (item.grading_result["accepted_summary"]["MATANG"][
          "BUAH KECIL DIBAWAH 5KG"
        ] || 0)
      : 0;
    const totalLewatMatang = item.grading_result["accepted_summary"]?.[
      "LEWAT MATANG"
    ]
      ? (item.grading_result["accepted_summary"]["LEWAT MATANG"]["TOTAL"] ||
          0) -
        (item.grading_result["accepted_summary"]["LEWAT MATANG"][
          "BUAH KECIL DIBAWAH 3KG"
        ] || 0) -
        (item.grading_result["accepted_summary"]["LEWAT MATANG"][
          "BUAH KECIL DIBAWAH 5KG"
        ] || 0)
      : 0;

    const totalMentahDiterima = item.grading_result["accepted_summary"]?.[
      "MENTAH"
    ]
      ? (item.grading_result["accepted_summary"]["MENTAH"]["TOTAL"] || 0) -
        (item.grading_result["accepted_summary"]["MENTAH"][
          "BUAH KECIL DIBAWAH 3KG"
        ] || 0) -
        (item.grading_result["accepted_summary"]["MENTAH"][
          "BUAH KECIL DIBAWAH 5KG"
        ] || 0)
      : 0;
    const totalJanjangKosongDiterima = item.grading_result[
      "accepted_summary"
    ]?.["JANJANG KOSONG"]
      ? (item.grading_result["accepted_summary"]["JANJANG KOSONG"]["TOTAL"] ||
          0) -
        (item.grading_result["accepted_summary"]["JANJANG KOSONG"][
          "BUAH KECIL DIBAWAH 3KG"
        ] || 0) -
        (isLngm
          ? item.grading_result["accepted_summary"]["JANJANG KOSONG"][
              "BUAH KECIL DIBAWAH 2KG"
            ] || 0
          : 0) -
        (item.grading_result["accepted_summary"]["JANJANG KOSONG"][
          "BUAH KECIL DIBAWAH 5KG"
        ] || 0)
      : 0;

    const totalMentah = item.grading_result["rejected_summary"]?.["MENTAH"]
      ? (item.grading_result["rejected_summary"]["MENTAH"]["TOTAL"] || 0) -
        (item.grading_result["rejected_summary"]["MENTAH"][
          "BUAH KECIL DIBAWAH 3KG"
        ] || 0) -
        (item.grading_result["rejected_summary"]["MENTAH"][
          "BUAH KECIL DIBAWAH 5KG"
        ] || 0)
      : 0;
    const totalJanjangKosong = item.grading_result["rejected_summary"]?.[
      "JANJANG KOSONG"
    ]
      ? (item.grading_result["rejected_summary"]["JANJANG KOSONG"]["TOTAL"] ||
          0) -
        (item.grading_result["rejected_summary"]["JANJANG KOSONG"][
          "BUAH KECIL DIBAWAH 3KG"
        ] || 0) -
        (item.grading_result["rejected_summary"]["JANJANG KOSONG"][
          "BUAH KECIL DIBAWAH 5KG"
        ] || 0)
      : 0;

    const { totalRusakDimakanTikus } = Object.keys(
      item.grading_result["rejected_summary"],
    ).reduce(
      (obj, key) => {
        const data = item["grading_result"]["rejected_summary"][key];

        obj["totalRusakDimakanTikus"] += data["RUSAK DIMAKAN TIKUS"] || 0;

        return obj;
      },
      { totalRusakDimakanTikus: 0 },
    );

    const totalMatangDitolak = item.grading_result["rejected_summary"]?.[
      "MATANG"
    ]
      ? (item.grading_result["rejected_summary"]["MATANG"]["TOTAL"] || 0) -
        (item.grading_result["rejected_summary"]["MATANG"][
          "BUAH KECIL DIBAWAH 3KG"
        ] || 0) -
        (item.grading_result["rejected_summary"]["MATANG"][
          "BUAH KECIL DIBAWAH 5KG"
        ] || 0)
      : 0;
    const totalLewatMatangDitolak = item.grading_result["rejected_summary"]?.[
      "LEWAT MATANG"
    ]
      ? (item.grading_result["rejected_summary"]["LEWAT MATANG"]["TOTAL"] ||
          0) -
        (item.grading_result["rejected_summary"]["LEWAT MATANG"][
          "BUAH KECIL DIBAWAH 3KG"
        ] || 0) -
        (item.grading_result["rejected_summary"]["LEWAT MATANG"][
          "BUAH KECIL DIBAWAH 5KG"
        ] || 0)
      : 0;

    const { totalBuahKecil3, totalBuahKecil5, totalBuahKecil2 } = Object.keys(
      item.grading_result["rejected_summary"],
    ).reduce(
      (obj, key) => {
        const data = item["grading_result"]["rejected_summary"][key];

        obj["totalBuahKecil3"] += data["BUAH KECIL DIBAWAH 3KG"] || 0;
        obj["totalBuahKecil5"] += data["BUAH KECIL DIBAWAH 5KG"] || 0;
        obj["totalBuahKecil2"] += data["BUAH KECIL DIBAWAH 2KG"] || 0;

        return obj;
      },
      { totalBuahKecil3: 0, totalBuahKecil5: 0, totalBuahKecil2: 0 },
    );

    const { totalBuahKecil5Diterima } = Object.keys(
      item.grading_result["accepted_summary"],
    ).reduce(
      (obj, key) => {
        const data = item["grading_result"]["accepted_summary"][key];

        obj["totalBuahKecil5Diterima"] += data["BUAH KECIL DIBAWAH 5KG"] || 0;

        return obj;
      },
      { totalBuahKecil5Diterima: 0 },
    );
    const { totalTangkaiPanjang } = Object.keys(
      item.grading_result["accepted_summary"],
    ).reduce(
      (obj, key) => {
        const data = item["grading_result"]["accepted_summary"][key];

        obj["totalTangkaiPanjang"] += data["TANGKAI PANJANG"] || 0;

        return obj;
      },
      { totalTangkaiPanjang: 0 },
    );

    const percentMatang = countPercentage(totalMatang, totalTandan);
    const percentLewatMatang = countPercentage(totalLewatMatang, totalTandan);
    const percentTangkaiPanjang = countPercentage(
      totalTangkaiPanjang,
      totalAcceptedModified,
    );
    const percentMentah = countPercentage(totalMentah, totalTandan);
    const percentJangkos = countPercentage(totalJanjangKosong, totalTandan);
    const percentBuahKecil3 = countPercentage(totalBuahKecil3, totalTandan);
    const percentBuahKecil5 = countPercentage(totalBuahKecil5, totalTandan);
    const percentBuahKecil2 = countPercentage(totalBuahKecil2, totalTandan);
    const percentBuahKecil = countPercentage(
      totalBuahKecil3 + totalBuahKecil5 + (isLngm ? totalBuahKecil2 : 0),
      totalTandan,
    );

    const percentRusakDimakanTikus = countPercentage(
      totalRusakDimakanTikus,
      totalTandan,
    );
    const percentMentahDiterima = countPercentage(
      totalMentahDiterima,
      totalTandan,
    );
    const percentJanjangKosongDiterima = countPercentage(
      totalJanjangKosongDiterima,
      totalTandan,
    );
    const percentBuahKecil5Diterima = countPercentage(
      totalBuahKecil5Diterima,
      totalTandan,
    );
    const percentMatangDitolak = countPercentage(
      totalMatangDitolak,
      totalTandan,
    );
    const percentLewatMatangDitolak = countPercentage(
      totalLewatMatangDitolak,
      totalTandan,
    );

    // console.log({
    //   percentMLM: percentMatang + percentLewatMatang,
    //   percentAccepted,
    // });

    totalAcceptedModified =
      totalMatang +
      totalLewatMatang +
      totalJanjangKosongDiterima +
      totalBuahKecil5Diterima +
      totalMentahDiterima;

    totalRejectedModified =
      totalMentah +
      totalJanjangKosong +
      totalBuahKecil3 +
      totalBuahKecil5 +
      (isLngm ? totalBuahKecil2 : 0) +
      totalMatangDitolak +
      totalLewatMatangDitolak +
      totalRusakDimakanTikus;

    const totalMultiple = item.grading_result?.["total_multiple"] || 0;

    return {
      totalMatang,
      totalLewatMatang,
      totalMentah,
      totalJanjangKosong,
      totalBuahKecil3,
      totalBuahKecil5,
      totalBuahKecil2,
      totalTangkaiPanjang,
      percentBuahKecil,
      percentJangkos,
      percentBuahKecil3,
      percentBuahKecil5,
      percentBuahKecil2,
      percentLewatMatang,
      percentMatang,
      percentMentah,
      percentTangkaiPanjang,
      // percentAcceptedModified: percentAccepted,
      // totalAcceptedModified: item['grading_result']['total_accepted'],
      // totalRejectedModified: item['grading_result']['total_rejected'],
      percentAcceptedModified: percentAcceptedModified,
      totalAcceptedModified: totalAcceptedModified,
      totalRejectedModified: totalRejectedModified,
      totalTandan,
      totalFined,
      totalMultiple,

      totalMentahDiterima,
      totalJanjangKosongDiterima,
      totalBuahKecil5Diterima,
      percentMentahDiterima,
      percentJanjangKosongDiterima,
      percentBuahKecil5Diterima,
      totalMatangDitolak,
      totalLewatMatangDitolak,
      percentMatangDitolak,
      percentLewatMatangDitolak,
      totalRusakDimakanTikus,
      percentRusakDimakanTikus,
    };
  },
};

const generateTemplate = (array) => {
  return array.reduce((curr, m) => {
    if (!Object.keys(curr).includes(m)) {
      curr[m] = {};
    }

    return curr;
  }, {});
};

const dictionaryPerformance = {
  total_accepted: "Diterima",
  total_rejected: "Ditolak",
  total_fined: "Didenda",
};

const objectToTitleDataArray = (obj) => {
  return Object.keys(obj).map((key) => ({
    title: key,
    data: Object.keys(obj[key]).map((k) => {
      return {
        name: dictionaryPerformance[k],
        total: obj[key][k]["value"],
      };
    }),
  }));
};

const converToObjectData = (obj) => {
  return Object.keys(obj).reduce((o, k) => {
    if (!o[k]) {
      o[k] = [];
    }
    o[k] = objectToTitleDataArray(obj[k]);

    return o;
  }, {});
};

const setChartDataValue = (
  object,
  keyTime,
  time,
  keyItem,
  valueItem,
  asArray = false,
) => {
  if (Array.isArray(keyItem)) {
    keyItem.forEach((key, index) => {
      if (!object[keyTime][time]) {
        object[keyTime][time] = {};
      }
      if (asArray) {
        // console.log({ key });
        if (!object[keyTime][time][key]) {
          object[keyTime][time][key] = [];
        }
        object[keyTime][time][key].push(valueItem[index]);
        return;
      }

      // console.log({ object: object[keyTime][time] });
      if (!object[keyTime][time]?.[key]) {
        object[keyTime][time][key] = 0;
      }
      object[keyTime][time][key] += valueItem[index];
    });
  } else {
    if (asArray) {
      if (!object[keyTime][time][keyItem]) {
        object[keyTime][time][keyItem] = [];
      }
      object[keyTime][time][keyItem].push(valueItem);
      return;
    }
    if (!object[keyTime][time][keyItem]) {
      object[keyTime][time][keyItem] = 0;
    }
    object[keyTime][time][keyItem] += valueItem;
  }
};

const generateChartArrayFromObject = (data = {}, isArrayValue = false) => {
  return Object.entries(data).reduce(
    (obj, [key, value]) => {
      obj[key] = Object.entries(value)
        .map(([k, v]) => {
          return {
            title: k,
            data: Object.entries(v)
              .map(([k2, v2]) => {
                if (k2 === "Total") return;

                const t = isArrayValue
                  ? v2.reduce((n, i) => n + (i || 0), 0)
                  : v2;

                return {
                  name: k2,
                  total: isArrayValue
                    ? t / v2.length
                    : countPercentage(
                        t,
                        k2 === "Didenda"
                          ? data[key][k]["Diterima"]
                          : data[key][k]["Total"],
                      ),
                };
              })
              .filter(Boolean),
          };
        })
        .filter(Boolean);

      if (key === "monthly") {
        const monthOrder = {
          January: 1,
          February: 2,
          March: 3,
          April: 4,
          May: 5,
          June: 6,
          July: 7,
          August: 8,
          September: 9,
          October: 10,
          November: 11,
          December: 12,
        };

        obj[key].sort((a, b) => {
          const [monthA, yearA] = a.title.split(" ");
          const [monthB, yearB] = b.title.split(" ");

          if (yearA !== yearB) {
            return Number(yearA) - Number(yearB);
          }
          return monthOrder[monthA] - monthOrder[monthB];
        });
      } else if (key === "daily") {
        obj[key].sort((a, b) => {
          const [dayA, monthA, yearA] = a.title.split("/");
          const [dayB, monthB, yearB] = b.title.split("/");

          const dateA = new Date(`${yearA}-${monthA}-${dayA}`);
          const dateB = new Date(`${yearB}-${monthB}-${dayB}`); // Assuming DD/MM/YYYY format based on usage

          // Fallback if parsing fails or logical comparison
          if (dateA && dateB && !isNaN(dateA) && !isNaN(dateB)) {
            return dateA - dateB;
          }
          // if date format is DD/MM/YY
          const fullYearA =
            Number(yearA) < 100 ? 2000 + Number(yearA) : Number(yearA);
          const fullYearB =
            Number(yearB) < 100 ? 2000 + Number(yearB) : Number(yearB);
          const dA = new Date(fullYearA, Number(monthA) - 1, Number(dayA));
          const dB = new Date(fullYearB, Number(monthB) - 1, Number(dayB));
          return dA - dB;
        });
      }

      return obj;
    },
    { daily: [], monthly: [], weekly: [] },
  );
};

const generateChartArrayFromObjectTrucks = (data = {}) => {
  return Object.entries(data).reduce(
    (obj, [key, value]) => {
      obj[key] = Object.entries(value)
        .map(([k, v]) => {
          return {
            title: k,
            data: Object.entries(v)
              .map(([k2, v2]) => {
                if (k2.includes("Mesin")) return;
                return {
                  name: k2,
                  total: v2,
                  machines: [
                    {
                      name: "Mesin 1",
                      total: data[key][k]["Mesin 1"],
                    },
                    {
                      name: "Mesin 2",
                      total: data[key][k]["Mesin 2"],
                    },
                    {
                      name: "Mesin 3",
                      total: data[key][k]["Mesin 3"],
                    },
                    {
                      name: "Mesin 4",
                      total: data[key][k]["Mesin 4"],
                    },
                  ],
                };
              })
              .filter(Boolean),
          };
        })
        .filter(Boolean);

      return obj;
    },
    { daily: [], monthly: [], weekly: [] },
  );
};

function getTopScores(inspections, count = 10) {
  const sorted = [...inspections].sort((a, b) => {
    return a.percent_accepted - b.percent_accepted;
  });

  return {
    lowest: sorted.slice(0, count),
    highest: sorted.slice(-count).reverse(),
  };
}

function processInspectionData(inspections) {
  // Define which metrics have higher values for better ranks
  const higherIsBetter = {
    percent_matang: true,
    percent_lewat_matang: true,
    percent_mentah: false,
    percent_janjang_kosong: false,
    percent_buah_kecil: false,
    percent_tangkai_panjang: false,
    percent_rusak_dimakan_tikus: false,
  };

  // Get all percentage metrics (excluding "percent_accepted" as it's not in the ranking criteria)
  const percentMetrics = Object.keys(higherIsBetter);

  // For each metric, calculate ranks
  const rankedMetrics = {};
  percentMetrics.forEach((metric) => {
    // Sort inspections based on the metric value
    const sorted = [...inspections].sort((a, b) => {
      return higherIsBetter[metric]
        ? b[metric] - a[metric] // Higher values rank better
        : a[metric] - b[metric]; // Lower values rank better
    });

    // Assign ranks
    sorted.forEach((inspection, index) => {
      if (!rankedMetrics[inspection._id]) {
        rankedMetrics[inspection._id] = {
          _id: inspection._id,
          vehicle_number: inspection.vehicle_number,
          vendor_name: inspection.vendor_name,
          score: inspection.score,
          total_tandan: inspection.total_tandan,
          date: inspection.date,
          finish_date: inspection.finish_date,
          percent_accepted: inspection.percent_accepted,
        };
      }

      // Add this metric with its percent and rank
      rankedMetrics[inspection._id][metric] = {
        percent: inspection[metric],
        rank: index + 1, // Rank starts from 1
      };
    });
  });

  return Object.values(rankedMetrics);
}

function processVendorData(vendors) {
  // Define which metrics have higher values for better ranks
  const higherIsBetter = {
    avg_matang: true,
    avg_lewat_matang: true,
    avg_mentah: false,
    avg_janjang_kosong: false,
    avg_buah_kecil: false,
    avg_tangkai_panjang: false,
    avg_rusak_dimakan_tikus: false,
    avg_accepted: true,
    count: true,
    percent_supply: true,
    avg_tandan: true,
  };

  // Convert string values to numbers
  const normalizedVendors = vendors.map((vendor) => {
    const normalizedVendor = { ...vendor };

    Object.keys(vendor).forEach((key) => {
      if (
        typeof vendor[key] === "string" &&
        !isNaN(parseFloat(vendor[key].replace(/,/g, "")))
      ) {
        normalizedVendor[key] = parseFloat(vendor[key].replace(/,/g, ""));
      }
    });

    return normalizedVendor;
  });

  // Get all metrics that need ranking
  const metricsToRank = Object.keys(higherIsBetter);

  // Create a new array to hold ranked vendors
  const rankedVendors = normalizedVendors.map((vendor) => {
    // Create base object with original data
    const rankedVendor = {
      vendor_name: vendor.vendor_name,
    };

    // Initialize each metric with its value
    metricsToRank.forEach((metric) => {
      if (vendor[metric] !== undefined) {
        rankedVendor[metric] = {
          percent: vendor[metric],
        };
      }
    });

    return rankedVendor;
  });

  // For each metric, calculate and assign ranks
  metricsToRank.forEach((metric) => {
    // Filter vendors that have this metric
    const vendorsWithMetric = normalizedVendors.filter(
      (v) => v[metric] !== undefined,
    );

    if (vendorsWithMetric.length === 0) return;

    // Sort vendors based on this metric
    const sorted = [...vendorsWithMetric].sort((a, b) => {
      return higherIsBetter[metric]
        ? b[metric] - a[metric] // Higher values rank better
        : a[metric] - b[metric]; // Lower values rank better
    });

    // Create a map of vendor_name to rank
    const rankMap = {};
    sorted.forEach((vendor, index) => {
      rankMap[vendor.vendor_name] = index + 1; // Rank starts from 1
    });

    // Assign ranks to each vendor for this metric
    rankedVendors.forEach((vendor) => {
      if (vendor[metric]) {
        vendor[metric].rank = rankMap[vendor.vendor_name];
      }
    });
  });

  return rankedVendors;
}

const millisecondsToMinutes = (ms) => {
  return Math.floor(ms / (1000 * 60));
};

const getDurationStringFromMs = (ms) => {
  const minutes = Math.floor(ms / (1000 * 60));
  const seconds = Math.floor((ms % (1000 * 60)) / 1000);

  // Build the duration string
  let durationString = "";

  if (minutes > 0) {
    durationString += `${minutes} menit`;
  }

  if (seconds > 0) {
    if (minutes > 0) durationString += " ";
    durationString += `${seconds} detik`;
  }

  // Handle edge case of 0 duration
  if (durationString === "") {
    durationString = "0 detik";
  }

  return durationString;
};

const getDurationMs = (startDate, endDate) => {
  const start = dayjs(startDate);
  const end = dayjs(endDate);

  // Calculate difference in milliseconds
  const diffMs = end.diff(start, "milliseconds");

  // Convert to minutes and seconds
  return diffMs;
};

function countDays(daysDateArray) {
  const dayCount = {
    Senin: 0,
    Selasa: 0,
    Rabu: 0,
    Kamis: 0,
    Jumat: 0,
    Sabtu: 0,
    Minggu: 0,
  };

  for (const item of daysDateArray) {
    if (dayCount[item.day] !== undefined) {
      dayCount[item.day]++;
    }
  }

  return dayCount;
}

function addRankingsToVendorData(data) {
  if (!Array.isArray(data) || data.length === 0) {
    return data;
  }

  // Create copies of the data for sorting
  const forSupplyRanking = [...data];
  const forPercentRanking = [...data];

  // Sort by supply (descending)
  forSupplyRanking.sort((a, b) => b.supply - a.supply);

  // Sort by percent (descending)
  forPercentRanking.sort((a, b) => b.percent - a.percent);

  // Create maps to store the ranks
  const supplyRanks = new Map();
  const percentRanks = new Map();

  // Assign supply ranks
  forSupplyRanking.forEach((item, index) => {
    supplyRanks.set(item.vendor_name, index + 1);
  });

  // Assign percent ranks
  forPercentRanking.forEach((item, index) => {
    percentRanks.set(item.vendor_name, index + 1);
  });

  // Add ranks to the original data
  let final = data.map((item) => {
    item.supply_rank = supplyRanks.get(item.vendor_name);
    item.percent_rank = percentRanks.get(item.vendor_name);

    return item;
  });

  console.log({ final });

  return final;
}

function addRankingsWithTieHandling(data, classification) {
  if (!Array.isArray(data) || data.length === 0) {
    return data;
  }

  // Define classification rules
  const higherIsBetter = ["matang", "lewat_matang"];
  const lowerIsBetter = [
    "janjang_kosong",
    "mentah",
    "tangkai_panjang",
    "buah_kecil_3",
    "buah_kecil_5",
    "rusak_dimakan_tikus",
  ];

  // Determine sort direction based on classification
  const isLowerBetter = lowerIsBetter.includes(classification);

  // Create copies of the data for sorting
  const forSupplyRanking = [...data];
  const forPercentRanking = [...data];

  // Sort based on classification rule

  forSupplyRanking.sort((a, b) => b.supply - a.supply);
  if (isLowerBetter) {
    // Ascending for lower is better
    forPercentRanking.sort((a, b) => a.percent - b.percent);
  } else {
    // Descending for higher is better (default)
    forPercentRanking.sort((a, b) => b.percent - a.percent);
  }

  // Assign supply ranks with tie handling
  let currentRank = 1;
  let currentValue = forSupplyRanking[0]?.supply;
  const supplyRanks = new Map();

  forSupplyRanking.forEach((item, index) => {
    if (index > 0 && item.supply !== currentValue) {
      currentRank = index + 1;
      currentValue = item.supply;
    }
    supplyRanks.set(item.vendor_name, currentRank);
  });

  // Assign percent ranks with tie handling
  currentRank = 1;
  currentValue = forPercentRanking[0]?.percent;
  const percentRanks = new Map();

  forPercentRanking.forEach((item, index) => {
    if (index > 0 && item.percent !== currentValue) {
      currentRank = index + 1;
      currentValue = item.percent;
    }
    percentRanks.set(item.vendor_name, currentRank);
  });

  // Add ranks to the original data
  data.forEach((item) => {
    item.supply_rank = supplyRanks.get(item.vendor_name);
    item.percent_rank = percentRanks.get(item.vendor_name);
  });

  return data;
}

class DashboardV4Controller {
  static async getDataDashboard(req, res, next) {
    try {
      const user = req.user;
      const {
        year = new Date().getFullYear(),
        factory = "",
        date_to = null,
        date_from = null,
        vendor_type = null,
        vendor = null,
      } = req.query;

      let ids = req.query.vendor || req.query.ids;
      ids = Array.isArray(ids)
        ? ids
        : typeof ids === "string"
          ? ids.split(",")
          : [];
      const uniqIds = [...new Set(ids.map((s) => s.trim()).filter(Boolean))];

      const weeks = generateWeeks(year);
      const days = generateDatesByYear(year, "DD/MM/YY");
      let months = generateMonths(year);

      if (date_from && date_to) {
        months = [];
        let currentMonth = dayjs(date_from).startOf("month");
        const endMonth = dayjs(date_to).endOf("month");

        while (
          currentMonth.isBefore(endMonth) ||
          currentMonth.isSame(endMonth, "month")
        ) {
          months.push(currentMonth.format("MMMM YYYY"));
          currentMonth = currentMonth.add(1, "month");
        }
      }

      let q = { company: user.company };

      if (uniqIds.length) {
        q["vendor"] = { $in: uniqIds };
      }

      if (date_from && date_to) {
        q["date"] = {
          $gte: dayjs(date_from).hour(6).minute(0).second(0).millisecond(0),
          $lte: dayjs(date_to)
            .add(1, "day")
            .hour(5)
            .minute(59)
            .second(59)
            .millisecond(999),
        };
      }

      if (factory) {
        q["factory"] = factory;
      }

      const factoryObj = factory
        ? await FactoryModel.findById(factory).lean()
        : null;
      const isLngm =
        factoryObj && ["LNGM"].some((loc) => factoryObj.name.includes(loc));

      if (vendor_type) {
        const vTypeLower = vendor_type.toLowerCase();
        if (isLngm && (vTypeLower === 'gapoktan' || vTypeLower === 'stka')) {
          q["vendor_name"] = { $regex: new RegExp(vendor_type, 'i') };
        } else if (vTypeLower !== 'all') {
          q["vendor_type"] = vendor_type;
        }
      }

      // if (year) {
      //   q['year'] = Number(year);
      // }

      let inspections = await InspectionDataModel.find(q).sort({ date: -1 });

      const limit = await getCompanyLimitTandan(user);

      inspections = inspections.filter(
        (e) =>
          e.grading_result?.total_tandan > limit &&
          e.vehicle_number !== "BH 1240 ALB" &&
          e.vendor_name !== "Vendor 2 Plasma" &&
          e.vendor_name !== "Vendor B" &&
          e.vehicle_number !== "BH 4321 ALB",
      );

      const {
        totalTandan,
        totalAccepted,
        totalFined,
        totalRejected,
        totalInspection,
        percentAccepted,
        percentFined,
        percentRejected,
      } = utilsInspection.getAllMonitoringData(inspections);

      const avgClassification = {
        matang: [],
        lewat_matang: [],
        mentah_diterima: [],
        janjang_kosong_diterima: [],
        buah_kecil_5_diterima: [],
        mentah: [],
        janjang_kosong: [],
        buah_kecil_3: [],
        buah_kecil_5: [],
        buah_kecil_2: [],
        tangkai_panjang: [],
        rusak_dimakan_tikus: [],
      };
      const avgAcceptedVendor = {};
      const summaryPerformance = {
        daily: generateTemplate(days),
        weekly: generateTemplate(weeks),
        monthly: generateTemplate(months),
      };
      const gradingTrucks = {
        daily: generateTemplate(days),
        weekly: generateTemplate(weeks),
        monthly: generateTemplate(months),
      };
      const fruitAccepted = {
        daily: generateTemplate(days),
        weekly: generateTemplate(weeks),
        monthly: generateTemplate(months),
      };
      const fruitRejected = {
        daily: generateTemplate(days),
        weekly: generateTemplate(weeks),
        monthly: generateTemplate(months),
      };
      const fruitTp = {
        daily: generateTemplate(days),
        weekly: generateTemplate(weeks),
        monthly: generateTemplate(months),
      };

      const averageVendor = {};

      let avgClassificationTren = {
        matang: {},
        lewat_matang: {},
        mentah_diterima: {},
        janjang_kosong_diterima: {},
        buah_kecil_5_diterima: {},
        mentah: {},
        janjang_kosong: {},
        buah_kecil_3: {},
        buah_kecil_5: {},
        buah_kecil_2: {},
        tangkai_panjang: {},
        rusak_dimakan_tikus: {},
      };
      let avgClassificationVendor = {
        matang: {},
        lewat_matang: {},
        mentah_diterima: {},
        janjang_kosong_diterima: {},
        buah_kecil_5_diterima: {},
        mentah: {},
        janjang_kosong: {},
        buah_kecil_3: {},
        buah_kecil_5: {},
        buah_kecil_2: {},
        tangkai_panjang: {},
        rusak_dimakan_tikus: {},
      };

      let avgAcceptedVendorHistory = {};
      let avgAcceptedVendorHistoryDaily = {};

      // Check if filtering by date range with more than 1 day
      const hasMultipleDates =
        date_from &&
        date_to &&
        dayjs(date_from).format("YYYY-MM-DD") !==
          dayjs(date_to).format("YYYY-MM-DD");

      // factoryObj and isLngm moved above

      inspections = inspections.map((item) => {
        const vendorName = item.vendor_name;
        // Adjust date for shift-based day (06:00 to 05:59 next day) only when filtering multiple dates
        const dateForGrouping = hasMultipleDates
          ? dayjs(item["date"]).subtract(6, "hour").toDate()
          : item["date"];
        const { day, monthYear } = getDateMonthYearDay(
          dateForGrouping,
          true,
          "DD/MM/YY",
        );
        const week = getWeekNumber(dateForGrouping);

        const {
          percentJangkos,
          percentBuahKecil3,
          percentBuahKecil5,
          percentLewatMatang,
          percentMatang,
          percentMentah,
          percentTangkaiPanjang,
          percentAcceptedModified,
          totalAcceptedModified,
          totalRejectedModified,
          totalFined: totalFinedItem,
          totalTandan: totalTandanItem,
          totalMatang,
          totalMentah,
          totalLewatMatang,
          totalBuahKecil3,
          totalBuahKecil5,
          totalJanjangKosong,
          totalTangkaiPanjang,
          percentBuahKecil,
          percentBuahKecil2,
          totalBuahKecil2,

          totalMentahDiterima,
          totalJanjangKosongDiterima,
          totalBuahKecil5Diterima,
          percentMentahDiterima,
          percentJanjangKosongDiterima,
          percentBuahKecil5Diterima,
          percentRusakDimakanTikus,
        } = utilsInspection.getTotalAndPercentClassification(item, isLngm);

        avgClassification["matang"].push(percentMatang);
        avgClassification["lewat_matang"].push(percentLewatMatang);
        avgClassification["mentah"].push(percentMentah);
        avgClassification["janjang_kosong"].push(percentJangkos);
        avgClassification["buah_kecil_3"].push(percentBuahKecil3);
        avgClassification["buah_kecil_5"].push(percentBuahKecil5);
        if (isLngm) avgClassification["buah_kecil_2"].push(percentBuahKecil2);
        avgClassification["tangkai_panjang"].push(percentTangkaiPanjang);
        avgClassification["rusak_dimakan_tikus"].push(percentRusakDimakanTikus);

        avgClassification["mentah_diterima"].push(percentMentahDiterima);
        avgClassification["janjang_kosong_diterima"].push(
          percentJanjangKosongDiterima,
        );
        avgClassification["buah_kecil_5_diterima"].push(
          percentBuahKecil5Diterima,
        );

        if (!avgClassificationTren["matang"][day]) {
          avgClassificationTren["matang"][day] = [];
        }
        avgClassificationTren["matang"][day].push(percentMatang);

        if (!avgClassificationTren["lewat_matang"][day]) {
          avgClassificationTren["lewat_matang"][day] = [];
        }
        avgClassificationTren["lewat_matang"][day].push(percentLewatMatang);

        if (!avgClassificationTren["mentah"][day]) {
          avgClassificationTren["mentah"][day] = [];
        }
        avgClassificationTren["mentah"][day].push(percentMentah);

        if (!avgClassificationTren["janjang_kosong"][day]) {
          avgClassificationTren["janjang_kosong"][day] = [];
        }
        avgClassificationTren["janjang_kosong"][day].push(percentJangkos);

        if (!avgClassificationTren["buah_kecil_3"][day]) {
          avgClassificationTren["buah_kecil_3"][day] = [];
        }
        avgClassificationTren["buah_kecil_3"][day].push(percentBuahKecil3);

        if (!avgClassificationTren["buah_kecil_5"][day]) {
          avgClassificationTren["buah_kecil_5"][day] = [];
        }
        avgClassificationTren["buah_kecil_5"][day].push(percentBuahKecil5);

        if (isLngm) {
          if (!avgClassificationTren["buah_kecil_2"][day]) {
            avgClassificationTren["buah_kecil_2"][day] = [];
          }
          avgClassificationTren["buah_kecil_2"][day].push(percentBuahKecil2);
        }

        if (!avgClassificationTren["tangkai_panjang"][day]) {
          avgClassificationTren["tangkai_panjang"][day] = [];
        }
        avgClassificationTren["tangkai_panjang"][day].push(
          percentTangkaiPanjang,
        );

        if (!avgClassificationTren["rusak_dimakan_tikus"][day]) {
          avgClassificationTren["rusak_dimakan_tikus"][day] = [];
        }
        avgClassificationTren["rusak_dimakan_tikus"][day].push(
          percentRusakDimakanTikus,
        );

        // new
        if (!avgClassificationTren["mentah_diterima"][day]) {
          avgClassificationTren["mentah_diterima"][day] = [];
        }
        avgClassificationTren["mentah_diterima"][day].push(
          percentMentahDiterima,
        );
        if (!avgClassificationTren["janjang_kosong_diterima"][day]) {
          avgClassificationTren["janjang_kosong_diterima"][day] = [];
        }
        avgClassificationTren["janjang_kosong_diterima"][day].push(
          percentJanjangKosongDiterima,
        );
        if (!avgClassificationTren["buah_kecil_5_diterima"][day]) {
          avgClassificationTren["buah_kecil_5_diterima"][day] = [];
        }
        avgClassificationTren["buah_kecil_5_diterima"][day].push(
          percentBuahKecil5Diterima,
        );

        if (!avgClassificationVendor["matang"][vendorName]) {
          avgClassificationVendor["matang"][vendorName] = {
            count: 0,
            percent: 0,
          };
        }
        avgClassificationVendor["matang"][vendorName]["count"] += 1;
        avgClassificationVendor["matang"][vendorName]["percent"] +=
          percentMatang;

        if (!avgClassificationVendor["lewat_matang"][vendorName]) {
          avgClassificationVendor["lewat_matang"][vendorName] = {
            count: 0,
            percent: 0,
          };
        }
        avgClassificationVendor["lewat_matang"][vendorName]["count"] += 1;
        avgClassificationVendor["lewat_matang"][vendorName]["percent"] +=
          percentLewatMatang;

        if (!avgClassificationVendor["mentah"][vendorName]) {
          avgClassificationVendor["mentah"][vendorName] = {
            count: 0,
            percent: 0,
          };
        }
        avgClassificationVendor["mentah"][vendorName]["count"] += 1;
        avgClassificationVendor["mentah"][vendorName]["percent"] +=
          percentMentah;

        if (!avgClassificationVendor["janjang_kosong"][vendorName]) {
          avgClassificationVendor["janjang_kosong"][vendorName] = {
            count: 0,
            percent: 0,
          };
        }
        avgClassificationVendor["janjang_kosong"][vendorName]["count"] += 1;
        avgClassificationVendor["janjang_kosong"][vendorName]["percent"] +=
          percentJangkos;

        if (!avgClassificationVendor["buah_kecil_3"][vendorName]) {
          avgClassificationVendor["buah_kecil_3"][vendorName] = {
            count: 0,
            percent: 0,
          };
        }
        avgClassificationVendor["buah_kecil_3"][vendorName]["count"] += 1;
        avgClassificationVendor["buah_kecil_3"][vendorName]["percent"] +=
          percentBuahKecil3;

        if (!avgClassificationVendor["buah_kecil_5"][vendorName]) {
          avgClassificationVendor["buah_kecil_5"][vendorName] = {
            count: 0,
            percent: 0,
          };
        }
        avgClassificationVendor["buah_kecil_5"][vendorName]["count"] += 1;
        avgClassificationVendor["buah_kecil_5"][vendorName]["percent"] +=
          percentBuahKecil5;

        if (isLngm) {
          if (!avgClassificationVendor["buah_kecil_2"][vendorName]) {
            avgClassificationVendor["buah_kecil_2"][vendorName] = {
              count: 0,
              percent: 0,
            };
          }
          avgClassificationVendor["buah_kecil_2"][vendorName]["count"] += 1;
          avgClassificationVendor["buah_kecil_2"][vendorName]["percent"] +=
            percentBuahKecil2;
        }

        if (!avgClassificationVendor["tangkai_panjang"][vendorName]) {
          avgClassificationVendor["tangkai_panjang"][vendorName] = {
            count: 0,
            percent: 0,
          };
        }
        avgClassificationVendor["tangkai_panjang"][vendorName]["count"] += 1;
        avgClassificationVendor["tangkai_panjang"][vendorName]["percent"] +=
          percentTangkaiPanjang;

        if (!avgClassificationVendor["rusak_dimakan_tikus"][vendorName]) {
          avgClassificationVendor["rusak_dimakan_tikus"][vendorName] = {
            count: 0,
            percent: 0,
          };
        }
        avgClassificationVendor["rusak_dimakan_tikus"][vendorName]["count"] +=
          1;
        avgClassificationVendor["rusak_dimakan_tikus"][vendorName]["percent"] +=
          percentRusakDimakanTikus;

        // new
        if (!avgClassificationVendor["mentah_diterima"][vendorName]) {
          avgClassificationVendor["mentah_diterima"][vendorName] = {
            count: 0,
            percent: 0,
          };
        }
        avgClassificationVendor["mentah_diterima"][vendorName]["count"] += 1;
        avgClassificationVendor["mentah_diterima"][vendorName]["percent"] +=
          percentMentahDiterima;
        if (!avgClassificationVendor["janjang_kosong_diterima"][vendorName]) {
          avgClassificationVendor["janjang_kosong_diterima"][vendorName] = {
            count: 0,
            percent: 0,
          };
        }
        avgClassificationVendor["janjang_kosong_diterima"][vendorName][
          "count"
        ] += 1;
        avgClassificationVendor["janjang_kosong_diterima"][vendorName][
          "percent"
        ] += percentJanjangKosongDiterima;
        if (!avgClassificationVendor["buah_kecil_5_diterima"][vendorName]) {
          avgClassificationVendor["buah_kecil_5_diterima"][vendorName] = {
            count: 0,
            percent: 0,
          };
        }
        avgClassificationVendor["buah_kecil_5_diterima"][vendorName]["count"] +=
          1;
        avgClassificationVendor["buah_kecil_5_diterima"][vendorName][
          "percent"
        ] += percentBuahKecil5Diterima;

        if (!avgAcceptedVendor[vendorName]) {
          avgAcceptedVendor[vendorName] = [];
        }
        avgAcceptedVendor[vendorName].push(percentAcceptedModified);

        // Summary Performance
        setChartDataValue(
          summaryPerformance,
          "daily",
          day,
          ["Diterima", "Ditolak", "Didenda", "Total"],
          [
            totalAcceptedModified,
            totalRejectedModified,
            totalFinedItem,
            totalTandanItem,
          ],
        );
        setChartDataValue(
          summaryPerformance,
          "weekly",
          week,
          ["Diterima", "Ditolak", "Didenda", "Total"],
          [
            totalAcceptedModified,
            totalRejectedModified,
            totalFinedItem,
            totalTandanItem,
          ],
        );
        setChartDataValue(
          summaryPerformance,
          "monthly",
          monthYear,
          ["Diterima", "Ditolak", "Didenda", "Total"],
          [
            totalAcceptedModified,
            totalRejectedModified,
            totalFinedItem,
            totalTandanItem,
          ],
        );

        // Grading Trucks
        setChartDataValue(
          gradingTrucks,
          "daily",
          day,
          ["Truk", "Mesin 1", "Mesin 2", "Mesin 3", "Mesin 4"],
          [
            1,
            item.machine === 1 ? 1 : 0,
            item.machine === 2 ? 1 : 0,
            item.machine === 3 ? 1 : 0,
            item.machine === 4 ? 1 : 0,
          ],
        );
        setChartDataValue(
          gradingTrucks,
          "weekly",
          week,
          ["Truk", "Mesin 1", "Mesin 2", "Mesin 3", "Mesin 4"],
          [
            1,
            item.machine === 1 ? 1 : 0,
            item.machine === 2 ? 1 : 0,
            item.machine === 3 ? 1 : 0,
            item.machine === 4 ? 1 : 0,
          ],
        );
        setChartDataValue(
          gradingTrucks,
          "monthly",
          monthYear,
          ["Truk", "Mesin 1", "Mesin 2", "Mesin 3", "Mesin 4"],
          [
            1,
            item.machine === 1 ? 1 : 0,
            item.machine === 2 ? 1 : 0,
            item.machine === 3 ? 1 : 0,
            item.machine === 4 ? 1 : 0,
          ],
        );

        // Fruit Accepted
        setChartDataValue(
          fruitAccepted,
          "daily",
          day,
          ["Matang", "Lewat Matang"],
          [percentMatang, percentLewatMatang],
          true,
        );
        setChartDataValue(
          fruitAccepted,
          "weekly",
          week,
          ["Matang", "Lewat Matang"],
          [percentMatang, percentLewatMatang],
          true,
        );
        setChartDataValue(
          fruitAccepted,
          "monthly",
          monthYear,
          ["Matang", "Lewat Matang"],
          [percentMatang, percentLewatMatang],
          true,
        );

        // Fruit Tp
        setChartDataValue(
          fruitTp,
          "daily",
          day,
          ["Tangkai Panjang"],
          [percentTangkaiPanjang],
          true,
        );
        setChartDataValue(
          fruitTp,
          "weekly",
          week,
          ["Tangkai Panjang"],
          [percentTangkaiPanjang],
          true,
        );
        setChartDataValue(
          fruitTp,
          "monthly",
          monthYear,
          ["Tangkai Panjang"],
          [percentTangkaiPanjang],
          true,
        );

        // Fruit Rejected
        setChartDataValue(
          fruitRejected,
          "daily",
          day,
          [
            "Mentah",
            // 'Lewat Matang',
            "Janjang Kosong",
            "Buah <3kg",
            "Buah 3-5kg",
            ...(isLngm ? ["Buah <2kg"] : []),
            "Rusak Dimakan Tikus",
          ],
          [
            percentMentah,
            // percentLewatMatang,
            percentJangkos,
            percentBuahKecil3,
            percentBuahKecil5,
            ...(isLngm ? [percentBuahKecil2] : []),
            percentRusakDimakanTikus,
          ],
          true,
        );
        setChartDataValue(
          fruitRejected,
          "weekly",
          week,
          [
            "Mentah",
            // 'Lewat Matang',
            "Janjang Kosong",
            "Buah <3kg",
            "Buah 3-5kg",
            ...(isLngm ? ["Buah <2kg"] : []),
            "Rusak Dimakan Tikus",
          ],
          [
            percentMentah,
            // percentLewatMatang,
            percentJangkos,
            percentBuahKecil3,
            percentBuahKecil5,
            ...(isLngm ? [percentBuahKecil2] : []),
            percentRusakDimakanTikus,
          ],
          true,
        );
        setChartDataValue(
          fruitRejected,
          "monthly",
          monthYear,
          [
            "Mentah",
            // 'Lewat Matang',
            "Janjang Kosong",
            "Buah <3kg",
            "Buah 3-5kg",
            ...(isLngm ? ["Buah <2kg"] : []),
            "Rusak Dimakan Tikus",
          ],
          [
            percentMentah,
            // percentLewatMatang,
            percentJangkos,
            percentBuahKecil3,
            percentBuahKecil5,
            ...(isLngm ? [percentBuahKecil2] : []),
            percentRusakDimakanTikus,
          ],
          true,
        );

        if (!item["score"]) {
          item["score"] = 0;
        }

        let scores = {
          matang: scoringMultiplier.matang * totalMatang,
          lewat_matang: scoringMultiplier.lewat_matang * totalLewatMatang,
          mentah: scoringMultiplier.mentah * totalMentah,
          janjang_kosong: scoringMultiplier.janjang_kosong * totalJanjangKosong,
          buah_kecil:
            scoringMultiplier.buah_kecil *
            (totalBuahKecil3 +
              totalBuahKecil5 +
              (isLngm ? totalBuahKecil2 : 0)),
          tangkai_panjang:
            scoringMultiplier.tangkai_panjang * totalTangkaiPanjang,
        };

        item["score"] = Object.entries(scores).reduce((num, [key, value]) => {
          return num + value;
        }, 0);

        if (!averageVendor[vendorName]) {
          averageVendor[vendorName] = {
            count: 0,
            tandan: 0,
            accepted: 0,
            matang: 0,
            lewat_matang: 0,
            tangkai_panjang: 0,
            mentah: 0,
            janjang_kosong: 0,
            buah_kecil: 0,
            rusak_dimakan_tikus: 0,
          };
        }

        averageVendor[vendorName]["count"] += 1;
        averageVendor[vendorName]["tandan"] += totalTandanItem;
        averageVendor[vendorName]["accepted"] += percentAcceptedModified;
        averageVendor[vendorName]["matang"] += percentMatang;
        averageVendor[vendorName]["lewat_matang"] += percentLewatMatang;
        averageVendor[vendorName]["tangkai_panjang"] += percentTangkaiPanjang;
        averageVendor[vendorName]["mentah"] += percentMentah;
        averageVendor[vendorName]["janjang_kosong"] += percentJangkos;
        averageVendor[vendorName]["buah_kecil"] += percentBuahKecil;
        averageVendor[vendorName]["rusak_dimakan_tikus"] +=
          percentRusakDimakanTikus;

        const payload = {
          _id: item._id,
          score: item.score,
          percent_accepted: percentAcceptedModified,
          percent_matang: percentMatang,
          percent_lewat_matang: percentLewatMatang,
          percent_mentah_diterima: percentMentahDiterima,
          percent_janjang_kosong_diterima: percentJanjangKosongDiterima,
          percent_mentah: percentMentah,
          percent_janjang_kosong: percentJangkos,
          percent_buah_kecil: percentBuahKecil3,
          percent_buah_kecil_5: percentBuahKecil5,
          ...(isLngm ? { percent_buah_kecil_2: percentBuahKecil2 } : {}),
          percent_tangkai_panjang: percentTangkaiPanjang,
          percent_rusak_dimakan_tikus: percentRusakDimakanTikus,
          total_tandan: item["grading_result"]["total_tandan"],
          vendor_name: vendorName,
          vehicle_number: item["vehicle_number"],
          date: item.date,
          finish_date: item.finish_date,
          mesin: item.machine,
          delivery_number: item.delivery_number,
        };

        if (!avgAcceptedVendorHistory[vendorName]) {
          avgAcceptedVendorHistory[vendorName] = [];
        }
        avgAcceptedVendorHistory[vendorName].push(payload);

        if (!avgAcceptedVendorHistoryDaily[vendorName]) {
          avgAcceptedVendorHistoryDaily[vendorName] = {};
        }
        if (!avgAcceptedVendorHistoryDaily[vendorName][day]) {
          avgAcceptedVendorHistoryDaily[vendorName][day] = {
            trucks: 0,
            avg_tandan: 0,
            avg_accepted: 0,
            avg_matang: 0,
            avg_lewat_matang: 0,
            avg_mentah: 0,
            avg_janjang_kosong: 0,
            avg_tangkai_panjang: 0,
            avg_buah_kecil: 0,
            avg_rusak_dimakan_tikus: 0,
          };
        }
        avgAcceptedVendorHistoryDaily[vendorName][day]["trucks"] += 1;
        avgAcceptedVendorHistoryDaily[vendorName][day]["avg_tandan"] +=
          totalTandanItem;
        avgAcceptedVendorHistoryDaily[vendorName][day]["avg_accepted"] +=
          percentAcceptedModified;
        avgAcceptedVendorHistoryDaily[vendorName][day]["avg_matang"] +=
          percentMatang;
        avgAcceptedVendorHistoryDaily[vendorName][day]["avg_lewat_matang"] +=
          percentLewatMatang;
        avgAcceptedVendorHistoryDaily[vendorName][day]["avg_mentah"] +=
          percentMentah;
        avgAcceptedVendorHistoryDaily[vendorName][day]["avg_janjang_kosong"] +=
          percentJangkos;
        avgAcceptedVendorHistoryDaily[vendorName][day]["avg_buah_kecil"] +=
          percentBuahKecil;
        avgAcceptedVendorHistoryDaily[vendorName][day]["avg_tangkai_panjang"] +=
          percentTangkaiPanjang;
        avgAcceptedVendorHistoryDaily[vendorName][day][
          "avg_rusak_dimakan_tikus"
        ] += percentRusakDimakanTikus;

        return payload;
      });

      const { lowest, highest } = getTopScores(inspections, 10);

      const averageGrading = Object.entries(avgClassification).reduce(
        (obj, [key, value]) => {
          obj[key] = value?.length
            ? (
                value.reduce((tot, num) => tot + Number(num || 0), 0) /
                value.length
              ).toLocaleString("en", { maximumFractionDigits: 2 })
            : 0;

          return obj;
        },
        {},
      );
      const averageVendorAccepted = Object.entries(avgAcceptedVendor).reduce(
        (obj, [key, value]) => {
          obj[key] = (
            value.reduce((tot, num) => tot + (num || 0), 0) / value.length
          ).toLocaleString("en", { maximumFractionDigits: 2 });

          return obj;
        },
        {},
      );

      const lowestRanked = processInspectionData(lowest).sort(
        (a, b) => a.percent_accepted - b.percent_accepted,
      );
      const highestRanked = processInspectionData(highest).sort(
        (a, b) => b.percent_accepted - a.percent_accepted,
      );

      const averageVendorData = Object.entries(averageVendor).map(
        ([key, value]) => {
          return {
            vendor_name: key,
            count: value.count,
            percent_supply: countPercentage(
              value.count,
              totalInspection,
            ).toLocaleString("en", {
              maximumFractionDigits: 2,
            }),
            avg_tandan: Math.round(Number(value.tandan) / Number(value.count)),
            avg_accepted: (value.accepted / value.count).toLocaleString("en", {
              maximumFractionDigits: 2,
            }),
            avg_matang: (value.matang / value.count).toLocaleString("en", {
              maximumFractionDigits: 2,
            }),
            avg_lewat_matang: (value.lewat_matang / value.count).toLocaleString(
              "en",
              {
                maximumFractionDigits: 2,
              },
            ),
            avg_mentah: (value.mentah / value.count).toLocaleString("en", {
              maximumFractionDigits: 2,
            }),
            avg_janjang_kosong: (
              value.janjang_kosong / value.count
            ).toLocaleString("en", {
              maximumFractionDigits: 2,
            }),
            avg_buah_kecil: (value.buah_kecil / value.count).toLocaleString(
              "en",
              {
                maximumFractionDigits: 2,
              },
            ),
            avg_tangkai_panjang: (
              value.tangkai_panjang / value.count
            ).toLocaleString("en", {
              maximumFractionDigits: 2,
            }),
            avg_rusak_dimakan_tikus: (
              value.rusak_dimakan_tikus / value.count
            ).toLocaleString("en", {
              maximumFractionDigits: 2,
            }),
          };
        },
      );

      const rocSummaryPerformance = Object.entries(summaryPerformance).reduce(
        (obj, [key, value]) => {
          if (!obj[key]) {
            obj[key] = {
              diterima: 0,
              ditolak: 0,
              didenda: 0,
            };
          }
          let arrayData = Object.entries(value)
            .map(([k, v]) => {
              if (!isObjectEmpty(v)) {
                return {
                  label: k,
                  Diterima: countPercentage(v["Diterima"], v["Total"]),
                  Ditolak: countPercentage(v["Ditolak"], v["Total"]),
                  Didenda: countPercentage(v["Didenda"], v["Total"]),
                  Total: v["Total"],
                };
              }
              return null;
            }, [])
            .filter(Boolean);

          const rocTotal = {
            diterima: 0,
            ditolak: 0,
            didenda: 0,
          };

          for (let i = 1; i < arrayData.length; i++) {
            let current = arrayData[i];
            let prev = arrayData[i - 1];
            rocTotal["diterima"] += current["Diterima"] - prev["Diterima"];
            rocTotal["ditolak"] += current["Ditolak"] - prev["Ditolak"];
            rocTotal["didenda"] += current["Didenda"] - prev["Didenda"];
          }

          obj[key]["diterima"] = rocTotal["diterima"] / arrayData.length;
          obj[key]["ditolak"] = rocTotal["ditolak"] / arrayData.length;
          obj[key]["didenda"] = rocTotal["didenda"] / arrayData.length;

          return obj;
        },
        {},
      );

      const avgClassificationVendorData = Object.entries(
        avgClassificationVendor,
      ).reduce((o, [key, value]) => {
        o[key] = addRankingsWithTieHandling(
          Object.entries(value)
            .map(([k, v]) => {
              return {
                vendor_name: k,
                supply: countPercentage(v.count, totalInspection),
                percent: v.percent / v.count,
                total: v.total,
              };
            })
            .sort((a, b) => b.supply - a.supply),
          key,
        );

        return o;
      }, {});

      const avgAcceptedVendorHistoryDailyData = Object.entries(
        avgAcceptedVendorHistoryDaily,
      ).reduce((obj, [vendor, data]) => {
        // console.log({ data });
        obj[vendor] = Object.entries(data)
          .map(([d, dayData]) => {
            // console.log({ dayData });
            return {
              date: d,
              trucks: dayData["trucks"],
              avg_tandan: Number(dayData["avg_tandan"] / dayData["trucks"]),
              avg_accepted: dayData["avg_accepted"] / dayData["trucks"],
              avg_matang: dayData["avg_matang"] / dayData["trucks"],
              avg_lewat_matang: dayData["avg_lewat_matang"] / dayData["trucks"],
              avg_mentah: dayData["avg_mentah"] / dayData["trucks"],
              avg_janjang_kosong:
                dayData["avg_janjang_kosong"] / dayData["trucks"],
              avg_tangkai_panjang:
                dayData["avg_tangkai_panjang"] / dayData["trucks"],
              avg_buah_kecil: dayData["avg_buah_kecil"] / dayData["trucks"],
              avg_rusak_dimakan_tikus:
                dayData["avg_rusak_dimakan_tikus"] / dayData["trucks"],
            };
          })
          .filter((e) => Boolean(e.avg_accepted));
        return obj;
      }, {});

      const avgClassificationTrenData = Object.entries(
        avgClassificationTren,
      ).reduce((obj, [c, data]) => {
        obj[c] = Object.entries(data).map(([d, value]) => {
          const sum = value.reduce((n, c) => n + (c || 0), 0);
          return {
            date: d,
            percent: sum / value.length,
          };
        });

        return obj;
      }, {});

      // console.log('Hai hai');

      return res.status(200).json(
        createResponseSuccess(200, "Success", "Success get all data", {
          inspections: inspections.map((i) => {
            delete i["score"];

            return i;
          }),
          monitoring: {
            total_tandan: totalTandan,
            total_grading: totalInspection,
            total_passed: totalAccepted,
            total_rejected: totalRejected,
            total_fined: totalFined,
            percent_rejected: percentRejected || 0,
            percent_passed: percentAccepted || 0,
            percent_fined: percentFined || 0,
          },
          average_grading: averageGrading,
          average_grading_trend: avgClassificationTrenData,
          average_grading_vendor: avgClassificationVendorData,
          average_vendor_accepted: sortObjectByValues(averageVendorAccepted),
          average_vendor_accepted_trucks_history: avgAcceptedVendorHistory,
          average_vendor_accepted_daily: avgAcceptedVendorHistoryDailyData,
          charts_data: {
            summary_performance:
              generateChartArrayFromObject(summaryPerformance),
            grading_trucks: generateChartArrayFromObjectTrucks(gradingTrucks),
            fruit_accepted: generateChartArrayFromObject(fruitAccepted, true),
            fruit_rejected: generateChartArrayFromObject(fruitRejected, true),
            fruit_tangkai_panjang: generateChartArrayFromObject(fruitTp, true),
            lowest_vendor: lowestRanked,
            highest_vendor: highestRanked,
            vendor: processVendorData(averageVendorData),
          },
          rocs: rocSummaryPerformance,
        }),
      );
    } catch (err) {
      console.log({ err });
      next(err);
    }
  }

  static async generateExcel(req, res) {
    const vendoryTypeDict = {
      1: "Inti",
      2: "Eksternal",
      3: "Plasma",
    };

    const user = req.user;
    const { targetDate, targetEnd, factory } = req.query;

    if (!targetDate || !targetEnd) {
      return res.status(400).json({
        code: 500,
        success: false,
        message: "Target End dan Target Date must be filled.",
      });
    }

    const UserModel = require("../../models/user");
    const userData = await UserModel.findById(user._id).lean();

    // Parse the target date using dayjs
    const startDate = dayjs(targetDate).startOf("day").add(7, "hour"); // 6 AM on the target date
    const endDate = dayjs(targetEnd)
      .add(1, "day")
      .startOf("day")
      .add(3, "hour"); // 3 AM the next day

    let query = {
      company: user.company,
      date: {
        $gte: startDate.toDate(),
        $lt: endDate.toDate(),
      },
    };

    if (factory) {
      const hasAccess = userData?.access_factory?.some(
        (f) => f.toString() === factory,
      );
      if (hasAccess) {
        query.factory = factory;
      } else {
        query.factory = null;
      }
    } else {
      if (userData?.access_factory?.length > 0) {
        query.factory = { $in: userData.access_factory };
      }
    }

    // Fetch data from MongoDB for the specific date range
    let data = await InspectionDataModel.find(query).sort({ date: 1 }).lean();

    const factoryObj = factory
      ? await FactoryModel.findById(factory).lean()
      : null;
    const isLngm =
      factoryObj && ["LNGM"].some((loc) => factoryObj.name.includes(loc));

    if (data.length === 0) {
      console.log("No data found for the specified date range.");
      return;
    }

    const limit = await getCompanyLimitTandan({ company: user.company });

    data = data.filter(
      (e) =>
        e.grading_result?.total_tandan > limit &&
        e.vehicle_number !== "BH 1240 ALB" &&
        e.vendor_name !== "Vendor 2 Plasma" &&
        e.vendor_name !== "Vendor B",
    );

    const periodString = `${dayjs(targetDate).format("MMMM YYYY")} - ${dayjs(
      targetEnd,
    ).format("MMMM YYYY")}`;

    // Prepare the Excel data
    const rawDataExcel = [
      [periodString],
      [
        "No",
        "Tanggal",
        "Mesin AGATE",
        "Surat Jalan",
        "Waktu Mulai",
        "Waktu Selesai",
        "Durasi",
        "TBS per Menit",
        "Plat Nomor",
        "Vendor",
        "Tipe Vendor",
        "Jumlah Janjang",
        "TBS Diterima",
        "TBS Ditolak",
        "TBS Didenda",
        "TBS Multiple",
        "Mentah",
        "Matang",
        "Lewat Matang",
        "Janjang Kosong",
        "Buah Kecil <3kg",
        "Buah Kecil <5kg",
        ...(isLngm ? ["Buah Kecil <2kg"] : []),
        "Tangkai Panjang",
        "Matang Katro",
      ],
    ];

    // Prepare the Excel data
    const trukPerHari = [["No", "Tanggal", "Total Truk"]];

    let totalAllTandan = 0;

    const avgWeek = {};
    const gradingTrucks = {};
    const avgWeekDemography = {};
    const bestAcceptedTrucks = {};
    const hourDataReject = {
      before6pm: {
        total_tandan: 0,
        total_accepted: 0,
        total_rejected: 0,
        total_trucks: 0,
        trucks: {},
      },
      after6pm: {
        total_tandan: 0,
        total_accepted: 0,
        total_rejected: 0,
        total_trucks: 0,
        trucks: {},
      },
    };
    const totalJanjangObj = {
      "<600": {
        total_trucks: 0,
        trucks: {},
        vendors: {},
        total_janjang: 0,
        total_accepted: 0,
        matang: 0,
        lewat_matang: 0,
        tangkai_panjang: 0,
        mentah: 0,
        buah_kecil: 0,
        janjang_kosong: 0,
      },
      "<1000": {
        total_trucks: 0,
        trucks: {},
        vendors: {},
        total_janjang: 0,
        total_accepted: 0,
        matang: 0,
        lewat_matang: 0,
        tangkai_panjang: 0,
        mentah: 0,
        buah_kecil: 0,
        janjang_kosong: 0,
      },
      ">1000": {
        total_trucks: 0,
        trucks: {},
        vendors: {},
        total_janjang: 0,
        total_accepted: 0,
        matang: 0,
        lewat_matang: 0,
        tangkai_panjang: 0,
        mentah: 0,
        buah_kecil: 0,
        janjang_kosong: 0,
      },
    };
    const machineUtilityWeek = {};
    const avgVendor = {};

    const totalJanjangObjDuration = {
      "<600": {
        total_trucks: 0,
        trucks: {},
        vendors: {},
        total_janjang: 0,
        total_accepted: 0,
        matang: 0,
        lewat_matang: 0,
        tangkai_panjang: 0,
        mentah: 0,
        buah_kecil: 0,
        janjang_kosong: 0,
        duration: 0,
      },
      "<1000": {
        total_trucks: 0,
        trucks: {},
        vendors: {},
        total_janjang: 0,
        total_accepted: 0,
        matang: 0,
        lewat_matang: 0,
        tangkai_panjang: 0,
        mentah: 0,
        buah_kecil: 0,
        janjang_kosong: 0,
        duration: 0,
      },
      ">1000": {
        total_trucks: 0,
        trucks: {},
        vendors: {},
        total_janjang: 0,
        total_accepted: 0,
        matang: 0,
        lewat_matang: 0,
        tangkai_panjang: 0,
        mentah: 0,
        buah_kecil: 0,
        janjang_kosong: 0,
        duration: 0,
      },
    };

    const dailyTruckCount = {};

    let daysDateArray = [];

    data.forEach((item, index) => {
      const date = dayjs(item.date).format("DD/MM/YYYY");
      const month = dayjs(item.date).format("MMMM YYYY");
      const hour = dayjs(item.date).hour();
      const minute = dayjs(item.date).minute();
      const week = getWeekNumber(item.date);
      const day = dayjs(item.date).format("dddd");

      // Track daily truck counts for gradingTrucks
      if (!gradingTrucks[date]) {
        gradingTrucks[date] = {
          Truk: 0,
          "Mesin 1": 0,
          "Mesin 2": 0,
          "Mesin 3": 0,
          "Mesin 4": 0,
        };
      }
      gradingTrucks[date]["Truk"] += 1;
      gradingTrucks[date][`Mesin ${item.machine}`] += 1;

      if (!daysDateArray.some((e) => e?.date === date)) {
        daysDateArray.push({ date: date, day });
      }

      const vehicleNumber = item.vehicle_number;
      const vendorName = item.vendor_name;

      totalAllTandan += item.grading_result["total_tandan"];

      const start = dayjs(item.date);
      const end = dayjs(item.finish_date);

      if (!dailyTruckCount[day]) {
        dailyTruckCount[day] = {
          "00": 0,
          "05": 0,
          10: 0,
          12: 0,
          14: 0,
          16: 0,
          18: 0,
          19: 0,
          21: 0,
          total_truk: 0,
          total_hari: 0,
        };
      }

      if (hour >= 0 && hour < 2) {
        dailyTruckCount[day]["00"] += 1;
      } else if (hour >= 5 && hour < 10) {
        dailyTruckCount[day]["05"] += 1;
      } else if (hour >= 10 && hour < 12) {
        dailyTruckCount[day]["10"] += 1;
      } else if (hour >= 12 && hour < 14) {
        dailyTruckCount[day]["12"] += 1;
      } else if (hour >= 14 && hour < 16) {
        dailyTruckCount[day]["14"] += 1;
      } else if (hour >= 16 && hour < 18) {
        dailyTruckCount[day]["16"] += 1;
      } else if (hour >= 18 && hour < 19) {
        dailyTruckCount[day]["18"] += 1;
      } else if (hour >= 19 && hour < 21) {
        dailyTruckCount[day]["19"] += 1;
      } else if (hour >= 19 && hour < 23 && minute < 59) {
        dailyTruckCount[day]["21"] += 1;
      }
      dailyTruckCount[day]["total_truk"] += 1;

      if (!avgWeek[week]) {
        avgWeek[week] = { accepted: [], rejected: [], fined: [] };
      }

      if (!avgWeekDemography[week]) {
        avgWeekDemography[week] = {
          accepted: {
            matang: [],
            lewat_matang: [],
            tangkai_panjang: [],
          },
          rejected: {
            mentah: [],
            janjang_kosong: [],
            buah_kecil: [],
          },
        };
      }

      if (!machineUtilityWeek[week]) {
        machineUtilityWeek[week] = {
          total_trucks: 0,
          machine: {
            1: 0,
            2: 0,
            3: 0,
            4: 0,
          },
        };
      }

      machineUtilityWeek[week]["total_trucks"] += 1;
      machineUtilityWeek[week]["machine"][item.machine] += 1;

      if (!bestAcceptedTrucks[vehicleNumber]) {
        bestAcceptedTrucks[vehicleNumber] = {
          vendor: item.vendor_name,
          count: 0,
          tandan: 0,
          accepted: 0,
          matang: 0,
          lewat_matang: 0,
          tangkai_panjang: 0,
          mentah: 0,
          janjang_kosong: 0,
          buah_kecil: 0,
        };
      }

      if (!avgVendor[vendorName]) {
        avgVendor[vendorName] = {
          count: 0,
          tandan: 0,
          accepted: 0,
          matang: 0,
          lewat_matang: 0,
          tangkai_panjang: 0,
          mentah: 0,
          janjang_kosong: 0,
          buah_kecil: 0,
          trucks: {},
        };
      }

      if (!avgVendor[vendorName]["trucks"][vehicleNumber]) {
        avgVendor[vendorName]["trucks"][vehicleNumber] = {
          count: 0,
          tandan: 0,
          accepted: 0,
          matang: 0,
          lewat_matang: 0,
          tangkai_panjang: 0,
          mentah: 0,
          janjang_kosong: 0,
          buah_kecil: 0,
        };
      }

      const totalTandan = item.grading_result.total_tandan;

      const totalRejectedModified =
        Object.keys(item.grading_result["accepted_summary"]).reduce(
          (n, k) =>
            n +
            Number(
              item.grading_result["accepted_summary"][k][
                "BUAH KECIL DIBAWAH 5KG"
              ] || 0,
            ),
          0,
        ) + Number(item.grading_result["total_rejected"]);
      const totalAcceptedModified =
        Number(item.grading_result["total_accepted"]) -
        Object.keys(item.grading_result["accepted_summary"]).reduce(
          (n, k) =>
            n +
            Number(
              item.grading_result["accepted_summary"][k][
                "BUAH KECIL DIBAWAH 5KG"
              ] || 0,
            ),
          0,
        );

      const percentAccepted = countPercentage(
        totalAcceptedModified,
        item.grading_result["total_tandan"],
      );
      const percentRejected = countPercentage(
        totalRejectedModified,
        item.grading_result["total_tandan"],
      );
      const percentFined = countPercentage(
        item.grading_result["total_fined"],
        totalAcceptedModified,
      );

      avgWeek[week]["accepted"].push(percentAccepted);
      avgWeek[week]["rejected"].push(percentRejected);
      avgWeek[week]["fined"].push(percentFined);

      if (percentRejected >= 25) {
        if (hour >= 7 && hour < 18) {
          hourDataReject["before6pm"]["total_trucks"] += 1;
          hourDataReject["before6pm"]["total_tandan"] +=
            item["grading_result"]["total_tandan"];
          hourDataReject["before6pm"]["total_accepted"] +=
            totalAcceptedModified;
          hourDataReject["before6pm"]["total_rejected"] +=
            totalRejectedModified;

          if (!hourDataReject["before6pm"]["trucks"][vehicleNumber]) {
            hourDataReject["before6pm"]["trucks"][vehicleNumber] = {
              vendor_name: item.vendor_name,
              count: 0,
              percent_rejected: 0,
            };
          }

          hourDataReject["before6pm"]["trucks"][vehicleNumber]["count"] += 1;
          hourDataReject["before6pm"]["trucks"][vehicleNumber][
            "percent_rejected"
          ] += percentRejected;
        } else if (
          hour >= 18 ||
          (hour < 7 && dayjs(item.date).date() === endDate.date())
        ) {
          hourDataReject["after6pm"]["total_trucks"] += 1;
          hourDataReject["after6pm"]["total_tandan"] +=
            item["grading_result"]["total_tandan"];
          hourDataReject["after6pm"]["total_accepted"] += totalAcceptedModified;
          hourDataReject["after6pm"]["total_rejected"] += totalRejectedModified;

          if (!hourDataReject["after6pm"]["trucks"][vehicleNumber]) {
            hourDataReject["after6pm"]["trucks"][vehicleNumber] = {
              vendor_name: item.vendor_name,
              count: 0,
              percent_rejected: 0,
            };
          }

          hourDataReject["after6pm"]["trucks"][vehicleNumber]["count"] += 1;
          hourDataReject["after6pm"]["trucks"][vehicleNumber][
            "percent_rejected"
          ] += percentRejected;
        }
      }

      const totalMatang =
        item.grading_result["classification_summary"]["MATANG"]["TOTAL"] -
        item.grading_result["classification_summary"]["MATANG"][
          "BUAH KECIL DIBAWAH 3KG"
        ] -
        item.grading_result["classification_summary"]["MATANG"][
          "BUAH KECIL DIBAWAH 5KG"
        ];
      const totalLewatMatang = item.grading_result["classification_summary"]?.[
        "LEWAT MATANG"
      ]
        ? item.grading_result["classification_summary"]["LEWAT MATANG"]?.[
            "TOTAL"
          ] -
          item.grading_result["classification_summary"]["LEWAT MATANG"][
            "BUAH KECIL DIBAWAH 3KG"
          ] -
          item.grading_result["classification_summary"]["LEWAT MATANG"][
            "BUAH KECIL DIBAWAH 5KG"
          ]
        : 0;
      const totalMentah =
        item.grading_result["classification_summary"]["MENTAH"]["TOTAL"] -
        item.grading_result["classification_summary"]["MENTAH"][
          "BUAH KECIL DIBAWAH 3KG"
        ] -
        item.grading_result["classification_summary"]["MENTAH"][
          "BUAH KECIL DIBAWAH 5KG"
        ];
      // const totalJanjangKosong =
      //   item.grading_result['classification_summary']['JANJANG KOSONG'][
      //     'TOTAL'
      //   ] -
      //   item.grading_result['classification_summary']['JANJANG KOSONG'][
      //     'BUAH KECIL DIBAWAH 3KG'
      //   ] -
      //   item.grading_result['classification_summary']['JANJANG KOSONG'][
      //     'BUAH KECIL DIBAWAH 5KG'
      //   ];

      const totalJanjangKosong =
        item.grading_result["classification_summary"]["JANJANG KOSONG"][
          "TOTAL"
        ];

      const { totalBuahKecil3, totalBuahKecil5, totalBuahKecil2 } = Object.keys(
        item.grading_result["classification_summary"],
      ).reduce(
        (obj, key) => {
          const data = item["grading_result"]["classification_summary"][key];

          obj["totalBuahKecil3"] +=
            key === "JANJANG KOSONG" ? 0 : data["BUAH KECIL DIBAWAH 3KG"] || 0;
          obj["totalBuahKecil5"] +=
            key === "JANJANG KOSONG" ? 0 : data["BUAH KECIL DIBAWAH 5KG"] || 0;
          obj["totalBuahKecil2"] +=
            key === "JANJANG KOSONG"
              ? 0
              : isLngm
                ? data["BUAH KECIL DIBAWAH 2KG"] || 0
                : 0;
          obj["totalTangkaiPanjang"] += data["TANGKAI PANJANG"] || 0;

          return obj;
        },
        { totalBuahKecil3: 0, totalBuahKecil5: 0, totalBuahKecil2: 0 },
      );

      const { totalTangkaiPanjang } = Object.keys(
        item.grading_result["accepted_summary"],
      ).reduce(
        (obj, key) => {
          const data = item["grading_result"]["accepted_summary"][key];

          obj["totalTangkaiPanjang"] += data["TANGKAI PANJANG"] || 0;

          return obj;
        },
        { totalTangkaiPanjang: 0 },
      );

      const percentMatang = countPercentage(totalMatang, totalTandan);
      const percentLewatMatang = countPercentage(totalLewatMatang, totalTandan);
      const percentTangkaiPanjang = countPercentage(
        totalTangkaiPanjang,
        totalAcceptedModified,
      );
      const percentMentah = countPercentage(totalMentah, totalTandan);
      const percentJangkos = countPercentage(totalJanjangKosong, totalTandan);
      const percentBuahKecil = countPercentage(
        totalBuahKecil3 + totalBuahKecil5 + (isLngm ? totalBuahKecil2 : 0),
        totalTandan,
      );

      const duration = getDurationMs(item["date"], item["finish_date"]);
      const durationMinute = millisecondsToMinutes(duration);

      if (totalTandan < 600) {
        totalJanjangObj["<600"]["total_trucks"] += 1;
        totalJanjangObj["<600"]["total_janjang"] += totalTandan;
        totalJanjangObj["<600"]["total_accepted"] += totalAcceptedModified;
        totalJanjangObj["<600"]["matang"] += totalMatang;
        totalJanjangObj["<600"]["lewat_matang"] += totalLewatMatang;
        totalJanjangObj["<600"]["tangkai_panjang"] += totalTangkaiPanjang;

        totalJanjangObj["<600"]["mentah"] += totalMentah;
        totalJanjangObj["<600"]["janjang_kosong"] += totalJanjangKosong;
        totalJanjangObj["<600"]["buah_kecil"] +=
          totalBuahKecil3 + totalBuahKecil5 + (isLngm ? totalBuahKecil2 : 0);

        if (!totalJanjangObj["<600"]["trucks"][vehicleNumber]) {
          totalJanjangObj["<600"]["trucks"][vehicleNumber] = {
            vendor_name: item.vendor_name,
            count: 0,
          };
        }
        totalJanjangObj["<600"]["trucks"][vehicleNumber]["count"] += 1;

        if (!totalJanjangObj["<600"]["vendors"][vendorName]) {
          totalJanjangObj["<600"]["vendors"][vendorName] = {
            vendor_name: item.vendor_name,
            count: 0,
          };
        }
        totalJanjangObj["<600"]["vendors"][vendorName]["count"] += 1;

        if (durationMinute < 19) {
          totalJanjangObjDuration["<600"]["total_trucks"] += 1;
          totalJanjangObjDuration["<600"]["total_janjang"] += totalTandan;
          totalJanjangObjDuration["<600"]["total_accepted"] +=
            totalAcceptedModified;
          totalJanjangObjDuration["<600"]["matang"] += totalMatang;
          totalJanjangObjDuration["<600"]["lewat_matang"] += totalLewatMatang;
          totalJanjangObjDuration["<600"]["tangkai_panjang"] +=
            totalTangkaiPanjang;
          totalJanjangObjDuration["<600"]["duration"] += duration;

          totalJanjangObjDuration["<600"]["mentah"] += totalMentah;
          totalJanjangObjDuration["<600"]["janjang_kosong"] +=
            totalJanjangKosong;
          totalJanjangObjDuration["<600"]["buah_kecil"] +=
            totalBuahKecil3 + totalBuahKecil5 + (isLngm ? totalBuahKecil2 : 0);

          if (!totalJanjangObjDuration["<600"]["trucks"][vehicleNumber]) {
            totalJanjangObjDuration["<600"]["trucks"][vehicleNumber] = {
              vendor_name: item.vendor_name,
              count: 0,
            };
          }
          totalJanjangObjDuration["<600"]["trucks"][vehicleNumber]["count"] +=
            1;

          if (!totalJanjangObjDuration["<600"]["vendors"][vendorName]) {
            totalJanjangObjDuration["<600"]["vendors"][vendorName] = {
              vendor_name: item.vendor_name,
              count: 0,
            };
          }
          totalJanjangObjDuration["<600"]["vendors"][vendorName]["count"] += 1;
        }
      } else if (totalTandan >= 600 && totalTandan <= 1000) {
        totalJanjangObj["<1000"]["total_trucks"] += 1;
        totalJanjangObj["<1000"]["total_janjang"] += totalTandan;
        totalJanjangObj["<1000"]["total_accepted"] += totalAcceptedModified;
        totalJanjangObj["<1000"]["matang"] += totalMatang;
        totalJanjangObj["<1000"]["lewat_matang"] += totalLewatMatang;
        totalJanjangObj["<1000"]["tangkai_panjang"] += totalTangkaiPanjang;

        totalJanjangObj["<1000"]["mentah"] += totalMentah;
        totalJanjangObj["<1000"]["janjang_kosong"] += totalJanjangKosong;
        totalJanjangObj["<1000"]["buah_kecil"] +=
          totalBuahKecil3 + totalBuahKecil5 + (isLngm ? totalBuahKecil2 : 0);

        if (!totalJanjangObj["<1000"]["trucks"][vehicleNumber]) {
          totalJanjangObj["<1000"]["trucks"][vehicleNumber] = {
            vendor_name: item.vendor_name,
            count: 0,
          };
        }
        totalJanjangObj["<1000"]["trucks"][vehicleNumber]["count"] += 1;

        if (!totalJanjangObj["<1000"]["vendors"][vendorName]) {
          totalJanjangObj["<1000"]["vendors"][vendorName] = {
            vendor_name: item.vendor_name,
            count: 0,
          };
        }
        totalJanjangObj["<1000"]["vendors"][vendorName]["count"] += 1;

        if (durationMinute < 28) {
          totalJanjangObjDuration["<1000"]["total_trucks"] += 1;
          totalJanjangObjDuration["<1000"]["total_janjang"] += totalTandan;
          totalJanjangObjDuration["<1000"]["total_accepted"] +=
            totalAcceptedModified;
          totalJanjangObjDuration["<1000"]["matang"] += totalMatang;
          totalJanjangObjDuration["<1000"]["lewat_matang"] += totalLewatMatang;
          totalJanjangObjDuration["<1000"]["tangkai_panjang"] +=
            totalTangkaiPanjang;
          totalJanjangObjDuration["<1000"]["duration"] += duration;

          totalJanjangObjDuration["<1000"]["mentah"] += totalMentah;
          totalJanjangObjDuration["<1000"]["janjang_kosong"] +=
            totalJanjangKosong;
          totalJanjangObjDuration["<1000"]["buah_kecil"] +=
            totalBuahKecil3 + totalBuahKecil5 + (isLngm ? totalBuahKecil2 : 0);

          if (!totalJanjangObjDuration["<1000"]["trucks"][vehicleNumber]) {
            totalJanjangObjDuration["<1000"]["trucks"][vehicleNumber] = {
              vendor_name: item.vendor_name,
              count: 0,
            };
          }
          totalJanjangObjDuration["<1000"]["trucks"][vehicleNumber]["count"] +=
            1;

          if (!totalJanjangObjDuration["<1000"]["vendors"][vendorName]) {
            totalJanjangObjDuration["<1000"]["vendors"][vendorName] = {
              vendor_name: item.vendor_name,
              count: 0,
            };
          }
          totalJanjangObjDuration["<1000"]["vendors"][vendorName]["count"] += 1;
        }
      } else if (totalTandan > 1000) {
        totalJanjangObj[">1000"]["total_trucks"] += 1;
        totalJanjangObj[">1000"]["total_janjang"] += totalTandan;
        totalJanjangObj[">1000"]["total_accepted"] += totalAcceptedModified;
        totalJanjangObj[">1000"]["matang"] += totalMatang;
        totalJanjangObj[">1000"]["lewat_matang"] += totalLewatMatang;
        totalJanjangObj[">1000"]["tangkai_panjang"] += totalTangkaiPanjang;

        totalJanjangObj[">1000"]["mentah"] += totalMentah;
        totalJanjangObj[">1000"]["janjang_kosong"] += totalJanjangKosong;
        totalJanjangObj[">1000"]["buah_kecil"] +=
          totalBuahKecil3 + totalBuahKecil5 + (isLngm ? totalBuahKecil2 : 0);

        if (!totalJanjangObj[">1000"]["trucks"][vehicleNumber]) {
          totalJanjangObj[">1000"]["trucks"][vehicleNumber] = {
            vendor_name: item.vendor_name,
            count: 0,
          };
        }
        totalJanjangObj[">1000"]["trucks"][vehicleNumber]["count"] += 1;

        if (!totalJanjangObj[">1000"]["vendors"][vendorName]) {
          totalJanjangObj[">1000"]["vendors"][vendorName] = {
            vendor_name: item.vendor_name,
            count: 0,
          };
        }
        totalJanjangObj[">1000"]["vendors"][vendorName]["count"] += 1;

        if (durationMinute < 36) {
          totalJanjangObjDuration[">1000"]["total_trucks"] += 1;
          totalJanjangObjDuration[">1000"]["total_janjang"] += totalTandan;
          totalJanjangObjDuration[">1000"]["total_accepted"] +=
            totalAcceptedModified;
          totalJanjangObjDuration[">1000"]["matang"] += totalMatang;
          totalJanjangObjDuration[">1000"]["lewat_matang"] += totalLewatMatang;
          totalJanjangObjDuration[">1000"]["tangkai_panjang"] +=
            totalTangkaiPanjang;
          totalJanjangObjDuration[">1000"]["duration"] += duration;

          totalJanjangObjDuration[">1000"]["mentah"] += totalMentah;
          totalJanjangObjDuration[">1000"]["janjang_kosong"] +=
            totalJanjangKosong;
          totalJanjangObjDuration[">1000"]["buah_kecil"] +=
            totalBuahKecil3 + totalBuahKecil5 + (isLngm ? totalBuahKecil2 : 0);

          if (!totalJanjangObjDuration[">1000"]["trucks"][vehicleNumber]) {
            totalJanjangObjDuration[">1000"]["trucks"][vehicleNumber] = {
              vendor_name: item.vendor_name,
              count: 0,
            };
          }
          totalJanjangObjDuration[">1000"]["trucks"][vehicleNumber]["count"] +=
            1;

          if (!totalJanjangObjDuration[">1000"]["vendors"][vendorName]) {
            totalJanjangObjDuration[">1000"]["vendors"][vendorName] = {
              vendor_name: item.vendor_name,
              count: 0,
            };
          }
          totalJanjangObjDuration[">1000"]["vendors"][vendorName]["count"] += 1;
        }
      }

      avgWeekDemography[week]["accepted"]["matang"].push(percentMatang);
      avgWeekDemography[week]["accepted"]["lewat_matang"].push(
        percentLewatMatang,
      );
      avgWeekDemography[week]["accepted"]["tangkai_panjang"].push(
        percentTangkaiPanjang,
      );

      avgWeekDemography[week]["rejected"]["mentah"].push(percentMentah);
      avgWeekDemography[week]["rejected"]["janjang_kosong"].push(
        percentJangkos,
      );
      avgWeekDemography[week]["rejected"]["buah_kecil"].push(percentBuahKecil);

      bestAcceptedTrucks[vehicleNumber]["count"] += 1;
      bestAcceptedTrucks[vehicleNumber]["tandan"] += totalTandan;
      bestAcceptedTrucks[vehicleNumber]["accepted"] += percentAccepted;
      bestAcceptedTrucks[vehicleNumber]["matang"] += percentMatang;
      bestAcceptedTrucks[vehicleNumber]["lewat_matang"] += percentLewatMatang;
      bestAcceptedTrucks[vehicleNumber]["tangkai_panjang"] +=
        percentTangkaiPanjang;
      bestAcceptedTrucks[vehicleNumber]["mentah"] += percentMentah;
      bestAcceptedTrucks[vehicleNumber]["janjang_kosong"] += percentJangkos;
      bestAcceptedTrucks[vehicleNumber]["buah_kecil"] += percentBuahKecil;

      avgVendor[vendorName]["count"] += 1;
      avgVendor[vendorName]["tandan"] += totalTandan;
      avgVendor[vendorName]["accepted"] += percentAccepted;
      avgVendor[vendorName]["matang"] += percentMatang;
      avgVendor[vendorName]["lewat_matang"] += percentLewatMatang;
      avgVendor[vendorName]["tangkai_panjang"] += percentTangkaiPanjang;
      avgVendor[vendorName]["mentah"] += percentMentah;
      avgVendor[vendorName]["janjang_kosong"] += percentJangkos;
      avgVendor[vendorName]["buah_kecil"] += percentBuahKecil;

      avgVendor[vendorName]["trucks"][vehicleNumber]["count"] += 1;
      avgVendor[vendorName]["trucks"][vehicleNumber]["tandan"] += totalTandan;
      avgVendor[vendorName]["trucks"][vehicleNumber]["accepted"] +=
        percentAccepted;
      avgVendor[vendorName]["trucks"][vehicleNumber]["matang"] += percentMatang;
      avgVendor[vendorName]["trucks"][vehicleNumber]["lewat_matang"] +=
        percentLewatMatang;
      avgVendor[vendorName]["trucks"][vehicleNumber]["tangkai_panjang"] +=
        percentTangkaiPanjang;
      avgVendor[vendorName]["trucks"][vehicleNumber]["mentah"] += percentMentah;
      avgVendor[vendorName]["trucks"][vehicleNumber]["janjang_kosong"] +=
        percentJangkos;
      avgVendor[vendorName]["trucks"][vehicleNumber]["buah_kecil"] +=
        percentBuahKecil;

      const durations = dayjs(item.finish_date).diff(
        dayjs(item.date),
        "minutes",
      );

      rawDataExcel.push([
        index + 1,
        date,
        item.machine,
        item.delivery_number,
        dayjs(item.date).format("HH:mm"),
        dayjs(item.finish_date).format("HH:mm"),
        durations,
        Math.floor(
          Number(Number(item.grading_result.total_tandan) / Number(durations)),
        ),
        vehicleNumber,
        item.vendor_name,
        vendoryTypeDict?.[item.vendor_type] || "-",
        item.grading_result.total_tandan,
        item.grading_result.total_accepted,
        item.grading_result.total_rejected,
        item.grading_result.total_fined,
        item.grading_result?.total_multiple
          ? item.grading_result.total_multiple
          : 0,
        totalMentah,
        totalMatang,
        totalLewatMatang,
        totalJanjangKosong,
        totalBuahKecil3,
        totalBuahKecil5,
        ...(isLngm ? [totalBuahKecil2] : []),
        totalTangkaiPanjang,
        // '',

        item.grading_result.total_matang_katro,
      ]);
    });

    // Populate trukPerHari from gradingTrucks
    Object.entries(gradingTrucks).forEach(([date, trucks], index) => {
      trukPerHari.push([index + 1, date, trucks["Truk"]]);
    });

    const avgWeekData = [
      [periodString],
      ["Week", "% Diterima", "% Ditolak", "% Didenda"],
    ];
    Object.keys(avgWeek).forEach((week) => {
      let accepted = avgWeek[week]["accepted"];
      let rejected = avgWeek[week]["rejected"];
      let fined = avgWeek[week]["fined"];

      let acceptedAvg =
        accepted.reduce((n, c) => n + Number(c), 0) / accepted?.length;
      let rejectedAvg =
        rejected.reduce((n, c) => n + Number(c), 0) / rejected?.length;
      let finedAvg =
        fined.reduce((n, c) => n + Number(c), 0) / accepted?.length;

      avgWeekData.push([
        week,
        acceptedAvg.toFixed(2),
        rejectedAvg.toFixed(2),
        finedAvg.toFixed(2),
      ]);
    });
    avgWeekData.push([
      "** Didenda buah diterima yang memiliki tangkai panjang",
    ]);
    avgWeekData.push(["** Ditolak termasuk buah <5kg"]);

    const avgWeekDemographyData = [
      [periodString],
      ["Week", "Buah Diterima", "", "", "Buah Ditolak", "", ""],
      ["", "% MM", "% LM", "% TP", "% M", "% JK", "% BK"],
    ];
    Object.keys(avgWeekDemography).forEach((week) => {
      let accepted = avgWeekDemography[week]["accepted"];
      let rejected = avgWeekDemography[week]["rejected"];
      const joined = { ...accepted, ...rejected };

      let temp = [week, "", "", "", "", "", "", ""];

      Object.keys(joined).forEach((key) => {
        const item = joined[key];
        let avg = item.reduce((n, c) => n + Number(c), 0) / item?.length;
        switch (key) {
          case "matang":
            temp[1] = avg.toFixed(2);
            break;
          case "lewat_matang":
            temp[2] = avg.toFixed(2);
            break;
          case "tangkai_panjang":
            temp[3] = avg.toFixed(2);
            break;
          case "mentah":
            temp[4] = avg.toFixed(2);
            break;
          case "janjang_kosong":
            temp[5] = avg.toFixed(2);
            break;
          case "buah_kecil":
            temp[6] = avg.toFixed(2);
            break;
        }
      });

      avgWeekDemographyData.push(temp);
    });

    const bestAcceptedTrucksData = [
      [periodString],
      [
        "No",
        "Plat Nomor",
        "Vendor",
        "Total Truk",
        "Kontribusi",
        "Avg Tandan",
        "Estimasi BJR",
        "Avg % Diterima",
        "Avg % MM",
        "Avg % LM",
        "Avg % TP",
        "Avg % M",
        "Avg % JK",
        "Avg % BK",
      ],
    ];
    Object.keys(bestAcceptedTrucks)
      .map((k) => ({
        truck: k,
        ...bestAcceptedTrucks[k],
        avg_accepted: Number(
          bestAcceptedTrucks[k]["accepted"] / bestAcceptedTrucks[k]["count"],
        ),
      }))
      .sort((a, b) => b.avg_accepted - a.avg_accepted)
      .slice(0, 20)
      .forEach((item, idx) => {
        let count = item["count"];
        let avgTandan = Math.round(Number(item["tandan"] / count));

        let temp = [
          idx + 1,
          item.truck,
          item.vendor,
          count,
          countPercentage(item["tandan"], totalAllTandan).toFixed(2) + "%",
          avgTandan,
          Number(10000 / avgTandan).toFixed(2),
          Number(item["accepted"] / count).toFixed(2),
          Number(item["matang"] / count).toFixed(2),
          Number(item["lewat_matang"] / count).toFixed(2),
          Number(item["tangkai_panjang"] / count).toFixed(2),
          Number(item["mentah"] / count).toFixed(2),
          Number(item["janjang_kosong"] / count).toFixed(2),
          Number(item["buah_kecil"] / count).toFixed(2),
        ];

        bestAcceptedTrucksData.push(temp);
      });
    bestAcceptedTrucksData.push([
      "** Kontribusi merupakan persentase terhadap keseluruhan truk dalam Januari - Maret 2025",
    ]);

    const worstAcceptedTrucksData = [
      [periodString],
      [
        "No",
        "Plat Nomor",
        "Vendor",
        "Total Truk",
        "Kontribusi",
        "Avg Tandan",
        "Estimasi BJR",
        "Avg % Diterima",
        "Avg % MM",
        "Avg % LM",
        "Avg % TP",
        "Avg % M",
        "Avg % JK",
        "Avg % BK",
      ],
    ];
    Object.keys(bestAcceptedTrucks)
      .map((k) => ({
        truck: k,
        ...bestAcceptedTrucks[k],
        avg_accepted: Number(
          bestAcceptedTrucks[k]["accepted"] / bestAcceptedTrucks[k]["count"],
        ),
      }))
      .sort((a, b) => a.avg_accepted - b.avg_accepted)
      .slice(0, 20)
      .forEach((item, idx) => {
        let count = item["count"];
        let avgTandan = Math.round(Number(item["tandan"] / count));

        let temp = [
          idx + 1,
          item.truck,
          item.vendor,
          count,
          countPercentage(item["tandan"], totalAllTandan).toFixed(2) + "%",
          avgTandan,
          Number(10000 / avgTandan).toFixed(2),
          Number(item["accepted"] / count).toFixed(2),
          Number(item["matang"] / count).toFixed(2),
          Number(item["lewat_matang"] / count).toFixed(2),
          Number(item["tangkai_panjang"] / count).toFixed(2),
          Number(item["mentah"] / count).toFixed(2),
          Number(item["janjang_kosong"] / count).toFixed(2),
          Number(item["buah_kecil"] / count).toFixed(2),
        ];

        worstAcceptedTrucksData.push(temp);
      });
    worstAcceptedTrucksData.push([
      "** Kontribusi merupakan persentase terhadap keseluruhan truk dalam Januari - Maret 2025",
    ]);

    const hourDataRejectData = [
      [periodString],
      ["No", "Kategori", "% Diterima", "% Ditolak"],
    ];
    hourDataRejectData.push([
      1,
      "07:00 - 18:00",
      countPercentage(
        hourDataReject["before6pm"].total_accepted,
        hourDataReject["before6pm"].total_tandan,
      ).toFixed(2),
      countPercentage(
        hourDataReject["before6pm"].total_rejected,
        hourDataReject["before6pm"].total_tandan,
      ).toFixed(2),
    ]);
    hourDataRejectData.push([
      2,
      "18:00 - 03:00",
      countPercentage(
        hourDataReject["after6pm"].total_accepted,
        hourDataReject["after6pm"].total_tandan,
      ).toFixed(2),
      countPercentage(
        hourDataReject["after6pm"].total_rejected,
        hourDataReject["after6pm"].total_tandan,
      ).toFixed(2),
    ]);
    hourDataRejectData.push([""]);
    Object.keys(hourDataReject).forEach((category, idx) => {
      const item = hourDataReject[category];
      const categoryTime =
        category === "before6pm" ? "07:00 - 18:00" : "18:00 - 03:00";
      hourDataRejectData.push([`Truk Grading ${categoryTime}`]);
      hourDataRejectData.push([
        "No",
        "Plat Nomor",
        "Vendor",
        "Total",
        "Kontribusi",
      ]);
      Object.keys(item.trucks)
        .map((k) => ({
          vehicle_number: k,
          ...item.trucks[k],
        }))
        .sort((a, b) => b.percent_rejected - a.percent_rejected)
        .slice(0, 10)
        .forEach((t, idx) => {
          hourDataRejectData.push([
            idx + 1,
            t.vehicle_number,
            t.vendor_name,
            t.count + "x",
            countPercentage(t.count, item.total_trucks).toFixed(2) + "%",
          ]);
        });

      hourDataRejectData.push([""]);
    });

    const totalJanjangData = [
      [periodString],
      [
        "No",
        "Kategori",
        "Estimasi BJR",
        "Total Truk",
        "Kontribusi",
        "Total Janjang",
        "% Diterima",
        "% Matang",
        "% Lewat Matang",
        "% Tangkai Panjang",
        "% Mentah",
        "% Janjang Kosong",
        "% Buah Kecil",
      ],
    ];
    totalJanjangData.push([
      1,
      "400 - 600 Janjang",
      "16 - 30kg",
      totalJanjangObj["<600"].total_trucks,
      countPercentage(
        totalJanjangObj["<600"].total_trucks,
        data?.length,
      ).toFixed(2),
      totalJanjangObj["<600"].total_janjang,
      countPercentage(
        totalJanjangObj["<600"].total_accepted,
        totalJanjangObj["<600"].total_janjang,
      ).toFixed(2),
      countPercentage(
        totalJanjangObj["<600"].matang,
        totalJanjangObj["<600"].total_janjang,
      ).toFixed(2),
      countPercentage(
        totalJanjangObj["<600"].lewat_matang,
        totalJanjangObj["<600"].total_janjang,
      ).toFixed(2),
      countPercentage(
        totalJanjangObj["<600"].tangkai_panjang,
        totalJanjangObj["<600"].total_accepted,
      ).toFixed(2),
      countPercentage(
        totalJanjangObj["<600"].mentah,
        totalJanjangObj["<600"].total_janjang,
      ).toFixed(2),
      countPercentage(
        totalJanjangObj["<600"].janjang_kosong,
        totalJanjangObj["<600"].total_janjang,
      ).toFixed(2),
      countPercentage(
        totalJanjangObj["<600"].buah_kecil,
        totalJanjangObj["<600"].total_janjang,
      ).toFixed(2),
    ]);
    totalJanjangData.push([
      2,
      "601 - 1000 Janjang",
      "10 - 15kg",
      totalJanjangObj["<1000"].total_trucks,
      countPercentage(
        totalJanjangObj["<1000"].total_trucks,
        data?.length,
      ).toFixed(2),
      totalJanjangObj["<1000"].total_janjang,
      countPercentage(
        totalJanjangObj["<1000"].total_accepted,
        totalJanjangObj["<1000"].total_janjang,
      ).toFixed(2),
      countPercentage(
        totalJanjangObj["<1000"].matang,
        totalJanjangObj["<1000"].total_janjang,
      ).toFixed(2),
      countPercentage(
        totalJanjangObj["<1000"].lewat_matang,
        totalJanjangObj["<1000"].total_janjang,
      ).toFixed(2),
      countPercentage(
        totalJanjangObj["<1000"].tangkai_panjang,
        totalJanjangObj["<1000"].total_accepted,
      ).toFixed(2),
      countPercentage(
        totalJanjangObj["<1000"].mentah,
        totalJanjangObj["<1000"].total_janjang,
      ).toFixed(2),
      countPercentage(
        totalJanjangObj["<1000"].janjang_kosong,
        totalJanjangObj["<1000"].total_janjang,
      ).toFixed(2),
      countPercentage(
        totalJanjangObj["<1000"].buah_kecil,
        totalJanjangObj["<1000"].total_janjang,
      ).toFixed(2),
    ]);
    totalJanjangData.push([
      3,
      "> 1000 Janjang",
      "<10kg",
      totalJanjangObj[">1000"].total_trucks,
      countPercentage(
        totalJanjangObj[">1000"].total_trucks,
        data?.length,
      ).toFixed(2),
      totalJanjangObj[">1000"].total_janjang,
      countPercentage(
        totalJanjangObj[">1000"].total_accepted,
        totalJanjangObj[">1000"].total_janjang,
      ).toFixed(2),
      countPercentage(
        totalJanjangObj[">1000"].matang,
        totalJanjangObj[">1000"].total_janjang,
      ).toFixed(2),
      countPercentage(
        totalJanjangObj[">1000"].lewat_matang,
        totalJanjangObj[">1000"].total_janjang,
      ).toFixed(2),
      countPercentage(
        totalJanjangObj[">1000"].tangkai_panjang,
        totalJanjangObj[">1000"].total_accepted,
      ).toFixed(2),
      countPercentage(
        totalJanjangObj[">1000"].mentah,
        totalJanjangObj[">1000"].total_janjang,
      ).toFixed(2),
      countPercentage(
        totalJanjangObj[">1000"].janjang_kosong,
        totalJanjangObj[">1000"].total_janjang,
      ).toFixed(2),
      countPercentage(
        totalJanjangObj[">1000"].buah_kecil,
        totalJanjangObj[">1000"].total_janjang,
      ).toFixed(2),
    ]);
    totalJanjangData.push([""]);
    Object.keys(totalJanjangObj).forEach((category, idx) => {
      const item = totalJanjangObj[category];
      const categoryTotal =
        category === "<600"
          ? "400 - 600 Janjang"
          : category === "<1000"
            ? "601 - 1000 Janjang"
            : "> 1000 Janjang";
      totalJanjangData.push([`Kategori ${categoryTotal}`]);
      totalJanjangData.push([
        "No",
        // 'Plat Nomor',
        "Vendor",
        "Total",
        "Kontribusi",
      ]);
      Object.keys(item.vendors)
        .map((k) => ({
          vendor: k,
          ...item.vendors[k],
        }))
        .sort((a, b) => b.count - a.count)
        // .slice(0, 10)
        .forEach((t, idx) => {
          totalJanjangData.push([
            idx + 1,
            // t.vehicle_number,
            t.vendor_name,
            t.count + "x",
            countPercentage(t.count, item.total_trucks).toFixed(2) + "%",
          ]);
        });

      totalJanjangData.push([""]);
    });

    const machineUtilityWeekData = [
      [periodString],
      [
        "Week",
        "Total Truk",
        "Avg Truk Harian",
        "Mesin 1",
        "",
        "Mesin 2",
        "",
        "Mesin 3",
        "",
        "Mesin 4",
        "",
      ],
      [
        "",
        "",
        "",
        "Total",
        "% Utilitas",
        "Total",
        "% Utilitas",
        "Total",
        "% Utilitas",
        "Total",
        "% Utilitas",
      ],
    ];
    Object.keys(machineUtilityWeek).forEach((week) => {
      const item = machineUtilityWeek[week];
      machineUtilityWeekData.push([
        week,
        item.total_trucks,
        Math.round(item.total_trucks / 7),
        item["machine"][1],
        countPercentage(item["machine"][1], item.total_trucks).toFixed(2) + "%",
        item["machine"][2],
        countPercentage(item["machine"][2], item.total_trucks).toFixed(2) + "%",
        item["machine"][3],
        countPercentage(item["machine"][3], item.total_trucks).toFixed(2) + "%",
        item["machine"][4],
        countPercentage(item["machine"][4], item.total_trucks).toFixed(2) + "%",
      ]);
    });

    const avgVendorHeader = [
      "Total Truk",
      "Kontribusi %",
      "Avg Tandan",
      "Estimasi BJR",
      "Avg Diterima %",
      "Avg MM %",
      "Avg LM %",
      "Avg TP %",
      "Avg M %",
      "Avg JK %",
      "Avg BK %",
    ];
    const avgVendorData = [
      [periodString],
      ["No", "Vendor", ...avgVendorHeader],
    ];
    Object.keys(avgVendor).forEach((vendor, idx) => {
      const item = avgVendor[vendor];
      const avgTandan = Math.round(item.tandan / item.count);

      avgVendorData.push([
        idx + 1,
        vendor,
        item.count,
        countPercentage(item.count, data?.length).toFixed(2),
        avgTandan,
        (10000 / avgTandan).toFixed(2),
        (item.accepted / item.count).toFixed(2),
        (item.matang / item.count).toFixed(2),
        (item.lewat_matang / item.count).toFixed(2),
        (item.tangkai_panjang / item.count).toFixed(2),
        (item.mentah / item.count).toFixed(2),
        (item.janjang_kosong / item.count).toFixed(2),
        (item.buah_kecil / item.count).toFixed(2),
      ]);
    });

    avgVendorData.push([
      "** Kontribusi merupakan persentase terhadap keseluruhan truk dalam Januari - Maret 2025",
    ]);

    Object.keys(avgVendor)
      .map((vendor, idx) => {
        const item = avgVendor[vendor];

        return { vendor_name: vendor, ...item };
      })
      .sort((a, b) => b.count - a.count)
      .forEach((d) => {
        avgVendorData.push([""]);
        avgVendorData.push([`Most Frequent Truck ${d.vendor_name}`]);
        avgVendorData.push(["No", "Plat Nomor", ...avgVendorHeader]);
        Object.keys(d.trucks)
          .map((t) => ({ vehicle_number: t, ...d["trucks"][t] }))
          .sort((a, b) => b.count - a.count)
          .forEach((item, idx) => {
            const avgTandan = Math.round(item.tandan / item.count);

            avgVendorData.push([
              idx + 1,
              item.vehicle_number,
              item.count,
              countPercentage(item.count, data?.length).toFixed(2),
              avgTandan,
              (10000 / avgTandan).toFixed(2),
              (item.accepted / item.count).toFixed(2),
              (item.matang / item.count).toFixed(2),
              (item.lewat_matang / item.count).toFixed(2),
              (item.tangkai_panjang / item.count).toFixed(2),
              (item.mentah / item.count).toFixed(2),
              (item.janjang_kosong / item.count).toFixed(2),
              (item.buah_kecil / item.count).toFixed(2),
            ]);
          });

        avgVendorData.push([
          "** Kontribusi merupakan persentase terhadap keseluruhan truk dalam Januari - Maret 2025",
        ]);
      });

    const totalJanjangDurationData = [
      [periodString],
      [
        "No",
        "Kategori",
        "Estimasi BJR",
        "Total Truk",
        "Kontribusi",
        "Total Janjang",
        "% Diterima",
        "% Matang",
        "% Lewat Matang",
        "% Tangkai Panjang",
        "% Mentah",
        "% Janjang Kosong",
        "% Buah Kecil",
        "Avg Durasi",
      ],
    ];
    totalJanjangDurationData.push([
      1,
      "400 - 600 Janjang",
      "16 - 30kg",
      totalJanjangObjDuration["<600"].total_trucks,
      countPercentage(
        totalJanjangObjDuration["<600"].total_trucks,
        data?.length,
      ).toFixed(2),
      totalJanjangObjDuration["<600"].total_janjang,
      countPercentage(
        totalJanjangObjDuration["<600"].total_accepted,
        totalJanjangObjDuration["<600"].total_janjang,
      ).toFixed(2),
      countPercentage(
        totalJanjangObjDuration["<600"].matang,
        totalJanjangObjDuration["<600"].total_janjang,
      ).toFixed(2),
      countPercentage(
        totalJanjangObjDuration["<600"].lewat_matang,
        totalJanjangObjDuration["<600"].total_janjang,
      ).toFixed(2),
      countPercentage(
        totalJanjangObjDuration["<600"].tangkai_panjang,
        totalJanjangObjDuration["<600"].total_accepted,
      ).toFixed(2),
      countPercentage(
        totalJanjangObjDuration["<600"].mentah,
        totalJanjangObjDuration["<600"].total_janjang,
      ).toFixed(2),
      countPercentage(
        totalJanjangObjDuration["<600"].janjang_kosong,
        totalJanjangObjDuration["<600"].total_janjang,
      ).toFixed(2),
      countPercentage(
        totalJanjangObjDuration["<600"].buah_kecil,
        totalJanjangObjDuration["<600"].total_janjang,
      ).toFixed(2),
      getDurationStringFromMs(
        Math.round(
          totalJanjangObjDuration["<600"].duration /
            totalJanjangObjDuration["<600"].total_trucks,
        ),
      ),
    ]);
    totalJanjangDurationData.push([
      2,
      "601 - 1000 Janjang",
      "10 - 15kg",
      totalJanjangObjDuration["<1000"].total_trucks,
      countPercentage(
        totalJanjangObjDuration["<1000"].total_trucks,
        data?.length,
      ).toFixed(2),
      totalJanjangObjDuration["<1000"].total_janjang,
      countPercentage(
        totalJanjangObjDuration["<1000"].total_accepted,
        totalJanjangObjDuration["<1000"].total_janjang,
      ).toFixed(2),
      countPercentage(
        totalJanjangObjDuration["<1000"].matang,
        totalJanjangObjDuration["<1000"].total_janjang,
      ).toFixed(2),
      countPercentage(
        totalJanjangObjDuration["<1000"].lewat_matang,
        totalJanjangObjDuration["<1000"].total_janjang,
      ).toFixed(2),
      countPercentage(
        totalJanjangObjDuration["<1000"].tangkai_panjang,
        totalJanjangObjDuration["<1000"].total_accepted,
      ).toFixed(2),
      countPercentage(
        totalJanjangObjDuration["<1000"].mentah,
        totalJanjangObjDuration["<1000"].total_janjang,
      ).toFixed(2),
      countPercentage(
        totalJanjangObjDuration["<1000"].janjang_kosong,
        totalJanjangObjDuration["<1000"].total_janjang,
      ).toFixed(2),
      countPercentage(
        totalJanjangObjDuration["<1000"].buah_kecil,
        totalJanjangObjDuration["<1000"].total_janjang,
      ).toFixed(2),
      getDurationStringFromMs(
        Math.round(
          totalJanjangObjDuration["<1000"].duration /
            totalJanjangObjDuration["<1000"].total_trucks,
        ),
      ),
    ]);
    totalJanjangDurationData.push([
      3,
      "> 1000 Janjang",
      "<10kg",
      totalJanjangObjDuration[">1000"].total_trucks,
      countPercentage(
        totalJanjangObjDuration[">1000"].total_trucks,
        data?.length,
      ).toFixed(2),
      totalJanjangObjDuration[">1000"].total_janjang,
      countPercentage(
        totalJanjangObjDuration[">1000"].total_accepted,
        totalJanjangObjDuration[">1000"].total_janjang,
      ).toFixed(2),
      countPercentage(
        totalJanjangObjDuration[">1000"].matang,
        totalJanjangObjDuration[">1000"].total_janjang,
      ).toFixed(2),
      countPercentage(
        totalJanjangObjDuration[">1000"].lewat_matang,
        totalJanjangObjDuration[">1000"].total_janjang,
      ).toFixed(2),
      countPercentage(
        totalJanjangObjDuration[">1000"].tangkai_panjang,
        totalJanjangObjDuration[">1000"].total_accepted,
      ).toFixed(2),
      countPercentage(
        totalJanjangObjDuration[">1000"].mentah,
        totalJanjangObjDuration[">1000"].total_janjang,
      ).toFixed(2),
      countPercentage(
        totalJanjangObjDuration[">1000"].janjang_kosong,
        totalJanjangObjDuration[">1000"].total_janjang,
      ).toFixed(2),
      countPercentage(
        totalJanjangObjDuration[">1000"].buah_kecil,
        totalJanjangObjDuration[">1000"].total_janjang,
      ).toFixed(2),
      getDurationStringFromMs(
        Math.round(
          totalJanjangObjDuration[">1000"].duration /
            totalJanjangObjDuration[">1000"].total_trucks,
        ),
      ),
    ]);

    const orderDay = countDays(daysDateArray);
    const dailyTruckCountData = [
      [periodString],
      ["Rata - Rata Grading Berdasarkan Hari Dan Waktu"],
      [
        "Hari",
        "00 - 02",
        "05 - 10",
        "10 - 12",
        "12 - 14",
        "14 - 16",
        "16 - 18",
        "18 - 19",
        "19 - 21",
        "21 - 24",
        // 'Total',
      ],
    ];
    // console.log({ orderDay });
    Object.keys(orderDay).forEach((d) => {
      const item = dailyTruckCount[d];
      const totalDay = orderDay[d];

      if (item) {
        // console.log({ item, totalDay });
        dailyTruckCountData.push([
          d,
          Number((item?.["00"] || 1) / (totalDay || 1)).toFixed(1),
          Number((item?.["05"] || 1) / (totalDay || 1)).toFixed(1),
          Number((item?.["10"] || 1) / (totalDay || 1)).toFixed(1),
          Number((item?.["12"] || 1) / (totalDay || 1)).toFixed(1),
          Number((item?.["14"] || 1) / (totalDay || 1)).toFixed(1),
          Number((item?.["16"] || 1) / (totalDay || 1)).toFixed(1),
          Number((item?.["18"] || 1) / (totalDay || 1)).toFixed(1),
          Number((item?.["19"] || 1) / (totalDay || 1)).toFixed(1),
          Number((item?.["21"] || 1) / (totalDay || 1)).toFixed(1),
          // item['total'],
        ]);
      }
    });

    // console.log({ orderDay, daysDateArray, dailyTruckCount });

    // return res.send('Thank you');

    const workbook = XLSX.utils.book_new();
    // Create a worksheet
    const wsRaw = XLSX.utils.aoa_to_sheet(rawDataExcel);
    XLSX.utils.book_append_sheet(workbook, wsRaw, "Raw Data");
    const wsAvgWeek = XLSX.utils.aoa_to_sheet(avgWeekData);
    XLSX.utils.book_append_sheet(workbook, wsAvgWeek, "Average Reject Accept");
    const wsAvgWeekDemography = XLSX.utils.aoa_to_sheet(avgWeekDemographyData);
    XLSX.utils.book_append_sheet(
      workbook,
      wsAvgWeekDemography,
      "Average Demografi Klasifikasi",
    );
    const wsBestAccepted = XLSX.utils.aoa_to_sheet(bestAcceptedTrucksData);
    XLSX.utils.book_append_sheet(workbook, wsBestAccepted, "Best 20 Accepted");
    const wsWorsttAccepted = XLSX.utils.aoa_to_sheet(worstAcceptedTrucksData);
    XLSX.utils.book_append_sheet(
      workbook,
      wsWorsttAccepted,
      "Top 20 Worst Trucks",
    );
    const wsHourTruck = XLSX.utils.aoa_to_sheet(hourDataRejectData);
    XLSX.utils.book_append_sheet(workbook, wsHourTruck, "Reject by Shift Data");
    const wsTotalJanjang = XLSX.utils.aoa_to_sheet(totalJanjangData);
    XLSX.utils.book_append_sheet(
      workbook,
      wsTotalJanjang,
      "Total Tandan Recap",
    );
    const wsMachineUtility = XLSX.utils.aoa_to_sheet(machineUtilityWeekData);
    XLSX.utils.book_append_sheet(
      workbook,
      wsMachineUtility,
      "Machine Utilities",
    );
    const wsAvgVendor = XLSX.utils.aoa_to_sheet(avgVendorData);
    XLSX.utils.book_append_sheet(workbook, wsAvgVendor, "Average Vendor");
    const wsTotalJanjangDuration = XLSX.utils.aoa_to_sheet(
      totalJanjangDurationData,
    );
    XLSX.utils.book_append_sheet(
      workbook,
      wsTotalJanjangDuration,
      "Total Tandan Duration Recap",
    );
    const wsDailyTruck = XLSX.utils.aoa_to_sheet(dailyTruckCountData);
    XLSX.utils.book_append_sheet(
      workbook,
      wsDailyTruck,
      "Daily Truck Day Time",
    );
    const wsTrukPerHari = XLSX.utils.aoa_to_sheet(trukPerHari);
    XLSX.utils.book_append_sheet(workbook, wsTrukPerHari, "Total Truk Harian");

    // Write the file
    // XLSX.writeFile(workbook, `Report${new Date().toISOString()}.xlsx`);
    // console.log('Excel file generated successfully!');

    // Convert the workbook to a buffer
    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "buffer",
    });

    // Set headers for file download
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=Report-${new Date().toISOString()}.xlsx`,
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );

    // Send the buffer
    return res.send(excelBuffer);
  }

  static async getDataDashboardNew(req, res, next) {
    try {
      const user = req.user;
      const {
        year = new Date().getFullYear(),
        factory = "",
        date_to = null,
        date_from = null,
        vendor_type = null,
      } = req.query;

      let ids = req.query.ids;
      ids = Array.isArray(ids)
        ? ids
        : typeof ids === "string"
          ? ids.split(",")
          : [];
      const uniqIds = [...new Set(ids.map((s) => s.trim()).filter(Boolean))];

      const weeks = generateWeeks(year);
      const days = generateDatesByYear(year, "DD/MM/YY");
      let months = generateMonths(year);

      if (date_from && date_to) {
        months = [];
        let currentMonth = dayjs(date_from).startOf("month");
        const endMonth = dayjs(date_to).endOf("month");

        while (
          currentMonth.isBefore(endMonth) ||
          currentMonth.isSame(endMonth, "month")
        ) {
          months.push(currentMonth.format("MMMM YYYY"));
          currentMonth = currentMonth.add(1, "month");
        }
      }

      let q = { company: user.company };

      if (uniqIds.length) {
        q["vendor"] = { $in: uniqIds };
      }

      if (date_from && date_to) {
        q["date"] = {
          $gte: dayjs(date_from).hour(6).minute(0).second(0).millisecond(0),
          $lte: dayjs(date_to)
            .add(1, "day")
            .hour(5)
            .minute(59)
            .second(59)
            .millisecond(999),
        };
      }

      if (factory) {
        q["factory"] = factory;
      }

      const factoryObj = factory
        ? await FactoryModel.findById(factory).lean()
        : null;
      const isLngm =
        factoryObj && ["LNGM"].some((loc) => factoryObj.name.includes(loc));

      if (vendor_type) {
        const vTypeLower = vendor_type.toLowerCase();
        if (isLngm && (vTypeLower === 'gapoktan' || vTypeLower === 'stka')) {
          q["vendor_name"] = { $regex: new RegExp(vendor_type, 'i') };
        } else if (vTypeLower !== 'all') {
          q["vendor_type"] = vendor_type;
        }
      }

      // if (year) {
      //   q['year'] = Number(year);
      // }

      let inspections = await InspectionDataModel.find(q).sort({ date: -1 });

      const limit = await getCompanyLimitTandan(user);

      inspections = inspections.filter(
        (e) =>
          e.grading_result?.total_tandan > limit &&
          e.vehicle_number !== "BH 1240 ALB" &&
          e.vendor_name !== "Vendor 2 Plasma" &&
          e.vendor_name !== "Vendor B" &&
          e.vehicle_number !== "BH 4321 ALB",
      );

      const {
        totalTandan,
        totalAccepted,
        totalFined,
        totalRejected,
        totalInspection,
        percentAccepted,
        percentFined,
        percentRejected,
      } = utilsInspection.getAllMonitoringDataNew(inspections);

      const avgClassification = {
        matang: [],
        lewat_matang: [],
        mentah_diterima: [],
        janjang_kosong_diterima: [],
        buah_kecil_5_diterima: [],
        tangkai_panjang: [],
        mentah: [],
        janjang_kosong: [],
        buah_kecil_3: [],
        buah_kecil_5: [],
        buah_kecil_2: [],
        matang_ditolak: [],
        lewat_matang_ditolak: [],
        rusak_dimakan_tikus: [],
      };
      const avgAcceptedVendor = {};
      const summaryPerformance = {
        daily: generateTemplate(days),
        weekly: generateTemplate(weeks),
        monthly: generateTemplate(months),
      };
      const gradingTrucks = {
        daily: generateTemplate(days),
        weekly: generateTemplate(weeks),
        monthly: generateTemplate(months),
      };
      const fruitAccepted = {
        daily: generateTemplate(days),
        weekly: generateTemplate(weeks),
        monthly: generateTemplate(months),
      };
      const fruitRejected = {
        daily: generateTemplate(days),
        weekly: generateTemplate(weeks),
        monthly: generateTemplate(months),
      };
      const fruitTp = {
        daily: generateTemplate(days),
        weekly: generateTemplate(weeks),
        monthly: generateTemplate(months),
      };

      const averageVendor = {};

      let avgClassificationTren = {
        matang: {},
        lewat_matang: {},
        mentah_diterima: {},
        janjang_kosong_diterima: {},
        buah_kecil_5_diterima: {},
        mentah: {},
        janjang_kosong: {},
        buah_kecil_3: {},
        buah_kecil_5: {},
        buah_kecil_2: {},
        tangkai_panjang: {},
        matang_ditolak: {},
        lewat_matang_ditolak: {},
        rusak_dimakan_tikus: {},
      };
      let avgClassificationVendor = {
        matang: {},
        lewat_matang: {},
        mentah_diterima: {},
        janjang_kosong_diterima: {},
        buah_kecil_5_diterima: {},
        mentah: {},
        janjang_kosong: {},
        buah_kecil_3: {},
        buah_kecil_5: {},
        buah_kecil_2: {},
        tangkai_panjang: {},
        matang_ditolak: {},
        lewat_matang_ditolak: {},
        rusak_dimakan_tikus: {},
      };

      let avgAcceptedVendorHistory = {};
      let avgAcceptedVendorHistoryDaily = {};

      let grandTotalTandan = 0;
      let grandTotalAccepted = 0;
      let grandTotalRejected = 0;
      let grandTotalFined = 0;
      let grandTotalMultiple = 0;

      // Check if filtering by date range with more than 1 day
      const hasMultipleDates =
        date_from &&
        date_to &&
        dayjs(date_from).format("YYYY-MM-DD") !==
          dayjs(date_to).format("YYYY-MM-DD");

      // factoryObj and isLngm moved above

      inspections = inspections.map((item) => {
        const vendorName = item.vendor_name;
        // Adjust date for shift-based day (06:00 to 05:59 next day) only when filtering multiple dates
        const dateForGrouping = hasMultipleDates
          ? dayjs(item["date"]).subtract(6, "hour").toDate()
          : item["date"];
        const { day, monthYear } = getDateMonthYearDay(
          dateForGrouping,
          true,
          "DD/MM/YY",
        );
        const week = getWeekNumber(dateForGrouping);

        const {
          percentJangkos,
          percentBuahKecil3,
          percentBuahKecil5,
          percentLewatMatang,
          percentMatang,
          percentMentah,
          percentTangkaiPanjang,
          percentAcceptedModified,
          totalAcceptedModified,
          totalRejectedModified,
          totalFined: totalFinedItem,
          totalTandan: totalTandanItem,
          totalMatang,
          totalMentah,
          totalLewatMatang,
          totalBuahKecil3,
          totalBuahKecil5,
          totalJanjangKosong,
          totalTangkaiPanjang,
          percentBuahKecil,

          totalMentahDiterima,
          totalJanjangKosongDiterima,
          totalBuahKecil5Diterima,
          percentMentahDiterima,
          percentJanjangKosongDiterima,
          percentBuahKecil5Diterima,
          totalMatangDitolak,
          totalLewatMatangDitolak,
          percentMatangDitolak,
          percentLewatMatangDitolak,

          totalMultiple,
          percentRusakDimakanTikus,
          totalRusakDimakanTikus,
          totalBuahKecil2,
          percentBuahKecil2,
        } = utilsInspection.getTotalAndPercentClassificationNew(item, isLngm);

        grandTotalAccepted += totalAcceptedModified;
        grandTotalRejected += totalRejectedModified;
        grandTotalFined += totalFinedItem;
        grandTotalTandan += totalTandanItem;
        grandTotalMultiple += totalMultiple;

        avgClassification["matang"].push(totalMatang);
        avgClassification["lewat_matang"].push(totalLewatMatang);
        avgClassification["mentah"].push(totalMentah);
        avgClassification["janjang_kosong"].push(totalJanjangKosong);
        avgClassification["buah_kecil_3"].push(totalBuahKecil3);
        avgClassification["buah_kecil_5"].push(totalBuahKecil5);
        if (isLngm) avgClassification["buah_kecil_2"].push(totalBuahKecil2);
        avgClassification["tangkai_panjang"].push(totalTangkaiPanjang);

        avgClassification["mentah_diterima"].push(totalMentahDiterima);
        avgClassification["janjang_kosong_diterima"].push(
          totalJanjangKosongDiterima,
        );
        avgClassification["buah_kecil_5_diterima"].push(
          totalBuahKecil5Diterima,
        );

        avgClassification["matang_ditolak"].push(totalMatangDitolak);
        avgClassification["lewat_matang_ditolak"].push(totalLewatMatangDitolak);
        avgClassification["rusak_dimakan_tikus"].push(totalRusakDimakanTikus);

        if (!avgClassificationTren["matang"][day]) {
          avgClassificationTren["matang"][day] = [];
        }
        avgClassificationTren["matang"][day].push(percentMatang);

        if (!avgClassificationTren["lewat_matang"][day]) {
          avgClassificationTren["lewat_matang"][day] = [];
        }
        avgClassificationTren["lewat_matang"][day].push(percentLewatMatang);

        if (!avgClassificationTren["mentah"][day]) {
          avgClassificationTren["mentah"][day] = [];
        }
        avgClassificationTren["mentah"][day].push(percentMentah);

        if (!avgClassificationTren["janjang_kosong"][day]) {
          avgClassificationTren["janjang_kosong"][day] = [];
        }
        avgClassificationTren["janjang_kosong"][day].push(percentJangkos);

        if (!avgClassificationTren["buah_kecil_3"][day]) {
          avgClassificationTren["buah_kecil_3"][day] = [];
        }
        avgClassificationTren["buah_kecil_3"][day].push(percentBuahKecil3);

        if (!avgClassificationTren["buah_kecil_5"][day]) {
          avgClassificationTren["buah_kecil_5"][day] = [];
        }
        avgClassificationTren["buah_kecil_5"][day].push(percentBuahKecil5);

        if (isLngm) {
          if (!avgClassificationTren["buah_kecil_2"][day]) {
            avgClassificationTren["buah_kecil_2"][day] = [];
          }
          avgClassificationTren["buah_kecil_2"][day].push(percentBuahKecil2);
        }

        if (!avgClassificationTren["tangkai_panjang"][day]) {
          avgClassificationTren["tangkai_panjang"][day] = [];
        }
        avgClassificationTren["tangkai_panjang"][day].push(
          percentTangkaiPanjang,
        );

        // new
        if (!avgClassificationTren["mentah_diterima"][day]) {
          avgClassificationTren["mentah_diterima"][day] = [];
        }
        avgClassificationTren["mentah_diterima"][day].push(
          percentMentahDiterima,
        );
        if (!avgClassificationTren["janjang_kosong_diterima"][day]) {
          avgClassificationTren["janjang_kosong_diterima"][day] = [];
        }
        avgClassificationTren["janjang_kosong_diterima"][day].push(
          percentJanjangKosongDiterima,
        );
        if (!avgClassificationTren["buah_kecil_5_diterima"][day]) {
          avgClassificationTren["buah_kecil_5_diterima"][day] = [];
        }
        avgClassificationTren["buah_kecil_5_diterima"][day].push(
          percentBuahKecil5Diterima,
        );
        if (!avgClassificationTren["matang_ditolak"][day]) {
          avgClassificationTren["matang_ditolak"][day] = [];
        }
        avgClassificationTren["matang_ditolak"][day].push(percentMatangDitolak);

        if (!avgClassificationTren["lewat_matang_ditolak"][day]) {
          avgClassificationTren["lewat_matang_ditolak"][day] = [];
        }
        avgClassificationTren["lewat_matang_ditolak"][day].push(
          percentLewatMatangDitolak,
        );

        if (!avgClassificationTren["rusak_dimakan_tikus"][day]) {
          avgClassificationTren["rusak_dimakan_tikus"][day] = [];
        }
        avgClassificationTren["rusak_dimakan_tikus"][day].push(
          percentRusakDimakanTikus,
        );

        if (!avgClassificationVendor["matang"][vendorName]) {
          avgClassificationVendor["matang"][vendorName] = {
            count: 0,
            percent: 0,
            total: 0,
          };
        }
        avgClassificationVendor["matang"][vendorName]["count"] += 1;
        avgClassificationVendor["matang"][vendorName]["percent"] +=
          percentMatang;
        avgClassificationVendor["matang"][vendorName]["total"] += totalMatang;

        if (!avgClassificationVendor["lewat_matang"][vendorName]) {
          avgClassificationVendor["lewat_matang"][vendorName] = {
            count: 0,
            percent: 0,
            total: 0,
          };
        }
        avgClassificationVendor["lewat_matang"][vendorName]["count"] += 1;
        avgClassificationVendor["lewat_matang"][vendorName]["percent"] +=
          percentLewatMatang;
        avgClassificationVendor["lewat_matang"][vendorName]["total"] +=
          totalLewatMatang;

        if (!avgClassificationVendor["mentah"][vendorName]) {
          avgClassificationVendor["mentah"][vendorName] = {
            count: 0,
            percent: 0,
            total: 0,
          };
        }
        avgClassificationVendor["mentah"][vendorName]["count"] += 1;
        avgClassificationVendor["mentah"][vendorName]["percent"] +=
          percentMentah;
        avgClassificationVendor["mentah"][vendorName]["total"] += totalMentah;

        if (!avgClassificationVendor["janjang_kosong"][vendorName]) {
          avgClassificationVendor["janjang_kosong"][vendorName] = {
            count: 0,
            percent: 0,
            total: 0,
          };
        }
        avgClassificationVendor["janjang_kosong"][vendorName]["count"] += 1;
        avgClassificationVendor["janjang_kosong"][vendorName]["percent"] +=
          percentJangkos;
        avgClassificationVendor["janjang_kosong"][vendorName]["total"] +=
          totalJanjangKosong;

        if (!avgClassificationVendor["buah_kecil_3"][vendorName]) {
          avgClassificationVendor["buah_kecil_3"][vendorName] = {
            count: 0,
            percent: 0,
            total: 0,
          };
        }
        avgClassificationVendor["buah_kecil_3"][vendorName]["count"] += 1;
        avgClassificationVendor["buah_kecil_3"][vendorName]["percent"] +=
          percentBuahKecil3;
        avgClassificationVendor["buah_kecil_3"][vendorName]["total"] +=
          totalBuahKecil3;

        if (!avgClassificationVendor["buah_kecil_5"][vendorName]) {
          avgClassificationVendor["buah_kecil_5"][vendorName] = {
            count: 0,
            percent: 0,
            total: 0,
          };
        }
        avgClassificationVendor["buah_kecil_5"][vendorName]["count"] += 1;
        avgClassificationVendor["buah_kecil_5"][vendorName]["percent"] +=
          percentBuahKecil5;
        avgClassificationVendor["buah_kecil_5"][vendorName]["total"] +=
          totalBuahKecil5;

        if (isLngm) {
          if (!avgClassificationVendor["buah_kecil_2"][vendorName]) {
            avgClassificationVendor["buah_kecil_2"][vendorName] = {
              count: 0,
              percent: 0,
              total: 0,
            };
          }
          avgClassificationVendor["buah_kecil_2"][vendorName]["count"] += 1;
          avgClassificationVendor["buah_kecil_2"][vendorName]["percent"] +=
            percentBuahKecil2;
          avgClassificationVendor["buah_kecil_2"][vendorName]["total"] +=
            totalBuahKecil2;
        }

        if (!avgClassificationVendor["tangkai_panjang"][vendorName]) {
          avgClassificationVendor["tangkai_panjang"][vendorName] = {
            count: 0,
            percent: 0,
            total: 0,
          };
        }
        avgClassificationVendor["tangkai_panjang"][vendorName]["count"] += 1;
        avgClassificationVendor["tangkai_panjang"][vendorName]["percent"] +=
          percentTangkaiPanjang;
        avgClassificationVendor["tangkai_panjang"][vendorName]["total"] +=
          totalTangkaiPanjang;

        // new
        if (!avgClassificationVendor["mentah_diterima"][vendorName]) {
          avgClassificationVendor["mentah_diterima"][vendorName] = {
            count: 0,
            percent: 0,
            total: 0,
          };
        }
        avgClassificationVendor["mentah_diterima"][vendorName]["count"] += 1;
        avgClassificationVendor["mentah_diterima"][vendorName]["percent"] +=
          percentMentahDiterima;
        avgClassificationVendor["mentah_diterima"][vendorName]["total"] +=
          totalMentahDiterima;
        if (!avgClassificationVendor["janjang_kosong_diterima"][vendorName]) {
          avgClassificationVendor["janjang_kosong_diterima"][vendorName] = {
            count: 0,
            percent: 0,
            total: 0,
          };
        }
        avgClassificationVendor["janjang_kosong_diterima"][vendorName][
          "count"
        ] += 1;
        avgClassificationVendor["janjang_kosong_diterima"][vendorName][
          "percent"
        ] += percentJanjangKosongDiterima;
        avgClassificationVendor["janjang_kosong_diterima"][vendorName][
          "total"
        ] += totalJanjangKosongDiterima;
        if (!avgClassificationVendor["buah_kecil_5_diterima"][vendorName]) {
          avgClassificationVendor["buah_kecil_5_diterima"][vendorName] = {
            count: 0,
            percent: 0,
            total: 0,
          };
        }
        avgClassificationVendor["buah_kecil_5_diterima"][vendorName]["count"] +=
          1;
        avgClassificationVendor["buah_kecil_5_diterima"][vendorName][
          "percent"
        ] += percentBuahKecil5Diterima;
        avgClassificationVendor["buah_kecil_5_diterima"][vendorName]["total"] +=
          totalBuahKecil5Diterima;
        if (!avgClassificationVendor["matang_ditolak"][vendorName]) {
          avgClassificationVendor["matang_ditolak"][vendorName] = {
            count: 0,
            percent: 0,
            total: 0,
          };
        }
        avgClassificationVendor["matang_ditolak"][vendorName]["count"] += 1;
        avgClassificationVendor["matang_ditolak"][vendorName]["percent"] +=
          percentMatangDitolak;
        avgClassificationVendor["matang_ditolak"][vendorName]["total"] +=
          totalMatangDitolak;

        if (!avgClassificationVendor["lewat_matang_ditolak"][vendorName]) {
          avgClassificationVendor["lewat_matang_ditolak"][vendorName] = {
            count: 0,
            percent: 0,
            total: 0,
          };
        }
        avgClassificationVendor["lewat_matang_ditolak"][vendorName]["count"] +=
          1;
        avgClassificationVendor["lewat_matang_ditolak"][vendorName][
          "percent"
        ] += percentLewatMatangDitolak;
        avgClassificationVendor["lewat_matang_ditolak"][vendorName]["total"] +=
          totalLewatMatangDitolak;

        if (!avgClassificationVendor["rusak_dimakan_tikus"][vendorName]) {
          avgClassificationVendor["rusak_dimakan_tikus"][vendorName] = {
            count: 0,
            percent: 0,
            total: 0,
          };
        }
        avgClassificationVendor["rusak_dimakan_tikus"][vendorName]["count"] +=
          1;
        avgClassificationVendor["rusak_dimakan_tikus"][vendorName]["percent"] +=
          percentRusakDimakanTikus;
        avgClassificationVendor["rusak_dimakan_tikus"][vendorName]["total"] +=
          totalRusakDimakanTikus;

        if (!avgAcceptedVendor[vendorName]) {
          avgAcceptedVendor[vendorName] = [];
        }
        avgAcceptedVendor[vendorName].push(percentAcceptedModified);

        // Summary Performance
        setChartDataValue(
          summaryPerformance,
          "daily",
          day,
          ["Diterima", "Ditolak", "Didenda", "Total"],
          [
            totalAcceptedModified,
            totalRejectedModified,
            totalFinedItem,
            totalTandanItem,
          ],
        );
        setChartDataValue(
          summaryPerformance,
          "weekly",
          week,
          ["Diterima", "Ditolak", "Didenda", "Total"],
          [
            totalAcceptedModified,
            totalRejectedModified,
            totalFinedItem,
            totalTandanItem,
          ],
        );
        setChartDataValue(
          summaryPerformance,
          "monthly",
          monthYear,
          ["Diterima", "Ditolak", "Didenda", "Total"],
          [
            totalAcceptedModified,
            totalRejectedModified,
            totalFinedItem,
            totalTandanItem,
          ],
        );

        // Grading Trucks
        setChartDataValue(
          gradingTrucks,
          "daily",
          day,
          ["Truk", "Mesin 1", "Mesin 2", "Mesin 3", "Mesin 4"],
          [
            1,
            item.machine === 1 ? 1 : 0,
            item.machine === 2 ? 1 : 0,
            item.machine === 3 ? 1 : 0,
            item.machine === 4 ? 1 : 0,
          ],
        );
        setChartDataValue(
          gradingTrucks,
          "weekly",
          week,
          ["Truk", "Mesin 1", "Mesin 2", "Mesin 3", "Mesin 4"],
          [
            1,
            item.machine === 1 ? 1 : 0,
            item.machine === 2 ? 1 : 0,
            item.machine === 3 ? 1 : 0,
            item.machine === 4 ? 1 : 0,
          ],
        );
        setChartDataValue(
          gradingTrucks,
          "monthly",
          monthYear,
          ["Truk", "Mesin 1", "Mesin 2", "Mesin 3", "Mesin 4"],
          [
            1,
            item.machine === 1 ? 1 : 0,
            item.machine === 2 ? 1 : 0,
            item.machine === 3 ? 1 : 0,
            item.machine === 4 ? 1 : 0,
          ],
        );

        // Fruit Accepted
        setChartDataValue(
          fruitAccepted,
          "daily",
          day,
          ["Matang", "Lewat Matang"],
          [percentMatang, percentLewatMatang],
          true,
        );
        setChartDataValue(
          fruitAccepted,
          "weekly",
          week,
          ["Matang", "Lewat Matang"],
          [percentMatang, percentLewatMatang],
          true,
        );
        setChartDataValue(
          fruitAccepted,
          "monthly",
          monthYear,
          ["Matang", "Lewat Matang"],
          [percentMatang, percentLewatMatang],
          true,
        );

        // Fruit Tp
        setChartDataValue(
          fruitTp,
          "daily",
          day,
          ["Tangkai Panjang"],
          [percentTangkaiPanjang],
          true,
        );
        setChartDataValue(
          fruitTp,
          "weekly",
          week,
          ["Tangkai Panjang"],
          [percentTangkaiPanjang],
          true,
        );
        setChartDataValue(
          fruitTp,
          "monthly",
          monthYear,
          ["Tangkai Panjang"],
          [percentTangkaiPanjang],
          true,
        );

        // Fruit Rejected
        setChartDataValue(
          fruitRejected,
          "daily",
          day,
          [
            "Mentah",
            // 'Lewat Matang',
            "Janjang Kosong",
            "Buah <3kg",
            "Buah 3-5kg",
            ...(isLngm ? ["Buah <2kg"] : []),
          ],
          [
            percentMentah,
            // percentLewatMatang,
            percentJangkos,
            percentBuahKecil3,
            percentBuahKecil5,
            ...(isLngm ? [percentBuahKecil2] : []),
          ],
          true,
        );
        setChartDataValue(
          fruitRejected,
          "weekly",
          week,
          [
            "Mentah",
            // 'Lewat Matang',
            "Janjang Kosong",
            "Buah <3kg",
            "Buah 3-5kg",
            ...(isLngm ? ["Buah <2kg"] : []),
          ],
          [
            percentMentah,
            // percentLewatMatang,
            percentJangkos,
            percentBuahKecil3,
            percentBuahKecil5,
            ...(isLngm ? [percentBuahKecil2] : []),
          ],
          true,
        );
        setChartDataValue(
          fruitRejected,
          "monthly",
          monthYear,
          [
            "Mentah",
            // 'Lewat Matang',
            "Janjang Kosong",
            "Buah <3kg",
            "Buah 3-5kg",
            ...(isLngm ? ["Buah <2kg"] : []),
          ],
          [
            percentMentah,
            // percentLewatMatang,
            percentJangkos,
            percentBuahKecil3,
            percentBuahKecil5,
            ...(isLngm ? [percentBuahKecil2] : []),
          ],
          true,
        );

        if (!item["score"]) {
          item["score"] = 0;
        }

        let scores = {
          matang: scoringMultiplier.matang * totalMatang,
          lewat_matang: scoringMultiplier.lewat_matang * totalLewatMatang,
          mentah: scoringMultiplier.mentah * totalMentah,
          janjang_kosong: scoringMultiplier.janjang_kosong * totalJanjangKosong,
          buah_kecil:
            scoringMultiplier.buah_kecil *
            (totalBuahKecil3 +
              totalBuahKecil5 +
              (isLngm ? totalBuahKecil2 : 0)),
          tangkai_panjang:
            scoringMultiplier.tangkai_panjang * totalTangkaiPanjang,
        };

        item["score"] = Object.entries(scores).reduce((num, [key, value]) => {
          return num + value;
        }, 0);

        if (!averageVendor[vendorName]) {
          averageVendor[vendorName] = {
            count: 0,
            tandan: 0,
            accepted: 0,
            matang: 0,
            lewat_matang: 0,
            tangkai_panjang: 0,
            mentah: 0,
            janjang_kosong: 0,
            buah_kecil: 0,
          };
        }

        averageVendor[vendorName]["count"] += 1;
        averageVendor[vendorName]["tandan"] += totalTandanItem;
        averageVendor[vendorName]["accepted"] += percentAcceptedModified;
        averageVendor[vendorName]["matang"] += percentMatang;
        averageVendor[vendorName]["lewat_matang"] += percentLewatMatang;
        averageVendor[vendorName]["tangkai_panjang"] += percentTangkaiPanjang;
        averageVendor[vendorName]["mentah"] += percentMentah;
        averageVendor[vendorName]["janjang_kosong"] += percentJangkos;
        averageVendor[vendorName]["buah_kecil"] += percentBuahKecil;

        const payload = {
          _id: item._id,
          score: item.score,
          percent_accepted: percentAcceptedModified,
          percent_matang: percentMatang,
          percent_lewat_matang: percentLewatMatang,
          percent_mentah: percentMentah,
          percent_janjang_kosong: percentJangkos,
          percent_buah_kecil: percentBuahKecil,
          ...(isLngm ? { percent_buah_kecil_2: percentBuahKecil2 } : {}),
          percent_tangkai_panjang: percentTangkaiPanjang,
          total_tandan: item["grading_result"]["total_tandan"],
          vendor_name: vendorName,
          vehicle_number: item["vehicle_number"],
          date: item.date,
          finish_date: item.finish_date,
          mesin: item.machine,
          delivery_number: item.delivery_number,
          total_multiple: item["grading_result"]["total_multiple"],
          percent_multiple: countPercentage(
            item["grading_result"]["total_multiple"],
            item["grading_result"]["total_tandan"],
          ),
        };

        if (!avgAcceptedVendorHistory[vendorName]) {
          avgAcceptedVendorHistory[vendorName] = [];
        }
        avgAcceptedVendorHistory[vendorName].push(payload);

        if (!avgAcceptedVendorHistoryDaily[vendorName]) {
          avgAcceptedVendorHistoryDaily[vendorName] = {};
        }
        if (!avgAcceptedVendorHistoryDaily[vendorName][day]) {
          avgAcceptedVendorHistoryDaily[vendorName][day] = {
            trucks: 0,
            avg_tandan: 0,
            avg_accepted: 0,
            avg_matang: 0,
            avg_lewat_matang: 0,
            avg_mentah: 0,
            avg_janjang_kosong: 0,
            avg_tangkai_panjang: 0,
            avg_buah_kecil: 0,
          };
        }
        avgAcceptedVendorHistoryDaily[vendorName][day]["trucks"] += 1;
        avgAcceptedVendorHistoryDaily[vendorName][day]["avg_tandan"] +=
          totalTandanItem;
        avgAcceptedVendorHistoryDaily[vendorName][day]["avg_accepted"] +=
          percentAcceptedModified;
        avgAcceptedVendorHistoryDaily[vendorName][day]["avg_matang"] +=
          percentMatang;
        avgAcceptedVendorHistoryDaily[vendorName][day]["avg_lewat_matang"] +=
          percentLewatMatang;
        avgAcceptedVendorHistoryDaily[vendorName][day]["avg_mentah"] +=
          percentMentah;
        avgAcceptedVendorHistoryDaily[vendorName][day]["avg_janjang_kosong"] +=
          percentJangkos;
        avgAcceptedVendorHistoryDaily[vendorName][day]["avg_buah_kecil"] +=
          percentBuahKecil;
        avgAcceptedVendorHistoryDaily[vendorName][day]["avg_tangkai_panjang"] +=
          percentTangkaiPanjang;

        return payload;
      });

      const { lowest, highest } = getTopScores(inspections, 10);

      const averageGrading = Object.entries(avgClassification).reduce(
        (obj, [key, value]) => {
          obj[key] = value?.length
            ? countPercentage(
                value.reduce((tot, num) => tot + Number(num || 0), 0),
                grandTotalTandan,
              )
            : 0;

          return obj;
        },
        {},
      );
      const averageVendorAccepted = Object.entries(avgAcceptedVendor).reduce(
        (obj, [key, value]) => {
          obj[key] = (
            value.reduce((tot, num) => tot + (num || 0), 0) / value.length
          ).toLocaleString("en", { maximumFractionDigits: 2 });

          return obj;
        },
        {},
      );

      const lowestRanked = processInspectionData(lowest).sort(
        (a, b) => a.percent_accepted - b.percent_accepted,
      );
      const highestRanked = processInspectionData(highest).sort(
        (a, b) => b.percent_accepted - a.percent_accepted,
      );

      const averageVendorData = Object.entries(averageVendor).map(
        ([key, value]) => {
          return {
            vendor_name: key,
            count: value.count,
            percent_supply: countPercentage(
              value.count,
              totalInspection,
            ).toLocaleString("en", {
              maximumFractionDigits: 2,
            }),
            avg_tandan: Math.round(Number(value.tandan) / Number(value.count)),
            avg_accepted: (value.accepted / value.count).toLocaleString("en", {
              maximumFractionDigits: 2,
            }),
            avg_matang: (value.matang / value.count).toLocaleString("en", {
              maximumFractionDigits: 2,
            }),
            avg_lewat_matang: (value.lewat_matang / value.count).toLocaleString(
              "en",
              {
                maximumFractionDigits: 2,
              },
            ),
            avg_mentah: (value.mentah / value.count).toLocaleString("en", {
              maximumFractionDigits: 2,
            }),
            avg_janjang_kosong: (
              value.janjang_kosong / value.count
            ).toLocaleString("en", {
              maximumFractionDigits: 2,
            }),
            avg_buah_kecil: (value.buah_kecil / value.count).toLocaleString(
              "en",
              {
                maximumFractionDigits: 2,
              },
            ),
            avg_tangkai_panjang: (
              value.tangkai_panjang / value.count
            ).toLocaleString("en", {
              maximumFractionDigits: 2,
            }),
          };
        },
      );

      const rocSummaryPerformance = Object.entries(summaryPerformance).reduce(
        (obj, [key, value]) => {
          if (!obj[key]) {
            obj[key] = {
              diterima: 0,
              ditolak: 0,
              didenda: 0,
            };
          }
          let arrayData = Object.entries(value)
            .map(([k, v]) => {
              if (!isObjectEmpty(v)) {
                return {
                  label: k,
                  Diterima: countPercentage(v["Diterima"], v["Total"]),
                  Ditolak: countPercentage(v["Ditolak"], v["Total"]),
                  Didenda: countPercentage(v["Didenda"], v["Total"]),
                  Total: v["Total"],
                };
              }
              return null;
            }, [])
            .filter(Boolean);

          const rocTotal = {
            diterima: 0,
            ditolak: 0,
            didenda: 0,
          };

          for (let i = 1; i < arrayData.length; i++) {
            let current = arrayData[i];
            let prev = arrayData[i - 1];
            rocTotal["diterima"] += current["Diterima"] - prev["Diterima"];
            rocTotal["ditolak"] += current["Ditolak"] - prev["Ditolak"];
            rocTotal["didenda"] += current["Didenda"] - prev["Didenda"];
          }

          obj[key]["diterima"] = rocTotal["diterima"] / arrayData.length;
          obj[key]["ditolak"] = rocTotal["ditolak"] / arrayData.length;
          obj[key]["didenda"] = rocTotal["didenda"] / arrayData.length;

          return obj;
        },
        {},
      );

      const avgClassificationVendorData = Object.entries(
        avgClassificationVendor,
      ).reduce((o, [key, value]) => {
        o[key] = addRankingsWithTieHandling(
          Object.entries(value)
            .map(([k, v]) => {
              return {
                vendor_name: k,
                supply: countPercentage(v.count, totalInspection),
                percent: v.percent / v.count,
                total: v.total,
              };
            })
            .sort((a, b) => b.supply - a.supply),
          key,
        );

        return o;
      }, {});

      const avgAcceptedVendorHistoryDailyData = Object.entries(
        avgAcceptedVendorHistoryDaily,
      ).reduce((obj, [vendor, data]) => {
        // console.log({ data });
        obj[vendor] = Object.entries(data)
          .map(([d, dayData]) => {
            // console.log({ dayData });
            return {
              date: d,
              trucks: dayData["trucks"],
              avg_tandan: Number(dayData["avg_tandan"] / dayData["trucks"]),
              avg_accepted: dayData["avg_accepted"] / dayData["trucks"],
              avg_matang: dayData["avg_matang"] / dayData["trucks"],
              avg_lewat_matang: dayData["avg_lewat_matang"] / dayData["trucks"],
              avg_mentah: dayData["avg_mentah"] / dayData["trucks"],
              avg_janjang_kosong:
                dayData["avg_janjang_kosong"] / dayData["trucks"],
              avg_tangkai_panjang:
                dayData["avg_tangkai_panjang"] / dayData["trucks"],
              avg_buah_kecil: dayData["avg_buah_kecil"] / dayData["trucks"],
            };
          })
          .filter((e) => Boolean(e.avg_accepted));
        return obj;
      }, {});

      const avgClassificationTrenData = Object.entries(
        avgClassificationTren,
      ).reduce((obj, [c, data]) => {
        obj[c] = Object.entries(data).map(([d, value]) => {
          const sum = value.reduce((n, c) => n + (c || 0), 0);
          return {
            date: d,
            percent: sum / value.length,
          };
        });

        return obj;
      }, {});

      // console.log('Hai hai');

      return res.status(200).json(
        createResponseSuccess(200, "Success", "Success get all data", {
          inspections: inspections.map((i) => {
            delete i["score"];

            return i;
          }),
          monitoring: {
            total_tandan: grandTotalTandan,
            total_grading: totalInspection,
            total_passed: grandTotalAccepted,
            total_rejected: grandTotalRejected,
            total_fined: grandTotalFined,
            total_multiple: grandTotalMultiple,
            percent_rejected:
              countPercentage(grandTotalRejected, grandTotalTandan) || 0,
            percent_passed:
              countPercentage(grandTotalAccepted, grandTotalTandan) || 0,
            percent_fined:
              countPercentage(grandTotalFined, grandTotalTandan) || 0,
            percent_multiple:
              countPercentage(grandTotalMultiple, grandTotalTandan) || 0,
          },
          average_grading: averageGrading,
          average_grading_trend: avgClassificationTrenData,
          average_grading_vendor: avgClassificationVendorData,
          average_vendor_accepted: sortObjectByValues(averageVendorAccepted),
          average_vendor_accepted_trucks_history: avgAcceptedVendorHistory,
          average_vendor_accepted_daily: avgAcceptedVendorHistoryDailyData,
          charts_data: {
            summary_performance:
              generateChartArrayFromObject(summaryPerformance),
            grading_trucks: generateChartArrayFromObjectTrucks(gradingTrucks),
            fruit_accepted: generateChartArrayFromObject(fruitAccepted, true),
            fruit_rejected: generateChartArrayFromObject(fruitRejected, true),
            fruit_tangkai_panjang: generateChartArrayFromObject(fruitTp, true),
            lowest_vendor: lowestRanked,
            highest_vendor: highestRanked,
            vendor: processVendorData(averageVendorData),
          },
          rocs: rocSummaryPerformance,
        }),
      );
    } catch (err) {
      console.log({ err });
      next(err);
    }
  }
  static async downloadOperationalPerformance(req, res, next) {
    try {
      const user = req.user;
      const { date_from, date_to, factory } = req.query;

      if (!date_from || !date_to) {
        return res.status(400).json({
          code: 400,
          success: false,
          message: "date_from and date_to must be filled.",
        });
      }

      const UserModel = require("../../models/user");
      const userData = await UserModel.findById(user._id).lean();

      // We want to query from date_from at 06:00 to date_to at 03:59 the next day.
      const startDate = dayjs(date_from).startOf("day").add(6, "hour"); // 06:00 AM on date_from
      const endDate = dayjs(date_to).startOf("day").add(1, "day").add(3, "hour").add(59, "minute").add(59, "second").add(999, "millisecond"); // 03:59:59.999 AM the next day after date_to

      let query = {
        company: user.company,
        date: {
          $gte: startDate.toDate(),
          $lte: endDate.toDate(),
        },
      };

      if (factory) {
        const hasAccess = userData?.access_factory?.some(
          (f) => f.toString() === factory,
        );
        if (hasAccess) {
          query.factory = factory;
        } else {
          query.factory = null; // force empty result if unauthorized
        }
      } else {
        if (userData?.access_factory?.length > 0) {
          query.factory = { $in: userData.access_factory };
        }
      }

      const inspections = await InspectionDataModel.find(query).sort({ date: 1 }).lean();

      // Group by "Day" (06:00 to 03:59 next day)
      // If we subtract 6 hours from `date`, all times from 06:00 to 03:59 map to the same calendar day string.
      const groupedData = {};

      const daysId = {
        Sunday: "Minggu",
        Monday: "Senin",
        Tuesday: "Selasa",
        Wednesday: "Rabu",
        Thursday: "Kamis",
        Friday: "Jumat",
        Saturday: "Sabtu"
      };

      inspections.forEach((item) => {
        const dateObj = item.date;
        if (!dateObj) return;

        // Subtract 6 hours so 06:00-23:59 and 00:00-03:59 fall on the same day string
        const shiftedDate = dayjs(dateObj).subtract(6, "hour");
        const dayKey = shiftedDate.format("YYYY-MM-DD");

        if (!groupedData[dayKey]) {
          const dayNameEn = shiftedDate.format("dddd");
          groupedData[dayKey] = {
            hari: daysId[dayNameEn] || dayNameEn,
            tanggal: shiftedDate.format("DD/MM/YYYY"),
            trucks: 0,
            minDate: dayjs(dateObj),
            maxDate: dayjs(dateObj)
          };
        }

        groupedData[dayKey].trucks += 1;
        
        const currentItemDate = dayjs(dateObj);
        if (currentItemDate.isBefore(groupedData[dayKey].minDate)) {
          groupedData[dayKey].minDate = currentItemDate;
        }
        if (currentItemDate.isAfter(groupedData[dayKey].maxDate)) {
          groupedData[dayKey].maxDate = currentItemDate;
        }
      });

      // Prepare Excel rows
      const excelRows = [
        ["Hari", "Tanggal", "Jumlah truk", "Mulai Grading", "Selesai Grading", "Durasi Grading"]
      ];

      // Sort keys chronologically
      const sortedDays = Object.keys(groupedData).sort((a, b) => dayjs(a).valueOf() - dayjs(b).valueOf());

      sortedDays.forEach((dayKey) => {
        const group = groupedData[dayKey];
        const minD = group.minDate;
        const maxD = group.maxDate;

        const durasiMenit = maxD.diff(minD, "minute");
        const hours = Math.floor(durasiMenit / 60);
        const minutes = durasiMenit % 60;
        const durasiFormat = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

        excelRows.push([
          group.hari,
          group.tanggal,
          group.trucks,
          minD.format("HH:mm"),
          maxD.format("HH:mm"),
          durasiFormat
        ]);
      });

      const workbook = XLSX.utils.book_new();
      const wsRaw = XLSX.utils.aoa_to_sheet(excelRows);
      
      // Auto-size columns slightly
      wsRaw['!cols'] = [
        { wch: 15 }, // Hari
        { wch: 15 }, // Tanggal
        { wch: 15 }, // Jumlah Truk
        { wch: 15 }, // Mulai
        { wch: 15 }, // Selesai
        { wch: 15 }, // Durasi
      ];

      XLSX.utils.book_append_sheet(workbook, wsRaw, "Performance Durasi");

      const excelBuffer = XLSX.write(workbook, {
        bookType: "xlsx",
        type: "buffer",
      });

      res.setHeader(
        "Content-Disposition",
        `attachment; filename=Performance-Durasi-Operasional-${new Date().toISOString()}.xlsx`,
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );

      return res.send(excelBuffer);

    } catch (err) {
      console.log({ err });
      next(err);
    }
  }
}

module.exports = DashboardV4Controller;
