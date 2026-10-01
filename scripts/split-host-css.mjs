/** Mozilla's add-on linter rejects a single text file larger than 5 MiB. */
export const HOST_CSS_PART_MAX_BYTES = 4 * 1024 * 1024;

/**
 * Split a host -> CSS map into JSON objects that each stringify under maxBytes.
 * @param {Record<string, string>} hostCss
 * @param {number} maxBytes
 * @returns {Record<string, string>[]}
 */
export function splitHostCssMap(hostCss, maxBytes = HOST_CSS_PART_MAX_BYTES) {
  if (!Number.isInteger(maxBytes) || maxBytes < 2) {
    throw new Error('maxBytes must be an integer greater than 1');
  }
  /** @type {Record<string, string>[]} */
  const parts = [];
  /** @type {string[]} */
  let insides = [];
  let bytes = 2;

  const flush = () => {
    if (insides.length === 0) {
      return;
    }
    parts.push(JSON.parse(`{${insides.join(',')}}`));
    insides = [];
    bytes = 2;
  };

  for (const [host, css] of Object.entries(hostCss)) {
    if (typeof css !== 'string') {
      throw new Error(`Host CSS for ${host} must be a string`);
    }
    const inside = JSON.stringify({ [host]: css }).slice(1, -1);
    const insideBytes = Buffer.byteLength(inside, 'utf8');
    if (insideBytes + 2 > maxBytes) {
      throw new Error(`Host CSS for ${host} is ${insideBytes + 2} bytes and exceeds ${maxBytes}`);
    }
    const nextBytes = insides.length === 0 ? 2 + insideBytes : bytes + 1 + insideBytes;
    if (nextBytes > maxBytes) {
      flush();
    }
    insides.push(inside);
    bytes = insides.length === 1 ? 2 + insideBytes : bytes + 1 + insideBytes;
  }
  flush();
  return parts;
}

/**
 * @param {number} index 1-based
 */
export function hostCssPartName(index) {
  return `packaged-host-css-part-${String(index).padStart(2, '0')}.json`;
}
