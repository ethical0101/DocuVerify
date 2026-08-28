import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import ProtectedRoute from "./auth/ProtectedRoute";
import AppShell from "./layout/AppShell";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
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
import EnterpriseDashboardPage from "./pages/enterprise/EnterpriseDashboardPage";
import DatasetsPage from "./pages/enterprise/DatasetsPage";
import TrainModelPage from "./pages/enterprise/TrainModelPage";
import ModelRegistryPage from "./pages/enterprise/ModelRegistryPage";
import UsersPage from "./pages/enterprise/UsersPage";
import AuditLogPage from "./pages/enterprise/AuditLogPage";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

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

            <Route path="/enterprise/dashboard" element={
              <ProtectedRoute requireRole="admin"><EnterpriseDashboardPage /></ProtectedRoute>
            } />
            <Route path="/enterprise/datasets" element={
              <ProtectedRoute requireRole="admin"><DatasetsPage /></ProtectedRoute>
            } />
            <Route path="/enterprise/training" element={
              <ProtectedRoute requireRole="admin"><TrainModelPage /></ProtectedRoute>
            } />
            <Route path="/enterprise/models" element={
              <ProtectedRoute requireRole="admin"><ModelRegistryPage /></ProtectedRoute>
            } />
            <Route path="/enterprise/users" element={
              <ProtectedRoute requireRole="admin"><UsersPage /></ProtectedRoute>
            } />
            <Route path="/enterprise/audit-log" element={
              <ProtectedRoute requireRole="admin"><AuditLogPage /></ProtectedRoute>
            } />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
