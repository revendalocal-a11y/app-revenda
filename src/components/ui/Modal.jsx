import React, { useEffect } from 'react'
import { X } from 'lucide-react'

// Optimized Modal for universal desktop/mobile responsiveness
const Modal = ({ isOpen, onClose, title, children, zIndex = 1100 }) => {
    // Lock body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = 'unset'
        }
        return () => { document.body.style.overflow = 'unset' }
    }, [isOpen])

    if (!isOpen) return null

    return (
        <div
            className="modal-overlay"
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(5, 12, 28, 0.90)',
                backdropFilter: 'blur(5px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: zIndex,
                padding: '10px' // Safe area from edges
            }}
        >
            <div
                className="glass-panel animate-fade-in"
                style={{
                    width: '100%',
                    maxWidth: '600px',
                    backgroundColor: '#0A1A3A',
                    maxHeight: '90vh', // Critical for small screens
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    borderRadius: '16px',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                    border: '1px solid var(--border-color)'
                }}
            >
                {/* Fixed Header */}
                <div style={{
                    padding: '16px 20px',
                    borderBottom: '1px solid var(--border-color)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: '#0A1A3A',
                    borderTopLeftRadius: '16px',
                    borderTopRightRadius: '16px',
                    zIndex: 10,
                    flexShrink: 0 // Prevent header from shrinking
                }}>
                    <h3 style={{ margin: 0, color: 'white', fontSize: '1.25rem', fontWeight: 600 }}>{title}</h3>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--color-text-muted)',
                            cursor: 'pointer',
                            padding: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '50%',
                            transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
                        onMouseLeave={(e) => e.target.style.background = 'transparent'}
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Scrollable Content Body */}
                <div style={{
                    padding: '20px',
                    overflowY: 'auto',
                    overscrollBehavior: 'contain', // Prevent body scroll
                    flex: 1
                }}>
                    {children}
                </div>
            </div>
        </div>
    )
}

export default Modal
