import { test, expect, type Page } from '@playwright/test'

const uniqueSuffix = () => Date.now().toString()

async function registerAndLogin(page: Page, suffix: string) {
  await page.goto('/register')
  await page.getByLabel('名前').fill(`コミュニティユーザー${suffix}`)
  await page.getByLabel('メールアドレス').fill(`community${suffix}@example.com`)
  await page.getByLabel('パスワード').fill('password123')
  await page.getByRole('button', { name: '登録' }).click()
  await expect(page).toHaveURL('/')
}

test.describe('コミュニティ', () => {
  test.describe('コミュニティ作成', () => {
    test('コミュニティを作成すると一覧に表示される', async ({ page }) => {
      const suffix = uniqueSuffix()
      await registerAndLogin(page, suffix)

      // コミュニティ作成ページへ
      await page.getByRole('link', { name: 'コミュニティ作成' }).click()
      await expect(page.getByRole('heading', { name: 'コミュニティ作成' })).toBeVisible()

      const communityName = `テストコミュニティ${suffix}`
      await page.getByLabel('コミュニティ名').fill(communityName)
      await page.locator('textarea#description').fill(`${communityName}の説明文です`)
      await page.locator('select#category').selectOption('TECH')
      await page.locator('select#visibility').selectOption('PUBLIC')
      await page.getByRole('button', { name: '作成' }).click()

      // 詳細ページにリダイレクト
      await expect(page.getByRole('heading', { name: communityName })).toBeVisible()

      // 一覧に戻って確認
      await page.getByRole('link', { name: 'コミュニティ一覧' }).click()
      await expect(page.getByRole('heading', { name: communityName, level: 2, exact: true })).toBeVisible()
    })
  })

  test.describe('コミュニティ詳細', () => {
    test('コミュニティ詳細ページを閲覧できる', async ({ page }) => {
      const suffix = uniqueSuffix()
      await registerAndLogin(page, suffix)

      // コミュニティ作成
      await page.getByRole('link', { name: 'コミュニティ作成' }).click()
      await expect(page.getByRole('heading', { name: 'コミュニティ作成' })).toBeVisible()
      const communityName = `詳細テスト${suffix}`
      await page.getByLabel('コミュニティ名').fill(communityName)
      await page.locator('textarea#description').fill('詳細ページのテスト用コミュニティ')
      await page.getByRole('button', { name: '作成' }).click()

      // 詳細ページが表示される
      await expect(page.getByRole('heading', { name: communityName })).toBeVisible()
      await expect(page.getByText('詳細ページのテスト用コミュニティ')).toBeVisible()
      await expect(page.getByText('メンバー一覧')).toBeVisible()
    })
  })

  test.describe('カテゴリフィルター', () => {
    test('カテゴリフィルターで絞り込みができる', async ({ page }) => {
      const suffix = uniqueSuffix()
      await registerAndLogin(page, suffix)

      // テクノロジーカテゴリのコミュニティ作成
      await page.getByRole('link', { name: 'コミュニティ作成' }).click()
      await expect(page.getByRole('heading', { name: 'コミュニティ作成' })).toBeVisible()
      const techName = `テクノロジーコミュニティ${suffix}`
      await page.getByLabel('コミュニティ名').fill(techName)
      await page.locator('textarea#description').fill('テクノロジーの説明')
      await page.locator('select#category').selectOption('TECH')
      await page.getByRole('button', { name: '作成' }).click()
      await expect(page.getByRole('heading', { name: techName })).toBeVisible()

      // ビジネスカテゴリのコミュニティ作成
      await page.getByRole('link', { name: 'コミュニティ作成' }).click()
      await expect(page.getByRole('heading', { name: 'コミュニティ作成' })).toBeVisible()
      const bizName = `ビジネスコミュニティ${suffix}`
      await page.getByLabel('コミュニティ名').fill(bizName)
      await page.locator('textarea#description').fill('ビジネスの説明')
      await page.locator('select#category').selectOption('BUSINESS')
      await page.getByRole('button', { name: '作成' }).click()
      await expect(page.getByRole('heading', { name: bizName })).toBeVisible()

      // 一覧ページでフィルター
      await page.getByRole('link', { name: 'コミュニティ一覧' }).click()
      await expect(page.getByText(techName)).toBeVisible()
      await expect(page.getByText(bizName)).toBeVisible()

      // テクノロジーでフィルター
      await page.getByLabel('カテゴリフィルター').selectOption('TECH')
      await expect(page.getByText(techName)).toBeVisible()
      await expect(page.getByText(bizName)).not.toBeVisible()

      // ビジネスでフィルター
      await page.getByLabel('カテゴリフィルター').selectOption('BUSINESS')
      await expect(page.getByText(bizName)).toBeVisible()
      await expect(page.getByText(techName)).not.toBeVisible()

      // フィルタークリア
      await page.getByLabel('カテゴリフィルター').selectOption('')
      await expect(page.getByText(techName)).toBeVisible()
      await expect(page.getByText(bizName)).toBeVisible()
    })
  })
})
