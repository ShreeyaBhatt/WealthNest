import { Navigate, Route, Routes } from "react-router-dom";
import { ToastProvider } from "./components/Toast";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Family from "./pages/Family";
import Investments from "./pages/Investments";
import AIInsights from "./pages/AIInsights";
import UploadStatement from "./pages/UploadStatement";

function Protected({ children }) {
  return localStorage.getItem("wealthnest_token") ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route element={<Protected><Layout /></Protected>}>
          <Route index element={<Dashboard />} />
          <Route path="/family" element={<Family />} />
          <Route path="/investments" element={<Investments />} />
          <Route path="/upload" element={<UploadStatement />} />
          <Route path="/insights" element={<AIInsights />} />
        </Route>
      </Routes>
    </ToastProvider>
  );
}
