/* ═══════════════════════════════════════════
   CryptoVol AI — app.js
   Handles: theme toggle, file upload,
            drag-and-drop, API call, results
═══════════════════════════════════════════ */

const API_URL = '/predict';

// ── Theme Toggle ─────────────────────────
const themeToggle = document.getElementById('theme-toggle');

themeToggle.addEventListener('click', () => {
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.theme = isDark ? 'dark' : 'light';
});

// ── Navbar shadow on scroll ───────────────
window.addEventListener('scroll', () => {
  document.getElementById('navbar').classList.toggle('shadow-md', window.scrollY > 10);
}, { passive: true });

// ── Smooth Scrolling for Anchor Links ──────
document.querySelectorAll('a[data-target]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const targetId = this.getAttribute('data-target');
    if (targetId && targetId !== 'top') {
      const targetElement = document.getElementById(targetId);
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });
});

// ── DOM refs ─────────────────────────────
const dropZone          = document.getElementById('drop-zone');
const fileInput         = document.getElementById('file-input');
const fileSelected      = document.getElementById('file-selected');
const fileSelectedName  = document.getElementById('file-selected-name');
const fileSelectedSize  = document.getElementById('file-selected-size');
const fileRemoveBtn     = document.getElementById('file-remove-btn');
const errorBox          = document.getElementById('error-box');
const errorMessage      = document.getElementById('error-message');
const predictBtn        = document.getElementById('predict-btn');
const btnText           = document.getElementById('btn-text');
const btnLoading        = document.getElementById('btn-loading');
const resultPlaceholder = document.getElementById('result-placeholder');
const resultContent     = document.getElementById('result-content');
const resultCoinAvatar  = document.getElementById('result-coin-avatar');
const resultCoinName    = document.getElementById('result-coin-name');
const resultRows        = document.getElementById('result-rows');
const volScoreValue     = document.getElementById('vol-score-value');
const riskChipLarge     = document.getElementById('risk-chip-large');
const gaugeNeedle       = document.getElementById('gauge-needle');
const detailCrypto      = document.getElementById('detail-crypto');
const detailRows        = document.getElementById('detail-rows');
const detailRaw         = document.getElementById('detail-raw');
const resetBtn          = document.getElementById('reset-btn');

let selectedFile = null;

// ── Drag & Drop ───────────────────────────
['dragenter', 'dragover'].forEach(e =>
  dropZone.addEventListener(e, ev => { ev.preventDefault(); dropZone.classList.add('border-gold', '!bg-amber-50/50', 'dark:!bg-amber-950/10'); })
);
['dragleave', 'dragend', 'drop'].forEach(e =>
  dropZone.addEventListener(e, ev => { ev.preventDefault(); dropZone.classList.remove('border-gold', '!bg-amber-50/50', 'dark:!bg-amber-950/10'); })
);
dropZone.addEventListener('drop', e => {
  const f = e.dataTransfer.files[0];
  if (f) handleFile(f);
});

// ── Click / Keyboard to browse ────────────
dropZone.addEventListener('click', e => { if (!e.target.closest('label')) fileInput.click(); });
dropZone.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); } });
fileInput.addEventListener('change', () => { if (fileInput.files[0]) handleFile(fileInput.files[0]); });
fileRemoveBtn.addEventListener('click', resetFile);

// ── File handling ─────────────────────────
function handleFile(file) {
  if (!file.name.toLowerCase().endsWith('.csv')) {
    showError('Only .csv files are accepted. Please select a valid CSV file.');
    return;
  }
  selectedFile = file;
  fileSelectedName.textContent = file.name;
  fileSelectedSize.textContent = fmtSize(file.size);
  fileSelected.classList.remove('hidden');
  fileSelected.classList.add('flex');
  dropZone.style.display = 'none';
  hideError();
  predictBtn.disabled = false;
  predictBtn.focus();
}

function resetFile() {
  selectedFile = null;
  fileInput.value = '';
  fileSelected.classList.add('hidden');
  fileSelected.classList.remove('flex');
  dropZone.style.display = '';
  predictBtn.disabled = true;
  hideError();
}

// ── Predict ───────────────────────────────
predictBtn.addEventListener('click', runPrediction);

async function runPrediction() {
  if (!selectedFile) return;
  btnText.classList.add('hidden');
  btnLoading.classList.remove('hidden');
  btnLoading.classList.add('flex');
  predictBtn.disabled = true;
  hideError();

  try {
    const fd = new FormData();
    fd.append('file', selectedFile);
    const res  = await fetch(API_URL, { method: 'POST', body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Unexpected error.');
    renderResult(data);
    document.getElementById('result-panel').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch (err) {
    showError(err.message || 'Failed to connect to API. Make sure the server is running.');
  } finally {
    btnText.classList.remove('hidden');
    btnLoading.classList.add('hidden');
    btnLoading.classList.remove('flex');
    predictBtn.disabled = false;
  }
}

// ── Render result ─────────────────────────
function renderResult(data) {
  const name  = data.crypto_name  || 'Unknown';
  const rows  = data.rows_received || 0;
  const raw   = Array.isArray(data.prediction) ? data.prediction[0] : data.prediction;
  const score = parseFloat(raw);

  resultCoinAvatar.textContent = name.charAt(0).toUpperCase();
  resultCoinName.textContent   = name;
  resultRows.textContent       = rows;
  detailCrypto.textContent     = name;
  detailRows.textContent       = rows;
  detailRaw.textContent        = isNaN(score) ? '—' : score.toFixed(6);

  animateCount(volScoreValue, 0, score, 900, v => v.toFixed(4));

  const risk = classifyRisk(score);
  applyRisk(risk, score);

  resultPlaceholder.style.display = 'none';
  resultContent.classList.remove('hidden');
  resultContent.classList.add('flex');
}

// ── Risk ──────────────────────────────────
function classifyRisk(score) {
  if (score < 0.03) return 'low';
  if (score < 0.07) return 'medium';
  return 'high';
}

const RISK_LABELS = {
  low:    '🟢 Low Volatility',
  medium: '🟡 Medium Volatility',
  high:   '🔴 High Volatility',
};

function applyRisk(risk, score) {
  riskChipLarge.textContent = RISK_LABELS[risk];
  riskChipLarge.className   = `text-sm font-bold px-4 py-2 rounded-full inline-block risk-${risk}`;

  // Needle position: Low 0-33%, Medium 33-67%, High 67-95%
  let pct;
  if (risk === 'low')    pct = Math.min((score / 0.03) * 33, 33);
  else if (risk === 'medium') pct = 33 + ((score - 0.03) / 0.04) * 34;
  else                   pct = 67 + Math.min(((score - 0.07) / 0.1) * 28, 28);

  gaugeNeedle.style.left = `calc(${pct}% - 1.5px)`;
}

// ── Reset ─────────────────────────────────
resetBtn.addEventListener('click', () => {
  resultContent.classList.add('hidden');
  resultContent.classList.remove('flex');
  resultPlaceholder.style.display = '';
  resetFile();
  document.getElementById('upload-section').scrollIntoView({ behavior: 'smooth' });
});

// ── Helpers ───────────────────────────────
function showError(msg) { errorMessage.textContent = msg; errorBox.classList.remove('hidden'); errorBox.classList.add('flex'); }
function hideError()    { errorBox.classList.add('hidden'); errorBox.classList.remove('flex'); }

function fmtSize(b) {
  if (b < 1024)        return b + ' B';
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1048576).toFixed(1) + ' MB';
}

function animateCount(el, from, to, ms, fmt) {
  if (isNaN(to)) { el.textContent = '—'; return; }
  const t0 = performance.now();
  (function tick(now) {
    const p = Math.min((now - t0) / ms, 1);
    el.textContent = fmt(from + (to - from) * (1 - Math.pow(1 - p, 3)));
    if (p < 1) requestAnimationFrame(tick);
  })(t0);
}
