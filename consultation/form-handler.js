(() => {
  "use strict";

  const form = document.querySelector("[data-lead-form]");
  if (!form) return;

  const submitButton = form.querySelector("[data-submit-button]");
  const buttonLabel = form.querySelector("[data-button-label]");
  const status = form.querySelector("[data-form-status]");
  const config = window.JAROCH_LEAD_CONFIG || {};
  const honeypotField = config.honeypotField || "company_website";
  const trackingFields = config.trackingFields || [];

  function setStatus(message, isError = false) {
    status.textContent = message;
    status.classList.toggle("is-error", isError);
  }

  function setLoading(isLoading) {
    submitButton.disabled = isLoading;
    submitButton.classList.toggle("is-loading", isLoading);
    buttonLabel.textContent = isLoading ? "Sending request" : "Request a private consultation";
  }

  function markValidity() {
    const controls = form.querySelectorAll("input, select, textarea");
    controls.forEach((control) => {
      if (control.type === "hidden" || control.name === honeypotField) return;
      control.setAttribute("aria-invalid", String(!control.validity.valid));
    });
  }

  function collectLead() {
    const formData = new FormData(form);
    const lead = {};
    const fieldMap = config.fieldMap || {};

    for (const [sourceName, destinationName] of Object.entries(fieldMap)) {
      lead[destinationName] = String(formData.get(sourceName) || "").trim();
    }

    const query = new URLSearchParams(window.location.search);
    for (const field of trackingFields) {
      lead[field] = query.get(field) || "";
    }

    lead.form_name = config.formName || "lead-form";
    lead.page_url = window.location.href;
    lead.referrer = document.referrer || "";
    lead.user_agent = navigator.userAgent;
    lead.submitted_at_client = new Date().toISOString();

    return lead;
  }

  function isConfigured() {
    return Boolean(
      config.endpoint &&
      !config.endpoint.includes("REPLACE_WITH") &&
      /^https:\/\//i.test(config.endpoint)
    );
  }

  async function postOpaqueForm(lead, signal) {
    const body = new URLSearchParams();
    Object.entries(lead).forEach(([key, value]) => body.set(key, String(value ?? "")));

    await fetch(config.endpoint, {
      method: "POST",
      mode: "no-cors",
      redirect: "follow",
      body,
      signal,
      keepalive: true
    });
  }

  async function postJson(lead, signal) {
    const response = await fetch(config.endpoint, {
      method: "POST",
      mode: "cors",
      headers: {
        "Content-Type": "application/json",
        ...(config.headers || {})
      },
      body: JSON.stringify(lead),
      signal,
      keepalive: true
    });

    if (!response.ok) {
      throw new Error(`Lead endpoint returned ${response.status}.`);
    }
  }

  async function submitLead(lead) {
    const controller = new AbortController();
    const timeout = window.setTimeout(
      () => controller.abort(),
      Number(config.timeoutMs) || 15000
    );

    try {
      if (config.transport === "json") {
        await postJson(lead, controller.signal);
        return;
      }

      if (config.transport === "opaque-form") {
        await postOpaqueForm(lead, controller.signal);
        return;
      }

      throw new Error(`Unsupported lead transport: ${config.transport}`);
    } finally {
      window.clearTimeout(timeout);
    }
  }

  form.addEventListener("input", (event) => {
    if (event.target.matches("input, select, textarea")) {
      event.target.removeAttribute("aria-invalid");
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setStatus("");
    markValidity();

    if (!form.checkValidity()) {
      form.reportValidity();
      setStatus("Please complete the required fields.", true);
      return;
    }

    if (!isConfigured()) {
      setStatus(
        "The form endpoint has not been connected yet. Please call (616) 443-2834 or email tim.jaroch@gmail.com.",
        true
      );
      return;
    }

    const lead = collectLead();

    // Quietly accept obvious bot submissions without writing them to the destination.
    if (lead[honeypotField]) {
      window.location.assign(new URL(config.redirectUrl, window.location.href).href);
      return;
    }

    setLoading(true);

    try {
      await submitLead(lead);
      window.location.assign(new URL(config.redirectUrl, window.location.href).href);
    } catch (error) {
      console.error("Lead submission failed:", error);
      setStatus(
        "The request could not be sent. Please try again, call (616) 443-2834, or email tim.jaroch@gmail.com.",
        true
      );
      setLoading(false);
    }
  });
})();
