import { NavLink, Route, Routes } from 'react-router-dom';
import Icon from './components/Icon';
import ThemeApplier from './components/ThemeApplier';
import ReminderScheduler from './components/ReminderScheduler';
import Home from './pages/Home';
import Transactions from './pages/Transactions';
import Budgets from './pages/Budgets';
import Reports from './pages/Reports';
import More from './pages/More';
import Wallets from './pages/Wallets';
import Categories from './pages/Categories';
import Recurring from './pages/Recurring';
import Goals from './pages/Goals';
import Debts from './pages/Debts';
import Wishlist from './pages/Wishlist';
import Settings from './pages/Settings';
import Backup from './pages/Backup';
import Appearance from './pages/Appearance';
import Security from './pages/Security';
import TransactionEditor from './pages/TransactionEditor';
import Onboarding from './pages/Onboarding';

const tabs = [
  { to: '/', label: 'Beranda', icon: 'home' },
  { to: '/transactions', label: 'Transaksi', icon: 'list' },
  { to: '/budgets', label: 'Anggaran', icon: 'pie' },
  { to: '/reports', label: 'Laporan', icon: 'chart' },
  { to: '/more', label: 'Lainnya', icon: 'more' },
];

export default function App() {
  return (
    <>
      <ThemeApplier />
      <ReminderScheduler />
      <div className="app">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/budgets" element={<Budgets />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/more" element={<More />} />
        <Route path="/wallets" element={<Wallets />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/recurring" element={<Recurring />} />
        <Route path="/goals" element={<Goals />} />
        <Route path="/debts" element={<Debts />} />
        <Route path="/wishlist" element={<Wishlist />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/settings/backup" element={<Backup />} />
        <Route path="/settings/appearance" element={<Appearance />} />
        <Route path="/settings/security" element={<Security />} />
        <Route path="/transaction/new" element={<TransactionEditor mode="new" />} />
        <Route path="/transaction/:id" element={<TransactionEditor mode="edit" />} />
        <Route path="/onboarding" element={<Onboarding />} />
      </Routes>

      <nav className="bottom-nav" aria-label="Navigasi utama">
        {tabs.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.to === '/'} className={({ isActive }) => (isActive ? 'active' : '')}>
            <Icon name={t.icon} size={22} />
            <span>{t.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
    </>
  );
}
