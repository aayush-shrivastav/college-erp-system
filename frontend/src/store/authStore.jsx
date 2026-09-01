// src/store/authStore.jsx
import { createContext, useContext, useReducer } from 'react'

const AuthContext = createContext(null)

function reducer(state, action) {
  switch (action.type) {
    case 'LOGIN':  return { user: action.payload, isLoggedIn: true }
    case 'LOGOUT': return { user: null, isLoggedIn: false }
    default:       return state
  }
}

function getInitial() {
  try {
    const token = localStorage.getItem('accessToken')
    const user  = JSON.parse(localStorage.getItem('user') || 'null')
    if (token && user) return { user, isLoggedIn: true }
  } catch {}
  return { user: null, isLoggedIn: false }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, null, getInitial)

  function login(userData, accessToken, refreshToken) {
    localStorage.setItem('accessToken',  accessToken)
    localStorage.setItem('refreshToken', refreshToken)
    localStorage.setItem('user', JSON.stringify(userData))
    dispatch({ type: 'LOGIN', payload: userData })
  }

  function logout() {
    localStorage.clear()
    dispatch({ type: 'LOGOUT' })
  }

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
