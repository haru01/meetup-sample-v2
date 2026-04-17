/**
 * EventStorming シナリオ検証テスト
 *
 * Happy Path:  企画→公開→申し込み→承認→チェックイン→クローズ
 * Scenario A:  定員超過→キャンセル待ち→キャンセル→繰り上がり
 * Scenario B:  参加確定後キャンセル（主催者通知）
 * Scenario C:  イベント中止（全参加者通知）
 */

import { test, expect, type Page, type Browser, type BrowserContext } from '@playwright/test'

const uniqueSuffix = () => Date.now().toString() + Math.random().toString(36).slice(2, 6)

// ----------------------------------------------------------------
// ヘルパー
// ----------------------------------------------------------------

async function register(page: Page, suffix: string): Promise<{ name: string; email: string }> {
  const name = `ユーザー${suffix}`
  const email = `user${suffix}@example.com`
  await page.goto('/register')
  await page.getByLabel('名前').fill(name)
  await page.getByLabel('メールアドレス').fill(email)
  await page.getByLabel('パスワード').fill('password123')
  await page.getByRole('button', { name: '登録' }).click()
  await expect(page).toHaveURL('/')
  return { name, email }
}

async function login(page: Page, email: string) {
  await page.goto('/login')
  await page.getByLabel('メールアドレス').fill(email)
  await page.getByLabel('パスワード').fill('password123')
  await page.getByRole('button', { name: 'ログイン' }).click()
  await expect(page).toHaveURL('/')
}

async function logout(page: Page) {
  await page.getByRole('button', { name: 'ログアウト' }).click()
  await expect(page.getByRole('link', { name: 'ログイン' })).toBeVisible()
}

async function createCommunityAndEvent(
  page: Page,
  suffix: string,
  capacity: number,
): Promise<string> {
  // コミュニティ作成
  await page.getByRole('link', { name: 'コミュニティ作成' }).click()
  await page.getByLabel('コミュニティ名').fill(`テストコミュニティ${suffix}`)
  await page.locator('textarea#description').fill(`説明${suffix}`)
  await page.locator('select#category').selectOption('TECH')
  await page.locator('select#visibility').selectOption('PUBLIC')
  await page.getByRole('button', { name: '作成' }).click()
  await expect(page.getByRole('heading', { name: `テストコミュニティ${suffix}` })).toBeVisible()

  // イベント作成
  await page.getByRole('button', { name: 'イベント作成' }).click()
  await page.getByLabel('タイトル').fill(`テストイベント${suffix}`)
  await page.locator('textarea#event-description').fill(`イベント説明${suffix}`)
  await page.getByLabel('開始日時').fill('2030-01-01T19:00')
  await page.getByLabel('終了日時').fill('2030-01-01T21:00')
  await page.locator('select#event-format').selectOption('ONLINE')
  await page.getByLabel('定員').clear()
  await page.getByLabel('定員').fill(String(capacity))
  await page.getByRole('button', { name: '作成' }).click()
  await expect(page.getByRole('heading', { name: `テストコミュニティ${suffix}` })).toBeVisible()

  // コミュニティ詳細ページのイベントセクションからイベントリンクを取得
  const eventLink = page.getByRole('link', { name: `テストイベント${suffix}`, exact: true })
  await expect(eventLink).toBeVisible({ timeout: 5000 })
  const href = await eventLink.getAttribute('href')
  if (!href) throw new Error('event link not found')
  const eventId = href.split('/').pop()!
  return eventId
}

async function goToEventDetail(page: Page, eventId: string) {
  await page.goto(`/events/${eventId}`)
}

async function publishEvent(page: Page, eventId: string) {
  await goToEventDetail(page, eventId)
  await page.getByRole('button', { name: '公開' }).click()
  await expect(page.getByText('イベントを公開しました')).toBeVisible()
}

async function applyForEvent(page: Page, eventId: string): Promise<void> {
  await goToEventDetail(page, eventId)
  await page.getByRole('button', { name: '参加申し込み' }).click()
  await expect(page.getByText('参加申し込みが完了しました')).toBeVisible()
}

async function approveAll(page: Page, eventId: string): Promise<void> {
  await page.goto(`/events/${eventId}/applications`)
  await expect(page.getByRole('heading', { name: '申し込み一覧' })).toBeVisible()
  const approveButton = page.getByRole('button', { name: /全員承認/ })
  await expect(approveButton).toBeVisible()
  await approveButton.click()
  await expect(page.getByText(/件を承認しました/)).toBeVisible()
}

async function checkIn(page: Page, eventId: string): Promise<void> {
  await page.goto(`/events/${eventId}/checkin`)
  await page.getByRole('button', { name: 'チェックインする' }).click()
  await expect(page.getByText('チェックイン済み')).toBeVisible()
}

// ----------------------------------------------------------------
// Happy Path
// ----------------------------------------------------------------

test.describe('ハッピーパス', () => {
  test('企画→公開→申し込み→承認→チェックイン→クローズ', async ({ browser }) => {
    const suffix = uniqueSuffix()

    // 主催者コンテキスト
    const organizerCtx = await browser.newContext()
    const organizer = await organizerCtx.newPage()

    // 参加者コンテキスト
    const memberCtx = await browser.newContext()
    const member = await memberCtx.newPage()

    // 主催者: 登録・コミュニティ・イベント作成
    const { email: orgEmail } = await register(organizer, `org${suffix}`)
    const eventId = await createCommunityAndEvent(organizer, suffix, 30)

    // 主催者: イベント公開
    await publishEvent(organizer, eventId)

    // 参加者: 登録・申し込み
    const { email: memberEmail } = await register(member, `mbr${suffix}`)
    await applyForEvent(member, eventId)

    // 参加者の申し込みステータス確認
    await goToEventDetail(member, eventId)
    await expect(member.getByText('ステータス: 申込中')).toBeVisible()

    // 主催者: 承認
    await login(organizer, orgEmail)
    await approveAll(organizer, eventId)

    // 参加者: 承認済み確認
    await member.reload()
    await goToEventDetail(member, eventId)
    await expect(member.getByText('ステータス: 承認済み')).toBeVisible()

    // 参加者: チェックイン
    await checkIn(member, eventId)

    // 主催者: クローズ
    await goToEventDetail(organizer, eventId)
    await organizer.getByRole('button', { name: 'クローズ' }).click()
    await expect(organizer.getByText('イベントをクローズしました')).toBeVisible()

    // イベントステータス確認
    await expect(organizer.getByText('ステータス: CLOSED')).toBeVisible()

    await organizerCtx.close()
    await memberCtx.close()
  })
})

// ----------------------------------------------------------------
// シナリオA: 定員超過・キャンセル待ち繰り上がり
// ----------------------------------------------------------------

test.describe('シナリオA: 定員超過・キャンセル待ち繰り上がり', () => {
  test('定員1名→2人目はキャンセル待ち→1人目キャンセル→2人目繰り上がり', async ({
    browser,
  }) => {
    const suffix = uniqueSuffix()

    const orgCtx = await browser.newContext()
    const member1Ctx = await browser.newContext()
    const member2Ctx = await browser.newContext()

    const organizer = await orgCtx.newPage()
    const member1 = await member1Ctx.newPage()
    const member2 = await member2Ctx.newPage()

    // 主催者: 定員1名のイベント作成・公開
    await register(organizer, `orgA${suffix}`)
    const eventId = await createCommunityAndEvent(organizer, `A${suffix}`, 1)
    await publishEvent(organizer, eventId)

    // member1: 申し込み
    await register(member1, `m1A${suffix}`)
    await applyForEvent(member1, eventId)

    // 主催者: member1 を承認（定員1名が埋まる）
    const { email: orgEmail } = { email: `userorg${suffix}@example.com` }
    await approveAll(organizer, eventId)

    // member2: 申し込み → キャンセル待ちになる
    await register(member2, `m2A${suffix}`)
    await applyForEvent(member2, eventId)

    await goToEventDetail(member2, eventId)
    await expect(member2.getByText('ステータス: キャンセル待ち')).toBeVisible()

    // member1: キャンセル
    await goToEventDetail(member1, eventId)
    await member1.getByRole('button', { name: 'キャンセル' }).click()
    await expect(member1.getByText('キャンセルしました')).toBeVisible()

    // member2: 繰り上がり確認（ポリシーが EVENTUAL なので少し待つ）
    await member2.waitForTimeout(1000)
    await goToEventDetail(member2, eventId)
    await expect(member2.getByText('ステータス: 承認済み')).toBeVisible()

    await orgCtx.close()
    await member1Ctx.close()
    await member2Ctx.close()
  })
})

// ----------------------------------------------------------------
// シナリオB: 参加者キャンセル
// ----------------------------------------------------------------

test.describe('シナリオB: 参加者キャンセル', () => {
  test('参加確定後にキャンセルするとキャンセル済みになる', async ({ browser }) => {
    const suffix = uniqueSuffix()

    const orgCtx = await browser.newContext()
    const memberCtx = await browser.newContext()
    const organizer = await orgCtx.newPage()
    const member = await memberCtx.newPage()

    await register(organizer, `orgB${suffix}`)
    const eventId = await createCommunityAndEvent(organizer, `B${suffix}`, 30)
    await publishEvent(organizer, eventId)

    await register(member, `mbrB${suffix}`)
    await applyForEvent(member, eventId)

    // 承認
    await approveAll(organizer, eventId)

    // 参加者: 承認済み確認 → キャンセル
    await goToEventDetail(member, eventId)
    await expect(member.getByText('ステータス: 承認済み')).toBeVisible()
    await member.getByRole('button', { name: 'キャンセル' }).click()
    await expect(member.getByText('キャンセルしました')).toBeVisible()

    // キャンセル済み確認
    await member.goto('/my/participations')
    await expect(member.getByText('キャンセル済み')).toBeVisible()

    await orgCtx.close()
    await memberCtx.close()
  })
})

// ----------------------------------------------------------------
// シナリオC: イベント中止
// ----------------------------------------------------------------

test.describe('シナリオC: イベント中止', () => {
  test('公開済みイベントを中止するとステータスが CANCELLED になる', async ({ browser }) => {
    const suffix = uniqueSuffix()

    const orgCtx = await browser.newContext()
    const memberCtx = await browser.newContext()
    const organizer = await orgCtx.newPage()
    const member = await memberCtx.newPage()

    await register(organizer, `orgC${suffix}`)
    const eventId = await createCommunityAndEvent(organizer, `C${suffix}`, 30)
    await publishEvent(organizer, eventId)

    // 参加者: 申し込み・承認
    await register(member, `mbrC${suffix}`)
    await applyForEvent(member, eventId)
    await approveAll(organizer, eventId)

    // 主催者: イベント中止
    await goToEventDetail(organizer, eventId)
    await organizer.getByRole('button', { name: '中止' }).click()
    await expect(organizer.getByText('イベントを中止しました')).toBeVisible()
    await expect(organizer.getByText('ステータス: CANCELLED')).toBeVisible()

    // 参加者: イベント詳細で中止確認
    await goToEventDetail(member, eventId)
    await expect(member.getByText('ステータス: CANCELLED')).toBeVisible()

    await orgCtx.close()
    await memberCtx.close()
  })
})
