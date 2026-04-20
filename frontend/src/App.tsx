import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { Toaster } from "@/components/ui/toaster"
import LandingPage from "./pages/LandingPage"
import Dashboard from "./pages/Dashboard"
import Login from "./pages/Login"
import ProtectedRoute from "./components/ProtectedRoute"
import ShipperRegisterPage from "./pages/shippers/ShipperRegisterPage"

import PaquetesListPage from "./pages/paquetes/PaquetesListPage"
import PaqueteNewPage from "./pages/paquetes/PaqueteNewPage"
import PaqueteViewPage from "./pages/paquetes/PaqueteViewPage"
import PaqueteEditPage from "./pages/paquetes/PaqueteEditPage"

import ShippersListPage from "./pages/shippers/ShippersListPage"
import ShipperNewPage from "./pages/shippers/ShipperNewPage"
import ShipperViewPage from "./pages/shippers/ShipperViewPage"
import ShipperEditPage from "./pages/shippers/ShipperEditPage"

import ConsolidadosListPage from "./pages/consolidados/ConsolidadosListPage"
import ConsolidadoNewPage from "./pages/consolidados/ConsolidadoNewPage"
import ConsolidadoViewPage from "./pages/consolidados/ConsolidadoViewPage"

import RolesListPage from "./pages/roles/RolesListPage"
import RolNewPage from "./pages/roles/RolNewPage"
import RolViewPage from "./pages/roles/RolViewPage"
import RolEditPage from "./pages/roles/RolEditPage"

import UsuariosListPage from "./pages/usuarios/UsuariosListPage"
import UsuarioNewPage from "./pages/usuarios/UsuarioNewPage"
import UsuarioViewPage from "./pages/usuarios/UsuarioViewPage"
import UsuarioEditPage from "./pages/usuarios/UsuarioEditPage"

import PermisosListPage from "./pages/permisos/PermisosListPage"
import PermisoNewPage from "./pages/permisos/PermisoNewPage"
import PermisoViewPage from "./pages/permisos/PermisoViewPage"
import PermisoEditPage from "./pages/permisos/PermisoEditPage"

import SolicitudesShippersPage from "./pages/solicitudes/SolicitudesShippersPage"

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-background text-foreground">
        <Toaster />
        <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/registro-shipper" element={<ShipperRegisterPage />} />
          <Route path="/" element={<LandingPage />} />
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/paquetes" element={<ProtectedRoute allowedPermissions={["paquetes.read"]}><PaquetesListPage /></ProtectedRoute>} />
          <Route path="/paquetes/new" element={<ProtectedRoute allowedPermissions={["paquetes.create_minimo"]}><PaqueteNewPage /></ProtectedRoute>} />
          <Route path="/paquetes/:id" element={<ProtectedRoute allowedPermissions={["paquetes.read"]}><PaqueteViewPage /></ProtectedRoute>} />
          <Route path="/paquetes/:id/edit" element={<ProtectedRoute allowedPermissions={["paquetes.update"]}><PaqueteEditPage /></ProtectedRoute>} />
          <Route path="/roles" element={<ProtectedRoute allowedRoles={["ADMIN"]}><RolesListPage /></ProtectedRoute>} />
          <Route path="/roles/new" element={<ProtectedRoute allowedRoles={["ADMIN"]}><RolNewPage /></ProtectedRoute>} />
          <Route path="/roles/:id" element={<ProtectedRoute allowedRoles={["ADMIN"]}><RolViewPage /></ProtectedRoute>} />
          <Route path="/roles/:id/edit" element={<ProtectedRoute allowedRoles={["ADMIN"]}><RolEditPage /></ProtectedRoute>} />

          <Route path="/usuarios" element={<ProtectedRoute allowedRoles={["ADMIN"]}><UsuariosListPage /></ProtectedRoute>} />
          <Route path="/usuarios/new" element={<ProtectedRoute allowedRoles={["ADMIN"]}><UsuarioNewPage /></ProtectedRoute>} />
          <Route path="/usuarios/:id" element={<ProtectedRoute allowedRoles={["ADMIN"]}><UsuarioViewPage /></ProtectedRoute>} />
          <Route path="/usuarios/:id/edit" element={<ProtectedRoute allowedRoles={["ADMIN"]}><UsuarioEditPage /></ProtectedRoute>} />

          <Route path="/permisos" element={<ProtectedRoute allowedRoles={["ADMIN"]}><PermisosListPage /></ProtectedRoute>} />
          <Route path="/permisos/new" element={<ProtectedRoute allowedRoles={["ADMIN"]}><PermisoNewPage /></ProtectedRoute>} />
          <Route path="/permisos/:id" element={<ProtectedRoute allowedRoles={["ADMIN"]}><PermisoViewPage /></ProtectedRoute>} />
          <Route path="/permisos/:id/edit" element={<ProtectedRoute allowedRoles={["ADMIN"]}><PermisoEditPage /></ProtectedRoute>} />

          <Route path="/shippers" element={<ProtectedRoute allowedPermissions={["shippers.read"]}><ShippersListPage /></ProtectedRoute>} />
          <Route path="/shippers/new" element={<ProtectedRoute allowedPermissions={["shippers.create"]}><ShipperNewPage /></ProtectedRoute>} />
          <Route path="/shippers/:id" element={<ProtectedRoute allowedPermissions={["shippers.read"]}><ShipperViewPage /></ProtectedRoute>} />
          <Route path="/shippers/:id/edit" element={<ProtectedRoute allowedPermissions={["shippers.update"]}><ShipperEditPage /></ProtectedRoute>} />
          <Route path="/consolidados" element={<ProtectedRoute allowedPermissions={["consolidados.read"]}><ConsolidadosListPage /></ProtectedRoute>} />
          <Route path="/consolidados/new" element={<ProtectedRoute allowedPermissions={["consolidados.create"]}><ConsolidadoNewPage /></ProtectedRoute>} />
          <Route path="/consolidados/:id" element={<ProtectedRoute allowedPermissions={["consolidados.read"]}><ConsolidadoViewPage /></ProtectedRoute>} />
          <Route path="/solicitudes-shippers" element={<ProtectedRoute allowedPermissions={["shippers.aprobar"]}><SolicitudesShippersPage /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </div>
    </QueryClientProvider>
  )
}

export default App
