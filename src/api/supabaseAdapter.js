import { supabase } from './supabaseClient'

// Base44 entity name → Supabase table name
const TABLE_MAP = {
  CalendarEvent:   'calendar_events',
  Duel:            'duels',
  ElaborationPost: 'elaboration_posts',
  LibraryResource: 'library_resources',
  Notification:    'notifications',
  Question:        'questions',
  QuestionReport:  'question_reports',
  Scroll:          'scrolls',
  StudyDiary:      'study_diaries',
  StudyRoom:       'study_rooms',
  StudySession:    'study_sessions',
  Suggestion:      'suggestions',
  Tournament:      'tournaments',
  UserProfile:     'user_profiles',
  User:            'public_users',
}

// Parse Base44 sort string (e.g. '-created_date') into Supabase order options
const parseSort = (sort) => {
  if (!sort) return null
  const desc = sort.startsWith('-')
  return { column: desc ? sort.slice(1) : sort, ascending: !desc }
}

// Normalize a Supabase row: rename created_at → created_date if needed
const normalize = (row) => {
  if (!row) return row
  if (row.created_at && !row.created_date) {
    row.created_date = row.created_at
  }
  return row
}

const handleError = (error, context) => {
  if (error) {
    const err = new Error(error.message || `Supabase error in ${context}`)
    err.status = error.code === 'PGRST116' ? 404 : 500
    err.details = error
    throw err
  }
}

// Factory: creates entity adapter for a given table name
const createEntity = (tableName) => ({
  async list(sort, limit) {
    let query = supabase.from(tableName).select('*')
    const s = parseSort(sort)
    if (s) query = query.order(s.column, { ascending: s.ascending })
    if (limit) query = query.limit(limit)
    const { data, error } = await query
    handleError(error, `${tableName}.list`)
    return (data || []).map(normalize)
  },

  async filter(conditions = {}, sort, limit) {
    let query = supabase.from(tableName).select('*')
    Object.entries(conditions).forEach(([key, value]) => {
      query = query.eq(key, value)
    })
    const s = parseSort(sort)
    if (s) query = query.order(s.column, { ascending: s.ascending })
    if (limit) query = query.limit(limit)
    const { data, error } = await query
    handleError(error, `${tableName}.filter`)
    return (data || []).map(normalize)
  },

  async get(id) {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .eq('id', id)
      .single()
    handleError(error, `${tableName}.get`)
    return normalize(data)
  },

  async create(data) {
    const { data: created, error } = await supabase
      .from(tableName)
      .insert(data)
      .select()
      .single()
    handleError(error, `${tableName}.create`)
    return normalize(created)
  },

  async update(id, data) {
    const { data: updated, error } = await supabase
      .from(tableName)
      .update(data)
      .eq('id', id)
      .select()
      .single()
    handleError(error, `${tableName}.update`)
    return normalize(updated)
  },

  async delete(id) {
    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq('id', id)
    handleError(error, `${tableName}.delete`)
  },

  subscribe(callback) {
    const channelName = `${tableName}-${Date.now()}`
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: tableName },
        (payload) => callback({ data: payload.new, event: payload.eventType, old: payload.old })
      )
      .subscribe()
    return () => supabase.removeChannel(channel)
  },
})

// Auth adapter — same interface as base44.auth.*
const auth = {
  async me() {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
      const err = new Error('Not authenticated')
      err.status = 401
      throw err
    }
    return {
      id: user.id,
      email: user.email,
      role: user.user_metadata?.role ?? 'user',
      full_name: user.user_metadata?.full_name ?? '',
    }
  },

  async loginViaEmailPassword(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error(error.message)
  },

  loginWithProvider(provider, redirectTo = '/') {
    supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}${redirectTo}` },
    })
  },

  async logout(redirectUrl) {
    await supabase.auth.signOut()
    window.location.href = redirectUrl ?? '/sign-in'
  },

  redirectToLogin() {
    window.location.href = '/sign-in'
  },

  async register({ email, password }) {
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) throw new Error(error.message)
  },

  async verifyOtp({ email, otpCode }) {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: otpCode,
      type: 'signup',
    })
    if (error) throw new Error(error.message)
    return { access_token: data.session?.access_token }
  },

  async resendOtp(email) {
    const { error } = await supabase.auth.resend({ email, type: 'signup' })
    if (error) throw new Error(error.message)
  },

  async resetPasswordRequest(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) throw new Error(error.message)
  },

  async resetPassword({ password }) {
    const { error } = await supabase.auth.updateUser({ password })
    if (error) throw new Error(error.message)
  },

  setToken() {
    // Supabase manages sessions automatically — no-op
  },

  async updateMe(data) {
    const { error } = await supabase.auth.updateUser({
      data: { ...data },
    })
    if (error) throw new Error(error.message)
    return this.me()
  },
}

// Integrations adapter — calls Supabase Edge Functions for AI
const integrations = {
  Core: {
    async InvokeLLM({ prompt, response_json_schema }) {
      const { data, error } = await supabase.functions.invoke('invoke-llm', {
        body: { prompt, response_json_schema },
      })
      if (error) throw new Error(error.message || 'Error calling AI')
      return data
    },

    async UploadFile({ file }) {
      const ext = file.name.split('.').pop()
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { data, error } = await supabase.storage
        .from('neurolearn-files')
        .upload(path, file, { cacheControl: '3600', upsert: false })
      if (error) throw new Error(error.message)
      const { data: { publicUrl } } = supabase.storage
        .from('neurolearn-files')
        .getPublicUrl(data.path)
      return { file_url: publicUrl }
    },

    async ExtractDataFromUploadedFile({ file_url, json_schema }) {
      const { data, error } = await supabase.functions.invoke('extract-file', {
        body: { file_url, json_schema },
      })
      if (error) throw new Error(error.message || 'Error extracting file data')
      return data
    },
  },
}

// Build entities object from TABLE_MAP
const entities = Object.fromEntries(
  Object.entries(TABLE_MAP).map(([entityName, tableName]) => [
    entityName,
    createEntity(tableName),
  ])
)

export const supabaseAdapter = { auth, entities, integrations }
