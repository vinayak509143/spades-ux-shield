type ChromeGlobal = {
  chrome?: {
    dom?: {
      openOrClosedShadowRoot?: (element: HTMLElement) => ShadowRoot | null;
    };
  };
};

const ELEMENT_NODE = 1;

export function isHtmlElement(node: Node): node is HTMLElement {
  return node.nodeType === ELEMENT_NODE && node instanceof HTMLElement;
}

export function getShadowRoot(host: Node): ShadowRoot | null {
  if (host.nodeType !== ELEMENT_NODE || !(host instanceof HTMLElement)) {
    return null;
  }
  try {
    const chromeDom = (globalThis as ChromeGlobal).chrome?.dom?.openOrClosedShadowRoot;
    if (chromeDom) {
      const closed = chromeDom(host);
      if (closed) {
        return closed;
      }
    }
  } catch {
    return null;
  }
  return host.shadowRoot;
}

export function queryAll(
  selector: string,
  root: ParentNode,
  pierceShadow = true,
): Element[] {
  if (!selector) {
    return [];
  }
  const found: Element[] = [];
  const seen = new Set<Element>();

  const scan = (node: ParentNode): void => {
    try {
      for (const el of node.querySelectorAll(selector)) {
        if (!seen.has(el)) {
          seen.add(el);
          found.push(el);
        }
      }
    } catch {
      // Invalid selector for this root — skip.
    }
    if (!pierceShadow) {
      return;
    }
    for (const el of node.querySelectorAll('*')) {
      if (!isHtmlElement(el)) {
        continue;
      }
      const shadow = getShadowRoot(el);
      if (shadow) {
        scan(shadow);
      }
    }
  };

  scan(root);
  return found;
}
