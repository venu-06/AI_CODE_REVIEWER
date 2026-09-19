import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/AppLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyOtp from './pages/VerifyOtp';
import SetPassword from './pages/SetPassword';
import DashboardHome from './pages/DashboardHome';
import HistoryWorkspace from './pages/HistoryWorkspace';
import CompilerWorkspace from './pages/CompilerWorkspace';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify" element={<VerifyOtp />} />
        <Route path="/set-password" element={<SetPassword />} />

        {/* Authenticated Dashboard Route */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <AppLayout>
                <DashboardHome />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        {/* Authenticated Compiler Workspace Route */}
        <Route
          path="/compiler"
          element={
            <ProtectedRoute>
              <AppLayout>
                <CompilerWorkspace />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        {/* Authenticated History 3-Column Workspace Routes */}
        <Route
          path="/history"
          element={
            <ProtectedRoute>
              <AppLayout>
                <HistoryWorkspace />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/history/:reviewId"
          element={
            <ProtectedRoute>
              <AppLayout>
                <HistoryWorkspace />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
