// API helper for PHP backend
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://www.quicktemplatepro.com/bodymaster';

export async function apiGet(endpoint: string) {
  const response = await fetch(`${API_URL}/${endpoint}`);
  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }
  return response.json();
}

export async function apiPost(endpoint: string, data: any) {
  const response = await fetch(`${API_URL}/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `API Error: ${response.status}`);
  }
  return response.json();
}

export async function apiPut(endpoint: string, data: any) {
  const response = await fetch(`${API_URL}/${endpoint}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `API Error: ${response.status}`);
  }
  return response.json();
}

export async function apiDelete(endpoint: string) {
  const response = await fetch(`${API_URL}/${endpoint}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `API Error: ${response.status}`);
  }
  return response.json();
}

export { API_URL };

