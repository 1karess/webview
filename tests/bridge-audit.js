/*
  Bridge Audit (Stage 1 + record stub)

  目标：
  - 在手机上，不用控制台：列出“可见 API/按钮清单”
  - 给你导出 JSON，方便你之后在 Excel/Notion 里汇总两张表

  注意：这里默认只做“发现/枚举”，不去自动调用可疑能力（避免误触支付/扫码）。
*/

function nowISO(){return new Date().toISOString();}

function safeStringify(value, maxLen = 220) {
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
  return { names: names.sort(), symbols: symbols.map(s => s.toString()).sort() };
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
    try { proto = Object.getPrototypeOf(cur); } catch { proto = null; }
    if (!proto) break;
    chain.push({ depth: depth + 1, protoName: getProtoName(proto), proto });
    cur = proto;
  }
  return chain;
}

function snapshot(label, obj) {
  const own = listOwnKeys(obj);
  const chain = collectPrototypeChain(obj, 6);
  const protoUnionNames = new Set();
  const protoUnionSymbols = new Set();

  const protoLevels = [];
  for (const c of chain) {
    const keys = listOwnKeys(c.proto);
    keys.names.forEach(n => protoUnionNames.add(n));
    keys.symbols.forEach(s => protoUnionSymbols.add(s));
    protoLevels.push({ depth: c.depth, protoName: c.protoName, ownNamesCount: keys.names.length, ownSymbolsCount: keys.symbols.length });
  }

  const allNames = Array.from(new Set([...own.names, ...protoUnionNames])).sort();
  const allSymbols = Array.from(new Set([...own.symbols, ...protoUnionSymbols])).sort();

  return {
    label,
    ownNames: own.names,
    ownSymbols: own.symbols,
    proto: { levels: protoLevels, unionNames: Array.from(protoUnionNames).sort(), unionSymbols: Array.from(protoUnionSymbols).sort() },
    allNames,
    allSymbols,
  };
}

function suspiciousWindowNames() {
  const pats = [/^mqq$/i,/^qq$/i,/^qz/i,/^tx/i,/^tbs/i,/^x5/i,/^webkit$/i,/^bridge/i,/native/i,/jsbridge/i,/^__qq/i];
  const names = (()=>{try{return Object.getOwnPropertyNames(window)}catch{return []}})();
  return names.filter(n => pats.some(re => re.test(n))).sort();
}

function bridgeQuickHits() {
  const hits = {};
  const candidates = [
    ['mqq'],['qq'],['QQ'],['QZAppExternal'],['QZFL'],['QM'],['TXWebKitNativeFetch'],['TXWebKit'],
    ['webkit'],['webkit','messageHandlers'],
  ];

  for (const parts of candidates) {
    let cur = window;
    let ok = true;
    try {
      for (const p of parts) {
        cur = cur[p];
        if (cur === undefined) { ok = false; break; }
      }
    } catch (e) {
      hits[parts.join('.')] = { exists: true, error: String(e) };
      continue;
    }
    hits[parts.join('.')] = { exists: ok, type: ok ? typeof cur : 'undefined', preview: ok ? safeStringify(cur) : undefined };
  }

  // iOS messageHandlers 名称
  try {
    const mh = window.webkit && window.webkit.messageHandlers;
    if (mh) {
      hits['webkit.messageHandlers.*'] = { exists: true, handlers: listOwnKeys(mh).names };
    }
  } catch {}

  hits['window.suspiciousNames'] = { exists: true, names: suspiciousWindowNames().slice(0, 300) };
  return hits;
}

function findCallableUnder(obj, prefix, maxKeys = 300) {
  // 只做浅层枚举：obj 的 ownNames 里找 function
  const out = [];
  let names = [];
  try { names = Object.getOwnPropertyNames(obj); } catch { return out; }
  for (const k of names.slice(0, maxKeys)) {
    try {
      const v = obj[k];
      if (typeof v === 'function') {
        out.push({ name: `${prefix}.${k}`, paramCount: v.length, preview: safeStringify(v) });
      }
    } catch (e) {
      // ignore
    }
  }
  return out.sort((a,b)=>a.name.localeCompare(b.name));
}

function scanVisibleAPIs() {
  const appName = document.getElementById('appName')?.value ?? '';
  const entry = document.getElementById('entry')?.value ?? '';

  const pageA = new URL('./bridge-audit-a.html', location.href).toString();
  const pageBDefault = new URL('./bridge-audit-b.html', location.href).toString();

  const pageBOverride = document.getElementById('pageBOverride')?.value?.trim();
  const pageB = pageBOverride || pageBDefault;

  const iframePage = new URL('./bridge-audit-iframe.html', location.href).toString();

  const snaps = {
    window: snapshot('window', window),
    navigator: snapshot('navigator', navigator),
    document: snapshot('document', document),
    location: snapshot('location', location),
  };

  let webkitMH = null;
  try {
    if (window.webkit && window.webkit.messageHandlers) {
      webkitMH = snapshot('webkit.messageHandlers', window.webkit.messageHandlers);
    }
  } catch (e) {
    webkitMH = { error: String(e) };
  }

  // “按钮清单”：
  // 这里先用可疑名字命中，再对命中的对象做浅层函数枚举。
  const hits = bridgeQuickHits();
  const callable = [];

  const candidateObjects = [
    ['mqq', ()=>window.mqq],
    ['qq', ()=>window.qq],
    ['QQ', ()=>window.QQ],
    ['QZAppExternal', ()=>window.QZAppExternal],
    ['QZFL', ()=>window.QZFL],
    ['QM', ()=>window.QM],
    ['TXWebKitNativeFetch', ()=>window.TXWebKitNativeFetch],
    ['TXWebKit', ()=>window.TXWebKit],
    ['webkit.messageHandlers', ()=>window.webkit && window.webkit.messageHandlers],
  ];

  for (const [name, getter] of candidateObjects) {
    let obj = null;
    try { obj = getter(); } catch { obj = null; }
    if (!obj) continue;

    if (typeof obj === 'function') {
      callable.push({ name: name, paramCount: obj.length, preview: safeStringify(obj), note: 'callable (function)' });
      continue;
    }

    if (typeof obj === 'object') {
      callable.push(...findCallableUnder(obj, name));
    }
  }

  const result = {
    testType: 'bridge-audit-scan',
    timestamp: nowISO(),
    appName,
    entry,
    page: { current: location.href, pageA, pageB, iframePage },
    userAgent: navigator.userAgent,
    quickHits: hits,
    snapshots: { ...snaps, webkitMessageHandlers: webkitMH },
    apiList: {
      // 这是你“按钮清单表”的核心数据：可疑对象下找到的可调用函数
      callable,
      callableCount: callable.length,
    },
  };

  return result;
}

let currentResult = null;

function runScan() {
  // 在 A 页里把链接填上
  const elA = document.getElementById('pageA');
  const elB = document.getElementById('pageB');
  const elIframe = document.getElementById('iframePage');

  if (elA) elA.textContent = new URL('./bridge-audit-a.html', location.href).toString();
  if (elB) elB.textContent = new URL('./bridge-audit-b.html', location.href).toString();
  if (elIframe) elIframe.textContent = new URL('./bridge-audit-iframe.html', location.href).toString();

  currentResult = scanVisibleAPIs();
  const out = document.getElementById('out');
  if (out) out.textContent = JSON.stringify(currentResult, null, 2);
}

function downloadJSON() {
  const data = currentResult ?? scanVisibleAPIs();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bridge-audit-${(data.appName||'unknown')}-${data.timestamp.replace(/[:.]/g,'-')}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function openIframePage() {
  const url = new URL('./bridge-audit-iframe.html', location.href).toString();
  window.location.href = url;
}

// A 页里用到
(function initA(){
  const elA = document.getElementById('pageA');
  const elB = document.getElementById('pageB');
  const elIframe = document.getElementById('iframePage');
  if (elA) elA.textContent = new URL('./bridge-audit-a.html', location.href).toString();
  if (elB) elB.textContent = new URL('./bridge-audit-b.html', location.href).toString();
  if (elIframe) elIframe.textContent = new URL('./bridge-audit-iframe.html', location.href).toString();
})();
