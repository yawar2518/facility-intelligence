import axios from 'axios'

// Base axios instance — all API calls go through this
const apiClient = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor — attaches JWT token to every request
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

function redirectToLogin() {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  window.location.href = '/login'
}

// A single in-flight refresh call shared by every request that hits a
// 401 at (roughly) the same moment — e.g. a page firing several API
// calls at once when the access token has just expired. Without this,
// each of those would race to refresh independently.
let refreshPromise = null

// Response interceptor — silently renews an expired access token
// instead of bouncing the user back to the login screen mid-session.
// The access token is short-lived by design (see SIMPLE_JWT in the
// backend settings); previously any request made after it expired hit
// this 401 and immediately wiped storage + redirected, which is what
// showed up as "suddenly back at the sign-in page" during normal use.
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    const status = error.response?.status

    // A 401 from the login call itself isn't a session expiring — it's
    // the login attempt failing (wrong credentials). That should reject
    // straight back to the caller (LoginPage's own catch block) instead
    // of running the "session expired, redirect to /login" path below —
    // which, since we're already on /login, just silently reloaded the
    // page and swallowed the actual error the user needed to see.
    if (originalRequest?.url?.startsWith('/auth/token/')) {
      return Promise.reject(error)
    }

    if (status !== 401 || !originalRequest || originalRequest._retry) {
      if (status === 401) redirectToLogin()
      return Promise.reject(error)
    }

    const refreshToken = localStorage.getItem('refresh_token')
    if (!refreshToken) {
      redirectToLogin()
      return Promise.reject(error)
    }

    originalRequest._retry = true

    try {
      if (!refreshPromise) {
        // Plain `axios`, not `apiClient` — this call must not go
        // through the interceptors above, or a failed refresh would
        // recurse back into this same handler.
        refreshPromise = axios
          .post('/api/v1/auth/token/refresh/', { refresh: refreshToken })
          .then((res) => {
            localStorage.setItem('access_token', res.data.access)
            return res.data.access
          })
          .finally(() => {
            refreshPromise = null
          })
      }

      const newAccessToken = await refreshPromise
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
      return apiClient(originalRequest)
    } catch {
      // The refresh token itself is expired, revoked, or invalid —
      // there's genuinely no session left to recover.
      redirectToLogin()
      return Promise.reject(error)
    }
  }
)

export default apiClient
