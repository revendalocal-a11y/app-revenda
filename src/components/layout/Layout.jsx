import React, { useState } from 'react'
import Sidebar from './Sidebar'
import { Outlet } from 'react-router-dom'
import { Menu } from 'lucide-react'

const Layout = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false)

    return (
        <div style={{ display: 'flex', minHeight: '100vh', position: 'relative' }}>
            {/* Hamburger Button for Mobile */}
            <div className="mobile-only" style={{ position: 'fixed', top: '15px', right: '15px', zIndex: 2000 }}>
                <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="glass-panel"
                    style={{
                        padding: '10px',
                        border: 'none',
                        color: 'white',
                        background: 'rgba(10, 26, 58, 0.9)',
                        display: 'flex',
                        alignItems: 'center',
                        cursor: 'pointer'
                    }}
                >
                    <Menu size={24} />
                </button>
            </div>

            {/* Sidebar with mobile toggle logic */}
            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            {/* Main Content Area */}
            <main style={{
                flex: 1,
                padding: '20px',
                marginLeft: 'var(--sidebar-width)',
                width: 'calc(100% - var(--sidebar-width))',
                minHeight: '100vh',
                transition: 'margin-left 0.3s ease, width 0.3s ease'
            }}>
                <div className="animate-fade-in" style={{ maxWidth: '1200px', margin: '0 auto', paddingTop: '20px' }}>
                    <Outlet />
                </div>
            </main>

            {/* Overlay for mobile when sidebar is open */}
            {sidebarOpen && (
                <div
                    className="mobile-only"
                    onClick={() => setSidebarOpen(false)}
                    style={{
                        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1099
                    }}
                />
            )}
        </div>
    )
}

export default Layout
