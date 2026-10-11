import { useEffect } from "react";
import { HashRouter, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { AppLayout } from "./AppLayout";
import { CallReviewPage } from "./pages/CallReviewPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { DashboardPage } from "./pages/DashboardPage";
import { LiveCallsPage } from "./pages/live/LiveCallsPage";
import { KnowledgeBasePage } from "./pages/KnowledgeBasePage";

function DemoNavigationBridge() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.source !== window.parent) return;
      if (event.data && event.data.type === "CLARA_NAVIGATE" && typeof event.data.route === "string") {
        const target = event.data.route;
        if (location.pathname !== target) {
          navigate(target);
        }
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [navigate, location.pathname]);

  useEffect(() => {
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: "DEMO_ROUTE_CHANGED", route: location.pathname }, "*");
      }
    } catch (_) {}
  }, [location.pathname]);

  return null;
}

export default function App() {
  return (
    <HashRouter>
      <DemoNavigationBridge />
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="dashboard" element={<Navigate to="/" replace />} />
          <Route path="live" element={<LiveCallsPage />} />
          <Route path="knowledge" element={<KnowledgeBasePage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="conversations/:id" element={<CallReviewPage />} />
          <Route path="login" element={<Navigate to="/" replace />} />
          <Route path="signup" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
