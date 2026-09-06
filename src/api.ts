export type Tenant = { tenantId: string; name: string; enabled: boolean };
export type Laboratory = { laboratoryId: string; name: string; code: string; timezone: string; enabled: boolean; tenantId?: string; tenantName?: string };
export type Edge = { edgeId: string; installationId: string; enabled: boolean; provisioningStatus: string; lastSeenAt: string | null; activatedAt: string | null };
export type AuditEvent = { action: string; resourceType: string; resourceId: string; insertedAt: string };
export type IngestionSummary = { total: number; accepted: number; readyForDelivery: number; delivered: number; routingFailed: number; deliveryFailed: number; deadLetter: number; latestAcceptedAt: string | null };
export type Snapshot = { laboratory?: Laboratory; laboratories: Laboratory[]; edges: Edge[]; events: AuditEvent[]; ingestion?: IngestionSummary };
export type Session = { token: string; expiresAt: string };
export async function request<T>(token: string, path: string, method = 'GET', body?: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`/api/v1/control/${path}`, { method, signal, headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401) throw new Error('Token administrativo inválido ou expirado. Verifique sua conexão.');
    throw new Error(data?.error ? `${data.error.message}${data.error.details ? ' ' + JSON.stringify(data.error.details) : ''}` : `Não foi possível acessar a API (HTTP ${response.status}).`);
  }
  if (data === null) throw new Error('A API retornou uma resposta inválida.');
  return data as T;
}
async function panelRequest<T>(token: string, path: string, method = 'GET', body?: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`/api/v1/panel/${path}`, { method, signal, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401) throw new Error('Login inválido ou sessão expirada.');
    throw new Error(data?.error ? data.error.message : `Não foi possível acessar a API (HTTP ${response.status}).`);
  }
  if (data === null) throw new Error('A API retornou uma resposta inválida.');
  return data as T;
}
export async function login(email: string, password: string, signal?: AbortSignal): Promise<Session> {
  return panelRequest<Session>('', 'login', 'POST', { email, password }, signal);
}
export async function laboratories(token: string, signal?: AbortSignal): Promise<Laboratory[]> {
  const result = await panelRequest<{ data: Laboratory[] }>(token, 'laboratories', 'GET', undefined, signal);
  return result.data;
}
export async function snapshot(token: string, laboratoryId: string, signal?: AbortSignal): Promise<Snapshot> {
  return panelRequest<Snapshot>(token, `laboratories/${encodeURIComponent(laboratoryId)}/dashboard`, 'GET', undefined, signal);
}
