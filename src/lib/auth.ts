import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth'
import { auth, googleProvider } from './firebase'

export const signInGoogle = () => signInWithPopup(auth, googleProvider)
export const logout = () => signOut(auth)
export const watchAuth = (cb: (user: User | null) => void) => onAuthStateChanged(auth, cb)
