import apiClient from './client'
import client from './client'
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

export const getFacilityStatusChanges = (facilityId, limit = 50, offset = 0) =>
  apiClient.get(`/monitoring/facilities/${facilityId}/status-changes/?limit=${limit}&offset=${offset}`)

// Area endpoints
export const getAreaHealth = (areaId) =>
  apiClient.get(`/monitoring/areas/${areaId}/health/`)

// Device endpoints
export const getDeviceUptime = (deviceId, days = 7) =>
  apiClient.get(`/monitoring/devices/${deviceId}/uptime/?days=${days}`)


export async function getAnomalies(filters = {}) {
  const params = new URLSearchParams()

  if (filters.facility)        params.append('facility', filters.facility)
  if (filters.severity)        params.append('severity', filters.severity)
  if (filters.anomaly_type)    params.append('anomaly_type', filters.anomaly_type)
  if (filters.is_acknowledged !== undefined) {
    params.append('is_acknowledged', filters.is_acknowledged)
  }

  const query = params.toString()
  const url = query ? `/ml/anomalies/?${query}` : '/ml/anomalies/'

  const response = await client.get(url)
  return response.data
}

export async function acknowledgeAnomaly(anomalyId) {
  const response = await client.post(`/ml/anomalies/${anomalyId}/acknowledge/`)
  return response.data
}

export async function getLaneForecast(laneId) {
  const response = await client.get(`/ml/forecasts/?lane=${laneId}`)
  return response.data
}

export async function getLaneHistory(laneId, hours = 12) {
  const response = await client.get(`/ml/forecasts/history/?lane=${laneId}&hours=${hours}`)
  return response.data
}