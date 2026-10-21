/* CodeRail frontend. AI features call a user-configured backend; problem search falls back to Codeforces + sample data. */
(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const defaultBase = (typeof window !== 'undefined' && window.location && window.location.protocol.startsWith('http')) ? window.location.origin : '';
  const state = { tool: 'roadmap', apiBase: localStorage.getItem('coderail_api_base') || defaultBase, lastOutput: '', outputTitle: '', cachedProblems: [] };
  const panel = $('#tool-panel');
  const toast = $('#toast');
  let toastTimer;

  const sampleProblems = [
    { id: '4A', name: 'Watermelon', rating: 800, tags: ['math'], url: 'https://codeforces.com/problemset/problem/4/A' },
    { id: '71A', name: 'Way Too Long Words', rating: 800, tags: ['strings'], url: 'https://codeforces.com/problemset/problem/71/A' },
    { id: '231A', name: 'Team', rating: 800, tags: ['brute force'], url: 'https://codeforces.com/problemset/problem/231/A' },
    { id: '50A', name: 'Domino piling', rating: 800, tags: ['greedy', 'math'], url: 'https://codeforces.com/problemset/problem/50/A' },
    { id: '158A', name: 'Next Round', rating: 800, tags: ['implementation'], url: 'https://codeforces.com/problemset/problem/158/A' },
    { id: '112A', name: 'Petya and Strings', rating: 800, tags: ['implementation', 'strings'], url: 'https://codeforces.com/problemset/problem/112/A' },
    { id: '339A', name: 'Helpful Maths', rating: 800, tags: ['greedy', 'strings'], url: 'https://codeforces.com/problemset/problem/339/A' },
    { id: '263A', name: 'Beautiful Matrix', rating: 800, tags: ['implementation'], url: 'https://codeforces.com/problemset/problem/263/A' },
    { id: '580A', name: 'Kefa and First Steps', rating: 1000, tags: ['dp', 'implementation'], url: 'https://codeforces.com/problemset/problem/580/A' },
    { id: '977B', name: 'Two-gram', rating: 1000, tags: ['strings', 'implementation'], url: 'https://codeforces.com/problemset/problem/977/B' },
    { id: '486A', name: 'Calculating Function', rating: 1000, tags: ['math'], url: 'https://codeforces.com/problemset/problem/486/A' },
    { id: '706B', name: 'Interesting drink', rating: 1100, tags: ['binary search', 'sortings'], url: 'https://codeforces.com/problemset/problem/706/B' }
  ];

  const problemKnowledge = {
    '4A': {
      title: 'Watermelon',
      hints: ['The two pieces must both have a positive whole-number weight, and both weights must be even.', 'Think about parity: the sum of two even numbers is even. The smallest valid split is 2 + 2.', 'Check the boundary first: 2 cannot be split into two positive even integers. Every even weight from 4 upward can be split into 2 and an even remainder.'],
      editorial: `Idea\nA valid split exists exactly when the watermelon weight is even and greater than 2.\n\nPython\n\nn = int(input())\nprint("YES" if n > 2 and n % 2 == 0 else "NO")\n\nC++\n\n#include <iostream>\nusing namespace std;\nint main() {\n    int n;\n    cin >> n;\n    cout << ((n > 2 && n % 2 == 0) ? "YES" : "NO") << '\\n';\n    return 0;\n}\n\nComplexity: O(1) time and O(1) extra space.`
    },
    '71A': {
      title: 'Way Too Long Words',
      hints: ['Only words longer than 10 characters need abbreviation.', 'Keep the first and last characters; the middle is replaced by the number of characters between them.', 'For a word s, when len(s) > 10, build s[0] + str(len(s) - 2) + s[-1]. Otherwise print it unchanged.'],
      editorial: `Idea\nFor each word, leave short words unchanged. For a word longer than 10 characters, print the first character, the count of inner characters, and the last character.\n\nPython\n\nn = int(input())\nfor _ in range(n):\n    s = input().strip()\n    print(s if len(s) <= 10 else f"{s[0]}{len(s) - 2}{s[-1]}")\n\nC++\n\n#include <iostream>\n#include <string>\nusing namespace std;\nint main() {\n    int n; cin >> n;\n    while (n--) {\n        string s; cin >> s;\n        if (s.size() > 10) cout << s.front() << s.size() - 2 << s.back() << '\\n';\n        else cout << s << '\\n';\n    }\n}\n\nComplexity: O(total input characters) time.`
    },
    '231A': {
      title: 'Team',
      hints: ['A problem is solved when at least two of the three friends are sure about it.', 'For each row, add the three 0/1 values and check if the total is at least 2.', 'Loop through all n rows, count rows whose sum is >= 2, and print the count.'],
      editorial: `Idea\nCount each problem for which at least two friends are confident. Each row has three binary values.\n\nPython\n\nn = int(input())\nsolved = 0\nfor _ in range(n):\n    a, b, c = map(int, input().split())\n    if a + b + c >= 2:\n        solved += 1\nprint(solved)\n\nC++\n\n#include <iostream>\nusing namespace std;\nint main() {\n    int n, solved = 0; cin >> n;\n    while (n--) { int a,b,c; cin >> a >> b >> c; if (a+b+c >= 2) ++solved; }\n    cout << solved << '\\n';\n}\n\nComplexity: O(n) time, O(1) extra space.`
    },
    '50A': {
      title: 'Domino piling',
      hints: ['Each domino covers exactly two adjacent squares.', 'To cover an n × m board with the maximum number of dominoes, pair up the squares two at a time.', 'The answer is floor((n × m) / 2), since a domino always covers two cells.'],
      editorial: `Idea\nThe board has n × m squares. Every domino covers exactly two squares, so the maximum count is the integer division of the total number of squares by two.\n\nPython\nn, m = map(int, input().split())\nprint(n * m // 2)\n\nC++\n#include <iostream>\nusing namespace std;\nint main() { int n, m; cin >> n >> m; cout << (n*m)/2 << '\\n'; }\n\nComplexity: O(1) time and O(1) extra space.`
    },
    '158A': {
      title: 'Next Round',
      hints: ['Only participants with a positive score can qualify, and the score must be at least the k-th participant’s score.', 'Read the scores in order. The threshold is the score at index k - 1 (0-based).', 'Count scores that are greater than or equal to the threshold and are greater than zero.'],
      editorial: `Idea\nThe qualifying score is the k-th score. Count every score that is at least this threshold, but exclude zero scores.\n\nPython\nn, k = map(int, input().split())\nscores = list(map(int, input().split()))\nthreshold = scores[k - 1]\nprint(sum(1 for s in scores if s >= threshold and s > 0))\n\nC++\n#include <iostream>\nusing namespace std;\nint main() {\n    int n,k; cin >> n >> k; int a[50];\n    for(int i=0;i<n;i++) cin >> a[i];\n    int threshold=a[k-1], ans=0;\n    for(int i=0;i<n;i++) if(a[i]>=threshold && a[i]>0) ans++;\n    cout << ans << '\\n';\n}\n\nComplexity: O(n) time and O(n) space for stored scores.`
    }
  };

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }
  function notify(message) {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2900);
  }
  function setBusy(button, busy, text = 'Working on it') {
    if (!button) return;
    if (busy) {
      button.dataset.oldLabel = button.innerHTML;
      button.disabled = true;
      button.innerHTML = `${escapeHtml(text)} <span class="loading-line"><i></i><i></i><i></i></span>`;
    } else {
      button.disabled = false;
      if (button.dataset.oldLabel) button.innerHTML = button.dataset.oldLabel;
    }
  }
  function getApiBase() { return state.apiBase.trim().replace(/\/+$/, ''); }
  function updateConnectionState() {
    const indicator = $('#connection-state');
    const label = $('#connection-label');
    if (indicator) indicator.classList.toggle('connected', Boolean(getApiBase()));
    if (label) label.textContent = getApiBase() ? 'API CONFIGURED' : 'PREVIEW MODE';
  }
  function toolTabMarkup(number, label, desc, title, formMarkup) {
    return `<div class="panel-topline"><span class="panel-overline">${number} / ${escapeHtml(label)}</span></div><h2 class="panel-title">${title}</h2><p class="panel-desc">${desc}</p>${formMarkup}`;
  }
  function renderPanel() {
    $$('.tool-tab').forEach(el => el.classList.toggle('active', el.dataset.tool === state.tool));
    $$('.nav-link[data-tool]').forEach(el => el.classList.toggle('selected', el.dataset.tool === state.tool));
    if (state.tool === 'roadmap') {
      panel.innerHTML = toolTabMarkup('01', 'MAKE A ROADMAP', 'Turn a topic and a rating range into a guided practice session. We’ll gather problems first, then organize a route through them.', 'Give your practice a direction.', `
        <form id="roadmap-form">
          <div class="form-grid">
            <div class="field full"><label for="roadmap-topic">Topic or pattern</label><input id="roadmap-topic" name="topic" value="greedy" placeholder="e.g. dp, greedy, binary search" required maxlength="50" /><p class="field-help">Use a Codeforces tag such as <b>dp</b>, <b>greedy</b>, <b>math</b>, <b>strings</b>, or <b>binary search</b>.</p></div>
            <div class="field"><label for="roadmap-min">Minimum rating</label><input id="roadmap-min" type="number" min="800" max="3500" step="100" value="800" required /></div>
            <div class="field"><label for="roadmap-max">Maximum rating</label><input id="roadmap-max" type="number" min="800" max="3500" step="100" value="1600" required /></div>
            <div class="field"><label for="roadmap-count">Problems to include</label><select id="roadmap-count"><option value="4" selected>4 problems · quick session</option><option value="6">6 problems · steady session</option><option value="10">10 problems · deep dive</option><option value="15">15 problems · challenge mode</option></select></div>
            <div class="field"><label for="roadmap-focus">Learning style</label><select id="roadmap-focus"><option value="balanced">Balanced — learn + practice</option><option value="concepts">Concept-first</option><option value="practice">Practice-first</option><option value="interview">Interview patterns</option></select></div>
          </div>
          <div class="form-actions"><button class="button-primary" type="submit">Build my roadmap <span>↗</span></button><span class="field-help">Problem data from Codeforces · guidance from your API when connected</span></div>
        </form>
        <div id="roadmap-result"></div>`);
      $('#roadmap-form').addEventListener('submit', submitRoadmap);
    } else if (state.tool === 'problems') {
      panel.innerHTML = toolTabMarkup('02', 'FIND A PROBLEM', 'Filter real Codeforces problems by tag, rating and quantity. Open any result directly on Codeforces, or use it as the starting point for hints.', 'Your next problem is out there.', `
        <form id="problems-form">
          <div class="form-grid">
            <div class="field full"><label for="problems-tag">Topic tag <span style="color:#a399a0;font-weight:500;text-transform:none;letter-spacing:0">(optional)</span></label><select id="problems-tag"><option value="">All topics</option><option>implementation</option><option>math</option><option>greedy</option><option>dp</option><option>data structures</option><option>brute force</option><option>constructive algorithms</option><option>binary search</option><option>sortings</option><option>strings</option><option>graphs</option><option>dfs and similar</option><option>two pointers</option><option>number theory</option><option>bitmasks</option></select></div>
            <div class="field"><label for="problems-min">Minimum rating</label><input id="problems-min" type="number" min="800" max="3500" step="100" value="800" required /></div>
            <div class="field"><label for="problems-max">Maximum rating</label><input id="problems-max" type="number" min="800" max="3500" step="100" value="1600" required /></div>
            <div class="field"><label for="problems-count">Result count</label><select id="problems-count"><option value="5">5 problems</option><option value="10" selected>10 problems</option><option value="20">20 problems</option><option value="30">30 problems</option></select></div>
            <div class="field"><label for="problems-order">Order by</label><select id="problems-order"><option value="rating-asc">Rating · easiest first</option><option value="rating-desc">Rating · hardest first</option><option value="random">Mixed practice</option></select></div>
          </div>
          <div class="form-actions"><button class="button-primary" type="submit">Find problems <span>⌕</span></button><button class="button-secondary" id="download-problems" type="button">Export list ↓</button></div>
        </form>
        <div id="problems-result"><div class="empty-output"><span class="empty-icon">⌕</span><div>Set your filters and find a handful of problems to work through. Your results will appear here.</div></div></div>`);
      $('#problems-form').addEventListener('submit', submitProblemSearch);
      $('#download-problems').addEventListener('click', () => downloadProblems(state.cachedProblems));
    } else if (state.tool === 'hints') {
      panel.innerHTML = toolTabMarkup('03', 'GET A NUDGE', 'Stuck is a normal stage of problem solving. Start with a small observation, then ask for a stronger hint only when you need it.', 'Need a nudge, not the answer?', `
        <form id="hints-form">
          <div class="form-grid">
            <div class="field full"><label for="hints-id">Codeforces problem ID</label><input id="hints-id" name="problem_id" placeholder="e.g. 4A, 71A, 1899A" required maxlength="24" autocapitalize="characters" /><p class="field-help">Find the ID in the problem URL, for example <code>codeforces.com/problemset/problem/4/A</code>.</p></div>
          </div>
          <div class="form-actions"><button class="button-primary" type="submit">Give me 3 hints <span>✳</span></button><a class="button-quiet" href="https://codeforces.com/problemset" target="_blank" rel="noreferrer">Find a problem ↗</a></div>
        </form>
        <div id="hints-result"><div class="empty-output"><span class="empty-icon">✳</span><div>Your hint ladder will show here: an observation, an algorithm direction, then high-level steps. No full solution in the first nudge.</div></div></div>`);
      $('#hints-form').addEventListener('submit', submitHints);
    } else {
      panel.innerHTML = toolTabMarkup('04', 'UNPACK THE SOLUTION', 'Review the core idea, complexity and implementation pitfalls. Paste your attempt to make the explanation more useful once an AI backend is connected.', 'Let’s make the solution click.', `
        <form id="editorial-form">
          <div class="form-grid">
            <div class="field full"><label for="editorial-id">Codeforces problem ID</label><input id="editorial-id" name="problem_id" placeholder="e.g. 4A, 71A, 1899A" required maxlength="24" autocapitalize="characters" /></div>
            <div class="field full"><label for="editorial-code">Your attempt <span style="font-weight:500;text-transform:none;letter-spacing:0;color:#9a8a94">(optional)</span></label><textarea id="editorial-code" name="my_code" spellcheck="false" placeholder="Paste your C++, Python or other attempt here…"></textarea><p class="field-help">Your code is sent only to the API URL you configure. In preview mode, no code is transmitted.</p></div>
          </div>
          <div class="form-actions"><button class="button-primary" type="submit">Explain the solution <span>↗</span></button></div>
        </form>
        <div id="editorial-result"><div class="empty-output"><span class="empty-icon">✎</span><div>Choose a problem ID to get the main idea, time and space complexity, Python/C++ solutions and common pitfalls.</div></div></div>`);
      $('#editorial-form').addEventListener('submit', submitEditorial);
    }
  }

  function sanitizeCoachContent(raw) {
    if (!raw) return '';
    let text = String(raw).trim();
    // Strip conversational AI preambles
    text = text.replace(/^(?:Here\s+(?:is|are)|Here\'s|Sure,|Below\s+is|Certainly!|Welcome\s+to|In\s+this\s+roadmap)[^\n]*\n+/i, '').trim();
    text = text.replace(/^---\s*\n+/g, '').trim();
    return text;
  }

  function fallbackMarkdownParse(text) {
    let html = escapeHtml(text);
    html = html.replace(/```([a-z0-9]*)\n([\s\S]*?)```/gi, (_, lang, code) => `<pre><code class="language-${lang}">${code}</code></pre>`);
    html = html.replace(/^#### (.*?)$/gm, '<h4>$1</h4>');
    html = html.replace(/^### (.*?)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.*?)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.*?)$/gm, '<h1>$1</h1>');
    html = html.replace(/^---$/gm, '<hr/>');
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    html = html.replace(/^\* (.*?)$/gm, '<li>$1</li>');
    html = html.replace(/^- (.*?)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>');
    html = html.replace(/\n\n+/g, '</p><p>');
    return `<p>${html}</p>`.replace(/<p>\s*<(h[1-4]|pre|ul|hr)/gi, '<$1').replace(/<\/(h[1-4]|pre|ul|hr)>\s*<\/p>/gi, '</$1>');
  }

  function renderFormattedCoachContent(markdownText) {
    const clean = sanitizeCoachContent(markdownText);
    if (typeof window.marked !== 'undefined' && typeof window.marked.parse === 'function') {
      try {
        return window.marked.parse(clean, { breaks: true, gfm: true });
      } catch (e) {
        console.warn('Marked parse error, using fallback:', e);
      }
    }
    return fallbackMarkdownParse(clean);
  }

  function outputMarkup(title, content, label = 'COACH’S GAME PLAN ✦') {
    const cleanText = sanitizeCoachContent(content);
    state.lastOutput = cleanText;
    state.outputTitle = title;
    const formattedHtml = renderFormattedCoachContent(cleanText);
    return `<section class="generated-output"><div class="output-head"><strong>${escapeHtml(label)}</strong><div class="output-actions"><button class="mini-action" data-action="copy-output">Copy text</button><button class="mini-action" data-action="download-output">Download .txt</button></div></div><div class="output-content" id="generated-text">${formattedHtml}</div></section>`;
  }
  function wireOutputActions(root) {
    const copy = $('[data-action="copy-output"]', root);
    const download = $('[data-action="download-output"]', root);
    if (copy) copy.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(state.lastOutput); notify('Copied to clipboard.'); }
      catch { fallbackCopy(state.lastOutput); }
    });
    if (download) download.addEventListener('click', () => saveText(`${slug(state.outputTitle)}.txt`, state.lastOutput));
  }
  function slug(s) { return String(s || 'coderail-notes').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'coderail-notes'; }
  function saveText(filename, text) {
    const blob = new Blob([String(text)], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); notify(`Saved ${filename}`);
  }
  function fallbackCopy(text) {
    const area = document.createElement('textarea'); area.value = text; area.style.position = 'fixed'; area.style.opacity = '0'; document.body.appendChild(area); area.select();
    try { document.execCommand('copy'); notify('Copied to clipboard.'); } catch { notify('Copy unavailable here — select the result text instead.'); }
    area.remove();
  }
  function normalizeId(id) { return String(id || '').trim().toUpperCase().replace(/\s+/g, ''); }
  function validRatingRange(min, max) { return Number.isFinite(min) && Number.isFinite(max) && min >= 0 && max >= min && max <= 4000; }
  function mapCfProblem(p) {
    const contest = p.contestId, index = p.index;
    return { id: `${contest}${index}`, contestId: contest, index, name: p.name || 'Untitled problem', rating: p.rating || 0, tags: p.tags || [], url: `https://codeforces.com/problemset/problem/${contest}/${index}` };
  }
  async function getProblems({ tag = '', min = 800, max = 1600, count = 10, order = 'rating-asc' } = {}) {
    const params = new URLSearchParams(); if (tag) params.set('tag', tag); params.set('min_rating', String(min)); params.set('max_rating', String(max)); params.set('count', String(count));
    // Prefer a configured adapter for consistency; public Codeforces API is the fallback.
    if (getApiBase()) {
      try {
        const res = await fetch(`${getApiBase()}/api/problems?${params.toString()}`, { headers: { 'Accept': 'application/json' } });
        if (res.ok) {
          const data = await res.json();
          const source = Array.isArray(data) ? data : (data.problems || data.result?.problems || []);
          const normalized = source.map(p => p.url ? p : mapCfProblem(p)).filter(p => p.rating >= min && p.rating <= max && (!tag || (p.tags || []).includes(tag)));
          state.problemSource = 'Configured API';
          return orderProblems(normalized, order).slice(0, count);
        }
      } catch (e) { console.info('Backend problem endpoint unavailable; trying Codeforces API.', e); }
    }
    try {
      const cfParams = new URLSearchParams(); if (tag) cfParams.set('tags', tag);
      const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 12000);
      const res = await fetch(`https://codeforces.com/api/problemset.problems?${cfParams.toString()}`, { signal: controller.signal, headers: { 'Accept': 'application/json' } });
      clearTimeout(timeout);
      if (!res.ok) throw new Error(`Codeforces returned HTTP ${res.status}`);
      const data = await res.json();
      if (data.status !== 'OK') throw new Error(data.comment || 'Codeforces API returned an error.');
      let filtered = data.result.problems.filter(p => p.rating && p.rating >= min && p.rating <= max && (!tag || (p.tags || []).includes(tag))).map(mapCfProblem);
      filtered = orderProblems(filtered, order);
      state.problemSource = 'Codeforces API';
      return filtered.slice(0, count);
    } catch (e) {
      console.warn('Codeforces API unavailable; using local sample set.', e);
      state.problemSource = 'Sample problems';
      const filtered = sampleProblems.filter(p => p.rating >= min && p.rating <= max && (!tag || p.tags.includes(tag)));
      return orderProblems(filtered, order).slice(0, count);
    }
  }
  function orderProblems(problems, order) {
    const copy = [...problems];
    if (order === 'rating-desc') return copy.sort((a, b) => (b.rating || 0) - (a.rating || 0) || a.name.localeCompare(b.name));
    if (order === 'random') return copy.sort(() => Math.random() - .5);
    return copy.sort((a, b) => (a.rating || 0) - (b.rating || 0) || a.name.localeCompare(b.name));
  }
  function renderProblems(problems, parent, label = '') {
    state.cachedProblems = problems;
    if (!problems.length) {
      parent.innerHTML = `<div class="notice">No problems matched these exact filters. Try widening the rating range or removing the tag.</div>`; return;
    }
    const sourceText = label || state.problemSource || 'Codeforces';
    parent.innerHTML = `<div class="results-head"><h3>Problems to try</h3><span class="results-count">${problems.length} RESULTS · ${escapeHtml(sourceText.toUpperCase())}</span></div><div class="problem-list">${problems.map(p => `<article class="problem-item"><div class="problem-rating">${p.rating || '—'}</div><div class="problem-info"><div class="problem-name">${escapeHtml(p.name)} <span style="font-family:var(--mono);font-size:9px;color:#a895a0;font-weight:500">${escapeHtml(p.id || '')}</span></div><div class="problem-meta">${(p.tags || []).slice(0, 4).map(tag => `<span class="tag-pill">${escapeHtml(tag)}</span>`).join('')}</div></div><a class="problem-open" href="${escapeHtml(p.url || '#')}" target="_blank" rel="noreferrer" aria-label="Open ${escapeHtml(p.name)} on Codeforces">↗</a></article>`).join('')}</div>`;
  }
  async function submitProblemSearch(event) {
    event.preventDefault();
    const button = $('#problems-form button[type="submit"]');
    const tag = $('#problems-tag').value.trim(); const min = Number($('#problems-min').value); const max = Number($('#problems-max').value); const count = Number($('#problems-count').value); const order = $('#problems-order').value;
    const result = $('#problems-result');
    if (!validRatingRange(min, max)) { result.innerHTML = '<div class="notice">Check the rating range: the minimum must not exceed the maximum.</div>'; return; }
    setBusy(button, true, 'Finding problems');
    result.innerHTML = '<div class="empty-output"><span class="empty-icon">⌕</span><div>Looking through the problem set<span class="loading-line"><i></i><i></i><i></i></span></div></div>';
    try {
      const problems = await getProblems({ tag, min, max, count, order });
      renderProblems(problems, result);
      if (state.problemSource === 'Sample problems') notify('Showing the built-in sample set because Codeforces could not be reached.');
    } catch (e) { result.innerHTML = `<div class="notice">${escapeHtml(e.message || 'Could not load problems.')}</div>`; }
    finally { setBusy(button, false); }
  }
  function downloadProblems(problems) {
    if (!problems?.length) { notify('Find some problems first, then export the list.'); return; }
    const text = `CODERAIL PROBLEM SET\nGenerated: ${new Date().toLocaleString()}\n\n${problems.map((p, i) => `${i + 1}. [${p.rating}] ${p.id} — ${p.name}\n   Tags: ${(p.tags || []).join(', ')}\n   URL: ${p.url}`).join('\n\n')}\n`;
    saveText(`coderail-problem-set-${Date.now()}.txt`, text);
  }
  function roadmapFallback(topic, problems, focus) {
    const labels = { balanced: 'Balance concept learning with problem-solving.', concepts: 'Read the core pattern first, then solve one targeted example at a time.', practice: 'Spend most of the session attempting problems before reading explanations.', interview: 'Focus on recognizing reusable patterns and explaining complexity out loud.' };
    const list = problems.length ? problems : sampleProblems.slice(0, 4);
    return `CODERAIL ROADMAP — ${topic.toUpperCase()}\n\nYOUR SESSION\n${labels[focus] || labels.balanced}\n\n1. Warm up (10–15 min)\nWrite down what the ${topic} pattern is meant to solve. Note the input constraints and the simplest brute-force approach.\n\n2. Recognize the pattern (15–20 min)\nLook for repeated decisions, ordering properties, or a monotonic condition. Before coding, say why your candidate approach should work.\n\n3. Guided practice\n${list.map((p, i) => `${i + 1}. [${p.rating}] ${p.id} — ${p.name}\n   ${p.url}\n   Suggested goal: ${i === 0 ? 'solve independently and explain the core observation' : i === 1 ? 'compare this with the previous problem' : 'identify what changes in the constraints or pattern'}`).join('\n')}\n\n4. Review (10 min)\nFor every problem, write one sentence for the key insight, one sentence for complexity, and one mistake you will avoid next time. Revisit a failed attempt before reading the full editorial.\n\nCOMMON MISTAKES TO WATCH\n• Coding before checking constraints and edge cases.\n• Memorizing one solution instead of naming the pattern.\n• Skipping a manual trace on the smallest and largest relevant inputs.\n\nNOTE\nThis is a local preview generated by the frontend. Connect a Gemini-backed API to get an AI-generated, topic-specific roadmap.`;
  }
  async function postJson(path, payload) {
    if (!getApiBase()) throw new Error('No API configured');
    const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 45000);
    try {
      const response = await fetch(`${getApiBase()}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(payload), signal: controller.signal });
      if (!response.ok) throw new Error(`API returned HTTP ${response.status}`);
      const data = await response.json();
      return data;
    } finally { clearTimeout(timeout); }
  }
  function getTextFromApi(data, keys) {
    if (typeof data === 'string') return data;
    for (const key of keys) if (typeof data?.[key] === 'string') return data[key];
    return JSON.stringify(data, null, 2);
  }
  async function submitRoadmap(event) {
    event.preventDefault();
    const button = $('#roadmap-form button[type="submit"]'); const result = $('#roadmap-result');
    const topic = $('#roadmap-topic').value.trim(); const min = Number($('#roadmap-min').value); const max = Number($('#roadmap-max').value); const count = Number($('#roadmap-count').value); const focus = $('#roadmap-focus').value;
    if (!topic) { notify('Add a topic first.'); return; }
    if (!validRatingRange(min, max)) { notify('Check your rating range.'); return; }
    setBusy(button, true, 'Building your roadmap');
    result.innerHTML = '<div class="empty-output"><span class="empty-icon">✦</span><div>Picking a few good starting points and arranging the steps<span class="loading-line"><i></i><i></i><i></i></span></div></div>';
    try {
      const problems = await getProblems({ tag: topic, min, max, count, order: 'rating-asc' });
      let roadmap;
      if (getApiBase()) {
        try {
          const data = await postJson('/api/roadmaps', { topic, min_rating: min, max_rating: max, count, focus, problems });
          roadmap = getTextFromApi(data, ['roadmap', 'text', 'content']);
        } catch (err) { console.warn('Roadmap API call failed; showing local preview.', err); }
      }
      if (!roadmap) roadmap = roadmapFallback(topic, problems, focus);
      result.innerHTML = outputMarkup(`${topic}-roadmap`, roadmap, 'COACH’S GAME PLAN ✦');
      wireOutputActions(result);
    } catch (e) {
      result.innerHTML = `<div class="notice">Could not build this roadmap: ${escapeHtml(e.message || 'unknown error')}</div>`;
    } finally { setBusy(button, false); }
  }
  function hintsFallback(problemId) {
    const p = problemKnowledge[problemId];
    if (p) return `PROBLEM ${problemId} — ${p.title}\n\nHINT 1 · OBSERVATION\n${p.hints[0]}\n\nHINT 2 · ALGORITHM DIRECTION\n${p.hints[1]}\n\nHINT 3 · HIGH-LEVEL STEPS\n${p.hints[2]}\n\nTry to implement the idea yourself before opening the editorial. These built-in hints cover a small set of common beginner problems.`;
    return `PROBLEM ${problemId} — HINT LADDER\n\n### Hint 1: The Observation\nRestate the task in your own words. Identify exactly what the output depends on, then test the smallest example by hand.\n\n### Hint 2: Algorithm Direction\nRead the constraints and estimate which time complexity is feasible. Look for a repeated operation, ordering property, or state that can be updated incrementally.\n\n### Hint 3: High-Level Steps\n1. Choose a representation for the input.\n2. State the invariant your algorithm maintains.\n3. Process the input, handling boundary cases explicitly.\n4. Test one normal case and at least two edge cases.`;
  }
  async function submitHints(event) {
    event.preventDefault(); const button = $('#hints-form button[type="submit"]'); const result = $('#hints-result'); const problemId = normalizeId($('#hints-id').value);
    if (!problemId) return;
    setBusy(button, true, 'Thinking through the problem'); result.innerHTML = '<div class="empty-output"><span class="empty-icon">✳</span><div>Putting together a progressive hint ladder<span class="loading-line"><i></i><i></i><i></i></span></div></div>';
    let content;
    if (getApiBase()) {
      try { const data = await postJson('/api/hints', { problem_id: problemId }); content = getTextFromApi(data, ['hints', 'text', 'content']); }
      catch (err) { console.warn('Hints API call failed; showing fallback.', err); }
    }
    if (!content) content = hintsFallback(problemId);
    result.innerHTML = outputMarkup(`${problemId}-hints`, content, 'STEP-BY-STEP NUDGES ✦'); wireOutputActions(result);
    setBusy(button, false);
  }
  function editorialFallback(problemId) {
    const p = problemKnowledge[problemId];
    if (p) return `### Core Idea\n${p.editorial}\n\n### Common Gotchas\n- Check the smallest valid input and boundary conditions.\n- Match your implementation to the constraints in the statement.\n- Keep output formatting exact.`;
    return `### Problem Intuition\nIdentify the input, expected output, constraints, and what makes a solution valid. Rewrite the task as one precise condition or transformation.\n\n### The Approach\nStart with a direct solution, estimate its complexity, and improve only when the constraints require it. Look for reusable patterns such as frequency counting, sorting, two pointers, greedy choices, binary search or dynamic programming.\n\n### Complexity\n- **Time Complexity:** O(N) or O(N log N) depending on data structures.\n- **Space Complexity:** O(1) auxiliary where possible.\n\n### Common Gotchas\n- Missing edge cases or off-by-one boundaries.\n- Using an algorithm whose complexity is too high.`;
  }
  async function submitEditorial(event) {
    event.preventDefault(); const button = $('#editorial-form button[type="submit"]'); const result = $('#editorial-result'); const problemId = normalizeId($('#editorial-id').value); const myCode = $('#editorial-code').value;
    if (!problemId) return;
    setBusy(button, true, 'Preparing the breakdown'); result.innerHTML = '<div class="empty-output"><span class="empty-icon">✎</span><div>Organizing the solution, complexity and gotchas<span class="loading-line"><i></i><i></i><i></i></span></div></div>';
    let content;
    if (getApiBase()) {
      try { const data = await postJson('/api/editorials', { problem_id: problemId, my_code: myCode }); content = getTextFromApi(data, ['editorial', 'text', 'content']); }
      catch (err) { console.warn('Editorial API call failed; showing fallback.', err); }
    }
    if (!content) content = editorialFallback(problemId);
    result.innerHTML = outputMarkup(`${problemId}-editorial`, content, 'SOLUTION BLUEPRINT ✦'); wireOutputActions(result);
    setBusy(button, false);
  }
  function selectTool(tool, scroll = false) {
    state.tool = tool; renderPanel();
    if (scroll) $('#workspace').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // Hero cards and tool tabs share the same navigation state.
  $$('[data-tool]').forEach(el => el.addEventListener('click', () => selectTool(el.dataset.tool, el.classList.contains('feature-card') || el.classList.contains('nav-link'))));
  const aboutNav = $('#about-nav');
  if (aboutNav) aboutNav.addEventListener('click', () => $('#about')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  const openSettings = $('#open-settings');
  if (openSettings) {
    openSettings.addEventListener('click', () => {
      $('#api-base-input').value = state.apiBase;
      $('#settings-status').textContent = '';
      $('#settings-dialog').showModal();
    });
  }
  const saveApi = $('#save-api');
  if (saveApi) {
    saveApi.addEventListener('click', () => {
      const value = $('#api-base-input').value.trim().replace(/\/+$/, '');
      if (value && !/^https?:\/\//i.test(value)) { $('#settings-status').textContent = 'Use a full URL beginning with http:// or https://.'; return; }
      state.apiBase = value;
      if (value) localStorage.setItem('coderail_api_base', value); else localStorage.removeItem('coderail_api_base');
      updateConnectionState(); renderPanel(); $('#settings-dialog').close(); notify(value ? 'Backend URL saved. AI requests will use this server.' : 'Switched to preview mode.');
    });
  }
  const disconnectApi = $('#disconnect-api');
  if (disconnectApi) {
    disconnectApi.addEventListener('click', () => {
      state.apiBase = ''; localStorage.removeItem('coderail_api_base'); updateConnectionState(); renderPanel(); $('#settings-dialog').close(); notify('Preview mode enabled.');
    });
  }

  updateConnectionState(); renderPanel();
})();
