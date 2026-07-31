/*
 * Lead capture schema and destination configuration.
 *
 * This file is the authority for what the consultation form submits and what
 * Google Sheets stores. Keep external-tooling/google-apps-script.gs in sync.
 *
 * Google Apps Script setup:
 * 1. Deploy external-tooling/google-apps-script.gs as a web app.
 * 2. Paste the /exec deployment URL below.
 * 3. Keep transport as "opaque-form".
 *
 * Future CRM setup:
 * - Use "json" for a public endpoint that accepts JSON and supports CORS.
 * - Never place a private API key in this file. GitHub Pages is public.
 * - Use a serverless proxy when the destination requires a secret.
 */
window.JAROCH_LEAD_CONFIG = Object.freeze({
  endpoint: "https://script.google.com/macros/s/AKfycbyPAR7QlcEkUln92Jog43UQW7jM0ZFaLFAy_0DUKvel_1wBD5RbpOz8XscJwLunnvc2/exec",
  transport: "opaque-form",
  redirectUrl: "./thank-you/",
  timeoutMs: 15000,
  formName: "private-consultation",
  headers: {},

  // Bot trap — submitted with the payload but never stored when filled.
  honeypotField: "company_website",

  // HTML input name -> destination field name.
  fieldMap: {
    name: "name",
    email: "email",
    company_website: "company_website"
  },

  // Query-string attribution params appended on submit.
  trackingFields: [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
    "utm_term",
    "gclid",
    "fbclid"
  ],

  // Required destination fields (validated client-side and server-side).
  requiredFields: ["name", "email"],

  // Max string lengths enforced server-side; used when trimming payloads.
  maxLengths: {
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
  },

  // Columns written to Google Sheets. submitted_at_utc is added by the server.
  sheetColumns: [
    "submitted_at_utc",
    "name",
    "email",
    "form_name",
    "page_url",
    "referrer",
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
    "utm_term",
    "gclid",
    "fbclid",
    "user_agent",
    "submitted_at_client"
  ]
});
