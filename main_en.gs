/**
 * ==========================================================================
 * Local Services Ads Lead Tracker — Google Ads Script
 * ==========================================================================
 * Exports LSA campaign performance metrics to a Google Sheet with daily
 * tracking. Sends an email summary of key KPIs.
 *
 * LIMITATION: The local_services_lead GAQL resource is not accessible from
 * standard Google Ads Scripts. This script tracks campaign-level metrics
 * (clicks, conversions, cost, phone calls) as a proxy for lead volume.
 *
 * Author:  Thibault Fayol — Consultant SEA
 * Website: https://thibaultfayol.com
 * License: MIT — Thibault Fayol Consulting
 * ==========================================================================
 */

var CONFIG = {
  TEST_MODE: true,
  EMAIL: 'contact@domain.com',
  SPREADSHEET_URL: '',
  SHEET_NAME: 'LSA Tracker',
  CAMPAIGN_NAME_CONTAINS: '',
  DATE_RANGE: 'LAST_30_DAYS'
};

function main() {
  try {
    var tz = AdsApp.currentAccount().getTimeZone();
    var today = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
    var accountName = AdsApp.currentAccount().getName();

    Logger.log('=== LSA Lead Tracker ===');
    Logger.log('Account: ' + accountName);
    Logger.log('Date: ' + today);

    var query =
      'SELECT campaign.id, campaign.name, segments.date, ' +
      'metrics.clicks, metrics.conversions, metrics.cost_micros, ' +
      'metrics.phone_calls, metrics.all_conversions, metrics.impressions ' +
      'FROM campaign ' +
      'WHERE campaign.advertising_channel_type = "LOCAL_SERVICES" ' +
      'AND segments.date DURING ' + CONFIG.DATE_RANGE + ' ' +
      'AND metrics.impressions > 0';

    var rows = AdsApp.search(query);
    var data = [];

    while (rows.hasNext()) {
      var row = rows.next();
      var name = row.campaign.name;

      if (CONFIG.CAMPAIGN_NAME_CONTAINS &&
          name.indexOf(CONFIG.CAMPAIGN_NAME_CONTAINS) === -1) continue;

      data.push({
        date: row.segments.date,
        campaignId: row.campaign.id,
        campaignName: name,
        impressions: row.metrics.impressions || 0,
        clicks: row.metrics.clicks || 0,
        conversions: row.metrics.conversions || 0,
        allConversions: row.metrics.allConversions || 0,
        phoneCalls: row.metrics.phoneCalls || 0,
        cost: ((row.metrics.costMicros || 0) / 1000000).toFixed(2)
      });
    }

    Logger.log('Retrieved ' + data.length + ' row(s).');

    if (data.length === 0) {
      Logger.log('No LSA data found. Done.');
      return;
    }

    if (!CONFIG.TEST_MODE && CONFIG.SPREADSHEET_URL) {
      exportToSheet_(data, today);
    } else {
      Logger.log('[TEST MODE / No Sheet URL] Skipping Sheet export.');
    }

    var summary = computeSummary_(data);
    Logger.log('Summary — Clicks: ' + summary.totalClicks +
      ', Conversions: ' + summary.totalConversions +
      ', Cost: $' + summary.totalCost +
      ', Phone calls: ' + summary.totalPhoneCalls);

    if (!CONFIG.TEST_MODE) {
      sendSummary_(accountName, today, summary, data.length);
    }

    Logger.log('=== Done ===');

  } catch (e) {
    Logger.log('FATAL ERROR: ' + e.message);
    if (!CONFIG.TEST_MODE) {
      MailApp.sendEmail(
        CONFIG.EMAIL,
        'ERROR — LSA Lead Tracker — ' + AdsApp.currentAccount().getName(),
        'Script failed:\n' + e.message + '\n\n' + e.stack
      );
    }
  }
}

function exportToSheet_(data, today) {
  var ss = SpreadsheetApp.openByUrl(CONFIG.SPREADSHEET_URL);
  var sheet = ss.getSheetByName(CONFIG.SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEET_NAME);
    sheet.getRange(1, 1, 1, 9).setValues([[
      'Date', 'Campaign ID', 'Campaign', 'Impressions',
      'Clicks', 'Conversions', 'All Conversions', 'Phone Calls', 'Cost'
    ]]);
    sheet.getRange(1, 1, 1, 9).setFontWeight('bold');
  }

  var rows = data.map(function(d) {
    return [d.date, d.campaignId, d.campaignName, d.impressions,
      d.clicks, d.conversions, d.allConversions, d.phoneCalls, parseFloat(d.cost)];
  });

  var lastRow = sheet.getLastRow();
  sheet.getRange(lastRow + 1, 1, rows.length, 9).setValues(rows);
  Logger.log('Exported ' + rows.length + ' row(s) to Sheet.');
}

function computeSummary_(data) {
  var s = { totalClicks: 0, totalConversions: 0, totalCost: 0,
            totalPhoneCalls: 0, totalImpressions: 0, campaigns: {} };

  data.forEach(function(d) {
    s.totalClicks += d.clicks;
    s.totalConversions += d.conversions;
    s.totalCost += parseFloat(d.cost);
    s.totalPhoneCalls += d.phoneCalls;
    s.totalImpressions += d.impressions;
    s.campaigns[d.campaignName] = true;
  });

  s.totalCost = s.totalCost.toFixed(2);
  s.campaignCount = Object.keys(s.campaigns).length;
  return s;
}

function sendSummary_(accountName, date, summary, rowCount) {
  var html =
    '<h2>LSA Lead Tracker — Summary</h2>' +
    '<p><b>Account:</b> ' + accountName + '<br><b>Date:</b> ' + date +
    '<br><b>Period:</b> ' + CONFIG.DATE_RANGE +
    '<br><b>Campaigns:</b> ' + summary.campaignCount + '</p>' +
    '<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse">' +
    '<tr><td><b>Impressions</b></td><td>' + summary.totalImpressions + '</td></tr>' +
    '<tr><td><b>Clicks</b></td><td>' + summary.totalClicks + '</td></tr>' +
    '<tr><td><b>Conversions</b></td><td>' + summary.totalConversions + '</td></tr>' +
    '<tr><td><b>Phone Calls</b></td><td>' + summary.totalPhoneCalls + '</td></tr>' +
    '<tr><td><b>Total Cost</b></td><td>$' + summary.totalCost + '</td></tr>' +
    '</table>' +
    '<p style="color:#888;font-size:11px">' + rowCount + ' rows processed. ' +
    'For lead-level details, use the LSA Lead Inbox in Google Ads.</p>';

  MailApp.sendEmail({
    to: CONFIG.EMAIL,
    subject: 'LSA Tracker — ' + summary.totalConversions + ' conversions — ' + accountName,
    htmlBody: html
  });
}
