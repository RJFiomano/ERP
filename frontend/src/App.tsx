import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { AuthProvider } from './contexts/AuthContext';
import { PermissionsProvider } from './contexts/PermissionsContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout/Layout';

// Auth Pages
import { Login } from './pages/auth/Login';
import { ForgotPassword } from './pages/auth/ForgotPassword';
import { ResetPassword } from './pages/auth/ResetPassword';

// Main Pages
import { Dashboard } from './pages/Dashboard';
import { Clients } from './pages/Clients';
import { Suppliers } from './pages/Suppliers';
import { Pessoas } from './pages/Pessoas';
import { Categories } from './pages/Categories';
import { Products } from './pages/Products';
import { Sales } from './pages/Sales';
import { AccountsReceivable } from './pages/AccountsReceivable';
import { AccountsPayable } from './pages/AccountsPayable';
import { PurchaseAccountsPayable } from './pages/PurchaseAccountsPayable';
import { Inventory } from './pages/Inventory';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import Roles from './pages/Roles';
import Users from './pages/Users';
import Profile from './pages/Profile';
import { PurchaseOrders } from './pages/PurchaseOrders';
import { StockEntries } from './pages/StockEntries';

// Theme is now handled by ThemeProvider context

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <PermissionsProvider>
            <Router>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              
              {/* Protected Routes */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Navigate to="/dashboard" replace />
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Dashboard />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/pessoas"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Pessoas />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/clients"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Clients />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/suppliers"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Suppliers />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/categories"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Categories />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/products"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Products />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/sales"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Sales />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/accounts-receivable"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <AccountsReceivable />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/accounts-payable"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <AccountsPayable />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/inventory"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Inventory />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/reports"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Reports />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Settings />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/roles"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Roles />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/users"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Users />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Profile />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/purchase-orders"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <PurchaseOrders />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/stock-entries"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <StockEntries />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/purchase-accounts-payable"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <PurchaseAccountsPayable />
                    </Layout>
                  </ProtectedRoute>
                }
              />
            </Routes>
            </Router>
          </PermissionsProvider>
        </AuthProvider>
        
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="auto"
        />
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;