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
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: zIndex,
            padding: '10px' // Reduced padding for mobile
        }}>
            <div className="glass-panel animate-fade-in" style={{
                width: '100%',
                maxWidth: '600px',
                background: '#0A1A3A',
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                borderRadius: '16px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}>
                <div style={{
                    padding: '16px 20px',
                    borderBottom: '1px solid var(--border-color)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: '#0A1A3A',
                    borderTopLeftRadius: '16px',
                    borderTopRightRadius: '16px',
                    zIndex: 10,
                    flexShrink: 0
                }}>
                    <h3 style={{ margin: 0, color: 'white', fontSize: '1.25rem' }}>{title}</h3>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--color-text-muted)',
                            cursor: 'pointer',
                            padding: '5px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <X size={24} />
                    </button>
                </div>

                <div style={{
                    padding: '20px',
                    overflowY: 'auto',
                    overscrollBehavior: 'contain'
                }}>
                    {children}
                </div>
            </div>
        </div>
    )
}

export default Modal
