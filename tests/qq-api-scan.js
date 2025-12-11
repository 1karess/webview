/*
  QQ WebView API / Bridge Scanner (Static)

  你关心的点：
  - 不开控制台也能看结果（页面直接打印）
  - 用“同一个 URL”分别在：手机浏览器 & QQ WebView 打开
  - 粘贴基线 JSON -> 一键对比 -> 输出 QQ 新增的 API 名称列表

  扫描逻辑（简单版）：
  - 抓 window / navigator / document / location 的“自有属性名”列表（含不可枚举）
  - 如果有 iOS WKWebView 的 window.webkit.messageHandlers，也抓它下面的 handler 名称
  - 10 秒监控模式：每秒重扫一次，记录新增/移除（用于捕获延迟注入）
*/

const elStatus = document.getElementById('status');
const elUA = document.getElementById('ua');
const elTS = document.getElementById('ts');
const elStats = document.getElementById('stats');
const elOutput = document.getElementById('output');
const elQuickHits = document.getElementById('quickHits');

const elBaselineText = document.getElementById('baselineText');
const elBaselineDiff = document.getElementById('baselineDiff');
const elBaselineFile = document.getElementById('baselineFile');

let lastSnapshot = null;
let watchTimer = null;
let watchStopTimer = null;

let currentResult = null;
let baselineResult = null;

function nowISO() {
  return new Date().toISOString();
}

function setStatus(text, kind = 'info') {
  elStatus.className = 'box' + (kind === 'success' ? ' success' : kind === 'warn' ? ' warn' : kind === 'error' ? ' error' : '');
  elStatus.textContent = `状态：${text}`;
}

function safeStringify(value, maxLen = 240) {
  try {
    if (typeof value === 'string') return value.length > maxLen ? value.slice(0, maxLen) + '…' : value;
    if (typeof value === 'function') {
      const s = Function.prototype.toString.call(value);
      return s.length > maxLen ? s.slice(0, maxLen) + '…' : s;
    }
    if (value === window) return '[Window]';
    const s = JSON.stringify(value);
    return s && s.length > maxLen ? s.slice(0, maxLen) + '…' : s;
  } catch {
    try { return String(value); } catch { return '[Unstringifiable]'; }
  }
}

function listOwnKeys(obj) {
  const names = [];
  const symbols = [];
  try { names.push(...Object.getOwnPropertyNames(obj)); } catch {}
  try { symbols.push(...Object.getOwnPropertySymbols(obj)); } catch {}
  return { names, symbols: symbols.map(s => s.toString()) };
}

function snapshotObject(label, obj) {
  const keys = listOwnKeys(obj);
  return {
    label,
    ok: true,
    ownNames: keys.names.sort(),
    ownSymbols: keys.symbols.sort(),
    count: keys.names.length + keys.symbols.length,
  };
}

function existsPath(pathParts) {
  let cur = window;
  for (const p of pathParts) {
    if (cur == null) return { exists: false };
    try { cur = cur[p]; } catch (e) { return { exists: true, error: String(e) }; }
  }
  return { exists: cur !== undefined, type: typeof cur, valuePreview: safeStringify(cur) };
}

function quickBridgeHits() {
  const candidates = [
    ['mqq'],
    ['qq'],
    ['QQ'],
    ['QZAppExternal'],
    ['QZFL'],
    ['QM'],
    ['TXWebKitNativeFetch'],
    ['TXWebKit'],
    ['webkit'],
    ['webkit', 'messageHandlers'],
    ['__qq'],
  ];

  const hits = {};
  for (const parts of candidates) {
    const key = parts.join('.');
    hits[key] = existsPath(parts);
  }

  // iOS WKWebView 桥面
  let messageHandlers = null;
  try { messageHandlers = window.webkit && window.webkit.messageHandlers; } catch {}
  if (messageHandlers) {
    const mhKeys = listOwnKeys(messageHandlers).names.sort();
    hits['webkit.messageHandlers.*'] = { exists: true, count: mhKeys.length, handlers: mhKeys };
  }

  // window 上可疑命名
  const suspiciousPatterns = [/^mqq$/i, /^qq$/i, /^qz/i, /^tx/i, /^tbs/i, /^x5/i, /^webkit$/i, /^bridge/i, /native/i, /jsbridge/i, /^__qq/i];
  const winNames = (() => { try { return Object.getOwnPropertyNames(window); } catch { return []; } })();
  const suspicious = winNames.filter(n => suspiciousPatterns.some(re => re.test(n))).sort();
  hits['window.suspiciousNames'] = { exists: true, count: suspicious.length, names: suspicious.slice(0, 300), truncated: suspicious.length > 300 };

  return hits;
}

function diffNames(prevNames, nextNames) {
  const prev = new Set(prevNames);
  const next = new Set(nextNames);
  const added = [];
  const removed = [];
  for (const n of next) if (!prev.has(n)) added.push(n);
  for (const n of prev) if (!next.has(n)) removed.push(n);
  added.sort();
  removed.sort();
  return { added, removed };
}

function computeSnapshot() {
  const result = {
    testType: 'qq-webview-api-scan-static',
    timestamp: nowISO(),
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    location: { href: location.href, origin: location.origin },
    quickHits: quickBridgeHits(),
    snapshots: {
      window: snapshotObject('window', window),
      navigator: snapshotObject('navigator', navigator),
      document: snapshotObject('document', document),
      location: snapshotObject('location', location),
    },
    watch: { diffs: [] },
  };

  try {
    if (window.webkit) result.snapshots.webkit = snapshotObject('webkit', window.webkit);
  } catch (e) {
    result.snapshots.webkit = { label: 'webkit', ok: false, error: String(e) };
  }

  try {
    if (window.webkit && window.webkit.messageHandlers) {
      result.snapshots.webkitMessageHandlers = snapshotObject('webkit.messageHandlers', window.webkit.messageHandlers);
    }
  } catch (e) {
    result.snapshots.webkitMessageHandlers = { label: 'webkit.messageHandlers', ok: false, error: String(e) };
  }

  return result;
}

function render(result) {
  currentResult = result;
  elUA.textContent = result.userAgent;
  elTS.textContent = result.timestamp;

  const winCount = result.snapshots.window?.count ?? 0;
  const navCount = result.snapshots.navigator?.count ?? 0;
  const docCount = result.snapshots.document?.count ?? 0;
  const mhCount = result.snapshots.webkitMessageHandlers?.count ?? 0;

  elStats.textContent = `window=${winCount}, navigator=${navCount}, document=${docCount}, messageHandlers=${mhCount}`;
  elQuickHits.textContent = JSON.stringify(result.quickHits, null, 2);
  elOutput.textContent = JSON.stringify(result, null, 2);
}

function pickNames(result, path) {
  try {
    const parts = path.split('.');
    let cur = result;
    for (const p of parts) cur = cur?.[p];
    return Array.isArray(cur) ? cur : [];
  } catch {
    return [];
  }
}

function makeBaselineDiff(baseline, current) {
  const scopes = [
    { label: 'window（全局对象名）', path: 'snapshots.window.ownNames' },
    { label: 'navigator（浏览器能力名）', path: 'snapshots.navigator.ownNames' },
    { label: 'document（文档相关名）', path: 'snapshots.document.ownNames' },
    { label: 'webkit.messageHandlers（iOS 桥面名）', path: 'snapshots.webkitMessageHandlers.ownNames' },
  ];

  const out = {
    baselineTimestamp: baseline?.timestamp,
    currentTimestamp: current?.timestamp,
    currentUA: current?.userAgent,
    added: {},
    removed: {},
    summary: {},
  };

  for (const s of scopes) {
    const b = pickNames(baseline, s.path);
    const c = pickNames(current, s.path);
    const d = diffNames(b, c);
    out.added[s.label] = d.added;
    out.removed[s.label] = d.removed;
    out.summary[s.label] = { addedCount: d.added.length, removedCount: d.removed.length };
  }

  const watchAdded = [];
  try {
    const diffs = current?.watch?.diffs ?? [];
    for (const entry of diffs) {
      if (entry?.scope === 'window.ownNames' && Array.isArray(entry.added)) {
        watchAdded.push(...entry.added);
      }
    }
  } catch {}
  out.added['watch（10s 监控期间新增 window 名称）'] = Array.from(new Set(watchAdded)).sort();
  out.summary['watch（10s 监控期间新增 window 名称）'] = { addedCount: out.added['watch（10s 监控期间新增 window 名称）'].length };

  return out;
}

function parseBaselineFromTextarea() {
  const text = (elBaselineText?.value ?? '').trim();
  if (!text) return null;
  return JSON.parse(text);
}

function renderBaselineDiff(diffObj) {
  elBaselineDiff.textContent = JSON.stringify(diffObj, null, 2);
}

function clearBaseline() {
  baselineResult = null;
  elBaselineText.value = '';
  elBaselineFile.value = '';
  elBaselineDiff.textContent = '(empty)';
  setStatus('已清空基线', 'success');
}

async function loadBaselineFromFile() {
  try {
    const file = elBaselineFile?.files?.[0];
    if (!file) {
      setStatus('请先选择一个基线 JSON 文件', 'warn');
      return;
    }
    const text = await file.text();
    elBaselineText.value = text;
    baselineResult = JSON.parse(text);
    setStatus('已从文件读取基线（现在可以点“与基线对比”）', 'success');
  } catch (e) {
    setStatus(`读取基线失败：${e.message}`, 'error');
  }
}

function compareWithBaseline() {
  try {
    if (!currentResult) {
      setStatus('请先点“立即扫描一次”生成当前结果', 'warn');
      return;
    }
    baselineResult = baselineResult ?? parseBaselineFromTextarea();
    if (!baselineResult) {
      setStatus('请先粘贴/导入“手机浏览器”的基线 JSON', 'warn');
      return;
    }
    const diffObj = makeBaselineDiff(baselineResult, currentResult);
    renderBaselineDiff(diffObj);
    setStatus('对比完成：请看“对比结果（新增的名字）”', 'success');
  } catch (e) {
    setStatus(`对比失败：${e.message}（确认粘贴的是完整 JSON）`, 'error');
  }
}

async function runSnapshot() {
  setStatus('扫描中…');
  const result = computeSnapshot();

  if (lastSnapshot) {
    const prevWin = lastSnapshot.snapshots.window?.ownNames ?? [];
    const nextWin = result.snapshots.window?.ownNames ?? [];
    const d = diffNames(prevWin, nextWin);
    result.watch.diffs.push({ ts: nowISO(), scope: 'window.ownNames', added: d.added, removed: d.removed, addedCount: d.added.length, removedCount: d.removed.length });
  }

  lastSnapshot = result;
  render(result);

  const hasAnyHit = Object.entries(result.quickHits).some(([, v]) => v && v.exists);
  setStatus(hasAnyHit ? '扫描完成（命中了一些疑似注入点）' : '扫描完成（未命中常见名字，但仍建议做基线对比）', hasAnyHit ? 'warn' : 'success');
}

function startWatch() {
  if (watchTimer) return;

  document.getElementById('btnWatch').disabled = true;
  document.getElementById('btnStop').disabled = false;

  setStatus('开始监控：每 1s 重扫一次，持续 10s…', 'info');

  const start = Date.now();
  let tick = 0;

  if (!lastSnapshot) {
    lastSnapshot = computeSnapshot();
    render(lastSnapshot);
  }

  watchTimer = setInterval(() => {
    tick++;
    const next = computeSnapshot();

    const prevWin = lastSnapshot.snapshots.window?.ownNames ?? [];
    const nextWin = next.snapshots.window?.ownNames ?? [];
    const d = diffNames(prevWin, nextWin);

    next.watch.diffs.push({
      ts: nowISO(),
      scope: 'window.ownNames',
      tick,
      msFromStart: Date.now() - start,
      added: d.added,
      removed: d.removed,
      addedCount: d.added.length,
      removedCount: d.removed.length,
    });

    lastSnapshot = next;
    render(next);

    if (d.added.length > 0 || d.removed.length > 0) {
      setStatus(`监控中…（tick=${tick}，新增 ${d.added.length}，移除 ${d.removed.length}）`, 'warn');
    } else {
      setStatus(`监控中…（tick=${tick}，无变化）`, 'info');
    }
  }, 1000);

  watchStopTimer = setTimeout(() => stopWatch(), 10_000);
}

function stopWatch() {
  if (watchTimer) {
    clearInterval(watchTimer);
    watchTimer = null;
  }
  if (watchStopTimer) {
    clearTimeout(watchStopTimer);
    watchStopTimer = null;
  }

  document.getElementById('btnWatch').disabled = false;
  document.getElementById('btnStop').disabled = true;

  setStatus('监控已停止：现在可以粘贴基线 JSON 点“与基线对比”', 'success');
}

async function copyJSON() {
  try {
    await navigator.clipboard.writeText(JSON.stringify(currentResult ?? {}, null, 2));
    setStatus('已复制当前 JSON 到剪贴板', 'success');
  } catch {
    setStatus('复制失败：这个 WebView 可能不支持剪贴板（可改用“下载”）', 'warn');
  }
}

function downloadJSON() {
  const data = currentResult ?? {};
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `qq-webview-api-scan-${nowISO().replace(/[:.]/g, '-')}.json`;
  a.click();
  URL.revokeObjectURL(url);
  setStatus('已触发下载', 'success');
}

// init
(function init() {
  elUA.textContent = navigator.userAgent;
  elTS.textContent = nowISO();
  elStats.textContent = '未扫描';
  elBaselineDiff.textContent = '(empty)';
  setStatus('就绪：先用手机浏览器跑一次作为基线；再用 QQ 打开同一页对比即可');
})();
