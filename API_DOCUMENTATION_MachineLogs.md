# API Documentation

## Machine Logs File API

### Get All Machine Logs Files
**Endpoint:** `GET /api/v4/machine-logs/file`

**Query Parameters:**
- `factory` (string, optional) - Filter by factory ID
- `machine` (string, optional) - Filter by machine name (supports regex search)
- `date` (string, optional) - Filter by exact date
- `filename` (string, optional) - Filter by filename (supports regex search)

**Response:**
```json
{
  "code": 200,
  "title": "Success",
  "message": "Success get all machine logs files",
  "data": [...],
  "meta": {
    "total_data": 50
  }
}
```

### Get Machine Logs File Detail
**Endpoint:** `GET /api/v4/machine-logs/file/:id`

**Parameters:**
- `id` (string, required) - Machine logs file ID

**Response:**
```json
{
  "code": 200,
  "title": "Success",
  "message": "Success get machine logs file detail",
  "data": {
    "_id": "...",
    "date": "22/12/2025",
    "filename": "agate_diag_log_2025-12-22.LOG",
    "filepath": "C:\\Users\\User\\Documents\\Aplikasi\\logs\\agate_diag_log_2025-12-22.LOG",
    "factory": {...},
    "machine": "Machine 1"
  }
}
```

---

## Machine Logs Data API

### Get All Machine Logs Data
**Endpoint:** `GET /api/v4/machine-logs/data`

**Query Parameters:**
- `factory` (string, optional) - Filter by factory ID
- `machine` (string, optional) - Filter by machine name (supports regex search)
- `status` (string, optional) - Filter by status (e.g., "critical")
- `subject` (string, optional) - Filter by subject (supports regex search)
- `code` (string, optional) - Filter by error code (supports regex search)
- `filename` (string, optional) - Filter by filename (supports regex search)
- `start_date` (string, optional) - Filter by start date
- `end_date` (string, optional) - Filter by end date

**Response:**
```json
{
  "code": 200,
  "title": "Success",
  "message": "Success get all machine logs data",
  "data": [...],
  "meta": {
    "total_data": 200
  }
}
```

### Get Machine Logs Data Detail
**Endpoint:** `GET /api/v4/machine-logs/data/:id`

**Parameters:**
- `id` (string, required) - Machine logs data ID

**Response:**
```json
{
  "code": 200,
  "title": "Success",
  "message": "Success get machine logs data detail",
  "data": {
    "_id": "...",
    "date": "2025-12-22T16:00:46.000Z",
    "status": "critical",
    "subject": "UTILS",
    "notes": "ITRIP",
    "code": "UTILS01-01",
    "message": "Koveyor dalam keadaan trip atau off, check emergency stop.",
    "filename": "agate_diag_log_2025-12-22.LOG",
    "factory": {...},
    "machine": "Machine 1"
  }
}
```

---

## Sync APIs

### Sync Machine Check
**Endpoint:** `POST /api/v2/sync/machine-check`

**Headers:**
- `client-key` (string, required) - Client API key

**Request Body:**
```json
{
  "questions": {...},
  "type": "daily_before",
  "date": "2025-12-22",
  "notes": "Optional notes",
  "factory": "factory_id",
  "machine": "Machine 1"
}
```

**Response:**
```json
{
  "code": 200,
  "title": "Success",
  "message": "Success sync machine check",
  "data": {
    "id": "..."
  }
}
```

### Sync Machine Logs File
**Endpoint:** `POST /api/v2/sync/machine-logs-file`

**Headers:**
- `client-key` (string, required) - Client API key

**Request Body:**
```json
{
  "date": "22/12/2025",
  "filename": "agate_diag_log_2025-12-22.LOG",
  "filepath": "C:\\Users\\User\\Documents\\Aplikasi\\logs\\agate_diag_log_2025-12-22.LOG",
  "factory": "factory_id",
  "machine": "Machine 1"
}
```

**Response:**
```json
{
  "code": 200,
  "title": "Success",
  "message": "Success sync machine logs file",
  "data": {
    "id": "..."
  }
}
```

### Sync Machine Logs Data
**Endpoint:** `POST /api/v2/sync/machine-logs-data`

**Headers:**
- `client-key` (string, required) - Client API key

**Request Body:**
```json
{
  "date": "2025-12-22 16:00:46",
  "status": "critical",
  "subject": "UTILS",
  "notes": "ITRIP",
  "code": "UTILS01-01",
  "message": "Koveyor dalam keadaan trip atau off, check emergency stop.",
  "filename": "agate_diag_log_2025-12-22.LOG",
  "factory": "factory_id",
  "machine": "Machine 1"
}
```

**Response:**
```json
{
  "code": 200,
  "title": "Success",
  "message": "Success sync machine logs data",
  "data": {
    "id": "..."
  }
}
```

---

## Notes

### Authentication
- All `/api/v4/*` endpoints require authorization token in headers
- All `/api/v2/sync/*` endpoints (except `/wa-status`) require `client-key` in headers

### Error Responses
All endpoints return errors in the following format:
```json
{
  "code": 400,
  "title": "Error Type",
  "message": "Error description"
}
```

### Upsert Behavior
All sync endpoints use `findOneAndUpdate` with `upsert: true`:
- **Machine Check**: Matches by `machine_check_id`
- **Machine Logs File**: Matches by `filename + machine + factory`
- **Machine Logs Data**: Matches by `date + code + machine + factory`

If a match is found, the record is updated. Otherwise, a new record is created.
