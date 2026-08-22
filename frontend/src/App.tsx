import { Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Pos from "./pages/Pos";
import Orders from "./pages/Orders";
import Tables from "./pages/Tables";
import Reservations from "./pages/Reservations";
import Menu from "./pages/Menu";
import Inventory from "./pages/Inventory";
import Customers from "./pages/Customers";
import Staff from "./pages/Staff";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/pos" element={<Pos />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/tables" element={<Tables />} />
          <Route path="/reservations" element={<Reservations />} />
          <Route path="/customers" element={<Customers />} />

          <Route element={<ProtectedRoute roles={["ADMIN", "MANAGER"]} />}>
            <Route path="/menu" element={<Menu />} />
            <Route path="/staff" element={<Staff />} />
          </Route>

          <Route element={<ProtectedRoute roles={["ADMIN", "MANAGER", "CHEF"]} />}>
            <Route path="/inventory" element={<Inventory />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  );
}
