const srcText        = document.getElementById('src-text');
const srcLang        = document.getElementById('src-lang');
const tgtLang        = document.getElementById('tgt-lang');
const result         = document.getElementById('result');
const charCount      = document.getElementById('char-count');
const langTag        = document.getElementById('lang-tag');
const transBtn       = document.getElementById('translate-btn');
const btnLabel       = document.getElementById('btn-label');
const clearBtn       = document.getElementById('clear-btn');
const copyBtn        = document.getElementById('copy-btn');
const copyLabel      = document.getElementById('copy-label');
const ttsSrcBtn      = document.getElementById('tts-src-btn');
const ttsTgtBtn      = document.getElementById('tts-tgt-btn');
const swapBtn        = document.getElementById('swap-btn');
const toast          = document.getElementById('toast');
const darkToggle     = document.getElementById('dark-toggle');
const historySection = document.getElementById('history-section');
const historyList    = document.getElementById('history-list');
const clearHistoryBtn = document.getElementById('clear-history-btn');

let currentTranslation = '';
let toastTimer = null;

const langNames = {
  auto: 'Auto', en: 'English', es: 'Spanish', fr: 'French',
  de: 'German', it: 'Italian', pt: 'Portuguese', hi: 'Hindi',
  ja: 'Japanese', zh: 'Chinese', ar: 'Arabic', ko: 'Korean',
  ru: 'Russian', nl: 'Dutch', tr: 'Turkish'
};

// ── Dark Mode ────────────────────────────────────────────────
const html = document.documentElement;

function applyTheme(theme) {
  html.setAttribute('data-theme', theme);
  localStorage.setItem('translator-theme', theme);
}

// Restore saved preference on load
const savedTheme = localStorage.getItem('translator-theme');
if (savedTheme) {
  applyTheme(savedTheme);
} else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
  applyTheme('dark');
}

darkToggle.addEventListener('click', () => {
  const isDark = html.getAttribute('data-theme') === 'dark';
  applyTheme(isDark ? 'light' : 'dark');
});

// ── Toast ────────────────────────────────────────────────────
function showToast(msg, duration = 2200) {
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), duration);
}

// ── History ──────────────────────────────────────────────────
const HISTORY_KEY = 'translator-history';
const MAX_HISTORY = 20;

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
  } catch {
    return [];
  }
}

function saveHistoryItem(item) {
  const history = loadHistory();
  // Remove duplicate if same source+target combo exists
  const idx = history.findIndex(h => h.src === item.src && h.srcLang === item.srcLang && h.tgtLang === item.tgtLang);
  if (idx !== -1) history.splice(idx, 1);
  history.unshift(item);
  if (history.length > MAX_HISTORY) history.pop();
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

function renderHistory() {
  const history = loadHistory();

  if (history.length === 0) {
    historySection.style.display = 'none';
    return;
  }

  historySection.style.display = 'block';
  historyList.innerHTML = '';

  history.forEach((item) => {
    const el = document.createElement('div');
    el.className = 'history-item';
    el.innerHTML = `
      <span class="history-src">${escapeHtml(item.src)}</span>
      <span class="history-arrow">→</span>
      <span class="history-tgt">${escapeHtml(item.tgt)}</span>
      <span class="history-langs">${langNames[item.srcLang] || item.srcLang} → ${langNames[item.tgtLang] || item.tgtLang}</span>
    `;
    // Click to restore
    el.addEventListener('click', () => {
      srcText.value = item.src;
      srcLang.value = item.srcLang;
      tgtLang.value = item.tgtLang;
      charCount.textContent = item.src.length + ' / 5000';
      result.textContent = item.tgt;
      result.className = 'result-area';
      langTag.textContent = langNames[item.tgtLang] || item.tgtLang.toUpperCase();
      currentTranslation = item.tgt;
      transBtn.disabled = false;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    historyList.appendChild(el);
  });
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

clearHistoryBtn.addEventListener('click', () => {
  localStorage.removeItem(HISTORY_KEY);
  renderHistory();
  showToast('History cleared.');
});

// Render on page load
renderHistory();

// ── Char count ───────────────────────────────────────────────
srcText.addEventListener('input', () => {
  const len = srcText.value.length;
  charCount.textContent = len + ' / 5000';
  transBtn.disabled = len === 0;
});

// ── Clear ────────────────────────────────────────────────────
clearBtn.addEventListener('click', () => {
  srcText.value = '';
  charCount.textContent = '0 / 5000';
  result.innerHTML = '<span class="placeholder">Translation will appear here…</span>';
  result.className = 'result-area';
  langTag.textContent = '';
  currentTranslation = '';
  transBtn.disabled = true;
  srcText.focus();
});

// ── Swap ─────────────────────────────────────────────────────
swapBtn.addEventListener('click', () => {
  const srcVal = srcLang.value === 'auto' ? 'en' : srcLang.value;
  const tgtVal = tgtLang.value;

  srcLang.value = tgtVal;
  tgtLang.value = srcVal;

  if (currentTranslation) {
    srcText.value = currentTranslation;
    charCount.textContent = currentTranslation.length + ' / 5000';
    result.innerHTML = '<span class="placeholder">Press Translate to update…</span>';
    result.className = 'result-area';
    currentTranslation = '';
    langTag.textContent = '';
    transBtn.disabled = false;
  }
});

// ── Translate ────────────────────────────────────────────────
async function translate() {
  const text = srcText.value.trim();
  if (!text) return;

  const src = srcLang.value === 'auto' ? 'en' : srcLang.value;
  const tgt = tgtLang.value;

  if (src === tgt) {
    result.textContent = text;
    result.className = 'result-area';
    currentTranslation = text;
    langTag.textContent = langNames[tgt] || tgt.toUpperCase();
    saveHistoryItem({ src: text, tgt: text, srcLang: src, tgtLang: tgt });
    renderHistory();
    return;
  }

  transBtn.disabled = true;
  transBtn.classList.add('loading');
  btnLabel.textContent = 'Translating…';
  transBtn.querySelector('svg').classList.add('spin');
  result.innerHTML = '<span class="placeholder">Translating…</span>';
  result.className = 'result-area loading';
  langTag.textContent = '';

  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${src}|${tgt}`;
    const res  = await fetch(url);

    if (!res.ok) throw new Error('Network response was not ok');

    const data = await res.json();

    if (data.responseStatus === 200) {
      const translated = data.responseData.translatedText;
      currentTranslation = translated;
      result.textContent = translated;
      result.className = 'result-area';
      langTag.textContent = langNames[tgt] || tgt.toUpperCase();

      // Save to history
      saveHistoryItem({ src: text, tgt: translated, srcLang: src, tgtLang: tgt });
      renderHistory();
    } else {
      throw new Error(data.responseDetails || 'Translation failed');
    }
  } catch (err) {
    result.textContent = 'Could not translate. Check your connection and try again.';
    result.className = 'result-area error';
    currentTranslation = '';
  }

  transBtn.disabled = false;
  transBtn.classList.remove('loading');
  btnLabel.textContent = 'Translate';
  transBtn.querySelector('svg').classList.remove('spin');
}

transBtn.addEventListener('click', translate);

document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    translate();
  }
});

// ── Copy ─────────────────────────────────────────────────────
copyBtn.addEventListener('click', () => {
  if (!currentTranslation) {
    showToast('Nothing to copy yet.');
    return;
  }
  navigator.clipboard.writeText(currentTranslation)
    .then(() => {
      copyLabel.textContent = 'Copied!';
      copyBtn.classList.add('success');
      setTimeout(() => {
        copyLabel.textContent = 'Copy';
        copyBtn.classList.remove('success');
      }, 2000);
    })
    .catch(() => {
      showToast('Copy failed — try manually selecting the text.');
    });
});

// ── Text-to-speech ───────────────────────────────────────────
function speak(text, lang) {
  if (!window.speechSynthesis) {
    showToast('Text-to-speech not supported in your browser.');
    return;
  }
  if (!text || !text.trim()) {
    showToast('Nothing to read aloud.');
    return;
  }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  window.speechSynthesis.speak(u);
  showToast('Playing…');
}

ttsSrcBtn.addEventListener('click', () => {
  const lang = srcLang.value === 'auto' ? 'en' : srcLang.value;
  speak(srcText.value, lang);
});

ttsTgtBtn.addEventListener('click', () => {
  speak(currentTranslation, tgtLang.value);
});
