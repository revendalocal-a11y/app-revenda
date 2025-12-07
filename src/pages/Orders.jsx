import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { Plus, Search, FileText, ShoppingCart, Truck, CheckCircle, Eye } from 'lucide-react'
import Modal from '../components/ui/Modal'
import jsPDF from 'jspdf'
import { format } from 'date-fns'

const Orders = () => {
    const { user } = useAuth()
    const [orders, setOrders] = useState([])
    const [clients, setClients] = useState([])
    const [products, setProducts] = useState([])
    const [loading, setLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)

    const [clientSearch, setClientSearch] = useState('')
    const [isClientModalOpen, setIsClientModalOpen] = useState(false)
    const [clientFormData, setClientFormData] = useState({
        nome: '', telefone: '', email: '',
        rua: '', numero: '', bairro: '',
        cidade: '', referencia: '', observacoes: ''
    })

    // New Order State
    const [newOrder, setNewOrder] = useState({
        cliente_id: '',
        status: 'Pedido feito',
        items: [] // { produto_id, nome, quantidade, preco_unitario }
    })

    // Item adding state
    const [selectedProduct, setSelectedProduct] = useState('')
    const [itemQty, setItemQty] = useState(1)

    useEffect(() => {
        if (user) {
            fetchOrders()
            fetchClients()
            fetchProducts()
        }
    }, [user])

    const fetchOrders = async () => {
        try {
            const { data, error } = await supabase
                .from('pedidos')
                .select(`
          *,
          clientes (nome, telefone, rua, numero, bairro, cidade, referencia, observacoes),
          pedido_itens (*)
        `)
                .order('criado_em', { ascending: false })
            if (error) throw error
            setOrders(data)
        } catch (error) {
            console.error('Error fetching orders:', error)
        } finally {
            setLoading(false)
        }
    }

    const fetchClients = async () => {
        const { data } = await supabase.from('clientes').select('id, nome')
        setClients(data || [])
    }

    const fetchProducts = async () => {
        const { data } = await supabase.from('produtos').select('*')
        setProducts(data || [])
    }

    const handleAddItem = () => {
        if (!selectedProduct) return
        const product = products.find(p => p.id === selectedProduct)

        // Check if item already exists
        const existingIndex = newOrder.items.findIndex(i => i.produto_id === selectedProduct)
        if (existingIndex >= 0) {
            const updatedItems = [...newOrder.items]
            updatedItems[existingIndex].quantidade += parseInt(itemQty)
            updatedItems[existingIndex].subtotal = updatedItems[existingIndex].quantidade * updatedItems[existingIndex].preco_unitario
            setNewOrder({ ...newOrder, items: updatedItems })
        } else {
            setNewOrder({
                ...newOrder,
                items: [...newOrder.items, {
                    produto_id: product.id,
                    produto_nome: product.nome,
                    quantidade: parseInt(itemQty),
                    preco_unitario: product.preco_venda,
                    subtotal: parseInt(itemQty) * product.preco_venda
                }]
            })
        }
        setSelectedProduct('')
        setItemQty(1)
    }

    const calculateTotal = () => {
        return newOrder.items.reduce((acc, item) => acc + item.subtotal, 0)
    }

    const handleSaveOrder = async () => {
        if (!newOrder.cliente_id || newOrder.items.length === 0) {
            alert('Selecione um cliente e adicione pelo menos um produto.')
            return
        }

        try {
            // 1. Create Order
            const total = calculateTotal()
            const { data: orderData, error: orderError } = await supabase
                .from('pedidos')
                .insert([{
                    usuario_id: user.id,
                    cliente_id: newOrder.cliente_id,
                    valor_total: total,
                    status: newOrder.status
                }])
                .select()
                .single()

            if (orderError) throw orderError

            // 2. Create Order Items
            const itemsToInsert = newOrder.items.map(item => ({
                pedido_id: orderData.id,
                produto_id: item.produto_id,
                produto_nome: item.produto_nome,
                quantidade: item.quantidade,
                preco_unitario: item.preco_unitario,
                subtotal: item.subtotal
            }))

            const { error: itemsError } = await supabase.from('pedido_itens').insert(itemsToInsert)
            if (itemsError) throw itemsError

            // 3. Create Kanban Card
            const { error: kanbanError } = await supabase
                .from('kanban_cards')
                .insert([{
                    usuario_id: user.id,
                    pedido_id: orderData.id,
                    coluna: newOrder.status,
                    posicao: 0 // Simplification, ideally calculate max pos
                }])

            if (kanbanError) throw kanbanError

            // Update Stock (Optional/Advanced: Trigger is better but client-side logic for now)
            // Loop through items and decrement stock
            for (const item of newOrder.items) {
                const product = products.find(p => p.id === item.produto_id)
                if (product) {
                    await supabase.from('produtos')
                        .update({ estoque: product.estoque - item.quantidade })
                        .eq('id', product.id)
                }
            }

            setIsModalOpen(false)
            fetchOrders()
            setNewOrder({ cliente_id: '', status: 'Pedido feito', items: [] })
        } catch (error) {
            console.error('Error creating order:', error)
            alert('Erro ao criar pedido: ' + error.message)
        }
    }

    const generateReceipt = (order) => {
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: [80, 250] // Increased height dynamically
        })

        // Helper for centered text
        const centerText = (text, y) => {
            doc.text(text, 40, y, { align: 'center' })
        }

        let y = 0

        // --- Header (Gray Background) ---
        doc.setFillColor(240, 240, 240) // Light gray
        doc.rect(0, 0, 80, 22, 'F')

        doc.setTextColor(20, 20, 20)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(14)
        centerText('REVENDA LOCAL', 8)

        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        centerText('Comprovante de Pedido', 14)
        doc.setFontSize(7)
        centerText(format(new Date(), 'dd/MM/yyyy HH:mm'), 19)

        y = 30

        // --- Order Info ---
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.text(`PEDIDO #${order.id.slice(0, 8).toUpperCase()}`, 5, y)
        doc.setFont('helvetica', 'normal')
        doc.text(format(new Date(order.criado_em), 'dd/MM/yyyy HH:mm'), 75, y, { align: 'right' })

        y += 4
        doc.setDrawColor(200, 200, 200)
        doc.line(5, y, 75, y)
        y += 5

        // --- Client Info ---
        const client = order.clientes || {}

        // Function to print label: value pair with wrapping
        const printField = (label, value) => {
            if (!value) return
            const fullText = `${label}: ${value}`

            doc.setFont('helvetica', 'bold')
            doc.text(`${label}:`, 5, y)

            const labelWidth = doc.getStringUnitWidth(`${label}:`) * doc.internal.getFontSize() / 2.83465
            doc.setFont('helvetica', 'normal')

            const valueLines = doc.splitTextToSize(value, 70 - labelWidth)
            doc.text(valueLines, 5 + labelWidth + 1, y)

            y += (4 * valueLines.length)
        }

        printField('Cliente', client.nome || 'Consumidor')
        printField('Telefone', client.telefone)
        if (client.rua) {
            printField('Endereço', `${client.rua}, ${client.numero || 'S/N'}`)
            printField('Bairro', client.bairro)
            printField('Cidade', client.cidade)
            printField('Ref', client.referencia)
        }
        if (client.observacoes) {
            printField('Obs', client.observacoes)
        }

        y += 2
        doc.line(5, y, 75, y)
        y += 5

        // --- Items Header ---
        doc.setFillColor(245, 245, 245)
        doc.rect(2, y - 3.5, 76, 6, 'F')

        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.text('ITEM', 4, y)
        doc.text('QTD', 50, y, { align: 'center' })
        doc.text('VALOR', 76, y, { align: 'right' })
        y += 5

        // --- Items List ---
        doc.setFont('helvetica', 'normal')
        order.pedido_itens.forEach(item => {
            const name = item.produto_nome
            const qty = `${item.quantidade}x`
            const subtotal = `R$${item.subtotal.toFixed(2)}`

            // Print Qty and Subtotal
            doc.text(qty, 50, y, { align: 'center' })
            doc.text(subtotal, 76, y, { align: 'right' })

            // Print Name (Wrapped)
            const splitName = doc.splitTextToSize(name, 42) // Max width for name
            doc.text(splitName, 4, y)

            const lineHeight = 4 * splitName.length
            y += Math.max(lineHeight, 4) + 1 // Add small spacing
        })

        y += 2
        doc.line(5, y, 75, y)
        y += 6

        // --- Totals ---
        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        doc.text('TOTAL A PAGAR', 5, y)
        doc.text(`R$ ${order.valor_total.toFixed(2)}`, 75, y, { align: 'right' })

        // --- Footer ---
        y += 12
        doc.setFontSize(7)
        doc.setFont('helvetica', 'italic')
        doc.setTextColor(100, 100, 100)
        centerText('Obrigado pela preferência!', y)

        // Output
        window.open(doc.output('bloburl'))
    }

    const handleSaveClient = async (e) => {
        e.preventDefault()
        try {
            const { data, error } = await supabase
                .from('clientes')
                .insert([{ ...clientFormData, usuario_id: user.id }])
                .select()
                .single()

            if (error) throw error

            // Refresh clients and select the new one
            const { data: allClients } = await supabase.from('clientes').select('id, nome')
            setClients(allClients || [])
            setNewOrder({ ...newOrder, cliente_id: data.id })

            // Reset and close
            setClientFormData({
                nome: '', telefone: '', email: '',
                rua: '', numero: '', bairro: '',
                cidade: '', referencia: '', observacoes: ''
            })
            setIsClientModalOpen(false)
            // Clear search to show the new client clearly but maybe user wants context? 
            // Better to keep context or clear? Let's clear search so they see the selected one.
            setClientSearch('')
        } catch (error) {
            console.error('Error saving client:', error)
            alert('Erro ao salvar cliente: ' + error.message)
        }
    }

    const filteredClients = clients.filter(c =>
        c.nome.toLowerCase().includes(clientSearch.toLowerCase())
    )

    const getStatusColor = (status) => {
        switch (status) {
            case 'Pedido feito': return '#A0AEC0'
            case 'Pedido em rota de entrega': return '#3498db'
            case 'Pedido pago': return '#1EDD88'
            default: return '#fff'
        }
    }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <div>
                    <h1 className="text-gradient">Pedidos</h1>
                    <p style={{ color: 'var(--color-text-muted)' }}>Gerencie e acompanhe suas vendas</p>
                </div>
                <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
                    <Plus size={20} />
                    Novo Pedido
                </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {orders.map(order => (
                    <div key={order.id} className="glass-panel" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
                                <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{order.clientes?.nome}</h3>
                                <span style={{
                                    fontSize: '0.8rem',
                                    padding: '2px 8px',
                                    borderRadius: '10px',
                                    background: getStatusColor(order.status),
                                    color: '#0A1A3A',
                                    fontWeight: 'bold'
                                }}>
                                    {order.status}
                                </span>
                            </div>
                            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                                {format(new Date(order.criado_em), 'dd/MM/yyyy HH:mm')} • {order.pedido_itens.length} itens
                            </p>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1EDD88' }}>
                                    R$ {order.valor_total.toFixed(2)}
                                </div>
                            </div>
                            <button
                                className="btn btn-secondary"
                                onClick={() => generateReceipt(order)}
                                title="Gerar Recibo"
                            >
                                <FileText size={20} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Novo Pedido">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div>
                        <label>Cliente</label>
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                            <div style={{ position: 'relative', flex: 1 }}>
                                <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--color-text-muted)' }} />
                                <input
                                    placeholder="Buscar cliente..."
                                    value={clientSearch}
                                    onChange={e => setClientSearch(e.target.value)}
                                    style={{
                                        width: '100%',
                                        paddingLeft: '35px',
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '8px',
                                        paddingTop: '8px',
                                        paddingBottom: '8px',
                                        color: 'white'
                                    }}
                                />
                            </div>
                            <button
                                className="btn btn-secondary"
                                style={{ padding: '8px 12px' }}
                                onClick={() => setIsClientModalOpen(true)}
                                title="Novo Cliente"
                            >
                                <Plus size={20} />
                            </button>
                        </div>
                        <select
                            value={newOrder.cliente_id}
                            onChange={e => setNewOrder({ ...newOrder, cliente_id: e.target.value })}
                            style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#0F1115', border: '1px solid var(--border-color)', color: 'white' }}
                        >
                            <option value="">Selecione um cliente...</option>
                            {filteredClients.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                        </select>
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '8px' }}>
                        <label>Adicionar Produto</label>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <select
                                style={{ flex: 1 }}
                                value={selectedProduct}
                                onChange={e => setSelectedProduct(e.target.value)}
                            >
                                <option value="">Selecione...</option>
                                {products.map(p => <option key={p.id} value={p.id}>{p.nome} (R$ {p.preco_venda})</option>)}
                            </select>
                            <input
                                type="number"
                                style={{ width: '80px' }}
                                value={itemQty}
                                min="1"
                                onChange={e => setItemQty(e.target.value)}
                            />
                            <button className="btn btn-secondary" onClick={handleAddItem}><Plus size={20} /></button>
                        </div>
                    </div>

                    <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                        {newOrder.items.map((item, idx) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', borderBottom: '1px solid var(--border-color)' }}>
                                <span>{item.quantidade}x {item.produto_nome}</span>
                                <span>R$ {item.subtotal.toFixed(2)}</span>
                            </div>
                        ))}
                    </div>

                    <div style={{ textAlign: 'right', fontSize: '1.2rem', fontWeight: 'bold', marginTop: '10px' }}>
                        Total: R$ {calculateTotal().toFixed(2)}
                    </div>

                    <div>
                        <label>Status Inicial</label>
                        <select
                            value={newOrder.status}
                            onChange={e => setNewOrder({ ...newOrder, status: e.target.value })}
                        >
                            <option>Pedido feito</option>
                            <option>Pedido em rota de entrega</option>
                            <option>Pedido pago</option>
                        </select>
                    </div>

                    <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleSaveOrder}>
                        Finalizar Pedido
                    </button>
                </div>
            </Modal>

            {/* Client Registration Modal (Stacked) */}
            <Modal
                isOpen={isClientModalOpen}
                onClose={() => setIsClientModalOpen(false)}
                title="Novo Cliente"
                zIndex={1200}
            >
                <form onSubmit={handleSaveClient} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div>
                        <label>Nome *</label>
                        <input required value={clientFormData.nome} onChange={e => setClientFormData({ ...clientFormData, nome: e.target.value })} />
                    </div>
                    <div className="grid-2">
                        <div>
                            <label>Telefone</label>
                            <input value={clientFormData.telefone} onChange={e => setClientFormData({ ...clientFormData, telefone: e.target.value })} />
                        </div>
                        <div>
                            <label>Email</label>
                            <input type="email" value={clientFormData.email} onChange={e => setClientFormData({ ...clientFormData, email: e.target.value })} />
                        </div>
                    </div>
                    <div className="grid-3">
                        <div>
                            <label>Rua</label>
                            <input value={clientFormData.rua} onChange={e => setClientFormData({ ...clientFormData, rua: e.target.value })} />
                        </div>
                        <div>
                            <label>Número</label>
                            <input value={clientFormData.numero} onChange={e => setClientFormData({ ...clientFormData, numero: e.target.value })} />
                        </div>
                    </div>
                    <div className="grid-2">
                        <div>
                            <label>Bairro</label>
                            <input value={clientFormData.bairro} onChange={e => setClientFormData({ ...clientFormData, bairro: e.target.value })} />
                        </div>
                        <div>
                            <label>Cidade</label>
                            <input value={clientFormData.cidade} onChange={e => setClientFormData({ ...clientFormData, cidade: e.target.value })} />
                        </div>
                    </div>
                    <div>
                        <label>Referência</label>
                        <input value={clientFormData.referencia} onChange={e => setClientFormData({ ...clientFormData, referencia: e.target.value })} />
                    </div>
                    <div>
                        <label>Observações</label>
                        <textarea
                            rows="3"
                            value={clientFormData.observacoes}
                            onChange={e => setClientFormData({ ...clientFormData, observacoes: e.target.value })}
                        />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                        <button type="button" className="btn btn-secondary" onClick={() => setIsClientModalOpen(false)}>Cancelar</button>
                        <button type="submit" className="btn btn-primary">Cadastrar</button>
                    </div>
                </form>
            </Modal>
        </div>
    )
}

export default Orders
