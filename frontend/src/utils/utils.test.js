import { diffText } from '../hooks/useNotes';
import { getErrorMessage } from '../api/errors';
import { toBaseUrl } from './config';

describe('diffText', () => {
  const apply = (text, { index, remove, insert }) => text.slice(0, index) + insert + text.slice(index + remove);

  it.each([
    ['', 'abc'],
    ['abc', ''],
    ['abc', 'abXc'],
    ['aaa', 'aaaa'],
    ['hello world', 'hello there world'],
    ['one two three', 'one three'],
    ['x🧪y', 'x🧫y'],
    ['🧪', '🧪🧪'],
    ['same', 'same'],
  ])('turns %j into %j', (before, after) => {
    expect(apply(before, diffText(before, after))).toBe(after);
  });

  it('never splits an emoji', () => {
    const { insert, remove } = diffText('x🧪y', 'x🧫y');
    expect(insert).toBe('🧫');
    expect(remove).toBe(2);
  });
});

describe('getErrorMessage', () => {
  it('prefers the reason given by the server', () => {
    expect(getErrorMessage({ response: { data: { error: 'Room not found' } } }, 'x')).toBe('Room not found');
  });
  it('explains when the server cannot be reached', () => {
    expect(getErrorMessage({ request: {} }, 'x')).toMatch(/Cannot reach the server/);
  });
  it('falls back when there is no readable reason', () => {
    expect(getErrorMessage({ response: { data: '<html>' } }, 'Failed')).toBe('Failed');
  });
});

describe('toBaseUrl', () => {
  it.each(['http://a.com', 'http://a.com/', 'http://a.com/api', 'http://a.com/api/'])('accepts %s', (url) => {
    expect(toBaseUrl(url)).toBe('http://a.com');
  });
});
