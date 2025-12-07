import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { Users, ShoppingBag, DollarSign, TrendingUp, AlertCircle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { format, subDays, isAfter } from 'date-fns'

const Dashboard = () => {
    const { user } = useAuth()
    const [stats, setStats] = useState({
        totalClients: 0,
        totalOrders: 0,
        totalRevenue: 0,
        monthlyRevenue: 0,
        topProducts: [],
        weeklyRevenue: [],
        topClients: [],
        inactiveClients: []
    })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (user) fetchDashboardData()
    }, [user])

    const fetchDashboardData = async () => {
        try {
            // 1. Basic Counts
            const { count: clientsCount } = await supabase.from('clientes').select('*', { count: 'exact', head: true })
            const { count: ordersCount } = await supabase.from('pedidos').select('*', { count: 'exact', head: true })

            // 2. Revenue (Faturamento)
            const { data: revenueData } = await supabase.from('faturamento').select('valor, data')

            const totalRevenue = revenueData.reduce((acc, curr) => acc + (curr.valor || 0), 0)

            const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
            const monthlyRevenue = revenueData
                .filter(r => new Date(r.data) >= startOfMonth)
                .reduce((acc, curr) => acc + (curr.valor || 0), 0)

            // 3. Weekly Revenue Chart Data
            const last7Days = Array.from({ length: 7 }, (_, i) => {
                const d = subDays(new Date(), 6 - i)
                return format(d, 'dd/MM')
            })

            const weeklyData = last7Days.map(dayStr => {
                const dayRevenue = revenueData
                    .filter(r => format(new Date(r.data), 'dd/MM') === dayStr)
                    .reduce((acc, curr) => acc + (curr.valor || 0), 0)
                return { name: dayStr, valor: dayRevenue }
            })

            // 4. Products & Clients Analysis
            // Fetch all orders with items for detailed analysis
            const { data: ordersDetails } = await supabase
                .from('pedidos')
                .select(`
          cliente_id,
          valor_total,
          data,
          pedido_itens (produto_nome, quantidade, subtotal),
          clientes (id, nome, telefone)
        `)

            // Top Products
            const productSales = {}
            ordersDetails.forEach(order => {
                order.pedido_itens.forEach(item => {
                    if (!productSales[item.produto_nome]) productSales[item.produto_nome] = 0
                    productSales[item.produto_nome] += item.quantidade
                })
            })
            const topProducts = Object.entries(productSales)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5)
                .map(([name, qtd]) => ({ name, qtd }))

            // Top Clients
            const clientSales = {}
            ordersDetails.forEach(order => {
                const clientName = order.clientes?.nome || 'Desconhecido'
                if (!clientSales[clientName]) clientSales[clientName] = 0
                clientSales[clientName] += order.valor_total
            })
            const topClients = Object.entries(clientSales)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5)
                .map(([name, total]) => ({ name, total }))

            // Inactive Clients (No purchase in last 30 days)
            const { data: allClients } = await supabase.from('clientes').select('id, nome, telefone')
            const thirtyDaysAgo = subDays(new Date(), 30)

            const activeClientIds = new Set(
                ordersDetails
                    .filter(o => isAfter(new Date(o.data), thirtyDaysAgo))
                    .map(o => o.cliente_id)
            )

            const inactiveClients = allClients
                .filter(c => !activeClientIds.has(c.id))
                .slice(0, 5) // Show top 5 inactive

            setStats({
                totalClients: clientsCount || 0,
                totalOrders: ordersCount || 0,
                totalRevenue,
                monthlyRevenue,
                topProducts,
                weeklyRevenue: weeklyData,
                topClients,
                inactiveClients
            })

        } catch (error) {
            console.error('Error fetching dashboard:', error)
        } finally {
            setLoading(false)
        }
    }

    const StatCard = ({ title, value, icon: Icon, color, subtitle }) => (
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: `${color}20`,
                color: color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <Icon size={30} />
            </div>
            <div>
                <p style={{ color: 'var(--color-text-muted)', marginBottom: '5px' }}>{title}</p>
                <h2 style={{ margin: 0, fontSize: '1.8rem' }}>{value}</h2>
                {subtitle && <p style={{ fontSize: '0.8rem', color: '#1EDD88', marginTop: '5px' }}>{subtitle}</p>}
            </div>
        </div>
    )

    const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

    return (
        <div>
            <h1 className="text-gradient" style={{ marginBottom: '30px' }}>Dashboard</h1>

            {loading ? <p>Carregando dados...</p> : (
                <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                        <StatCard
                            title="Clientes Totais"
                            value={stats.totalClients}
                            icon={Users}
                            color="#3498db"
                        />
                        <StatCard
                            title="Pedidos Realizados"
                            value={stats.totalOrders}
                            icon={ShoppingBag}
                            color="#9b59b6"
                        />
                        <StatCard
                            title="Faturamento Total"
                            value={formatCurrency(stats.totalRevenue)}
                            icon={DollarSign}
                            color="#1EDD88"
                        />
                        <StatCard
                            title="Receita Mensal"
                            value={formatCurrency(stats.monthlyRevenue)}
                            icon={TrendingUp}
                            color="#f1c40f"
                            subtitle="Neste mês"
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '30px' }}>
                        <div className="glass-panel" style={{ padding: '24px', minHeight: '400px' }}>
                            <h3 style={{ marginBottom: '20px' }}>Faturamento Semanal</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={stats.weeklyRevenue}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                                    <XAxis dataKey="name" stroke="#A0AEC0" />
                                    <YAxis stroke="#A0AEC0" />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#0A1A3A', border: 'none', borderRadius: '8px' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                    <Bar dataKey="valor" fill="#1EDD88" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="glass-panel" style={{ padding: '24px' }}>
                            <h3 style={{ marginBottom: '20px' }}>Top Produtos</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                {stats.topProducts.map((p, idx) => (
                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                                        <span style={{ fontWeight: '500' }}>{p.name}</span>
                                        <span style={{ background: 'rgba(30, 221, 136, 0.1)', color: '#1EDD88', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem' }}>
                                            {p.qtd} un
                                        </span>
                                    </div>
                                ))}
                                {stats.topProducts.length === 0 && <p className="text-muted">Sem dados ainda.</p>}
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div className="glass-panel" style={{ padding: '24px' }}>
                            <h3 style={{ marginBottom: '20px' }}>Melhores Clientes</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                {stats.topClients.map((c, idx) => (
                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#3498db20', color: '#3498db', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                {idx + 1}
                                            </div>
                                            <span>{c.name}</span>
                                        </div>
                                        <span style={{ fontWeight: 'bold' }}>{formatCurrency(c.total)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="glass-panel" style={{ padding: '24px' }}>
                            <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <AlertCircle color="#F87171" size={20} />
                                Clientes Inativos (30 dias)
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                {stats.inactiveClients.map((c, idx) => (
                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span>{c.name}</span>
                                        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>{c.telefone || 'Sem telefone'}</span>
                                    </div>
                                ))}
                                {stats.inactiveClients.length === 0 && <p style={{ color: 'var(--color-text-muted)' }}>Todos os clientes estão ativos!</p>}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}

export default Dashboard
