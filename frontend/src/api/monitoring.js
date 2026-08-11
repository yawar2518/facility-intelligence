import apiClient from './client'

// Auth
export const login = (username, password) =>
  apiClient.post('/auth/token/', { username, password })

// Facility endpoints
export const getFacilities = () =>
  apiClient.get('/facilities/')

export const getFacilityHealth = (facilityId) =>
  apiClient.get(`/monitoring/facilities/${facilityId}/health/`)

export const getFacilityDeviceTree = (facilityId) =>
  apiClient.get(`/monitoring/facilities/${facilityId}/devices/`)

export const getFacilityStatusChanges = (facilityId, limit = 50) =>
  apiClient.get(`/monitoring/facilities/${facilityId}/status-changes/?limit=${limit}`)

// Area endpoints
export const getAreaHealth = (areaId) =>
  apiClient.get(`/monitoring/areas/${areaId}/health/`)

// Device endpoints
export const getDeviceUptime = (deviceId, days = 7) =>
  apiClient.get(`/monitoring/devices/${deviceId}/uptime/?days=${days}`)