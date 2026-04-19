import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./auth/contexts/AuthContext";
import { Layout } from "./components/Layout";
import { LoginPage } from "./auth/pages/LoginPage";
import { RegisterPage } from "./auth/pages/RegisterPage";
import { CommunityListPage } from "./community/pages/CommunityListPage";
import { CommunityDetailPage } from "./community/pages/CommunityDetailPage";
import { CommunityCreatePage } from "./community/pages/CommunityCreatePage";
import { MyCommunitiesPage } from "./community/pages/MyCommunitiesPage";
import { EventCreatePage } from "./community/pages/EventCreatePage";

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<CommunityListPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/communities/new" element={<CommunityCreatePage />} />
            <Route
              path="/communities/:id/events/new"
              element={<EventCreatePage />}
            />
            <Route path="/communities/:id" element={<CommunityDetailPage />} />
            <Route path="/my-communities" element={<MyCommunitiesPage />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </AuthProvider>
  );
}
