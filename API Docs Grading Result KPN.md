# Factory Inspection Data API Documentation

API endpoints for factories to authenticate and retrieve their grading inspection data (list & detail).

## Base URL

`/api/v5`

---

## Authentication

### 1. Factory Login

**Endpoint:** `POST /api/v5/factory-auth/login`

**Description:** Authenticates a factory using `api_key` and `api_secret`, returning a Bearer JWT token.

**Request Body:**

```json
{
  "api_key": "your_factory_api_key",
  "api_secret": "your_factory_api_secret"
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "code": 200,
  "message": {
    "title": "Success",
    "m": "Berhasil login factory"
  },
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "Bearer",
    "factory": {
      "id": "67679360b894f49d7ddb7931",
      "name": "PABRIK PKS SEJAHTERA",
      "company": "67679360b894f49d7ddb7930"
    }
  },
  "meta": {}
}
```

---

## Inspection Data

All inspection endpoints require the `Authorization` header with a valid Bearer token obtained from factory login:
`Authorization: Bearer <access_token>`

---

### 2. Get Inspection Data List (Summary)

**Endpoint:** `GET /api/v5/factory-inspection`

**Description:** Retrieves a paginated list of inspection data scoped to the authenticated factory.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ticket_number` | string | Optional | Filter by ticket number / ticket_id (case-insensitive search) |
| `delivery_number` | string | Optional | Filter by SPB number (`spb_no`) (case-insensitive search) |
| `date_from` | string | Optional | Filter by start date (YYYY-MM-DD) |
| `date_to` | string | Optional | Filter by end date (YYYY-MM-DD) |
| `page` | number | Optional | Page number (default: `1`) |
| `limit` | number | Optional | Items per page (default: `20`) |

**Example Request:**
`GET /api/v5/factory-inspection?delivery_number=208762&date_from=2026-08-01&date_to=2026-08-31&page=1&limit=20`

**Response (200 OK):**

```json
{
  "success": true,
  "code": 200,
  "message": {
    "title": "Success",
    "m": "Berhasil mendapatkan daftar data inspeksi factory"
  },
  "data": [
    {
      "_id": "66b...",
      "ticket_id": "A001",
      "spb_no": "208762",
      "status": "final",
      "grading_mode": "agate",
      "model_ai_version": null,
      "header": {
        "kode_vendor": "AT11000265",
        "nama_vendor": "KARO TELU SEMBUYAK CV.",
        "mill_code": "BU2B",
        "kelompok_pemasok": "Luar",
        "kode_pemasok": "KP-LUA-BU2B-01",
        "no_plat": "BH 8643 SF",
        "product": "Fruit Fresh Bunch",
        "waktu_mulai_timbang": "2026-08-10 09:31:36",
        "waktu_selesai_timbang": "2026-08-10 09:55:09",
        "tanggal_generate_report": "2026-08-10 10:10:00"
      },
      "timbangan": {
        "bruto_sistem_kg": 13060,
        "tare_estimasi_kg": 3980,
        "berat_brondolan_kg": 61.7,
        "netto_estimasi_kg": 9080,
        "grade_truck": "B"
      },
      "janjang": {
        "diterima": 511,
        "dikembalikan": 30,
        "dikembalikan_gross": 40,
        "bjr_kg": 13.8,
        "bjr_flag": "B"
      },
      "form_perhitungan": {
        "potongan_final_pct": 4.04
      },
      "estimasi_berat_tolakan": {
        "minimum_kg": 340.0,
        "rata2_kg": 425.0,
        "maximum_kg": 510.0,
        "total_janjang": 50,
        "per_main_class": [
          {
            "parent": "mentah",
            "multiplier": 1.0,
            "jumlah_janjang": 50,
            "minimum_kg": 340.0,
            "rata2_kg": 425.0,
            "maximum_kg": 510.0
          }
        ],
        "details": [
          {
            "parent": "mentah",
            "kategori": "buah besar",
            "kode_ukuran": "L",
            "jumlah_janjang": 10,
            "multiplier": 1.0,
            "minimum_kg": 80.0,
            "rata2_kg": 115.0,
            "maximum_kg": 150.0
          }
        ]
      },
      "date": "2026-08-10T02:31:36.000Z"
    }
  ],
  "meta": {
    "total_data": 1,
    "page": 1,
    "limit": 20,
    "total_pages": 1
  }
}
```

---

### 3. Get Inspection Data Detail

**Endpoint:** `GET /api/v5/factory-inspection/:inspectionId`
_Alternative Endpoint:_ `GET /api/v5/factory-inspection/detail?ticket_number=A001` or `GET /api/v5/factory-inspection/detail?delivery_number=208762`

**Description:** Retrieves the full grading payload for a specific inspection, matching the AGATE format.

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `inspectionId` | string | Optional | MongoDB `_id`, inspection ID, or ticket number |

**Query Parameters (Alternative / Filtering):**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ticket_number` | string | Optional | Filter detail by ticket number |
| `delivery_number` | string | Optional | Filter detail by SPB number (`spb_no`) |

**Response (200 OK):**

```json
{
  "success": true,
  "code": 200,
  "message": {
    "title": "Success",
    "m": "Berhasil mendapatkan detail data inspeksi factory"
  },
  "data": {
    "_id": "66b...",
    "ticket_id": null,
    "spb_no": "208762",
    "status": "final",
    "grading_mode": "agate",
    "model_ai_version": null,
    "header": {
      "kode_vendor": "AT11000265",
      "nama_vendor": "KARO TELU SEMBUYAK CV.",
      "mill_code": "BU2B",
      "kelompok_pemasok": "Luar",
      "kode_pemasok": "KP-LUA-BU2B-01",
      "no_plat": "BH 8643 SF",
      "product": "Fruit Fresh Bunch",
      "waktu_mulai_timbang": "2026-08-10 09:31:36",
      "waktu_selesai_timbang": "2026-08-10 09:55:09",
      "tanggal_generate_report": "2026-08-10 10:10:00"
    },
    "timbangan": {
      "bruto_sistem_kg": 13060,
      "tare_estimasi_kg": 3980,
      "berat_brondolan_kg": 61.7,
      "netto_estimasi_kg": 9080,
      "grade_truck": "B"
    },
    "janjang": {
      "diterima": 511,
      "dikembalikan": 30,
      "dikembalikan_gross": 40,
      "bjr_kg": 13.8,
      "bjr_flag": "B"
    },
    "grading_ai": [
      {
        "kode_kriteria": "A",
        "nama_kriteria": "Buah Mentah",
        "jumlah_janjang": 26,
        "tindakan": "Tolak",
        "jjg_diterima": 0,
        "jjg_ditolak": 26,
        "kg_denda": null,
        "parent": null
      },
      {
        "kode_kriteria": "O",
        "nama_kriteria": "Lewat Matang",
        "jumlah_janjang": 15,
        "tindakan": "Terima",
        "jjg_diterima": 15,
        "jjg_ditolak": 0,
        "kg_denda": 0.0,
        "parent": null
      },
      {
        "kode_kriteria": "E",
        "nama_kriteria": "Janjang Kosong",
        "jumlah_janjang": 4,
        "tindakan": "Tolak",
        "jjg_diterima": 0,
        "jjg_ditolak": 4,
        "kg_denda": null,
        "parent": null
      },
      {
        "kode_kriteria": "N",
        "nama_kriteria": "Buah Matang",
        "jumlah_janjang": 496,
        "tindakan": "Terima",
        "jjg_diterima": 496,
        "jjg_ditolak": 0,
        "kg_denda": 87.31,
        "parent": null
      }
    ],
    "buah_hitam_diterima": 10,
    "evaluasi_grader": {
      "false_accept": 23,
      "false_accept_overripe": 0,
      "false_reject": 0,
      "kuning_kunyit": 40,
      "uji_truk": true,
      "buah_hitam_max_allowed": 43
    },
    "redistribusi_potongan": [
      {
        "kode_kriteria": "A",
        "kriteria": "Buah Mentah",
        "ai_pct": 0,
        "redistribusi_pct": 0,
        "redistribusi_kg": 0,
        "parent": null
      },
      {
        "kode_kriteria": "O",
        "kriteria": "Lewat Matang",
        "ai_pct": 0,
        "redistribusi_pct": 0,
        "redistribusi_kg": 0,
        "parent": null
      },
      {
        "kode_kriteria": "E",
        "kriteria": "Janjang Kosong",
        "ai_pct": 0,
        "redistribusi_pct": 0,
        "redistribusi_kg": 0,
        "parent": null
      },
      {
        "kode_kriteria": "K",
        "kriteria": "Buah Kecil",
        "ai_pct": 0.62,
        "redistribusi_pct": 0.61,
        "redistribusi_kg": 55.39,
        "parent": "N"
      },
      {
        "kode_kriteria": "PEST",
        "kriteria": "Dimakan Tikus",
        "ai_pct": 0.19,
        "redistribusi_pct": 0.19,
        "redistribusi_kg": 17.25,
        "parent": "N"
      },
      {
        "kode_kriteria": "TP",
        "kriteria": "Tangkai Panjang",
        "ai_pct": 0.16,
        "redistribusi_pct": 0.16,
        "redistribusi_kg": 14.53,
        "parent": "N"
      },
      {
        "kode_kriteria": "TP",
        "kriteria": "Tangkai Panjang",
        "ai_pct": 0.05,
        "redistribusi_pct": 0.05,
        "redistribusi_kg": 4.5,
        "parent": "O"
      }
    ],
    "potongan_tambahan": {
      "buah_busuk_pct": null,
      "pasir_pct": null,
      "air_pct": null,
      "sampah_pct": 1.5,
      "partenokarpi_pct": null,
      "restan_pct": null,
      "abnormal_pct": null,
      "dura_pct": 0.5,
      "pesifera_pct": null,
      "lainnya_pct": 2.04,
      "total_potongan_tambahan_pct": 4.04,
      "total_potongan_ai_pct": 0.96
    },
    "form_perhitungan": {
      "form_a_pct": 19.75,
      "form_b_pct": 18.76,
      "potongan_pct": 4.04,
      "adjusted_form_b_pct": 19.75,
      "potongan_final_pct": 4.04
    },
    "estimasi_berat_tolakan": {
      "minimum_kg": 340.0,
      "rata2_kg": 425.0,
      "maximum_kg": 510.0,
      "total_janjang": 50,
      "per_main_class": [
        {
          "parent": "mentah",
          "multiplier": 1.0,
          "jumlah_janjang": 50,
          "minimum_kg": 340.0,
          "rata2_kg": 425.0,
          "maximum_kg": 510.0
        }
      ],
      "details": [
        {
          "parent": "mentah",
          "kategori": "buah besar",
          "kode_ukuran": "L",
          "jumlah_janjang": 10,
          "multiplier": 1.0,
          "minimum_kg": 80.0,
          "rata2_kg": 115.0,
          "maximum_kg": 150.0
        }
      ]
    },
    "remark": null,
    "audit": {
      "created_at": "2026-08-10T10:10:00+07:00",
      "created_by": "system:agate-weighbridge",
      "updated_at": "2026-08-10T10:10:00+07:00",
      "updated_by": "system:agate-weighbridge"
    }
  }
}
```
