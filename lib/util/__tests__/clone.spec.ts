import { clone } from '../clone';

describe('clone', () => {
  it('should clone object', () => {
    expect(clone({ a: 1 })).toEqual({ a: 1 });
  });

  it('should clone array', () => {
    expect(clone([1, 2])).toEqual([1, 2]);
  });

  it('should clone number', () => {
    expect(clone(1)).toEqual(1);
  });

  it('should clone string', () => {
    expect(clone('1')).toEqual('1');
  });

  it('should clone deep object', () => {
    expect(clone({ a: 1, b: { c: { d: 2 } } })).toEqual({ a: 1, b: { c: { d: 2 } } });
  });

  it('should clone deep object with array', () => {
    expect(clone({ a: 'foo', b: { c: { d: 2 }, e: ['123'] } })).toEqual({
      a: 'foo',
      b: { c: { d: 2 }, e: ['123'] },
    });
  });

  it('should clone array of objects', () => {
    expect(clone([1, { a: 1 }, { b: { c: 3 } }, { d: { e: { f: [{ j: [{ k: [1, 1] }] }] } } }])).toEqual([
      1,
      { a: 1 },
      { b: { c: 3 } },
      { d: { e: { f: [{ j: [{ k: [1, 1] }] }] } } },
    ]);
  });
});
