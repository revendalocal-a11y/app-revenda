import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { format, subDays, startOfDay } from 'date-fns'
import { Printer, Package, TrendingUp, TrendingDown, PieChart, Users, DollarSign, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import jsPDF from 'jspdf'

const Reports = () => {
    const { user } = useAuth()
    const [loading, setLoading] = useState(true)
    const [timeRange, setTimeRange] = useState('month')
    const [activeTab, setActiveTab] = useState('products')

    const [rawOrders, setRawOrders] = useState([])
    const [rawExpenses, setRawExpenses] = useState([])
    const [rawClients, setRawClients] = useState([])

    const [reportData, setReportData] = useState({
        products: [],
        bestClients: [],
        expenses: [],
        financial: { gross: 0, net: 0, expenseTotal: 0 },
        clientList: []
    })

    useEffect(() => {
        if (user) fetchData()
    }, [user])

    useEffect(() => {
        if (!loading) processData()
    }, [rawOrders, rawExpenses, rawClients, timeRange, loading])

    const fetchData = async () => {
        try {
            setLoading(true)
            const { data: orders, error: ordersError } = await supabase
                .from('pedidos')
                .select(`
                    *,
                    pedido_itens (id, produto_nome, quantidade, subtotal, preco_unitario),
                    clientes (id, nome, email, telefone, rua, numero, bairro, cidade)
                `)
                .order('criado_em', { ascending: false })

            if (ordersError) throw ordersError

            const { data: clients, error: clientsError } = await supabase
                .from('clientes')
                .select('*')
                .order('nome')

            if (clientsError) throw clientsError

            let expenses = []
            try {
                const { data: expData, error: expError } = await supabase.from('despesas').select('*')
                if (!expError) expenses = expData
            } catch (e) {
                console.warn('Tabela de despesas não encontrada.')
            }

            setRawOrders(orders || [])
            setRawClients(clients || [])
            setRawExpenses(expenses || [])
        } catch (error) {
            console.error('Error fetching report data:', error)
        } finally {
            setLoading(false)
        }
    }

    const processData = () => {
        const now = new Date()
        let startDate = new Date(0)

        if (timeRange === 'today') startDate = startOfDay(now)
        if (timeRange === 'week') startDate = subDays(now, 7)
        if (timeRange === 'month') startDate = subDays(now, 30)

        const filterDate = (dateStr) => {
            if (timeRange === 'all') return true
            const d = new Date(dateStr)
            return d >= startDate && d <= now
        }

        const filteredOrders = rawOrders.filter(o => filterDate(o.criado_em))
        const filteredExpenses = rawExpenses.filter(e => filterDate(e.data))

        // 1. Top Products
        const productMap = {}
        let totalSalesVal = 0
        filteredOrders.forEach(order => {
            order.pedido_itens.forEach(item => {
                if (!productMap[item.produto_nome]) {
                    productMap[item.produto_nome] = { name: item.produto_nome, qty: 0, total: 0 }
                }
                productMap[item.produto_nome].qty += item.quantidade
                productMap[item.produto_nome].total += item.subtotal
                totalSalesVal += item.subtotal
            })
        })
        const productsStats = Object.values(productMap)
            .sort((a, b) => b.qty - a.qty)
            .map(p => ({
                ...p,
                percentage: totalSalesVal ? (p.total / totalSalesVal) * 100 : 0
            }))

        // 2. Best Customers
        const clientMap = {}
        filteredOrders.forEach(order => {
            const clientName = order.clientes?.nome || 'Consumidor Final'
            if (!clientMap[clientName]) {
                clientMap[clientName] = { name: clientName, orders: 0, total: 0 }
            }
            clientMap[clientName].orders += 1
            clientMap[clientName].total += order.valor_total
        })
        const bestClients = Object.values(clientMap).sort((a, b) => b.total - a.total)

        // 3. Expenses
        const expenseTotal = filteredExpenses.reduce((acc, curr) => acc + (curr.valor || 0), 0)
        const expensesStats = filteredExpenses.map(e => ({
            ...e,
            percentage: expenseTotal ? (e.valor / expenseTotal) * 100 : 0
        }))

        // 4 & 5. Financials
        const grossRevenue = filteredOrders.reduce((acc, curr) => acc + curr.valor_total, 0)
        const netRevenue = grossRevenue - expenseTotal

        setReportData({
            products: productsStats,
            bestClients: bestClients,
            expenses: expensesStats,
            financial: { gross: grossRevenue, net: netRevenue, expenseTotal },
            clientList: rawClients
        })
    }

    const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

    const generatePDF = (type) => {
        const doc = new jsPDF()
        const pageWidth = doc.internal.pageSize.getWidth()

        const printHeader = (title) => {
            doc.setFillColor(240, 240, 240)
            doc.rect(0, 0, pageWidth, 40, 'F')
            doc.setTextColor(40)
            doc.setFontSize(22)
            doc.setFont('helvetica', 'bold')
            doc.text('REVENDA LOCAL', 20, 20)
            doc.setFontSize(12)
            doc.setFont('helvetica', 'normal')
            doc.text(`Relatório: ${title}`, 20, 30)
            doc.setFontSize(10)
            doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, pageWidth - 20, 30, { align: 'right' })
            doc.setDrawColor(200)
            doc.line(0, 40, pageWidth, 40)
        }

        let y = 50

        const printRow = (cols, yPos, isHeader = false) => {
            if (isHeader) {
                doc.setFont('helvetica', 'bold')
                doc.setFillColor(230)
                doc.rect(15, yPos - 5, pageWidth - 30, 8, 'F')
            } else {
                doc.setFont('helvetica', 'normal')
            }

            let x = 20
            cols.forEach(col => {
                if (col.align === 'right') {
                    doc.text(col.text.toString(), x + col.width, yPos, { align: 'right' })
                } else {
                    doc.text(col.text.toString(), x, yPos)
                }
                x += col.width + 5
            })
        }

        if (type === 'products') {
            printHeader('Produtos Mais Vendidos')
            printRow([
                { text: 'Produto', width: 80 },
                { text: 'Qtd Vendida', width: 30, align: 'right' },
                { text: 'Valor Total', width: 40, align: 'right' },
                { text: '% Total', width: 20, align: 'right' }
            ], y, true)
            y += 10

            reportData.products.forEach(p => {
                if (y > 280) { doc.addPage(); y = 20; }
                printRow([
                    { text: p.name, width: 80 },
                    { text: p.qty, width: 30, align: 'right' },
                    { text: formatCurrency(p.total), width: 40, align: 'right' },
                    { text: p.percentage.toFixed(1) + '%', width: 20, align: 'right' }
                ], y)
                y += 8
                doc.setDrawColor(240); doc.line(20, y - 5, pageWidth - 20, y - 5)
            })
        }

        if (type === 'bestClients') {
            printHeader('Clientes que Mais Compraram')
            printRow([
                { text: 'Cliente', width: 90 },
                { text: 'Pedidos', width: 30, align: 'right' },
                { text: 'Total Comprado', width: 50, align: 'right' }
            ], y, true)
            y += 10

            reportData.bestClients.forEach(c => {
                if (y > 280) { doc.addPage(); y = 20; }
                printRow([
                    { text: c.name, width: 90 },
                    { text: c.orders, width: 30, align: 'right' },
                    { text: formatCurrency(c.total), width: 50, align: 'right' }
                ], y)
                y += 8
                doc.setDrawColor(240); doc.line(20, y - 5, pageWidth - 20, y - 5)
            })
        }

        if (type === 'expenses') {
            printHeader('Relatório de Despesas')
            printRow([
                { text: 'Descrição', width: 80 },
                { text: 'Data', width: 30 },
                { text: 'Valor', width: 40, align: 'right' },
                { text: '% Total', width: 20, align: 'right' }
            ], y, true)
            y += 10

            reportData.expenses.forEach(e => {
                if (y > 280) { doc.addPage(); y = 20; }
                printRow([
                    { text: e.nome || 'N/A', width: 80 },
                    { text: format(new Date(e.data), 'dd/MM/yyyy'), width: 30 },
                    { text: formatCurrency(e.valor), width: 40, align: 'right' },
                    { text: e.percentage.toFixed(1) + '%', width: 20, align: 'right' }
                ], y)
                y += 8
                doc.setDrawColor(240); doc.line(20, y - 5, pageWidth - 20, y - 5)
            })
        }

        if (type === 'financial') {
            printHeader('Demonstrativo Financeiro')
            y += 10
            doc.setFillColor(245)
            doc.roundedRect(20, y, pageWidth - 40, 40, 3, 3, 'F')

            let boxY = y + 12
            doc.setFontSize(14)
            doc.text('Resumo do Período', 30, boxY)

            boxY += 15
            doc.setFontSize(12)
            doc.setTextColor(0, 150, 0)
            doc.text(`Receita Bruta: ${formatCurrency(reportData.financial.gross)}`, 30, boxY)

            doc.setTextColor(200, 0, 0)
            doc.text(`Despesas: (${formatCurrency(reportData.financial.expenseTotal)})`, 90, boxY)

            const profit = reportData.financial.net
            doc.setTextColor(profit >= 0 ? 0 : 200, profit >= 0 ? 150 : 0, 0)
            doc.setFont('helvetica', 'bold')
            doc.text(`Resultado Líquido: ${formatCurrency(profit)}`, 160, boxY)
        }

        if (type === 'clientList') {
            printHeader('Lista Completa de Clientes')
            printRow([
                { text: 'Nome', width: 50 },
                { text: 'Telefone', width: 30 },
                { text: 'Endereço', width: 90 }
            ], y, true)
            y += 10

            reportData.clientList.forEach(c => {
                if (y > 280) { doc.addPage(); y = 20; }

                const address = `${c.rua || ''}, ${c.numero || ''} - ${c.bairro || ''}, ${c.cidade || ''}`
                const addressLines = doc.splitTextToSize(address, 90)

                printRow([
                    { text: c.nome, width: 50 },
                    { text: c.telefone || '-', width: 30 },
                    { text: '', width: 90 }
                ], y)

                doc.text(addressLines, 20 + 50 + 5 + 30 + 5, y)
                y += Math.max(8, addressLines.length * 5)
                doc.setDrawColor(240); doc.line(20, y - 3, pageWidth - 20, y - 3)
            })
        }

        window.open(doc.output('bloburl'))
    }

    const StatCard = ({ title, value, icon: Icon, color, subtext, trend }) => (
        <div style={{
            background: 'var(--bg-card)',
            backdropFilter: 'blur(12px)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '15px'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: `${color}15`,
                    color: color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <Icon size={24} />
                </div>
                {trend && (
                    <span style={{
                        color: trend === 'up' ? '#1EDD88' : '#F87171',
                        background: trend === 'up' ? 'rgba(30, 221, 136, 0.1)' : 'rgba(248, 113, 113, 0.1)',
                        padding: '4px 8px',
                        borderRadius: '20px',
                        fontSize: '0.8rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                    }}>
                        {trend === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                    </span>
                )}
            </div>
            <div>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '4px' }}>{title}</p>
                <h3 style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>{value}</h3>
            </div>
            {subtext && (
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px', marginTop: 'auto' }}>
                    <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{subtext}</p>
                </div>
            )}
        </div>
    )

    const TableHeader = ({ children }) => (
        <th style={{ padding: '16px', textAlign: 'left', fontWeight: '500', color: 'var(--color-text-muted)', borderBottom: '1px solid var(--border-color)', fontSize: '0.9rem' }}>
            {children}
        </th>
    )

    const TableCell = ({ children, align = 'left', color = 'white', bold = false }) => (
        <td style={{ padding: '16px', textAlign: align, color: color, fontWeight: bold ? 'bold' : 'normal', borderBottom: '1px solid var(--border-color)' }}>
            {children}
        </td>
    )

    const tabs = [
        { id: 'products', label: 'Produtos', icon: Package },
        { id: 'clients', label: 'Clientes', icon: TrendingUp },
        { id: 'expenses', label: 'Despesas', icon: TrendingDown },
        { id: 'financial', label: 'Financeiro', icon: PieChart },
        { id: 'client_list', label: 'Lista', icon: Users },
    ]

    return (
        <div className="animate-fade-in">
            {/* Header Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '24px' }}>
                    <div>
                        <h1 className="text-gradient" style={{ marginBottom: '8px' }}>Relatórios e Análises</h1>
                        <p style={{ color: 'var(--color-text-muted)' }}>Gestão inteligente do seu negócio</p>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', background: 'rgba(255,255,255,0.03)', padding: '6px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                        <select
                            value={timeRange}
                            onChange={(e) => setTimeRange(e.target.value)}
                            style={{
                                background: 'transparent',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '8px 16px',
                                outline: 'none',
                                width: 'auto',
                                cursor: 'pointer'
                            }}
                        >
                            <option value="today">Hoje</option>
                            <option value="week">7 Dias</option>
                            <option value="month">30 Dias</option>
                            <option value="all">Total</option>
                        </select>
                        <button
                            onClick={() => generatePDF(activeTab === 'clients' ? 'bestClients' : (activeTab === 'client_list' ? 'clientList' : activeTab))}
                            className="btn btn-primary"
                            style={{ padding: '8px 16px', fontSize: '0.9rem' }}
                        >
                            <Printer size={18} />
                            PDF
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div style={{
                    display: 'flex',
                    overflowX: 'auto',
                    gap: '8px',
                    paddingBottom: '4px',
                    borderBottom: '1px solid var(--border-color)'
                }}>
                    {tabs.map(tab => {
                        const Icon = tab.icon
                        const isActive = activeTab === tab.id
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '12px 20px',
                                    borderBottom: isActive ? '2px solid #1EDD88' : '2px solid transparent',
                                    background: 'transparent',
                                    color: isActive ? '#1EDD88' : 'var(--color-text-muted)',
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                    transition: 'all 0.2s',
                                    fontWeight: isActive ? '600' : '500',
                                    fontSize: '0.95rem'
                                }}
                            >
                                <Icon size={18} />
                                {tab.label}
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Content Area */}
            <div className="glass-panel" style={{ padding: '0', minHeight: '500px', overflow: 'hidden' }}>
                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px', color: 'var(--color-text-muted)' }}>
                        <div style={{ textAlign: 'center' }}>
                            <div className="animate-spin" style={{ marginBottom: '16px' }}>↻</div>
                            Carregando dados...
                        </div>
                    </div>
                ) : (
                    <div style={{ padding: '32px' }}>
                        {/* Products Report */}
                        {activeTab === 'products' && (
                            <div className="animate-fade-in">
                                <h3 style={{ fontSize: '1.25rem', marginBottom: '24px' }}>Produtos Mais Vendidos</h3>
                                <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead style={{ background: 'rgba(255,255,255,0.02)' }}>
                                            <tr>
                                                <TableHeader>Produto</TableHeader>
                                                <TableHeader>Qtd Vendida</TableHeader>
                                                <TableHeader>Valor Total</TableHeader>
                                                <TableHeader>% Vendas</TableHeader>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {reportData.products.map((p, idx) => (
                                                <tr key={idx} style={{ background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                                                    <TableCell bold>{p.name}</TableCell>
                                                    <TableCell align="right">{p.qty}</TableCell>
                                                    <TableCell align="right" color="#1EDD88" bold>{formatCurrency(p.total)}</TableCell>
                                                    <TableCell align="right">{p.percentage.toFixed(1)}%</TableCell>
                                                </tr>
                                            ))}
                                            {reportData.products.length === 0 && (
                                                <tr><td colSpan="4" style={{ padding: '64px', textAlign: 'center', color: 'var(--color-text-muted)' }}>Nenhuma venda encontrada neste período.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Best Clients */}
                        {activeTab === 'clients' && (
                            <div className="animate-fade-in">
                                <h3 style={{ fontSize: '1.25rem', marginBottom: '24px' }}>Clientes Top Compradores</h3>
                                <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead style={{ background: 'rgba(255,255,255,0.02)' }}>
                                            <tr>
                                                <TableHeader>Ranking</TableHeader>
                                                <TableHeader>Cliente</TableHeader>
                                                <TableHeader>Pedidos</TableHeader>
                                                <TableHeader>Valor Total</TableHeader>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {reportData.bestClients.map((c, idx) => (
                                                <tr key={idx} style={{ background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                                                    <TableCell>
                                                        <span style={{
                                                            width: '28px', height: '28px', borderRadius: '50%',
                                                            background: idx < 3 ? '#1EDD88' : 'rgba(255,255,255,0.1)',
                                                            color: idx < 3 ? '#0A1A3A' : 'white', fontWeight: 'bold',
                                                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem'
                                                        }}>
                                                            {idx + 1}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell bold>{c.name}</TableCell>
                                                    <TableCell align="center">{c.orders}</TableCell>
                                                    <TableCell align="right" color="#1EDD88" bold>{formatCurrency(c.total)}</TableCell>
                                                </tr>
                                            ))}
                                            {reportData.bestClients.length === 0 && (
                                                <tr><td colSpan="4" style={{ padding: '64px', textAlign: 'center', color: 'var(--color-text-muted)' }}>Nenhum dado disponível.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Financial */}
                        {activeTab === 'financial' && (
                            <div className="animate-fade-in">
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '40px' }}>
                                    <StatCard
                                        title="Faturamento Bruto"
                                        value={formatCurrency(reportData.financial.gross)}
                                        icon={DollarSign}
                                        color="#1EDD88"
                                        trend="up"
                                        subtext="Receita total de vendas confirmadas"
                                    />
                                    <StatCard
                                        title="Despesas Totais"
                                        value={formatCurrency(reportData.financial.expenseTotal)}
                                        icon={TrendingDown}
                                        color="#F87171"
                                        subtext="Gastos registrados no período"
                                    />
                                    <StatCard
                                        title="Lucro Líquido"
                                        value={formatCurrency(reportData.financial.net)}
                                        icon={PieChart}
                                        color={reportData.financial.net >= 0 ? '#3498db' : '#F59E0B'}
                                        trend={reportData.financial.net >= 0 ? 'up' : 'down'}
                                        subtext={
                                            reportData.financial.gross > 0
                                                ? `Margem de lucro: ${((reportData.financial.net / reportData.financial.gross) * 100).toFixed(1)}%`
                                                : 'Sem faturamento para cálculo de margem'
                                        }
                                    />
                                </div>
                            </div>
                        )}

                        {/* Expenses */}
                        {activeTab === 'expenses' && (
                            <div className="animate-fade-in">
                                <h3 style={{ fontSize: '1.25rem', marginBottom: '24px' }}>Detalhamento de Despesas</h3>
                                <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead style={{ background: 'rgba(255,255,255,0.02)' }}>
                                            <tr>
                                                <TableHeader>Descrição</TableHeader>
                                                <TableHeader>Data</TableHeader>
                                                <TableHeader>Valor</TableHeader>
                                                <TableHeader>% do Total</TableHeader>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {reportData.expenses.map((e, idx) => (
                                                <tr key={idx} style={{ background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                                                    <TableCell bold>{e.nome}</TableCell>
                                                    <TableCell>{format(new Date(e.data), 'dd/MM/yyyy')}</TableCell>
                                                    <TableCell align="right" color="#F87171" bold>{formatCurrency(e.valor)}</TableCell>
                                                    <TableCell align="right">{e.percentage.toFixed(1)}%</TableCell>
                                                </tr>
                                            ))}
                                            {reportData.expenses.length === 0 && (
                                                <tr><td colSpan="4" style={{ padding: '64px', textAlign: 'center', color: 'var(--color-text-muted)' }}>Nenhuma despesa registrada.</td></tr>
                                            )}
                                        </tbody>
                                        <tfoot style={{ background: 'rgba(255,255,255,0.05)', fontWeight: 'bold' }}>
                                            <tr>
                                                <td style={{ padding: '16px' }} colSpan="2">TOTAL</td>
                                                <td style={{ padding: '16px', textAlign: 'right', color: '#F87171' }}>{formatCurrency(reportData.financial.expenseTotal)}</td>
                                                <td></td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Client List */}
                        {activeTab === 'client_list' && (
                            <div className="animate-fade-in">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                    <h3 style={{ fontSize: '1.25rem' }}>Lista Completa de Clientes</h3>
                                    <span style={{
                                        padding: '6px 12px',
                                        background: 'rgba(255,255,255,0.1)',
                                        borderRadius: '20px',
                                        fontSize: '0.85rem',
                                        color: 'white'
                                    }}>
                                        {reportData.clientList.length} clientes
                                    </span>
                                </div>
                                <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead style={{ background: 'rgba(255,255,255,0.02)' }}>
                                            <tr>
                                                <TableHeader>Nome</TableHeader>
                                                <TableHeader>Contato</TableHeader>
                                                <TableHeader>Endereço</TableHeader>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {reportData.clientList.map((c, idx) => (
                                                <tr key={idx} style={{ background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                                                    <TableCell bold>{c.nome}</TableCell>
                                                    <TableCell>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                            <span>{c.telefone || '-'}</span>
                                                            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{c.email}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', lineHeight: '1.4' }}>
                                                            {c.rua && <span>{c.rua}, {c.numero || 'S/N'}</span>}
                                                            {c.bairro && <span><br />{c.bairro} - {c.cidade}</span>}
                                                        </div>
                                                    </TableCell>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

export default Reports
