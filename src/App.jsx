import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import Layout from './components/layout/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Clients from './pages/Clients'
import Products from './pages/Products'
import Orders from './pages/Orders'
import Kanban from './pages/Kanban'
import Reports from './pages/Reports'
import Expenses from './pages/Expenses'

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth()

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Carregando...</div>

  return user ? children : <Navigate to="/login" />
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route path="/" element={
        <PrivateRoute>
          <Layout />
        </PrivateRoute>
      }>
        <Route index element={<Dashboard />} />
        <Route path="clientes" element={<Clients />} />
        <Route path="produtos" element={<Products />} />
        <Route path="pedidos" element={<Orders />} />
        <Route path="kanban" element={<Kanban />} />
        <Route path="despesas" element={<Expenses />} />
        <Route path="relatorios" element={<Reports />} />
      </Route>

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}

export default App
