import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { Plus, Search, Edit2, Trash2, Tag, Box } from 'lucide-react'
import Modal from '../components/ui/Modal'

const Products = () => {
    const { user } = useAuth()
    const [products, setProducts] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [currentProduct, setCurrentProduct] = useState(null)

    const [formData, setFormData] = useState({
        nome: '', preco_custo: 0, preco_venda: 0,
        descricao: '', categoria: '', estoque: 0
    })

    useEffect(() => {
        if (user) fetchProducts()
    }, [user])

    const fetchProducts = async () => {
        try {
            const { data, error } = await supabase
                .from('produtos')
                .select('*')
                .order('nome', { ascending: true })
            if (error) throw error
            setProducts(data)
        } catch (error) {
            console.error('Error fetching products:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleOpenModal = (product = null) => {
        if (product) {
            setCurrentProduct(product)
            setFormData({ ...product })
        } else {
            setCurrentProduct(null)
            setFormData({
                nome: '', preco_custo: 0, preco_venda: 0,
                descricao: '', categoria: '', estoque: 0
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
                preco_custo: parseFloat(formData.preco_custo),
                preco_venda: parseFloat(formData.preco_venda),
                estoque: parseInt(formData.estoque)
            }

            if (currentProduct) {
                const { error } = await supabase
                    .from('produtos')
                    .update(dataToSave)
                    .eq('id', currentProduct.id)
                if (error) throw error
            } else {
                const { error } = await supabase
                    .from('produtos')
                    .insert([dataToSave])
                if (error) throw error
            }
            setIsModalOpen(false)
            fetchProducts()
        } catch (error) {
            console.error('Error saving product:', error)
            alert('Erro ao salvar produto.')
        }
    }

    const handleDelete = async (id) => {
        if (!confirm('Tem certeza que deseja excluir este produto?')) return
        try {
            const { error } = await supabase.from('produtos').delete().eq('id', id)
            if (error) throw error
            fetchProducts()
        } catch (error) {
            console.error('Error deleting product:', error)
        }
    }

    const filteredProducts = products.filter(p =>
        p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.categoria?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const formatCurrency = (value) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <div>
                    <h1 className="text-gradient">Produtos</h1>
                    <p style={{ color: 'var(--color-text-muted)' }}>Gerencie seu estoque e preços</p>
                </div>
                <button className="btn btn-primary" onClick={() => handleOpenModal()}>
                    <Plus size={20} />
                    Novo Produto
                </button>
            </div>

            <div className="glass-panel" style={{ padding: '20px', marginBottom: '20px' }}>
                <div style={{ position: 'relative' }}>
                    <Search size={20} style={{ position: 'absolute', left: '12px', top: '80px', color: 'var(--color-text-muted)' }} />
                    <input
                        type="text"
                        placeholder="Buscar produtos..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ paddingLeft: '40px' }}
                    />
                </div>
            </div>

            {loading ? (
                <p>Carregando...</p>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                    {filteredProducts.map(product => (
                        <div key={product.id} className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                <span style={{
                                    background: 'rgba(30, 221, 136, 0.1)',
                                    color: '#1EDD88',
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    fontSize: '0.8rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                }}>
                                    <Tag size={12} /> {product.categoria || 'Geral'}
                                </span>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button onClick={() => handleOpenModal(product)} style={{ background: 'none', border: 'none', color: '#1EDD88', cursor: 'pointer' }}><Edit2 size={16} /></button>
                                    <button onClick={() => handleDelete(product.id)} style={{ background: 'none', border: 'none', color: '#F87171', cursor: 'pointer' }}><Trash2 size={16} /></button>
                                </div>
                            </div>

                            <h3 style={{ fontSize: '1.2rem', marginBottom: '5px' }}>{product.nome}</h3>
                            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '15px' }}>{product.descricao || 'Sem descrição'}</p>

                            <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border-color)', paddingTop: '200px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Venda</span>
                                    <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#1EDD88' }}>{formatCurrency(product.preco_venda)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Estoque</span>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        <Box size={14} /> {product.estoque}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={currentProduct ? 'Editar Produto' : 'Novo Produto'}
            >
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div>
                        <label>Nome do Produto *</label>
                        <input required value={formData.nome} onChange={e => setFormData({ ...formData, nome: e.target.value })} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <div>
                            <label>Categoria</label>
                            <input
                                list="categories-list"
                                value={formData.categoria}
                                onChange={e => setFormData({ ...formData, categoria: e.target.value })}
                                placeholder="Ex: Eletrônicos"
                            />
                            <datalist id="categories-list">
                                {[...new Set(products.map(p => p.categoria))].map(c => <option key={c} value={c} />)}
                            </datalist>
                        </div>
                        <div>
                            <label>Estoque</label>
                            <input type="number" value={formData.estoque} onChange={e => setFormData({ ...formData, estoque: e.target.value })} />
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <div>
                            <label>Preço de Custo (R$)</label>
                            <input type="number" step="0.01" value={formData.preco_custo} onChange={e => setFormData({ ...formData, preco_custo: e.target.value })} />
                        </div>
                        <div>
                            <label>Preço de Venda (R$)</label>
                            <input type="number" step="0.01" value={formData.preco_venda} onChange={e => setFormData({ ...formData, preco_venda: e.target.value })} />
                        </div>
                    </div>
                    <div>
                        <label>Descrição</label>
                        <textarea
                            rows="3"
                            value={formData.descricao}
                            onChange={e => setFormData({ ...formData, descricao: e.target.value })}
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

export default Products
