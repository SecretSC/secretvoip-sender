import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import ProtectedRoute from "@/components/ProtectedRoute";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import ChangePassword from "./pages/ChangePassword";
import NotFound from "./pages/NotFound";

import CustomerOverview from "./pages/customer/Overview";
import SendSms from "./pages/customer/SendSms";
import RouteTester from "./pages/customer/RouteTester";
import RoutesAndRates from "./pages/customer/RoutesAndRates";
import SmsLogs from "./pages/customer/SmsLogs";
import Profile from "./pages/customer/Profile";

import AdminOverview from "./pages/admin/Overview";
import Customers from "./pages/admin/Customers";
import AuditLog from "./pages/admin/AuditLog";
import AdminSettings from "./pages/admin/Settings";

const queryClient = new QueryClient();
const basename = (import.meta.env.VITE_APP_BASE_PATH as string | undefined) || "/";

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner richColors theme="dark" position="top-right" />
      <AuthProvider>
        <BrowserRouter basename={basename === "/" ? undefined : basename}>
          <Routes>
            {/* Public */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/change-password" element={<ProtectedRoute><ChangePassword /></ProtectedRoute>} />

            {/* Customer */}
            <Route path="/app" element={<ProtectedRoute role="customer"><CustomerOverview /></ProtectedRoute>} />
            <Route path="/app/send" element={<ProtectedRoute role="customer"><SendSms /></ProtectedRoute>} />
            <Route path="/app/tester" element={<ProtectedRoute role="customer"><RouteTester /></ProtectedRoute>} />
            <Route path="/app/routes" element={<ProtectedRoute role="customer"><RoutesAndRates kind="customer" /></ProtectedRoute>} />
            <Route path="/app/logs" element={<ProtectedRoute role="customer"><SmsLogs kind="customer" /></ProtectedRoute>} />
            <Route path="/app/profile" element={<ProtectedRoute role="customer"><Profile /></ProtectedRoute>} />

            {/* Admin */}
            <Route path="/admin" element={<ProtectedRoute role="admin"><AdminOverview /></ProtectedRoute>} />
            <Route path="/admin/customers" element={<ProtectedRoute role="admin"><Customers /></ProtectedRoute>} />
            <Route path="/admin/routes" element={<ProtectedRoute role="admin"><RoutesAndRates kind="admin" /></ProtectedRoute>} />
            <Route path="/admin/logs" element={<ProtectedRoute role="admin"><SmsLogs kind="admin" /></ProtectedRoute>} />
            <Route path="/admin/audit" element={<ProtectedRoute role="admin"><AuditLog /></ProtectedRoute>} />
            <Route path="/admin/settings" element={<ProtectedRoute role="admin"><AdminSettings /></ProtectedRoute>} />

            <Route path="/dashboard" element={<Navigate to="/app" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
