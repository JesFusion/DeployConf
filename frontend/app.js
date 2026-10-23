(function () {
  'use strict';

  const form = document.getElementById('register-form');
  const nameInput = document.getElementById('fullName');
  const emailInput = document.getElementById('email');
  const roleSelect = document.getElementById('techRole');
  const submitBtn = document.getElementById('submit-btn');
  const statusEl = document.getElementById('form-status');

  const previewName = document.getElementById('preview-name');
  const previewEmail = document.getElementById('preview-email');
  const previewRole = document.getElementById('preview-role');
  const previewStatus = document.getElementById('preview-status');

  const REGISTER_ENDPOINT = '/api/register';
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // --- Rotating headline word -------------------------------------------
  // Cycles the highlighted word in the hero headline. Edit this array to
  // change which words appear.
  const rotatingWordEl = document.getElementById('rotating-word');
  const rotatingWords = ['production', 'infrastructure', 'deployments'];
  let rotatingIndex = 0;

  function rotateHeadlineWord() {
    rotatingWordEl.classList.add('is-swapping');
    setTimeout(() => {
      rotatingIndex = (rotatingIndex + 1) % rotatingWords.length;
      rotatingWordEl.textContent = rotatingWords[rotatingIndex];
      rotatingWordEl.classList.remove('is-swapping');
    }, 220);
  }

  if (rotatingWordEl && !prefersReducedMotion) {
    setInterval(rotateHeadlineWord, 2200);
  }

  // --- Dynamic conference year -------------------------------------------
  // Reads the real current year so "/25" and "2025" become "/26" and "2026"
  // automatically, and will keep advancing in future years without
  // needing a code change.
  function updateConferenceYear() {
    const fullYear = new Date().getFullYear();
    const shortYear = String(fullYear).slice(-2);
    document.querySelectorAll('.js-year-short').forEach((el) => {
      el.textContent = shortYear;
    });
    document.querySelectorAll('.js-year-full').forEach((el) => {
      el.textContent = fullYear;
    });
  }

  updateConferenceYear();
  // Re-check hourly in case the tab is left open across midnight on
  // December 31st — cheap, and means the year never goes stale.
  setInterval(updateConferenceYear, 60 * 60 * 1000);

  // --- Live manifest preview -------------------------------------------
  function updatePreview() {
    setPreviewField(previewName, nameInput.value.trim(), 'null');
    setPreviewField(previewEmail, emailInput.value.trim(), 'null');
    setPreviewField(previewRole, roleSelect.value, 'unset');
  }

  function setPreviewField(el, value, emptyPlaceholder) {
    if (value) {
      el.textContent = value;
      el.classList.add('is-set');
    } else {
      el.textContent = emptyPlaceholder;
      el.classList.remove('is-set');
    }
  }

  [nameInput, emailInput].forEach((input) => {
    input.addEventListener('input', updatePreview);
  });
  roleSelect.addEventListener('change', updatePreview);

  // --- Status helpers -----------------------------------------------------
  function setStatus(message, type) {
    statusEl.textContent = message;
    statusEl.classList.remove('success', 'error');
    if (type) statusEl.classList.add(type);
  }

  function setLoading(isLoading) {
    submitBtn.disabled = isLoading;
    submitBtn.classList.toggle('is-loading', isLoading);
  }

  function setManifestStatus(text) {
    previewStatus.textContent = text;
  }

  // --- Submit handler -------------------------------------------------
  form.addEventListener('submit', async function (event) {
    event.preventDefault();

    const payload = {
      fullName: nameInput.value.trim(),
      email: emailInput.value.trim(),
      techRole: roleSelect.value,
    };

    if (!payload.fullName || !payload.email || !payload.techRole) {
      setStatus('$ error: all fields are required before applying the manifest', 'error');
      return;
    }

    setLoading(true);
    setStatus('$ applying registration.yaml to cluster...', null);
    setManifestStatus('# applying');

    try {
      const response = await fetch(REGISTER_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorDetail = `HTTP ${response.status}`;
        try {
          const errorBody = await response.json();
          if (errorBody && errorBody.detail) {
            errorDetail = errorBody.detail;
          }
        } catch (_) {
          // response had no JSON body — fall back to the status code
        }
        throw new Error(errorDetail);
      }

      const data = await response.json().catch(() => ({}));
      const confirmationId = data.id || data.registrationId || null;

      setManifestStatus('# applied');
      const confirmationLine = confirmationId
        ? `$ registration applied — confirmation ${confirmationId}`
        : '$ registration applied — check your email for confirmation';
      setStatus(confirmationLine, 'success');
      form.reset();
      updatePreview();
    } catch (err) {
      setManifestStatus('# failed');
      setStatus(`$ error: ${err.message || 'registration failed — please try again'}`, 'error');
    } finally {
      setLoading(false);
    }
  });

  updatePreview();
})();


