import { afterEach, describe, expect, it, vi } from 'vitest';
import { laboratories, login, request, snapshot } from './api';
afterEach(() => vi.unstubAllGlobals());
describe('contrato do Control Plane', () => {
  it('envia o bearer e o corpo JSON ao criar recursos', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ edgeId: 'EDGE-1' }), { status: 201 }));
    vi.stubGlobal('fetch', fetch);
    await request('test-token', 'edges', 'POST', { tenantId: 'T', laboratoryId: 'L', edgeId: 'EDGE-1' });
    expect(fetch).toHaveBeenCalledWith('/api/v1/control/edges', expect.objectContaining({ method: 'POST', headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' }, body: JSON.stringify({ tenantId: 'T', laboratoryId: 'L', edgeId: 'EDGE-1' }) }));
  });
  it('consulta todos os recursos com o tenant codificado', async () => {
    const fetch = vi.fn().mockImplementation(() => Promise.resolve(new Response('{"laboratories":[],"edges":[],"events":[],"ingestion":{"total":7,"accepted":0,"readyForDelivery":7,"delivered":0,"routingFailed":0,"deliveryFailed":0,"deadLetter":0,"latestAcceptedAt":"2026-09-05T22:00:00Z"}}')));
    vi.stubGlobal('fetch', fetch);
    expect(await snapshot('token', 'tenant/a & b')).toEqual({ laboratories: [], edges: [], events: [], ingestion: { total: 7, accepted: 0, readyForDelivery: 7, delivered: 0, routingFailed: 0, deliveryFailed: 0, deadLetter: 0, latestAcceptedAt: '2026-09-05T22:00:00Z' } });
    expect(fetch).toHaveBeenCalledWith('/api/v1/panel/laboratories/tenant%2Fa%20%26%20b/dashboard', expect.objectContaining({ method: 'GET', headers: { Authorization: 'Bearer token' } }));
  });
  it('autentica no painel antes de listar laboratórios', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ token: 'session-token', expiresAt: '2026-09-05T20:00:00Z' })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [{ laboratoryId: 'LAB-1', name: 'Lab', code: 'LAB', timezone: 'UTC', enabled: true }] })));
    vi.stubGlobal('fetch', fetch);
    await expect(login('admin@test.local', 'password')).resolves.toEqual({ token: 'session-token', expiresAt: '2026-09-05T20:00:00Z' });
    await expect(laboratories('session-token')).resolves.toHaveLength(1);
    expect(fetch.mock.calls.map(c => c[0])).toEqual(['/api/v1/panel/login', '/api/v1/panel/laboratories']);
  });
  it('mostra falha de autenticação sem expor o token', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 401 })));
    await expect(request('secret-token', 'tenants')).rejects.toThrow('Token administrativo inválido');
  });
  it('preserva os detalhes de validação retornados pelo backend', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { message: 'Invalid resource', details: { public_id: ['has already been taken'] } } }), { status: 422 })));
    await expect(request('token', 'edges')).rejects.toThrow('has already been taken');
  });
  it('não interpreta HTML de um proxy como dados válidos', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>')));
    await expect(request('token', 'tenants')).rejects.toThrow('resposta inválida');
  });
});
