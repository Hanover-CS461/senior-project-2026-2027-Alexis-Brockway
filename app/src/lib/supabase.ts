import { createClient } from '@supabase/supabase-js'
import { parseAuthLinkError } from './authLink'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * Captured here, before createClient exists, because the client rewrites the
 * fragment while it works out whether the URL carries a session. A failed
 * sign-in or recovery link (#error=…) produces no session and fires no auth
 * event, so this is the only chance to notice it.
 */
export const authLinkError = parseAuthLinkError(window.location.hash)

export const supabase = createClient(supabaseUrl, supabaseAnonKey)