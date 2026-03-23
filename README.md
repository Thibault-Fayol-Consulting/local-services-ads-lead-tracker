# Local Services Ads Lead Tracker

Google Ads Script that exports LSA campaign performance metrics to a Google Sheet with daily tracking and sends email summaries.

## What it does

1. Queries LSA campaign metrics (impressions, clicks, conversions, phone calls, cost) by day
2. Exports data to a Google Sheet for historical tracking
3. Computes summary KPIs across all LSA campaigns
4. Sends an HTML email summary

## Important limitation

The `local_services_lead` GAQL resource is **not accessible** from standard Google Ads Scripts. This script tracks campaign-level metrics as a proxy for lead volume. For lead-level details, use the LSA Lead Inbox in Google Ads.

## Setup

1. Create a Google Sheet and copy its URL
2. Open [Google Ads Scripts](https://ads.google.com/aw/bulk/scripts)
3. Create a new script and paste the contents of `main_en.gs` (or `main_fr.gs`)
4. Set `SPREADSHEET_URL` to your Sheet URL
5. Edit other `CONFIG` values as needed
6. Run once in test mode, review the logs
7. Set `TEST_MODE: false` and schedule (e.g., daily)

## CONFIG reference

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `TEST_MODE` | boolean | `true` | `true` = log only, `false` = log + write + email |
| `EMAIL` | string | `'contact@domain.com'` | Summary recipient email |
| `SPREADSHEET_URL` | string | `''` | Full URL of the destination Google Sheet |
| `SHEET_NAME` | string | `'LSA Tracker'` | Tab name (created automatically if missing) |
| `CAMPAIGN_NAME_CONTAINS` | string | `''` | Filter campaigns by name (empty = all LSA) |
| `DATE_RANGE` | string | `'LAST_30_DAYS'` | GAQL date range |

## How it works

- Uses `AdsApp.search()` with GAQL on `campaign` resource filtered by `LOCAL_SERVICES`
- Segments data by `segments.date` for daily granularity
- Creates or appends to a Google Sheet tab with headers
- Computes and emails aggregate KPIs (impressions, clicks, conversions, phone calls, cost)

## Requirements

- Google Ads account with Local Services Ads campaigns
- Google Ads Scripts access
- Google Sheet (for data export)

## License

MIT - Thibault Fayol Consulting
