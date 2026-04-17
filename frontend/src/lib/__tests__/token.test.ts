import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getToken, setToken, removeToken } from '../token'

const createLocalStorageMock = () => {
  const store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { Object.keys(store).forEach(k => delete store[k]) }),
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
    get length() { return Object.keys(store).length },
  }
}

describe('token ユーティリティ', () => {
  beforeEach(() => {
    const mock = createLocalStorageMock()
    vi.stubGlobal('localStorage', mock)
  })

  describe('getToken', () => {
    it('トークンが存在しない場合は null を返す', () => {
      expect(getToken()).toBeNull()
    })

    it('setToken で保存したトークンを取得できる', () => {
      setToken('test-jwt-token')
      expect(getToken()).toBe('test-jwt-token')
    })
  })

  describe('setToken', () => {
    it('トークンを localStorage に保存する', () => {
      setToken('my-token-value')
      expect(getToken()).toBe('my-token-value')
    })
  })

  describe('removeToken', () => {
    it('保存されたトークンを削除する', () => {
      setToken('token-to-remove')
      removeToken()
      expect(getToken()).toBeNull()
    })
  })
})
