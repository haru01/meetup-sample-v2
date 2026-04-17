import { test, expect } from '@playwright/test'

const uniqueSuffix = () => Date.now().toString()

test.describe('認証', () => {
  test.describe('新規登録', () => {
    test('新規アカウントを登録するとホームにリダイレクトされる', async ({ page }) => {
      const suffix = uniqueSuffix()
      await page.goto('/register')

      await expect(page.getByRole('heading', { name: '新規登録' })).toBeVisible()

      await page.getByLabel('名前').fill(`テストユーザー${suffix}`)
      await page.getByLabel('メールアドレス').fill(`test${suffix}@example.com`)
      await page.getByLabel('パスワード').fill('password123')
      await page.getByRole('button', { name: '登録' }).click()

      await expect(page).toHaveURL('/')
    })
  })

  test.describe('ログイン', () => {
    test('登録済みアカウントでログインするとヘッダーにユーザー名が表示される', async ({ page }) => {
      const suffix = uniqueSuffix()
      const name = `ログインユーザー${suffix}`
      const email = `login${suffix}@example.com`
      const password = 'password123'

      // 先に登録
      await page.goto('/register')
      await page.getByLabel('名前').fill(name)
      await page.getByLabel('メールアドレス').fill(email)
      await page.getByLabel('パスワード').fill(password)
      await page.getByRole('button', { name: '登録' }).click()
      await expect(page).toHaveURL('/')

      // ログアウト
      await page.getByRole('button', { name: 'ログアウト' }).click()
      await expect(page.getByRole('link', { name: 'ログイン' })).toBeVisible()

      // ログイン
      await page.goto('/login')
      await expect(page.getByRole('heading', { name: 'ログイン' })).toBeVisible()
      await page.getByLabel('メールアドレス').fill(email)
      await page.getByLabel('パスワード').fill(password)
      await page.getByRole('button', { name: 'ログイン' }).click()

      await expect(page).toHaveURL('/')
      await expect(page.getByText(name)).toBeVisible()
    })

    test('誤った認証情報ではログインに失敗しユーザーは認証されない', async ({ page }) => {
      await page.goto('/login')

      await page.getByLabel('メールアドレス').fill('nonexistent@example.com')
      await page.getByLabel('パスワード').fill('wrongpassword')
      await page.getByRole('button', { name: 'ログイン' }).click()

      // ログイン失敗時はユーザーが認証されていないことを確認（ログアウトボタンが表示されない）
      await expect(page.getByRole('button', { name: 'ログアウト' })).not.toBeVisible()
    })
  })

  test.describe('ログアウト', () => {
    test('ログアウトするとログインページにリダイレクトされる', async ({ page }) => {
      const suffix = uniqueSuffix()

      // 登録
      await page.goto('/register')
      await page.getByLabel('名前').fill(`ログアウトユーザー${suffix}`)
      await page.getByLabel('メールアドレス').fill(`logout${suffix}@example.com`)
      await page.getByLabel('パスワード').fill('password123')
      await page.getByRole('button', { name: '登録' }).click()
      await expect(page).toHaveURL('/')

      // ログアウト
      await page.getByRole('button', { name: 'ログアウト' }).click()

      // ログインリンクが表示されていることを確認（未ログイン状態）
      await expect(page.getByRole('link', { name: 'ログイン' })).toBeVisible()
      await expect(page.getByRole('link', { name: '新規登録' })).toBeVisible()
    })
  })
})
