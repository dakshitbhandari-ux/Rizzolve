const BUILD_SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\\/+$/, '')
const BUILD_SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
const SESSION_KEY = 'rizzolve.auth.session.v1'

let runtimeConfigPromise = null

async function getSupabaseConfig() {
  if (BUILD_SUPABASE_URL && BUILD_SUPABASE_ANON_KEY) {
    return { url: BUILD_SUPABASE_URL, anonKey: BUILD_SUPABASE_ANON_KEY }
  }

  if (!runtimeConfigPromise) {
    runtimeConfigPromise = fetch('/runtime-config.json', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Runtime configuration endpoint returned HTTP ' + response.status)
        const config = await response.json()
        return {
          url: (config.supabaseUrl || '').replace(/\\/+$/, ''),
          anonKey: config.supabaseAnonKey || '',
        }
      })
      .catch(() => ({ url: '', anonKey: '' }))
  }

  const config = await runtimeConfigPromise
  if (!config.url || !config.anonKey) {
    throw new Error('Supabase settings are not reaching the running app. Confirm VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in Embarko, then restart/redeploy RIZZOLVE.')
  }
  return config
}

function getStoredSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY) || 'null')
  } catch {
    return null
  }
}

function saveSession(session, rememberMe = true) {
  if (!session?.access_token) return
  const expiresAt = session.expires_at || Math.floor(Date.now() / 1000) + (session.expires_in || 3600)
  const storage = rememberMe ? localStorage : sessionStorage
  const otherStorage = rememberMe ? sessionStorage : localStorage
  otherStorage.removeItem(SESSION_KEY)
  storage.setItem(SESSION_KEY, JSON.stringify({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: expiresAt,
  }))
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY)
  sessionStorage.removeItem(SESSION_KEY)
}

function authError(payload, status) {
  const message = payload?.msg || payload?.message || payload?.error_description || payload?.error
  if (status === 400 && /invalid login credentials/i.test(message || '')) {
    return new Error('The email or password is incorrect. Please try again.')
  }
  if (/email not confirmed/i.test(message || '')) {
    return new Error('Please verify your email using the confirmation link we sent you.')
  }
  if (/user already registered/i.test(message || '')) {
    return new Error('An account with this email already exists. Sign in instead.')
  }
  return new Error(message || 'Authentication failed. Please try again.')
}

async function authRequest(path, { method = 'POST', body, accessToken } = {}) {
  const config = await getSupabaseConfig()
  const response = await fetch(`${config.url}/auth/v1/${path}`, {
    method,
    headers: {
      apikey: config.anonKey,
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw authError(payload, response.status)
  return payload
}

async function fetchUserProfile(accessToken, userId) {
  try {
    const config = await getSupabaseConfig()
    const query = new URLSearchParams({
      select: 'name,email,student_id,course,semester,reputation',
      id: 'eq.' + userId,
    })
    const response = await fetch(`${config.url}/rest/v1/profiles?${query.toString()}`, {
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${accessToken}`,
      },
    })
    if (!response.ok) return null
    const rows = await response.json().catch(() => [])
    return Array.isArray(rows) ? rows[0] || null : null
  } catch {
    return null
  }
}

function toAppUser(user, profile) {
  if (!user) return null
  const metadata = user.user_metadata || {}
  const fullName = profile?.name || metadata.full_name || metadata.name || user.email?.split('@')[0] || 'Student'
  return {
    id: user.id,
    fullName,
    email: user.email || profile?.email || '',
    studentId: profile?.student_id || metadata.student_id || '',
    course: profile?.course || metadata.course || 'Not specified',
    semester: profile?.semester || metadata.semester || 'Not specified',
    tokenBalance: Number(profile?.reputation ?? 0),
    role: 'student',
  }
}

async function fetchCurrentUser(accessToken) {
  const user = await authRequest('user', { method: 'GET', accessToken })
  const profile = await fetchUserProfile(accessToken, user.id)
  return toAppUser(user, profile)
}

export async function signInWithEmail(email, password, rememberMe = true) {
  const result = await authRequest('token?grant_type=password', {
    body: { email: email.trim().toLowerCase(), password },
  })
  saveSession(result, rememberMe)
  return await fetchCurrentUser(result.access_token)
}

export async function signUpWithEmail({ fullName, email, studentId, course, semester, password }) {
  const redirectTo = window.location.origin
  const result = await authRequest(`signup?redirect_to=${encodeURIComponent(redirectTo)}`, {
    body: {
      email: email.trim().toLowerCase(),
      password,
      data: {
        full_name: fullName.trim(),
        student_id: studentId.trim(),
        course,
        semester,
      },
    },
  })

  if (result.access_token) {
    saveSession(result)
    const user = await fetchCurrentUser(result.access_token)
    return { user, confirmationRequired: false }
  }

  return { user: null, confirmationRequired: true }
}

export async function requestPasswordReset(email) {
  const redirectTo = window.location.origin
  await authRequest(`recover?redirect_to=${encodeURIComponent(redirectTo)}`, {
    body: { email: email.trim().toLowerCase() },
  })
}

export async function updateAccountPassword(password) {
  const session = getStoredSession()
  if (!session?.access_token) throw new Error('Your password-reset session has expired. Request a new reset email.')
  await authRequest('user', {
    method: 'PUT',
    accessToken: session.access_token,
    body: { password },
  })
  clearSession()
}

export async function signOut() {
  const session = getStoredSession()
  try {
    if (session?.access_token) {
      await authRequest('logout', { accessToken: session.access_token })
    }
  } finally {
    clearSession()
  }
}

export async function restoreAuthSession() {
  const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const redirectedAccessToken = fragment.get('access_token')
  if (redirectedAccessToken) {
    const redirectedSession = {
      access_token: redirectedAccessToken,
      refresh_token: fragment.get('refresh_token'),
      expires_in: Number(fragment.get('expires_in') || 3600),
    }
    saveSession(redirectedSession)
    const recovery = fragment.get('type') === 'recovery'
    window.history.replaceState({}, document.title, window.location.pathname + window.location.search)
    if (recovery) return { user: null, recovery: true }
    return { user: await fetchCurrentUser(redirectedSession.access_token), recovery: false }
  }

  let session = getStoredSession()
  if (!session?.access_token) return { user: null, recovery: false }

  if (session.expires_at && session.expires_at <= Math.floor(Date.now() / 1000) + 60) {
    if (!session.refresh_token) {
      clearSession()
      return { user: null, recovery: false }
    }
    try {
      const refreshed = await authRequest('token?grant_type=refresh_token', {
        body: { refresh_token: session.refresh_token },
      })
      saveSession(refreshed)
      session = getStoredSession()
    } catch {
      clearSession()
      return { user: null, recovery: false }
    }
  }

  try {
    return { user: await fetchCurrentUser(session.access_token), recovery: false }
  } catch {
    clearSession()
    return { user: null, recovery: false }
  }
}
