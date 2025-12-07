import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const Register = () => {
    const { signUp } = useAuth()
    const navigate = useNavigate()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        try {
            const { error } = await signUp(email, password)
            if (error) throw error
            alert('Cadastro realizado! Verifique seu email para confirmar.')
            navigate('/login')
        } catch (err) {
            setError('Falha no cadastro. ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'radial-gradient(circle at center, #162B55 0%, #050C1C 100%)'
        }}>
            <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '400px', padding: '40px' }}>
                <h1 className="text-gradient" style={{ textAlign: 'center', marginBottom: '10px' }}>Criar Conta</h1>
                <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', marginBottom: '30px' }}>Inicie sua jornada no RevendaLocal</p>

                {error && <div style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#F87171', padding: '10px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.9rem', textAlign: 'center' }}>{error}</div>}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div>
                        <label>Email</label>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="seu@email.com" />
                    </div>
                    <div>
                        <label>Senha</label>
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Sua senha forte" />
                    </div>

                    <button disabled={loading} className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }}>
                        {loading ? 'Criando...' : 'Cadastrar'}
                    </button>
                </form>

                <p style={{ marginTop: '20px', textAlign: 'center', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                    Já tem uma conta? <Link to="/login" style={{ color: '#1EDD88', fontWeight: '600' }}>Entrar</Link>
                </p>
            </div>
        </div>
    )
}

export default Register
