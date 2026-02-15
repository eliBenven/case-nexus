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

// --- Socket lifecycle: recover from server disconnects ---
socket.on('disconnect', () => {
    // If an analysis was in progress, reset so UI doesn't freeze forever
    if (typeof stopThinking === 'function') stopThinking();
    const badge = document.querySelector('#status-badge');
    if (badge) { badge.textContent = 'Reconnecting...'; badge.className = 'status-badge error'; }
});
socket.on('connect', () => {
    const badge = document.querySelector('#status-badge');
    if (badge && badge.textContent === 'Reconnecting...') {
        badge.textContent = 'Ready'; badge.className = 'status-badge ready';
    }
});

// Configure marked.js for proper table rendering and GFM
if (typeof marked !== 'undefined') {
    marked.setOptions({
        gfm: true,
        breaks: true,
        tables: true,
    });
}

// ============================================================
//  STATE
// ============================================================

const state = {
    cases: [],
    currentCase: null,
    alerts: [],
    connections: [],
    analysisActive: false,
    chatActive: false,
    thinkingStartTime: null,
    thinkingTokenCount: 0,
    thinkingInterval: null,
    currentView: 'welcome',
    // Adversarial text accumulators for post-stream markdown rendering
    prosecutionText: '',
    defenseText: '',
    judgeText: '',
    // Health check response accumulator (for live findings rendering)
    healthCheckResponseText: '',
    // Cascade tool timeline
    cascadeToolLog: [],
    // Batch smart actions
    batchQueue: [],
    batchRunning: false,
    batchProgress: 0,
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

// ============================================================
//  SKELETON LOADING SYSTEM
// ============================================================

/**
 * Build skeleton placeholder elements that mirror real component shapes.
 * Each skeleton type matches the exact layout geometry of its real counterpart.
 */
const Skeletons = {
    /** Single skeleton line element */
    _line(widthClass) {
        return el('div', { className: 'skeleton-line skeleton ' + (widthClass || 'medium') });
    },

    /** Case list item — mirrors .case-item layout */
    caseItem() {
        const item = el('div', { className: 'skeleton-case-item skeleton-item' },
            el('div', { className: 'skeleton-row' },
                el('div', { className: 'skeleton-line skeleton short', }),
                el('div', { className: 'skeleton-badge skeleton' })
            ),
            el('div', { className: 'skeleton-line skeleton skeleton-name' }),
            el('div', { className: 'skeleton-line skeleton skeleton-charge' }),
            el('div', { className: 'skeleton-meta' },
                el('div', { className: 'skeleton-badge skeleton' }),
                el('div', { className: 'skeleton-badge skeleton' })
            )
        );
        return item;
    },

    /** Alert item — mirrors .alert-item layout */
    alertItem() {
        return el('div', { className: 'skeleton-alert-item skeleton-item' },
            el('div', { className: 'skeleton-row' },
                el('div', { className: 'skeleton-badge skeleton' }),
                el('div', { className: 'skeleton-badge skeleton' }),
            ),
            el('div', { className: 'skeleton-line skeleton long' }),
            el('div', { className: 'skeleton-line skeleton medium' })
        );
    },

    /** Connection item — mirrors .connection-item layout */
    connectionItem() {
        return el('div', { className: 'skeleton-connection-item skeleton-item' },
            el('div', { className: 'skeleton-row' },
                el('div', { className: 'skeleton-badge skeleton' }),
                el('div', { className: 'skeleton-line skeleton short' }),
            ),
            el('div', { className: 'skeleton-line skeleton long' }),
            el('div', { className: 'skeleton-row' },
                el('div', { className: 'skeleton-badge skeleton' }),
                el('div', { className: 'skeleton-badge skeleton' }),
            ),
            el('div', { className: 'skeleton-line skeleton medium' })
        );
    },

    /** Action item — mirrors .action-item layout */
    actionItem() {
        return el('div', { className: 'skeleton-action-item skeleton-item' },
            el('div', { className: 'skeleton-rank skeleton skeleton-block' }),
            el('div', { className: 'skeleton-body' },
                el('div', { className: 'skeleton-line skeleton medium' }),
                el('div', { className: 'skeleton-line skeleton long' }),
                el('div', { className: 'skeleton-line skeleton short' })
            )
        );
    },

    /** Evidence card — mirrors .evidence-card layout */
    evidenceCard() {
        return el('div', { className: 'skeleton-evidence-card skeleton-item' },
            el('div', { className: 'skeleton-thumb' }),
            el('div', { className: 'skeleton-info' },
                el('div', { className: 'skeleton-badge skeleton' }),
                el('div', { className: 'skeleton-line skeleton long' }),
                el('div', { className: 'skeleton-line skeleton medium' })
            ),
            el('div', { className: 'skeleton-btn skeleton skeleton-block' })
        );
    },

    /** Memory item — mirrors .memory-item layout */
    memoryItem() {
        return el('div', { className: 'skeleton-memory-item skeleton-item' },
            el('div', { className: 'skeleton-circle skeleton', style: 'width:32px;height:32px;flex-shrink:0' }),
            el('div', { className: 'skeleton-info' },
                el('div', { className: 'skeleton-line skeleton medium' }),
                el('div', { className: 'skeleton-line skeleton short' }),
                el('div', { className: 'skeleton-line skeleton short' })
            )
        );
    },

    /** Analysis section — mirrors .analysis-section layout */
    analysisSection(hasCards) {
        const children = [
            el('div', { className: 'skeleton-heading skeleton skeleton-block' }),
            el('div', { className: 'skeleton-line skeleton long' }),
            el('div', { className: 'skeleton-line skeleton full' }),
            el('div', { className: 'skeleton-line skeleton medium' }),
        ];
        if (hasCards) {
            children.push(el('div', { className: 'skeleton-analysis-cards' },
                el('div', { className: 'skeleton-mini-card' }),
                el('div', { className: 'skeleton-mini-card' }),
                el('div', { className: 'skeleton-mini-card' })
            ));
        }
        return el('div', { className: 'skeleton-analysis-section skeleton-item' }, ...children);
    },

    /** Strength meter skeleton for prosecution strength */
    strengthMeter() {
        return el('div', { className: 'skeleton-analysis-section skeleton-item' },
            el('div', { className: 'skeleton-heading skeleton skeleton-block' }),
            el('div', { className: 'skeleton-meter skeleton skeleton-block' }),
            el('div', { className: 'skeleton-row', style: 'display:flex;justify-content:space-between' },
                el('div', { className: 'skeleton-line skeleton short' }),
                el('div', { className: 'skeleton-line skeleton short' })
            )
        );
    },
};

/**
 * Fill a container with skeleton placeholders.
 * @param {HTMLElement} container - DOM element to fill
 * @param {string} type - skeleton type key (caseItem, alertItem, etc.)
 * @param {number} count - number of skeletons to show
 */
function showSkeletons(container, type, count) {
    // Clear existing content
    container.textContent = '';
    const builder = Skeletons[type];
    if (!builder) return;
    for (let i = 0; i < count; i++) {
        const skel = builder();
        skel.dataset.skeleton = 'true';
        container.appendChild(skel);
    }
}

/**
 * Remove all skeleton elements from a container with a smooth fade-out.
 * @param {HTMLElement} container - DOM element to clear skeletons from
 * @param {Function} [callback] - called after fade completes
 */
function clearSkeletons(container, callback) {
    const skeletons = container.querySelectorAll('[data-skeleton]');
    if (!skeletons.length) {
        if (callback) callback();
        return;
    }
    skeletons.forEach(s => s.classList.add('skeleton-fade-out'));
    // Remove after animation
    setTimeout(() => {
        skeletons.forEach(s => s.remove());
        if (callback) callback();
    }, 250);
}

/** Create a text section with 3-line truncation and "Read more" toggle */
function makeClampedSection(title, text, extraClass) {
    const sec = el('div', { className: 'info-section' + (extraClass ? ' ' + extraClass + '-section' : '') });
    sec.appendChild(el('h3', {}, title));
    const p = el('p', { className: (extraClass || '') + ' text-clamp' }, text);
    sec.appendChild(p);
    // Only add toggle if text is long enough to likely be clamped
    if (text && text.length > 150) {
        const toggle = el('button', { className: 'read-more-toggle', onclick: () => {
            const isExpanded = p.classList.toggle('expanded');
            toggle.textContent = isExpanded ? 'Show less' : 'Read more';
        }}, 'Read more');
        sec.appendChild(toggle);
    }
    return sec;
}

/** Make dashboard panels collapsible — click h3 to toggle */
function initCollapsiblePanels() {
    document.querySelectorAll('.panel h3').forEach(h3 => {
        if (h3.querySelector('.collapse-arrow')) return; // already initialized
        const arrow = document.createElement('span');
        arrow.className = 'collapse-arrow';
        arrow.textContent = '\u25BE';
        h3.appendChild(arrow);
        h3.addEventListener('click', () => {
            h3.closest('.panel').classList.toggle('collapsed');
        });
    });
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

/** Throttled live markdown render during streaming.
 *  Re-renders at most every 150ms to keep UI smooth. */
const _streamTimers = {};
function streamRenderMarkdown(container, fullText, key) {
    if (!container || !fullText) return;
    if (_streamTimers[key]) return; // render already scheduled
    _streamTimers[key] = setTimeout(() => {
        delete _streamTimers[key];
        const html = renderMarkdown(fullText);
        container.innerHTML = '';
        const wrapper = document.createElement('div');
        wrapper.className = 'markdown-body streaming';
        wrapper.innerHTML = DOMPurify.sanitize(html);
        container.appendChild(wrapper);
        container.scrollTop = container.scrollHeight;
    }, 150);
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
            conn.classList.toggle('complete', i < phaseNum);
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
    const prev = Object.values(views).find(v => v.classList.contains('active'));
    if (prev && prev !== views[name]) {
        prev.style.animation = 'none';
        prev.classList.remove('active');
    }
    if (views[name]) {
        views[name].classList.add('active');
        views[name].style.animation = 'none';
        // Force reflow then play entrance animation
        void views[name].offsetWidth;
        views[name].style.animation = '';
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
    // Legacy — now handled by token viz
}

// ============================================================
//  LIVE TOKEN VISUALIZATION
// ============================================================

// Cumulative live counters — ticks up during streaming, snaps to
// accurate server values when each API call completes.
const tokenVizState = {
    total_input: 0,
    total_output: 0,
    total_thinking: 0,
    call_count: 0,
    // Live deltas (estimated from streaming chunks, reset on server snap)
    live_thinking: 0,
    live_output: 0,
};

const fmtTokens = (n) => n >= 1000000 ? (n / 1000000).toFixed(2) + 'M'
    : n >= 1000 ? (n / 1000).toFixed(1) + 'K' : String(n);

function renderTokenViz() {
    const s = tokenVizState;
    const thinking = s.total_thinking + s.live_thinking;
    const output = s.total_output + s.live_output;
    const total = s.total_input + thinking + output;
    const pct = Math.min((total / 1000000) * 100, 100);

    const bar = document.getElementById('token-viz-bar');
    if (bar) {
        bar.style.width = pct + '%';
        if (pct > 70) bar.style.background = 'linear-gradient(90deg, var(--gold), var(--orange))';
        else if (pct > 40) bar.style.background = 'linear-gradient(90deg, var(--gold-dim), var(--gold))';
    }

    const set = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
    set('token-viz-total', fmtTokens(total));
    set('tv-input', fmtTokens(s.total_input));
    set('tv-thinking', fmtTokens(thinking));
    set('tv-output', fmtTokens(output));
    set('tv-calls', String(s.call_count));

    // Update label: show "/ 1M context" for single-call view, "total tokens" when cumulative exceeds 1M
    const capEl = document.getElementById('token-viz-cap');
    if (capEl) capEl.textContent = total > 1000000 ? 'total tokens' : '/ 1M context';
}

// Server sends accurate totals after each API call completes — snap to them
socket.on('token_update', (data) => {
    tokenVizState.total_input = data.total_input || 0;
    tokenVizState.total_output = data.total_output || 0;
    tokenVizState.total_thinking = data.total_thinking || 0;
    tokenVizState.call_count = data.call_count || 0;
    // Reset live deltas — server numbers are authoritative
    tokenVizState.live_thinking = 0;
    tokenVizState.live_output = 0;
    renderTokenViz();
});

// Live: catch ALL thinking/response deltas and tick the counter in real-time
// Also catch tool_call and tool_result events for agentic mode display
socket.onAny((event, data) => {
    if (!data) return;

    // Token viz: track thinking/response deltas
    if (typeof data.text === 'string') {
        const approxTokens = Math.ceil(data.text.length / 4);
        if (event.endsWith('_thinking_delta')) {
            tokenVizState.live_thinking += approxTokens;
            renderTokenViz();
        } else if (event.endsWith('_response_delta')) {
            tokenVizState.live_output += approxTokens;
            renderTokenViz();
        }
    }

    // Cascade tool timeline (cinematic version)
    if (event === 'cascade_tool_call' && data.tool_name) {
        handleCascadeToolCall(data);
        return;
    } else if (event === 'cascade_tool_result' && data.tool_name) {
        handleCascadeToolResult(data);
        return;
    }

    // Tool-use indicators: render in appropriate target panel
    if (event.endsWith('_tool_call') && data.tool_name) {
        renderToolCallIndicator(event, data);
    } else if (event.endsWith('_tool_result') && data.tool_name) {
        renderToolResultIndicator(event, data);
    }
});

// ============================================================
//  TOOL-USE DISPLAY HELPERS (Agentic Mode)
// ============================================================

function formatToolName(name) {
    return (name || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function formatToolInput(input) {
    if (!input || typeof input !== 'object') return '';
    const keys = Object.keys(input);
    if (keys.length === 0) return '';
    // Show first meaningful value
    for (const k of keys) {
        const v = input[k];
        if (typeof v === 'string' && v.length > 0) {
            return v.length > 60 ? v.substring(0, 57) + '...' : v;
        }
        if (Array.isArray(v)) {
            return v.join(', ').substring(0, 60);
        }
    }
    return '';
}

function getToolTarget(eventPrefix) {
    // Route tool indicators to the right panel based on the event prefix
    if (eventPrefix.startsWith('cascade')) {
        return document.getElementById('cascade-tool-log');
    }
    if (eventPrefix.startsWith('deep_analysis')) {
        return document.getElementById('deep-thinking-stream');
    }
    if (eventPrefix.startsWith('chat')) {
        return state.chatThinkingEl;
    }
    // Default: right panel thinking stream
    return document.getElementById('right-thinking-stream');
}

function renderToolCallIndicator(event, data) {
    const prefix = event.replace(/_tool_call$/, '');
    const target = getToolTarget(prefix);
    if (!target) return;

    // If status is "calling", create a new indicator
    if (data.status === 'calling') {
        const indicator = el('div', {
            className: 'tool-call-indicator',
            id: 'tool-call-' + (data.tool_id || ''),
        },
            el('span', { className: 'tool-icon' }, ''),
            el('span', { className: 'tool-name' }, formatToolName(data.tool_name)),
            el('span', { className: 'tool-status calling' }, 'calling')
        );
        target.appendChild(indicator);
        target.scrollTop = target.scrollHeight;
    } else if (data.status === 'executing') {
        // Update existing indicator
        const existing = document.getElementById('tool-call-' + (data.tool_id || ''));
        if (existing) {
            const statusEl = existing.querySelector('.tool-status');
            if (statusEl) {
                statusEl.textContent = 'executing';
                statusEl.className = 'tool-status executing';
            }
            // Add input preview if available
            const inputPreview = formatToolInput(data.tool_input);
            if (inputPreview) {
                const preview = el('span', { className: 'tool-input-preview' }, inputPreview);
                // Insert before status
                existing.insertBefore(preview, existing.querySelector('.tool-status'));
            }
        }
    }
}

function summarizeToolResult(toolName, preview, length) {
    // Try to parse the preview as JSON for a meaningful summary
    if (preview) {
        try {
            // Handle truncated previews by checking for valid JSON
            let parsed = null;
            try { parsed = JSON.parse(preview); } catch (_) {}
            if (parsed !== null) {
                if (Array.isArray(parsed)) {
                    if (parsed.length === 0) return 'None found';
                    const noun = toolName.replace(/^get_/, '').replace(/_/g, ' ');
                    return parsed.length + ' ' + noun;
                }
                if (typeof parsed === 'object') {
                    const keys = Object.keys(parsed);
                    if (keys.length === 0) return 'Empty';
                    if (parsed.error) return 'Error';
                    return keys.length + ' fields';
                }
            }
            // Unparseable JSON (truncated) — show size
        } catch (_) {}
    }
    if (length > 1000) return (length / 1000).toFixed(1) + 'K chars';
    return length + ' chars';
}

function formatResultPreview(preview) {
    if (!preview) return '';
    try {
        const parsed = JSON.parse(preview);
        return JSON.stringify(parsed, null, 2);
    } catch (_) {
        return preview;
    }
}

function renderToolResultIndicator(event, data) {
    const prefix = event.replace(/_tool_result$/, '');
    const target = getToolTarget(prefix);
    if (!target) return;

    const summary = summarizeToolResult(data.tool_name, data.result_preview, data.result_length);

    const indicator = el('div', { className: 'tool-result-indicator' },
        el('span', { className: 'tool-icon' }, '\u2713'),
        el('span', { className: 'tool-name' }, formatToolName(data.tool_name)),
        el('span', { className: 'tool-result-size' }, summary)
    );

    // Add inline preview for non-trivial results
    if (data.result_preview && data.result_length > 5) {
        const formatted = formatResultPreview(data.result_preview);
        const previewEl = el('div', { className: 'tool-result-preview' });
        const pre = document.createElement('pre');
        pre.textContent = formatted.length > 300 ? formatted.substring(0, 300) + '...' : formatted;
        previewEl.appendChild(pre);
        indicator.appendChild(previewEl);
    }

    target.appendChild(indicator);
    target.scrollTop = target.scrollHeight;

    // Update the calling indicator to show "done"
    const callingEl = document.getElementById('tool-call-' + (data.tool_id || ''));
    if (callingEl) {
        const statusEl = callingEl.querySelector('.tool-status');
        if (statusEl) {
            statusEl.textContent = 'done';
            statusEl.className = 'tool-status';
            statusEl.style.color = 'var(--green)';
        }
    }
}

// ============================================================
//  LEGAL CORPUS INDICATOR
// ============================================================

socket.on('legal_corpus_loaded', (data) => {
    const badge = $('#legal-corpus-badge');
    const stats = $('#lc-stats');
    if (badge && stats) {
        const ga = data.ga_statutes || 0;
        const fed = data.federal_sections || 0;
        const amend = data.amendments || 0;
        const cases = data.landmark_cases || 0;
        stats.textContent = `${ga} GA | ${fed.toLocaleString()} USC | ${amend} Amendments | ${cases} Cases`;
        badge.classList.remove('hidden');
    }
});

// ============================================================
//  CASELOAD LOADING
// ============================================================

$('#btn-load-demo').addEventListener('click', () => {
    const btn = $('#btn-load-demo');
    btn.disabled = true;
    btn.textContent = 'Syncing from court CMS...';
    btn.classList.add('loading-pulse');
    setStatus('Syncing caseload...', 'loading');
    // Show skeleton case items while loading
    showSkeletons($('#case-list'), 'caseItem', 10);
    socket.emit('load_demo_caseload');
});

socket.on('caseload_loaded', (data) => {
    setStatus('Ready', 'ready');
    loadCaseList();
    showView('dashboard');
    updateDashboardStats(data);
    $('#case-search').disabled = false;
    $('#case-filter').disabled = false;
    // Show chat button now that cases are loaded
    $('#btn-chat-toggle').classList.remove('hidden');

    // Show sync status in sidebar header
    const sidebarHeader = document.querySelector('.sidebar-header');
    let syncEl = document.getElementById('cms-sync-status');
    if (!syncEl) {
        syncEl = el('div', { id: 'cms-sync-status', className: 'cms-sync-status' });
        sidebarHeader.parentNode.insertBefore(syncEl, sidebarHeader.nextSibling);
    }
    const now = new Date();
    syncEl.innerHTML = '';
    syncEl.appendChild(el('span', { className: 'cms-sync-dot' }));
    syncEl.appendChild(document.createTextNode(
        'Synced from Fulton County CMS \u2014 ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    ));
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
            el('p', { className: 'hint' }, '500 criminal defense cases')
        );
        list.appendChild(empty);
        return;
    }

    cases.forEach((c, idx) => {
        const charges = JSON.parse(c.charges || '[]');
        const chargeStr = charges[0] || 'Unknown';
        const severityClass = c.severity === 'felony' ? 'felony' : 'misdemeanor';
        const statusText = (c.status || '').replace(/_/g, ' ');

        const evCount = c.evidence_count || 0;
        const item = el('div', { className: 'case-item ' + severityClass, onclick: () => openCase(c.case_number) },
            el('div', { className: 'case-item-header' },
                el('span', { className: 'case-number' }, c.case_number),
                el('span', { className: 'case-item-badges' },
                    ...(evCount > 0 ? [el('span', { className: 'evidence-count-badge', title: `${evCount} evidence item${evCount > 1 ? 's' : ''}` }, `${evCount}`)] : []),
                    el('span', { className: 'severity-badge ' + severityClass }, c.severity[0].toUpperCase())
                )
            ),
            el('div', { className: 'case-item-name' }, c.defendant_name),
            el('div', { className: 'case-item-charge' }, chargeStr),
            el('div', { className: 'case-item-meta' },
                el('span', { className: 'status-tag ' + c.status }, statusText),
                ...(c.next_hearing_date ? [el('span', { className: 'hearing-date' }, c.next_hearing_date)] : [])
            )
        );
        // Stagger entrance animation for first 30 visible items
        if (idx < 30) {
            item.style.animation = `fadeInUp 0.3s var(--ease-out) ${idx * 15}ms both`;
        }
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

    // Pre-fill dashboard panels with skeletons so user sees what's coming
    document.getElementById('dashboard-panels').style.display = '';
    showSkeletons($('#alerts-list'), 'alertItem', 3);
    showSkeletons($('#connections-list'), 'connectionItem', 3);
    $('#priority-actions').classList.remove('hidden');
    showSkeletons($('#actions-list'), 'actionItem', 5);

    socket.emit('run_health_check');
});

// ============================================================
//  CASE DETAIL
// ============================================================

// openCase is defined below (near line 2538) with full insight/evidence loading
window.openCase = openCase;

function renderCaseInfo(c) {
    const charges = JSON.parse(c.charges || '[]');
    const witnesses = JSON.parse(c.witnesses || '[]');
    const heroZone = document.getElementById('case-hero-zone');
    heroZone.textContent = '';
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
    addStat('Court', c.court);
    addStat('Judge', c.judge);
    addStat('Prosecutor', c.prosecutor);
    addStat('Officer', c.arresting_officer);
    hero.appendChild(statsRow);

    // Next Hearing Callout
    if (c.next_hearing_date) {
        const daysUntil = Math.ceil((new Date(c.next_hearing_date) - new Date()) / (1000 * 60 * 60 * 24));
        const urgencyClass = daysUntil <= 7 ? 'urgent' : daysUntil <= 30 ? 'soon' : 'normal';
        hero.appendChild(el('div', { className: 'hearing-callout ' + urgencyClass },
            el('div', { className: 'hearing-callout-left' },
                el('span', { className: 'hearing-callout-icon' }, ''),
                el('div', {},
                    el('span', { className: 'hearing-callout-date' }, c.next_hearing_date),
                    el('span', { className: 'hearing-callout-type' }, c.hearing_type || 'Hearing')
                )
            ),
            el('div', { className: 'hearing-countdown ' + urgencyClass },
                el('span', { className: 'countdown-number' }, daysUntil > 0 ? String(daysUntil) : '0'),
                el('span', { className: 'countdown-label' }, daysUntil > 0 ? (daysUntil === 1 ? 'day' : 'days') : 'today')
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

    heroZone.appendChild(hero);

    // Case Timeline Visualization
    renderCaseTimeline(c, heroZone);

    // ── OVERVIEW TAB: Dates, Plea, Prior Record, Witnesses ──
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

    // ── EVIDENCE TAB: Evidence Summary ──
    const evidenceSummaryContainer = document.getElementById('case-evidence-summary');
    if (evidenceSummaryContainer) {
        evidenceSummaryContainer.textContent = '';
        if (c.evidence_summary) {
            evidenceSummaryContainer.appendChild(makeClampedSection('Evidence Summary', c.evidence_summary));
        }
    }

    // ── NOTES TAB: Case Notes + Attorney Notes ──
    const notesContainer = document.getElementById('case-notes-content');
    if (notesContainer) {
        notesContainer.textContent = '';
        if (c.notes) {
            notesContainer.appendChild(makeClampedSection('Case Notes', c.notes));
        }
        if (c.attorney_notes) {
            notesContainer.appendChild(makeClampedSection('Attorney Notes', c.attorney_notes, 'attorney-notes'));
        }
        if (!c.notes && !c.attorney_notes) {
            notesContainer.appendChild(el('p', { className: 'empty-hint' }, 'No notes for this case'));
        }
    }

    // Reset to Overview tab
    switchCaseTab('overview');
}

// ============================================================
//  CASE DETAIL TABS
// ============================================================

function switchCaseTab(tabName) {
    document.querySelectorAll('.case-tab').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    document.querySelectorAll('.case-tab-panel').forEach(panel => {
        panel.classList.toggle('active', panel.id === 'tab-' + tabName);
    });
}

// Tab click handlers
document.querySelectorAll('.case-tab').forEach(btn => {
    btn.addEventListener('click', () => switchCaseTab(btn.dataset.tab));
});

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

    // Show skeleton preview of analysis structure while AI thinks
    const analysisEl = $('#case-analysis');
    analysisEl.textContent = '';
    analysisEl.appendChild(el('div', { className: 'analysis-loading' },
        el('span', { className: 'thinking-icon pulse' }, ''),
        el('span', {}, 'Running deep analysis with extended thinking...')
    ));
    // Skeleton preview of the structured analysis that will appear
    const skelWrap = el('div', { className: 'analysis-skeleton-preview' });
    skelWrap.dataset.skeleton = 'true';
    skelWrap.appendChild(Skeletons.analysisSection(false));  // Executive Summary
    skelWrap.appendChild(Skeletons.strengthMeter());          // Prosecution Strength
    skelWrap.appendChild(Skeletons.analysisSection(true));    // Key Facts
    skelWrap.appendChild(Skeletons.analysisSection(true));    // Defense Strategies
    analysisEl.appendChild(skelWrap);

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

    // Dim judge panel (visible but muted, like defense)
    const judgePanel = document.getElementById('judge-panel');
    if (judgePanel) judgePanel.classList.remove('hidden');

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

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const motionModal = $('#motion-modal');
        const widgetModal = document.getElementById('widget-modal');
        if (motionModal && !motionModal.classList.contains('hidden')) {
            motionModal.classList.add('hidden');
        }
        if (widgetModal && !widgetModal.classList.contains('hidden')) {
            widgetModal.classList.add('hidden');
        }
    }
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

$('#btn-motion-download').addEventListener('click', () => {
    const content = motionAccumulatedText || $('#motion-content').textContent;
    const title = $('#motion-title').textContent || 'motion';
    const caseNum = state.currentCase ? state.currentCase.case_number : '';
    const filename = (caseNum + '_' + title).replace(/[^a-zA-Z0-9_-]/g, '_') + '.md';
    exportAsMarkdown(content, filename);
});

// ============================================================
//  THINKING STREAM DISPLAY
// ============================================================

// Spinner phrases — rotates during AI thinking
const SPINNER_PHRASES = [
    "Analyzing case details...",
    "Reviewing the evidence...",
    "Cross-referencing statutes...",
    "Evaluating legal arguments...",
    "Examining witness statements...",
    "Checking case precedents...",
    "Building defense strategy...",
    "Assessing prosecution angles...",
    "Reviewing constitutional issues...",
    "Identifying evidence gaps...",
    "Mapping case connections...",
    "Weighing the arguments...",
    "Drafting legal analysis...",
    "Processing case history...",
    "Searching for precedent...",
    "Evaluating plea options...",
    "Reviewing discovery materials...",
    "Checking speedy trial deadlines...",
    "Analyzing charge elements...",
    "Synthesizing findings...",
];
let _spinnerIdx = 0;

function startThinkingView(title) {
    showView('thinking');
    _spinnerIdx = Math.floor(Math.random() * SPINNER_PHRASES.length);
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
    // Rotate spinner phrase every 4 seconds
    if (elapsed > 0 && elapsed % 4 === 0) {
        _spinnerIdx = (_spinnerIdx + 1) % SPINNER_PHRASES.length;
        const titleEl = $('#thinking-title-text');
        if (titleEl) titleEl.textContent = SPINNER_PHRASES[_spinnerIdx];
    }
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

// --- Health Check: Fancy progress UI instead of raw thinking dump ---
const HC_PHASES = [
    { id: 'hc-deadline', icon: '1', label: 'Scanning deadlines & speedy trial calculations' },
    { id: 'hc-connections', icon: '2', label: 'Finding cross-case connections' },
    { id: 'hc-constitutional', icon: '3', label: 'Checking constitutional issues' },
    { id: 'hc-pleas', icon: '4', label: 'Analyzing plea offers & disparities' },
    { id: 'hc-strategy', icon: '5', label: 'Generating priority actions' },
];
let _hcThinkingChars = 0;
let _hcPhaseIdx = 0;

function _buildHcProgressUI() {
    const stream = $('#thinking-stream');
    stream.textContent = '';

    const wrap = el('div', { className: 'hc-progress-wrap' });
    const phasesDiv = el('div', { className: 'hc-progress-phases' });
    HC_PHASES.forEach(p => {
        const phase = el('div', { className: 'hc-phase pending', id: p.id },
            el('span', { className: 'hc-phase-icon' }, p.icon),
            el('span', { className: 'hc-phase-label' }, p.label),
            el('span', { className: 'hc-phase-status' })
        );
        phasesDiv.appendChild(phase);
    });
    wrap.appendChild(phasesDiv);

    const details = document.createElement('details');
    details.className = 'hc-raw-thinking';
    const summary = document.createElement('summary');
    summary.textContent = 'View raw AI reasoning';
    details.appendChild(summary);
    const pre = el('pre', { className: 'hc-raw-stream', id: 'hc-raw-stream' });
    details.appendChild(pre);
    wrap.appendChild(details);

    stream.appendChild(wrap);
    _hcThinkingChars = 0;
    _hcPhaseIdx = 0;

    const first = document.getElementById(HC_PHASES[0].id);
    if (first) {
        first.className = 'hc-phase active';
        first.querySelector('.hc-phase-status').textContent = '...';
    }
}

function _advanceHcPhase() {
    if (_hcPhaseIdx >= HC_PHASES.length) return;
    const cur = document.getElementById(HC_PHASES[_hcPhaseIdx].id);
    if (cur) {
        cur.className = 'hc-phase complete';
        cur.querySelector('.hc-phase-status').textContent = '\u2713';
    }
    _hcPhaseIdx++;
    if (_hcPhaseIdx < HC_PHASES.length) {
        const next = document.getElementById(HC_PHASES[_hcPhaseIdx].id);
        if (next) {
            next.className = 'hc-phase active';
            next.querySelector('.hc-phase-status').textContent = '...';
        }
    }
}

socket.on('health_check_thinking_started', () => {
    _buildHcProgressUI();
});

socket.on('health_check_thinking_delta', (data) => {
    _hcThinkingChars += data.text.length;
    const phaseThreshold = 8000;
    const expectedPhase = Math.min(Math.floor(_hcThinkingChars / phaseThreshold), HC_PHASES.length - 1);
    while (_hcPhaseIdx < expectedPhase) _advanceHcPhase();
    const raw = document.getElementById('hc-raw-stream');
    if (raw) { raw.textContent += data.text; raw.scrollTop = raw.scrollHeight; }
    state.thinkingTokenCount += data.text.split(/\s+/).length;
});

socket.on('health_check_thinking_complete', () => {
    while (_hcPhaseIdx < HC_PHASES.length) _advanceHcPhase();
    setStatus('Generating results...', 'analyzing');
    $('#thinking-title-text').textContent = 'Generating results...';
    const stream = $('#thinking-stream');
    const genBanner = el('div', { className: 'hc-generating' },
        el('span', { className: 'thinking-icon pulse' }, ''),
        document.createTextNode(' Building alerts, connections, and priority actions...')
    );
    stream.appendChild(genBanner);
});

socket.on('health_check_response_started', () => {
    state.healthCheckResponseText = '';
    // Remove the "Building alerts..." banner since real content is arriving
    const banner = document.querySelector('.hc-generating');
    if (banner) banner.remove();
    // Create response container in the thinking view
    const stream = $('#thinking-stream');
    if (stream && !document.getElementById('hc-response-container')) {
        const header = el('div', { className: 'hc-response-header' },
            el('span', { className: 'thinking-icon pulse' }, ''),
            document.createTextNode(' Findings')
        );
        header.style.cssText = 'font-size:13px;font-weight:600;color:var(--gold);margin-top:16px;margin-bottom:8px;display:flex;align-items:center;gap:6px;';
        stream.appendChild(header);
        const container = el('div', { id: 'hc-response-container', className: 'markdown-body' });
        container.style.cssText = 'padding:12px 16px;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;max-height:400px;overflow-y:auto;';
        stream.appendChild(container);
    }
    $('#thinking-title-text').textContent = 'Findings streaming...';
});
socket.on('health_check_response_delta', (data) => {
    state.healthCheckResponseText += data.text;
    const container = document.getElementById('hc-response-container');
    if (container) {
        streamRenderMarkdown(container, state.healthCheckResponseText, 'hc-response');
    }
});
socket.on('health_check_complete', () => {
    // Final render of full response
    const container = document.getElementById('hc-response-container');
    if (container && state.healthCheckResponseText) {
        safeRenderMarkdown(container, state.healthCheckResponseText);
    }
    setStatus('Complete', 'ready');
});

socket.on('health_check_results', (data) => {
    stopThinking();
    state.alerts = data.alerts || [];
    state.connections = data.connections || [];

    renderAlerts(data.alerts || []);
    renderConnections(data.connections || []);
    renderPriorityActions(data.priority_actions || []);

    const alertCount = (data.alerts || []).length;
    const connCount = (data.connections || []).length;
    $('#dash-alerts').textContent = alertCount;
    $('#dash-connections').textContent = connCount;
    $('#alert-count').textContent = alertCount;
    $('#connection-count').textContent = connCount;
    // Show stat pills and panels when populated
    if (alertCount > 0) {
        document.getElementById('stat-pill-alerts').style.display = '';
    }
    if (connCount > 0) {
        document.getElementById('stat-pill-connections').style.display = '';
    }
    if (alertCount > 0 || connCount > 0) {
        document.getElementById('dashboard-panels').style.display = '';
    }

    if (data.context_tokens) setContextIndicator(data.context_tokens);
    renderRiskHeatmap();
    renderMemoryPanel();
    showView('dashboard');
    // Initialize collapsible panels — start alerts & connections collapsed
    setTimeout(() => {
        initCollapsiblePanels();
        document.querySelectorAll('.alerts-panel, .connections-panel').forEach(p => {
            p.classList.add('collapsed');
        });
    }, 50);
});

function renderAlerts(alerts) {
    const list = $('#alerts-list');
    list.textContent = '';
    if (!alerts.length) return;

    // Add summary line visible when collapsed
    const panel = list.closest('.panel');
    if (panel) {
        let summaryEl = panel.querySelector('.panel-summary');
        if (!summaryEl) {
            summaryEl = el('div', { className: 'panel-summary' });
            panel.querySelector('h3').after(summaryEl);
        }
        const criticalCount = alerts.filter(a => a.severity === 'critical').length;
        const warningCount = alerts.filter(a => a.severity === 'warning').length;
        const parts = [];
        if (criticalCount) parts.push(criticalCount + ' critical');
        if (warningCount) parts.push(warningCount + ' warning');
        summaryEl.textContent = alerts.length + ' alerts' + (parts.length ? ' (' + parts.join(', ') + ')' : '');
    }

    const VISIBLE = 3;
    alerts.forEach((a, i) => {
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
        if (i >= VISIBLE) item.style.display = 'none';
        item.dataset.listItem = 'true';
        list.appendChild(item);
    });
    if (alerts.length > VISIBLE) {
        const remaining = alerts.length - VISIBLE;
        const btn = el('button', { className: 'show-more-btn', onclick: () => {
            list.querySelectorAll('[data-list-item]').forEach(el => el.style.display = '');
            btn.remove();
        }}, 'Show ' + remaining + ' more alerts');
        list.appendChild(btn);
    }
}

function renderConnections(connections) {
    const list = $('#connections-list');
    list.textContent = '';
    if (!connections.length) return;

    // Add summary line visible when collapsed
    const panel = list.closest('.panel');
    if (panel) {
        let summaryEl = panel.querySelector('.panel-summary');
        if (!summaryEl) {
            summaryEl = el('div', { className: 'panel-summary' });
            panel.querySelector('h3').after(summaryEl);
        }
        const types = {};
        connections.forEach(c => { types[c.connection_type] = (types[c.connection_type] || 0) + 1; });
        const topTypes = Object.entries(types).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([t]) => t.toLowerCase()).join(', ');
        summaryEl.textContent = connections.length + ' connections' + (topTypes ? ' (' + topTypes + ')' : '');
    }

    const VISIBLE = 3;
    connections.forEach((c, i) => {
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
        if (i >= VISIBLE) item.style.display = 'none';
        item.dataset.listItem = 'true';
        list.appendChild(item);
    });
    if (connections.length > VISIBLE) {
        const remaining = connections.length - VISIBLE;
        const btn = el('button', { className: 'show-more-btn', onclick: () => {
            list.querySelectorAll('[data-list-item]').forEach(el => el.style.display = '');
            btn.remove();
        }}, 'Show ' + remaining + ' more connections');
        list.appendChild(btn);
    }
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
    const VISIBLE = 5;
    actions.forEach((a, i) => {
        const item = el('div', { className: 'action-item ' + (a.urgency || '') },
            el('span', { className: 'action-rank' }, '#' + a.rank),
            el('div', { className: 'action-body' },
                el('span', { className: 'action-case', onclick: () => openCase(a.case_number) }, a.case_number || ''),
                el('span', { className: 'action-text' }, a.action || ''),
                el('span', { className: 'action-urgency ' + (a.urgency || '') }, (a.urgency || '').replace(/_/g, ' '))
            ),
            el('div', { className: 'action-reason' }, a.reason || '')
        );
        if (i >= VISIBLE) item.style.display = 'none';
        item.dataset.listItem = 'true';
        list.appendChild(item);
    });
    if (actions.length > VISIBLE) {
        const remaining = actions.length - VISIBLE;
        const btn = el('button', { className: 'show-more-btn', onclick: () => {
            list.querySelectorAll('[data-list-item]').forEach(el => el.style.display = '');
            btn.remove();
        }}, 'Show ' + remaining + ' more actions');
        list.appendChild(btn);
    }
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
    streamRenderMarkdown($('#case-analysis'), state.deepAnalysisResponseText, 'deep');
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
        addDownloadButton(analysisEl, state.deepAnalysisResponseText, 'deep_analysis');
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
        state.prosecutionText = '';
        document.getElementById('prosecution-response').textContent = '';
        const det = document.getElementById('prosecution-thinking-details');
        if (det) det.open = true;
    } else if (phase === 'defense') {
        defenseThinkingTokens = 0;
        state.defenseText = '';
        document.getElementById('defense-response').textContent = '';
        const defDet = document.getElementById('defense-thinking-details');
        if (defDet) defDet.open = true;
    } else if (phase === 'judge') {
        judgeThinkingTokens = 0;
        state.judgeText = '';
        const judgeEl = document.getElementById('judge-response');
        if (judgeEl) judgeEl.textContent = '';
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
    // Don't auto-collapse — let user control it
});
socket.on('prosecution_response_started', () => {
    if (!state.prosecutionText) {
        document.getElementById('prosecution-response').textContent = '';
    }
});
socket.on('prosecution_response_delta', (data) => {
    state.prosecutionText += data.text;
    streamRenderMarkdown(document.getElementById('prosecution-response'), state.prosecutionText, 'prosecution');
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
    // Don't auto-collapse — let user control it
});
socket.on('defense_response_started', () => {
    if (!state.defenseText) {
        document.getElementById('defense-response').textContent = '';
    }
});
socket.on('defense_response_delta', (data) => {
    state.defenseText += data.text;
    streamRenderMarkdown(document.getElementById('defense-response'), state.defenseText, 'defense');
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
    // Don't auto-collapse — let user control it
});
socket.on('judge_response_started', () => {
    if (!state.judgeText) {
        const el = document.getElementById('judge-response');
        if (el) el.textContent = '';
    }
});
socket.on('judge_response_delta', (data) => {
    state.judgeText += data.text;
    streamRenderMarkdown(document.getElementById('judge-response'), state.judgeText, 'judge');
});
socket.on('judge_complete', () => {
    safeRenderMarkdown(document.getElementById('judge-response'), state.judgeText);
    setAdversarialPhase(4);
});

socket.on('adversarial_results', (data) => {
    stopThinking();
    // Use server-provided full text when client-side text is incomplete
    const prosText = (data && data.prosecution && data.prosecution.length > (state.prosecutionText || '').length)
        ? data.prosecution : state.prosecutionText;
    const defText = (data && data.defense && data.defense.length > (state.defenseText || '').length)
        ? data.defense : state.defenseText;
    const judText = (data && data.judge && data.judge.length > (state.judgeText || '').length)
        ? data.judge : state.judgeText;

    const panels = [
        ['prosecution-response', prosText],
        ['defense-response', defText],
        ['judge-response', judText],
    ];
    panels.forEach(([id, text]) => {
        const t = document.getElementById(id);
        if (t && text) {
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
    streamRenderMarkdown($('#motion-content'), motionAccumulatedText, 'motion');
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
            summary.textContent = data.local_citations.length + ' citations found (verification unavailable)';
            data.local_citations.forEach(cite => {
                list.appendChild(el('div', { className: 'citation-item ambiguous' },
                    el('span', { className: 'citation-badge ambiguous' }, '?'),
                    el('span', { className: 'citation-text' }, cite),
                    el('span', { className: 'citation-label' }, 'Unverified (search unavailable)')
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
            const link = el('a', { className: 'citation-link', href: c.url, target: '_blank' }, 'View Source');
            item.appendChild(link);
        }
        list.appendChild(item);
    });

    notFound.forEach(c => {
        list.appendChild(el('div', { className: 'citation-item not-found' },
            el('span', { className: 'citation-badge not-found' }, '\u2717'),
            el('span', { className: 'citation-text' }, c.citation || c.normalized),
            el('span', { className: 'citation-label' }, 'Not found via web search \u2014 may be hallucinated')
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

    // Always show section with upload zone
    evidenceSection.classList.remove('hidden');

    // Recreate upload zone each time to bind the current caseNumber
    let uploadZone = evidenceSection.querySelector('.evidence-upload-zone');
    if (uploadZone) uploadZone.remove();

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/png,image/jpeg,video/mp4,video/quicktime,video/webm';
    fileInput.style.display = 'none';
    fileInput.addEventListener('change', (e) => {
        if (e.target.files[0]) uploadEvidence(e.target.files[0], caseNumber);
    });
    // Prevent synthetic click from bubbling back to uploadZone (causes dialog suppression)
    fileInput.addEventListener('click', (e) => e.stopPropagation());

    uploadZone = el('div', { className: 'evidence-upload-zone', onclick: () => fileInput.click() },
        el('span', { className: 'evidence-upload-icon' }, '\u{1F4CE}'),
        el('span', {}, 'Click or drag to upload evidence (photos, videos)'),
        fileInput
    );

    // Drag & drop
    uploadZone.addEventListener('dragover', (e) => { e.preventDefault(); uploadZone.classList.add('active'); });
    uploadZone.addEventListener('dragleave', () => { uploadZone.classList.remove('active'); });
    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('active');
        if (e.dataTransfer.files[0]) uploadEvidence(e.dataTransfer.files[0], caseNumber);
    });

    evidenceSection.insertBefore(uploadZone, grid);

    // Show skeleton cards while fetching evidence
    showSkeletons(grid, 'evidenceCard', 4);

    try {
        const resp = await fetch('/api/evidence/' + encodeURIComponent(caseNumber));
        const items = await resp.json();

        // Clear skeletons before rendering real content
        grid.textContent = '';

        if (!items.length) {
            return;
        }
        items.forEach(item => {
            const isVideo = item.file_path && /\.(mp4|mov|webm)$/i.test(item.file_path);
            const hasFile = item.file_path && item.file_path.length > 0;
            const EVIDENCE_ICONS = {
                dashcam: '', surveillance: '', video: '',
                body_cam: '', medical: '', physical: '',
                document: '', crime_scene: '', photograph: '',
            };
            const icon = EVIDENCE_ICONS[item.evidence_type] || '';

            const card = el('div', { className: 'evidence-card' },
                el('div', { className: 'evidence-thumb', onclick: () => { if (hasFile) openEvidenceLightbox(item); } },
                    isVideo
                        ? (() => {
                            const video = document.createElement('video');
                            video.src = item.file_path;
                            video.poster = item.poster_path || '';
                            video.muted = true;
                            video.loop = true;
                            video.playsInline = true;
                            video.preload = 'metadata';
                            video.addEventListener('mouseenter', () => video.play());
                            video.addEventListener('mouseleave', () => { video.pause(); video.currentTime = 0; });
                            const badge = el('div', { className: 'evidence-video-badge' }, 'Video');
                            const wrapper = el('div', { className: 'evidence-video-wrap' }, video, badge);
                            return wrapper;
                        })()
                    : hasFile
                        ? (() => {
                            const img = el('img', { src: item.file_path, alt: item.title });
                            img.onerror = () => {
                                img.replaceWith(el('div', { className: 'evidence-placeholder' },
                                    el('span', { className: 'evidence-placeholder-icon' }, icon),
                                    el('span', { className: 'evidence-placeholder-label' }, item.evidence_type)
                                ));
                            };
                            return img;
                        })()
                        : el('div', { className: 'evidence-placeholder' },
                            el('span', { className: 'evidence-placeholder-icon' }, icon),
                            el('span', { className: 'evidence-placeholder-label' }, item.evidence_type)
                        )
                ),
                el('div', { className: 'evidence-info' },
                    el('div', { className: 'evidence-type-badge' }, item.evidence_type),
                    el('div', { className: 'evidence-title' }, item.title),
                    el('div', { className: 'evidence-desc' }, item.description || ''),
                    ...(item.source ? [el('div', { className: 'evidence-source' }, item.source)] : [])
                ),
                ...((hasFile || item.poster_path) ? [el('button', {
                    className: 'btn btn-secondary btn-evidence-analyze',
                    onclick: (e) => {
                        e.stopPropagation();
                        analyzeEvidence(item);
                    }
                }, '\u{1F50D} Analyze with AI')] : [])
            );
            grid.appendChild(card);
        });
    } catch (err) {
        grid.textContent = ''; // Clear skeletons on fetch error
    }
}

// ── Evidence Lightbox ──
function openEvidenceLightbox(item) {
    const lb = $('#evidence-lightbox');
    const body = $('#lightbox-body');
    const title = $('#lightbox-title');
    body.textContent = '';
    title.textContent = `${item.title} — ${item.evidence_type}`;

    const isVideo = item.file_path && /\.(mp4|mov|webm)$/i.test(item.file_path);
    if (isVideo) {
        const video = document.createElement('video');
        video.src = item.file_path;
        video.poster = item.poster_path || '';
        video.controls = true;
        video.autoplay = true;
        video.loop = true;
        body.appendChild(video);
    } else if (item.file_path) {
        const img = document.createElement('img');
        img.src = item.file_path;
        img.alt = item.title;
        body.appendChild(img);
    }
    lb.classList.remove('hidden');
    document.addEventListener('keydown', lightboxEscHandler);
}
function closeEvidenceLightbox(e) {
    if (e && e.target !== e.currentTarget && !e.target.classList.contains('lightbox-close')) return;
    const lb = $('#evidence-lightbox');
    lb.classList.add('hidden');
    // Stop any playing video
    const v = lb.querySelector('video');
    if (v) v.pause();
    document.removeEventListener('keydown', lightboxEscHandler);
}
function lightboxEscHandler(e) { if (e.key === 'Escape') closeEvidenceLightbox(); }
// Make closeEvidenceLightbox available globally for onclick in HTML
window.closeEvidenceLightbox = closeEvidenceLightbox;

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

    // Show analysis area with skeleton preview
    const analysisEl = $('#case-analysis');
    analysisEl.textContent = '';
    analysisEl.appendChild(el('div', { className: 'evidence-analysis-header' },
        el('h3', {}, 'Analyzing: ' + (item.title || 'Evidence')),
        el('p', { className: 'evidence-analysis-status' }, 'AI is examining this evidence...')
    ));
    const skelWrap = el('div', { className: 'analysis-skeleton-preview' });
    skelWrap.dataset.skeleton = 'true';
    skelWrap.appendChild(Skeletons.analysisSection(false));
    skelWrap.appendChild(Skeletons.analysisSection(false));
    analysisEl.appendChild(skelWrap);

    state.evidenceResponseText = '';

    socket.emit('analyze_evidence', {
        case_number: state.currentCase.case_number,
        evidence_id: item.id,
    });
}

// Evidence analysis streaming events
socket.on('evidence_analysis_started', (data) => {
    appendThinking('Having a gander at: ' + (data.title || '') + '...\n\n', 'right');
});

socket.on('evidence_thinking_started', () => {});
socket.on('evidence_thinking_delta', (data) => appendThinking(data.text, 'right'));
socket.on('evidence_thinking_complete', () => {
    appendThinking('\n\n--- Finished analyzing evidence ---\n', 'right');
});

socket.on('evidence_response_started', () => {
    state.evidenceResponseText = '';
    const analysisEl = $('#case-analysis');
    analysisEl.textContent = '';
});
socket.on('evidence_response_delta', (data) => {
    state.evidenceResponseText += data.text;
    streamRenderMarkdown($('#case-analysis'), state.evidenceResponseText, 'evidence');
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
        addDownloadButton(analysisEl, state.evidenceResponseText, 'evidence_analysis');
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
//  CASELOAD CHAT
// ============================================================

let chatOpen = false;
let chatResponseText = '';
let chatThinkingTokens = 0;

$('#btn-chat-toggle').addEventListener('click', () => {
    chatOpen = !chatOpen;
    const panel = document.getElementById('chat-panel');
    if (chatOpen) {
        panel.classList.remove('hidden');
        document.getElementById('chat-input').focus();
    } else {
        panel.classList.add('hidden');
    }
});

$('#btn-chat-close').addEventListener('click', () => {
    chatOpen = false;
    document.getElementById('chat-panel').classList.add('hidden');
});

$('#btn-chat-clear').addEventListener('click', () => {
    socket.emit('clear_chat');
    const messages = document.getElementById('chat-messages');
    messages.textContent = '';
    // Re-add welcome
    const welcome = el('div', { className: 'chat-welcome' },
        el('p', { className: 'chat-welcome-title' }, 'Ask your caseload anything'),
        el('p', { className: 'chat-welcome-hint' }, 'Chat history cleared.')
    );
    messages.appendChild(welcome);
});

function sendChatMessage(text) {
    if (!text.trim() || state.chatActive) return;
    const input = document.getElementById('chat-input');
    input.value = '';

    const messages = document.getElementById('chat-messages');

    // Remove welcome if present
    const welcome = messages.querySelector('.chat-welcome');
    if (welcome) welcome.remove();

    // Add user message
    messages.appendChild(el('div', { className: 'chat-msg chat-msg-user' },
        el('div', { className: 'chat-msg-content' }, text)
    ));

    // Add AI response placeholder
    const aiMsg = el('div', { className: 'chat-msg chat-msg-ai' });
    const thinkingDetails = el('details', { className: 'thinking-details chat-thinking-details' });
    const summary = el('summary', {});
    summary.appendChild(el('span', { className: 'thinking-icon pulse' }, ''));
    summary.appendChild(document.createTextNode(' Thinking'));
    const thinkingCount = el('span', { className: 'thinking-count chat-thinking-count' });
    summary.appendChild(thinkingCount);
    thinkingDetails.appendChild(summary);
    const thinkingStream = el('div', { className: 'side-stream chat-thinking-stream' });
    thinkingDetails.appendChild(thinkingStream);
    thinkingDetails.open = true;
    aiMsg.appendChild(thinkingDetails);

    const responseContent = el('div', { className: 'chat-msg-content chat-response-content markdown-body' });
    aiMsg.appendChild(responseContent);
    messages.appendChild(aiMsg);
    messages.scrollTop = messages.scrollHeight;

    // Store references for streaming
    state.chatThinkingEl = thinkingStream;
    state.chatThinkingCount = thinkingCount;
    state.chatThinkingDetails = thinkingDetails;
    state.chatResponseEl = responseContent;
    chatResponseText = '';
    chatThinkingTokens = 0;

    state.chatActive = true;
    setStatus('Chat...', 'analyzing');
    socket.emit('chat_message', { message: text });
}

$('#btn-chat-send').addEventListener('click', () => {
    sendChatMessage(document.getElementById('chat-input').value);
});

$('#chat-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendChatMessage(document.getElementById('chat-input').value);
    }
});

// Suggestion buttons
document.querySelectorAll('.chat-suggestion').forEach(btn => {
    btn.addEventListener('click', () => {
        const q = btn.dataset.q;
        if (q) {
            document.getElementById('chat-input').value = q;
            sendChatMessage(q);
        }
    });
});

// Chat streaming events
socket.on('chat_thinking_started', () => {
    if (state.chatThinkingEl) state.chatThinkingEl.textContent = '';
});

socket.on('chat_thinking_delta', (data) => {
    if (state.chatThinkingEl) {
        state.chatThinkingEl.appendChild(document.createTextNode(data.text));
        state.chatThinkingEl.scrollTop = state.chatThinkingEl.scrollHeight;
    }
    chatThinkingTokens += data.text.split(/\s+/).length;
    if (state.chatThinkingCount) {
        state.chatThinkingCount.textContent = chatThinkingTokens.toLocaleString() + ' tokens';
    }
    const messages = document.getElementById('chat-messages');
    if (messages) messages.scrollTop = messages.scrollHeight;
});

socket.on('chat_thinking_complete', () => {
    if (state.chatThinkingDetails) state.chatThinkingDetails.open = false;
});

socket.on('chat_response_started', () => {
    chatResponseText = '';
    if (state.chatResponseEl) state.chatResponseEl.textContent = '';
});

socket.on('chat_response_delta', (data) => {
    chatResponseText += data.text;
    if (state.chatResponseEl) {
        streamRenderMarkdown(state.chatResponseEl, chatResponseText, 'chat');
        const messages = document.getElementById('chat-messages');
        if (messages) messages.scrollTop = messages.scrollHeight;
    }
});

socket.on('chat_complete', () => {
    if (chatResponseText && state.chatResponseEl) {
        safeRenderMarkdown(state.chatResponseEl, chatResponseText);
    }
});

socket.on('chat_results', () => {
    state.chatActive = false;
    setStatus('Ready', 'ready');
    // Safety net: render markdown if not already done
    if (chatResponseText && state.chatResponseEl && !state.chatResponseEl.querySelector('h1, h2, h3, table, ul, ol')) {
        safeRenderMarkdown(state.chatResponseEl, chatResponseText);
    }
    const messages = document.getElementById('chat-messages');
    if (messages) messages.scrollTop = messages.scrollHeight;
});

socket.on('chat_error', (data) => {
    state.chatActive = false;
    setStatus('Ready', 'ready');
    if (state.chatResponseEl) {
        state.chatResponseEl.textContent = '';
        state.chatResponseEl.appendChild(el('div', { className: 'error-message' },
            el('strong', {}, 'Error: '),
            el('span', {}, data.error || 'Chat failed')
        ));
    }
});

// ============================================================
//  HEARING PREP BRIEF
// ============================================================

let hearingPrepText = '';

$('#btn-hearing-prep').addEventListener('click', () => {
    if (!state.currentCase || state.analysisActive) return;
    state.analysisActive = true;
    hearingPrepText = '';
    setStatus('Hearing Prep...', 'analyzing');

    // Show in case analysis area with skeleton preview
    const analysisEl = $('#case-analysis');
    analysisEl.textContent = '';
    analysisEl.appendChild(el('div', { className: 'analysis-loading hearing-prep-loading' },
        el('span', { className: 'thinking-icon pulse' }, ''),
        el('span', {}, 'Preparing hearing brief...')
    ));
    const skelWrap = el('div', { className: 'analysis-skeleton-preview' });
    skelWrap.dataset.skeleton = 'true';
    skelWrap.appendChild(Skeletons.analysisSection(false));
    skelWrap.appendChild(Skeletons.analysisSection(true));
    skelWrap.appendChild(Skeletons.analysisSection(false));
    analysisEl.appendChild(skelWrap);

    // Open right panel for thinking stream
    showRightPanel(true);
    $('#right-thinking-stream').textContent = '';
    state.thinkingTokenCount = 0;
    state.thinkingStartTime = Date.now();
    state.thinkingInterval = setInterval(updateThinkingMeta, 1000);

    socket.emit('run_hearing_prep', { case_number: state.currentCase.case_number });
});

socket.on('hearing_prep_thinking_started', () => {
    appendThinking('Preparing hearing brief...\n\n', 'right');
});
socket.on('hearing_prep_thinking_delta', (data) => appendThinking(data.text, 'right'));
socket.on('hearing_prep_thinking_complete', () => {
    appendThinking('\n\n--- Drafting the brief ---\n', 'right');
});

socket.on('hearing_prep_response_started', () => {
    hearingPrepText = '';
    const analysisEl = $('#case-analysis');
    analysisEl.textContent = '';
});

socket.on('hearing_prep_response_delta', (data) => {
    hearingPrepText += data.text;
    streamRenderMarkdown($('#case-analysis'), hearingPrepText, 'hearing');
});

socket.on('hearing_prep_complete', () => {
    if (hearingPrepText) {
        const analysisEl = $('#case-analysis');
        analysisEl.textContent = '';
        const wrapper = el('div', { className: 'markdown-body hearing-prep-brief' });
        safeRenderMarkdown(wrapper, hearingPrepText);
        analysisEl.appendChild(wrapper);
        addDownloadButton(analysisEl, hearingPrepText, 'hearing_prep');
    }
});

socket.on('hearing_prep_results', (data) => {
    stopThinking();
    if (data.brief && !hearingPrepText) {
        const analysisEl = $('#case-analysis');
        analysisEl.textContent = '';
        const wrapper = el('div', { className: 'markdown-body hearing-prep-brief' });
        safeRenderMarkdown(wrapper, data.brief);
        analysisEl.appendChild(wrapper);
    }
});

// ============================================================
//  CLIENT LETTER GENERATOR
// ============================================================

let clientLetterText = '';

$('#btn-client-letter').addEventListener('click', () => {
    if (!state.currentCase || state.analysisActive) return;
    state.analysisActive = true;
    clientLetterText = '';
    setStatus('Writing Letter...', 'analyzing');

    const analysisEl = $('#case-analysis');
    analysisEl.textContent = '';
    analysisEl.appendChild(el('div', { className: 'analysis-loading' },
        el('span', { className: 'thinking-icon pulse' }, ''),
        el('span', {}, 'Writing client letter in plain English...')
    ));

    // Open right panel for thinking stream
    showRightPanel(true);
    $('#right-thinking-stream').textContent = '';
    state.thinkingTokenCount = 0;
    state.thinkingStartTime = Date.now();
    state.thinkingInterval = setInterval(updateThinkingMeta, 1000);

    socket.emit('run_client_letter', { case_number: state.currentCase.case_number });
});

socket.on('client_letter_thinking_started', () => {
    appendThinking('Drafting client letter...\n\n', 'right');
});
socket.on('client_letter_thinking_delta', (data) => appendThinking(data.text, 'right'));
socket.on('client_letter_thinking_complete', () => {
    appendThinking('\n\n--- Writing the letter ---\n', 'right');
});

socket.on('client_letter_response_started', () => {
    clientLetterText = '';
    const analysisEl = $('#case-analysis');
    analysisEl.textContent = '';
});

socket.on('client_letter_response_delta', (data) => {
    clientLetterText += data.text;
    streamRenderMarkdown($('#case-analysis'), clientLetterText, 'letter');
});

socket.on('client_letter_complete', () => {
    if (clientLetterText) {
        const analysisEl = $('#case-analysis');
        analysisEl.textContent = '';
        const wrapper = el('div', { className: 'markdown-body client-letter' });
        safeRenderMarkdown(wrapper, clientLetterText);
        analysisEl.appendChild(wrapper);
        addDownloadButton(analysisEl, clientLetterText, 'client_letter');
    }
});

socket.on('client_letter_results', (data) => {
    stopThinking();
    if (data.letter && !clientLetterText) {
        const analysisEl = $('#case-analysis');
        analysisEl.textContent = '';
        const wrapper = el('div', { className: 'markdown-body client-letter' });
        safeRenderMarkdown(wrapper, data.letter);
        analysisEl.appendChild(wrapper);
    }
});

// ============================================================
//  CASE LAW SEARCH
// ============================================================

$('#btn-case-law-search').addEventListener('click', () => {
    const query = $('#case-law-query').value.trim();
    if (!query) return;
    const court = $('#case-law-court').value;
    const resultsEl = $('#case-law-results');
    resultsEl.classList.remove('hidden');
    resultsEl.textContent = '';
    const hint = el('p', { className: 'searching-hint' });
    hint.textContent = 'Searching case law...';
    resultsEl.appendChild(hint);
    socket.emit('search_case_law', { query, court });
});

$('#case-law-query').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') $('#btn-case-law-search').click();
});

socket.on('case_law_results', (data) => {
    const resultsEl = $('#case-law-results');
    resultsEl.classList.remove('hidden');
    resultsEl.textContent = '';

    if (data.error) {
        const errP = el('p', { className: 'error-text' });
        errP.textContent = data.error;
        resultsEl.appendChild(errP);
        return;
    }

    const results = data.results || [];
    if (results.length === 0) {
        const emptyP = el('p', { className: 'empty-hint' });
        emptyP.textContent = 'No results found. Try a different search.';
        resultsEl.appendChild(emptyP);
        return;
    }

    const header = el('div', { className: 'case-law-header' });
    header.textContent = `${results.length} results for "${data.query}"`;
    resultsEl.appendChild(header);

    results.forEach(r => {
        const card = el('div', { className: 'case-law-card' });
        const title = el('a', { className: 'case-law-title', href: r.url, target: '_blank' });
        title.textContent = r.case_name || 'Untitled';
        const meta = el('div', { className: 'case-law-meta' });
        const cite = Array.isArray(r.citation) ? r.citation.join(', ') : (r.citation || '');
        meta.textContent = [cite, r.court, r.date_filed].filter(Boolean).join(' \u00b7 ');
        const snippet = el('div', { className: 'case-law-snippet' });
        safeRenderMarkdown(snippet, r.snippet || '');
        card.appendChild(title);
        card.appendChild(meta);
        card.appendChild(snippet);
        resultsEl.appendChild(card);
    });
});

// ============================================================
//  CASCADE INTELLIGENCE (Agentic Loop)
// ============================================================

let cascadeResponseText = '';

$('#btn-cascade').addEventListener('click', () => {
    if (state.analysisActive) return;
    state.analysisActive = true;
    cascadeResponseText = '';
    setStatus('Cascade...', 'analyzing');

    // Show cascade progress
    const progress = document.getElementById('cascade-progress');
    progress.classList.remove('hidden');
    const step1 = document.getElementById('cascade-step-1');
    if (step1) step1.className = 'cascade-step active';
    document.getElementById('cascade-status').textContent = 'AI is autonomously investigating your caseload...';

    // Clear tool log
    state.cascadeToolLog = [];
    const toolLog = document.getElementById('cascade-tool-log');
    if (toolLog) toolLog.textContent = '';

    // Open right panel for thinking
    showRightPanel(true);
    $('#right-thinking-stream').textContent = '';
    state.thinkingTokenCount = 0;
    state.thinkingStartTime = Date.now();
    state.thinkingInterval = setInterval(updateThinkingMeta, 1000);

    socket.emit('run_cascade');
});

socket.on('cascade_phase', (data) => {
    document.getElementById('cascade-status').textContent = data.description || data.title;
    const step1 = document.getElementById('cascade-step-1');
    if (step1) step1.className = 'cascade-step active';
});

// Cascade thinking streams to the right panel
socket.on('cascade_thinking_started', () => {
    appendThinking('Starting caseload investigation...\n\n', 'right');
});
socket.on('cascade_thinking_delta', (data) => {
    appendThinking(data.text, 'right');
});
socket.on('cascade_thinking_complete', () => {
    appendThinking('\n\n--- Done thinking ---\n', 'right');
});

// Cascade response text accumulation
socket.on('cascade_response_started', () => {
    cascadeResponseText = '';
});
socket.on('cascade_response_delta', (data) => {
    cascadeResponseText += data.text;
});

socket.on('cascade_complete', (data) => {
    stopThinking();

    const step1 = document.getElementById('cascade-step-1');
    if (step1) step1.className = 'cascade-step complete';

    // Show tool call count
    const toolCalls = data.tool_calls || [];
    const statusText = 'Investigation complete' +
        (toolCalls.length ? ' — ' + toolCalls.length + ' tool calls' : '');
    document.getElementById('cascade-status').textContent = statusText;

    // Render strategic summary as a dashboard widget
    const text = cascadeResponseText || data.summary;
    if (text) {
        const container = document.getElementById('custom-widgets');
        // Remove any existing brief to prevent duplicates
        container.querySelectorAll('.cascade-summary-widget').forEach(w => w.remove());
        const widget = el('div', { className: 'custom-widget cascade-summary-widget' });
        const header = el('div', { className: 'widget-header' },
            el('span', { className: 'widget-icon' }, ''),
            el('h3', {}, 'Strategic Intelligence Brief'),
            el('span', { className: 'widget-badge cascade-badge' }, 'Agentic Cascade'),
            ...(toolCalls.length ? [el('span', { className: 'tool-calls-badge' }, toolCalls.length + ' tools used')] : [])
        );
        widget.appendChild(header);
        const body = el('div', { className: 'markdown-body widget-body' });
        safeRenderMarkdown(body, text);
        widget.appendChild(body);
        container.prepend(widget);
    }

    // Render smart actions
    if (data.actions && Array.isArray(data.actions) && data.actions.length) {
        renderSmartActions(data.actions);
    }

    // Refresh dashboard data
    refreshDashboard();
    renderRiskHeatmap();
    renderMemoryPanel();
});

socket.on('cascade_error', (data) => {
    stopThinking();
    document.getElementById('cascade-status').textContent = 'Error: ' + (data.error || 'Cascade failed');
});

// ============================================================
//  SMART ACTIONS
// ============================================================

socket.on('smart_actions_results', (data) => {
    if (data.actions && data.actions.length) {
        renderSmartActions(data.actions);
    }
});

function renderSmartActions(actions) {
    const bar = document.getElementById('smart-actions-bar');
    const list = document.getElementById('smart-actions-list');
    if (!bar || !list || !actions.length) return;

    bar.classList.remove('hidden');
    list.textContent = '';

    // Store actions for batch use
    state.smartActions = actions;

    actions.forEach((action, index) => {
        const urgencyClass = action.urgency === 'critical' ? 'action-critical'
            : action.urgency === 'high' ? 'action-high' : 'action-medium';

        const btn = el('button', { className: `btn smart-action-btn ${urgencyClass}` },
            el('span', { className: 'action-check' }, '\u2713'),
            el('span', { className: 'action-label' }, action.label),
            el('span', { className: 'action-reason' }, action.reason || '')
        );
        btn.dataset.actionIndex = index;

        // Click checkbox area to toggle selection
        const checkbox = btn.querySelector('.action-check');
        checkbox.addEventListener('click', (e) => {
            e.stopPropagation();
            btn.classList.toggle('selected');
            updateBatchControls();
        });

        btn.addEventListener('click', () => {
            if (state.batchRunning) return;
            executeSmartAction(action);
        });

        list.appendChild(btn);
    });

    // Add batch controls
    let batchBar = bar.querySelector('.batch-controls');
    if (batchBar) batchBar.remove();
    batchBar = el('div', { className: 'batch-controls' },
        el('button', { className: 'btn btn-ghost btn-sm', onclick: () => {
            list.querySelectorAll('.smart-action-btn').forEach(b => b.classList.add('selected'));
            updateBatchControls();
        }}, 'Select All'),
        el('div', { className: 'batch-progress', id: 'batch-progress' },
            el('div', { className: 'batch-progress-fill', id: 'batch-progress-fill' })
        ),
        el('span', { className: 'batch-status', id: 'batch-status' }),
        el('button', { className: 'btn btn-gold btn-sm', id: 'btn-run-batch', onclick: () => {
            const selected = [];
            list.querySelectorAll('.smart-action-btn.selected').forEach(b => {
                const idx = parseInt(b.dataset.actionIndex);
                if (state.smartActions[idx]) selected.push({ action: state.smartActions[idx], btnEl: b });
            });
            if (selected.length) runBatchActions(selected);
        }}, 'Run Selected (0)')
    );
    bar.appendChild(batchBar);

    function updateBatchControls() {
        const count = list.querySelectorAll('.smart-action-btn.selected').length;
        const runBtn = document.getElementById('btn-run-batch');
        if (runBtn) runBtn.textContent = 'Run Selected (' + count + ')';
    }
}

function executeSmartAction(action) {
    const type = action.action_type;
    const cn = action.case_number;

    if (type === 'deep_analysis' && cn) {
        // Navigate to case and trigger deep analysis
        openCase(cn);
        setTimeout(() => {
            const btn = document.getElementById('btn-deep-analysis');
            if (btn) btn.click();
        }, 500);
    } else if (type === 'adversarial' && cn) {
        openCase(cn);
        setTimeout(() => {
            const btn = document.getElementById('btn-adversarial');
            if (btn) btn.click();
        }, 500);
    } else if (type === 'motion' && cn) {
        openCase(cn);
        // Auto-select motion type if provided
        setTimeout(() => {
            if (action.motion_type) {
                state.analysisActive = false; // reset so motion handler works
                socket.emit('generate_motion', {
                    case_number: cn,
                    motion_type: action.motion_type,
                });
                state.analysisActive = true;
                setStatus('Drafting motion...', 'analyzing');
                showView('motion');
                showRightPanel(true);
            } else {
                const btn = document.getElementById('btn-motion');
                if (btn) btn.click();
            }
        }, 500);
    } else if (type === 'hearing_prep' && cn) {
        openCase(cn);
        setTimeout(() => {
            const btn = document.getElementById('btn-hearing-prep');
            if (btn) btn.click();
        }, 500);
    } else if (type === 'client_letter' && cn) {
        openCase(cn);
        setTimeout(() => {
            const btn = document.getElementById('btn-client-letter');
            if (btn) btn.click();
        }, 500);
    }
}

function openCase(caseNumber) {
    const c = state.cases.find(c => c.case_number === caseNumber);
    if (c) {
        state.currentCase = c;
        $('#case-title').textContent = c.case_number + ' \u2014 ' + c.defendant_name;
        renderCaseInfo(c);
        const analysisEl = $('#case-analysis');
        analysisEl.textContent = '';
        analysisEl.appendChild(el('p', { className: 'empty-hint' }, 'Select an analysis mode above'));
        showView('case');
        showRightPanel(false);
        loadEvidence(caseNumber);
        renderCaseInsightsSection(caseNumber);
        restoreLatestAnalysis(caseNumber);
        // Update Evidence tab label with count
        const evTab = document.querySelector('.case-tab[data-tab="evidence"]');
        if (evTab) {
            const evCount = c.evidence_count || 0;
            evTab.textContent = evCount > 0 ? `Evidence (${evCount})` : 'Evidence';
        }
    }
}

async function restoreLatestAnalysis(caseNumber) {
    try {
        const resp = await fetch('/api/analysis-log/' + encodeURIComponent(caseNumber) + '?limit=5');
        const insights = await resp.json();
        if (!insights.length) return;
        // Only restore per-case analyses (not caseload-wide ones)
        const perCase = insights.find(i =>
            i.scope === caseNumber &&
            ['deep_analysis', 'hearing_prep', 'client_letter', 'evidence_analysis'].includes(i.analysis_type)
        );
        if (!perCase) return;
        const result = JSON.parse(perCase.result_json || '{}');
        const text = result.response_text || result.executive_summary || result.overall_assessment || '';
        if (!text) return;
        // Only restore if user hasn't started a new analysis
        if (state.currentCase?.case_number !== caseNumber) return;
        const analysisEl = $('#case-analysis');
        if (analysisEl.querySelector('.markdown-body, .analysis-loading')) return;

        const typeLabels = {
            deep_analysis: 'Deep Analysis',
            hearing_prep: 'Hearing Prep Brief',
            client_letter: 'Client Letter',
            evidence_analysis: 'Evidence Analysis',
        };
        const label = typeLabels[perCase.analysis_type] || 'Analysis';
        const time = new Date(perCase.created_at).toLocaleString();
        analysisEl.textContent = '';
        analysisEl.appendChild(el('div', { className: 'restored-analysis-header' },
            el('span', { className: 'restored-label' }, label + ' (saved ' + time + ')'),
        ));
        const wrapper = el('div', { className: 'markdown-body' });
        safeRenderMarkdown(wrapper, text);
        analysisEl.appendChild(wrapper);
        addDownloadButton(analysisEl, text, perCase.analysis_type);
    } catch (e) { /* silently fail */ }
}

// Memory indicator
socket.on('memory_loaded', (data) => {
    if (data.insight_count > 0) {
        const analysisEl = document.getElementById('case-analysis');
        if (analysisEl) {
            const details = document.createElement('details');
            details.className = 'memory-badge';
            const summary = el('summary', {},
                el('span', { className: 'memory-icon' }, ''),
                el('span', {}, `Building on ${data.insight_count} prior ${data.insight_count === 1 ? 'analysis' : 'analyses'}`)
            );
            details.appendChild(summary);
            if (data.analysis_names && data.analysis_names.length) {
                const list = el('div', { className: 'memory-badge-list' });
                data.analysis_names.forEach(name => {
                    list.appendChild(el('div', { className: 'memory-badge-item' }, name));
                });
                details.appendChild(list);
            }
            analysisEl.prepend(details);
        }
    }
});

// ============================================================
//  CUSTOM DASHBOARD WIDGETS
// ============================================================

let widgetResponseText = '';

$('#btn-add-widget').addEventListener('click', () => {
    document.getElementById('widget-modal').classList.remove('hidden');
    document.getElementById('widget-request').focus();
});

$('#btn-widget-cancel').addEventListener('click', () => {
    document.getElementById('widget-modal').classList.add('hidden');
});

document.querySelectorAll('.widget-suggestion').forEach(btn => {
    btn.addEventListener('click', () => {
        document.getElementById('widget-request').value = btn.dataset.req;
    });
});

$('#btn-widget-create').addEventListener('click', () => {
    const input = document.getElementById('widget-request');
    const request = input.value.trim();
    if (!request) return;

    document.getElementById('widget-modal').classList.add('hidden');
    setStatus('Building widget...', 'analyzing');

    widgetResponseText = '';

    // Show right panel for thinking
    showRightPanel(true);
    $('#right-thinking-stream').textContent = '';
    state.thinkingTokenCount = 0;
    state.thinkingStartTime = Date.now();
    state.thinkingInterval = setInterval(updateThinkingMeta, 1000);

    socket.emit('create_widget', { request });
});

// Widget request input — enter key triggers create
document.getElementById('widget-request').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        document.getElementById('btn-widget-create').click();
    }
});

socket.on('widget_thinking_started', () => {
    appendThinking('Building custom widget...\n\n', 'right');
});
socket.on('widget_thinking_delta', (data) => appendThinking(data.text, 'right'));
socket.on('widget_thinking_complete', () => {
    appendThinking('\n\n--- Assembling the widget ---\n', 'right');
});

socket.on('widget_response_started', () => {
    widgetResponseText = '';
});
socket.on('widget_response_delta', (data) => {
    widgetResponseText += data.text;
});

socket.on('widget_results', (data) => {
    stopThinking();
    const text = widgetResponseText || data.content;
    if (!text) return;

    const container = document.getElementById('custom-widgets');
    const widget = el('div', { className: 'custom-widget' });
    const header = el('div', { className: 'widget-header' },
        el('span', { className: 'widget-icon' }, ''),
        el('h3', {}, data.request || 'Custom Widget'),
        el('button', {
            className: 'btn btn-ghost btn-sm widget-close',
            onclick: () => widget.remove(),
        }, '\u00D7')
    );
    widget.appendChild(header);
    const body = el('div', { className: 'markdown-body widget-body' });
    safeRenderMarkdown(body, text);
    widget.appendChild(body);
    container.prepend(widget);
});

socket.on('widget_error', (data) => {
    stopThinking();
});

async function refreshDashboard() {
    const resp = await fetch('/api/stats');
    const stats = await resp.json();
    updateDashboardStats(stats.cases || stats);
    if (stats.alert_count > 0) {
        const alertResp = await fetch('/api/alerts');
        renderAlerts(await alertResp.json());
    }
    if (stats.connection_count > 0) {
        const connResp = await fetch('/api/connections');
        renderConnections(await connResp.json());
    }
    renderMemoryPanel();
}

// ============================================================
//  FEATURE: CINEMATIC CASCADE TOOL TIMELINE
// ============================================================

function getCascadeToolIcon(toolName) {
    const icons = {
        'get_case':                      { icon: 'C', color: 'var(--gold)' },
        'get_case_context':              { icon: 'CC', color: 'var(--gold)' },
        'get_legal_context':             { icon: 'LC', color: 'var(--purple)' },
        'get_alerts':                    { icon: '!', color: 'var(--red)' },
        'get_connections':               { icon: 'CN', color: 'var(--blue)' },
        'get_prior_analyses':            { icon: 'PA', color: 'var(--orange)' },
        'search_case_law':               { icon: 'CL', color: 'var(--blue)' },
        'verify_citations':              { icon: '\u2713', color: 'var(--green)' },
        'search_precedents_for_charges': { icon: 'SP', color: 'var(--purple)' },
    };
    return icons[toolName] || { icon: '>', color: 'var(--text-secondary)' };
}

function handleCascadeToolCall(data) {
    const entry = {
        id: data.tool_id || 'tool-' + state.cascadeToolLog.length,
        tool_name: data.tool_name,
        status: data.status || 'calling',
        input: data.tool_input,
        startTime: Date.now(),
        result: null,
    };
    state.cascadeToolLog.push(entry);

    const container = document.getElementById('cascade-tool-log');
    if (!container) return;

    // Build timeline if not already
    let timeline = container.querySelector('.cascade-timeline');
    if (!timeline) {
        timeline = el('div', { className: 'cascade-timeline' });
        container.textContent = '';
        container.appendChild(el('div', { className: 'cascade-tool-counter', id: 'cascade-counter' },
            el('span', { className: 'counter-num', id: 'cascade-counter-num' }, '0'),
            el('span', {}, 'tools called')
        ));
        container.appendChild(timeline);
    }

    const icon = getCascadeToolIcon(data.tool_name);
    const inputPreview = formatToolInput(data.tool_input);

    const node = el('div', {
        className: 'cascade-timeline-node executing',
        id: 'ct-' + entry.id,
    },
        el('div', { className: 'cascade-timeline-dot' }),
        el('div', { className: 'cascade-timeline-header' },
            el('span', { className: 'cascade-timeline-icon' }, icon.icon),
            el('span', { className: 'cascade-timeline-tool-name' }, formatToolName(data.tool_name)),
            el('span', { className: 'cascade-timeline-status' }, 'executing')
        ),
        ...(inputPreview ? [el('div', { className: 'cascade-timeline-args' }, inputPreview)] : [])
    );
    node.style.animationDelay = (state.cascadeToolLog.length * 0.05) + 's';
    timeline.appendChild(node);
    container.scrollTop = container.scrollHeight;

    updateCascadeToolCounter();
}

function handleCascadeToolResult(data) {
    const entry = state.cascadeToolLog.find(e => e.id === (data.tool_id || ''));
    if (entry) {
        entry.status = 'complete';
        entry.result = data;
    }

    const node = document.getElementById('ct-' + (data.tool_id || ''));
    if (node) {
        node.classList.remove('executing');
        node.classList.add('complete');
        const statusEl = node.querySelector('.cascade-timeline-status');
        if (statusEl) statusEl.textContent = 'done';

        // Add result preview
        if (data.result_preview || data.result_length) {
            const sizeStr = data.result_length > 1000
                ? (data.result_length / 1000).toFixed(1) + 'K chars'
                : (data.result_length || 0) + ' chars';
            const resultDiv = el('div', { className: 'cascade-timeline-result' },
                el('span', { style: 'color: var(--green)' }, '\u2713 '),
                el('span', {}, sizeStr)
            );
            node.appendChild(resultDiv);
        }
    }

    updateCascadeToolCounter();
}

function updateCascadeToolCounter() {
    const countEl = document.getElementById('cascade-counter-num');
    if (countEl) countEl.textContent = state.cascadeToolLog.length;
}

// ============================================================
//  FEATURE: CASE TIMELINE VISUALIZATION
// ============================================================

function renderCaseTimeline(caseData, container) {
    if (!caseData.arrest_date && !caseData.filing_date) return;

    const today = new Date();
    const dates = [];

    if (caseData.arrest_date) {
        dates.push({ date: new Date(caseData.arrest_date), label: caseData.arrest_date, event: 'Arrest', type: 'past' });
    }
    if (caseData.filing_date) {
        dates.push({ date: new Date(caseData.filing_date), label: caseData.filing_date, event: 'Filing', type: 'past' });
    }
    dates.push({ date: today, label: today.toISOString().split('T')[0], event: 'Today', type: 'today' });

    if (caseData.next_hearing_date) {
        const hDate = new Date(caseData.next_hearing_date);
        dates.push({ date: hDate, label: caseData.next_hearing_date, event: caseData.hearing_type || 'Hearing', type: 'future' });
    }

    // Speedy trial deadline
    let deadline = null;
    if (caseData.arrest_date) {
        const arrestDate = new Date(caseData.arrest_date);
        const limit = caseData.severity === 'felony' ? 180 : 90;
        deadline = new Date(arrestDate.getTime() + limit * 24 * 60 * 60 * 1000);
        const daysRemaining = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
        const urgency = daysRemaining <= 14 ? 'urgent' : daysRemaining <= 45 ? 'warning' : 'safe';
        dates.push({ date: deadline, label: deadline.toISOString().split('T')[0], event: 'Speedy Trial', type: 'deadline', urgency });
    }

    // Sort and calculate positions
    dates.sort((a, b) => a.date - b.date);
    const minDate = dates[0].date.getTime();
    const maxDate = dates[dates.length - 1].date.getTime();
    const range = maxDate - minDate || 1;

    const timelineEl = el('div', { className: 'case-timeline' },
        el('h4', {}, 'Case Timeline')
    );
    const trackContainer = el('div', { className: 'timeline-track-container' });
    const track = el('div', { className: 'timeline-track' });

    // Progress fill up to today
    const todayPct = Math.min(100, Math.max(0, ((today.getTime() - minDate) / range) * 100));
    const progress = el('div', { className: 'timeline-progress' });
    progress.style.width = todayPct + '%';
    track.appendChild(progress);
    trackContainer.appendChild(track);

    // Render markers — merge events that are within 8% of each other
    const pcts = dates.map(d => ((d.date.getTime() - minDate) / range) * 100);
    const rendered = []; // track rendered markers for merging
    dates.forEach((d, i) => {
        const pct = pcts[i];
        const prevRendered = rendered.length > 0 ? rendered[rendered.length - 1] : null;
        const tooClose = prevRendered && Math.abs(pct - prevRendered.pct) < 8;

        if (tooClose) {
            // Merge into previous marker's event label
            const prevEvent = prevRendered.marker.querySelector('.timeline-marker-event');
            prevEvent.textContent += ' / ' + d.event;
            return;
        }

        const marker = el('div', { className: 'timeline-marker ' + d.type + (d.urgency ? ' ' + d.urgency : '') },
            el('div', { className: 'timeline-marker-event' }, d.event),
            el('div', { className: 'timeline-marker-dot' }),
            el('div', { className: 'timeline-marker-label' }, d.label)
        );
        marker.style.left = pct + '%';
        trackContainer.appendChild(marker);
        rendered.push({ pct, marker });
    });

    timelineEl.appendChild(trackContainer);

    // Speedy trial progress bar
    if (deadline && caseData.arrest_date) {
        const arrestDate = new Date(caseData.arrest_date);
        const limit = caseData.severity === 'felony' ? 180 : 90;
        const elapsed = Math.max(0, Math.ceil((today - arrestDate) / (1000 * 60 * 60 * 24)));
        const pct = Math.min(100, (elapsed / limit) * 100);
        const daysRemaining = limit - elapsed;
        const fillColor = daysRemaining <= 14 ? 'var(--red)' : daysRemaining <= 45 ? 'var(--orange)' : 'var(--green)';
        const valueColor = daysRemaining <= 14 ? 'color: var(--red)' : daysRemaining <= 45 ? 'color: var(--orange)' : 'color: var(--green)';

        const speedySection = el('div', { className: 'speedy-progress-section' },
            el('div', { className: 'speedy-progress-header' },
                el('span', { className: 'speedy-progress-label' }, 'Speedy Trial (' + limit + '-day limit)'),
                (() => {
                    const sp = el('span', { className: 'speedy-progress-value' },
                        elapsed + '/' + limit + ' days (' + daysRemaining + ' remaining)'
                    );
                    sp.style.cssText = valueColor;
                    return sp;
                })()
            ),
            el('div', { className: 'speedy-progress-bar' },
                (() => {
                    const fill = el('div', { className: 'speedy-progress-fill' });
                    fill.style.width = pct + '%';
                    fill.style.background = fillColor;
                    return fill;
                })()
            )
        );
        timelineEl.appendChild(speedySection);
    }

    container.appendChild(timelineEl);
}

// ============================================================
//  FEATURE: RISK HEATMAP DASHBOARD
// ============================================================

function calculateRiskScore(caseData, alertsForCase) {
    let score = 0;

    // Speedy trial proximity (40 pts max)
    if (caseData.arrest_date) {
        const limit = caseData.severity === 'felony' ? 180 : 90;
        const deadline = new Date(new Date(caseData.arrest_date).getTime() + limit * 24 * 60 * 60 * 1000);
        const daysRemaining = Math.ceil((deadline - new Date()) / (1000 * 60 * 60 * 24));
        if (daysRemaining <= 0) score += 40;
        else if (daysRemaining <= 14) score += 35;
        else if (daysRemaining <= 30) score += 25;
        else if (daysRemaining <= 60) score += 15;
        else score += 5;
    }

    // Hearing proximity (20 pts max)
    if (caseData.next_hearing_date) {
        const daysUntil = Math.ceil((new Date(caseData.next_hearing_date) - new Date()) / (1000 * 60 * 60 * 24));
        if (daysUntil <= 0) score += 20;
        else if (daysUntil <= 3) score += 18;
        else if (daysUntil <= 7) score += 14;
        else if (daysUntil <= 14) score += 8;
        else score += 3;
    }

    // Severity
    score += caseData.severity === 'felony' ? 15 : 5;

    // Alert count
    const alertScore = Math.min(25, (alertsForCase || 0) * 8);
    score += alertScore;

    return Math.min(100, score);
}

function getRiskColor(score) {
    if (score >= 80) return '#ef4444';
    if (score >= 60) return '#f59e0b';
    if (score >= 40) return '#eab308';
    if (score >= 20) return '#84cc16';
    return '#22c55e';
}

function renderRiskHeatmap() {
    const panel = document.getElementById('risk-heatmap');
    const grid = document.getElementById('risk-heatmap-grid');
    if (!panel || !grid || !state.cases.length) return;

    // Only show heatmap after AI analysis has produced alerts
    if (!state.alerts || !state.alerts.length) {
        panel.classList.add('hidden');
        return;
    }

    // Move tooltip to body so position:fixed works regardless of parent transforms
    let tooltip = document.getElementById('risk-tooltip');
    if (tooltip && tooltip.parentElement !== document.body) {
        tooltip.parentElement.removeChild(tooltip);
        document.body.appendChild(tooltip);
    }

    // Count alerts per case
    const alertsByCase = {};
    (state.alerts || []).forEach(a => {
        const cn = a.case_number;
        if (cn) alertsByCase[cn] = (alertsByCase[cn] || 0) + 1;
    });

    grid.textContent = '';
    panel.classList.remove('hidden');

    const countEl = document.getElementById('heatmap-case-count');
    if (countEl) countEl.textContent = state.cases.length;

    state.cases.forEach(c => {
        const score = calculateRiskScore(c, alertsByCase[c.case_number] || 0);
        const cell = document.createElement('div');
        cell.className = 'risk-cell';
        cell.style.backgroundColor = getRiskColor(score);
        cell.style.opacity = 0.3 + (score / 100) * 0.7;

        cell.addEventListener('click', () => openCase(c.case_number));
        cell.addEventListener('mouseenter', () => {
            const rect = cell.getBoundingClientRect();
            tooltip.classList.remove('hidden');
            tooltip.textContent = '';
            tooltip.appendChild(el('span', { className: 'risk-tooltip-case' }, c.case_number));
            tooltip.appendChild(document.createTextNode(' ' + c.defendant_name));
            const scoreSpan = el('span', { className: 'risk-tooltip-score' }, ' Risk: ' + score);
            scoreSpan.style.color = getRiskColor(score);
            tooltip.appendChild(scoreSpan);
            tooltip.style.left = (rect.left + rect.width / 2) + 'px';
            tooltip.style.top = (rect.top - 36) + 'px';
        });
        cell.addEventListener('mouseleave', () => {
            tooltip.classList.add('hidden');
        });

        grid.appendChild(cell);
    });
}

// ============================================================
//  FEATURE: EXPORT / DOWNLOAD
// ============================================================

function downloadAsFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType || 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function exportAsMarkdown(text, filename) {
    downloadAsFile(text, filename.endsWith('.md') ? filename : filename + '.md', 'text/markdown');
}

function exportAsHTML(text, filename) {
    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${escapeHtml(filename)}</title>
<style>body{font-family:Georgia,serif;max-width:800px;margin:2em auto;padding:0 1em;line-height:1.6;color:#222}
h1,h2,h3{font-family:Georgia,serif}pre{background:#f5f5f5;padding:1em;overflow-x:auto}
table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:6px 10px;text-align:left}</style>
</head><body>${renderMarkdown(text)}</body></html>`;
    downloadAsFile(html, filename.endsWith('.html') ? filename : filename + '.html', 'text/html');
}

function addDownloadButton(container, text, analysisType) {
    const caseNum = state.currentCase ? state.currentCase.case_number : 'export';
    const filename = caseNum + '_' + analysisType;
    const bar = el('div', { className: 'export-bar' },
        el('button', { className: 'btn btn-secondary btn-sm btn-export', onclick: () => exportAsMarkdown(text, filename) },
            'Download .md'),
        el('button', { className: 'btn btn-secondary btn-sm btn-export', onclick: () => exportAsHTML(text, filename) },
            'Download .html')
    );
    container.appendChild(bar);
}

// ============================================================
//  FEATURE: EVIDENCE UPLOAD
// ============================================================

async function uploadEvidence(file, caseNumber) {
    if (!file || !caseNumber) return;
    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'video/mp4', 'video/quicktime', 'video/webm'];
    if (!allowed.includes(file.type)) {
        alert('Supported formats: PNG, JPG, MP4, MOV, WebM');
        return;
    }

    const zone = document.querySelector('.evidence-upload-zone');
    if (zone) zone.classList.add('active');

    const formData = new FormData();
    formData.append('file', file);

    try {
        const resp = await fetch('/api/upload-evidence/' + encodeURIComponent(caseNumber), {
            method: 'POST',
            body: formData,
        });
        const result = await resp.json();

        if (result.error) {
            alert('Upload failed: ' + result.error);
        } else {
            // Refresh evidence grid
            await loadEvidence(caseNumber);
            // Auto-trigger analysis on the new item
            if (result.evidence_id) {
                analyzeEvidence({ id: result.evidence_id, title: file.name });
            }
        }
    } catch (err) {
        alert('Upload failed: ' + err.message);
    } finally {
        if (zone) zone.classList.remove('active');
    }
}

// ============================================================
//  FEATURE: MEMORY / PRIOR INSIGHTS PANEL
// ============================================================

async function renderMemoryPanel() {
    const panel = document.getElementById('memory-panel');
    const list = document.getElementById('memory-list');
    if (!panel || !list) return;

    // Show skeleton placeholders during fetch
    panel.classList.remove('hidden');
    showSkeletons(list, 'memoryItem', 4);

    try {
        const resp = await fetch('/api/analysis-log');
        const insights = await resp.json();

        if (!insights.length) {
            list.textContent = ''; // Clear skeletons
            panel.classList.add('hidden');
            return;
        }

        panel.classList.remove('hidden');
        const countEl = document.getElementById('memory-count');
        if (countEl) countEl.textContent = insights.length;

        list.textContent = '';

        const typeIcons = {
            'health_check': 'HC',
            'deep_analysis': 'DA',
            'agentic_cascade': 'AC',
            'adversarial': 'AD',
            'hearing_prep': 'HP',
            'client_letter': 'CL',
        };

        const VISIBLE = 4;
        insights.forEach((ins, i) => {
            const icon = typeIcons[ins.analysis_type] || '';
            const typeName = (ins.analysis_type || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            const scope = ins.scope === 'full_caseload' ? 'Full Caseload' : ins.scope;
            const timestamp = ins.created_at ? new Date(ins.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

            let findings = '';
            try {
                const result = JSON.parse(ins.result_json || '{}');
                if (result.alerts) findings = result.alerts.length + ' alerts found';
                else if (result.executive_summary) findings = result.executive_summary.substring(0, 80) + '...';
                else if (result.response_length) findings = result.response_length + ' chars generated';
            } catch (e) {}

            const isPerCase = ins.scope && ins.scope !== 'full_caseload';
            const item = el('div', { className: 'memory-item' + (isPerCase ? ' clickable' : ''),
                ...(isPerCase ? { onclick: () => openCase(ins.scope) } : {})
            },
                el('div', { className: 'memory-type-icon ' + (ins.analysis_type || '') }, icon),
                el('div', { className: 'memory-info' },
                    el('div', { className: 'memory-scope' }, scope),
                    el('div', { className: 'memory-type' }, typeName),
                    el('div', { className: 'memory-timestamp' }, timestamp),
                    ...(findings ? [el('div', { className: 'memory-findings' }, findings)] : [])
                )
            );
            if (i >= VISIBLE) item.style.display = 'none';
            item.dataset.listItem = 'true';
            list.appendChild(item);
        });
        if (insights.length > VISIBLE) {
            const remaining = insights.length - VISIBLE;
            const btn = el('button', { className: 'show-more-btn', onclick: () => {
                list.querySelectorAll('[data-list-item]').forEach(el => el.style.display = '');
                btn.remove();
            }}, 'Show ' + remaining + ' more insights');
            list.appendChild(btn);
        }
    } catch (err) {
        list.textContent = ''; // Clear skeletons
        panel.classList.add('hidden');
    }
}

async function renderCaseInsightsSection(caseNumber) {
    if (!caseNumber) return;
    // Remove any existing insights section
    const existing = document.querySelector('.case-insights-section');
    if (existing) existing.remove();

    try {
        const resp = await fetch('/api/analysis-log/' + encodeURIComponent(caseNumber));
        const insights = await resp.json();
        if (!insights.length) return;

        const container = $('#case-info');
        if (!container) return;

        const section = el('div', { className: 'case-insights-section' },
            el('h4', {}, '\u{1F9E0} ' + insights.length + ' Prior ' + (insights.length === 1 ? 'Analysis' : 'Analyses'))
        );

        insights.forEach(ins => {
            const typeName = (ins.analysis_type || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            const timestamp = ins.created_at ? new Date(ins.created_at).toLocaleString() : '';
            section.appendChild(el('div', { className: 'memory-item' },
                el('div', { className: 'memory-info' },
                    el('div', { className: 'memory-type' }, typeName),
                    el('div', { className: 'memory-timestamp' }, timestamp)
                )
            ));
        });

        container.appendChild(section);
    } catch (err) { /* silent fail */ }
}

// ============================================================
//  FEATURE: BATCH SMART ACTIONS
// ============================================================

function waitForAnalysisComplete() {
    return new Promise(resolve => {
        const check = () => {
            if (!state.analysisActive) {
                resolve();
            } else {
                setTimeout(check, 500);
            }
        };
        check();
    });
}

async function runBatchActions(selected) {
    if (state.batchRunning || !selected.length) return;
    state.batchRunning = true;
    state.batchQueue = selected;
    state.batchProgress = 0;

    const statusEl = document.getElementById('batch-status');
    const fillEl = document.getElementById('batch-progress-fill');

    for (let i = 0; i < selected.length; i++) {
        const { action, btnEl } = selected[i];
        state.batchProgress = i;

        if (statusEl) statusEl.textContent = 'Running ' + (i + 1) + '/' + selected.length + '...';
        if (fillEl) fillEl.style.width = ((i / selected.length) * 100) + '%';

        // Mark button as running
        btnEl.classList.remove('selected');
        btnEl.classList.add('running');

        // Wait for any active analysis to finish first
        await waitForAnalysisComplete();

        // Execute the action
        executeSmartAction(action);

        // Wait for it to complete
        await new Promise(resolve => setTimeout(resolve, 800));
        await waitForAnalysisComplete();

        // Mark as complete
        btnEl.classList.remove('running');
        btnEl.classList.add('complete');
    }

    state.batchRunning = false;
    state.batchProgress = selected.length;
    if (statusEl) statusEl.textContent = 'Done! ' + selected.length + ' actions completed';
    if (fillEl) fillEl.style.width = '100%';
}

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
        $('#btn-chat-toggle').classList.remove('hidden');

        if (stats.alert_count > 0) {
            const alertResp = await fetch('/api/alerts');
            renderAlerts(await alertResp.json());
            $('#dash-alerts').textContent = stats.alert_count;
            $('#alert-count').textContent = stats.alert_count;
            document.getElementById('stat-pill-alerts').style.display = '';
        }
        if (stats.connection_count > 0) {
            const connResp = await fetch('/api/connections');
            renderConnections(await connResp.json());
            $('#dash-connections').textContent = stats.connection_count;
            $('#connection-count').textContent = stats.connection_count;
            document.getElementById('stat-pill-connections').style.display = '';
        }
        if (stats.alert_count > 0 || stats.connection_count > 0) {
            document.getElementById('dashboard-panels').style.display = '';
        }
        renderRiskHeatmap();
        renderMemoryPanel();
    }
})();
