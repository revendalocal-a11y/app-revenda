import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { Plus, Search, Edit2, Trash2, MapPin, Phone, Mail } from 'lucide-react'
import Modal from '../components/ui/Modal'

const Clients = () => {
    const { user } = useAuth()
    const [clients, setClients] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [currentClient, setCurrentClient] = useState(null)

    // Form state
    const [formData, setFormData] = useState({
        nome: '', telefone: '', email: '',
        rua: '', numero: '', bairro: '',
        cidade: '', referencia: '', observacoes: ''
    })

    useEffect(() => {
        if (user) fetchClients()
    }, [user])

    const fetchClients = async () => {
        try {
            const { data, error } = await supabase
                .from('clientes')
                .select('*')
                .order('nome', { ascending: true })

            if (error) throw error
            setClients(data)
        } catch (error) {
            console.error('Error fetching clients:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleOpenModal = (client = null) => {
        if (client) {
            setCurrentClient(client)
            setFormData({ ...client })
        } else {
            setCurrentClient(null)
            setFormData({
                nome: '', telefone: '', email: '',
                rua: '', numero: '', bairro: '',
                cidade: '', referencia: '', observacoes: ''
            })
        }
        setIsModalOpen(true)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            if (currentClient) {
                // Update
                const { error } = await supabase
                    .from('clientes')
                    .update({ ...formData })
                    .eq('id', currentClient.id)
                if (error) throw error
            } else {
                // Create
                const { error } = await supabase
                    .from('clientes')
                    .insert([{ ...formData, usuario_id: user.id }])
                if (error) throw error
            }
            setIsModalOpen(false)
            fetchClients()
        } catch (error) {
            console.error('Error saving client:', error)
            alert('Erro ao salvar cliente.')
        }
    }

    const handleDelete = async (id) => {
        if (!confirm('Tem certeza que deseja excluir este cliente?')) return
        try {
            const { error } = await supabase.from('clientes').delete().eq('id', id)
            if (error) throw error
            fetchClients()
        } catch (error) {
            console.error('Error deleting client:', error)
        }
    }

    const filteredClients = clients.filter(c =>
        c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <div>
                    <h1 className="text-gradient">Clientes</h1>
                    <p style={{ color: 'var(--color-text-muted)' }}>Gerencie sua base de clientes</p>
                </div>
                <button className="btn btn-primary" onClick={() => handleOpenModal()}>
                    <Plus size={20} />
                    Novo Cliente
                </button>
            </div>

            <div className="glass-panel" style={{ padding: '20px', marginBottom: '20px' }}>
                <div style={{ position: 'relative' }}>
                    <Search size={20} style={{ position: 'absolute', left: '12px', top: '80px', color: 'var(--color-text-muted)' }} />
                    <input
                        type="text"
                        placeholder="Buscar clientes por nome ou email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ paddingLeft: '40px' }}
                    />
                </div>
            </div>

            {loading ? (
                <p>Carregando...</p>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                    {filteredClients.map(client => (
                        <div key={client.id} className="glass-panel" style={{ padding: '20px', transition: 'transform 0.2s' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '15px' }}>
                                <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{client.nome}</h3>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button onClick={() => handleOpenModal(client)} style={{ background: 'none', border: 'none', color: '#1EDD88', cursor: 'pointer' }}><Edit2 size={18} /></button>
                                    <button onClick={() => handleDelete(client.id)} style={{ background: 'none', border: 'none', color: '#F87171', cursor: 'pointer' }}><Trash2 size={18} /></button>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                                {client.telefone && <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Phone size={14} /> {client.telefone}</div>}
                                {client.email && <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Mail size={14} /> {client.email}</div>}
                                {(client.rua || client.cidade) && (
                                    <div style={{ display: 'flex', alignItems: 'start', gap: '8px' }}>
                                        <MapPin size={14} style={{ marginTop: '3px' }} />
                                        <span>
                                            {client.rua}, {client.numero} - {client.bairro}<br />
                                            {client.cidade}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={currentClient ? 'Editar Cliente' : 'Novo Cliente'}
            >
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div>
                        <label>Nome *</label>
                        <input required value={formData.nome} onChange={e => setFormData({ ...formData, nome: e.target.value })} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <div>
                            <label>Telefone</label>
                            <input value={formData.telefone} onChange={e => setFormData({ ...formData, telefone: e.target.value })} />
                        </div>
                        <div>
                            <label>Email</label>
                            <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '15px' }}>
                        <div>
                            <label>Rua</label>
                            <input value={formData.rua} onChange={e => setFormData({ ...formData, rua: e.target.value })} />
                        </div>
                        <div>
                            <label>Número</label>
                            <input value={formData.numero} onChange={e => setFormData({ ...formData, numero: e.target.value })} />
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <div>
                            <label>Bairro</label>
                            <input value={formData.bairro} onChange={e => setFormData({ ...formData, bairro: e.target.value })} />
                        </div>
                        <div>
                            <label>Cidade</label>
                            <input value={formData.cidade} onChange={e => setFormData({ ...formData, cidade: e.target.value })} />
                        </div>
                    </div>
                    <div>
                        <label>Referência</label>
                        <input value={formData.referencia} onChange={e => setFormData({ ...formData, referencia: e.target.value })} />
                    </div>
                    <div>
                        <label>Observações</label>
                        <textarea
                            rows="3"
                            value={formData.observacoes}
                            onChange={e => setFormData({ ...formData, observacoes: e.target.value })}
                        />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                        <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                        <button type="submit" className="btn btn-primary">Salvar</button>
                    </div>
                </form>
            </Modal>
        </div>
    )
}

export default Clients
