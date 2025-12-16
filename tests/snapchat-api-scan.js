/*
  Snapchat WebView API / Bridge Scanner (Static)

  用法（和 QQ 版一致）：
  - 同一个 URL 分别在：手机浏览器 & Snapchat 内置 WebView 打开
  - 先在“手机浏览器”生成基线 JSON
  - 再在 Snapchat 里扫描当前环境，并粘贴基线做差分

  安全性：
  - 本工具只做“枚举/对比/分类/画像”，不会主动调用任何敏感私有接口
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
const elCategorySummary = document.getElementById('categorySummary');

let lastSnapshot = null;
let watchTimer = null;
let watchStopTimer = null;

let currentResult = null;
let baselineResult = null;

function nowISO() {
  return new Date().toISOString();
}

function setStatus(text, kind = 'info') {
  elStatus.className =
    'box' +
    (kind === 'success' ? ' success' : kind === 'warn' ? ' warn' : kind === 'error' ? ' error' : '');
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
    try {
      return String(value);
    } catch {
      return '[Unstringifiable]';
    }
  }
}

function listOwnKeys(obj) {
  const names = [];
  const symbols = [];
  try {
    names.push(...Object.getOwnPropertyNames(obj));
  } catch {}
  try {
    symbols.push(...Object.getOwnPropertySymbols(obj));
  } catch {}
  return { names, symbols: symbols.map((s) => s.toString()) };
}

function getProtoName(proto) {
  try {
    const ctor = proto && proto.constructor;
    const n = ctor && ctor.name;
    return n ? n : '(anonymous)';
  } catch {
    return '(unknown)';
  }
}

function collectPrototypeChain(obj, maxDepth = 6) {
  const chain = [];
  let cur = obj;
  for (let depth = 0; depth < maxDepth; depth++) {
    let proto = null;
    try {
      proto = Object.getPrototypeOf(cur);
    } catch {
      proto = null;
    }
    if (!proto) break;
    chain.push({ depth: depth + 1, proto });
    cur = proto;
  }
  return chain;
}

function snapshotObject(label, obj, { maxProtoDepth = 6 } = {}) {
  const own = listOwnKeys(obj);

  const protoLevels = [];
  const protoNamesUnion = new Set();
  const protoSymbolsUnion = new Set();

  const chain = collectPrototypeChain(obj, maxProtoDepth);
  for (const { depth, proto } of chain) {
    const keys = listOwnKeys(proto);
    keys.names.forEach((n) => protoNamesUnion.add(n));
    keys.symbols.forEach((s) => protoSymbolsUnion.add(s));
    protoLevels.push({
      depth,
      protoName: getProtoName(proto),
      ownNames: keys.names.sort(),
      ownSymbols: keys.symbols.sort(),
      count: keys.names.length + keys.symbols.length,
    });
  }

  const allNames = Array.from(new Set([...own.names, ...protoNamesUnion])).sort();
  const allSymbols = Array.from(new Set([...own.symbols, ...protoSymbolsUnion])).sort();

  return {
    label,
    ok: true,
    ownNames: own.names.sort(),
    ownSymbols: own.symbols.sort(),
    proto: {
      maxDepth: maxProtoDepth,
      levels: protoLevels,
      unionNames: Array.from(protoNamesUnion).sort(),
      unionSymbols: Array.from(protoSymbolsUnion).sort(),
    },
    allNames,
    allSymbols,
    count: {
      own: own.names.length + own.symbols.length,
      protoUnion: protoNamesUnion.size + protoSymbolsUnion.size,
      all: allNames.length + allSymbols.length,
    },
  };
}

function existsPath(pathParts) {
  let cur = window;
  for (const p of pathParts) {
    if (cur == null) return { exists: false };
    try {
      cur = cur[p];
    } catch (e) {
      return { exists: true, error: String(e) };
    }
  }
  return { exists: cur !== undefined, type: typeof cur, valuePreview: safeStringify(cur) };
}

function quickBridgeHits() {
  // 这里不假设 Snapchat 一定注入了什么，只列“常见可疑点”做快速提示。
  const candidates = [
    ['snap'],
    ['Snap'],
    ['snapchat'],
    ['Snapchat'],
    ['SC'],
    ['sc'],
    ['SnapKit'],
    ['Bitmoji'],
    ['bitmoji'],
    ['webkit'],
    ['webkit', 'messageHandlers'],
  ];

  const hits = {};
  for (const parts of candidates) {
    const key = parts.join('.');
    hits[key] = existsPath(parts);
  }

  // iOS WKWebView 桥面
  let messageHandlers = null;
  try {
    messageHandlers = window.webkit && window.webkit.messageHandlers;
  } catch {}
  if (messageHandlers) {
    const mhKeys = listOwnKeys(messageHandlers).names.sort();
    hits['webkit.messageHandlers.*'] = { exists: true, count: mhKeys.length, handlers: mhKeys };
  }

  // window 上可疑命名（偏 Snapchat 关键词 + 通用 Bridge 关键词）
  const suspiciousPatterns = [
    /^sc/i,
    /^snap/i,
    /snapchat/i,
    /snapkit/i,
    /bitmoji/i,
    /^bridge/i,
    /native/i,
    /jsbridge/i,
    /^webkit$/i,
    /^messagehandler/i,
  ];
  const winNames = (() => {
    try {
      return Object.getOwnPropertyNames(window);
    } catch {
      return [];
    }
  })();
  const suspicious = winNames.filter((n) => suspiciousPatterns.some((re) => re.test(n))).sort();
  hits['window.suspiciousNames'] = {
    exists: true,
    count: suspicious.length,
    names: suspicious.slice(0, 300),
    truncated: suspicious.length > 300,
  };

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

function findPropertyOwner(obj, propName, maxDepth = 6) {
  try {
    if (Object.prototype.hasOwnProperty.call(obj, propName)) {
      return { where: 'own', depth: 0, protoName: null };
    }
  } catch {}

  let cur = obj;
  for (let depth = 1; depth <= maxDepth; depth++) {
    let proto = null;
    try {
      proto = Object.getPrototypeOf(cur);
    } catch {
      proto = null;
    }
    if (!proto) break;
    try {
      if (Object.prototype.hasOwnProperty.call(proto, propName)) {
        return { where: 'proto', depth, protoName: getProtoName(proto) };
      }
    } catch {}
    cur = proto;
  }
  return { where: 'unknown', depth: null, protoName: null };
}

function descriptorSummary(obj, propName) {
  try {
    let cur = obj;
    for (let i = 0; i < 8; i++) {
      const desc = Object.getOwnPropertyDescriptor(cur, propName);
      if (desc) {
        const isAccessor = !!(desc.get || desc.set);
        return {
          enumerable: !!desc.enumerable,
          configurable: !!desc.configurable,
          writable: isAccessor ? undefined : !!desc.writable,
          hasGetter: !!desc.get,
          hasSetter: !!desc.set,
        };
      }
      cur = Object.getPrototypeOf(cur);
      if (!cur) break;
    }
    return null;
  } catch (e) {
    return { error: String(e) };
  }
}

function tryRead(obj, propName) {
  try {
    const v = obj[propName];
    const t = typeof v;
    const out = { ok: true, type: t };
    if (t === 'function') {
      out.function = { paramCount: v.length, sourcePreview: safeStringify(v, 220) };
    } else {
      out.valuePreview = safeStringify(v, 220);
    }
    return out;
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

function buildAddedDetails(scopeLabel, targetObj, addedNames, maxItems = 180) {
  const details = {};
  const list = addedNames.slice(0, maxItems);
  for (const name of list) {
    if (typeof name !== 'string') continue;
    const owner = findPropertyOwner(targetObj, name, 6);
    details[name] = {
      where: owner.where,
      protoDepth: owner.depth,
      protoName: owner.protoName,
      descriptor: descriptorSummary(targetObj, name),
      access: tryRead(targetObj, name),
    };
  }
  return {
    scope: scopeLabel,
    maxItems,
    shown: Object.keys(details).length,
    truncated: addedNames.length > maxItems,
    details,
  };
}

function computeSnapshot() {
  const result = {
    testType: 'snapchat-webview-api-scan-static',
    timestamp: nowISO(),
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    location: { href: location.href, origin: location.origin },
    quickHits: quickBridgeHits(),
    snapshots: {
      window: snapshotObject('window', window, { maxProtoDepth: 6 }),
      navigator: snapshotObject('navigator', navigator, { maxProtoDepth: 6 }),
      document: snapshotObject('document', document, { maxProtoDepth: 6 }),
      location: snapshotObject('location', location, { maxProtoDepth: 6 }),
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

  const winCount = result.snapshots.window?.count?.all ?? 0;
  const navCount = result.snapshots.navigator?.count?.all ?? 0;
  const docCount = result.snapshots.document?.count?.all ?? 0;
  const mhCount = result.snapshots.webkitMessageHandlers?.count?.all ?? 0;

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
    { label: 'window（全局对象名：own）', path: 'snapshots.window.ownNames', target: window },
    { label: 'window（全局对象名：含原型链）', path: 'snapshots.window.allNames', target: window },
    { label: 'navigator（能力名：own）', path: 'snapshots.navigator.ownNames', target: navigator },
    { label: 'navigator（能力名：含原型链）', path: 'snapshots.navigator.allNames', target: navigator },
    { label: 'document（文档名：own）', path: 'snapshots.document.ownNames', target: document },
    { label: 'document（文档名：含原型链）', path: 'snapshots.document.allNames', target: document },
    { label: 'location（位置名：own）', path: 'snapshots.location.ownNames', target: location },
    { label: 'location（位置名：含原型链）', path: 'snapshots.location.allNames', target: location },
    { label: 'webkit.messageHandlers（iOS 桥面名）', path: 'snapshots.webkitMessageHandlers.allNames', target: null },
  ];

  const out = {
    baselineTimestamp: baseline?.timestamp,
    currentTimestamp: current?.timestamp,
    currentUA: current?.userAgent,
    added: {},
    removed: {},
    summary: {},
    addedDetails: {},
  };

  for (const s of scopes) {
    const b = pickNames(baseline, s.path);
    const c = pickNames(current, s.path);
    const d = diffNames(b, c);
    out.added[s.label] = d.added;
    out.removed[s.label] = d.removed;
    out.summary[s.label] = { addedCount: d.added.length, removedCount: d.removed.length };

    if (
      s.target &&
      d.added.length > 0 &&
      (s.label.includes('window') || s.label.includes('navigator') || s.label.includes('document') || s.label.includes('location'))
    ) {
      out.addedDetails[s.label] = buildAddedDetails(s.label, s.target, d.added);
    }
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
  out.summary['watch（10s 监控期间新增 window 名称）'] = {
    addedCount: out.added['watch（10s 监控期间新增 window 名称）'].length,
  };

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

function classifyApiName(name) {
  const s = String(name).toLowerCase();
  const hit = (re) => re.test(s);

  if (hit(/token|auth|oauth|session|cookie|login|logout|account|uid|user|passport/)) return '账号/登录/凭证';
  if (hit(/imei|oaid|idfa|uuid|deviceid|androidid|serial|fingerprint|hwid/)) return '设备标识/指纹';
  if (hit(/location|geo|gps|latitude|longitude/)) return '定位';
  if (hit(/camera|photo|album|image|video|scan|qrcode/)) return '相机/相册/扫码';
  if (hit(/pay|payment|wallet|order|billing|purchase/)) return '支付/钱包/订单';
  if (hit(/clipboard|paste|copy/)) return '剪贴板';
  if (hit(/contact|addressbook/)) return '通讯录';
  if (hit(/push|notification/)) return '通知';
  if (hit(/open|launch|navigate|route|jump|deeplink|schema/)) return '跳转/唤起/路由';
  if (hit(/fetch|xhr|http|request|network|proxy/)) return '网络能力/请求';
  if (hit(/storage|localstorage|sessionstorage|indexeddb|cookie/)) return '存储/会话';
  if (hit(/snap|sc|snapchat|snapkit|bitmoji/)) return '疑似 Snapchat 注入';
  if (hit(/bridge|jsbridge|native|webkit|messagehandler/)) return '疑似 Bridge/注入';
  return '其他/未分类';
}

function summarizeAddedNames(title, addedNames, maxList = 120) {
  const counts = new Map();
  for (const n of addedNames) {
    const c = classifyApiName(n);
    counts.set(c, (counts.get(c) ?? 0) + 1);
  }

  const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  const top = addedNames.filter((n) => classifyApiName(n) !== '其他/未分类').slice(0, maxList);

  return {
    title,
    total: addedNames.length,
    byCategory: Object.fromEntries(sorted),
    topSuspiciousPreview: top,
    truncated: top.length === maxList && addedNames.length > maxList,
  };
}

function renderCategorySummary(diffObj) {
  if (!elCategorySummary) return;

  const winAll = diffObj?.added?.['window（全局对象名：含原型链）'] ?? [];
  const mh = diffObj?.added?.['webkit.messageHandlers（iOS 桥面名）'] ?? [];

  const summary = {
    note: '这是“Snapchat 比手机浏览器新增”的分类汇总（先看这里，再看下面详细 diff）',
    window_allNames: summarizeAddedNames('window（含原型链）新增', winAll),
    webkit_messageHandlers: summarizeAddedNames('webkit.messageHandlers 新增', mh),
  };

  elCategorySummary.textContent = JSON.stringify(summary, null, 2);
}

function clearBaseline() {
  baselineResult = null;
  elBaselineText.value = '';
  elBaselineFile.value = '';
  elBaselineDiff.textContent = '(empty)';
  if (elCategorySummary) elCategorySummary.textContent = '(empty)';
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
    setStatus('已从文件读取基线（现在可以点“对比并分类”）', 'success');
  } catch (e) {
    setStatus(`读取基线失败：${e.message}`, 'error');
  }
}

function compareWithBaseline() {
  try {
    if (!currentResult) {
      setStatus('请先点“扫描当前环境”生成当前结果', 'warn');
      return;
    }
    baselineResult = baselineResult ?? parseBaselineFromTextarea();
    if (!baselineResult) {
      setStatus('请先粘贴/导入“手机浏览器”的基线 JSON', 'warn');
      return;
    }
    const diffObj = makeBaselineDiff(baselineResult, currentResult);
    renderBaselineDiff(diffObj);
    renderCategorySummary(diffObj);
    setStatus('对比完成：先看“分类汇总”，再看详细 diff', 'success');
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
    result.watch.diffs.push({
      ts: nowISO(),
      scope: 'window.ownNames',
      added: d.added,
      removed: d.removed,
      addedCount: d.added.length,
      removedCount: d.removed.length,
    });
  }

  lastSnapshot = result;
  render(result);

  const hasAnyHit = Object.entries(result.quickHits).some(([, v]) => v && v.exists);
  setStatus(
    hasAnyHit ? '扫描完成（命中了一些疑似注入点）' : '扫描完成（未命中常见名字，但仍建议做基线对比）',
    hasAnyHit ? 'warn' : 'success'
  );
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

  setStatus('监控已停止：现在可以粘贴基线 JSON 点“对比并分类”', 'success');
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
  a.download = `snapchat-webview-api-scan-${nowISO().replace(/[:.]/g, '-')}.json`;
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
  if (elCategorySummary) elCategorySummary.textContent = '(empty)';
  setStatus('就绪：先用手机浏览器跑一次作为基线；再用 Snapchat 打开同一页对比即可');
})();
