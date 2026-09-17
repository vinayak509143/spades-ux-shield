type ChromeDom = {
  dom?: {
    openOrClosedShadowRoot?: (element: Element) => ShadowRoot | null;
  };
};

export function getShadowRoot(host: Element): ShadowRoot | null {
  const chromeDom = (globalThis as ChromeDom).chrome?.dom?.openOrClosedShadowRoot;
  if (chromeDom) {
    const closed = chromeDom(host as HTMLElement);
    if (closed) {
      return closed;
    }
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
      const shadow = getShadowRoot(el);
      if (shadow) {
        scan(shadow);
      }
    }
  };

  scan(root);
  return found;
}
