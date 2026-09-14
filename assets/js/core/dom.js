const SVG_NS = 'http://www.w3.org/2000/svg';

export const qs = (selector, scope = document) => scope.querySelector(selector);
export const qsa = (selector, scope = document) => [...scope.querySelectorAll(selector)];

export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  applyAttrs(node, attrs);
  appendAll(node, children);
  return node;
}

export function svgEl(tag, attrs = {}, children = []) {
  const node = document.createElementNS(SVG_NS, tag);
  applyAttrs(node, attrs);
  appendAll(node, children);
  return node;
}

function applyAttrs(node, attrs) {
  for (const [key, value] of Object.entries(attrs)) {
    if (value === null || value === undefined || value === false) continue;
    if (key === 'text') node.textContent = value;
    else if (key === 'html') node.innerHTML = value;
    else if (key === 'dataset') Object.assign(node.dataset, value);
    else if (key === 'style' && typeof value === 'object') Object.assign(node.style, value);
    else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2).toLowerCase(), value);
    else node.setAttribute(key, value === true ? '' : value);
  }
}

function appendAll(node, children) {
  const list = Array.isArray(children) ? children : [children];
  for (const child of list) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
}

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
  return node;
}

export function toast(message, kind = 'info', timeout = 3200) {
  const host = qs('#toasts');
  if (!host) return;
  const node = el('div', { class: `toast ${kind}`, text: message });
  host.append(node);
  setTimeout(() => {
    node.classList.add('out');
    setTimeout(() => node.remove(), 260);
  }, timeout);
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    const helper = el('textarea', { style: { position: 'fixed', opacity: '0' } });
    helper.value = text;
    document.body.append(helper);
    helper.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch (fallbackError) {
      ok = false;
    }
    helper.remove();
    return ok;
  }
}
