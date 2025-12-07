import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext()

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // Check active session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null)
            setLoading(false)
        })

        // Listen for changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null)
            setLoading(false)
        })

        return () => subscription.unsubscribe()
    }, [])

    const signUp = (email, password) => supabase.auth.signUp({ email, password })
    const signIn = (email, password) => supabase.auth.signInWithPassword({ email, password })
    const signOut = () => supabase.auth.signOut()

    return (
        <AuthContext.Provider value={{ user, signUp, signIn, signOut, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)
