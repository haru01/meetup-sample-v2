import { useState, type FormEvent } from "react";
import { Input } from "../../components/Input";
import { Button } from "../../components/Button";
import { ErrorAlert } from "../../components/ErrorAlert";
import { CATEGORIES, getCategoryLabel } from "../utils/label-utils";
import type { Category, CreateCommunityRequest, Visibility } from "../types";

type CommunityCreateFormProps = {
  onSubmit: (data: CreateCommunityRequest) => void;
  loading: boolean;
  error: string | null;
};

export const CommunityCreateForm = ({
  onSubmit,
  loading,
  error,
}: CommunityCreateFormProps) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Category>("TECH");
  const [visibility, setVisibility] = useState<Visibility>("PUBLIC");
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!name || !description) {
      setValidationError("名前と説明を入力してください");
      return;
    }

    onSubmit({ name, description, category, visibility });
  };

  return (
    <>
      <ErrorAlert message={validationError || error} />
      <form onSubmit={handleSubmit}>
        <Input
          label="コミュニティ名"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div className="mb-4">
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            説明
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={4}
          />
        </div>
        <div className="mb-4">
          <label
            htmlFor="category"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            カテゴリ
          </label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {getCategoryLabel(cat)}
              </option>
            ))}
          </select>
        </div>
        <div className="mb-6">
          <label
            htmlFor="visibility"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            公開設定
          </label>
          <select
            id="visibility"
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as Visibility)}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="PUBLIC">公開</option>
            <option value="PRIVATE">非公開</option>
          </select>
        </div>
        <Button type="submit" loading={loading} className="w-full">
          作成
        </Button>
      </form>
    </>
  );
};
