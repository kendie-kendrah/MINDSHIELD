import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import useStore from "@/store/useStore";
import Onboarding from "@/pages/Onboarding";
import Dashboard from "@/pages/Dashboard";
import Chat from "@/pages/Chat";
import Forum from "@/pages/Forum";
import MoodTracker from "@/pages/MoodTracker";
import Appointments from "@/pages/Appointments";
import Resources from "@/pages/Resources";
import CounselorLogin from "@/pages/CounselorLogin";
import CounselorDashboard from "@/pages/CounselorDashboard";
import CounselorChat from "@/pages/CounselorChat";
import AdminLogin from "@/pages/AdminLogin";
import AdminDashboard from "@/pages/AdminDashboard";
import AdminManagement from "@/pages/AdminManagement";
import AdminModeration from "@/pages/AdminModeration";
import Layout from "@/components/Layout";
import CounselorLayout from "@/components/CounselorLayout";
import AdminLayout from "@/components/AdminLayout";
import "@/App.css";

function ProtectedRoute({ children }) {
  const isAuthenticated = useStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/" replace />;
  return children;
}

function CounselorProtectedRoute({ children }) {
  const isAuthenticated = useStore((s) => s.isAuthenticated);
  const role = useStore((s) => s.user?.role);
  if (!isAuthenticated || role !== "counselor") return <Navigate to="/counselor" replace />;
  return children;
}

function AdminProtectedRoute({ children }) {
  const isAuthenticated = useStore((s) => s.isAuthenticated);
  const role = useStore((s) => s.user?.role);
  if (!isAuthenticated || role !== "admin") return <Navigate to="/admin" replace />;
  return children;
}

function App() {
  return (
    <BrowserRouter>
      <div className="noise-overlay" />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#14221D',
            border: '1px solid #2A4036',
            color: '#F0F4F2',
          },
        }}
      />
      <Routes>
        <Route path="/" element={<Onboarding />} />
        <Route path="/dashboard" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
        <Route path="/chat" element={<ProtectedRoute><Layout><Chat /></Layout></ProtectedRoute>} />
        <Route path="/forum" element={<ProtectedRoute><Layout><Forum /></Layout></ProtectedRoute>} />
        <Route path="/mood" element={<ProtectedRoute><Layout><MoodTracker /></Layout></ProtectedRoute>} />
        <Route path="/appointments" element={<ProtectedRoute><Layout><Appointments /></Layout></ProtectedRoute>} />
        <Route path="/appointments/chat/:conversationId" element={<ProtectedRoute><Layout><CounselorChat /></Layout></ProtectedRoute>} />
        <Route path="/resources" element={<ProtectedRoute><Layout><Resources /></Layout></ProtectedRoute>} />
        {/* Counselor Routes */}
        <Route path="/counselor" element={<CounselorLogin />} />
        <Route path="/counselor/dashboard" element={<CounselorProtectedRoute><CounselorLayout><CounselorDashboard /></CounselorLayout></CounselorProtectedRoute>} />
        <Route path="/counselor/conversations" element={<CounselorProtectedRoute><CounselorLayout><CounselorDashboard /></CounselorLayout></CounselorProtectedRoute>} />
        <Route path="/counselor/chat/:conversationId" element={<CounselorProtectedRoute><CounselorLayout><CounselorChat /></CounselorLayout></CounselorProtectedRoute>} />
        {/* Admin Routes */}
        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminProtectedRoute><AdminLayout><AdminDashboard /></AdminLayout></AdminProtectedRoute>} />
        <Route path="/admin/management" element={<AdminProtectedRoute><AdminLayout><AdminManagement /></AdminLayout></AdminProtectedRoute>} />
        <Route path="/admin/moderation" element={<AdminProtectedRoute><AdminLayout><AdminModeration /></AdminLayout></AdminProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
