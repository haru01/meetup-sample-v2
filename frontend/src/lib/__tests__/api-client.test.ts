import { describe, it, expect, vi, beforeEach } from 'vitest'
import { apiClient } from '../api-client'
import { setToken, removeToken } from '../token'

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

describe('apiClient', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createLocalStorageMock())
    vi.restoreAllMocks()
  })

  describe('認証ヘッダー', () => {
    it('トークンが存在する場合は Authorization ヘッダーを付与する', async () => {
      setToken('my-jwt-token')
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: '1', name: 'test' }),
      })
      vi.stubGlobal('fetch', mockFetch)

      await apiClient.get('/api/test')

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer my-jwt-token',
          }),
        }),
      )
    })

    it('トークンが存在しない場合は Authorization ヘッダーを付与しない', async () => {
      removeToken()
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ message: 'ok' }),
      })
      vi.stubGlobal('fetch', mockFetch)

      await apiClient.get('/api/public')

      const calledHeaders = mockFetch.mock.calls[0][1].headers as Record<string, string>
      expect(calledHeaders['Authorization']).toBeUndefined()
    })
  })

  describe('レスポンス処理', () => {
    it('成功レスポンスの場合は { ok: true, data } を返す', async () => {
      setToken('token')
      const responseData = { id: '123', name: 'community' }
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: async () => responseData,
      }))

      const result = await apiClient.get('/api/communities')

      expect(result).toEqual({ ok: true, data: responseData })
    })

    it('失敗レスポンスの場合は { ok: false, error } を返す', async () => {
      removeToken()
      const errorData = { type: 'NotFound', message: 'Not found' }
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        json: async () => errorData,
      }))

      const result = await apiClient.get('/api/communities/999')

      expect(result).toEqual({ ok: false, error: errorData })
    })
  })

  describe('HTTP メソッド', () => {
    it('post メソッドは POST リクエストを送信する', async () => {
      removeToken()
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'new-id' }),
      })
      vi.stubGlobal('fetch', mockFetch)

      await apiClient.post('/api/communities', { name: 'New Community' })

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/communities',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'New Community' }),
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        }),
      )
    })

    it('patch メソッドは PATCH リクエストを送信する', async () => {
      removeToken()
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: '1' }),
      })
      vi.stubGlobal('fetch', mockFetch)

      await apiClient.patch('/api/communities/1', { name: 'Updated' })

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/communities/1',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ name: 'Updated' }),
        }),
      )
    })

    it('delete メソッドは DELETE リクエストを送信する', async () => {
      removeToken()
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({}),
      })
      vi.stubGlobal('fetch', mockFetch)

      await apiClient.delete('/api/communities/1')

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/communities/1',
        expect.objectContaining({
          method: 'DELETE',
        }),
      )
    })
  })
})
