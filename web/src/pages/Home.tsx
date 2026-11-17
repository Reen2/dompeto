import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { listWallets, walletBalance, listTransactions, periodSummary } from '../db/queries';
import { startOfMonth, endOfMonth, todayISO } from '../lib/dates';
import { useSettings } from '../store/settings';
import { formatMoney } from '../lib/money';
import Icon from '../components/Icon';
import { useState, useEffect } from 'react';

const quickActions = [
  { to: '/transaction/new?type=expense', label: 'Keluar', icon: 'arrow-up-right', color: 'var(--expense)' },
  { to: '/transaction/new?type=income', label: 'Masuk', icon: 'arrow-down-left', color: 'var(--income)' },
  { to: '/transaction/new?type=transfer', label: 'Transfer', icon: 'transfer', color: 'var(--info)' },
  { to: '/wishlist', label: 'Impian', icon: 'sparkles', color: 'var(--accent)' },
];

export default function Home() {
  const { settings } = useSettings();
  const wallets = useLiveQuery(() => listWallets(), []);
  const avatar = settings.profile_avatar;
  const initial = (settings.name || 'Dompet').trim().charAt(0).toUpperCase();
  const recent = useLiveQuery(() => listTransactions({ limit: 6 }), []);
  const todayTxns = useLiveQuery(() => listTransactions({ from: todayISO(), to: todayISO(), limit: 1 }), []);
  const monthStart = startOfMonth(todayISO());
  const monthEnd = endOfMonth(todayISO());
  const summary = useLiveQuery(() => periodSummary(monthStart, monthEnd), [monthStart, monthEnd]);
  const [total, setTotal] = useState(0);
  useEffect(() => {
    if (!wallets) return;
    Promise.all(wallets.map(walletBalance)).then((bs) => setTotal(bs.reduce((a, b) => a + b, 0)));
  }, [wallets]);

  const greeting = new Date().getHours() < 11 ? 'Selamat pagi' : new Date().getHours() < 15 ? 'Selamat siang' : new Date().getHours() < 19 ? 'Selamat sore' : 'Selamat malam';

  return (
    <div className="screen">
      {/* header */}
      <div className="row between" style={{ paddingTop: 4, paddingBottom: 16 }}>
        <div>
          <div className="txt-caption">{greeting}</div>
          <h1 className="txt-h1" style={{ marginTop: 2 }}>{settings.name || 'Dompet'}</h1>
        </div>
        <Link to="/settings" style={{ textDecoration: 'none' }}>
          {avatar ? (
            <img
              src={avatar}
              alt="Foto profil"
              style={{
                width: 40, height: 40, borderRadius: 20,
                objectFit: 'cover', border: '2px solid var(--border)',
              }}
            />
          ) : (
            <div style={{
              width: 40, height: 40, borderRadius: 20,
              background: 'var(--accent-soft)', color: 'var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: 15,
            }}>{initial}</div>
          )}
        </Link>
      </div>

      {/* daily reminder banner */}
      {settings.dailyReminder && (!todayTxns || todayTxns.length === 0) && (
        <div className="card" style={{ padding: 12, marginTop: 4, marginBottom: 12, background: 'var(--accent-soft)', border: '1px solid var(--accent)' }}>
          <div className="row" style={{ gap: 8 }}>
            <span style={{ fontSize: 18 }}>🔔</span>
            <div style={{ flex: 1 }}>
              <div className="txt-label" style={{ fontWeight: 600, color: 'var(--accent)', fontSize: 13 }}>Apakah kamu sudah mencatat keuanganmu hari ini?</div>
              <div className="txt-caption" style={{ fontSize: 11 }}>Ketuk + untuk mencatat pengeluaran atau pemasukan.</div>
            </div>
            <Link to="/transaction/new" style={{ textDecoration: 'none' }}>
              <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: 12 }}>Catat</button>
            </Link>
          </div>
        </div>
      )}

      {/* hero */}
      <div style={{
        borderRadius: 22, padding: 20, overflow: 'hidden',
        background: 'linear-gradient(135deg, #221F19 0%, #171614 100%)',
        color: '#FBF6EC', boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
        position: 'relative',
      }}>
        <div style={{ position: 'absolute', right: -40, top: -50, width: 160, height: 160, borderRadius: 80, background: 'rgba(216,178,106,0.10)' }} />
        <div style={{ fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: '#C8B89A', fontWeight: 600 }}>Total kekayaan</div>
        <div className="txt-amount" style={{ fontSize: 34, marginTop: 8, letterSpacing: -1.2 }}>{formatMoney(total, { masked: settings.hideBalances })}</div>
        <div style={{ fontSize: 12, color: '#9C917F', marginTop: 2 }}>{wallets?.length ?? 0} dompet</div>

        <div style={{ height: 1, background: 'rgba(255,255,255,0.10)', margin: '14px 0' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 11, color: '#9C917F' }}>Masuk bulan ini</div>
            <div className="txt-amount" style={{ fontSize: 15, color: '#8FD6A8', marginTop: 2 }}>+{formatMoney(summary?.income ?? 0, { compact: true, masked: settings.hideBalances })}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: '#9C917F' }}>Sisa</div>
            <div className="txt-amount" style={{ fontSize: 15, color: '#F0DFC0', marginTop: 2 }}>{formatMoney(summary?.net ?? 0, { compact: true, masked: settings.hideBalances })}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: '#9C917F' }}>Keluar bulan ini</div>
            <div className="txt-amount" style={{ fontSize: 15, color: '#E8B4AC', marginTop: 2 }}>−{formatMoney(summary?.expense ?? 0, { compact: true, masked: settings.hideBalances })}</div>
          </div>
        </div>
      </div>

      {/* quick actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginTop: 18 }}>
        {quickActions.map((a) => (
          <Link key={a.label} to={a.to} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}>
              <div style={{
                width: 52, height: 52, borderRadius: 18,
                background: 'var(--surface)', border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: a.color, boxShadow: 'var(--shadow)',
              }}>
                <Icon name={a.icon} size={20} color={a.color} />
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>{a.label}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* shortcuts to other sections */}
      <div style={{ marginTop: 22 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 10px' }}>Kelola</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {[
            { to: '/wallets', label: 'Dompet', icon: 'wallet', color: 'var(--accent)' },
            { to: '/categories', label: 'Kategori', icon: 'grid', color: 'var(--info)' },
            { to: '/recurring', label: 'Berulang', icon: 'repeat', color: 'var(--text-muted)' },
            { to: '/goals', label: 'Tujuan', icon: 'flag', color: 'var(--income)' },
            { to: '/debts', label: 'Utang', icon: 'person', color: 'var(--expense)' },
            { to: '/wishlist', label: 'Impian', icon: 'sparkles', color: 'var(--accent)' },
          ].map((it) => (
            <Link key={it.to} to={it.to} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="card" style={{ padding: 12, textAlign: 'center' }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 12, margin: '0 auto 6px',
                  background: 'var(--surface-alt)', color: it.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon name={it.icon} size={18} color={it.color} />
                </div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{it.label}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* budgets */}
      <div style={{ marginTop: 22 }}>
        <div className="row between" style={{ marginBottom: 10 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Anggaran bulan ini</h2>
          <Link to="/budgets" style={{ fontSize: 13, color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>Atur</Link>
        </div>
        <div className="card" style={{ padding: 18 }}>
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Belum ada anggaran. Tentukan batas belanja tiap kategori.</div>
        </div>
      </div>

      {/* recent */}
      <div style={{ marginTop: 22 }}>
        <div className="row between" style={{ marginBottom: 10 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Terakhir dicatat</h2>
          <Link to="/transactions" style={{ fontSize: 13, color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>Lihat semua</Link>
        </div>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {(recent ?? []).length === 0 ? (
            <div style={{ padding: 18, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Belum ada transaksi. Ketuk + untuk mulai.</div>
          ) : (recent ?? []).map((t, i) => (
            <Link key={t.id} to={`/transaction/${t.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 10,
                  background: t.type === 'income' ? 'rgba(47,122,90,0.12)' : t.type === 'transfer' ? 'rgba(60,111,168,0.12)' : 'rgba(168,74,60,0.12)',
                  color: t.type === 'income' ? 'var(--income)' : t.type === 'transfer' ? 'var(--info)' : 'var(--expense)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon name={t.type === 'income' ? 'arrow-down-left' : t.type === 'transfer' ? 'transfer' : 'arrow-up-right'} size={14} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {t.payee || t.note || t.category_name || (t.type === 'transfer' ? 'Transfer' : 'Transaksi')}
                  </div>
                  <div className="txt-caption" style={{ fontSize: 11 }}>{t.category_name ?? 'Tanpa kategori'}</div>
                </div>
                <div className="txt-amount" style={{ fontSize: 13, color: t.type === 'income' ? 'var(--income)' : t.type === 'transfer' ? 'var(--info)' : 'var(--expense)' }}>
                  {t.type === 'income' ? '+' : t.type === 'expense' ? '−' : ''}{formatMoney(t.amount, { masked: settings.hideBalances })}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* FAB */}
      <Link to="/transaction/new" style={{ textDecoration: 'none' }}>
        <button style={{
          position: 'fixed', right: 20, bottom: 90, width: 56, height: 56, borderRadius: 28,
          background: 'var(--accent)', color: 'var(--on-accent)', border: 'none',
          boxShadow: '0 6px 16px rgba(168,129,60,0.4)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 40,
        }} aria-label="Catat transaksi">
          <Icon name="plus" size={24} color="var(--on-accent)" />
        </button>
      </Link>
    </div>
  );
}
