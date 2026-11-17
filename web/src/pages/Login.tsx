import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/auth';

export default function Login() {
  const { signIn, signUp, ready } = useAuth();
  const nav = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    if (!email || !password) return;
    if (isSignUp && !name.trim()) return;
    setBusy(true);
    try {
      if (isSignUp) await signUp(email, password, name);
      else await signIn(email, password);
      nav('/');
    } catch (e: any) {
      setErr(e?.message || 'Gagal');
    } finally {
      setBusy(false);
    }
  }

  if (!ready) return null;

  const accent = '#A8813C';
  const muted = '#6B6358';
  const faint = '#9C9386';
  const text = '#1A1815';
  const surface = '#FAF8F4';
  const surfaceAlt = '#F3EFE7';
  const border = '#E7E1D6';
  const expense = '#A84A3C';

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        background: surface,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 380,
          background: '#FFFFFF',
          borderRadius: 16,
          padding: 32,
          boxShadow: '0 1px 2px rgba(26, 24, 21, 0.06), 0 4px 12px rgba(26, 24, 21, 0.04)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <h1
            style={{
              color: accent,
              fontSize: 32,
              fontWeight: 700,
              letterSpacing: -0.5,
              margin: 0,
            }}
          >
            Dompet
          </h1>
          <div
            style={{
              color: muted,
              fontSize: 14,
              marginTop: 4,
            }}
          >
            Catatan keuangan pribadi
          </div>
        </div>

        <h3
          style={{
            marginBottom: 16,
            fontSize: 18,
            fontWeight: 600,
          }}
        >
          {isSignUp ? 'Buat akun' : 'Masuk'}
        </h3>

        {err && (
          <div
            style={{
              background: expense + '22',
              color: expense,
              padding: 10,
              borderRadius: 8,
              marginBottom: 12,
              fontSize: 14,
            }}
          >
            {err}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {isSignUp && (
            <input
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: 8,
                border: `1px solid ${border}`,
                background: surfaceAlt,
                color: text,
                fontSize: 16,
                marginBottom: 12,
                outline: 'none',
                WebkitAppearance: 'none',
                appearance: 'none',
              }}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Raka"
              autoCapitalize="words"
            />
          )}

          <input
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: 8,
              border: `1px solid ${border}`,
              background: surfaceAlt,
              color: text,
              fontSize: 16,
              marginBottom: 20,
              outline: 'none',
              WebkitAppearance: 'none',
              appearance: 'none',
            }}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="kamu@contoh.com"
            autoComplete="email"
            autoCapitalize="none"
          />

          <input
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: 8,
              border: `1px solid ${border}`,
              background: surfaceAlt,
              color: text,
              fontSize: 16,
              marginBottom: 20,
              outline: 'none',
              WebkitAppearance: 'none',
              appearance: 'none',
            }}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={isSignUp ? 'Minimal 6 karakter' : 'Masukkan kata sandi'}
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
          />

          <button
            style={{
              width: '100%',
              marginBottom: 20,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '12px 18px',
              borderRadius: 12,
              fontSize: 15,
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              background: accent,
              color: '#FFFFFF',
            }}
            disabled={busy}
          >
            {busy ? 'Memproses…' : isSignUp ? 'Daftar' : 'Masuk'}
          </button>
        </form>

        <div
          style={{
            marginTop: 20,
            justifyContent: 'center',
            gap: 8,
            display: 'flex',
          }}
        >
          <div
            style={{
              color: muted,
              fontSize: 12,
            }}
          >
            {isSignUp ? 'Sudah punya akun?' : 'Belum punya akun?'}
          </div>
          <button
            style={{
              background: 'transparent',
              color: accent,
              border: 'none',
              cursor: 'pointer',
              padding: 8,
              fontSize: 14,
            }}
            onClick={() => {
              setIsSignUp(!isSignUp);
              setErr('');
            }}
          >
            {isSignUp ? 'Masuk' : 'Daftar'}
          </button>
        </div>

        <div
          style={{
            marginTop: 24,
            textAlign: 'center',
            color: faint,
            fontSize: 11,
          }}
        >
          Data disimpan aman di Neon (PostgreSQL). Tidak ada server tracking.
        </div>
      </div>
    </div>
  );
}