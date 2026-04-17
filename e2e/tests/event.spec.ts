import { test, expect, type Page } from "@playwright/test";

const uniqueSuffix = () => Date.now().toString();

async function registerAndLogin(page: Page, suffix: string) {
  await page.goto("/register");
  await page.getByLabel("名前").fill(`イベントユーザー${suffix}`);
  await page.getByLabel("メールアドレス").fill(`event${suffix}@example.com`);
  await page.getByLabel("パスワード").fill("password123");
  await page.getByRole("button", { name: "登録" }).click();
  await expect(page).toHaveURL("/");
}

async function createCommunity(page: Page, suffix: string): Promise<string> {
  await page.getByRole("link", { name: "コミュニティ作成" }).click();
  await expect(
    page.getByRole("heading", { name: "コミュニティ作成" }),
  ).toBeVisible();
  const communityName = `イベントテスト${suffix}`;
  await page.getByLabel("コミュニティ名").fill(communityName);
  await page
    .locator("textarea#description")
    .fill(`${communityName}の説明文です`);
  await page.locator("select#category").selectOption("TECH");
  await page.locator("select#visibility").selectOption("PUBLIC");
  await page.getByRole("button", { name: "作成" }).click();
  await expect(
    page.getByRole("heading", { name: communityName }),
  ).toBeVisible();
  return communityName;
}

async function logout(page: Page) {
  await page.getByRole("button", { name: "ログアウト" }).click();
  await expect(page.getByRole("link", { name: "ログイン" })).toBeVisible();
}

test.describe("イベント", () => {
  test.describe("イベント作成", () => {
    test("オーナーがイベントを作成するとコミュニティ詳細ページに遷移する", async ({
      page,
    }) => {
      const suffix = uniqueSuffix();
      await registerAndLogin(page, suffix);
      const communityName = await createCommunity(page, suffix);

      // イベント作成ボタンをクリック
      await page.getByRole("button", { name: "イベント作成" }).click();
      await expect(
        page.getByRole("heading", { name: "イベント作成" }),
      ).toBeVisible();

      // フォーム入力
      await page.getByLabel("タイトル").fill("TypeScript もくもく会");
      await page
        .locator("textarea#event-description")
        .fill("TypeScriptでもくもくプログラミングする会");
      await page.getByLabel("開始日時").fill("2026-12-01T19:00");
      await page.getByLabel("終了日時").fill("2026-12-01T21:00");
      await page.locator("select#event-format").selectOption("ONLINE");
      await page.getByLabel("定員").clear();
      await page.getByLabel("定員").fill("50");
      await page.getByRole("button", { name: "作成" }).click();

      // コミュニティ詳細ページにリダイレクト
      await expect(
        page.getByRole("heading", { name: communityName }),
      ).toBeVisible();
    });
  });

  test.describe("権限チェック", () => {
    test("一般メンバーにはイベント作成ボタンが表示されない", async ({
      page,
    }) => {
      const suffix = uniqueSuffix();
      // オーナーでコミュニティ作成
      await registerAndLogin(page, suffix);
      await createCommunity(page, suffix);
      await logout(page);

      // 別ユーザーで参加
      const memberSuffix = `member${suffix}`;
      await page.goto("/register");
      await page.getByLabel("名前").fill(`メンバー${memberSuffix}`);
      await page
        .getByLabel("メールアドレス")
        .fill(`event-member${suffix}@example.com`);
      await page.getByLabel("パスワード").fill("password123");
      await page.getByRole("button", { name: "登録" }).click();
      await expect(page).toHaveURL("/");

      // コミュニティ一覧からコミュニティを見つけてクリック
      const communityName = `イベントテスト${suffix}`;
      await page
        .getByRole("heading", { name: communityName, level: 2, exact: true })
        .click();
      await expect(
        page.getByRole("heading", { name: communityName }),
      ).toBeVisible();

      // 参加する
      await page.getByRole("button", { name: "参加する" }).click();

      // イベント作成ボタンが表示されないことを確認
      await expect(
        page.getByRole("button", { name: "イベント作成" }),
      ).not.toBeVisible();
    });
  });
});
