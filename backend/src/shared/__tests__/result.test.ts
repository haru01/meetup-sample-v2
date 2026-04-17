import { describe, it, expect } from 'vitest';
import { ok, err, isOk, isErr, map, mapErr, flatMap, unwrapOr } from '../result';

describe('ok()', () => {
  it('ok: true の Ok 結果を作成する', () => {
    const result = ok(42);
    expect(result.ok).toBe(true);
  });

  it('指定した値を保持する', () => {
    const result = ok('hello');
    expect(result.value).toBe('hello');
  });

  it('オブジェクトを値として保持できる', () => {
    const value = { id: 1, name: 'test' };
    const result = ok(value);
    expect(result.value).toEqual(value);
  });
});

describe('err()', () => {
  it('ok: false の Err 結果を作成する', () => {
    const result = err('something went wrong');
    expect(result.ok).toBe(false);
  });

  it('指定したエラーを保持する', () => {
    const result = err('NOT_FOUND');
    expect(result.error).toBe('NOT_FOUND');
  });

  it('エラーオブジェクトを保持できる', () => {
    const error = { code: 'VALIDATION_ERROR', message: 'invalid input' };
    const result = err(error);
    expect(result.error).toEqual(error);
  });
});

describe('isOk()', () => {
  it('Ok 結果に対して true を返す', () => {
    expect(isOk(ok(1))).toBe(true);
  });

  it('Err 結果に対して false を返す', () => {
    expect(isOk(err('error'))).toBe(false);
  });

  it('型ガードとして機能し、チェック後に value にアクセスできる', () => {
    const result = ok(99) as ReturnType<typeof ok> | ReturnType<typeof err>;
    if (isOk(result)) {
      expect(result.value).toBe(99);
    }
  });
});

describe('isErr()', () => {
  it('Err 結果に対して true を返す', () => {
    expect(isErr(err('oops'))).toBe(true);
  });

  it('Ok 結果に対して false を返す', () => {
    expect(isErr(ok(1))).toBe(false);
  });

  it('型ガードとして機能し、チェック後に error にアクセスできる', () => {
    const result = err('FAIL') as ReturnType<typeof ok> | ReturnType<typeof err>;
    if (isErr(result)) {
      expect(result.error).toBe('FAIL');
    }
  });
});

describe('map()', () => {
  it('Ok の場合に値を変換する', () => {
    const result = map(ok(2), (x: number) => x * 3);
    expect(result).toEqual(ok(6));
  });

  it('Err の場合は関数を呼ばない', () => {
    let called = false;
    const result = map(err<string>('error'), (_x: never) => {
      called = true;
      return 0;
    });
    expect(called).toBe(false);
    expect(result).toEqual(err('error'));
  });

  it('Err の場合にエラー型を保持する', () => {
    const original = err<string>('original-error');
    const result = map(original, (x: number) => x + 1);
    expect(result).toEqual(original);
  });
});

describe('mapErr()', () => {
  it('Err の場合にエラーを変換する', () => {
    const result = mapErr(err('old'), (_e: string) => 'new');
    expect(result).toEqual(err('new'));
  });

  it('Ok の場合は関数を呼ばない', () => {
    let called = false;
    const result = mapErr(ok(5), (_e: never) => {
      called = true;
      return 'mapped';
    });
    expect(called).toBe(false);
    expect(result).toEqual(ok(5));
  });

  it('Ok の場合に値の型を保持する', () => {
    const original = ok(42);
    const result = mapErr(original, (_e: string) => 'new-error');
    expect(result).toEqual(original);
  });
});

describe('flatMap()', () => {
  it('Ok 結果をチェーンする', () => {
    const result = flatMap(ok(10), (x: number) => ok(x + 5));
    expect(result).toEqual(ok(15));
  });

  it('Err の場合は短絡評価し関数を呼ばない', () => {
    let called = false;
    const result = flatMap(err<string>('early-error'), (_x: never) => {
      called = true;
      return ok(0);
    });
    expect(called).toBe(false);
    expect(result).toEqual(err('early-error'));
  });

  it('関数が返した Err を伝播する', () => {
    const result = flatMap(ok(10), (_x: number) => err('inner-error'));
    expect(result).toEqual(err('inner-error'));
  });

  it('複数の操作をチェーンできる', () => {
    const parse = (s: string): ReturnType<typeof err> | ReturnType<typeof ok<number>> =>
      isNaN(Number(s)) ? err('NOT_A_NUMBER') : ok(Number(s));

    const double = (n: number): ReturnType<typeof ok<number>> => ok(n * 2);

    const result = flatMap(parse('21'), double);
    expect(result).toEqual(ok(42));
  });
});

describe('unwrapOr()', () => {
  it('Ok の場合に値を返す', () => {
    expect(unwrapOr(ok(7), 0)).toBe(7);
  });

  it('Err の場合にデフォルト値を返す', () => {
    expect(unwrapOr(err('error'), 99)).toBe(99);
  });

  it('文字列のデフォルト値でも動作する', () => {
    expect(unwrapOr(err('oops'), 'default')).toBe('default');
  });
});
