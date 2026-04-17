import { type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/hooks/useAuth";

type LayoutProps = {
  children: ReactNode;
};

export const Layout = ({ children }: LayoutProps) => {
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="text-xl font-bold text-blue-600">
              Meetup
            </Link>
            <nav className="flex gap-4">
              <Link to="/" className="text-gray-600 hover:text-gray-900">
                コミュニティ一覧
              </Link>
              <Link to="/events" className="text-gray-600 hover:text-gray-900">
                イベント
              </Link>
              {isAuthenticated && (
                <>
                  <Link
                    to="/my-communities"
                    className="text-gray-600 hover:text-gray-900"
                  >
                    マイコミュニティ
                  </Link>
                  <Link
                    to="/my/participations"
                    className="text-gray-600 hover:text-gray-900"
                  >
                    参加履歴
                  </Link>
                  <Link
                    to="/communities/new"
                    className="text-gray-600 hover:text-gray-900"
                  >
                    コミュニティ作成
                  </Link>
                </>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <span className="text-sm text-gray-600">{user?.name}</span>
                <button
                  onClick={logout}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  ログアウト
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  ログイン
                </Link>
                <Link
                  to="/register"
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  新規登録
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
    </div>
  );
};
