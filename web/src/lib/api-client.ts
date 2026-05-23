import type { Category, Service } from '../types';

type ServiceInput = Partial<Service>;
type CategoryInput = Partial<Category>;

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(typeof body.error === 'string' ? body.error : 'Request failed');
  }
  return response.json();
}

export function getCategories() {
  return request<Category[]>('/api/categories');
}

export function createService(service: ServiceInput) {
  return request<Service>('/api/services', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(service),
  });
}

export function updateService(service: ServiceInput) {
  const id = service.id;
  if (!id) throw new Error('id is required');
  return request<Service>(`/api/services?id=${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(service),
  });
}

export function deleteCategory(id: string) {
  return request<{ success: true }>(`/api/categories?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export function deleteService(id: string) {
  return request<{ success: true }>(`/api/services?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export function createCategory(category: CategoryInput) {
  return request<Category>('/api/categories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(category),
  });
}

export function updateCategory(category: CategoryInput) {
  const id = category.id;
  if (!id) throw new Error('id is required');
  return request<Category>(`/api/categories?id=${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(category),
  });
}