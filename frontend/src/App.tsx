import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AppShell from "./layout/AppShell";
import LandingPage from "./pages/LandingPage";
import DashboardPage from "./pages/DashboardPage";
import NewInvestigationPage from "./pages/NewInvestigationPage";
import QuickScanPage from "./pages/QuickScanPage";
import ForensicWorkspacePage from "./pages/ForensicWorkspacePage";
import ReportPage from "./pages/ReportPage";
import InvestigationsPage from "./pages/InvestigationsPage";
import EvidenceExplorerPage from "./pages/EvidenceExplorerPage";
import MethodologyPage from "./pages/MethodologyPage";
import AboutPage from "./pages/AboutPage";
import ComparePage from "./pages/ComparePage";
import SettingsPage from "./pages/SettingsPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />

        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/investigate" element={<NewInvestigationPage />} />
          <Route path="/investigate/quick/:id" element={<QuickScanPage />} />
          <Route path="/investigate/forensic/:id" element={<ForensicWorkspacePage />} />
          <Route path="/report/:id" element={<ReportPage />} />
          <Route path="/investigations" element={<InvestigationsPage />} />
          <Route path="/evidence" element={<EvidenceExplorerPage />} />
          <Route path="/evidence/:id" element={<EvidenceExplorerPage />} />
          <Route path="/methodology" element={<MethodologyPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/compare" element={<ComparePage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
