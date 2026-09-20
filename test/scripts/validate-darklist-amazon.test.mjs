import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

function runValidate(listContent) {
  const tmp = resolve(root, 'temp/validate-darklist-amazon-fixture.txt');
  mkdirSync(resolve(root, 'temp'), { recursive: true });
  writeFileSync(tmp, listContent, 'utf8');
  const r = spawnSync('node', ['scripts/validate-darklist.mjs', tmp], {
    cwd: root,
    encoding: 'utf8',
  });
  return { status: r.status, stdout: r.stdout, stderr: r.stderr };
}

describe('validate-darklist amazon host policy', () => {
  it('rejects amazon.com cosmetic host', () => {
    const body = `! Title: Spades Darklist
! Version: 209901011200
amazon.com##.a-badge
`;
    const { status, stderr } = runValidate(body);
    expect(status).not.toBe(0);
    expect(stderr).toMatch(/amazon-retail|amazon-en/i);
  });

  it('accepts amazon-retail and amazon.in rules', () => {
    const body = `! Title: Spades Darklist
! Version: 209901011201
amazon-retail###dealBadge_feature_div
amazon.in,www.amazon.in###gwm-window > li.gwm-window-tile:first-of-type
`;
    const { status } = runValidate(body);
    expect(status).toBe(0);
  });
});
