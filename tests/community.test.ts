import { describe, expect, it } from 'vitest';
import {
  ALIAS_MAX,
  POST_MAX_LENGTH,
  REPLY_MAX_LENGTH,
  checkAlias,
  checkBody,
  containsLink,
} from '@/lib/community';

describe('community alias', () => {
  it('accepts an ordinary alias and returns it trimmed', () => {
    const res = checkAlias('  chart_watcher  ');
    expect(res).toEqual({ ok: true, value: 'chart_watcher' });
  });

  it('rejects anything too short or too long', () => {
    expect(checkAlias('ab').ok).toBe(false);
    expect(checkAlias('a'.repeat(ALIAS_MAX + 1)).ok).toBe(false);
  });

  it('rejects punctuation and spaces, so an alias cannot be dressed up', () => {
    expect(checkAlias('chart watcher').ok).toBe(false);
    expect(checkAlias('chart.watcher').ok).toBe(false);
    expect(checkAlias('<b>bold</b>').ok).toBe(false);
  });

  it('blocks aliases that pose as the academy, in any casing', () => {
    for (const attempt of ['SPA_Official', 'spartan_calls', 'TheAdmin', 'academy_news', 'Support_Team']) {
      expect(checkAlias(attempt).ok).toBe(false);
    }
  });
});

describe('community post body', () => {
  it('accepts a normal post and collapses runaway blank lines', () => {
    const res = checkBody('First thought.\n\n\n\nSecond thought.');
    expect(res).toEqual({ ok: true, value: 'First thought.\n\nSecond thought.' });
  });

  it('rejects an empty or whitespace-only body', () => {
    expect(checkBody('   \n  ').ok).toBe(false);
  });

  it('holds posts and replies to their own limits', () => {
    expect(checkBody('a'.repeat(POST_MAX_LENGTH)).ok).toBe(true);
    expect(checkBody('a'.repeat(POST_MAX_LENGTH + 1)).ok).toBe(false);
    expect(checkBody('a'.repeat(REPLY_MAX_LENGTH + 1), { isReply: true }).ok).toBe(false);
    expect(checkBody('a'.repeat(REPLY_MAX_LENGTH), { isReply: true }).ok).toBe(true);
  });

  it('rejects links in every shape they turn up in', () => {
    for (const attempt of [
      'check https://example.com/free-signals',
      'go to www.scam.io now',
      'dm me at telegram.me/whoever',
      'my site is example.co.uk for more',
    ]) {
      expect(containsLink(attempt)).toBe(true);
      expect(checkBody(attempt).ok).toBe(false);
    }
  });

  it('does not mistake ordinary prose or a ticker for a link', () => {
    for (const ok of [
      'AAPL looks stretched here.',
      'Bought at 41.20, exit at 58. Not advice.',
      'e.g. the usual suspects rallied today',
    ]) {
      expect(containsLink(ok)).toBe(false);
      expect(checkBody(ok).ok).toBe(true);
    }
  });
});
