import React from 'react'
import { X } from 'lucide-react'

const Modal = ({ isOpen, onClose, title, children, zIndex = 1000 }) => {
    if (!isOpen) return null

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(5, 12, 28, 0.8)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            zIndex: zIndex,
            padding: '20px',
            paddingTop: '80px'
        }}>
            <div className="glass-panel animate-fade-in" style={{
                width: '100%',
                maxWidth: '500px',
                background: '#0A1A3A',
                maxHeight: '90vh',
                overflowY: 'auto'
            }}>
                <div style={{
                    padding: '20px 24px',
                    borderBottom: '1px solid var(--border-color)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <h3 style={{ margin: 0, color: 'white' }}>{title}</h3>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--color-text-muted)',
                            cursor: 'pointer'
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
