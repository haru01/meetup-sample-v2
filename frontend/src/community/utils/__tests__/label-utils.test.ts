import { describe, it, expect } from "vitest";
import type { Category, Community, Visibility } from "../../types";
import {
  CATEGORIES,
  getCategoryLabel,
  getVisibilityLabel,
  filterCommunitiesByCategory,
} from "../label-utils";

describe("label-utils", () => {
  describe("CATEGORIES", () => {
    it("すべてのカテゴリ値を含む", () => {
      expect(CATEGORIES).toEqual(["TECH", "BUSINESS", "HOBBY"]);
    });
  });

  describe("getCategoryLabel", () => {
    it.each<[Category, string]>([
      ["TECH", "テクノロジー"],
      ["BUSINESS", "ビジネス"],
      ["HOBBY", "趣味"],
    ])("%s のラベルは「%s」を返す", (category, expected) => {
      expect(getCategoryLabel(category)).toBe(expected);
    });
  });

  describe("getVisibilityLabel", () => {
    it.each<[Visibility, string]>([
      ["PUBLIC", "公開"],
      ["PRIVATE", "非公開"],
    ])("%s のラベルは「%s」を返す", (visibility, expected) => {
      expect(getVisibilityLabel(visibility)).toBe(expected);
    });
  });

  describe("filterCommunitiesByCategory", () => {
    const communities: Community[] = [
      {
        id: "1",
        name: "Tech Community",
        description: "Tech desc",
        category: "TECH",
        visibility: "PUBLIC",
        createdAt: "2024-01-01",
        updatedAt: "2024-01-01",
      },
      {
        id: "2",
        name: "Business Community",
        description: "Biz desc",
        category: "BUSINESS",
        visibility: "PRIVATE",
        createdAt: "2024-01-01",
        updatedAt: "2024-01-01",
      },
      {
        id: "3",
        name: "Hobby Community",
        description: "Hobby desc",
        category: "HOBBY",
        visibility: "PUBLIC",
        createdAt: "2024-01-01",
        updatedAt: "2024-01-01",
      },
    ];

    it("空文字の場合はすべてのコミュニティを返す", () => {
      const result = filterCommunitiesByCategory(communities, "");
      expect(result).toHaveLength(3);
    });

    it("TECHでフィルターすると該当コミュニティのみ返す", () => {
      const result = filterCommunitiesByCategory(communities, "TECH");
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Tech Community");
    });

    it("BUSINESSでフィルターすると該当コミュニティのみ返す", () => {
      const result = filterCommunitiesByCategory(communities, "BUSINESS");
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Business Community");
    });

    it("該当なしの場合は空配列を返す", () => {
      const result = filterCommunitiesByCategory([], "TECH");
      expect(result).toHaveLength(0);
    });

    it("元の配列を変更しない", () => {
      const original = [...communities];
      filterCommunitiesByCategory(communities, "TECH");
      expect(communities).toEqual(original);
    });
  });
});
