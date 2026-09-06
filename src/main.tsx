import React, { useEffect, useState, type FormEvent } from 'react';
import { createRoot } from 'react-dom/client';
import { Activity, ArrowRight, Building2, Check, ChevronDown, CircleHelp, Cpu, FlaskConical, LayoutDashboard, LoaderCircle, LogOut, Moon, RefreshCw, Search, ShieldCheck, Sun } from 'lucide-react';
import { laboratories, login, snapshot, type AuditEvent, type Edge, type Laboratory, type Session, type Snapshot } from './api';
import './styles.css';

type Page = 'overview' | 'edges' | 'audit';
const pages: Record<Page, string> = { overview: 'Visão geral', edges: 'Edges', audit: 'Auditoria' };
const empty: Snapshot = { laboratories: [], edges: [], events: [] };
const ingestionPollMs = 3000;

const formatDate = (date: string | null) =>
  date ? new Date(date).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'Sem contato';
const count = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : 0;

function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('interfaceamento-theme');
      if (saved === 'light' || saved === 'dark') return saved;
    } catch { /* Theme persistence is optional. */ }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  const [session, setSession] = useState<Session | null>(() => {
    try {
      const saved = localStorage.getItem('interfaceamento-session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [availableLabs, setAvailableLabs] = useState<Laboratory[]>([]);
  const [selectedLab, setSelectedLab] = useState('');
  const [page, setPage] = useState<Page>('overview');
  const [data, setData] = useState<Snapshot>(empty);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('interfaceamento-theme', theme); } catch { /* Theme still works without storage. */ }
  }, [theme]);

  useEffect(() => {
    if (!session) return;
    try { localStorage.setItem('interfaceamento-session', JSON.stringify(session)); } catch { /* Session remains in memory. */ }
  }, [session]);

  useEffect(() => {
    if (!session || selectedLab) return;
    const controller = new AbortController();
    setBusy(true); setError('');
    laboratories(session.token, controller.signal)
      .then(setAvailableLabs)
      .catch(e => { setError((e as Error).message); logout(false); })
      .finally(() => setBusy(false));
    return () => controller.abort();
  }, [session, selectedLab]);

  useEffect(() => {
    if (!session || !selectedLab) return;
    const controller = new AbortController();
    setBusy(true); setError('');
    snapshot(session.token, selectedLab, controller.signal)
      .then(next => {
        setData(next);
        setAvailableLabs(current => current.length ? current : next.laboratories);
      })
      .catch(e => setError((e as Error).message))
      .finally(() => setBusy(false));
    return () => controller.abort();
  }, [session, selectedLab, revision]);

  useEffect(() => {
    if (!session || !selectedLab) return;
    let stopped = false;
    let controller: AbortController | null = null;

    const refreshIngestion = async () => {
      if (stopped || document.hidden) return;
      controller?.abort();
      controller = new AbortController();

      try {
        const next = await snapshot(session.token, selectedLab, controller.signal);
        if (!stopped && next.ingestion) {
          setData(current => ({ ...current, ingestion: next.ingestion }));
        }
      } catch (error) {
        if (!stopped && !(error instanceof DOMException && error.name === 'AbortError')) {
          setError((error as Error).message);
        }
      }
    };

    const timer = window.setInterval(refreshIngestion, ingestionPollMs);
    const refreshWhenVisible = () => {
      if (!document.hidden) void refreshIngestion();
    };

    document.addEventListener('visibilitychange', refreshWhenVisible);

    return () => {
      stopped = true;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
      controller?.abort();
    };
  }, [session, selectedLab]);

  function logout(clearError = true) {
    setSession(null);
    setSelectedLab('');
    setAvailableLabs([]);
    setData(empty);
    setPage('overview');
    setSearch('');
    setFilter('all');
    if (clearError) setError('');
    try { localStorage.removeItem('interfaceamento-session'); } catch { /* Nothing to clear. */ }
  }

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true); setError('');
    try {
      setSession(await login(String(form.get('email')), String(form.get('password'))));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function navigate(next: Page) {
    setPage(next);
    setSearch('');
    setFilter('all');
  }

  const laboratory = data.laboratory || availableLabs.find(lab => lab.laboratoryId === selectedLab);
  const active = data.edges.filter(edge => edge.enabled).length;
  const pending = data.edges.filter(edge => edge.provisioningStatus === 'pending_activation').length;
  const ingestion = data.ingestion;
  const ingestionFailures = ingestion ? count(ingestion.routingFailed) + count(ingestion.deliveryFailed) + count(ingestion.deadLetter) : 0;
  const matches = (value: string, enabled: boolean) =>
    value.toLowerCase().includes(search.toLowerCase()) && (filter === 'all' || enabled === (filter === 'enabled'));

  if (!session) {
    return <Shell theme={theme} setTheme={setTheme}><section className="auth-card"><div className="auth-heading"><span className="auth-mark"><Building2 size={22}/></span><h1>Entrar</h1><p>Use sua conta administrativa para acessar os laboratórios.</p></div><form onSubmit={submitLogin}><label>E-mail<input name="email" type="email" required autoComplete="username" placeholder="admin@interfaceamento.local"/></label><label>Senha<input name="password" type="password" required autoComplete="current-password" placeholder="Senha"/></label>{error && <div role="alert" className="alert error">{error}</div>}<button className="button primary auth-submit" disabled={busy}>{busy ? <LoaderCircle className="spin" size={17}/> : null}Entrar</button></form></section></Shell>;
  }

  if (!selectedLab) {
    return <Shell theme={theme} setTheme={setTheme} onLogout={logout}><section className="auth-card lab-picker"><div className="auth-heading"><span className="auth-mark"><FlaskConical size={22}/></span><h1>Laboratório</h1><p>Escolha o escopo do dashboard.</p></div>{error && <div role="alert" className="alert error">{error}</div>}<label className="auth-select">Laboratório<span><select value={selectedLab} disabled={busy || !availableLabs.length} onChange={event => setSelectedLab(event.target.value)}><option value="" disabled>{busy ? 'Carregando...' : 'Selecione'}</option>{availableLabs.map(lab => <option key={lab.laboratoryId} value={lab.laboratoryId}>{lab.name}</option>)}</select><ChevronDown size={15}/></span></label>{!busy && !availableLabs.length && <div className="empty">Nenhum laboratório disponível.</div>}</section></Shell>;
  }

  const filteredEdges = data.edges.filter(edge => matches(edge.edgeId + edge.installationId, edge.enabled));
  const filteredEvents = data.events.filter(event => (event.action + event.resourceId).toLowerCase().includes(search.toLowerCase()));

  return <div className="app"><aside className="sidebar"><a className="brand" href="#" onClick={event => { event.preventDefault(); navigate('overview'); }}><span className="brand-icon"><Building2 size={24}/></span><span>interfaceamento<small>CLOUD PLATFORM</small></span></a><div className="workspace"><span className="workspace-avatar">{laboratory?.name.slice(0,2).toUpperCase() || 'LB'}</span><div><small>Laboratório</small><strong>{laboratory?.name || selectedLab}</strong></div></div><div className="nav-label">DASHBOARD</div><nav>{([[LayoutDashboard, 'overview'], [Cpu, 'edges'], [Activity, 'audit']] as const).map(([Icon, id]) => <button className={page === id ? 'selected' : ''} key={id} onClick={() => navigate(id)}><Icon size={19}/>{pages[id]}{id === 'edges' && <span className="nav-count">{data.edges.length}</span>}</button>)}</nav><div className="sidebar-bottom"><button className="connection-button" onClick={() => setSelectedLab('')}><Building2 size={18}/>Trocar laboratório<ArrowRight size={15}/></button><button className="connection-button" onClick={() => logout()}><LogOut size={18}/>Sair<ArrowRight size={15}/></button><div className="profile"><div className="avatar">AD</div><div><strong>Administrador</strong><small>{session.expiresAt ? `Sessão até ${formatDate(session.expiresAt)}` : 'Painel autenticado'}</small></div></div></div></aside>
    <div className="main"><header className="topbar"><div className="breadcrumb">Laboratório <span>/</span> <strong>{laboratory?.name || selectedLab}</strong></div><div className="top-actions"><button className="icon-button theme-toggle" aria-label={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'} title={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'} onClick={() => setTheme(value => value === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? <Sun size={19}/> : <Moon size={19}/>}</button><span className="mode live"><i/>Autenticado</span><button className="icon-button" title="Trocar laboratório" onClick={() => setSelectedLab('')}><CircleHelp size={19}/></button><span className="avatar small-avatar">AD</span></div></header><main><div className="page-heading"><div><div className="eyebrow">OPERAÇÃO DO LABORATÓRIO</div><h1>{pages[page]}</h1><p>{page === 'overview' ? 'Status, Edges e eventos do laboratório selecionado.' : page === 'audit' ? 'Registro administrativo relacionado a este laboratório.' : 'Instalações vinculadas a este laboratório.'}</p></div><div className="heading-actions"><button className="button" disabled={busy} onClick={() => setRevision(value => value + 1)}><RefreshCw size={16} className={busy ? 'spin' : ''}/>Atualizar</button><button className="button" onClick={() => setSelectedLab('')}><Building2 size={16}/>Trocar laboratório</button></div></div>
    {error && <div role="alert" className="alert error">{error}</div>}
    {page === 'overview' ? <><div className="stats">{[[Activity, 'Mensagens recebidas', ingestion ? count(ingestion.total) : '-', ingestion?.latestAcceptedAt ? `Última ${formatDate(ingestion.latestAcceptedAt)}` : 'Sem mensagens recebidas'], [ArrowRight, 'Prontas para entrega', ingestion ? count(ingestion.readyForDelivery) : '-', 'Aguardando roteamento downstream'], [Check, 'Entregues', ingestion ? count(ingestion.delivered) : '-', 'Confirmadas pelo destino'], [ShieldCheck, 'Falhas', ingestion ? ingestionFailures : '-', 'Roteamento, entrega ou dead-letter']].map(([Icon, label, value, detail]) => { const StatIcon = Icon as typeof Cpu; return <section className="stat" key={String(label)}><div><span>{String(label)}</span><StatIcon size={20}/></div><strong>{busy ? '-' : String(value)}</strong><small>{String(detail)}</small></section>; })}</div><section className="panel"><div className="panel-heading"><div><h2>Edges <span className="count">{data.edges.length}</span></h2><p>{active} habilitados, {pending} aguardando ativação.</p></div><button className="text-button" onClick={() => navigate('edges')}>Ver todos <ArrowRight size={16}/></button></div><EdgeTable edges={data.edges.slice(0, 5)} busy={busy}/></section><div className="section-bottom"><section className="panel"><div className="panel-heading"><h2>Atividade recente</h2><button className="text-button" onClick={() => navigate('audit')}>Ver auditoria <ArrowRight size={15}/></button></div><EventList events={data.events.slice(0, 3)}/></section><div className="info-card"><ShieldCheck size={24}/><h3>Escopo aplicado</h3><p>Este dashboard usa apenas o laboratório selecionado após login.</p><span><Check size={15}/>Sem visão geral por tenant</span></div></div></> : <section className="panel"><div className="toolbar"><div className="search"><Search size={18}/><input aria-label="Buscar recursos" placeholder={page === 'audit' ? 'Buscar ação ou recurso...' : 'Buscar Edge ou instalação...'} value={search} onChange={event => setSearch(event.target.value)}/></div>{page === 'edges' && <div className="filter"><select aria-label="Filtrar por status" value={filter} onChange={event => setFilter(event.target.value)}><option value="all">Todos os status</option><option value="enabled">Habilitados</option><option value="disabled">Desabilitados</option></select><ChevronDown size={14}/></div>}</div>{page === 'edges' ? <EdgeTable edges={filteredEdges} busy={busy}/> : <EventTable events={filteredEvents}/>}</section>}
    <footer><span>Interfaceamento Cloud</span><span>Dashboard filtrado por laboratório.</span></footer></main></div></div>;
}

function Shell({ children, theme, setTheme, onLogout }: { children: React.ReactNode; theme: 'light' | 'dark'; setTheme: (next: 'light' | 'dark' | ((current: 'light' | 'dark') => 'light' | 'dark')) => void; onLogout?: () => void }) {
  return <div className="auth-shell"><div className="auth-actions"><button className="icon-button theme-toggle" aria-label={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'} onClick={() => setTheme(value => value === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? <Sun size={18}/> : <Moon size={18}/>}</button>{onLogout && <button className="button" onClick={onLogout}><LogOut size={16}/>Sair</button>}</div><main className="auth-main"><a className="auth-brand" href="#"><span>interfaceamento</span><small>Cloud Platform</small></a>{children}</main></div>;
}

function EdgeTable({ edges, busy }: { edges: Edge[]; busy: boolean }) {
  return <div className="table-scroll"><table><thead><tr><th>Edge / instalação</th><th>Status</th><th>Último contato</th><th>Ação</th></tr></thead><tbody>{edges.map(edge => <tr key={edge.edgeId}><td data-label="Edge"><div className="resource"><span className="resource-icon"><Cpu size={18}/></span><div><strong>{edge.edgeId}</strong><small>{edge.installationId}</small></div></div></td><td data-label="Status"><span className={`badge ${edge.enabled ? 'green' : 'amber'}`}><i/>{edge.enabled ? 'Habilitado' : edge.provisioningStatus === 'pending_activation' ? 'Aguardando ativação' : 'Desabilitado'}</span></td><td data-label="Último contato" className="muted">{formatDate(edge.lastSeenAt)}</td><td data-label="Ação"><div className="row-action"><select aria-label={`Ações para ${edge.edgeId}`} disabled={busy} defaultValue=""><option value="" disabled>Ações</option><option value="details">Ver detalhes</option></select><ChevronDown size={14}/></div></td></tr>)}</tbody></table>{!edges.length && <div className="empty">{busy ? 'Carregando Edges...' : 'Nenhum Edge encontrado.'}</div>}</div>;
}

function EventList({ events }: { events: AuditEvent[] }) {
  return <>{events.map((event, index) => <div className="event" key={index}><span className="event-icon"><Activity size={16}/></span><div><strong>{event.action}</strong><small>{event.resourceId}</small></div><time>{formatDate(event.insertedAt)}</time></div>)}{!events.length && <div className="empty">Nenhuma atividade registrada.</div>}</>;
}

function EventTable({ events }: { events: AuditEvent[] }) {
  return <div className="table-scroll"><table><thead><tr><th>Ação</th><th>Tipo de recurso</th><th>Identificador</th><th>Data</th></tr></thead><tbody>{events.map((event, index) => <tr key={index}><td data-label="Ação"><strong>{event.action}</strong></td><td data-label="Tipo">{event.resourceType}</td><td data-label="Recurso">{event.resourceId}</td><td data-label="Data">{formatDate(event.insertedAt)}</td></tr>)}</tbody></table>{!events.length && <div className="empty">Nenhum evento encontrado.</div>}</div>;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
