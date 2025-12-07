import React, { useEffect } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import {
    LayoutDashboard,
    Users,
    Package,
    ShoppingCart,
    Kanban,
    FileText,
    LogOut,
    TrendingDown,
    X
} from 'lucide-react'

const Sidebar = ({ isOpen, onClose }) => {
    const { signOut } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()

    // Auto-close sidebar on route change for mobile users
    useEffect(() => {
        if (window.innerWidth < 1024 && onClose) {
            onClose()
        }
    }, [location])

    const handleLogout = async () => {
        try {
            await signOut()
            navigate('/login')
        } catch (error) {
            console.error('Error logging out:', error)
        }
    }

    const navItems = [
        { name: 'Dashboard', path: '/', icon: LayoutDashboard },
        { name: 'Clientes', path: '/clientes', icon: Users },
        { name: 'Produtos', path: '/produtos', icon: Package },
        { name: 'Pedidos', path: '/pedidos', icon: ShoppingCart },
        { name: 'Despesas', path: '/despesas', icon: TrendingDown },
        { name: 'Kanban', path: '/kanban', icon: Kanban },
        { name: 'Relatórios', path: '/relatorios', icon: FileText },
    ]

    return (
        <aside
            className={`sidebar glass-panel ${isOpen ? 'mobile-open' : ''}`}
            style={{
                display: 'flex',
                flexDirection: 'column',
                padding: '30px 20px',
                // other styles are handled by CSS class .sidebar
            }}
        >
            <div style={{ marginBottom: '40px', paddingLeft: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1 style={{ fontSize: '1.5rem', margin: 0 }} className="text-gradient">RevendaLocal</h1>
                <button
                    className="mobile-only"
                    onClick={onClose}
                    style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}
                >
                    <X size={24} />
                </button>
            </div>

            <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                        style={({ isActive }) => ({
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '12px 16px',
                            borderRadius: '12px',
                            color: isActive ? '#0A1A3A' : '#A0AEC0',
                            background: isActive ? '#1EDD88' : 'transparent',
                            textDecoration: 'none',
                            fontWeight: 500,
                            transition: 'all 0.3s ease'
                        })}
                    >
                        <item.icon size={20} />
                        {item.name}
                    </NavLink>
                ))}
            </nav>

            <button
                onClick={handleLogout}
                className="btn-danger"
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    width: '100%',
                    cursor: 'pointer',
                    marginTop: 'auto'
                }}
            >
                <LogOut size={20} />
                Sair
            </button>
        </aside>
    )
}

export default Sidebar
