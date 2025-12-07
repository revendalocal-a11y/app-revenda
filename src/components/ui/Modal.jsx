import React from 'react'
import { X } from 'lucide-react'

const Modal = ({ isOpen, onClose, title, children, zIndex = 1100 }) => {
    if (!isOpen) return null

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(5, 12, 28, 0.85)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center', // Center vertically
            justifyContent: 'center', // Center horizontally
            zIndex: zIndex,
            padding: '20px'
        }}>
            <div className="glass-panel animate-fade-in" style={{
                width: '100%',
                maxWidth: '600px', // Slight increase for better spacing
                background: '#0A1A3A',
                maxHeight: '90vh', // Ensure it doesn't overflow screen vertically
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative'
            }}>
                <div style={{
                    padding: '20px 24px',
                    borderBottom: '1px solid var(--border-color)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    position: 'sticky',
                    top: 0,
                    background: '#0A1A3A',
                    zIndex: 10
                }}>
                    <h3 style={{ margin: 0, color: 'white', fontSize: '1.25rem' }}>{title}</h3>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--color-text-muted)',
                            cursor: 'pointer',
                            padding: '5px'
                        }}
                    >
                        <X size={24} />
                    </button>
                </div>
                <div style={{ padding: '24px' }}>
                    {children}
                </div>
            </div>
        </div>
    )
}

export default Modal
