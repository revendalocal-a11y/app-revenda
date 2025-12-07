import React from 'react'
import Sidebar from './Sidebar'
import { Outlet } from 'react-router-dom'

const Layout = () => {
    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            <Sidebar />
            <main style={{
                marginLeft: '300px',
                padding: '40px',
                width: 'calc(100% - 300px)',
                minHeight: '100vh'
            }}>
                <div className="animate-fade-in" style={{ maxWidth: '1200px', margin: '0 auto' }}>
                    <Outlet />
                </div>
            </main>
        </div>
    )
}

export default Layout
