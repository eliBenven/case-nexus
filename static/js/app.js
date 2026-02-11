/**
 * Case Nexus — Main Application
 *
 * Orchestrates all UI interactions, SocketIO events, and view transitions.
 * Handles streaming extended thinking display for all four analysis modes.
 *
 * Security: All dynamic content is escaped via escapeHtml() before DOM insertion.
 * Data source is our own SQLite database and Claude API responses — no untrusted user input.
 */

const socket = io();

// ============================================================
//  STATE
// ============================================================

const state = {
    cases: [],
    currentCase: null,
    alerts: [],
    connections: [],
    analysisActive: false,
    thinkingStartTime: null,
    thinkingTokenCount: 0,
    thinkingInterval: null,
    currentView: 'welcome',
    // Adversarial text accumulators for post-stream markdown rendering
    prosecutionText: '',
    defenseText: '',
    judgeText: '',
};

// ============================================================
//  DOM HELPERS
// ============================================================

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
}

/** Create an element safely from tag + attributes + children */
function el(tag, attrs = {}, ...children) {
    const elem = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
        if (k === 'className') elem.className = v;
        else if (k === 'onclick') elem.addEventListener('click', v);
        else if (k.startsWith('data')) elem.setAttribute(k.replace(/([A-Z])/g, '-$1').toLowerCase(), v);
        else elem.setAttribute(k, v);
    }
    for (const child of children) {
        if (typeof child === 'string') elem.appendChild(document.createTextNode(child));
        else if (child) elem.appendChild(child);
    }
    return elem;
}

/** Safely set text content of a container, or build safe HTML with escaped values */
function safeSetContent(element, htmlStr) {
    // All dynamic values in htmlStr are pre-escaped via escapeHtml()
    // This is safe because our data comes from our own database/AI, not user input
    element.innerHTML = htmlStr;
}

/** Render markdown text to sanitized HTML */
function renderMarkdown(text) {
    if (!text) return '';
    if (typeof marked !== 'undefined') {
        const html = marked.parse(text);
        if (typeof DOMPurify !== 'undefined') {
            return DOMPurify.sanitize(html);
        }
        return html;
    }
    return escapeHtml(text);
}

/** Update phase progress bar */
function setAdversarialPhase(phaseNum) {
    for (let i = 1; i <= 3; i++) {
        const step = document.getElementById('phase-step-' + i);
        const conn = document.getElementById('phase-conn-' + (i - 1));
        if (!step) continue;
        step.classList.remove('active', 'complete');
        if (i < phaseNum) {
            step.classList.add('complete');
        } else if (i === phaseNum) {
            step.classList.add('active');
        }
        if (conn) {
            conn.classList.toggle('complete', i <= phaseNum);
        }
    }
}

const views = {
    welcome: $('#view-welcome'),
    dashboard: $('#view-dashboard'),
    case: $('#view-case'),
    thinking: $('#view-thinking'),
    adversarial: $('#view-adversarial'),
    motion: $('#view-motion'),
};

// ============================================================
//  VIEW MANAGEMENT
// ============================================================

function showView(name) {
    Object.values(views).forEach(v => v.classList.remove('active'));
    if (views[name]) {
        views[name].classList.add('active');
        state.currentView = name;
    }
}

function showRightPanel(show = true) {
    const panel = $('#right-panel');
    if (show) panel.classList.remove('hidden');
    else panel.classList.add('hidden');
}

function setStatus(text, className = '') {
    const badge = $('#status-badge');
    badge.textContent = text;
    badge.className = 'status-badge ' + className;
}

function setContextIndicator(tokens) {
    const indicator = $('#context-indicator');
    const text = $('#context-text');
    if (tokens > 0) {
        indicator.classList.remove('hidden');
        text.textContent = tokens.toLocaleString() + ' tokens in context';
    } else {
        indicator.classList.add('hidden');
    }
}

// ============================================================
//  CASELOAD LOADING
// ============================================================

$('#btn-load-demo').addEventListener('click', () => {
    const btn = $('#btn-load-demo');
    btn.disabled = true;
    btn.textContent = '\u2699 Generating 187 cases...';
    btn.classList.add('loading-pulse');
    setStatus('Loading caseload...', 'loading');
    socket.emit('load_demo_caseload');
});

socket.on('caseload_loaded', (data) => {
    setStatus('Ready', 'ready');
    loadCaseList();
    showView('dashboard');
    updateDashboardStats(data);
    $('#case-search').disabled = false;
    $('#case-filter').disabled = false;
});

async function loadCaseList() {
    const resp = await fetch('/api/cases');
    state.cases = await resp.json();
    renderCaseList(state.cases);
}

function renderCaseList(cases) {
    const list = $('#case-list');
    list.textContent = '';

    if (!cases.length) {
        const empty = el('div', { className: 'empty-state' },
            el('p', {}, 'No cases loaded'),
            el('button', { className: 'btn btn-primary btn-load', id: 'btn-load-demo-inner', onclick: () => {
                socket.emit('load_demo_caseload');
                setStatus('Loading...', 'loading');
            }}, 'Load Demo Caseload'),
            el('p', { className: 'hint' }, '187 synthetic criminal defense cases')
        );
        list.appendChild(empty);
        return;
    }

    cases.forEach(c => {
        const charges = JSON.parse(c.charges || '[]');
        const chargeStr = charges[0] || 'Unknown';
        const severityClass = c.severity === 'felony' ? 'felony' : 'misdemeanor';
        const statusText = (c.status || '').replace(/_/g, ' ');

        const item = el('div', { className: 'case-item ' + severityClass, onclick: () => openCase(c.case_number) },
            el('div', { className: 'case-item-header' },
                el('span', { className: 'case-number' }, c.case_number),
                el('span', { className: 'severity-badge ' + severityClass }, c.severity[0].toUpperCase())
            ),
            el('div', { className: 'case-item-name' }, c.defendant_name),
            el('div', { className: 'case-item-charge' }, chargeStr),
            el('div', { className: 'case-item-meta' },
                el('span', { className: 'status-tag ' + c.status }, statusText),
                ...(c.next_hearing_date ? [el('span', { className: 'hearing-date' }, c.next_hearing_date)] : [])
            )
        );
        list.appendChild(item);
    });
}

// Search and filter
$('#case-search').addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    const filtered = state.cases.filter(c =>
        c.case_number.toLowerCase().includes(q) ||
        c.defendant_name.toLowerCase().includes(q) ||
        c.charges.toLowerCase().includes(q)
    );
    renderCaseList(filtered);
});

$('#case-filter').addEventListener('change', (e) => {
    const val = e.target.value;
    let filtered = state.cases;
    if (val === 'felony') filtered = state.cases.filter(c => c.severity === 'felony');
    else if (val === 'misdemeanor') filtered = state.cases.filter(c => c.severity === 'misdemeanor');
    else if (val !== 'all') filtered = state.cases.filter(c => c.status === val);
    renderCaseList(filtered);
});

// ============================================================
//  DASHBOARD
// ============================================================

function updateDashboardStats(data) {
    $('#dash-total').textContent = data.total || 0;
    $('#dash-felonies').textContent = data.felonies || 0;
    $('#dash-misdemeanors').textContent = data.misdemeanors || 0;
    $('#dash-active').textContent = data.active || 0;
    $('#stat-total').textContent = data.total || 0;
    $('#stat-felonies').textContent = (data.felonies || 0) + ' F';
    $('#stat-misdemeanors').textContent = (data.misdemeanors || 0) + ' M';
    $('#caseload-stats').classList.remove('hidden');
}

// Health Check
$('#btn-health-check').addEventListener('click', () => {
    if (state.analysisActive) return;
    state.analysisActive = true;
    setStatus('Health Check...', 'analyzing');
    startThinkingView('Scanning entire caseload...');
    showRightPanel(true);
    socket.emit('run_health_check');
});

// ============================================================
//  CASE DETAIL
// ============================================================

async function openCase(caseNumber) {
    const resp = await fetch('/api/case/' + encodeURIComponent(caseNumber));
    const c = await resp.json();
    state.currentCase = c;

    $('#case-title').textContent = c.case_number + ' \u2014 ' + c.defendant_name;
    renderCaseInfo(c);
    const analysisEl = $('#case-analysis');
    analysisEl.textContent = '';
    analysisEl.appendChild(el('p', { className: 'empty-hint' }, 'Select an analysis mode above'));
    showView('case');
    showRightPanel(false);

    // Load evidence items for this case
    loadEvidence(caseNumber);
}
window.openCase = openCase;

function renderCaseInfo(c) {
    const charges = JSON.parse(c.charges || '[]');
    const witnesses = JSON.parse(c.witnesses || '[]');
    const container = $('#case-info');
    container.textContent = '';

    // -- Hero Case Card (full-width, spans both columns) --
    const hero = el('div', { className: 'case-hero ' + c.severity });

    // Top bar: severity + status + bond
    const topBar = el('div', { className: 'case-hero-top' },
        el('span', { className: 'severity-badge large ' + c.severity },
            c.severity === 'felony' ? 'FELONY' : 'MISDEMEANOR'),
        el('span', { className: 'status-tag large ' + c.status },
            (c.status || '').replace(/_/g, ' ').toUpperCase()),
        ...(c.bond_status ? [el('span', { className: 'bond-badge' }, c.bond_status)] : [])
    );
    hero.appendChild(topBar);

    // Charges as prominent pills
    if (charges.length) {
        const chargePills = el('div', { className: 'charge-pills' });
        charges.forEach(ch => chargePills.appendChild(el('span', { className: 'charge-pill' }, ch)));
        hero.appendChild(chargePills);
    }

    // Quick Stats Row
    const statsRow = el('div', { className: 'case-quick-stats' });
    const addStat = (label, value, icon) => {
        if (value) {
            statsRow.appendChild(el('div', { className: 'quick-stat' },
                el('span', { className: 'quick-stat-icon' }, icon || ''),
                el('span', { className: 'quick-stat-value' }, value),
                el('span', { className: 'quick-stat-label' }, label)
            ));
        }
    };
    addStat('Court', c.court, '\u2696');
    addStat('Judge', c.judge, '\u2696');
    addStat('Prosecutor', c.prosecutor, '\u2694');
    addStat('Officer', c.arresting_officer, '\u{1F46E}');
    hero.appendChild(statsRow);

    // Next Hearing Callout
    if (c.next_hearing_date) {
        const daysUntil = Math.ceil((new Date(c.next_hearing_date) - new Date()) / (1000 * 60 * 60 * 24));
        const urgencyClass = daysUntil <= 7 ? 'urgent' : daysUntil <= 30 ? 'soon' : 'normal';
        hero.appendChild(el('div', { className: 'hearing-callout ' + urgencyClass },
            el('div', { className: 'hearing-callout-left' },
                el('span', { className: 'hearing-callout-icon' }, '\u{1F4C5}'),
                el('div', {},
                    el('span', { className: 'hearing-callout-date' }, c.next_hearing_date),
                    el('span', { className: 'hearing-callout-type' }, c.hearing_type || 'Hearing')
                )
            ),
            el('div', { className: 'hearing-countdown ' + urgencyClass },
                el('span', { className: 'countdown-number' }, daysUntil > 0 ? String(daysUntil) : 'TODAY'),
                el('span', { className: 'countdown-label' }, daysUntil > 0 ? (daysUntil === 1 ? 'day away' : 'days away') : '')
            )
        ));
    }

    // Speedy trial countdown
    if (c.arrest_date) {
        const arrestDate = new Date(c.arrest_date);
        const limit = c.severity === 'felony' ? 180 : 90;
        const deadline = new Date(arrestDate.getTime() + limit * 24 * 60 * 60 * 1000);
        const daysRemaining = Math.ceil((deadline - new Date()) / (1000 * 60 * 60 * 24));
        const urgencyClass = daysRemaining <= 14 ? 'urgent' : daysRemaining <= 45 ? 'soon' : 'normal';
        hero.appendChild(el('div', { className: 'speedy-trial-bar ' + urgencyClass },
            el('span', { className: 'speedy-label' }, 'Speedy Trial:'),
            el('span', { className: 'speedy-value' },
                daysRemaining > 0
                    ? daysRemaining + ' days remaining (' + limit + '-day limit)'
                    : 'EXPIRED (' + limit + '-day limit)'
            )
        ));
    }

    container.appendChild(hero);

    // -- Dates & Details Grid --
    const infoSection = el('div', { className: 'info-section' });
    infoSection.appendChild(el('h3', {}, 'Case Details'));
    const grid = el('div', { className: 'info-grid' });
    const fields = [
        ['Filing Date', c.filing_date],
        ['Arrest Date', c.arrest_date],
        ['Precinct', c.precinct],
        ['Bond', c.bond_status || 'N/A'],
    ];
    fields.forEach(([label, value]) => {
        grid.appendChild(el('div', { className: 'info-item' },
            el('span', { className: 'info-label' }, label),
            el('span', { className: 'info-value' }, value || '')
        ));
    });
    infoSection.appendChild(grid);
    container.appendChild(infoSection);

    // Plea Offer (visually prominent)
    if (c.plea_offer) {
        const sec = el('div', { className: 'info-section plea-section' },
            el('h3', {}, 'Plea Offer'),
            el('p', { className: 'plea-offer' }, c.plea_offer)
        );
        if (c.plea_offer_details) sec.appendChild(el('p', { className: 'plea-details' }, c.plea_offer_details));
        container.appendChild(sec);
    }

    // Prior Record
    if (c.prior_record) {
        container.appendChild(el('div', { className: 'info-section prior-record-section' },
            el('h3', {}, 'Prior Record'),
            el('p', {}, c.prior_record)
        ));
    }

    // Witnesses
    if (witnesses.length) {
        const sec = el('div', { className: 'info-section' }, el('h3', {}, 'Witnesses'));
        const witnessGrid = el('div', { className: 'witness-grid' });
        witnesses.forEach(w => {
            witnessGrid.appendChild(el('div', { className: 'witness-chip' }, w));
        });
        sec.appendChild(witnessGrid);
        container.appendChild(sec);
    }

    // Evidence Summary
    if (c.evidence_summary) {
        container.appendChild(el('div', { className: 'info-section' },
            el('h3', {}, 'Evidence Summary'),
            el('p', {}, c.evidence_summary)
        ));
    }

    // Notes
    if (c.notes) {
        container.appendChild(el('div', { className: 'info-section' },
            el('h3', {}, 'Case Notes'),
            el('p', {}, c.notes)
        ));
    }

    // Attorney Notes
    if (c.attorney_notes) {
        container.appendChild(el('div', { className: 'info-section attorney-section' },
            el('h3', {}, 'Attorney Notes'),
            el('p', { className: 'attorney-notes' }, c.attorney_notes)
        ));
    }
}

// Case action buttons
$('#btn-back').addEventListener('click', () => {
    showView('dashboard');
    showRightPanel(false);
});

$('#btn-deep-analysis').addEventListener('click', () => {
    if (!state.currentCase || state.analysisActive) return;
    state.analysisActive = true;
    setStatus('Deep Analysis...', 'analyzing');
    state.deepAnalysisResponseText = '';
    state.deepThinkingTokens = 0;

    // Stay on case view — show inline thinking panel
    const panel = document.getElementById('deep-analysis-panel');
    panel.classList.remove('hidden');
    const thinkingStream = document.getElementById('deep-thinking-stream');
    thinkingStream.textContent = '';
    const details = document.getElementById('deep-thinking-details');
    if (details) details.open = true;
    document.getElementById('deep-thinking-count').textContent = '';
    document.getElementById('deep-response-status').classList.add('hidden');

    // Clear previous analysis
    const analysisEl = $('#case-analysis');
    analysisEl.textContent = '';
    analysisEl.appendChild(el('div', { className: 'analysis-loading' },
        el('span', { className: 'thinking-icon pulse' }, '\u2699'),
        el('span', {}, 'AI is analyzing this case with extended thinking...')
    ));

    // Scroll to thinking panel
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });

    showRightPanel(false);
    socket.emit('run_deep_analysis', { case_number: state.currentCase.case_number });
});

$('#btn-adversarial').addEventListener('click', () => {
    if (!state.currentCase || state.analysisActive) return;
    state.analysisActive = true;
    setStatus('Adversarial Sim...', 'analyzing');
    showView('adversarial');
    $('#adversarial-case').textContent = state.currentCase.case_number;
    clearAdversarialPanels();
    showRightPanel(false);
    socket.emit('run_adversarial', { case_number: state.currentCase.case_number });
});

function clearAdversarialPanels() {
    // Clear all text accumulators
    state.prosecutionText = '';
    state.defenseText = '';
    state.judgeText = '';

    // Clear DOM panels
    ['prosecution-thinking', 'prosecution-response', 'defense-thinking', 'defense-response',
     'judge-thinking', 'judge-response'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '';
    });

    // Clear thinking counts
    ['prosecution-thinking-count', 'defense-thinking-count', 'judge-thinking-count'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '';
    });

    // Reset phase progress
    setAdversarialPhase(1);

    // Hide judge panel
    const judgePanel = document.getElementById('judge-panel');
    if (judgePanel) judgePanel.classList.add('hidden');

    // Reset thinking details state
    const prosDet = document.getElementById('prosecution-thinking-details');
    const defDet = document.getElementById('defense-thinking-details');
    const judgeDet = document.getElementById('judge-thinking-details');
    if (prosDet) prosDet.open = true;
    if (defDet) defDet.open = false;
    if (judgeDet) judgeDet.open = false;

    // Reset side dimming
    const prosEl = document.getElementById('side-prosecution');
    const defEl = document.getElementById('side-defense');
    if (prosEl) prosEl.classList.remove('dimmed');
    if (defEl) defEl.classList.remove('dimmed');
}

$('#btn-motion').addEventListener('click', () => {
    if (!state.currentCase) return;
    $('#motion-modal').classList.remove('hidden');
});

$('#btn-modal-close').addEventListener('click', () => {
    $('#motion-modal').classList.add('hidden');
});

$$('.btn-motion-option').forEach(btn => {
    btn.addEventListener('click', () => {
        if (state.analysisActive) return;
        const motionType = btn.dataset.type;
        state.analysisActive = true;
        $('#motion-modal').classList.add('hidden');
        setStatus('Drafting Motion...', 'analyzing');
        showView('motion');
        $('#motion-title').textContent = motionType;
        $('#motion-content').textContent = 'Generating...';
        $('#motion-length').textContent = '';
        // Show case banner
        if (state.currentCase) {
            $('#motion-case-banner').classList.remove('hidden');
            $('#motion-case-ref').textContent = state.currentCase.case_number;
            $('#motion-defendant').textContent = state.currentCase.defendant_name;
        }
        // Reset citation panel
        $('#citation-panel').classList.add('hidden');
        $('#citation-status').classList.add('hidden');
        $('#citation-list').textContent = '';
        showRightPanel(true);
        socket.emit('generate_motion', {
            case_number: state.currentCase.case_number,
            motion_type: motionType,
        });
    });
});

$('#btn-adversarial-back').addEventListener('click', () => {
    showView(state.currentCase ? 'case' : 'dashboard');
});

$('#btn-motion-back').addEventListener('click', () => {
    showView(state.currentCase ? 'case' : 'dashboard');
    showRightPanel(false);
});

$('#btn-motion-print').addEventListener('click', () => {
    window.print();
});

$('#btn-motion-copy').addEventListener('click', () => {
    const content = motionAccumulatedText || $('#motion-content').textContent;
    navigator.clipboard.writeText(content).then(() => {
        const btn = $('#btn-motion-copy');
        const orig = btn.textContent;
        btn.textContent = '\u2713 Copied!';
        setTimeout(() => { btn.textContent = orig; }, 2000);
    });
});

// ============================================================
//  THINKING STREAM DISPLAY
// ============================================================

function startThinkingView(title) {
    showView('thinking');
    $('#thinking-title-text').textContent = title;
    $('#thinking-stream').textContent = '';
    $('#thinking-response').classList.add('hidden');
    $('#response-content').textContent = '';
    $('#right-thinking-stream').textContent = '';
    state.thinkingTokenCount = 0;
    state.thinkingStartTime = Date.now();
    updateThinkingMeta();
    state.thinkingInterval = setInterval(updateThinkingMeta, 1000);
}

function updateThinkingMeta() {
    const elapsed = Math.round((Date.now() - (state.thinkingStartTime || Date.now())) / 1000);
    $('#thinking-elapsed').textContent = elapsed + 's';
    $('#thinking-tokens').textContent = state.thinkingTokenCount.toLocaleString() + ' thinking tokens';
    $('#right-thinking-tokens').textContent = state.thinkingTokenCount.toLocaleString() + ' tokens';
}

function appendThinking(text, target) {
    state.thinkingTokenCount += text.split(/\s+/).length;
    const textNode = document.createTextNode(text);

    if (target === 'both' || target === 'main') {
        const mainEl = $('#thinking-stream');
        mainEl.appendChild(textNode.cloneNode(true));
        mainEl.scrollTop = mainEl.scrollHeight;
    }
    if (target === 'both' || target === 'right') {
        const rightEl = $('#right-thinking-stream');
        rightEl.appendChild(textNode.cloneNode(true));
        rightEl.scrollTop = rightEl.scrollHeight;
    }
}

function stopThinking() {
    if (state.thinkingInterval) {
        clearInterval(state.thinkingInterval);
        state.thinkingInterval = null;
    }
    state.analysisActive = false;
    setStatus('Ready', 'ready');
}

// ============================================================
//  HEALTH CHECK EVENTS
// ============================================================

socket.on('health_check_started', (data) => {
    if (data.context_tokens) setContextIndicator(data.context_tokens);
});

socket.on('health_check_thinking_started', () => {
    appendThinking('Beginning caseload analysis...\n\n', 'both');
});

socket.on('health_check_thinking_delta', (data) => {
    appendThinking(data.text, 'both');
});

socket.on('health_check_thinking_complete', () => {
    appendThinking('\n\n--- Thinking complete ---\n', 'both');
});

socket.on('health_check_response_started', () => {});
socket.on('health_check_response_delta', () => {});
socket.on('health_check_complete', () => {});

socket.on('health_check_results', (data) => {
    stopThinking();
    state.alerts = data.alerts || [];
    state.connections = data.connections || [];

    renderAlerts(data.alerts || []);
    renderConnections(data.connections || []);
    renderPriorityActions(data.priority_actions || []);

    $('#dash-alerts').textContent = (data.alerts || []).length;
    $('#dash-connections').textContent = (data.connections || []).length;
    $('#alert-count').textContent = (data.alerts || []).length;
    $('#connection-count').textContent = (data.connections || []).length;

    if (data.context_tokens) setContextIndicator(data.context_tokens);
    showView('dashboard');
});

function renderAlerts(alerts) {
    const list = $('#alerts-list');
    list.textContent = '';
    if (!alerts.length) {
        list.appendChild(el('p', { className: 'empty-hint' }, 'Run a health check to scan for risks'));
        return;
    }
    alerts.forEach(a => {
        const item = el('div', { className: 'alert-item ' + a.severity },
            el('div', { className: 'alert-header' },
                el('span', { className: 'alert-severity ' + a.severity }, (a.severity || '').toUpperCase()),
                el('span', { className: 'alert-type' }, a.alert_type || ''),
                ...(a.case_number ? [el('span', { className: 'alert-case', onclick: () => openCase(a.case_number) }, a.case_number)] : [])
            ),
            el('div', { className: 'alert-title' }, a.title || ''),
            el('div', { className: 'alert-message' }, a.message || ''),
            ...(a.details ? [el('div', { className: 'alert-details' }, a.details)] : [])
        );
        list.appendChild(item);
    });
}

function renderConnections(connections) {
    const list = $('#connections-list');
    list.textContent = '';
    if (!connections.length) {
        list.appendChild(el('p', { className: 'empty-hint' }, 'Run a health check to find connections'));
        return;
    }
    connections.forEach(c => {
        const caseNums = typeof c.case_numbers === 'string' ? JSON.parse(c.case_numbers) : (c.case_numbers || []);
        const caseTags = el('div', { className: 'connection-cases' });
        caseNums.forEach(cn => {
            caseTags.appendChild(el('span', { className: 'case-tag', onclick: () => openCase(cn) }, cn));
        });

        const item = el('div', { className: 'connection-item' },
            el('div', { className: 'connection-header' },
                el('span', { className: 'connection-type' }, c.connection_type || ''),
                el('span', { className: 'connection-confidence' }, Math.round((c.confidence || 0) * 100) + '% confidence')
            ),
            el('div', { className: 'connection-title' }, c.title || ''),
            caseTags,
            el('div', { className: 'connection-desc' }, c.description || ''),
            ...(c.actionable ? [el('div', { className: 'connection-action' }, c.actionable)] : [])
        );
        list.appendChild(item);
    });
}

function renderPriorityActions(actions) {
    const panel = $('#priority-actions');
    const list = $('#actions-list');
    list.textContent = '';
    if (!actions.length) {
        panel.classList.add('hidden');
        return;
    }
    panel.classList.remove('hidden');
    actions.forEach(a => {
        const item = el('div', { className: 'action-item ' + (a.urgency || '') },
            el('span', { className: 'action-rank' }, '#' + a.rank),
            el('div', { className: 'action-body' },
                el('span', { className: 'action-case', onclick: () => openCase(a.case_number) }, a.case_number || ''),
                el('span', { className: 'action-text' }, a.action || ''),
                el('span', { className: 'action-urgency ' + (a.urgency || '') }, (a.urgency || '').replace(/_/g, ' '))
            ),
            el('div', { className: 'action-reason' }, a.reason || '')
        );
        list.appendChild(item);
    });
}

// ============================================================
//  DEEP ANALYSIS EVENTS
// ============================================================

// Deep analysis thinking — stream into inline panel on case view
socket.on('deep_analysis_thinking_started', () => {
    const stream = document.getElementById('deep-thinking-stream');
    if (stream) stream.textContent = '';
});

socket.on('deep_analysis_thinking_delta', (data) => {
    const stream = document.getElementById('deep-thinking-stream');
    if (stream) {
        stream.appendChild(document.createTextNode(data.text));
        stream.scrollTop = stream.scrollHeight;
    }
    state.deepThinkingTokens = (state.deepThinkingTokens || 0) + data.text.split(/\s+/).length;
    const counter = document.getElementById('deep-thinking-count');
    if (counter) counter.textContent = state.deepThinkingTokens.toLocaleString() + ' tokens';
});

socket.on('deep_analysis_thinking_complete', () => {
    // Collapse thinking, show "generating" status
    const details = document.getElementById('deep-thinking-details');
    if (details) details.open = false;
    document.getElementById('deep-response-status').classList.remove('hidden');
});

// Stream the response text live into the analysis area
socket.on('deep_analysis_response_started', () => {
    state.deepAnalysisResponseText = '';
    const analysisEl = $('#case-analysis');
    analysisEl.textContent = '';
    document.getElementById('deep-response-status').classList.add('hidden');
});

socket.on('deep_analysis_response_delta', (data) => {
    state.deepAnalysisResponseText += data.text;
    const analysisEl = $('#case-analysis');
    analysisEl.appendChild(document.createTextNode(data.text));
    analysisEl.scrollTop = analysisEl.scrollHeight;
});

socket.on('deep_analysis_complete', () => {
    // Re-render the streamed text as formatted output
    if (state.deepAnalysisResponseText) {
        const analysisEl = $('#case-analysis');
        // Try to parse as JSON for structured rendering
        let parsed = null;
        try {
            let text = state.deepAnalysisResponseText.trim();
            if (text.startsWith('```')) {
                text = text.replace(/^```\w*\n?/, '').replace(/\n?```$/, '').trim();
            }
            const start = text.indexOf('{');
            const end = text.lastIndexOf('}') + 1;
            if (start >= 0 && end > start) {
                parsed = JSON.parse(text.substring(start, end));
            }
        } catch (e) { /* not JSON, render as markdown */ }

        if (parsed && typeof parsed === 'object' && (parsed.prosecution_strength || parsed.executive_summary || parsed.defense_strategies)) {
            renderDeepAnalysis(parsed);
        } else {
            // Render as markdown
            analysisEl.textContent = '';
            const wrapper = el('div', { className: 'markdown-body' });
            safeRenderMarkdown(wrapper, state.deepAnalysisResponseText);
            analysisEl.appendChild(wrapper);
        }
    }
});

socket.on('deep_analysis_results', (data) => {
    stopThinking();
    const panel = document.getElementById('deep-analysis-panel');

    // If we already rendered via deep_analysis_complete, check if structured data is better
    if (data.analysis && typeof data.analysis === 'object') {
        renderDeepAnalysis(data.analysis);
    } else if (!state.deepAnalysisResponseText && data.analysis) {
        // Fallback: render whatever we got
        const analysisEl = $('#case-analysis');
        analysisEl.textContent = '';
        const wrapper = el('div', { className: 'markdown-body' });
        safeRenderMarkdown(wrapper, typeof data.analysis === 'string' ? data.analysis : JSON.stringify(data.analysis, null, 2));
        analysisEl.appendChild(wrapper);
    }

    // Scroll analysis into view
    const analysisEl = $('#case-analysis');
    if (analysisEl.firstChild) {
        analysisEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
});

function renderDeepAnalysis(analysis) {
    const container = $('#case-analysis');
    container.textContent = '';

    if (!analysis || typeof analysis === 'string') {
        // If the response is raw markdown/text, render it as markdown
        const wrapper = el('div', { className: 'markdown-body' });
        safeRenderMarkdown(wrapper, analysis || 'No analysis available');
        container.appendChild(wrapper);
        return;
    }

    const a = analysis;

    // Executive Summary
    if (a.executive_summary) {
        const sec = el('div', { className: 'analysis-section analysis-executive' });
        const header = el('h3', {}, 'Executive Summary');
        sec.appendChild(header);
        const body = el('div', { className: 'markdown-body' });
        safeRenderMarkdown(body, a.executive_summary);
        sec.appendChild(body);
        container.appendChild(sec);
    }

    // Prosecution Strength Meter
    if (a.prosecution_strength) {
        const score = a.prosecution_strength_score || (a.prosecution_strength === 'strong' ? 80 : a.prosecution_strength === 'weak' ? 25 : 55);
        const cls = score >= 70 ? 'danger' : score <= 40 ? 'success' : 'warning';
        const barColor = score >= 70 ? 'var(--red)' : score <= 40 ? 'var(--green)' : 'var(--orange)';

        const sec = el('div', { className: 'analysis-section strength-section' },
            el('h3', {}, 'Prosecution Case Strength'),
            el('div', { className: 'strength-meter' },
                el('div', { className: 'strength-bar-bg' },
                    (() => {
                        const bar = el('div', { className: 'strength-bar-fill' });
                        bar.style.width = score + '%';
                        bar.style.background = barColor;
                        return bar;
                    })()
                ),
                el('div', { className: 'strength-labels' },
                    el('span', { className: 'strength-label' }, 'Weak'),
                    el('span', { className: 'strength-score ' + cls }, score + '/100'),
                    el('span', { className: 'strength-label' }, 'Strong')
                )
            )
        );
        if (a.prosecution_analysis) {
            const body = el('div', { className: 'markdown-body' });
            safeRenderMarkdown(body, a.prosecution_analysis);
            sec.appendChild(body);
        }
        container.appendChild(sec);
    }

    // Key Facts
    if (a.key_facts?.length) {
        const sec = el('div', { className: 'analysis-section' }, el('h3', {}, 'Key Facts Analysis'));
        a.key_facts.forEach(f => {
            const favorsClass = f.favors === 'prosecution' ? 'fact-prosecution' : f.favors === 'defense' ? 'fact-defense' : 'fact-neutral';
            const sigClass = 'significance-' + (f.significance || 'moderate');
            sec.appendChild(el('div', { className: 'fact-card ' + favorsClass },
                el('div', { className: 'fact-header' },
                    el('span', { className: 'fact-favors ' + favorsClass }, (f.favors || 'neutral').toUpperCase()),
                    el('span', { className: 'fact-significance ' + sigClass }, f.significance || '')
                ),
                el('div', { className: 'fact-text' }, f.fact || ''),
                ...(f.explanation ? [el('div', { className: 'fact-explanation' }, f.explanation)] : [])
            ));
        });
        container.appendChild(sec);
    }

    // Defense Strategies
    if (a.defense_strategies?.length) {
        const sec = el('div', { className: 'analysis-section' }, el('h3', {}, 'Defense Strategies'));
        a.defense_strategies.forEach((s, i) => {
            const card = el('div', { className: 'strategy-card' },
                el('div', { className: 'strategy-header' },
                    el('span', { className: 'strategy-rank' }, '#' + (i + 1)),
                    el('strong', {}, s.strategy || ''),
                    el('span', { className: 'likelihood ' + (s.likelihood_of_success || '') }, s.likelihood_of_success || '')
                ),
                el('p', {}, s.description || '')
            );
            if (s.legal_basis) card.appendChild(el('p', { className: 'legal-basis' }, s.legal_basis));
            if (s.risk) card.appendChild(el('p', { className: 'strategy-risk' }, 'Risk: ' + s.risk));
            if (s.required_actions?.length) {
                const actions = el('div', { className: 'strategy-actions' }, el('strong', {}, 'Required Actions:'));
                const ul = el('ul');
                s.required_actions.forEach(act => ul.appendChild(el('li', {}, act)));
                actions.appendChild(ul);
                card.appendChild(actions);
            }
            sec.appendChild(card);
        });
        container.appendChild(sec);
    }

    // Evidence Analysis
    if (a.evidence_analysis) {
        const ea = a.evidence_analysis;
        const sec = el('div', { className: 'analysis-section' }, el('h3', {}, 'Evidence Analysis'));

        if (ea.prosecution_evidence?.length) {
            sec.appendChild(el('h4', {}, 'Prosecution Evidence'));
            ea.prosecution_evidence.forEach(e => {
                const strengthClass = 'evidence-' + (e.strength || 'moderate');
                sec.appendChild(el('div', { className: 'evidence-item-analysis ' + strengthClass },
                    el('div', { className: 'evidence-item-header' },
                        el('span', {}, e.item || ''),
                        el('span', { className: 'evidence-strength ' + strengthClass }, e.strength || '')
                    ),
                    ...(e.challenge ? [el('div', { className: 'evidence-challenge' }, 'Challenge: ' + e.challenge)] : [])
                ));
            });
        }

        if (ea.missing_evidence?.length) {
            sec.appendChild(el('h4', { className: 'missing-evidence-header' }, 'Missing Evidence'));
            ea.missing_evidence.forEach(e => {
                sec.appendChild(el('div', { className: 'missing-evidence-card' },
                    el('strong', {}, e.item || ''),
                    el('p', {}, e.significance || ''),
                    ...(e.action ? [el('p', { className: 'evidence-action' }, 'Action: ' + e.action)] : [])
                ));
            });
        }
        container.appendChild(sec);
    }

    // Constitutional Issues
    if (a.constitutional_issues?.length) {
        const sec = el('div', { className: 'analysis-section' }, el('h3', {}, 'Constitutional Issues'));
        a.constitutional_issues.forEach(i => {
            sec.appendChild(el('div', { className: 'issue-card' },
                el('div', { className: 'issue-header' },
                    ...(i.amendment ? [el('span', { className: 'amendment-badge' }, i.amendment + ' Amendment')] : []),
                    el('strong', {}, i.issue || '')
                ),
                el('p', { className: 'legal-basis' }, i.legal_basis || ''),
                el('p', { className: 'impact' }, i.impact || ''),
                ...(i.motion ? [el('p', { className: 'issue-motion' }, 'File: ' + i.motion)] : [])
            ));
        });
        container.appendChild(sec);
    }

    // Witness Analysis
    if (a.witness_analysis?.length) {
        const sec = el('div', { className: 'analysis-section' }, el('h3', {}, 'Witness Analysis'));
        a.witness_analysis.forEach(w => {
            const roleClass = 'witness-' + (w.role || 'neutral');
            const card = el('div', { className: 'witness-card ' + roleClass },
                el('div', { className: 'witness-header' },
                    el('strong', {}, w.name || ''),
                    el('span', { className: 'witness-role ' + roleClass }, (w.role || '').toUpperCase()),
                    el('span', { className: 'likelihood ' + (w.credibility || '') }, w.credibility || '')
                ),
                ...(w.key_testimony ? [el('p', {}, w.key_testimony)] : []),
                ...(w.impeachment_opportunities ? [el('p', { className: 'impeachment' }, 'Impeachment: ' + w.impeachment_opportunities)] : [])
            );
            if (w.cross_exam_questions?.length) {
                const qSection = el('div', { className: 'cross-exam-questions' }, el('strong', {}, 'Cross-Examination:'));
                const ol = el('ol');
                w.cross_exam_questions.forEach(q => ol.appendChild(el('li', {}, q)));
                qSection.appendChild(ol);
                card.appendChild(qSection);
            }
            sec.appendChild(card);
        });
        container.appendChild(sec);
    }

    // Plea Recommendation
    if (a.plea_recommendation) {
        const pr = a.plea_recommendation;
        const cls = pr.recommendation === 'reject' ? 'danger' : pr.recommendation === 'accept' ? 'success' : 'warning';
        const sec = el('div', { className: 'analysis-section plea-analysis' },
            el('div', { className: 'plea-header-bar' },
                el('h3', {}, 'Plea Recommendation'),
                el('span', { className: 'plea-verdict ' + cls }, (pr.recommendation || '').toUpperCase())
            )
        );
        if (pr.conviction_probability !== undefined) {
            const convProb = pr.conviction_probability;
            sec.appendChild(el('div', { className: 'conviction-meter' },
                el('span', { className: 'conviction-label' }, 'Conviction probability: '),
                el('span', { className: 'conviction-value ' + (convProb >= 70 ? 'danger' : convProb <= 40 ? 'success' : 'warning') }, convProb + '%')
            ));
        }
        if (pr.reasoning) {
            const body = el('div', { className: 'markdown-body' });
            safeRenderMarkdown(body, pr.reasoning);
            sec.appendChild(body);
        }
        if (pr.counter_offer) sec.appendChild(el('p', { className: 'plea-counter' }, 'Counter-offer: ' + pr.counter_offer));
        if (pr.trial_risk) sec.appendChild(el('p', { className: 'plea-risk' }, 'Trial risk: ' + pr.trial_risk));
        container.appendChild(sec);
    }

    // Recommended Motions
    if (a.recommended_motions?.length) {
        const sec = el('div', { className: 'analysis-section' }, el('h3', {}, 'Recommended Motions'));
        a.recommended_motions.forEach(m => {
            sec.appendChild(el('div', { className: 'motion-rec' },
                el('div', { className: 'motion-rec-header' },
                    el('strong', {}, m.motion_type || ''),
                    el('span', { className: 'likelihood ' + (m.likelihood_of_success || '') }, m.likelihood_of_success || ''),
                    el('span', { className: 'priority-tag ' + (m.priority || '') }, m.priority || '')
                ),
                el('p', {}, m.basis || ''),
                ...(m.impact_if_granted ? [el('p', { className: 'motion-impact' }, 'If granted: ' + m.impact_if_granted)] : [])
            ));
        });
        container.appendChild(sec);
    }

    // Action Timeline
    if (a.timeline?.length) {
        const sec = el('div', { className: 'analysis-section timeline-section' }, el('h3', {}, 'Action Timeline'));
        a.timeline.forEach(t => {
            const urgClass = 'urgency-' + (t.urgency || 'routine');
            sec.appendChild(el('div', { className: 'timeline-item ' + urgClass },
                el('div', { className: 'timeline-marker ' + urgClass }),
                el('div', { className: 'timeline-content' },
                    el('div', { className: 'timeline-action' }, t.action || ''),
                    el('div', { className: 'timeline-meta' },
                        el('span', { className: 'timeline-deadline' }, t.deadline || ''),
                        el('span', { className: 'timeline-urgency ' + urgClass }, (t.urgency || '').toUpperCase())
                    )
                )
            ));
        });
        container.appendChild(sec);
    }

    // Overall Assessment
    if (a.overall_assessment) {
        const sec = el('div', { className: 'analysis-section overall' },
            el('h3', {}, 'Overall Assessment')
        );
        const body = el('div', { className: 'markdown-body' });
        safeRenderMarkdown(body, a.overall_assessment);
        sec.appendChild(body);
        container.appendChild(sec);
    }
}

// ============================================================
//  ADVERSARIAL SIMULATION EVENTS
// ============================================================

// Thinking token counters per phase
let prosecutionThinkingTokens = 0;
let defenseThinkingTokens = 0;
let judgeThinkingTokens = 0;

/**
 * Safely render accumulated markdown into a target element.
 * Uses DOMPurify to sanitize all HTML before DOM insertion.
 * Data source: Claude API responses (our own AI, not user input).
 */
function safeRenderMarkdown(targetEl, markdownText) {
    if (!targetEl || !markdownText) return;
    const sanitized = renderMarkdown(markdownText);
    targetEl.textContent = '';
    const wrapper = document.createElement('div');
    wrapper.innerHTML = DOMPurify.sanitize(sanitized);
    while (wrapper.firstChild) {
        targetEl.appendChild(wrapper.firstChild);
    }
}

socket.on('adversarial_phase', (data) => {
    const phase = data.phase;
    const phaseNum = data.phase_number || (phase === 'prosecution' ? 1 : phase === 'defense' ? 2 : 3);
    setAdversarialPhase(phaseNum);

    if (phase === 'prosecution') {
        prosecutionThinkingTokens = 0;
        const det = document.getElementById('prosecution-thinking-details');
        if (det) det.open = true;
    } else if (phase === 'defense') {
        defenseThinkingTokens = 0;
        const prosDet = document.getElementById('prosecution-thinking-details');
        const defDet = document.getElementById('defense-thinking-details');
        if (prosDet) prosDet.open = false;
        if (defDet) defDet.open = true;
    } else if (phase === 'judge') {
        judgeThinkingTokens = 0;
        const defDet = document.getElementById('defense-thinking-details');
        if (defDet) defDet.open = false;
        const judgePanel = document.getElementById('judge-panel');
        if (judgePanel) {
            judgePanel.classList.remove('hidden');
            judgePanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        const judgeDet = document.getElementById('judge-thinking-details');
        if (judgeDet) judgeDet.open = true;
    }
});

// --- Prosecution Events ---
socket.on('prosecution_thinking_started', () => {
    document.getElementById('prosecution-thinking').textContent = '';
});
socket.on('prosecution_thinking_delta', (data) => {
    const target = document.getElementById('prosecution-thinking');
    target.appendChild(document.createTextNode(data.text));
    target.scrollTop = target.scrollHeight;
    prosecutionThinkingTokens += data.text.split(/\s+/).length;
    const counter = document.getElementById('prosecution-thinking-count');
    if (counter) counter.textContent = prosecutionThinkingTokens.toLocaleString() + ' tokens';
});
socket.on('prosecution_thinking_complete', () => {
    const det = document.getElementById('prosecution-thinking-details');
    if (det) det.open = false;
});
socket.on('prosecution_response_started', () => {
    state.prosecutionText = '';
    document.getElementById('prosecution-response').textContent = '';
});
socket.on('prosecution_response_delta', (data) => {
    state.prosecutionText += data.text;
    const target = document.getElementById('prosecution-response');
    target.appendChild(document.createTextNode(data.text));
    target.scrollTop = target.scrollHeight;
});
socket.on('prosecution_complete', () => {
    safeRenderMarkdown(document.getElementById('prosecution-response'), state.prosecutionText);
});

// --- Defense Events ---
socket.on('defense_thinking_started', () => {
    document.getElementById('defense-thinking').textContent = '';
});
socket.on('defense_thinking_delta', (data) => {
    const target = document.getElementById('defense-thinking');
    target.appendChild(document.createTextNode(data.text));
    target.scrollTop = target.scrollHeight;
    defenseThinkingTokens += data.text.split(/\s+/).length;
    const counter = document.getElementById('defense-thinking-count');
    if (counter) counter.textContent = defenseThinkingTokens.toLocaleString() + ' tokens';
});
socket.on('defense_thinking_complete', () => {
    const det = document.getElementById('defense-thinking-details');
    if (det) det.open = false;
});
socket.on('defense_response_started', () => {
    state.defenseText = '';
    document.getElementById('defense-response').textContent = '';
});
socket.on('defense_response_delta', (data) => {
    state.defenseText += data.text;
    const target = document.getElementById('defense-response');
    target.appendChild(document.createTextNode(data.text));
    target.scrollTop = target.scrollHeight;
});
socket.on('defense_complete', () => {
    safeRenderMarkdown(document.getElementById('defense-response'), state.defenseText);
});

// --- Judge Events ---
socket.on('judge_thinking_started', () => {
    const el = document.getElementById('judge-thinking');
    if (el) el.textContent = '';
});
socket.on('judge_thinking_delta', (data) => {
    const target = document.getElementById('judge-thinking');
    if (target) {
        target.appendChild(document.createTextNode(data.text));
        target.scrollTop = target.scrollHeight;
    }
    judgeThinkingTokens += data.text.split(/\s+/).length;
    const counter = document.getElementById('judge-thinking-count');
    if (counter) counter.textContent = judgeThinkingTokens.toLocaleString() + ' tokens';
});
socket.on('judge_thinking_complete', () => {
    const det = document.getElementById('judge-thinking-details');
    if (det) det.open = false;
});
socket.on('judge_response_started', () => {
    state.judgeText = '';
    const el = document.getElementById('judge-response');
    if (el) el.textContent = '';
});
socket.on('judge_response_delta', (data) => {
    state.judgeText += data.text;
    const target = document.getElementById('judge-response');
    if (target) {
        target.appendChild(document.createTextNode(data.text));
        target.scrollTop = target.scrollHeight;
    }
});
socket.on('judge_complete', () => {
    safeRenderMarkdown(document.getElementById('judge-response'), state.judgeText);
    setAdversarialPhase(4);
});

socket.on('adversarial_results', () => {
    stopThinking();
    // Safety net: ensure markdown rendered on all panels
    const panels = [
        ['prosecution-response', state.prosecutionText],
        ['defense-response', state.defenseText],
        ['judge-response', state.judgeText],
    ];
    panels.forEach(([id, text]) => {
        const t = document.getElementById(id);
        if (t && text && !t.querySelector('h1, h2, h3, table')) {
            safeRenderMarkdown(t, text);
        }
    });
});

// ============================================================
//  MOTION GENERATION EVENTS
// ============================================================

socket.on('motion_thinking_started', () => {
    $('#right-thinking-stream').textContent = '';
    state.thinkingTokenCount = 0;
    state.thinkingStartTime = Date.now();
    state.thinkingInterval = setInterval(updateThinkingMeta, 1000);
});

socket.on('motion_thinking_delta', (data) => appendThinking(data.text, 'right'));
socket.on('motion_thinking_complete', () => {});

let motionAccumulatedText = '';
socket.on('motion_response_started', () => {
    motionAccumulatedText = '';
    $('#motion-content').textContent = '';
});
socket.on('motion_response_delta', (data) => {
    motionAccumulatedText += data.text;
    const target = $('#motion-content');
    target.appendChild(document.createTextNode(data.text));
    target.scrollTop = target.scrollHeight;
    $('#motion-length').textContent = motionAccumulatedText.length.toLocaleString() + ' characters';
});

socket.on('motion_results', (data) => {
    stopThinking();
    $('#motion-length').textContent = (data.motion_length || 0).toLocaleString() + ' characters';
    // Render motion as formatted markdown
    if (motionAccumulatedText) {
        safeRenderMarkdown($('#motion-content'), motionAccumulatedText);
    }
    // Citation verification starts automatically after motion generation
    const citStatus = $('#citation-status');
    citStatus.textContent = 'Verifying citations...';
    citStatus.classList.remove('hidden');
});

// ============================================================
//  CITATION VERIFICATION EVENTS
// ============================================================

socket.on('citation_verification_started', () => {
    const citStatus = $('#citation-status');
    citStatus.textContent = 'Verifying citations...';
    citStatus.className = 'meta-item citation-status verifying';
});

socket.on('citation_verification_results', (data) => {
    const panel = $('#citation-panel');
    const list = $('#citation-list');
    const summary = $('#citation-summary');
    const citStatus = $('#citation-status');

    list.textContent = '';

    if (data.error) {
        citStatus.textContent = 'Citation check: ' + data.error;
        citStatus.className = 'meta-item citation-status error';
        // Still show local citations if available
        if (data.local_citations && data.local_citations.length) {
            panel.classList.remove('hidden');
            summary.textContent = data.local_citations.length + ' citations found (API unavailable)';
            data.local_citations.forEach(cite => {
                list.appendChild(el('div', { className: 'citation-item ambiguous' },
                    el('span', { className: 'citation-badge ambiguous' }, '?'),
                    el('span', { className: 'citation-text' }, cite),
                    el('span', { className: 'citation-label' }, 'Unverified (API unavailable)')
                ));
            });
        }
        return;
    }

    const verified = data.verified || [];
    const notFound = data.not_found || [];
    const ambiguous = data.ambiguous || [];
    const total = verified.length + notFound.length + ambiguous.length;

    if (total === 0) {
        citStatus.textContent = 'No citations detected';
        citStatus.className = 'meta-item citation-status';
        panel.classList.add('hidden');
        return;
    }

    panel.classList.remove('hidden');

    // Summary badge
    if (notFound.length > 0) {
        citStatus.className = 'meta-item citation-status has-issues';
        citStatus.textContent = notFound.length + ' citation' + (notFound.length > 1 ? 's' : '') + ' not verified';
    } else if (ambiguous.length > 0) {
        citStatus.className = 'meta-item citation-status has-warnings';
        citStatus.textContent = verified.length + '/' + total + ' citations verified';
    } else {
        citStatus.className = 'meta-item citation-status all-good';
        citStatus.textContent = total + '/' + total + ' citations verified';
    }

    summary.textContent = verified.length + ' verified, ' + notFound.length + ' not found, ' + ambiguous.length + ' ambiguous';

    // Render each citation
    verified.forEach(c => {
        const item = el('div', { className: 'citation-item verified' },
            el('span', { className: 'citation-badge verified' }, '\u2713'),
            el('span', { className: 'citation-text' }, c.citation || c.normalized)
        );
        if (c.case_name) item.appendChild(el('span', { className: 'citation-case-name' }, c.case_name));
        if (c.url) {
            const link = el('a', { className: 'citation-link', href: c.url, target: '_blank' }, 'View on CourtListener');
            item.appendChild(link);
        }
        list.appendChild(item);
    });

    notFound.forEach(c => {
        list.appendChild(el('div', { className: 'citation-item not-found' },
            el('span', { className: 'citation-badge not-found' }, '\u2717'),
            el('span', { className: 'citation-text' }, c.citation || c.normalized),
            el('span', { className: 'citation-label' }, 'Not found in CourtListener \u2014 may be hallucinated')
        ));
    });

    ambiguous.forEach(c => {
        list.appendChild(el('div', { className: 'citation-item ambiguous' },
            el('span', { className: 'citation-badge ambiguous' }, '?'),
            el('span', { className: 'citation-text' }, c.citation || c.normalized),
            el('span', { className: 'citation-label' }, 'Ambiguous match')
        ));
    });
});

// ============================================================
//  EVIDENCE ANALYSIS
// ============================================================

async function loadEvidence(caseNumber) {
    const evidenceSection = $('#case-evidence');
    const grid = $('#evidence-grid');
    grid.textContent = '';

    try {
        const resp = await fetch('/api/evidence/' + encodeURIComponent(caseNumber));
        const items = await resp.json();

        if (!items.length) {
            evidenceSection.classList.add('hidden');
            return;
        }

        evidenceSection.classList.remove('hidden');
        items.forEach(item => {
            const card = el('div', { className: 'evidence-card' },
                el('div', { className: 'evidence-thumb' },
                    item.file_path
                        ? (() => { const img = el('img', { src: item.file_path, alt: item.title }); return img; })()
                        : el('div', { className: 'evidence-placeholder' }, item.evidence_type[0].toUpperCase())
                ),
                el('div', { className: 'evidence-info' },
                    el('div', { className: 'evidence-type-badge' }, item.evidence_type),
                    el('div', { className: 'evidence-title' }, item.title),
                    el('div', { className: 'evidence-desc' }, item.description || ''),
                    ...(item.source ? [el('div', { className: 'evidence-source' }, item.source)] : [])
                ),
                el('button', {
                    className: 'btn btn-secondary btn-evidence-analyze',
                    onclick: (e) => {
                        e.stopPropagation();
                        analyzeEvidence(item);
                    }
                }, '\u{1F50D} Analyze with AI')
            );
            grid.appendChild(card);
        });
    } catch (err) {
        evidenceSection.classList.add('hidden');
    }
}

function analyzeEvidence(item) {
    if (state.analysisActive) return;
    state.analysisActive = true;
    setStatus('Analyzing Evidence...', 'analyzing');

    // Show thinking in right panel
    showRightPanel(true);
    $('#right-thinking-stream').textContent = '';
    state.thinkingTokenCount = 0;
    state.thinkingStartTime = Date.now();
    state.thinkingInterval = setInterval(updateThinkingMeta, 1000);

    // Show analysis area in case view
    const analysisEl = $('#case-analysis');
    analysisEl.textContent = '';
    analysisEl.appendChild(el('div', { className: 'evidence-analysis-header' },
        el('h3', {}, 'Analyzing: ' + (item.title || 'Evidence')),
        el('p', { className: 'evidence-analysis-status' }, 'AI is examining this evidence...')
    ));

    state.evidenceResponseText = '';

    socket.emit('analyze_evidence', {
        case_number: state.currentCase.case_number,
        evidence_id: item.id,
    });
}

// Evidence analysis streaming events
socket.on('evidence_analysis_started', (data) => {
    appendThinking('Examining evidence: ' + (data.title || '') + '...\n\n', 'right');
});

socket.on('evidence_thinking_started', () => {});
socket.on('evidence_thinking_delta', (data) => appendThinking(data.text, 'right'));
socket.on('evidence_thinking_complete', () => {
    appendThinking('\n\n--- Evidence analysis thinking complete ---\n', 'right');
});

socket.on('evidence_response_started', () => {
    state.evidenceResponseText = '';
    const analysisEl = $('#case-analysis');
    analysisEl.textContent = '';
});
socket.on('evidence_response_delta', (data) => {
    state.evidenceResponseText += data.text;
    const analysisEl = $('#case-analysis');
    // Stream raw text, will render markdown on complete
    analysisEl.appendChild(document.createTextNode(data.text));
});

socket.on('evidence_analysis_complete', () => {
    // Render final markdown
    if (state.evidenceResponseText) {
        const analysisEl = $('#case-analysis');
        analysisEl.textContent = '';
        const wrapper = document.createElement('div');
        wrapper.className = 'markdown-body';
        wrapper.innerHTML = DOMPurify.sanitize(renderMarkdown(state.evidenceResponseText));
        analysisEl.appendChild(wrapper);
    }
});

socket.on('evidence_analysis_results', (data) => {
    stopThinking();
    if (data.analysis && !state.evidenceResponseText) {
        const analysisEl = $('#case-analysis');
        analysisEl.textContent = '';
        const wrapper = document.createElement('div');
        wrapper.className = 'markdown-body';
        wrapper.innerHTML = DOMPurify.sanitize(renderMarkdown(data.analysis));
        analysisEl.appendChild(wrapper);
    }
});

socket.on('evidence_analysis_error', (data) => {
    stopThinking();
    const analysisEl = $('#case-analysis');
    analysisEl.textContent = '';
    analysisEl.appendChild(el('div', { className: 'error-message' },
        el('strong', {}, 'Evidence Analysis Error: '),
        el('span', {}, data.error || 'Analysis failed')
    ));
});

// ============================================================
//  ERROR HANDLING
// ============================================================

socket.on('analysis_error', (data) => {
    stopThinking();
    console.error('Analysis error:', data.error);
    setStatus('Error', 'error');

    // Show error in the appropriate place based on current view
    const errorMsg = data.error || 'Analysis failed';
    if (state.currentView === 'thinking') {
        const stream = $('#thinking-stream');
        stream.appendChild(el('div', { className: 'error-message' },
            el('strong', {}, 'Error: '),
            el('span', {}, errorMsg)
        ));
        // Stay on thinking view briefly so user can see the error
        setTimeout(() => {
            showView(state.currentCase ? 'case' : 'dashboard');
            showRightPanel(false);
        }, 3000);
    } else if (state.currentView === 'adversarial') {
        // Show error in whichever adversarial panel is active
        const target = document.getElementById('prosecution-response').textContent === ''
            ? document.getElementById('prosecution-response')
            : document.getElementById('defense-response');
        target.appendChild(el('div', { className: 'error-message' },
            el('strong', {}, 'Error: '), el('span', {}, errorMsg)));
    } else if (state.currentView === 'motion') {
        $('#motion-content').textContent = '';
        $('#motion-content').appendChild(el('div', { className: 'error-message' },
            el('strong', {}, 'Error: '), el('span', {}, errorMsg)));
    } else {
        showRightPanel(false);
    }
});

socket.on('status', (data) => {
    if (data.context_tokens) setContextIndicator(data.context_tokens);
});

// ============================================================
//  INIT
// ============================================================

(async function init() {
    const resp = await fetch('/api/stats');
    const stats = await resp.json();
    if (stats.cases.total > 0) {
        await loadCaseList();
        updateDashboardStats(stats.cases);
        showView('dashboard');
        $('#case-search').disabled = false;
        $('#case-filter').disabled = false;

        if (stats.alert_count > 0) {
            const alertResp = await fetch('/api/alerts');
            renderAlerts(await alertResp.json());
            $('#dash-alerts').textContent = stats.alert_count;
            $('#alert-count').textContent = stats.alert_count;
        }
        if (stats.connection_count > 0) {
            const connResp = await fetch('/api/connections');
            renderConnections(await connResp.json());
            $('#dash-connections').textContent = stats.connection_count;
            $('#connection-count').textContent = stats.connection_count;
        }
    }
})();
