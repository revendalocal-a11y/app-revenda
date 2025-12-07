import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { format } from 'date-fns'

const Kanban = () => {
    const { user } = useAuth()
    const [cards, setCards] = useState([])
    const [loading, setLoading] = useState(true)

    const columns = ['Pedido feito', 'Pedido em rota de entrega', 'Pedido pago']

    useEffect(() => {
        if (user) fetchKanban()
    }, [user])

    const fetchKanban = async () => {
        try {
            const { data, error } = await supabase
                .from('kanban_cards')
                .select(`
          *,
          pedidos (
            id,
            valor_total,
            status,
            clientes (nome)
          )
        `)
                .order('criado_em', { ascending: false })

            if (error) throw error
            setCards(data)
        } catch (error) {
            console.error('Error fetching kanban:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleDragStart = (e, cardId) => {
        e.dataTransfer.setData('cardId', cardId)
    }

    const handleDragOver = (e) => {
        e.preventDefault()
    }

    const handleDrop = async (e, targetColumn) => {
        e.preventDefault()
        const cardId = e.dataTransfer.getData('cardId')
        const card = cards.find(c => c.id === cardId)

        if (card.coluna === targetColumn) return

        // Optimistic Update
        const updatedCards = cards.map(c =>
            c.id === cardId ? { ...c, coluna: targetColumn } : c
        )
        setCards(updatedCards)

        try {
            // 1. Update Kanban Card
            const { error: cardError } = await supabase
                .from('kanban_cards')
                .update({ coluna: targetColumn })
                .eq('id', cardId)

            if (cardError) throw cardError

            // 2. Update Order Status
            const { error: orderError } = await supabase
                .from('pedidos')
                .update({ status: targetColumn })
                .eq('id', card.pedido_id) // card.pedido_id is the FK

            if (orderError) throw orderError

        } catch (error) {
            console.error('Error updating kanban:', error)
            fetchKanban() // Revert on error
        }
    }

    const getColumnColor = (col) => {
        switch (col) {
            case 'Pedido feito': return '#A0AEC0'
            case 'Pedido em rota de entrega': return '#3498db'
            case 'Pedido pago': return '#1EDD88'
            default: return '#fff'
        }
    }

    return (
        <div style={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: '20px' }}>
                <h1 className="text-gradient">Kanban de Pedidos</h1>
                <p style={{ color: 'var(--color-text-muted)' }}>Gerencie o fluxo de seus pedidos</p>
            </div>

            <div style={{ display: 'flex', gap: '20px', flex: 1, overflowX: 'auto', paddingBottom: '20px' }}>
                {columns.map(column => (
                    <div
                        key={column}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, column)}
                        style={{
                            flex: 1,
                            minWidth: '300px',
                            background: 'rgba(255, 255, 255, 0.02)',
                            borderRadius: '16px',
                            padding: '16px',
                            display: 'flex',
                            flexDirection: 'column',
                            border: `1px solid ${getColumnColor(column)}40`
                        }}
                    >
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            marginBottom: '20px',
                            paddingBottom: '10px',
                            borderBottom: '1px solid var(--border-color)'
                        }}>
                            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: getColumnColor(column) }} />
                            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{column}</h3>
                            <span style={{ marginLeft: 'auto', background: 'var(--bg-input)', padding: '2px 8px', borderRadius: '8px', fontSize: '0.8rem' }}>
                                {cards.filter(c => c.coluna === column).length}
                            </span>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {cards
                                .filter(c => c.coluna === column)
                                // Filter out bad data if any
                                .filter(c => c.pedidos)
                                .map(card => (
                                    <div
                                        key={card.id}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, card.id)}
                                        className="glass-panel"
                                        style={{
                                            padding: '16px',
                                            cursor: 'grab',
                                            borderLeft: `4px solid ${getColumnColor(column)}`,
                                            transition: 'transform 0.2s',
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                            <span style={{ fontWeight: 'bold' }}>{card.pedidos.clientes?.nome || 'Cliente'}</span>
                                            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                                                #{card.pedido_id.slice(0, 6)}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ color: '#1EDD88', fontWeight: 'bold' }}>
                                                R$ {card.pedidos.valor_total.toFixed(2)}
                                            </span>
                                        </div>
                                        <div style={{ marginTop: '10px', fontSize: '0.75rem', color: 'var(--color-text-muted)', textAlign: 'right' }}>
                                            {format(new Date(card.criado_em), 'dd/MM HH:mm')}
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default Kanban
