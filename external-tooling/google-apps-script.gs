/**
 * Jaroch Digital lead capture endpoint for Google Sheets.
 *
 * Schema authority: consultation/lead-config.js
 * Keep sheetColumns, maxLengths, requiredFields, and honeypotField in sync.
 *
 * Setup:
 * 1. Create a Google Sheet.
 * 2. Open Extensions > Apps Script from that sheet, or create a standalone script.
 * 3. Paste this file into Code.gs.
 * 4. Add a Script Property named SHEET_ID with the spreadsheet ID.
 * 5. Run setupSheet() once and approve permissions.
 * 6. Deploy as a web app that executes as you and is accessible to anyone.
 * 7. Paste the deployment /exec URL into consultation/lead-config.js.
 */

const CONFIG = Object.freeze({
  sheetName: 'Leads',
  honeypotField: 'company_website',
  requiredFields: Object.freeze(['name', 'email']),
  maxLengths: Object.freeze({
    name: 160,
    email: 160,
    form_name: 80,
    page_url: 1000,
    referrer: 1000,
    utm_source: 200,
    utm_medium: 200,
    utm_campaign: 300,
    utm_content: 300,
    utm_term: 300,
    gclid: 300,
    fbclid: 300,
    user_agent: 600,
    submitted_at_client: 80,
    company_website: 300
  }),
  headers: Object.freeze([
    'submitted_at_utc',
    'name',
    'email',
    'form_name',
    'page_url',
    'referrer',
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_content',
    'utm_term',
    'gclid',
    'fbclid',
    'user_agent',
    'submitted_at_client'
  ])
});

function doGet() {
  return jsonResponse_({ ok: true, service: 'jaroch-digital-lead-capture' });
}

function doPost(e) {
  try {
    const input = normalizeInput_(e);

    if (input[CONFIG.honeypotField]) {
      return jsonResponse_({ ok: true });
    }

    validateLead_(input);

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);

    try {
      const sheet = getLeadSheet_();
      ensureHeaders_(sheet);

      const row = CONFIG.headers.map((header) => {
        if (header === 'submitted_at_utc') return new Date();
        return safeCell_(input[header] || '');
      });

      sheet.appendRow(row);
    } finally {
      lock.releaseLock();
    }

    return jsonResponse_({ ok: true });
  } catch (error) {
    console.error(error);
    return jsonResponse_({
      ok: false,
      error: error instanceof Error ? error.message : 'Unable to store lead.'
    });
  }
}

function setupSheet() {
  const sheet = getLeadSheet_();
  ensureHeaders_(sheet);
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, CONFIG.headers.length).setFontWeight('bold');
  sheet.autoResizeColumns(1, CONFIG.headers.length);
}

function normalizeInput_(e) {
  const parameters = e && e.parameter ? e.parameter : {};
  const input = {};

  Object.entries(CONFIG.maxLengths).forEach(([field, maxLength]) => {
    input[field] = cleanString_(parameters[field], maxLength);
  });

  input.email = input.email.toLowerCase();
  return input;
}

function validateLead_(input) {
  CONFIG.requiredFields.forEach((field) => {
    if (!input[field]) {
      throw new Error(`${field.replace('_', ' ')} is required.`);
    }
  });

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(input.email)) throw new Error('Email is invalid.');
}

function getLeadSheet_() {
  const sheetId = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  if (!sheetId) {
    throw new Error('Missing SHEET_ID Script Property.');
  }

  const spreadsheet = SpreadsheetApp.openById(sheetId);
  return spreadsheet.getSheetByName(CONFIG.sheetName) || spreadsheet.insertSheet(CONFIG.sheetName);
}

function ensureHeaders_(sheet) {
  const range = sheet.getRange(1, 1, 1, CONFIG.headers.length);
  const existing = range.getValues()[0];
  const matches = CONFIG.headers.every((header, index) => existing[index] === header);

  if (!matches) {
    if (sheet.getLastRow() > 0 && existing.some(Boolean)) {
      throw new Error('The Leads sheet headers do not match the expected schema.');
    }
    range.setValues([CONFIG.headers]);
  }
}

function cleanString_(value, maxLength) {
  return String(value == null ? '' : value).trim().slice(0, maxLength);
}

function safeCell_(value) {
  const text = String(value == null ? '' : value);
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

function jsonResponse_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
