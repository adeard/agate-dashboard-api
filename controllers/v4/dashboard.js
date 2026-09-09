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
const CompanyModel = require("../../models/company");

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
        (item.grading_result["accepted_summary"]["JANJANG KOSONG"][
          "BUAH KECIL DIBAWAH 2KG"
        ] || 0) -
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

    const { totalTangkaiPanjangDitolak } = Object.keys(
      item.grading_result["rejected_summary"] || {},
    ).reduce(
      (obj, key) => {
        const data = item["grading_result"]["rejected_summary"]?.[key] || {};

        obj["totalTangkaiPanjangDitolak"] += data["TANGKAI PANJANG"] || 0;

        return obj;
      },
      { totalTangkaiPanjangDitolak: 0 },
    );

    const { totalRusakDimakanTikusDidenda } = Object.keys(
      item.grading_result["accepted_summary"] || {},
    ).reduce(
      (obj, key) => {
        const data = item["grading_result"]["accepted_summary"]?.[key] || {};

        obj["totalRusakDimakanTikusDidenda"] +=
          data["RUSAK DIMAKAN TIKUS"] || 0;

        return obj;
      },
      { totalRusakDimakanTikusDidenda: 0 },
    );

    const totalTangkaiPanjangDidenda = totalTangkaiPanjang;
    const totalRusakDimakanTikusDitolak = totalRusakDimakanTikus;

    const percentMatang = countPercentage(totalMatang, totalTandan);
    const percentLewatMatang = countPercentage(totalLewatMatang, totalTandan);
    const percentTangkaiPanjang = countPercentage(
      totalTangkaiPanjang,
      totalAcceptedModified,
    );
    const percentTangkaiPanjangDidenda = percentTangkaiPanjang;
    const percentTangkaiPanjangDitolak = countPercentage(
      totalTangkaiPanjangDitolak,
      totalTandan,
    );
    const percentMentah = countPercentage(totalMentah, totalTandan);
    const percentJangkos = countPercentage(totalJanjangKosong, totalTandan);
    const percentBuahKecil3 = countPercentage(totalBuahKecil3, totalTandan);
    const percentBuahKecil5 = countPercentage(totalBuahKecil5, totalTandan);
    const percentBuahKecil2 = countPercentage(totalBuahKecil2, totalTandan);
    const percentBuahKecil = countPercentage(
      totalBuahKecil3 + totalBuahKecil5 + totalBuahKecil2,
      totalTandan,
    );
    const percentRusakDimakanTikus = countPercentage(
      totalRusakDimakanTikus,
      totalTandan,
    );
    const percentRusakDimakanTikusDidenda = countPercentage(
      totalRusakDimakanTikusDidenda,
      totalTandan,
    );
    const percentRusakDimakanTikusDitolak = percentRusakDimakanTikus;

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

      totalTangkaiPanjangDidenda,
      totalTangkaiPanjangDitolak,
      percentTangkaiPanjangDidenda,
      percentTangkaiPanjangDitolak,
      totalRusakDimakanTikusDidenda,
      totalRusakDimakanTikusDitolak,
      percentRusakDimakanTikusDidenda,
      percentRusakDimakanTikusDitolak,
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
    const totalFined = inspections.reduce((curr, acc) => {
      let tf = Number(acc.grading_result?.total_fined || 0);
      if (!tf && acc.grading_result?.fined_summary) {
        tf = Object.keys(acc.grading_result.fined_summary).reduce(
          (n, k) =>
            n + Number(acc.grading_result.fined_summary[k]?.["TOTAL"] || 0),
          0,
        );
      }
      if (!tf) {
        const rootFinedFields = [
          acc.unripe_fined_in_kg,
          acc.half_ripe_fined_in_kg,
          acc.over_ripe_fined_in_kg,
          acc.long_stash_e_fined_in_kg,
          acc.pest_fined_in_kg,
          acc.pest_e_fined_in_kg,
          acc.pest_m_fined_in_kg,
          acc.long_stash_fined_in_kg,
          acc.long_stash_m_fined_in_kg,
          acc.small_fruit_fined_in_kg,
          acc.small_fruit_5_fined_in_kg,
        ];
        if (rootFinedFields.some((v) => Number(v) > 0)) {
          tf = rootFinedFields.reduce(
            (sum, v) => sum + (Number(v) > 0 ? Number(v) : 0),
            0,
          );
        }
      }
      return tf + curr;
    }, 0);
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
    let totalFined = Number(item.grading_result["total_fined"] || 0);
    if (!totalFined && item.grading_result["fined_summary"]) {
      totalFined = Object.keys(item.grading_result["fined_summary"]).reduce(
        (n, k) =>
          n + Number(item.grading_result["fined_summary"][k]?.["TOTAL"] || 0),
        0,
      );
    }
    if (!totalFined) {
      const rootFinedFields = [
        item.unripe_fined_in_kg,
        item.half_ripe_fined_in_kg,
        item.over_ripe_fined_in_kg,
        item.long_stash_e_fined_in_kg,
        item.pest_fined_in_kg,
        item.pest_e_fined_in_kg,
        item.pest_m_fined_in_kg,
        item.long_stash_fined_in_kg,
        item.long_stash_m_fined_in_kg,
        item.small_fruit_fined_in_kg,
        item.small_fruit_5_fined_in_kg,
      ];
      if (rootFinedFields.some((v) => Number(v) > 0)) {
        totalFined = rootFinedFields.reduce(
          (sum, v) => sum + (Number(v) > 0 ? Number(v) : 0),
          0,
        );
      }
    }

    const percentAcceptedModified = countPercentage(
      totalAcceptedModified,
      totalTandan,
    );

    const percentAccepted = countPercentage(
      item["grading_result"]["total_accepted"],
      item["grading_result"]["total_tandan"],
    );

    const totalMatangRaw =
      item.grading_result["accepted_summary"]?.["MATANG"]?.["TOTAL"] || 0;
    const totalLewatMatangRaw =
      item.grading_result["accepted_summary"]?.["LEWAT MATANG"]?.["TOTAL"] || 0;
    const totalMentahDiterimaRaw =
      item.grading_result["accepted_summary"]?.["MENTAH"]?.["TOTAL"] || 0;
    const totalJanjangKosongDiterimaRaw =
      item.grading_result["accepted_summary"]?.["JANJANG KOSONG"]?.["TOTAL"] ||
      0;

    const totalMentahRaw =
      item.grading_result["rejected_summary"]?.["MENTAH"]?.["TOTAL"] || 0;
    const totalJanjangKosongRaw =
      item.grading_result["rejected_summary"]?.["JANJANG KOSONG"]?.["TOTAL"] ||
      0;
    const totalLewatMatangDitolakRaw =
      item.grading_result["rejected_summary"]?.["LEWAT MATANG"]?.["TOTAL"] || 0;
    const totalMatangDitolakRaw =
      item.grading_result["rejected_summary"]?.["MATANG"]?.["TOTAL"] || 0;

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
        (item.grading_result["accepted_summary"]["JANJANG KOSONG"][
          "BUAH KECIL DIBAWAH 2KG"
        ] || 0) -
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

    const {
      totalBuahKecil3,
      totalBuahKecil5,
      totalBuahKecil2,
      totalPartenokarpiDitolak,
      totalBuahBesarDitolak,
    } = Object.keys(item.grading_result["rejected_summary"] || {}).reduce(
      (obj, key) => {
        const data = item["grading_result"]["rejected_summary"]?.[key] || {};

        obj["totalBuahKecil3"] += data["BUAH KECIL DIBAWAH 3KG"] || 0;
        obj["totalBuahKecil5"] += data["BUAH KECIL DIBAWAH 5KG"] || 0;
        obj["totalBuahKecil2"] += data["BUAH KECIL DIBAWAH 2KG"] || 0;
        obj["totalPartenokarpiDitolak"] +=
          (data["PARTENOKARPI"] || 0) + (data["PATERNOKARPI"] || 0);
        obj["totalBuahBesarDitolak"] += data["BUAH BESAR"] || 0;

        return obj;
      },
      {
        totalBuahKecil3: 0,
        totalBuahKecil5: 0,
        totalBuahKecil2: 0,
        totalPartenokarpiDitolak: 0,
        totalBuahBesarDitolak: 0,
      },
    );

    const {
      totalBuahKecil5Diterima,
      totalBuahKecil3Diterima,
      totalBuahKecil2Diterima,
      totalRusakDimakanTikusDiterima,
      totalPartenokarpiDiterima,
      totalBuahBesarDiterima,
      totalTangkaiPanjang,
    } = Object.keys(item.grading_result["accepted_summary"] || {}).reduce(
      (obj, key) => {
        const data = item["grading_result"]["accepted_summary"]?.[key] || {};

        obj["totalBuahKecil5Diterima"] += data["BUAH KECIL DIBAWAH 5KG"] || 0;
        obj["totalBuahKecil3Diterima"] += data["BUAH KECIL DIBAWAH 3KG"] || 0;
        obj["totalBuahKecil2Diterima"] += data["BUAH KECIL DIBAWAH 2KG"] || 0;
        obj["totalRusakDimakanTikusDiterima"] +=
          data["RUSAK DIMAKAN TIKUS"] || 0;
        obj["totalPartenokarpiDiterima"] +=
          (data["PARTENOKARPI"] || 0) + (data["PATERNOKARPI"] || 0);
        obj["totalBuahBesarDiterima"] += data["BUAH BESAR"] || 0;
        obj["totalTangkaiPanjang"] += data["TANGKAI PANJANG"] || 0;

        return obj;
      },
      {
        totalBuahKecil5Diterima: 0,
        totalBuahKecil3Diterima: 0,
        totalBuahKecil2Diterima: 0,
        totalRusakDimakanTikusDiterima: 0,
        totalPartenokarpiDiterima: 0,
        totalBuahBesarDiterima: 0,
        totalTangkaiPanjang: 0,
      },
    );

    const { totalTangkaiPanjangDitolak } = Object.keys(
      item.grading_result["rejected_summary"] || {},
    ).reduce(
      (obj, key) => {
        const data = item["grading_result"]["rejected_summary"]?.[key] || {};

        obj["totalTangkaiPanjangDitolak"] += data["TANGKAI PANJANG"] || 0;

        return obj;
      },
      { totalTangkaiPanjangDitolak: 0 },
    );

    const rawTotalRusakDimakanTikusDidenda = Object.keys(
      item.grading_result["accepted_summary"] || {},
    ).reduce((obj, key) => {
      const data = item["grading_result"]["accepted_summary"]?.[key] || {};
      return obj + (data["RUSAK DIMAKAN TIKUS"] || 0);
    }, 0);

    const hasFinedSummaryTP =
      item.grading_result["fined_summary"]?.["TANGKAI PANJANG"] !== undefined;
    const hasFinedSummaryPest =
      item.grading_result["fined_summary"]?.["RUSAK DIMAKAN TIKUS"] !==
      undefined;

    const hasFinedKgTP = Boolean(
      (item.long_stash_fined_in_kg &&
        Number(item.long_stash_fined_in_kg) > 0) ||
      (item.long_stash_e_fined_in_kg &&
        Number(item.long_stash_e_fined_in_kg) > 0) ||
      (item.long_stash_m_fined_in_kg &&
        Number(item.long_stash_m_fined_in_kg) > 0),
    );

    const hasFinedKgPest = Boolean(
      (item.pest_fined_in_kg && Number(item.pest_fined_in_kg) > 0) ||
      (item.pest_e_fined_in_kg && Number(item.pest_e_fined_in_kg) > 0) ||
      (item.pest_m_fined_in_kg && Number(item.pest_m_fined_in_kg) > 0),
    );

    const totalTangkaiPanjangDidenda = hasFinedSummaryTP
      ? Number(
          item.grading_result["fined_summary"]["TANGKAI PANJANG"]["TOTAL"] || 0,
        )
      : hasFinedKgTP || totalFined > 0
        ? totalTangkaiPanjang
        : 0;

    const totalRusakDimakanTikusDidenda = hasFinedSummaryPest
      ? Number(
          item.grading_result["fined_summary"]["RUSAK DIMAKAN TIKUS"][
            "TOTAL"
          ] || 0,
        )
      : hasFinedKgPest || totalFined > 0
        ? rawTotalRusakDimakanTikusDidenda
        : 0;

    const totalRusakDimakanTikusDitolak = totalRusakDimakanTikus;

    const percentMatang = countPercentage(totalMatang, totalTandan);
    const percentLewatMatang = countPercentage(totalLewatMatang, totalTandan);
    const percentTangkaiPanjang = countPercentage(
      totalTangkaiPanjang,
      totalAcceptedModified,
    );
    const percentTangkaiPanjangDidenda = percentTangkaiPanjang;
    const percentTangkaiPanjangDitolak = countPercentage(
      totalTangkaiPanjangDitolak,
      totalTandan,
    );
    const percentMentah = countPercentage(totalMentah, totalTandan);
    const percentJangkos = countPercentage(totalJanjangKosong, totalTandan);
    const percentBuahKecil3 = countPercentage(totalBuahKecil3, totalTandan);
    const percentBuahKecil5 = countPercentage(totalBuahKecil5, totalTandan);
    const percentBuahKecil2 = countPercentage(totalBuahKecil2, totalTandan);
    const percentBuahKecil = countPercentage(
      totalBuahKecil3 + totalBuahKecil5 + totalBuahKecil2,
      totalTandan,
    );

    const percentRusakDimakanTikus = countPercentage(
      totalRusakDimakanTikus,
      totalTandan,
    );
    const percentRusakDimakanTikusDidenda = countPercentage(
      totalRusakDimakanTikusDidenda,
      totalTandan,
    );
    const percentRusakDimakanTikusDitolak = percentRusakDimakanTikus;

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
    const percentBuahKecil3Diterima = countPercentage(
      totalBuahKecil3Diterima,
      totalTandan,
    );
    const percentBuahKecil2Diterima = countPercentage(
      totalBuahKecil2Diterima,
      totalTandan,
    );
    const percentRusakDimakanTikusDiterima = countPercentage(
      totalRusakDimakanTikusDiterima,
      totalTandan,
    );
    const percentPartenokarpiDiterima = countPercentage(
      totalPartenokarpiDiterima,
      totalTandan,
    );
    const percentPartenokarpiDitolak = countPercentage(
      totalPartenokarpiDitolak,
      totalTandan,
    );

    // console.log({
    //   percentMLM: percentMatang + percentLewatMatang,
    //   percentAccepted,
    // });

    totalAcceptedModified =
      totalMatangRaw +
      totalLewatMatangRaw +
      totalMentahDiterimaRaw +
      totalJanjangKosongDiterimaRaw;

    totalRejectedModified =
      totalMentahRaw +
      totalJanjangKosongRaw +
      totalLewatMatangDitolakRaw +
      totalMatangDitolakRaw;

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

      totalMatangRaw,
      totalLewatMatangRaw,
      totalMentahDiterimaRaw,
      totalJanjangKosongDiterimaRaw,
      totalMentahRaw,
      totalJanjangKosongRaw,
      totalLewatMatangDitolakRaw,
      totalMatangDitolakRaw,
      totalBuahBesarDiterima,
      totalBuahBesarDitolak,

      totalMentahDiterima,
      totalJanjangKosongDiterima,
      totalBuahKecil5Diterima,
      totalBuahKecil3Diterima,
      totalBuahKecil2Diterima,
      totalRusakDimakanTikusDiterima,
      totalPartenokarpiDiterima,
      totalPartenokarpiDitolak,

      percentMentahDiterima,
      percentJanjangKosongDiterima,
      percentBuahKecil5Diterima,
      percentBuahKecil3Diterima,
      percentBuahKecil2Diterima,
      percentRusakDimakanTikusDiterima,
      percentPartenokarpiDiterima,
      percentPartenokarpiDitolak,

      totalMatangDitolak,
      totalLewatMatangDitolak,
      percentMatangDitolak,
      percentLewatMatangDitolak,
      totalRusakDimakanTikus,
      percentRusakDimakanTikus,

      totalTangkaiPanjangDidenda,
      totalTangkaiPanjangDitolak,
      percentTangkaiPanjangDidenda,
      percentTangkaiPanjangDitolak,
      totalRusakDimakanTikusDidenda,
      totalRusakDimakanTikusDitolak,
      percentRusakDimakanTikusDidenda,
      percentRusakDimakanTikusDitolak,
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
          duration: inspection.duration,
          duration_gap: inspection.duration_gap,
          percent_accepted: inspection.percent_accepted,
          percent_rejected: inspection.percent_rejected,
          percent_fined: inspection.percent_fined,
          mesin: inspection.mesin,
          delivery_number: inspection.delivery_number,
          total_multiple: inspection.total_multiple,
          percent_multiple: inspection.percent_multiple,
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
    avg_buah_kecil_2: false,
    avg_tangkai_panjang: false,
    avg_rusak_dimakan_tikus: false,
    avg_accepted: true,
    avg_rejected: false,
    avg_fined: false,
    percent_rejected: false,
    percent_fined: false,
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

      console.log({ user });

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
        if (
          isLngm &&
          (vTypeLower === "gapoktan" ||
            vTypeLower === "stka" ||
            vTypeLower === "luar")
        ) {
          q["vendor_name"] = { $regex: new RegExp(vendor_type, "i") };
        } else if (vTypeLower !== "all") {
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

      inspections = inspections.map((item, index) => {
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
        avgClassification["buah_kecil_2"].push(percentBuahKecil2);
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

        if (!avgClassificationTren["buah_kecil_2"][day]) {
          avgClassificationTren["buah_kecil_2"][day] = [];
        }
        avgClassificationTren["buah_kecil_2"][day].push(percentBuahKecil2);

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

        if (!avgClassificationVendor["buah_kecil_2"][vendorName]) {
          avgClassificationVendor["buah_kecil_2"][vendorName] = {
            count: 0,
            percent: 0,
          };
        }
        avgClassificationVendor["buah_kecil_2"][vendorName]["count"] += 1;
        avgClassificationVendor["buah_kecil_2"][vendorName]["percent"] +=
          percentBuahKecil2;

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
            "Buah <2kg",
            "Rusak Dimakan Tikus",
          ],
          [
            percentMentah,
            // percentLewatMatang,
            percentJangkos,
            percentBuahKecil3,
            percentBuahKecil5,
            percentBuahKecil2,
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
            "Buah <2kg",
            "Rusak Dimakan Tikus",
          ],
          [
            percentMentah,
            // percentLewatMatang,
            percentJangkos,
            percentBuahKecil3,
            percentBuahKecil5,
            percentBuahKecil2,
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
            "Buah <2kg",
            "Rusak Dimakan Tikus",
          ],
          [
            percentMentah,
            // percentLewatMatang,
            percentJangkos,
            percentBuahKecil3,
            percentBuahKecil5,
            percentBuahKecil2,
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
              totalBuahKecil2),
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
            rejected: 0,
            fined: 0,
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
        averageVendor[vendorName]["rejected"] += countPercentage(
          totalRejectedModified,
          totalTandanItem,
        );
        averageVendor[vendorName]["fined"] += countPercentage(
          totalFinedItem,
          totalTandanItem,
        );
        averageVendor[vendorName]["matang"] += percentMatang;
        averageVendor[vendorName]["lewat_matang"] += percentLewatMatang;
        averageVendor[vendorName]["tangkai_panjang"] += percentTangkaiPanjang;
        averageVendor[vendorName]["mentah"] += percentMentah;
        averageVendor[vendorName]["janjang_kosong"] += percentJangkos;
        averageVendor[vendorName]["buah_kecil"] += percentBuahKecil;
        averageVendor[vendorName]["rusak_dimakan_tikus"] +=
          percentRusakDimakanTikus;

        const duration =
          item.finish_date && item.date
            ? Math.max(
                0,
                dayjs(item.finish_date).diff(dayjs(item.date), "minute"),
              )
            : 0;
        let prevTruck = null;
        for (let i = index + 1; i < inspections.length; i++) {
          if (
            inspections[i].machine !== undefined &&
            item.machine !== undefined &&
            String(inspections[i].machine) === String(item.machine)
          ) {
            prevTruck = inspections[i];
            break;
          }
        }
        const durationGap =
          prevTruck?.finish_date && item.date
            ? dayjs(item.date).diff(dayjs(prevTruck.finish_date), "minute")
            : 0;
        const duration_gap = Math.max(0, durationGap);

        const payload = {
          _id: item._id,
          score: item.score,
          percent_accepted: percentAcceptedModified,
          percent_rejected: countPercentage(
            totalRejectedModified,
            totalTandanItem,
          ),
          percent_fined: countPercentage(
            totalFinedItem,
            totalTandanItem,
          ),
          percent_matang: percentMatang,
          percent_lewat_matang: percentLewatMatang,
          percent_mentah_diterima: percentMentahDiterima,
          percent_janjang_kosong_diterima: percentJanjangKosongDiterima,
          percent_mentah: percentMentah,
          percent_janjang_kosong: percentJangkos,
          percent_buah_kecil: percentBuahKecil3,
          percent_buah_kecil_5: percentBuahKecil5,
          percent_buah_kecil_2: percentBuahKecil2,
          percent_tangkai_panjang: percentTangkaiPanjang,
          percent_rusak_dimakan_tikus: percentRusakDimakanTikus,
          total_tandan: item["grading_result"]["total_tandan"],
          vendor_name: vendorName,
          vehicle_number: item["vehicle_number"],
          date: item.date,
          finish_date: item.finish_date,
          duration,
          duration_gap,
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
            avg_rejected: 0,
            avg_fined: 0,
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
        avgAcceptedVendorHistoryDaily[vendorName][day]["avg_rejected"] +=
          countPercentage(totalRejectedModified, totalTandanItem);
        avgAcceptedVendorHistoryDaily[vendorName][day]["avg_fined"] +=
          countPercentage(totalFinedItem, totalTandanItem);
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
            avg_rejected: (value.rejected / value.count).toLocaleString("en", {
              maximumFractionDigits: 2,
            }),
            avg_fined: (value.fined / value.count).toLocaleString("en", {
              maximumFractionDigits: 2,
            }),
            percent_rejected: (value.rejected / value.count).toLocaleString(
              "en",
              {
                maximumFractionDigits: 2,
              },
            ),
            percent_fined: (value.fined / value.count).toLocaleString("en", {
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
              avg_rejected: dayData["avg_rejected"] / dayData["trucks"],
              avg_fined: dayData["avg_fined"] / dayData["trucks"],
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

    const {
      targetDate,
      targetEnd,
      date_from,
      date_to,
      factory,
      company,
      vendor_type,
    } = req.query;

    const fromDate = date_from || targetDate;
    const toDate = date_to || targetEnd;

    if (!fromDate || !toDate) {
      return res.status(400).json({
        code: 500,
        success: false,
        message: "Target End dan Target Date must be filled.",
      });
    }

    let ids = req.query.ids;
    ids = Array.isArray(ids)
      ? ids
      : typeof ids === "string"
        ? ids.split(",")
        : [];
    const uniqIds = [...new Set(ids.map((s) => s.trim()).filter(Boolean))];

    // Parse the target date using dayjs (shift from 06:00 to 05:59:59 next day)
    const startDate = dayjs(fromDate)
      .hour(6)
      .minute(0)
      .second(0)
      .millisecond(0);
    const endDate = dayjs(toDate)
      .add(1, "day")
      .hour(5)
      .minute(59)
      .second(59)
      .millisecond(999);

    let query = {
      date: {
        $gte: startDate.toDate(),
        $lte: endDate.toDate(),
      },
    };

    if (uniqIds.length) {
      query.vendor = { $in: uniqIds };
    }

    if (company) {
      query.company = company;
    }

    if (factory) {
      query.factory = factory;
    }

    const companyId = company || req.user?.company;
    const factoryObj = factory
      ? await FactoryModel.findById(factory).lean()
      : null;
    const companyObj = companyId
      ? await CompanyModel.findById(companyId).lean()
      : null;
    const isLngm =
      factoryObj && ["LNGM"].some((loc) => factoryObj.name.includes(loc));
    const isKynm =
      (factoryObj && ["KYNM"].some((loc) => factoryObj.name.includes(loc))) ||
      (companyObj &&
        ["SIMP"].some(
          (c) =>
            companyObj.initial?.includes(c) || companyObj.name?.includes(c),
        ));

    if (vendor_type) {
      const vTypeLower = vendor_type.toLowerCase();
      if (
        isLngm &&
        (vTypeLower === "gapoktan" ||
          vTypeLower === "stka" ||
          vTypeLower === "luar")
      ) {
        query.vendor_name = { $regex: new RegExp(vendor_type, "i") };
      } else if (vTypeLower !== "all") {
        query.vendor_type = vendor_type;
      }
    }

    // Fetch data from MongoDB for the specific date range
    let data = await InspectionDataModel.find(query).sort({ date: 1 }).lean();

    if (data.length === 0) {
      console.log("No data found for the specified date range.");
      return;
    }

    const limit = await getCompanyLimitTandan({ company: companyId });

    data = data.filter(
      (e) =>
        e.grading_result?.total_tandan > limit &&
        e.vehicle_number !== "BH 1240 ALB" &&
        e.vendor_name !== "Vendor 2 Plasma" &&
        e.vendor_name !== "Vendor B" &&
        e.vehicle_number !== "BH 4321 ALB",
    );

    const hasMultipleDates =
      fromDate &&
      toDate &&
      dayjs(fromDate).format("YYYY-MM-DD") !==
        dayjs(toDate).format("YYYY-MM-DD");

    const periodString = `${dayjs(fromDate).format("MMMM YYYY")} - ${dayjs(
      toDate,
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
        "Diterima",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "Ditolak",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
      ],
      [
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "Mentah",
        "Matang",
        "Lewat Matang",
        "Janjang Kosong",
        "Buah Kecil <3kg",
        "Buah Kecil <5kg",
        "Buah Kecil <2kg",
        "Tangkai Panjang",
        "Rusak Dimakan Tikus",
        "Buah Besar",
        "Partenokarpi",
        "Mentah",
        "Matang",
        "Lewat Matang",
        "Janjang Kosong",
        "Buah Kecil <3kg",
        "Buah Kecil <5kg",
        "Buah Kecil <2kg",
        "Tangkai Panjang",
        "Rusak Dimakan Tikus",
        "Buah Besar",
        "Partenokarpi",
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
      // Adjust date for shift-based day (06:00 to 05:59 next day) only when filtering multiple dates
      const dateForGrouping = hasMultipleDates
        ? dayjs(item["date"]).subtract(6, "hour").toDate()
        : item["date"];
      const date = dayjs(dateForGrouping).format("DD/MM/YYYY");
      const month = dayjs(dateForGrouping).format("MMMM YYYY");
      const hour = dayjs(item.date).hour();
      const minute = dayjs(item.date).minute();
      const week = getWeekNumber(dateForGrouping);
      const day = dayjs(dateForGrouping).format("dddd");

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
        totalMultiple,
        percentRusakDimakanTikus,
        totalRusakDimakanTikus,
        totalBuahKecil2,
        percentBuahKecil2,
        totalTangkaiPanjangDidenda,
        totalTangkaiPanjangDitolak,
        percentTangkaiPanjangDidenda,
        percentTangkaiPanjangDitolak,
        totalRusakDimakanTikusDidenda,
        totalRusakDimakanTikusDitolak,
        percentRusakDimakanTikusDidenda,
        percentRusakDimakanTikusDitolak,
        totalMatangRaw,
        totalLewatMatangRaw,
        totalMentahDiterimaRaw,
        totalJanjangKosongDiterimaRaw,
        totalMentahRaw,
        totalJanjangKosongRaw,
        totalLewatMatangDitolakRaw,
        totalMatangDitolakRaw,
        totalBuahBesarDiterima,
        totalBuahBesarDitolak,
        totalBuahKecil5Diterima,
        totalBuahKecil3Diterima,
        totalBuahKecil2Diterima,
        totalRusakDimakanTikusDiterima,
        totalPartenokarpiDiterima,
        totalPartenokarpiDitolak,
      } = utilsInspection.getTotalAndPercentClassificationNew(item, isLngm);

      totalAllTandan += totalTandanItem;

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
        avgWeek[week] = {
          total_tandan: 0,
          total_accepted: 0,
          total_rejected: 0,
          total_fined: 0,
        };
      }
      avgWeek[week].total_tandan += totalTandanItem;
      avgWeek[week].total_accepted += totalAcceptedModified;
      avgWeek[week].total_rejected += totalRejectedModified;
      avgWeek[week].total_fined += totalFinedItem;

      if (!avgWeekDemography[week]) {
        avgWeekDemography[week] = {
          total_tandan: 0,
          total_accepted: 0,
          total_rejected: 0,
          // Diterima
          mentah_diterima: 0,
          matang: 0,
          lewat_matang: 0,
          janjang_kosong_diterima: 0,
          buah_kecil_3_diterima: 0,
          buah_kecil_5_diterima: 0,
          buah_kecil_2_diterima: 0,
          tangkai_panjang: 0,
          rusak_dimakan_tikus_diterima: 0,
          buah_besar_diterima: 0,
          partenokarpi_diterima: 0,
          // Ditolak
          mentah: 0,
          matang_ditolak: 0,
          lewat_matang_ditolak: 0,
          janjang_kosong: 0,
          buah_kecil_3: 0,
          buah_kecil_5: 0,
          buah_kecil_2: 0,
          tangkai_panjang_ditolak: 0,
          rusak_dimakan_tikus: 0,
          buah_besar_ditolak: 0,
          partenokarpi_ditolak: 0,
        };
      }
      avgWeekDemography[week].total_tandan += totalTandanItem;
      avgWeekDemography[week].total_accepted += totalAcceptedModified;
      avgWeekDemography[week].total_rejected += totalRejectedModified;
      // Diterima
      avgWeekDemography[week].mentah_diterima += totalMentahDiterimaRaw || 0;
      avgWeekDemography[week].matang += totalMatangRaw || 0;
      avgWeekDemography[week].lewat_matang += totalLewatMatangRaw || 0;
      avgWeekDemography[week].janjang_kosong_diterima +=
        totalJanjangKosongDiterimaRaw || 0;
      avgWeekDemography[week].buah_kecil_3_diterima +=
        totalBuahKecil3Diterima || 0;
      avgWeekDemography[week].buah_kecil_5_diterima +=
        totalBuahKecil5Diterima || 0;
      avgWeekDemography[week].buah_kecil_2_diterima +=
        totalBuahKecil2Diterima || 0;
      avgWeekDemography[week].tangkai_panjang += totalTangkaiPanjang || 0;
      avgWeekDemography[week].rusak_dimakan_tikus_diterima +=
        totalRusakDimakanTikusDiterima || 0;
      avgWeekDemography[week].buah_besar_diterima +=
        totalBuahBesarDiterima || 0;
      avgWeekDemography[week].partenokarpi_diterima +=
        totalPartenokarpiDiterima || 0;
      // Ditolak
      avgWeekDemography[week].mentah += totalMentahRaw || 0;
      avgWeekDemography[week].matang_ditolak += totalMatangDitolakRaw || 0;
      avgWeekDemography[week].lewat_matang_ditolak +=
        totalLewatMatangDitolakRaw || 0;
      avgWeekDemography[week].janjang_kosong += totalJanjangKosongRaw || 0;
      avgWeekDemography[week].buah_kecil_3 += totalBuahKecil3 || 0;
      avgWeekDemography[week].buah_kecil_5 += totalBuahKecil5 || 0;
      avgWeekDemography[week].buah_kecil_2 += totalBuahKecil2 || 0;
      avgWeekDemography[week].tangkai_panjang_ditolak +=
        totalTangkaiPanjangDitolak || 0;
      avgWeekDemography[week].rusak_dimakan_tikus +=
        totalRusakDimakanTikusDitolak || totalRusakDimakanTikus || 0;
      avgWeekDemography[week].buah_besar_ditolak += totalBuahBesarDitolak || 0;
      avgWeekDemography[week].partenokarpi_ditolak +=
        totalPartenokarpiDitolak || 0;

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
          // AVG Diterima
          mentah_diterima: 0,
          matang: 0,
          lewat_matang: 0,
          janjang_kosong_diterima: 0,
          buah_kecil_3_diterima: 0,
          buah_kecil_5_diterima: 0,
          buah_kecil_2_diterima: 0,
          tangkai_panjang: 0,
          rusak_dimakan_tikus_diterima: 0,
          buah_besar_diterima: 0,
          partenokarpi_diterima: 0,
          // AVG Ditolak
          mentah: 0,
          matang_ditolak: 0,
          lewat_matang_ditolak: 0,
          janjang_kosong: 0,
          buah_kecil_3: 0,
          buah_kecil_5: 0,
          buah_kecil_2: 0,
          tangkai_panjang_ditolak: 0,
          rusak_dimakan_tikus: 0,
          buah_besar_ditolak: 0,
          partenokarpi_ditolak: 0,
        };
      }

      if (!avgVendor[vendorName]) {
        avgVendor[vendorName] = {
          count: 0,
          tandan: 0,
          accepted: 0,
          // AVG Diterima
          mentah_diterima: 0,
          matang: 0,
          lewat_matang: 0,
          janjang_kosong_diterima: 0,
          buah_kecil_3_diterima: 0,
          buah_kecil_5_diterima: 0,
          buah_kecil_2_diterima: 0,
          tangkai_panjang: 0,
          rusak_dimakan_tikus_diterima: 0,
          buah_besar_diterima: 0,
          partenokarpi_diterima: 0,
          // AVG Ditolak
          mentah: 0,
          matang_ditolak: 0,
          lewat_matang_ditolak: 0,
          janjang_kosong: 0,
          buah_kecil_3: 0,
          buah_kecil_5: 0,
          buah_kecil_2: 0,
          tangkai_panjang_ditolak: 0,
          rusak_dimakan_tikus: 0,
          buah_besar_ditolak: 0,
          partenokarpi_ditolak: 0,
          trucks: {},
        };
      }

      if (!avgVendor[vendorName]["trucks"][vehicleNumber]) {
        avgVendor[vendorName]["trucks"][vehicleNumber] = {
          count: 0,
          tandan: 0,
          accepted: 0,
          // AVG Diterima
          mentah_diterima: 0,
          matang: 0,
          lewat_matang: 0,
          janjang_kosong_diterima: 0,
          buah_kecil_3_diterima: 0,
          buah_kecil_5_diterima: 0,
          buah_kecil_2_diterima: 0,
          tangkai_panjang: 0,
          rusak_dimakan_tikus_diterima: 0,
          buah_besar_diterima: 0,
          partenokarpi_diterima: 0,
          // AVG Ditolak
          mentah: 0,
          matang_ditolak: 0,
          lewat_matang_ditolak: 0,
          janjang_kosong: 0,
          buah_kecil_3: 0,
          buah_kecil_5: 0,
          buah_kecil_2: 0,
          tangkai_panjang_ditolak: 0,
          rusak_dimakan_tikus: 0,
          buah_besar_ditolak: 0,
          partenokarpi_ditolak: 0,
        };
      }

      const percentAccepted = percentAcceptedModified;
      const percentRejected = countPercentage(
        totalRejectedModified,
        totalTandanItem,
      );
      const percentFined = countPercentage(
        totalFinedItem,
        totalAcceptedModified,
      );

      if (percentRejected >= 25) {
        if (hour >= 7 && hour < 18) {
          hourDataReject["before6pm"]["total_trucks"] += 1;
          hourDataReject["before6pm"]["total_tandan"] += totalTandanItem;
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
        } else if (hour >= 18 || hour < 7) {
          hourDataReject["after6pm"]["total_trucks"] += 1;
          hourDataReject["after6pm"]["total_tandan"] += totalTandanItem;
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

      const duration = getDurationMs(item["date"], item["finish_date"]);
      const durationMinute = millisecondsToMinutes(duration);

      if (totalTandanItem < 600) {
        totalJanjangObj["<600"]["total_trucks"] += 1;
        totalJanjangObj["<600"]["total_janjang"] += totalTandanItem;
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
          totalJanjangObjDuration["<600"]["total_janjang"] += totalTandanItem;
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
      } else if (totalTandanItem >= 600 && totalTandanItem <= 1000) {
        totalJanjangObj["<1000"]["total_trucks"] += 1;
        totalJanjangObj["<1000"]["total_janjang"] += totalTandanItem;
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
          totalJanjangObjDuration["<1000"]["total_janjang"] += totalTandanItem;
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
      } else if (totalTandanItem > 1000) {
        totalJanjangObj[">1000"]["total_trucks"] += 1;
        totalJanjangObj[">1000"]["total_janjang"] += totalTandanItem;
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
          totalJanjangObjDuration[">1000"]["total_janjang"] += totalTandanItem;
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

      bestAcceptedTrucks[vehicleNumber]["count"] += 1;
      bestAcceptedTrucks[vehicleNumber]["tandan"] += totalTandanItem;
      bestAcceptedTrucks[vehicleNumber]["accepted"] += percentAccepted;
      // AVG Diterima
      bestAcceptedTrucks[vehicleNumber]["mentah_diterima"] += countPercentage(
        totalMentahDiterimaRaw,
        totalTandanItem,
      );
      bestAcceptedTrucks[vehicleNumber]["matang"] += countPercentage(
        totalMatangRaw,
        totalTandanItem,
      );
      bestAcceptedTrucks[vehicleNumber]["lewat_matang"] += countPercentage(
        totalLewatMatangRaw,
        totalTandanItem,
      );
      bestAcceptedTrucks[vehicleNumber]["janjang_kosong_diterima"] +=
        countPercentage(totalJanjangKosongDiterimaRaw, totalTandanItem);
      bestAcceptedTrucks[vehicleNumber]["buah_kecil_3_diterima"] +=
        countPercentage(totalBuahKecil3Diterima, totalTandanItem);
      bestAcceptedTrucks[vehicleNumber]["buah_kecil_5_diterima"] +=
        countPercentage(totalBuahKecil5Diterima, totalTandanItem);
      bestAcceptedTrucks[vehicleNumber]["buah_kecil_2_diterima"] +=
        countPercentage(totalBuahKecil2Diterima, totalTandanItem);
      bestAcceptedTrucks[vehicleNumber]["tangkai_panjang"] += countPercentage(
        totalTangkaiPanjang,
        totalTandanItem,
      );
      bestAcceptedTrucks[vehicleNumber]["rusak_dimakan_tikus_diterima"] +=
        countPercentage(totalRusakDimakanTikusDiterima, totalTandanItem);
      bestAcceptedTrucks[vehicleNumber]["buah_besar_diterima"] +=
        countPercentage(totalBuahBesarDiterima, totalTandanItem);
      bestAcceptedTrucks[vehicleNumber]["partenokarpi_diterima"] +=
        countPercentage(totalPartenokarpiDiterima, totalTandanItem);
      // AVG Ditolak
      bestAcceptedTrucks[vehicleNumber]["mentah"] += countPercentage(
        totalMentahRaw,
        totalTandanItem,
      );
      bestAcceptedTrucks[vehicleNumber]["matang_ditolak"] += countPercentage(
        totalMatangDitolakRaw,
        totalTandanItem,
      );
      bestAcceptedTrucks[vehicleNumber]["lewat_matang_ditolak"] +=
        countPercentage(totalLewatMatangDitolakRaw, totalTandanItem);
      bestAcceptedTrucks[vehicleNumber]["janjang_kosong"] += countPercentage(
        totalJanjangKosongRaw,
        totalTandanItem,
      );
      bestAcceptedTrucks[vehicleNumber]["buah_kecil_3"] += countPercentage(
        totalBuahKecil3,
        totalTandanItem,
      );
      bestAcceptedTrucks[vehicleNumber]["buah_kecil_5"] += countPercentage(
        totalBuahKecil5,
        totalTandanItem,
      );
      bestAcceptedTrucks[vehicleNumber]["buah_kecil_2"] += countPercentage(
        totalBuahKecil2,
        totalTandanItem,
      );
      bestAcceptedTrucks[vehicleNumber]["tangkai_panjang_ditolak"] +=
        countPercentage(totalTangkaiPanjangDitolak, totalTandanItem);
      bestAcceptedTrucks[vehicleNumber]["rusak_dimakan_tikus"] +=
        countPercentage(
          totalRusakDimakanTikusDitolak || totalRusakDimakanTikus,
          totalTandanItem,
        );
      bestAcceptedTrucks[vehicleNumber]["buah_besar_ditolak"] +=
        countPercentage(totalBuahBesarDitolak, totalTandanItem);
      bestAcceptedTrucks[vehicleNumber]["partenokarpi_ditolak"] +=
        countPercentage(totalPartenokarpiDitolak, totalTandanItem);

      avgVendor[vendorName]["count"] += 1;
      avgVendor[vendorName]["tandan"] += totalTandanItem;
      avgVendor[vendorName]["accepted"] += percentAccepted;
      // AVG Diterima
      avgVendor[vendorName]["mentah_diterima"] += countPercentage(
        totalMentahDiterimaRaw,
        totalTandanItem,
      );
      avgVendor[vendorName]["matang"] += countPercentage(
        totalMatangRaw,
        totalTandanItem,
      );
      avgVendor[vendorName]["lewat_matang"] += countPercentage(
        totalLewatMatangRaw,
        totalTandanItem,
      );
      avgVendor[vendorName]["janjang_kosong_diterima"] += countPercentage(
        totalJanjangKosongDiterimaRaw,
        totalTandanItem,
      );
      avgVendor[vendorName]["buah_kecil_3_diterima"] += countPercentage(
        totalBuahKecil3Diterima,
        totalTandanItem,
      );
      avgVendor[vendorName]["buah_kecil_5_diterima"] += countPercentage(
        totalBuahKecil5Diterima,
        totalTandanItem,
      );
      avgVendor[vendorName]["buah_kecil_2_diterima"] += countPercentage(
        totalBuahKecil2Diterima,
        totalTandanItem,
      );
      avgVendor[vendorName]["tangkai_panjang"] += countPercentage(
        totalTangkaiPanjang,
        totalTandanItem,
      );
      avgVendor[vendorName]["rusak_dimakan_tikus_diterima"] += countPercentage(
        totalRusakDimakanTikusDiterima,
        totalTandanItem,
      );
      avgVendor[vendorName]["buah_besar_diterima"] += countPercentage(
        totalBuahBesarDiterima,
        totalTandanItem,
      );
      avgVendor[vendorName]["partenokarpi_diterima"] += countPercentage(
        totalPartenokarpiDiterima,
        totalTandanItem,
      );
      // AVG Ditolak
      avgVendor[vendorName]["mentah"] += countPercentage(
        totalMentahRaw,
        totalTandanItem,
      );
      avgVendor[vendorName]["matang_ditolak"] += countPercentage(
        totalMatangDitolakRaw,
        totalTandanItem,
      );
      avgVendor[vendorName]["lewat_matang_ditolak"] += countPercentage(
        totalLewatMatangDitolakRaw,
        totalTandanItem,
      );
      avgVendor[vendorName]["janjang_kosong"] += countPercentage(
        totalJanjangKosongRaw,
        totalTandanItem,
      );
      avgVendor[vendorName]["buah_kecil_3"] += countPercentage(
        totalBuahKecil3,
        totalTandanItem,
      );
      avgVendor[vendorName]["buah_kecil_5"] += countPercentage(
        totalBuahKecil5,
        totalTandanItem,
      );
      avgVendor[vendorName]["buah_kecil_2"] += countPercentage(
        totalBuahKecil2,
        totalTandanItem,
      );
      avgVendor[vendorName]["tangkai_panjang_ditolak"] += countPercentage(
        totalTangkaiPanjangDitolak,
        totalTandanItem,
      );
      avgVendor[vendorName]["rusak_dimakan_tikus"] += countPercentage(
        totalRusakDimakanTikusDitolak || totalRusakDimakanTikus,
        totalTandanItem,
      );
      avgVendor[vendorName]["buah_besar_ditolak"] += countPercentage(
        totalBuahBesarDitolak,
        totalTandanItem,
      );
      avgVendor[vendorName]["partenokarpi_ditolak"] += countPercentage(
        totalPartenokarpiDitolak,
        totalTandanItem,
      );

      avgVendor[vendorName]["trucks"][vehicleNumber]["count"] += 1;
      avgVendor[vendorName]["trucks"][vehicleNumber]["tandan"] +=
        totalTandanItem;
      avgVendor[vendorName]["trucks"][vehicleNumber]["accepted"] +=
        percentAccepted;
      // AVG Diterima
      avgVendor[vendorName]["trucks"][vehicleNumber]["mentah_diterima"] +=
        countPercentage(totalMentahDiterimaRaw, totalTandanItem);
      avgVendor[vendorName]["trucks"][vehicleNumber]["matang"] +=
        countPercentage(totalMatangRaw, totalTandanItem);
      avgVendor[vendorName]["trucks"][vehicleNumber]["lewat_matang"] +=
        countPercentage(totalLewatMatangRaw, totalTandanItem);
      avgVendor[vendorName]["trucks"][vehicleNumber][
        "janjang_kosong_diterima"
      ] += countPercentage(totalJanjangKosongDiterimaRaw, totalTandanItem);
      avgVendor[vendorName]["trucks"][vehicleNumber]["buah_kecil_3_diterima"] +=
        countPercentage(totalBuahKecil3Diterima, totalTandanItem);
      avgVendor[vendorName]["trucks"][vehicleNumber]["buah_kecil_5_diterima"] +=
        countPercentage(totalBuahKecil5Diterima, totalTandanItem);
      avgVendor[vendorName]["trucks"][vehicleNumber]["buah_kecil_2_diterima"] +=
        countPercentage(totalBuahKecil2Diterima, totalTandanItem);
      avgVendor[vendorName]["trucks"][vehicleNumber]["tangkai_panjang"] +=
        countPercentage(totalTangkaiPanjang, totalTandanItem);
      avgVendor[vendorName]["trucks"][vehicleNumber][
        "rusak_dimakan_tikus_diterima"
      ] += countPercentage(totalRusakDimakanTikusDiterima, totalTandanItem);
      avgVendor[vendorName]["trucks"][vehicleNumber]["buah_besar_diterima"] +=
        countPercentage(totalBuahBesarDiterima, totalTandanItem);
      avgVendor[vendorName]["trucks"][vehicleNumber][
        "partenokarpi_diterima"
      ] += countPercentage(totalPartenokarpiDiterima, totalTandanItem);
      // AVG Ditolak
      avgVendor[vendorName]["trucks"][vehicleNumber]["mentah"] +=
        countPercentage(totalMentahRaw, totalTandanItem);
      avgVendor[vendorName]["trucks"][vehicleNumber]["matang_ditolak"] +=
        countPercentage(totalMatangDitolakRaw, totalTandanItem);
      avgVendor[vendorName]["trucks"][vehicleNumber]["lewat_matang_ditolak"] +=
        countPercentage(totalLewatMatangDitolakRaw, totalTandanItem);
      avgVendor[vendorName]["trucks"][vehicleNumber]["janjang_kosong"] +=
        countPercentage(totalJanjangKosongRaw, totalTandanItem);
      avgVendor[vendorName]["trucks"][vehicleNumber]["buah_kecil_3"] +=
        countPercentage(totalBuahKecil3, totalTandanItem);
      avgVendor[vendorName]["trucks"][vehicleNumber]["buah_kecil_5"] +=
        countPercentage(totalBuahKecil5, totalTandanItem);
      avgVendor[vendorName]["trucks"][vehicleNumber]["buah_kecil_2"] +=
        countPercentage(totalBuahKecil2, totalTandanItem);
      avgVendor[vendorName]["trucks"][vehicleNumber][
        "tangkai_panjang_ditolak"
      ] += countPercentage(totalTangkaiPanjangDitolak, totalTandanItem);
      avgVendor[vendorName]["trucks"][vehicleNumber]["rusak_dimakan_tikus"] +=
        countPercentage(
          totalRusakDimakanTikusDitolak || totalRusakDimakanTikus,
          totalTandanItem,
        );
      avgVendor[vendorName]["trucks"][vehicleNumber]["buah_besar_ditolak"] +=
        countPercentage(totalBuahBesarDitolak, totalTandanItem);
      avgVendor[vendorName]["trucks"][vehicleNumber]["partenokarpi_ditolak"] +=
        countPercentage(totalPartenokarpiDitolak, totalTandanItem);

      const durations = dayjs(item.finish_date).diff(
        dayjs(item.date),
        "minutes",
      );

      rawDataExcel.push([
        index + 1,
        date,
        item.machine,
        item.delivery_number || "-",
        dayjs(item.date).format("HH:mm"),
        item.finish_date ? dayjs(item.finish_date).format("HH:mm") : "-",
        durations || 0,
        durations > 0
          ? Math.floor(Number(totalTandanItem) / Number(durations))
          : 0,
        vehicleNumber,
        item.vendor_name,
        vendoryTypeDict?.[item.vendor_type] || "-",
        totalTandanItem || 0,
        totalAcceptedModified || 0,
        totalRejectedModified || 0,
        totalFinedItem || 0,
        totalMultiple || 0,
        // Diterima
        totalMentahDiterimaRaw || 0,
        totalMatangRaw || 0,
        totalLewatMatangRaw || 0,
        totalJanjangKosongDiterimaRaw || 0,
        totalBuahKecil3Diterima || 0,
        totalBuahKecil5Diterima || 0,
        totalBuahKecil2Diterima || 0,
        totalTangkaiPanjang || 0,
        totalRusakDimakanTikusDiterima || 0,
        totalBuahBesarDiterima || 0,
        totalPartenokarpiDiterima || 0,
        // Ditolak
        totalMentahRaw || 0,
        totalMatangDitolakRaw || 0,
        totalLewatMatangDitolakRaw || 0,
        totalJanjangKosongRaw || 0,
        totalBuahKecil3 || 0,
        totalBuahKecil5 || 0,
        totalBuahKecil2 || 0,
        totalTangkaiPanjangDitolak || 0,
        totalRusakDimakanTikusDitolak || totalRusakDimakanTikus || 0,
        totalBuahBesarDitolak || 0,
        totalPartenokarpiDitolak || 0,
      ]);
    });

    // Populate trukPerHari from gradingTrucks
    Object.entries(gradingTrucks).forEach(([date, trucks], index) => {
      trukPerHari.push([index + 1, date, trucks["Truk"]]);
    });

    const formatNumberId = (val, decimals = 2) => {
      const num = Number(val);
      if (isNaN(num) || val === null || val === undefined) {
        return (0).toLocaleString("id-ID", {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        });
      }
      return num.toLocaleString("id-ID", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
    };

    const avgWeekData = [
      [periodString],
      ["Week", "% Diterima", "% Ditolak", "% Didenda"],
    ];
    Object.keys(avgWeek).forEach((week) => {
      const w = avgWeek[week];
      const acceptedPercent = countPercentage(w.total_accepted, w.total_tandan);
      const rejectedPercent = countPercentage(w.total_rejected, w.total_tandan);
      const finedPercent = countPercentage(w.total_fined, w.total_tandan);

      avgWeekData.push([
        week,
        formatNumberId(acceptedPercent),
        formatNumberId(rejectedPercent),
        formatNumberId(finedPercent),
      ]);
    });
    avgWeekData.push([
      "** Didenda buah diterima yang memiliki tangkai panjang",
    ]);
    avgWeekData.push(["** Ditolak termasuk buah <5kg"]);

    const avgWeekDemographyData = [
      [periodString],
      [
        "Week",
        "Diterima",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "Ditolak",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
      ],
      [
        "",
        "Mentah",
        "Matang",
        "Lewat Matang",
        "Janjang Kosong",
        "Buah Kecil <3kg",
        "Buah Kecil <5kg",
        "Buah Kecil <2kg",
        "Tangkai Panjang",
        "Rusak Dimakan Tikus",
        "Buah Besar",
        "Partenokarpi",
        "Mentah",
        "Matang",
        "Lewat Matang",
        "Janjang Kosong",
        "Buah Kecil <3kg",
        "Buah Kecil <5kg",
        "Buah Kecil <2kg",
        "Tangkai Panjang",
        "Rusak Dimakan Tikus",
        "Buah Besar",
        "Partenokarpi",
      ],
    ];
    Object.keys(avgWeekDemography).forEach((week) => {
      const item = avgWeekDemography[week];
      const totalTandan = item.total_tandan || 1;

      avgWeekDemographyData.push([
        week,
        // Diterima
        formatNumberId(countPercentage(item.mentah_diterima, totalTandan)),
        formatNumberId(countPercentage(item.matang, totalTandan)),
        formatNumberId(countPercentage(item.lewat_matang, totalTandan)),
        formatNumberId(countPercentage(item.janjang_kosong_diterima, totalTandan)),
        formatNumberId(countPercentage(item.buah_kecil_3_diterima, totalTandan)),
        formatNumberId(countPercentage(item.buah_kecil_5_diterima, totalTandan)),
        formatNumberId(countPercentage(item.buah_kecil_2_diterima, totalTandan)),
        formatNumberId(countPercentage(item.tangkai_panjang, totalTandan)),
        formatNumberId(
          countPercentage(item.rusak_dimakan_tikus_diterima, totalTandan),
        ),
        formatNumberId(countPercentage(item.buah_besar_diterima, totalTandan)),
        formatNumberId(countPercentage(item.partenokarpi_diterima, totalTandan)),
        // Ditolak
        formatNumberId(countPercentage(item.mentah, totalTandan)),
        formatNumberId(countPercentage(item.matang_ditolak, totalTandan)),
        formatNumberId(countPercentage(item.lewat_matang_ditolak, totalTandan)),
        formatNumberId(countPercentage(item.janjang_kosong, totalTandan)),
        formatNumberId(countPercentage(item.buah_kecil_3, totalTandan)),
        formatNumberId(countPercentage(item.buah_kecil_5, totalTandan)),
        formatNumberId(countPercentage(item.buah_kecil_2, totalTandan)),
        formatNumberId(countPercentage(item.tangkai_panjang_ditolak, totalTandan)),
        formatNumberId(countPercentage(item.rusak_dimakan_tikus, totalTandan)),
        formatNumberId(countPercentage(item.buah_besar_ditolak, totalTandan)),
        formatNumberId(countPercentage(item.partenokarpi_ditolak, totalTandan)),
      ]);
    });

    const bestAcceptedTrucksData = [
      [periodString],
      [
        "No",
        "Plat Nomor",
        "Vendor",
        "Total Truk",
        "Kontribusi %",
        "Avg Tandan",
        "Avg % Diterima",
        "AVG Diterima",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "AVG Ditolak",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
      ],
      [
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "Mentah",
        "Matang",
        "Lewat Matang",
        "Janjang Kosong",
        "Buah Kecil <3kg",
        "Buah Kecil <5kg",
        "Buah Kecil <2kg",
        "Tangkai Panjang",
        "Rusak Dimakan Tikus",
        "Buah Besar",
        "Partenokarpi",
        "Mentah",
        "Matang",
        "Lewat Matang",
        "Janjang Kosong",
        "Buah Kecil <3kg",
        "Buah Kecil <5kg",
        "Buah Kecil <2kg",
        "Tangkai Panjang",
        "Rusak Dimakan Tikus",
        "Buah Besar",
        "Partenokarpi",
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
          formatNumberId(countPercentage(item["tandan"], totalAllTandan)),
          avgTandan,
          formatNumberId(item["accepted"] / count),
          // AVG Diterima
          formatNumberId(item["mentah_diterima"] / count),
          formatNumberId(item["matang"] / count),
          formatNumberId(item["lewat_matang"] / count),
          formatNumberId(item["janjang_kosong_diterima"] / count),
          formatNumberId(item["buah_kecil_3_diterima"] / count),
          formatNumberId(item["buah_kecil_5_diterima"] / count),
          formatNumberId(item["buah_kecil_2_diterima"] / count),
          formatNumberId(item["tangkai_panjang"] / count),
          formatNumberId(item["rusak_dimakan_tikus_diterima"] / count),
          formatNumberId(item["buah_besar_diterima"] / count),
          formatNumberId(item["partenokarpi_diterima"] / count),
          // AVG Ditolak
          formatNumberId(item["mentah"] / count),
          formatNumberId(item["matang_ditolak"] / count),
          formatNumberId(item["lewat_matang_ditolak"] / count),
          formatNumberId(item["janjang_kosong"] / count),
          formatNumberId(item["buah_kecil_3"] / count),
          formatNumberId(item["buah_kecil_5"] / count),
          formatNumberId(item["buah_kecil_2"] / count),
          formatNumberId(item["tangkai_panjang_ditolak"] / count),
          formatNumberId(item["rusak_dimakan_tikus"] / count),
          formatNumberId(item["buah_besar_ditolak"] / count),
          formatNumberId(item["partenokarpi_ditolak"] / count),
        ];

        bestAcceptedTrucksData.push(temp);
      });
    bestAcceptedTrucksData.push([
      `** Kontribusi merupakan persentase terhadap keseluruhan truk dalam ${periodString}`,
    ]);

    const worstAcceptedTrucksData = [
      [periodString],
      [
        "No",
        "Plat Nomor",
        "Vendor",
        "Total Truk",
        "Kontribusi %",
        "Avg Tandan",
        "Avg % Diterima",
        "AVG Diterima",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "AVG Ditolak",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
      ],
      [
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "Mentah",
        "Matang",
        "Lewat Matang",
        "Janjang Kosong",
        "Buah Kecil <3kg",
        "Buah Kecil <5kg",
        "Buah Kecil <2kg",
        "Tangkai Panjang",
        "Rusak Dimakan Tikus",
        "Buah Besar",
        "Partenokarpi",
        "Mentah",
        "Matang",
        "Lewat Matang",
        "Janjang Kosong",
        "Buah Kecil <3kg",
        "Buah Kecil <5kg",
        "Buah Kecil <2kg",
        "Tangkai Panjang",
        "Rusak Dimakan Tikus",
        "Buah Besar",
        "Partenokarpi",
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
          formatNumberId(countPercentage(item["tandan"], totalAllTandan)),
          avgTandan,
          formatNumberId(item["accepted"] / count),
          // AVG Diterima
          formatNumberId(item["mentah_diterima"] / count),
          formatNumberId(item["matang"] / count),
          formatNumberId(item["lewat_matang"] / count),
          formatNumberId(item["janjang_kosong_diterima"] / count),
          formatNumberId(item["buah_kecil_3_diterima"] / count),
          formatNumberId(item["buah_kecil_5_diterima"] / count),
          formatNumberId(item["buah_kecil_2_diterima"] / count),
          formatNumberId(item["tangkai_panjang"] / count),
          formatNumberId(item["rusak_dimakan_tikus_diterima"] / count),
          formatNumberId(item["buah_besar_diterima"] / count),
          formatNumberId(item["partenokarpi_diterima"] / count),
          // AVG Ditolak
          formatNumberId(item["mentah"] / count),
          formatNumberId(item["matang_ditolak"] / count),
          formatNumberId(item["lewat_matang_ditolak"] / count),
          formatNumberId(item["janjang_kosong"] / count),
          formatNumberId(item["buah_kecil_3"] / count),
          formatNumberId(item["buah_kecil_5"] / count),
          formatNumberId(item["buah_kecil_2"] / count),
          formatNumberId(item["tangkai_panjang_ditolak"] / count),
          formatNumberId(item["rusak_dimakan_tikus"] / count),
          formatNumberId(item["buah_besar_ditolak"] / count),
          formatNumberId(item["partenokarpi_ditolak"] / count),
        ];

        worstAcceptedTrucksData.push(temp);
      });
    worstAcceptedTrucksData.push([
      `** Kontribusi merupakan persentase terhadap keseluruhan truk dalam ${periodString}`,
    ]);

    const hourDataRejectData = [
      [periodString],
      ["No", "Kategori", "% Diterima", "% Ditolak"],
    ];
    hourDataRejectData.push([
      1,
      "07:00 - 18:00",
      formatNumberId(
        countPercentage(
          hourDataReject["before6pm"].total_accepted,
          hourDataReject["before6pm"].total_tandan,
        ),
      ),
      formatNumberId(
        countPercentage(
          hourDataReject["before6pm"].total_rejected,
          hourDataReject["before6pm"].total_tandan,
        ),
      ),
    ]);
    hourDataRejectData.push([
      2,
      "18:00 - 03:00",
      formatNumberId(
        countPercentage(
          hourDataReject["after6pm"].total_accepted,
          hourDataReject["after6pm"].total_tandan,
        ),
      ),
      formatNumberId(
        countPercentage(
          hourDataReject["after6pm"].total_rejected,
          hourDataReject["after6pm"].total_tandan,
        ),
      ),
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
        "Kontribusi %",
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
            formatNumberId(countPercentage(t.count, item.total_trucks)),
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
        "Kontribusi %",
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
      formatNumberId(
        countPercentage(
          totalJanjangObj["<600"].total_trucks,
          data?.length,
        ),
      ),
      totalJanjangObj["<600"].total_janjang,
      formatNumberId(
        countPercentage(
          totalJanjangObj["<600"].total_accepted,
          totalJanjangObj["<600"].total_janjang,
        ),
      ),
      formatNumberId(
        countPercentage(
          totalJanjangObj["<600"].matang,
          totalJanjangObj["<600"].total_janjang,
        ),
      ),
      formatNumberId(
        countPercentage(
          totalJanjangObj["<600"].lewat_matang,
          totalJanjangObj["<600"].total_janjang,
        ),
      ),
      formatNumberId(
        countPercentage(
          totalJanjangObj["<600"].tangkai_panjang,
          totalJanjangObj["<600"].total_accepted,
        ),
      ),
      formatNumberId(
        countPercentage(
          totalJanjangObj["<600"].mentah,
          totalJanjangObj["<600"].total_janjang,
        ),
      ),
      formatNumberId(
        countPercentage(
          totalJanjangObj["<600"].janjang_kosong,
          totalJanjangObj["<600"].total_janjang,
        ),
      ),
      formatNumberId(
        countPercentage(
          totalJanjangObj["<600"].buah_kecil,
          totalJanjangObj["<600"].total_janjang,
        ),
      ),
    ]);
    totalJanjangData.push([
      2,
      "601 - 1000 Janjang",
      "10 - 15kg",
      totalJanjangObj["<1000"].total_trucks,
      formatNumberId(
        countPercentage(
          totalJanjangObj["<1000"].total_trucks,
          data?.length,
        ),
      ),
      totalJanjangObj["<1000"].total_janjang,
      formatNumberId(
        countPercentage(
          totalJanjangObj["<1000"].total_accepted,
          totalJanjangObj["<1000"].total_janjang,
        ),
      ),
      formatNumberId(
        countPercentage(
          totalJanjangObj["<1000"].matang,
          totalJanjangObj["<1000"].total_janjang,
        ),
      ),
      formatNumberId(
        countPercentage(
          totalJanjangObj["<1000"].lewat_matang,
          totalJanjangObj["<1000"].total_janjang,
        ),
      ),
      formatNumberId(
        countPercentage(
          totalJanjangObj["<1000"].tangkai_panjang,
          totalJanjangObj["<1000"].total_accepted,
        ),
      ),
      formatNumberId(
        countPercentage(
          totalJanjangObj["<1000"].mentah,
          totalJanjangObj["<1000"].total_janjang,
        ),
      ),
      formatNumberId(
        countPercentage(
          totalJanjangObj["<1000"].janjang_kosong,
          totalJanjangObj["<1000"].total_janjang,
        ),
      ),
      formatNumberId(
        countPercentage(
          totalJanjangObj["<1000"].buah_kecil,
          totalJanjangObj["<1000"].total_janjang,
        ),
      ),
    ]);
    totalJanjangData.push([
      3,
      "> 1000 Janjang",
      "<10kg",
      totalJanjangObj[">1000"].total_trucks,
      formatNumberId(
        countPercentage(
          totalJanjangObj[">1000"].total_trucks,
          data?.length,
        ),
      ),
      totalJanjangObj[">1000"].total_janjang,
      formatNumberId(
        countPercentage(
          totalJanjangObj[">1000"].total_accepted,
          totalJanjangObj[">1000"].total_janjang,
        ),
      ),
      formatNumberId(
        countPercentage(
          totalJanjangObj[">1000"].matang,
          totalJanjangObj[">1000"].total_janjang,
        ),
      ),
      formatNumberId(
        countPercentage(
          totalJanjangObj[">1000"].lewat_matang,
          totalJanjangObj[">1000"].total_janjang,
        ),
      ),
      formatNumberId(
        countPercentage(
          totalJanjangObj[">1000"].tangkai_panjang,
          totalJanjangObj[">1000"].total_accepted,
        ),
      ),
      formatNumberId(
        countPercentage(
          totalJanjangObj[">1000"].mentah,
          totalJanjangObj[">1000"].total_janjang,
        ),
      ),
      formatNumberId(
        countPercentage(
          totalJanjangObj[">1000"].janjang_kosong,
          totalJanjangObj[">1000"].total_janjang,
        ),
      ),
      formatNumberId(
        countPercentage(
          totalJanjangObj[">1000"].buah_kecil,
          totalJanjangObj[">1000"].total_janjang,
        ),
      ),
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
        "Kontribusi %",
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
            formatNumberId(countPercentage(t.count, item.total_trucks)),
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
        formatNumberId(countPercentage(item["machine"][1], item.total_trucks)),
        item["machine"][2],
        formatNumberId(countPercentage(item["machine"][2], item.total_trucks)),
        item["machine"][3],
        formatNumberId(countPercentage(item["machine"][3], item.total_trucks)),
        item["machine"][4],
        formatNumberId(countPercentage(item["machine"][4], item.total_trucks)),
      ]);
    });

    const avgVendorData = [
      [periodString],
      [
        "No",
        "Vendor",
        "Total Truk",
        "Kontribusi %",
        "Avg Tandan",
        "Avg Diterima %",
        "AVG Diterima",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "AVG Ditolak",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
      ],
      [
        "",
        "",
        "",
        "",
        "",
        "",
        "Mentah",
        "Matang",
        "Lewat Matang",
        "Janjang Kosong",
        "Buah Kecil <3kg",
        "Buah Kecil <5kg",
        "Buah Kecil <2kg",
        "Tangkai Panjang",
        "Rusak Dimakan Tikus",
        "Buah Besar",
        "Partenokarpi",
        "Mentah",
        "Matang",
        "Lewat Matang",
        "Janjang Kosong",
        "Buah Kecil <3kg",
        "Buah Kecil <5kg",
        "Buah Kecil <2kg",
        "Tangkai Panjang",
        "Rusak Dimakan Tikus",
        "Buah Besar",
        "Partenokarpi",
      ],
    ];
    Object.keys(avgVendor).forEach((vendor, idx) => {
      const item = avgVendor[vendor];
      const avgTandan = Math.round(item.tandan / item.count);

      avgVendorData.push([
        idx + 1,
        vendor,
        item.count,
        formatNumberId(countPercentage(item.count, data?.length)),
        avgTandan,
        formatNumberId(item.accepted / item.count),
        // AVG Diterima
        formatNumberId(item.mentah_diterima / item.count),
        formatNumberId(item.matang / item.count),
        formatNumberId(item.lewat_matang / item.count),
        formatNumberId(item.janjang_kosong_diterima / item.count),
        formatNumberId(item.buah_kecil_3_diterima / item.count),
        formatNumberId(item.buah_kecil_5_diterima / item.count),
        formatNumberId(item.buah_kecil_2_diterima / item.count),
        formatNumberId(item.tangkai_panjang / item.count),
        formatNumberId(item.rusak_dimakan_tikus_diterima / item.count),
        formatNumberId(item.buah_besar_diterima / item.count),
        formatNumberId(item.partenokarpi_diterima / item.count),
        // AVG Ditolak
        formatNumberId(item.mentah / item.count),
        formatNumberId(item.matang_ditolak / item.count),
        formatNumberId(item.lewat_matang_ditolak / item.count),
        formatNumberId(item.janjang_kosong / item.count),
        formatNumberId(item.buah_kecil_3 / item.count),
        formatNumberId(item.buah_kecil_5 / item.count),
        formatNumberId(item.buah_kecil_2 / item.count),
        formatNumberId(item.tangkai_panjang_ditolak / item.count),
        formatNumberId(item.rusak_dimakan_tikus / item.count),
        formatNumberId(item.buah_besar_ditolak / item.count),
        formatNumberId(item.partenokarpi_ditolak / item.count),
      ]);
    });

    avgVendorData.push([
      `** Kontribusi merupakan persentase terhadap keseluruhan truk dalam ${periodString}`,
    ]);

    Object.keys(avgVendor)
      .map((vendor) => {
        const item = avgVendor[vendor];
        return { vendor_name: vendor, ...item };
      })
      .sort((a, b) => b.count - a.count)
      .forEach((d) => {
        avgVendorData.push([""]);
        avgVendorData.push([`Most Frequent Truck ${d.vendor_name}`]);
        avgVendorData.push([
          "No",
          "Plat Nomor",
          "Total Truk",
          "Kontribusi %",
          "Avg Tandan",
          "Avg Diterima %",
          "AVG Diterima",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "AVG Ditolak",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
        ]);
        avgVendorData.push([
          "",
          "",
          "",
          "",
          "",
          "",
          "Mentah",
          "Matang",
          "Lewat Matang",
          "Janjang Kosong",
          "Buah Kecil <3kg",
          "Buah Kecil <5kg",
          "Buah Kecil <2kg",
          "Tangkai Panjang",
          "Rusak Dimakan Tikus",
          "Buah Besar",
          "Partenokarpi",
          "Mentah",
          "Matang",
          "Lewat Matang",
          "Janjang Kosong",
          "Buah Kecil <3kg",
          "Buah Kecil <5kg",
          "Buah Kecil <2kg",
          "Tangkai Panjang",
          "Rusak Dimakan Tikus",
          "Buah Besar",
          "Partenokarpi",
        ]);
        Object.keys(d.trucks)
          .map((t) => ({ vehicle_number: t, ...d["trucks"][t] }))
          .sort((a, b) => b.count - a.count)
          .forEach((item, idx) => {
            const avgTandan = Math.round(item.tandan / item.count);

            avgVendorData.push([
              idx + 1,
              item.vehicle_number,
              item.count,
              formatNumberId(countPercentage(item.count, data?.length)),
              avgTandan,
              formatNumberId(item.accepted / item.count),
              // AVG Diterima
              formatNumberId(item.mentah_diterima / item.count),
              formatNumberId(item.matang / item.count),
              formatNumberId(item.lewat_matang / item.count),
              formatNumberId(item.janjang_kosong_diterima / item.count),
              formatNumberId(item.buah_kecil_3_diterima / item.count),
              formatNumberId(item.buah_kecil_5_diterima / item.count),
              formatNumberId(item.buah_kecil_2_diterima / item.count),
              formatNumberId(item.tangkai_panjang / item.count),
              formatNumberId(item.rusak_dimakan_tikus_diterima / item.count),
              formatNumberId(item.buah_besar_diterima / item.count),
              formatNumberId(item.partenokarpi_diterima / item.count),
              // AVG Ditolak
              formatNumberId(item.mentah / item.count),
              formatNumberId(item.matang_ditolak / item.count),
              formatNumberId(item.lewat_matang_ditolak / item.count),
              formatNumberId(item.janjang_kosong / item.count),
              formatNumberId(item.buah_kecil_3 / item.count),
              formatNumberId(item.buah_kecil_5 / item.count),
              formatNumberId(item.buah_kecil_2 / item.count),
              formatNumberId(item.tangkai_panjang_ditolak / item.count),
              formatNumberId(item.rusak_dimakan_tikus / item.count),
              formatNumberId(item.buah_besar_ditolak / item.count),
              formatNumberId(item.partenokarpi_ditolak / item.count),
            ]);
          });

        avgVendorData.push([
          `** Kontribusi merupakan persentase terhadap keseluruhan truk dalam ${periodString}`,
        ]);
      });

    const totalJanjangDurationData = [
      [periodString],
      [
        "No",
        "Kategori",
        "Estimasi BJR",
        "Total Truk",
        "Kontribusi %",
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
      formatNumberId(
        countPercentage(
          totalJanjangObjDuration["<600"].total_trucks,
          data?.length,
        ),
      ),
      totalJanjangObjDuration["<600"].total_janjang,
      formatNumberId(
        countPercentage(
          totalJanjangObjDuration["<600"].total_accepted,
          totalJanjangObjDuration["<600"].total_janjang,
        ),
      ),
      formatNumberId(
        countPercentage(
          totalJanjangObjDuration["<600"].matang,
          totalJanjangObjDuration["<600"].total_janjang,
        ),
      ),
      formatNumberId(
        countPercentage(
          totalJanjangObjDuration["<600"].lewat_matang,
          totalJanjangObjDuration["<600"].total_janjang,
        ),
      ),
      formatNumberId(
        countPercentage(
          totalJanjangObjDuration["<600"].tangkai_panjang,
          totalJanjangObjDuration["<600"].total_accepted,
        ),
      ),
      formatNumberId(
        countPercentage(
          totalJanjangObjDuration["<600"].mentah,
          totalJanjangObjDuration["<600"].total_janjang,
        ),
      ),
      formatNumberId(
        countPercentage(
          totalJanjangObjDuration["<600"].janjang_kosong,
          totalJanjangObjDuration["<600"].total_janjang,
        ),
      ),
      formatNumberId(
        countPercentage(
          totalJanjangObjDuration["<600"].buah_kecil,
          totalJanjangObjDuration["<600"].total_janjang,
        ),
      ),
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
      formatNumberId(
        countPercentage(
          totalJanjangObjDuration["<1000"].total_trucks,
          data?.length,
        ),
      ),
      totalJanjangObjDuration["<1000"].total_janjang,
      formatNumberId(
        countPercentage(
          totalJanjangObjDuration["<1000"].total_accepted,
          totalJanjangObjDuration["<1000"].total_janjang,
        ),
      ),
      formatNumberId(
        countPercentage(
          totalJanjangObjDuration["<1000"].matang,
          totalJanjangObjDuration["<1000"].total_janjang,
        ),
      ),
      formatNumberId(
        countPercentage(
          totalJanjangObjDuration["<1000"].lewat_matang,
          totalJanjangObjDuration["<1000"].total_janjang,
        ),
      ),
      formatNumberId(
        countPercentage(
          totalJanjangObjDuration["<1000"].tangkai_panjang,
          totalJanjangObjDuration["<1000"].total_accepted,
        ),
      ),
      formatNumberId(
        countPercentage(
          totalJanjangObjDuration["<1000"].mentah,
          totalJanjangObjDuration["<1000"].total_janjang,
        ),
      ),
      formatNumberId(
        countPercentage(
          totalJanjangObjDuration["<1000"].janjang_kosong,
          totalJanjangObjDuration["<1000"].total_janjang,
        ),
      ),
      formatNumberId(
        countPercentage(
          totalJanjangObjDuration["<1000"].buah_kecil,
          totalJanjangObjDuration["<1000"].total_janjang,
        ),
      ),
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
      formatNumberId(
        countPercentage(
          totalJanjangObjDuration[">1000"].total_trucks,
          data?.length,
        ),
      ),
      totalJanjangObjDuration[">1000"].total_janjang,
      formatNumberId(
        countPercentage(
          totalJanjangObjDuration[">1000"].total_accepted,
          totalJanjangObjDuration[">1000"].total_janjang,
        ),
      ),
      formatNumberId(
        countPercentage(
          totalJanjangObjDuration[">1000"].matang,
          totalJanjangObjDuration[">1000"].total_janjang,
        ),
      ),
      formatNumberId(
        countPercentage(
          totalJanjangObjDuration[">1000"].lewat_matang,
          totalJanjangObjDuration[">1000"].total_janjang,
        ),
      ),
      formatNumberId(
        countPercentage(
          totalJanjangObjDuration[">1000"].tangkai_panjang,
          totalJanjangObjDuration[">1000"].total_accepted,
        ),
      ),
      formatNumberId(
        countPercentage(
          totalJanjangObjDuration[">1000"].mentah,
          totalJanjangObjDuration[">1000"].total_janjang,
        ),
      ),
      formatNumberId(
        countPercentage(
          totalJanjangObjDuration[">1000"].janjang_kosong,
          totalJanjangObjDuration[">1000"].total_janjang,
        ),
      ),
      formatNumberId(
        countPercentage(
          totalJanjangObjDuration[">1000"].buah_kecil,
          totalJanjangObjDuration[">1000"].total_janjang,
        ),
      ),
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
          formatNumberId((item?.["00"] || 1) / (totalDay || 1), 1),
          formatNumberId((item?.["05"] || 1) / (totalDay || 1), 1),
          formatNumberId((item?.["10"] || 1) / (totalDay || 1), 1),
          formatNumberId((item?.["12"] || 1) / (totalDay || 1), 1),
          formatNumberId((item?.["14"] || 1) / (totalDay || 1), 1),
          formatNumberId((item?.["16"] || 1) / (totalDay || 1), 1),
          formatNumberId((item?.["18"] || 1) / (totalDay || 1), 1),
          formatNumberId((item?.["19"] || 1) / (totalDay || 1), 1),
          formatNumberId((item?.["21"] || 1) / (totalDay || 1), 1),
          // item['total'],
        ]);
      }
    });

    // console.log({ orderDay, daysDateArray, dailyTruckCount });

    // return res.send('Thank you');

    const workbook = XLSX.utils.book_new();
    // Create a worksheet
    const wsRaw = XLSX.utils.aoa_to_sheet(rawDataExcel);
    const rawMerges = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 37 } },
      { s: { r: 1, c: 16 }, e: { r: 1, c: 26 } },
      { s: { r: 1, c: 27 }, e: { r: 1, c: 37 } },
    ];
    for (let c = 0; c <= 15; c++) {
      rawMerges.push({ s: { r: 1, c }, e: { r: 2, c } });
    }
    wsRaw["!merges"] = rawMerges;

    wsRaw["!cols"] = [
      { wch: 6 },
      { wch: 12 },
      { wch: 14 },
      { wch: 16 },
      { wch: 12 },
      { wch: 14 },
      { wch: 10 },
      { wch: 14 },
      { wch: 14 },
      { wch: 22 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 12 },
      { wch: 12 },
      { wch: 14 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 20 },
      { wch: 14 },
      { wch: 14 },
      { wch: 12 },
      { wch: 12 },
      { wch: 14 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 20 },
      { wch: 14 },
      { wch: 14 },
    ];

    XLSX.utils.book_append_sheet(workbook, wsRaw, "Raw Data");
    const wsAvgWeek = XLSX.utils.aoa_to_sheet(avgWeekData);
    XLSX.utils.book_append_sheet(workbook, wsAvgWeek, "Average Reject Accept");
    const wsAvgWeekDemography = XLSX.utils.aoa_to_sheet(avgWeekDemographyData);
    const avgWeekDemographyMerges = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 22 } },
      { s: { r: 1, c: 0 }, e: { r: 2, c: 0 } },
      { s: { r: 1, c: 1 }, e: { r: 1, c: 11 } },
      { s: { r: 1, c: 12 }, e: { r: 1, c: 22 } },
    ];
    wsAvgWeekDemography["!merges"] = avgWeekDemographyMerges;

    wsAvgWeekDemography["!cols"] = [
      { wch: 10 },
      { wch: 12 },
      { wch: 12 },
      { wch: 14 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 20 },
      { wch: 14 },
      { wch: 14 },
      { wch: 12 },
      { wch: 12 },
      { wch: 14 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 20 },
      { wch: 14 },
      { wch: 14 },
    ];

    XLSX.utils.book_append_sheet(
      workbook,
      wsAvgWeekDemography,
      "Average Demografi Klasifikasi",
    );
    const wsBestAccepted = XLSX.utils.aoa_to_sheet(bestAcceptedTrucksData);
    const bestAcceptedMerges = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 28 } },
      { s: { r: 1, c: 7 }, e: { r: 1, c: 17 } },
      { s: { r: 1, c: 18 }, e: { r: 1, c: 28 } },
    ];
    for (let c = 0; c <= 6; c++) {
      bestAcceptedMerges.push({ s: { r: 1, c }, e: { r: 2, c } });
    }
    wsBestAccepted["!merges"] = bestAcceptedMerges;

    wsBestAccepted["!cols"] = [
      { wch: 6 },
      { wch: 14 },
      { wch: 22 },
      { wch: 12 },
      { wch: 14 },
      { wch: 12 },
      { wch: 14 },
      { wch: 12 },
      { wch: 12 },
      { wch: 14 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 20 },
      { wch: 14 },
      { wch: 14 },
      { wch: 12 },
      { wch: 12 },
      { wch: 14 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 20 },
      { wch: 14 },
      { wch: 14 },
    ];

    XLSX.utils.book_append_sheet(workbook, wsBestAccepted, "Best 20 Accepted");
    const wsWorsttAccepted = XLSX.utils.aoa_to_sheet(worstAcceptedTrucksData);
    const worstAcceptedMerges = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 28 } },
      { s: { r: 1, c: 7 }, e: { r: 1, c: 17 } },
      { s: { r: 1, c: 18 }, e: { r: 1, c: 28 } },
    ];
    for (let c = 0; c <= 6; c++) {
      worstAcceptedMerges.push({ s: { r: 1, c }, e: { r: 2, c } });
    }
    wsWorsttAccepted["!merges"] = worstAcceptedMerges;

    wsWorsttAccepted["!cols"] = [
      { wch: 6 },
      { wch: 14 },
      { wch: 22 },
      { wch: 12 },
      { wch: 14 },
      { wch: 12 },
      { wch: 14 },
      { wch: 12 },
      { wch: 12 },
      { wch: 14 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 20 },
      { wch: 14 },
      { wch: 14 },
      { wch: 12 },
      { wch: 12 },
      { wch: 14 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 20 },
      { wch: 14 },
      { wch: 14 },
    ];

    XLSX.utils.book_append_sheet(
      workbook,
      wsWorsttAccepted,
      "Top 20 Worst Trucks",
    );
    // const wsHourTruck = XLSX.utils.aoa_to_sheet(hourDataRejectData);
    // XLSX.utils.book_append_sheet(workbook, wsHourTruck, "Reject by Shift Data");
    // const wsTotalJanjang = XLSX.utils.aoa_to_sheet(totalJanjangData);
    // XLSX.utils.book_append_sheet(
    //   workbook,
    //   wsTotalJanjang,
    //   "Total Tandan Recap",
    // );
    // const wsMachineUtility = XLSX.utils.aoa_to_sheet(machineUtilityWeekData);
    // XLSX.utils.book_append_sheet(
    //   workbook,
    //   wsMachineUtility,
    //   "Machine Utilities",
    // );
    const wsAvgVendor = XLSX.utils.aoa_to_sheet(avgVendorData);
    const avgVendorMerges = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 27 } },
      { s: { r: 1, c: 6 }, e: { r: 1, c: 16 } },
      { s: { r: 1, c: 17 }, e: { r: 1, c: 27 } },
    ];
    for (let c = 0; c <= 5; c++) {
      avgVendorMerges.push({ s: { r: 1, c }, e: { r: 2, c } });
    }
    wsAvgVendor["!merges"] = avgVendorMerges;

    wsAvgVendor["!cols"] = [
      { wch: 6 },
      { wch: 22 },
      { wch: 12 },
      { wch: 14 },
      { wch: 12 },
      { wch: 16 },
      { wch: 12 },
      { wch: 12 },
      { wch: 14 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 20 },
      { wch: 14 },
      { wch: 14 },
      { wch: 12 },
      { wch: 12 },
      { wch: 14 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 20 },
      { wch: 14 },
      { wch: 14 },
    ];

    XLSX.utils.book_append_sheet(workbook, wsAvgVendor, "Average Vendor");
    // const wsTotalJanjangDuration = XLSX.utils.aoa_to_sheet(
    //   totalJanjangDurationData,
    // );
    // XLSX.utils.book_append_sheet(
    //   workbook,
    //   wsTotalJanjangDuration,
    //   "Total Tandan Duration Recap",
    // );
    // const wsDailyTruck = XLSX.utils.aoa_to_sheet(dailyTruckCountData);
    // XLSX.utils.book_append_sheet(
    //   workbook,
    //   wsDailyTruck,
    //   "Daily Truck Day Time",
    // );
    const wsTrukPerHari = XLSX.utils.aoa_to_sheet(trukPerHari);
    XLSX.utils.book_append_sheet(workbook, wsTrukPerHari, "Total Truk Harian");

    // Performance Durasi grouping
    const performanceDurasiGrouped = {};
    const daysId = {
      Sunday: "Minggu",
      Monday: "Senin",
      Tuesday: "Selasa",
      Wednesday: "Rabu",
      Thursday: "Kamis",
      Friday: "Jumat",
      Saturday: "Sabtu",
    };

    data.forEach((item) => {
      const dateObj = item.date;
      if (!dateObj) return;

      const shiftedDate = dayjs(dateObj).subtract(6, "hour");
      const dayKey = shiftedDate.format("YYYY-MM-DD");

      if (!performanceDurasiGrouped[dayKey]) {
        const dayNameEn = shiftedDate.format("dddd");
        performanceDurasiGrouped[dayKey] = {
          hari: daysId[dayNameEn] || dayNameEn,
          tanggal: shiftedDate.format("DD/MM/YYYY"),
          trucks: 0,
          minDate: dayjs(dateObj),
          maxDate: dayjs(item.finish_date || dateObj),
        };
      }

      performanceDurasiGrouped[dayKey].trucks += 1;

      const currentItemStartDate = dayjs(dateObj);
      const currentItemFinishDate = dayjs(item.finish_date || dateObj);
      if (
        currentItemStartDate.isBefore(performanceDurasiGrouped[dayKey].minDate)
      ) {
        performanceDurasiGrouped[dayKey].minDate = currentItemStartDate;
      }
      if (
        currentItemFinishDate.isAfter(performanceDurasiGrouped[dayKey].maxDate)
      ) {
        performanceDurasiGrouped[dayKey].maxDate = currentItemFinishDate;
      }
    });

    const performanceDurasiRows = [
      [
        "Hari",
        "Tanggal",
        "Jumlah truk",
        "Mulai Grading",
        "Selesai Grading",
        "Durasi Grading",
      ],
    ];

    const sortedPerformanceDays = Object.keys(performanceDurasiGrouped).sort(
      (a, b) => dayjs(a).valueOf() - dayjs(b).valueOf(),
    );

    sortedPerformanceDays.forEach((dayKey) => {
      const group = performanceDurasiGrouped[dayKey];
      const minD = group.minDate;
      const maxD = group.maxDate;

      const durasiMenit = maxD.diff(minD, "minute");
      const hours = Math.floor(durasiMenit / 60);
      const minutes = durasiMenit % 60;
      const durasiFormat = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;

      performanceDurasiRows.push([
        group.hari,
        group.tanggal,
        group.trucks,
        minD.format("HH:mm"),
        maxD.format("HH:mm"),
        durasiFormat,
      ]);
    });

    const wsPerformanceDurasi = XLSX.utils.aoa_to_sheet(performanceDurasiRows);
    wsPerformanceDurasi["!cols"] = [
      { wch: 15 }, // Hari
      { wch: 15 }, // Tanggal
      { wch: 15 }, // Jumlah truk
      { wch: 15 }, // Mulai Grading
      { wch: 15 }, // Selesai Grading
      { wch: 15 }, // Durasi Grading
    ];

    XLSX.utils.book_append_sheet(
      workbook,
      wsPerformanceDurasi,
      "Performance Durasi",
    );

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

      let q = { company: user.company, factory: { $in: user.access_factory } };

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
      const companyObj = user?.company
        ? await CompanyModel.findById(user.company).lean()
        : null;
      const isLngm =
        factoryObj && ["LNGM"].some((loc) => factoryObj.name.includes(loc));
      const isKynm =
        (factoryObj && ["KYNM"].some((loc) => factoryObj.name.includes(loc))) ||
        (companyObj &&
          ["SIMP"].some(
            (c) =>
              companyObj.initial?.includes(c) || companyObj.name?.includes(c),
          ));

      if (vendor_type) {
        const vTypeLower = vendor_type.toLowerCase();
        if (
          isLngm &&
          (vTypeLower === "gapoktan" ||
            vTypeLower === "stka" ||
            vTypeLower === "luar")
        ) {
          q["vendor_name"] = { $regex: new RegExp(vendor_type, "i") };
        } else if (vTypeLower !== "all") {
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

      const avgClassificationGrading = {
        diterima: {
          main: {
            MATANG: [],
            "LEWAT MATANG": [],
            MENTAH: [],
            "JANJANG KOSONG": [],
          },
          sub: {
            "BUAH KECIL DIBAWAH 3KG": [],
            "BUAH KECIL DIBAWAH 5KG": [],
            "TANGKAI PANJANG": [],
            "RUSAK DIMAKAN TIKUS": [],
            PARTENOKARPI: [],
            "BUAH BESAR": [],
          },
        },
        ditolak: {
          main: {
            MENTAH: [],
            "JANJANG KOSONG": [],
            "LEWAT MATANG": [],
            MATANG: [],
          },
          sub: {
            "BUAH KECIL DIBAWAH 3KG": [],
            "BUAH KECIL DIBAWAH 5KG": [],
            "TANGKAI PANJANG": [],
            "RUSAK DIMAKAN TIKUS": [],
            PARTENOKARPI: [],
            "BUAH BESAR": [],
          },
        },
      };

      const avgClassification = {
        // DITERIMA MAIN
        matang_diterima: [],
        lewat_matang_diterima: [],
        mentah_diterima: [],
        janjang_kosong_diterima: [],

        // DITERIMA SUB
        buah_kecil_5_diterima: [],
        buah_kecil_3_diterima: [],
        buah_kecil_2_diterima: [],
        tangkai_panjang_diterima: [],
        rusak_dimakan_tikus_diterima: [],
        partenokarpi_diterima: [],

        // DITOLAK MAIN
        mentah_ditolak: [],
        janjang_kosong_ditolak: [],
        lewat_matang_ditolak: [],
        matang_ditolak: [],

        // DITOLAK SUB
        buah_kecil_5_ditolak: [],
        buah_kecil_3_ditolak: [],
        buah_kecil_2_ditolak: [],
        tangkai_panjang_ditolak: [],
        rusak_dimakan_tikus_ditolak: [],
        partenokarpi_ditolak: [],

        // LEGACY ALIASES
        matang: [],
        lewat_matang: [],
        mentah: [],
        janjang_kosong: [],
        buah_kecil_5: [],
        buah_kecil_3: [],
        buah_kecil_2: [],
        tangkai_panjang: [],
        rusak_dimakan_tikus: [],
        tangkai_panjang_didenda: [],
        rusak_dimakan_tikus_didenda: [],
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
        matang_diterima: {},
        lewat_matang_diterima: {},
        mentah_diterima: {},
        janjang_kosong_diterima: {},
        buah_kecil_5_diterima: {},
        buah_kecil_3_diterima: {},
        buah_kecil_2_diterima: {},
        tangkai_panjang_diterima: {},
        rusak_dimakan_tikus_diterima: {},
        partenokarpi_diterima: {},

        mentah_ditolak: {},
        janjang_kosong_ditolak: {},
        lewat_matang_ditolak: {},
        matang_ditolak: {},
        buah_kecil_5_ditolak: {},
        buah_kecil_3_ditolak: {},
        buah_kecil_2_ditolak: {},
        tangkai_panjang_ditolak: {},
        rusak_dimakan_tikus_ditolak: {},
        partenokarpi_ditolak: {},

        // LEGACY
        matang: {},
        lewat_matang: {},
        mentah: {},
        janjang_kosong: {},
        buah_kecil_3: {},
        buah_kecil_5: {},
        buah_kecil_2: {},
        tangkai_panjang: {},
        rusak_dimakan_tikus: {},
        tangkai_panjang_didenda: {},
        rusak_dimakan_tikus_didenda: {},
      };
      let avgClassificationVendor = {
        matang_diterima: {},
        lewat_matang_diterima: {},
        mentah_diterima: {},
        janjang_kosong_diterima: {},
        buah_kecil_5_diterima: {},
        buah_kecil_3_diterima: {},
        buah_kecil_2_diterima: {},
        tangkai_panjang_diterima: {},
        rusak_dimakan_tikus_diterima: {},
        partenokarpi_diterima: {},

        mentah_ditolak: {},
        janjang_kosong_ditolak: {},
        lewat_matang_ditolak: {},
        matang_ditolak: {},
        buah_kecil_5_ditolak: {},
        buah_kecil_3_ditolak: {},
        buah_kecil_2_ditolak: {},
        tangkai_panjang_ditolak: {},
        rusak_dimakan_tikus_ditolak: {},
        partenokarpi_ditolak: {},

        // LEGACY
        matang: {},
        lewat_matang: {},
        mentah: {},
        janjang_kosong: {},
        buah_kecil_3: {},
        buah_kecil_5: {},
        buah_kecil_2: {},
        tangkai_panjang: {},
        rusak_dimakan_tikus: {},
        tangkai_panjang_didenda: {},
        rusak_dimakan_tikus_didenda: {},
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

      inspections = inspections.map((item, index) => {
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
          totalMatangRaw,
          totalLewatMatangRaw,
          totalMentahDiterimaRaw,
          totalJanjangKosongDiterimaRaw,
          totalMentahRaw,
          totalJanjangKosongRaw,
          totalLewatMatangDitolakRaw,
          totalMatangDitolakRaw,
          totalBuahBesarDiterima,
          totalBuahBesarDitolak,

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
          totalBuahKecil3Diterima,
          totalBuahKecil2Diterima,
          totalRusakDimakanTikusDiterima,
          totalPartenokarpiDiterima,
          totalPartenokarpiDitolak,

          percentMentahDiterima,
          percentJanjangKosongDiterima,
          percentBuahKecil5Diterima,
          percentBuahKecil3Diterima,
          percentBuahKecil2Diterima,
          percentRusakDimakanTikusDiterima,
          percentPartenokarpiDiterima,
          percentPartenokarpiDitolak,

          totalMatangDitolak,
          totalLewatMatangDitolak,
          percentMatangDitolak,
          percentLewatMatangDitolak,

          totalMultiple,
          percentRusakDimakanTikus,
          totalRusakDimakanTikus,
          totalBuahKecil2,
          percentBuahKecil2,
          totalTangkaiPanjangDidenda,
          totalTangkaiPanjangDitolak,
          percentTangkaiPanjangDidenda,
          percentTangkaiPanjangDitolak,
          totalRusakDimakanTikusDidenda,
          totalRusakDimakanTikusDitolak,
          percentRusakDimakanTikusDidenda,
          percentRusakDimakanTikusDitolak,
        } = utilsInspection.getTotalAndPercentClassificationNew(item, isLngm);

        grandTotalAccepted += totalAcceptedModified;
        grandTotalRejected += totalRejectedModified;
        grandTotalFined += totalFinedItem;
        grandTotalTandan += totalTandanItem;
        grandTotalMultiple += totalMultiple;

        const recordClassification = (key, count, percent) => {
          if (!avgClassification[key]) avgClassification[key] = [];
          avgClassification[key].push(count);

          if (!avgClassificationTren[key]) avgClassificationTren[key] = {};
          if (!avgClassificationTren[key][day])
            avgClassificationTren[key][day] = [];
          avgClassificationTren[key][day].push(percent);

          if (!avgClassificationVendor[key]) avgClassificationVendor[key] = {};
          if (!avgClassificationVendor[key][vendorName]) {
            avgClassificationVendor[key][vendorName] = {
              count: 0,
              percent: 0,
              total: 0,
            };
          }
          avgClassificationVendor[key][vendorName].count += 1;
          avgClassificationVendor[key][vendorName].percent += percent;
          avgClassificationVendor[key][vendorName].total += count;
        };

        // DITERIMA MAIN
        recordClassification("matang_diterima", totalMatang, percentMatang);
        recordClassification(
          "lewat_matang_diterima",
          totalLewatMatang,
          percentLewatMatang,
        );
        recordClassification(
          "mentah_diterima",
          totalMentahDiterima,
          percentMentahDiterima,
        );
        recordClassification(
          "janjang_kosong_diterima",
          totalJanjangKosongDiterima,
          percentJanjangKosongDiterima,
        );

        // DITERIMA SUB
        recordClassification(
          "buah_kecil_5_diterima",
          totalBuahKecil5Diterima,
          percentBuahKecil5Diterima,
        );
        recordClassification(
          "buah_kecil_3_diterima",
          totalBuahKecil3Diterima,
          percentBuahKecil3Diterima,
        );
        recordClassification(
          "buah_kecil_2_diterima",
          totalBuahKecil2Diterima,
          percentBuahKecil2Diterima,
        );
        recordClassification(
          "tangkai_panjang_diterima",
          totalTangkaiPanjang,
          percentTangkaiPanjang,
        );
        recordClassification(
          "rusak_dimakan_tikus_diterima",
          totalRusakDimakanTikusDiterima,
          percentRusakDimakanTikusDiterima,
        );
        recordClassification(
          "partenokarpi_diterima",
          totalPartenokarpiDiterima,
          percentPartenokarpiDiterima,
        );

        // DITOLAK MAIN
        recordClassification("mentah_ditolak", totalMentah, percentMentah);
        recordClassification(
          "janjang_kosong_ditolak",
          totalJanjangKosong,
          percentJangkos,
        );
        recordClassification(
          "lewat_matang_ditolak",
          totalLewatMatangDitolak,
          percentLewatMatangDitolak,
        );
        recordClassification(
          "matang_ditolak",
          totalMatangDitolak,
          percentMatangDitolak,
        );

        // DITOLAK SUB
        recordClassification(
          "buah_kecil_5_ditolak",
          totalBuahKecil5,
          percentBuahKecil5,
        );
        recordClassification(
          "buah_kecil_3_ditolak",
          totalBuahKecil3,
          percentBuahKecil3,
        );
        recordClassification(
          "buah_kecil_2_ditolak",
          totalBuahKecil2,
          percentBuahKecil2,
        );
        recordClassification(
          "tangkai_panjang_ditolak",
          totalTangkaiPanjangDitolak,
          percentTangkaiPanjangDitolak,
        );
        recordClassification(
          "rusak_dimakan_tikus_ditolak",
          totalRusakDimakanTikus,
          percentRusakDimakanTikus,
        );
        const recordAvgGrading = (group, section, key, count) => {
          if (!avgClassificationGrading[group])
            avgClassificationGrading[group] = {};
          if (!avgClassificationGrading[group][section])
            avgClassificationGrading[group][section] = {};
          if (!avgClassificationGrading[group][section][key])
            avgClassificationGrading[group][section][key] = [];
          avgClassificationGrading[group][section][key].push(count);
        };

        // DITERIMA MAIN (Literal classification names)
        recordAvgGrading("diterima", "main", "MATANG", totalMatangRaw);
        recordAvgGrading(
          "diterima",
          "main",
          "LEWAT MATANG",
          totalLewatMatangRaw,
        );
        recordAvgGrading("diterima", "main", "MENTAH", totalMentahDiterimaRaw);
        recordAvgGrading(
          "diterima",
          "main",
          "JANJANG KOSONG",
          totalJanjangKosongDiterimaRaw,
        );

        // DITERIMA SUB
        recordAvgGrading(
          "diterima",
          "sub",
          "BUAH KECIL DIBAWAH 2KG",
          totalBuahKecil2Diterima,
        );
        recordAvgGrading(
          "diterima",
          "sub",
          "BUAH KECIL DIBAWAH 3KG",
          totalBuahKecil3Diterima,
        );
        recordAvgGrading(
          "diterima",
          "sub",
          "BUAH KECIL DIBAWAH 5KG",
          totalBuahKecil5Diterima,
        );
        recordAvgGrading(
          "diterima",
          "sub",
          "TANGKAI PANJANG",
          totalTangkaiPanjang,
        );
        recordAvgGrading(
          "diterima",
          "sub",
          "RUSAK DIMAKAN TIKUS",
          totalRusakDimakanTikusDiterima,
        );
        recordAvgGrading(
          "diterima",
          "sub",
          "PARTENOKARPI",
          totalPartenokarpiDiterima,
        );
        recordAvgGrading(
          "diterima",
          "sub",
          "BUAH BESAR",
          totalBuahBesarDiterima,
        );

        // DITOLAK MAIN
        recordAvgGrading("ditolak", "main", "MENTAH", totalMentahRaw);
        recordAvgGrading(
          "ditolak",
          "main",
          "JANJANG KOSONG",
          totalJanjangKosongRaw,
        );
        recordAvgGrading(
          "ditolak",
          "main",
          "LEWAT MATANG",
          totalLewatMatangDitolakRaw,
        );
        recordAvgGrading("ditolak", "main", "MATANG", totalMatangDitolakRaw);

        // DITOLAK SUB
        recordAvgGrading(
          "ditolak",
          "sub",
          "BUAH KECIL DIBAWAH 2KG",
          totalBuahKecil2,
        );
        recordAvgGrading(
          "ditolak",
          "sub",
          "BUAH KECIL DIBAWAH 3KG",
          totalBuahKecil3,
        );
        recordAvgGrading(
          "ditolak",
          "sub",
          "BUAH KECIL DIBAWAH 5KG",
          totalBuahKecil5,
        );
        recordAvgGrading(
          "ditolak",
          "sub",
          "TANGKAI PANJANG",
          totalTangkaiPanjangDitolak,
        );
        recordAvgGrading(
          "ditolak",
          "sub",
          "RUSAK DIMAKAN TIKUS",
          totalRusakDimakanTikus,
        );
        recordAvgGrading(
          "ditolak",
          "sub",
          "PARTENOKARPI",
          totalPartenokarpiDitolak,
        );
        recordAvgGrading("ditolak", "sub", "BUAH BESAR", totalBuahBesarDitolak);

        // LEGACY ALIASES
        recordClassification("matang", totalMatang, percentMatang);
        recordClassification(
          "lewat_matang",
          totalLewatMatang,
          percentLewatMatang,
        );
        recordClassification("mentah", totalMentah, percentMentah);
        recordClassification(
          "janjang_kosong",
          totalJanjangKosong,
          percentJangkos,
        );
        recordClassification(
          "buah_kecil_5",
          totalBuahKecil5,
          percentBuahKecil5,
        );
        recordClassification(
          "buah_kecil_3",
          totalBuahKecil3,
          percentBuahKecil3,
        );
        recordClassification(
          "buah_kecil_2",
          totalBuahKecil2,
          percentBuahKecil2,
        );
        recordClassification(
          "tangkai_panjang",
          totalTangkaiPanjang,
          percentTangkaiPanjang,
        );
        recordClassification(
          "rusak_dimakan_tikus",
          totalRusakDimakanTikus,
          percentRusakDimakanTikus,
        );
        recordClassification(
          "tangkai_panjang_didenda",
          totalTangkaiPanjangDidenda,
          percentTangkaiPanjangDidenda,
        );
        recordClassification(
          "rusak_dimakan_tikus_didenda",
          totalRusakDimakanTikusDidenda,
          percentRusakDimakanTikusDidenda,
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
            "Buah <2kg",
          ],
          [
            percentMentah,
            // percentLewatMatang,
            percentJangkos,
            percentBuahKecil3,
            percentBuahKecil5,
            percentBuahKecil2,
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
            "Buah <2kg",
          ],
          [
            percentMentah,
            // percentLewatMatang,
            percentJangkos,
            percentBuahKecil3,
            percentBuahKecil5,
            percentBuahKecil2,
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
            "Buah <2kg",
          ],
          [
            percentMentah,
            // percentLewatMatang,
            percentJangkos,
            percentBuahKecil3,
            percentBuahKecil5,
            percentBuahKecil2,
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
              totalBuahKecil2),
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
            rejected: 0,
            fined: 0,
            matang: 0,
            lewat_matang: 0,
            tangkai_panjang: 0,
            mentah: 0,
            janjang_kosong: 0,
            buah_kecil: 0,
            buah_kecil_2: 0,
          };
        }

        averageVendor[vendorName]["count"] += 1;
        averageVendor[vendorName]["tandan"] += totalTandanItem;
        averageVendor[vendorName]["accepted"] += percentAcceptedModified;
        averageVendor[vendorName]["rejected"] += countPercentage(
          totalRejectedModified,
          totalTandanItem,
        );
        averageVendor[vendorName]["fined"] += countPercentage(
          totalFinedItem,
          totalTandanItem,
        );
        averageVendor[vendorName]["matang"] += percentMatang;
        averageVendor[vendorName]["lewat_matang"] += percentLewatMatang;
        averageVendor[vendorName]["tangkai_panjang"] += percentTangkaiPanjang;
        averageVendor[vendorName]["mentah"] += percentMentah;
        averageVendor[vendorName]["janjang_kosong"] += percentJangkos;
        averageVendor[vendorName]["buah_kecil"] += percentBuahKecil;
        averageVendor[vendorName]["buah_kecil_2"] += percentBuahKecil2;

        const duration =
          item.finish_date && item.date
            ? Math.max(
                0,
                dayjs(item.finish_date).diff(dayjs(item.date), "minute"),
              )
            : 0;
        let prevTruck = null;
        for (let i = index + 1; i < inspections.length; i++) {
          if (
            inspections[i].machine !== undefined &&
            item.machine !== undefined &&
            String(inspections[i].machine) === String(item.machine)
          ) {
            prevTruck = inspections[i];
            break;
          }
        }
        const durationGap =
          prevTruck?.finish_date && item.date
            ? dayjs(item.date).diff(dayjs(prevTruck.finish_date), "minute")
            : 0;
        const duration_gap = Math.max(0, durationGap);

        const payload = {
          _id: item._id,
          score: item.score,
          percent_accepted: percentAcceptedModified,
          percent_rejected: countPercentage(
            totalRejectedModified,
            totalTandanItem,
          ),
          percent_fined: countPercentage(
            totalFinedItem,
            totalTandanItem,
          ),
          percent_matang: percentMatang,
          percent_lewat_matang: percentLewatMatang,
          percent_mentah: percentMentah,
          percent_janjang_kosong: percentJangkos,
          percent_buah_kecil: percentBuahKecil,
          percent_buah_kecil_2: percentBuahKecil2,
          total_buah_kecil_2: totalBuahKecil2,
          percent_buah_kecil_2_diterima: percentBuahKecil2Diterima,
          total_buah_kecil_2_diterima: totalBuahKecil2Diterima,
          percent_tangkai_panjang: percentTangkaiPanjang,
          total_tandan: item["grading_result"]["total_tandan"],
          vendor_name: vendorName,
          vehicle_number: item["vehicle_number"],
          date: item.date,
          finish_date: item.finish_date,
          duration,
          duration_gap,
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
            avg_rejected: 0,
            avg_fined: 0,
            avg_matang: 0,
            avg_lewat_matang: 0,
            avg_mentah: 0,
            avg_janjang_kosong: 0,
            avg_tangkai_panjang: 0,
            avg_buah_kecil: 0,
            avg_buah_kecil_2: 0,
          };
        }
        avgAcceptedVendorHistoryDaily[vendorName][day]["trucks"] += 1;
        avgAcceptedVendorHistoryDaily[vendorName][day]["avg_tandan"] +=
          totalTandanItem;
        avgAcceptedVendorHistoryDaily[vendorName][day]["avg_accepted"] +=
          percentAcceptedModified;
        avgAcceptedVendorHistoryDaily[vendorName][day]["avg_rejected"] +=
          countPercentage(totalRejectedModified, totalTandanItem);
        avgAcceptedVendorHistoryDaily[vendorName][day]["avg_fined"] +=
          countPercentage(totalFinedItem, totalTandanItem);
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
        avgAcceptedVendorHistoryDaily[vendorName][day]["avg_buah_kecil_2"] +=
          percentBuahKecil2;
        avgAcceptedVendorHistoryDaily[vendorName][day]["avg_tangkai_panjang"] +=
          percentTangkaiPanjang;

        return payload;
      });

      const { lowest, highest } = getTopScores(inspections, 10);

      const computeSectionPercentages = (sectionObj) =>
        Object.entries(sectionObj || {}).reduce((obj, [key, value]) => {
          obj[key] = value?.length
            ? countPercentage(
                value.reduce((tot, num) => tot + Number(num || 0), 0),
                grandTotalTandan,
              )
            : 0;
          return obj;
        }, {});

      const averageGrading = {
        diterima: {
          main: computeSectionPercentages(
            avgClassificationGrading.diterima?.main,
          ),
          sub: computeSectionPercentages(
            avgClassificationGrading.diterima?.sub,
          ),
        },
        ditolak: {
          main: computeSectionPercentages(
            avgClassificationGrading.ditolak?.main,
          ),
          sub: computeSectionPercentages(avgClassificationGrading.ditolak?.sub),
        },
      };
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
            avg_rejected: (value.rejected / value.count).toLocaleString("en", {
              maximumFractionDigits: 2,
            }),
            avg_fined: (value.fined / value.count).toLocaleString("en", {
              maximumFractionDigits: 2,
            }),
            percent_rejected: (value.rejected / value.count).toLocaleString(
              "en",
              {
                maximumFractionDigits: 2,
              },
            ),
            percent_fined: (value.fined / value.count).toLocaleString("en", {
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
            avg_buah_kecil_2: (
              value.buah_kecil_2 / value.count
            ).toLocaleString("en", {
              maximumFractionDigits: 2,
            }),
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
        if (
          !isKynm &&
          ["tangkai_panjang_didenda", "rusak_dimakan_tikus_didenda"].includes(
            key,
          )
        ) {
          return o;
        }
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
              avg_rejected: dayData["avg_rejected"] / dayData["trucks"],
              avg_fined: dayData["avg_fined"] / dayData["trucks"],
              avg_matang: dayData["avg_matang"] / dayData["trucks"],
              avg_lewat_matang: dayData["avg_lewat_matang"] / dayData["trucks"],
              avg_mentah: dayData["avg_mentah"] / dayData["trucks"],
              avg_janjang_kosong:
                dayData["avg_janjang_kosong"] / dayData["trucks"],
              avg_tangkai_panjang:
                dayData["avg_tangkai_panjang"] / dayData["trucks"],
              avg_buah_kecil: dayData["avg_buah_kecil"] / dayData["trucks"],
              avg_buah_kecil_2:
                dayData["avg_buah_kecil_2"] / dayData["trucks"],
            };
          })
          .filter((e) => Boolean(e.avg_accepted));
        return obj;
      }, {});

      const avgClassificationTrenData = Object.entries(
        avgClassificationTren,
      ).reduce((obj, [c, data]) => {
        if (
          !isKynm &&
          ["tangkai_panjang_didenda", "rusak_dimakan_tikus_didenda"].includes(c)
        ) {
          return obj;
        }
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
      const { date_from, date_to, factory, company } = req.query;

      if (!date_from || !date_to) {
        return res.status(400).json({
          code: 400,
          success: false,
          message: "date_from and date_to must be filled.",
        });
      }

      // We want to query from date_from at 06:00 to date_to at 03:59 the next day.
      const startDate = dayjs(date_from).startOf("day").add(6, "hour"); // 06:00 AM on date_from
      const endDate = dayjs(date_to)
        .startOf("day")
        .add(1, "day")
        .add(3, "hour")
        .add(59, "minute")
        .add(59, "second")
        .add(999, "millisecond"); // 03:59:59.999 AM the next day after date_to

      let query = {
        date: {
          $gte: startDate.toDate(),
          $lte: endDate.toDate(),
        },
      };

      if (company) {
        query.company = company;
      }

      if (factory) {
        query.factory = factory;
      }

      const inspections = await InspectionDataModel.find(query)
        .sort({ date: 1 })
        .lean();

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
        Saturday: "Sabtu",
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
            maxDate: dayjs(dateObj),
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
        [
          "Hari",
          "Tanggal",
          "Jumlah truk",
          "Mulai Grading",
          "Selesai Grading",
          "Durasi Grading",
        ],
      ];

      // Sort keys chronologically
      const sortedDays = Object.keys(groupedData).sort(
        (a, b) => dayjs(a).valueOf() - dayjs(b).valueOf(),
      );

      sortedDays.forEach((dayKey) => {
        const group = groupedData[dayKey];
        const minD = group.minDate;
        const maxD = group.maxDate;

        const durasiMenit = maxD.diff(minD, "minute");
        const hours = Math.floor(durasiMenit / 60);
        const minutes = durasiMenit % 60;
        const durasiFormat = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;

        excelRows.push([
          group.hari,
          group.tanggal,
          group.trucks,
          minD.format("HH:mm"),
          maxD.format("HH:mm"),
          durasiFormat,
        ]);
      });

      const workbook = XLSX.utils.book_new();
      const wsRaw = XLSX.utils.aoa_to_sheet(excelRows);

      // Auto-size columns slightly
      wsRaw["!cols"] = [
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
