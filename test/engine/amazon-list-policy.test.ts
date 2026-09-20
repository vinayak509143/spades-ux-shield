import { describe, expect, it } from 'vitest';
import { amazonListHostViolation } from '../../src/engine/amazon-list-policy.js';

describe('amazonListHostViolation', () => {
  it('allows aliases and amazon.in', () => {
    expect(amazonListHostViolation('amazon-retail')).toBeNull();
    expect(amazonListHostViolation('amazon-en')).toBeNull();
    expect(amazonListHostViolation('amazon.in')).toBeNull();
    expect(amazonListHostViolation('www.amazon.in')).toBeNull();
  });

  it('rejects retail apex hosts that suffix-match subdomains', () => {
    expect(amazonListHostViolation('amazon.com')).not.toBeNull();
    expect(amazonListHostViolation('www.amazon.com')).not.toBeNull();
    expect(amazonListHostViolation('amazon.de')).not.toBeNull();
  });
});
