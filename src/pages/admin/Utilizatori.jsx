import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../AuthContext.jsx';

// 🔒 Lista de roluri acceptate (ține-o sincronă cu CHECK-ul din DB)
const ROLE_OPTIONS = ['sofer', 'dispecer', 'mecanic', 'admin'];

export default function Utilizatori() {
  const { profile, loading: authLoading } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  // ⛔️ Gardă: doar admin are acces
  const notAllowed = !authLoading && profile?.role !== 'admin';

  const fetchProfiles = async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, nombre_completo, role')
      .order('email', { ascending: true });

    if (error) {
      setError(error.message || 'Eroare la încărcarea utilizatorilor.');
      setRows([]);
    } else {
      setRows(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!authLoading && profile?.role === 'admin') {
      fetchProfiles();
    }
  }, [authLoading, profile]);

  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        (r.email && r.email.toLowerCase().includes(q)) ||
        (r.nombre_completo && r.nombre_completo.toLowerCase().includes(q)) ||
        (r.role && r.role.toLowerCase().includes(q))
    );
  }, [rows, search]);

  const handleChangeRole = async (userId, newRole) => {
    if (!ROLE_OPTIONS.includes(newRole)) {
      return alert('Rol invalid.');
    }
    setSavingId(userId);
    setError(null);

    // optimist: actualizează local instant
    const prev = rows;
    setRows((cur) => cur.map((r) => (r.id === userId ? { ...r, role: newRole } : r)));

    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId);

    if (error) {
      // revert dacă a eșuat
      setRows(prev);
      setError(error.message || 'Nu am putut salva rolul.');
    }

    setSavingId(null);
  };

  if (authLoading || loading) {
    return <div style={{ padding: 16 }}>Se încarcă…</div>;
  }

  if (notAllowed) {
    return <div style={{ padding: 16 }}>Nu ai permisiunea să accesezi această pagină.</div>;
  }

  return (
    <div style={{ padding: 16, maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Utilizatori (profiles)</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Caută după email / nume / rol…"
            style={{ padding: '8px 12px', minWidth: 280, border: '1px solid #ddd', borderRadius: 6 }}
          />
          <button onClick={fetchProfiles} style={{ padding: '8px 12px', borderRadius: 6 }}>
            Reîncarcă
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: '#ffe5e5', border: '1px solid #ffb3b3', padding: 10, borderRadius: 6, marginBottom: 12 }}>
          {error}
        </div>
      )}

      <div style={{ overflowX: 'auto', border: '1px solid #eee', borderRadius: 8 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: '#fafafa' }}>
            <tr>
              <th style={th}>Nume</th>
              <th style={th}>Email</th>
              <th style={th}>Rol</th>
              <th style={th}>Acțiuni</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: 16, textAlign: 'center', color: '#666' }}>
                  Nicio înregistrare.
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id}>
                  <td style={td}>{r.nombre_completo || '—'}</td>
                  <td style={td}>{r.email || '—'}</td>
                  <td style={td}>
                    <select
                      value={r.role || ''}
                      onChange={(e) => handleChangeRole(r.id, e.target.value)}
                      disabled={savingId === r.id}
                      style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #ddd', minWidth: 140 }}
                    >
                      {ROLE_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </td>
                  <td style={td}>
                    {savingId === r.id ? 'Se salvează…' : <span style={{ color: '#999' }}>—</span>}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p style={{ marginTop: 10, color: '#888', fontSize: 13 }}>
        Schimbarea rolului se salvează automat la selectarea unei opțiuni.
      </p>
    </div>
  );
}

const th = { textAlign: 'left', padding: '10px 12px', borderBottom: '1px solid #eee', fontWeight: 600, fontSize: 14 };
const td = { padding: '10px 12px', borderBottom: '1px solid #f2f2f2', fontSize: 14 };