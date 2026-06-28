import { supabaseAdapter } from './supabaseAdapter'

// Drop-in replacement for @base44/sdk — same interface, backed by Supabase
export const base44 = supabaseAdapter
