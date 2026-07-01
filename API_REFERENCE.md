# Hillcore Construction OS — REST API Reference v1.0

Base URL: `https://api.hillcore.com/api/v1`
Auth: Bearer JWT in all protected endpoints

---

## AUTH

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /auth/register | Register new company + owner |
| POST | /auth/login | Login → returns JWT |
| GET  | /auth/me | Current user profile |

### POST /auth/register
```json
{ "name": "Hilson Pardini", "email": "h@hillcore.com", "password": "secret123", "companyName": "Pardini Construction" }
```
Returns: `{ access_token, userId, companyId, role }`

---

## PROJECTS

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET    | /projects | List all projects |
| GET    | /projects/:id | Project detail + tasks + RFIs |
| GET    | /projects/:id/summary | Financial summary |
| POST   | /projects | Create project |
| PUT    | /projects/:id | Update project |
| DELETE | /projects/:id | Delete project |

### POST /projects
```json
{
  "name": "PVPOA Decks 2026",
  "customerId": "uuid",
  "tradeType": "deck",
  "status": "bidding",
  "contractValue": 167900,
  "startDate": "2026-08-03",
  "endDate": "2026-11-13",
  "address": "Village 3TH, Panther Valley, NJ"
}
```

---

## CRM — LEADS

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET    | /leads | List leads (filter: ?status=proposal) |
| GET    | /leads/pipeline | Pipeline summary by stage |
| POST   | /leads | Create lead |
| PUT    | /leads/:id/status | Move lead in pipeline |

### Pipeline stages
`new → contacted → inspection → estimate → proposal → negotiation → won → lost`

---

## ESTIMATING — BUDGETS

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET    | /budgets/project/:projectId | List budgets for project |
| GET    | /budgets/:id | Budget with all items |
| POST   | /budgets/project/:projectId | Create budget |
| POST   | /budgets/:id/items | Add line item |
| PUT    | /budgets/items/:itemId | Update line item |
| DELETE | /budgets/items/:itemId | Remove line item |
| POST   | /budgets/:id/finalize | Mark as final (locks) |

### POST /budgets/project/:id
```json
{ "name": "Main budget", "overheadPct": 12, "markupPct": 18 }
```

### POST /budgets/:id/items
```json
{
  "description": "Sonotube 16\" footing — 42\" depth",
  "category": "materials",
  "unit": "EA",
  "qty": 9,
  "unitCost": 420
}
```
→ `totalCost` auto-calculated. Budget totals auto-recalculated.

---

## FINANCIAL — INVOICES

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET    | /invoices | List all invoices |
| GET    | /invoices/:id | Invoice detail with items + payments |
| POST   | /invoices/from-budget/:budgetId/project/:projectId | Generate invoice from final budget |
| POST   | /invoices/:id/payments | Record payment |

---

## HR — EMPLOYEES

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET    | /employees | List employees with certs |
| GET    | /employees/certs/expiring?days=60 | Expiring certifications |
| POST   | /employees | Add employee |
| POST   | /employees/timesheets | Log hours |

---

## PROCUREMENT

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET    | /procurement/purchase-orders | List POs (filter: ?projectId=uuid) |
| POST   | /procurement/purchase-orders | Create PO with items |
| PUT    | /procurement/purchase-orders/:id/status | Update PO status |

### PO Status flow
`draft → submitted → approved → ordered → received`

---

## HILLCORE AI

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST   | /ai/analyze-bid | Analyze bid package PDF → scope items |
| POST   | /ai/daily-log | Generate professional daily log |
| POST   | /ai/projects/:id/risks | Detect project risks |
| POST   | /ai/projects/:id/ask | Ask anything about a project |

### POST /ai/analyze-bid
```json
{ "pdfBase64": "JVBERi0xLjQK..." }
```
Returns:
```json
{
  "addresses": ["1 Killdeer Glen", "3 Killdeer Glen", ...],
  "scopeItems": [{ "description": "Sonotube 16\"", "qty": 9, "unit": "EA", "category": "materials", "spec": "Simpson 6x6 post base" }],
  "specFlags": [{ "issue": "Trex Transcend Saddle color not in current catalog", "recommendation": "Clarify with PVPOA — closest match: Tiki Torch or Rope Swing" }],
  "summary": "..."
}
```

### POST /ai/projects/:id/ask
```json
{ "question": "What is the current cost variance on materials?" }
```

---

## ERROR RESPONSES

| Code | Meaning |
|------|---------|
| 400 | Validation error — check request body |
| 401 | Unauthorized — missing or expired JWT |
| 403 | Forbidden — wrong company or insufficient role |
| 404 | Resource not found |
| 409 | Conflict — e.g. email already registered |
| 429 | Rate limit exceeded (100 req/min) |
| 500 | Internal server error |

---

## INTERACTIVE DOCS
Available at: `http://localhost:3000/api/docs` (Swagger UI)

