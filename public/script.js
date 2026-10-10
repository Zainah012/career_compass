/* ════════════════════════════════════════════════
   AI Career & Skills Mentor — Frontend Logic
   Features: progress tracker, PDF download, share link,
   chat follow-up, confetti, skeleton loader, dark/light
   mode, salary range, skill gap badges
   ════════════════════════════════════════════════ */

// ── Element refs ──
const form            = document.getElementById('career-form');
const generateBtn     = document.getElementById('generate-demo-btn');
const formWrap        = document.getElementById('form-wrap');
const resultsWrap     = document.getElementById('results-wrap');
const resultsMeta     = document.getElementById('results-meta');
const resultsHeading  = document.getElementById('results-heading');
const roadmapOutput   = document.getElementById('roadmap-output');
const copyBtn         = document.getElementById('copy-btn');
const startOverBtn    = document.getElementById('start-over-btn');
const navToggle       = document.getElementById('nav-toggle');
const navLinks        = document.getElementById('nav-links');
const themeToggle     = document.getElementById('theme-toggle');
const downloadBtn     = document.getElementById('pdf-btn');
const shareBtn        = document.getElementById('share-btn');

// ── State ──
let currentContext = null; // { career, level, name, skills }
let progressState  = {};   // { roadmapKey: [true, false, ...] }

// ══════════════════════════════════════════
// THEME (dark / light)
// ══════════════════════════════════════════
function initTheme() {
  const saved = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  updateThemeIcon(saved);
}

function updateThemeIcon(theme) {
  if (!themeToggle) return;
  themeToggle.innerHTML = theme === 'dark'
    ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="5" stroke="currentColor" stroke-width="1.8"/><path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg> Light`
    : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg> Dark`;
}

if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    updateThemeIcon(next);
  });
}

initTheme();

// ══════════════════════════════════════════
// NAV
// ══════════════════════════════════════════
navToggle.addEventListener('click', () => {
  const open = navLinks.classList.toggle('open');
  navToggle.setAttribute('aria-expanded', String(open));
});

// ══════════════════════════════════════════
// FORM VALIDATION
// ══════════════════════════════════════════
function showError(inputEl, errorEl) {
  inputEl.classList.add('invalid');
  errorEl.classList.add('visible');
}
function clearError(inputEl, errorEl) {
  inputEl.classList.remove('invalid');
  errorEl.classList.remove('visible');
}
function validateForm() {
  let valid = true;
  const career    = document.getElementById('target-career');
  const careerErr = document.getElementById('career-error');
  if (!career.value.trim()) { showError(career, careerErr); valid = false; }
  else clearError(career, careerErr);

  const skills    = document.getElementById('current-skills');
  const skillsErr = document.getElementById('skills-error');
  if (!skills.value.trim()) { showError(skills, skillsErr); valid = false; }
  else clearError(skills, skillsErr);

  const level    = document.getElementById('experience-level');
  const levelErr = document.getElementById('level-error');
  if (!level.value) { showError(level, levelErr); valid = false; }
  else clearError(level, levelErr);

  return valid;
}

['target-career', 'current-skills', 'experience-level'].forEach(id => {
  const el  = document.getElementById(id);
  const err = document.getElementById(
    id === 'target-career' ? 'career-error' : id === 'current-skills' ? 'skills-error' : 'level-error'
  );
  el.addEventListener('input',  () => clearError(el, err));
  el.addEventListener('change', () => clearError(el, err));
});

// ══════════════════════════════════════════
// UTILS
// ══════════════════════════════════════════
function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function setLoading(on) {
  generateBtn.disabled = on;
  generateBtn.classList.toggle('loading', on);
}

function showResults() {
  resultsWrap.hidden = false;
  resultsWrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function showResultError(message) {
  resultsMeta.textContent    = 'Something went wrong';
  resultsHeading.textContent = 'Error';
  roadmapOutput.innerHTML = `<div class="error-banner"><strong>Error:</strong> ${esc(message)}</div>`;
  showResults();
}

// ══════════════════════════════════════════
// SKELETON LOADER
// ══════════════════════════════════════════
function showSkeleton() {
  resultsWrap.hidden = false;
  resultsMeta.textContent    = 'Generating…';
  resultsHeading.textContent = 'Building your roadmap';
  roadmapOutput.innerHTML = Array.from({ length: 5 }, () => `
    <div class="skeleton-step">
      <div class="skel skel-circle"></div>
      <div class="skel-body">
        <div class="skel skel-title"></div>
        <div class="skel skel-line"></div>
        <div class="skel skel-line skel-line--short"></div>
      </div>
    </div>`).join('');
  resultsWrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ══════════════════════════════════════════
// CONFETTI
// ══════════════════════════════════════════
function launchConfetti() {
  const colors = ['#ff3cac', '#784ba0', '#2b86c5', '#00d2ff', '#ff6b35', '#ffd60a'];
  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9999;overflow:hidden';
  document.body.appendChild(container);

  for (let i = 0; i < 80; i++) {
    const piece = document.createElement('div');
    const color = colors[Math.floor(Math.random() * colors.length)];
    const size  = Math.random() * 8 + 6;
    const x     = Math.random() * 100;
    const delay = Math.random() * 0.8;
    const dur   = Math.random() * 1.5 + 1.5;
    const rot   = Math.random() * 720;
    piece.style.cssText = `
      position:absolute;top:-20px;left:${x}%;
      width:${size}px;height:${size}px;
      background:${color};border-radius:${Math.random() > .5 ? '50%' : '2px'};
      animation:confettiFall ${dur}s ${delay}s ease-in forwards;
      transform:rotate(${rot}deg);
    `;
    container.appendChild(piece);
  }

  if (!document.getElementById('confetti-style')) {
    const style = document.createElement('style');
    style.id = 'confetti-style';
    style.textContent = `
      @keyframes confettiFall {
        0%   { transform: translateY(0) rotate(0deg); opacity: 1; }
        100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
      }`;
    document.head.appendChild(style);
  }

  setTimeout(() => container.remove(), 4000);
}

// ══════════════════════════════════════════
// SALARY RANGES
// ══════════════════════════════════════════
const salaryData = {
  'data scientist':     { beginner: '$65k–$85k', intermediate: '$90k–$120k', advanced: '$130k–$180k+' },
  'data science':       { beginner: '$65k–$85k', intermediate: '$90k–$120k', advanced: '$130k–$180k+' },
  'machine learning':   { beginner: '$75k–$95k', intermediate: '$100k–$135k', advanced: '$140k–$200k+' },
  'ml engineer':        { beginner: '$75k–$95k', intermediate: '$100k–$135k', advanced: '$140k–$200k+' },
  'ai engineer':        { beginner: '$75k–$95k', intermediate: '$100k–$135k', advanced: '$145k–$210k+' },
  'web developer':      { beginner: '$50k–$70k', intermediate: '$75k–$105k', advanced: '$110k–$160k+' },
  'frontend':           { beginner: '$50k–$70k', intermediate: '$75k–$105k', advanced: '$110k–$155k+' },
  'backend':            { beginner: '$55k–$75k', intermediate: '$80k–$110k', advanced: '$115k–$165k+' },
  'full stack':         { beginner: '$55k–$75k', intermediate: '$85k–$115k', advanced: '$120k–$170k+' },
  'software engineer':  { beginner: '$60k–$80k', intermediate: '$90k–$125k', advanced: '$130k–$200k+' },
  'software developer': { beginner: '$55k–$75k', intermediate: '$85k–$115k', advanced: '$120k–$175k+' },
  'ux designer':        { beginner: '$50k–$68k', intermediate: '$72k–$100k', advanced: '$105k–$145k+' },
  'ui designer':        { beginner: '$48k–$65k', intermediate: '$70k–$95k',  advanced: '$100k–$140k+' },
  'product designer':   { beginner: '$55k–$72k', intermediate: '$80k–$110k', advanced: '$115k–$155k+' },
  'cybersecurity':      { beginner: '$55k–$75k', intermediate: '$80k–$115k', advanced: '$120k–$175k+' },
  'security analyst':   { beginner: '$52k–$70k', intermediate: '$78k–$108k', advanced: '$115k–$160k+' },
  'penetration tester': { beginner: '$60k–$80k', intermediate: '$90k–$120k', advanced: '$125k–$180k+' },
  'product manager':    { beginner: '$70k–$90k', intermediate: '$100k–$135k', advanced: '$140k–$200k+' },
  'devops':             { beginner: '$60k–$80k', intermediate: '$90k–$120k', advanced: '$125k–$175k+' },
  'cloud engineer':     { beginner: '$65k–$85k', intermediate: '$95k–$130k', advanced: '$135k–$190k+' },
  'mobile developer':   { beginner: '$55k–$75k', intermediate: '$80k–$115k', advanced: '$120k–$170k+' },
  'game developer':     { beginner: '$50k–$70k', intermediate: '$75k–$105k', advanced: '$110k–$160k+' },
};

function getSalary(career, level) {
  const c = career.toLowerCase();
  const key = Object.keys(salaryData).find(k => c.includes(k));
  if (!key) return null;
  return salaryData[key][level] || null;
}

// ══════════════════════════════════════════
// SKILL GAP BADGES
// ══════════════════════════════════════════
const skillKeywords = {
  'python': ['python', 'py'],
  'javascript': ['javascript', 'js', 'node', 'react', 'vue', 'angular'],
  'sql': ['sql', 'mysql', 'postgres', 'database'],
  'git': ['git', 'github', 'version control'],
  'html/css': ['html', 'css', 'web'],
  'figma': ['figma', 'design tool', 'sketch'],
  'linux': ['linux', 'bash', 'shell', 'terminal'],
  'docker': ['docker', 'container', 'kubernetes'],
  'excel': ['excel', 'spreadsheet'],
  'communication': ['communication', 'presentation', 'writing'],
};

function detectSkillGaps(userSkills, stepTitle, stepDesc) {
  const userSkillsLower = (userSkills || '').toLowerCase();
  const stepText = (stepTitle + ' ' + stepDesc).toLowerCase();
  const gaps = [];

  for (const [skill, keywords] of Object.entries(skillKeywords)) {
    const stepMentions = keywords.some(k => stepText.includes(k));
    const userHas = keywords.some(k => userSkillsLower.includes(k));
    if (stepMentions && !userHas) gaps.push(skill);
  }
  return gaps.slice(0, 2); // max 2 badges per step
}

// ══════════════════════════════════════════
// PROGRESS TRACKER
// ══════════════════════════════════════════
function getProgressKey(career, level) {
  return `progress_${career}_${level}`.replace(/\s+/g, '_').toLowerCase();
}

function loadProgress(career, level) {
  const key = getProgressKey(career, level);
  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch { return []; }
}

function saveProgress(career, level, arr) {
  const key = getProgressKey(career, level);
  localStorage.setItem(key, JSON.stringify(arr));
}

function toggleStep(idx) {
  if (!currentContext) return;
  const { career, level } = currentContext;
  const prog = loadProgress(career, level);
  prog[idx] = !prog[idx];
  saveProgress(career, level, prog);

  const cb = document.querySelector(`.step-checkbox[data-idx="${idx}"]`);
  const stepEl = document.querySelector(`.roadmap-step[data-idx="${idx}"]`);
  if (cb) cb.classList.toggle('checked', prog[idx]);
  if (stepEl) stepEl.classList.toggle('step-done', prog[idx]);

  updateProgressBar(prog);
}

function updateProgressBar(prog) {
  const done  = prog.filter(Boolean).length;
  const total = prog.length || 5;
  const pct   = Math.round((done / total) * 100);
  const bar   = document.getElementById('progress-bar-fill');
  const label = document.getElementById('progress-label');
  if (bar)   bar.style.width = pct + '%';
  if (label) label.textContent = `${done}/${total} steps completed`;
}

// ══════════════════════════════════════════
// RENDER ROADMAP
// ══════════════════════════════════════════
function renderRoadmap(name, career, level, steps, fallback = false) {
  currentContext = { name, career, level, skills: document.getElementById('current-skills').value, steps };

  const greeting   = name.trim() ? `${esc(name.trim())}'s` : 'Your';
  const levelLabel = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' }[level] || level;
  const salary     = getSalary(career, level);
  const prog       = loadProgress(career, level);

  resultsMeta.textContent    = fallback ? `${levelLabel} · Curated` : `${levelLabel} · AI Generated`;
  resultsHeading.textContent = `${greeting} Roadmap → ${esc(career.trim())}`;

  // fallback notice
  const fallbackBanner = fallback ? `
    <div class="demo-banner" role="note">
      <span class="demo-banner-icon" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8"/>
          <path d="M12 8v5M12 16h.01" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        </svg>
      </span>
      <span>AI is temporarily busy — showing a curated roadmap. Try again in a moment for a personalised AI response.</span>
    </div>` : '';

  // progress bar
  const doneSoFar = prog.filter(Boolean).length;
  const progressHTML = `
    <div class="progress-wrap">
      <div class="progress-header">
        <span class="progress-title">Your Progress</span>
        <span class="progress-label" id="progress-label">${doneSoFar}/${steps.length} steps completed</span>
      </div>
      <div class="progress-track">
        <div class="progress-bar-fill" id="progress-bar-fill" style="width:${Math.round((doneSoFar/steps.length)*100)}%"></div>
      </div>
    </div>`;

  // steps
  const stepsHTML = `
    <div class="roadmap-steps">
      ${steps.map((step, i) => {
        const gaps     = detectSkillGaps(currentContext.skills, step.title, step.description);
        const isDone   = prog[i] || false;
        const gapBadges = gaps.map(g => `<span class="gap-badge">Learn: ${esc(g)}</span>`).join('');
        return `
        <div class="roadmap-step${isDone ? ' step-done' : ''}" data-idx="${i}">
          <div class="step-node">
            <div class="step-circle" aria-label="Step ${i + 1}">${i + 1}</div>
          </div>
          <div class="step-body">
            <div class="step-header">
              <div class="step-header-left">
                <h3 class="step-title">${esc(step.title)}</h3>
                ${gapBadges ? `<div class="gap-badges">${gapBadges}</div>` : ''}
              </div>
              <div class="step-header-right">
                <span class="step-tag">${esc(step.tag)}</span>
                <button class="step-checkbox${isDone ? ' checked' : ''}" data-idx="${i}" aria-label="Mark step ${i+1} complete" title="${isDone ? 'Mark incomplete' : 'Mark complete'}">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </button>
              </div>
            </div>
            <p class="step-desc">${esc(step.description)}</p>
            ${step.resources ? `<p class="step-resources"><strong>Resources:</strong> ${esc(step.resources)}</p>` : ''}
          </div>
        </div>`;
      }).join('')}
    </div>`;

  // salary card
  const salaryHTML = salary ? `
    <div class="salary-card">
      <div class="salary-icon" aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="2" y="7" width="20" height="14" rx="2" stroke="currentColor" stroke-width="1.8"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" stroke="currentColor" stroke-width="1.8"/><line x1="12" y1="12" x2="12" y2="16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><line x1="10" y1="14" x2="14" y2="14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
      </div>
      <div>
        <div class="salary-label">Typical salary range · ${esc(levelLabel)}</div>
        <div class="salary-value">${esc(salary)}</div>
        <div class="salary-note">Based on US market data (Glassdoor / Levels.fyi)</div>
      </div>
    </div>` : '';

  const footerNote = `
    <p class="roadmap-note" aria-label="Roadmap source note">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="1.8"/><path d="M3 9h18M9 21V9" stroke="currentColor" stroke-width="1.8"/></svg>
      ${fallback ? 'Curated roadmap' : 'AI-generated roadmap · Powered by Groq (Qwen 3)'}
    </p>`;

  roadmapOutput.innerHTML = fallbackBanner + progressHTML + stepsHTML + salaryHTML + footerNote;

  // wire up checkboxes
  document.querySelectorAll('.step-checkbox').forEach(btn => {
    btn.addEventListener('click', () => toggleStep(parseInt(btn.dataset.idx)));
  });

  showResults();
  launchConfetti();
  renderChat();
}

// ══════════════════════════════════════════
// CHAT FOLLOW-UP
// ══════════════════════════════════════════
function renderChat() {
  const chatSection = document.getElementById('chat-section');
  if (chatSection) chatSection.hidden = false;

  const chatInput = document.getElementById('chat-input');
  const chatSend  = document.getElementById('chat-send-btn');
  const chatMsgs  = document.getElementById('chat-messages');
  if (!chatInput || !chatSend || !chatMsgs) return;

  // clear previous messages & listeners by cloning
  const newSend = chatSend.cloneNode(true);
  chatSend.parentNode.replaceChild(newSend, chatSend);
  chatMsgs.innerHTML = '';

  async function sendMessage() {
    const msg = chatInput.value.trim();
    if (!msg) return;
    appendChatMsg('user', msg);
    chatInput.value = '';
    newSend.disabled = true;
    const thinking = appendChatMsg('ai', '…', true);
    try {
      const res  = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg,
          context: {
            career:  currentContext?.career  || '',
            level:   currentContext?.level   || '',
            name:    currentContext?.name    || '',
            steps:   currentContext?.steps   || [],
          },
        }),
      });
      const data = await res.json();
      thinking.remove();
      appendChatMsg('ai', data.reply || data.error || 'Sorry, something went wrong.');
    } catch {
      thinking.remove();
      appendChatMsg('ai', 'Could not reach the server. Check your connection and try again.');
    } finally {
      newSend.disabled = false;
    }
  }

  function appendChatMsg(role, text, isThinking = false) {
    const el = document.createElement('div');
    el.className = `chat-msg chat-msg--${role}${isThinking ? ' chat-thinking' : ''}`;
    el.textContent = text;
    chatMsgs.appendChild(el);
    chatMsgs.scrollTop = chatMsgs.scrollHeight;
    return el;
  }

  newSend.addEventListener('click', sendMessage);
  chatInput.addEventListener('keydown', e => { if (e.key === 'Enter') sendMessage(); });
}

// ══════════════════════════════════════════
// SHARE LINK
// ══════════════════════════════════════════
if (shareBtn) {
  shareBtn.addEventListener('click', () => {
    if (!currentContext) return;
    const params = new URLSearchParams({
      career: currentContext.career,
      level:  currentContext.level,
      name:   currentContext.name || '',
    });
    const url = `${location.origin}${location.pathname}?${params.toString()}`;
    navigator.clipboard.writeText(url).then(() => {
      shareBtn.classList.add('copied');
      const span = shareBtn.querySelector('span');
      const orig = span.textContent;
      span.textContent = 'Copied!';
      setTimeout(() => { shareBtn.classList.remove('copied'); span.textContent = orig; }, 2000);
    });
  });
}

// ── Auto-load from share link ──
function loadFromURL() {
  const params = new URLSearchParams(location.search);
  const career = params.get('career');
  const level  = params.get('level');
  const name   = params.get('name') || '';
  if (!career || !level) return;

  const careerEl = document.getElementById('target-career');
  const levelEl  = document.getElementById('experience-level');
  const nameEl   = document.getElementById('student-name');
  const skillsEl = document.getElementById('current-skills');
  if (careerEl) careerEl.value = career;
  if (levelEl)  levelEl.value  = level;
  if (nameEl)   nameEl.value   = name;
  if (skillsEl) skillsEl.value = 'Shared roadmap';

  // Auto-trigger
  setTimeout(() => generateBtn.click(), 400);
}

// ══════════════════════════════════════════
// DOWNLOAD AS PDF  (using browser print)
// ══════════════════════════════════════════
if (downloadBtn) {
  downloadBtn.addEventListener('click', () => {
    if (!currentContext) return;
    const printWin = window.open('', '_blank');
    const steps = document.querySelectorAll('.roadmap-step');
    const title = resultsHeading.textContent;

    let stepsHTML = '';
    steps.forEach((step, i) => {
      const t   = step.querySelector('.step-title')?.textContent || '';
      const tag = step.querySelector('.step-tag')?.textContent   || '';
      const d   = step.querySelector('.step-desc')?.textContent  || '';
      const r   = step.querySelector('.step-resources')?.textContent || '';
      stepsHTML += `
        <div style="margin-bottom:24px;padding:16px;border:1px solid #e2e8f0;border-radius:10px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <strong style="font-size:15px;color:#1e293b;">Step ${i+1}: ${t}</strong>
            <span style="font-size:11px;background:#f0edff;color:#6d4fc4;padding:3px 10px;border-radius:99px;">${tag}</span>
          </div>
          <p style="color:#475569;font-size:13px;line-height:1.65;margin-bottom:8px;">${d}</p>
          ${r ? `<p style="font-size:12px;color:#94a3b8;border-left:3px solid #a78bfa;padding-left:10px;">${r}</p>` : ''}
        </div>`;
    });

    const salary = document.querySelector('.salary-value')?.textContent || '';
    const salarySection = salary ? `
      <div style="margin-top:24px;padding:16px;background:#f5f3ff;border-radius:10px;display:flex;align-items:center;gap:12px;">
        <div>
          <div style="font-size:11px;color:#7c3aed;font-weight:700;text-transform:uppercase;letter-spacing:.06em;">Typical Salary</div>
          <div style="font-size:22px;font-weight:800;color:#4c1d95;">${salary}</div>
          <div style="font-size:11px;color:#94a3b8;">Based on US market data</div>
        </div>
      </div>` : '';

    printWin.document.write(`
      <!DOCTYPE html><html><head>
        <title>${title}</title>
        <style>
          body { font-family: system-ui, sans-serif; padding: 40px; color: #1e293b; max-width: 800px; margin: 0 auto; }
          h1 { font-size: 24px; font-weight: 800; margin-bottom: 4px; }
          .meta { font-size: 12px; color: #94a3b8; margin-bottom: 28px; }
          @media print { body { padding: 20px; } }
        </style>
      </head><body>
        <h1>${title}</h1>
        <div class="meta">Generated by AI Career &amp; Skills Mentor</div>
        ${stepsHTML}
        ${salarySection}
      </body></html>`);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => printWin.print(), 500);
  });
}

// ══════════════════════════════════════════
// ROADMAP REVISION
// ══════════════════════════════════════════
(function initRevise() {
  const reviseBtn   = document.getElementById('revise-btn');
  const reviseInput = document.getElementById('revise-input');
  const reviseError = document.getElementById('revise-error');

  if (!reviseBtn || !reviseInput) return;

  function setReviseLoading(on) {
    reviseBtn.disabled = on;
    reviseBtn.classList.toggle('loading', on);
  }

  function showReviseError(msg) {
    reviseError.textContent = msg;
    reviseError.hidden = false;
  }

  function clearReviseError() {
    reviseError.textContent = '';
    reviseError.hidden = true;
  }

  reviseBtn.addEventListener('click', async () => {
    clearReviseError();
    const instruction = reviseInput.value.trim();

    if (!instruction) {
      showReviseError('Please describe your constraint or change before revising.');
      reviseInput.focus();
      return;
    }
    if (instruction.length > 300) {
      showReviseError('Please keep your instruction under 300 characters.');
      return;
    }
    if (!currentContext || !Array.isArray(currentContext.steps) || currentContext.steps.length === 0) {
      showReviseError('No roadmap found to revise. Please generate one first.');
      return;
    }

    setReviseLoading(true);

    try {
      const res = await fetch('/api/roadmap/revise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          steps:       currentContext.steps,
          instruction: instruction,
          career:      currentContext.career || '',
          level:       currentContext.level  || '',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        showReviseError(data.error || 'Revision failed. Please try again.');
        return;
      }

      // Re-render with revised steps, preserving name/career/level
      reviseInput.value = '';
      renderRoadmap(
        currentContext.name   || '',
        currentContext.career || '',
        currentContext.level  || 'beginner',
        data.steps,
        false   // not a fallback — this is AI-revised
      );

      // Scroll to top of results
      document.getElementById('results-wrap')
        .scrollIntoView({ behavior: 'smooth', block: 'start' });

    } catch {
      showReviseError('Could not reach the server. Make sure the app is running and try again.');
    } finally {
      setReviseLoading(false);
    }
  });

  // Allow Enter key to trigger revision
  reviseInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') reviseBtn.click();
  });

  // Clear error on typing
  reviseInput.addEventListener('input', clearReviseError);
})();

// ══════════════════════════════════════════
// GENERATE BUTTON
// ══════════════════════════════════════════
generateBtn.addEventListener('click', async () => {
  if (!validateForm()) return;
  setLoading(true);
  showSkeleton();

  const values = {
    name:   document.getElementById('student-name').value,
    career: document.getElementById('target-career').value,
    skills: document.getElementById('current-skills').value,
    level:  document.getElementById('experience-level').value,
  };

  try {
    const res  = await fetch('/api/roadmap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    });
    const data = await res.json();

    if (!res.ok) {
      showResultError(data.error || 'Something went wrong. Please try again.');
      return;
    }

    renderRoadmap(values.name, values.career, values.level, data.steps, data.fallback);

  } catch {
    showResultError('Could not reach the server. Make sure the app is running and try again.');
  } finally {
    setLoading(false);
  }
});

form.addEventListener('submit', e => { e.preventDefault(); generateBtn.click(); });

// ══════════════════════════════════════════
// START OVER
// ══════════════════════════════════════════
startOverBtn.addEventListener('click', () => {
  resultsWrap.hidden = true;
  currentContext = null;
  form.reset();
  document.querySelectorAll('.invalid').forEach(el => el.classList.remove('invalid'));
  document.querySelectorAll('.field-error.visible').forEach(el => el.classList.remove('visible'));
  const chat = document.getElementById('chat-section');
  if (chat) { chat.hidden = true; document.getElementById('chat-messages').innerHTML = ''; }
  document.getElementById('form-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
});

// ══════════════════════════════════════════
// COPY ROADMAP
// ══════════════════════════════════════════
copyBtn.addEventListener('click', async () => {
  const steps = roadmapOutput.querySelectorAll('.roadmap-step');
  if (!steps.length) return;

  const lines = [`${resultsHeading.textContent}\n`];
  steps.forEach((step, i) => {
    const title = step.querySelector('.step-title')?.textContent || '';
    const tag   = step.querySelector('.step-tag')?.textContent   || '';
    const desc  = step.querySelector('.step-desc')?.textContent  || '';
    const res   = step.querySelector('.step-resources')?.textContent || '';
    lines.push(`Step ${i + 1}: ${title} [${tag}]`);
    lines.push(desc);
    if (res) lines.push(res);
    lines.push('');
  });

  const salary = document.querySelector('.salary-value')?.textContent;
  if (salary) lines.push(`Typical Salary: ${salary}`);
  lines.push('— Generated by AI Career & Skills Mentor');

  try {
    await navigator.clipboard.writeText(lines.join('\n'));
    copyBtn.classList.add('copied');
    const span = copyBtn.querySelector('span');
    const orig = span.textContent;
    span.textContent = 'Copied!';
    setTimeout(() => { copyBtn.classList.remove('copied'); span.textContent = orig; }, 2000);
  } catch { /* silently ignore */ }
});

// ══════════════════════════════════════════
// INIT
// ══════════════════════════════════════════
loadFromURL();
