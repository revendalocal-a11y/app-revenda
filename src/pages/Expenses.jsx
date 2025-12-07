import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { Plus, Search, Edit2, Trash2, Tag, Calendar, DollarSign, TrendingDown } from 'lucide-react'
import Modal from '../components/ui/Modal'
import { format } from 'date-fns'

const Expenses = () => {
    const { user } = useAuth()
    const [expenses, setExpenses] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [currentExpense, setCurrentExpense] = useState(null)

    const [formData, setFormData] = useState({
        nome: '', valor: 0, categoria: '', data: new Date().toISOString().split('T')[0]
    })

    useEffect(() => {
        if (user) fetchExpenses()
    }, [user])

    const fetchExpenses = async () => {
        try {
            const { data, error } = await supabase
                .from('despesas')
                .select('*')
                .order('data', { ascending: false })
            if (error) throw error
            setExpenses(data)
        } catch (error) {
            console.error('Error fetching expenses:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleOpenModal = (expense = null) => {
        if (expense) {
            setCurrentExpense(expense)
            setFormData({
                ...expense,
                data: expense.data ? expense.data.split('T')[0] : new Date().toISOString().split('T')[0]
            })
        } else {
            setCurrentExpense(null)
            setFormData({
                nome: '', valor: 0, categoria: '', data: new Date().toISOString().split('T')[0]
            })
        }
        setIsModalOpen(true)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            const dataToSave = {
                ...formData,
                usuario_id: user.id,
                valor: parseFloat(formData.valor),
            }

            if (currentExpense) {
                const { error } = await supabase
                    .from('despesas')
                    .update(dataToSave)
                    .eq('id', currentExpense.id)
                if (error) throw error
            } else {
                const { error } = await supabase
                    .from('despesas')
                    .insert([dataToSave])
                if (error) throw error
            }
            setIsModalOpen(false)
            fetchExpenses()
        } catch (error) {
            console.error('Error saving expense:', error)
            alert('Erro ao salvar despesa: ' + error.message)
        }
    }

    const handleDelete = async (id) => {
        if (!confirm('Tem certeza que deseja excluir esta despesa?')) return
        try {
            const { error } = await supabase.from('despesas').delete().eq('id', id)
            if (error) throw error
            fetchExpenses()
        } catch (error) {
            console.error('Error deleting expense:', error)
            alert('Erro ao excluir: ' + error.message)
        }
    }

    const filteredExpenses = expenses.filter(e =>
        e.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.categoria?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const formatCurrency = (value) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

    const categories = ['Aluguel', 'Fornecedores', 'Marketing', 'Transporte', 'Serviços', 'Impostos', 'Outros']

    return (
        <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <div>
                    <h1 className="text-gradient">Despesas</h1>
                    <p style={{ color: 'var(--color-text-muted)' }}>Controle seus custos e saídas</p>
                </div>
                <button className="btn btn-primary" onClick={() => handleOpenModal()}>
                    <Plus size={20} />
                    Nova Despesa
                </button>
            </div>

            <div className="glass-panel" style={{ padding: '20px', marginBottom: '20px' }}>
                <div style={{ position: 'relative' }}>
                    <Search size={20} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                    <input
                        type="text"
                        placeholder="Buscar despesas..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ paddingLeft: '40px' }}
                    />
                </div>
            </div>

            {loading ? (
                <p style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>Carregando...</p>
            ) : (
                <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead style={{ background: 'rgba(255,255,255,0.02)' }}>
                                <tr>
                                    <th style={{ padding: '16px', textAlign: 'left', fontWeight: '500', color: 'var(--color-text-muted)', borderBottom: '1px solid var(--border-color)' }}>Nome da Despesa</th>
                                    <th style={{ padding: '16px', textAlign: 'left', fontWeight: '500', color: 'var(--color-text-muted)', borderBottom: '1px solid var(--border-color)' }}>Categoria</th>
                                    <th style={{ padding: '16px', textAlign: 'left', fontWeight: '500', color: 'var(--color-text-muted)', borderBottom: '1px solid var(--border-color)' }}>Data</th>
                                    <th style={{ padding: '16px', textAlign: 'right', fontWeight: '500', color: 'var(--color-text-muted)', borderBottom: '1px solid var(--border-color)' }}>Valor</th>
                                    <th style={{ padding: '16px', textAlign: 'right', fontWeight: '500', color: 'var(--color-text-muted)', borderBottom: '1px solid var(--border-color)' }}>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredExpenses.map((expense, idx) => (
                                    <tr key={expense.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                                        <td style={{ padding: '16px', fontWeight: '500' }}>{expense.nome}</td>
                                        <td style={{ padding: '16px' }}>
                                            {expense.categoria && (
                                                <span style={{
                                                    background: 'rgba(248, 113, 113, 0.1)',
                                                    color: '#F87171',
                                                    padding: '4px 8px',
                                                    borderRadius: '4px',
                                                    fontSize: '0.8rem',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '4px'
                                                }}>
                                                    <Tag size={12} /> {expense.categoria}
                                                </span>
                                            )}
                                        </td>
                                        <td style={{ padding: '16px', color: 'var(--color-text-muted)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <Calendar size={14} />
                                                {format(new Date(expense.data), 'dd/MM/yyyy')}
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px', textAlign: 'right', color: '#F87171', fontWeight: 'bold' }}>
                                            {formatCurrency(expense.valor)}
                                        </td>
                                        <td style={{ padding: '16px', textAlign: 'right' }}>
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                                <button onClick={() => handleOpenModal(expense)} style={{ background: 'none', border: 'none', color: '#3498db', cursor: 'pointer', padding: '4px' }} title="Editar">
                                                    <Edit2 size={18} />
                                                </button>
                                                <button onClick={() => handleDelete(expense.id)} style={{ background: 'none', border: 'none', color: '#F87171', cursor: 'pointer', padding: '4px' }} title="Excluir">
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredExpenses.length === 0 && (
                                    <tr>
                                        <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                            Nenhuma despesa encontrada.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={currentExpense ? 'Editar Despesa' : 'Nova Despesa'}
            >
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div>
                        <label>Nome da Despesa *</label>
                        <input required value={formData.nome} onChange={e => setFormData({ ...formData, nome: e.target.value })} placeholder="Ex: Conta de Luz" />
                    </div>

                    <div className="grid-2">
                        <div>
                            <label>Valor (R$) *</label>
                            <div style={{ position: 'relative' }}>
                                <DollarSign size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    value={formData.valor}
                                    onChange={e => setFormData({ ...formData, valor: e.target.value })}
                                    style={{ paddingLeft: '35px' }}
                                />
                            </div>
                        </div>
                        <div>
                            <label>Data *</label>
                            <input type="date" required value={formData.data} onChange={e => setFormData({ ...formData, data: e.target.value })} />
                        </div>
                    </div>

                    <div>
                        <label>Categoria</label>
                        <select
                            value={formData.categoria}
                            onChange={e => setFormData({ ...formData, categoria: e.target.value })}
                            style={{ background: 'var(--bg-input)', color: 'white', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px' }}
                        >
                            <option value="">Selecione uma categoria...</option>
                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                        <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                        <button type="submit" className="btn btn-primary">Salvar Despesa</button>
                    </div>
                </form>
            </Modal>
        </div>
    )
}

export default Expenses
