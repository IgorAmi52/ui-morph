import { Outlet, NavLink } from 'react-router-dom';
import { Morph } from '@ui-morph/react';
import {
  LayoutDashboard,
  FileText,
  ClipboardList,
  AlertTriangle,
  Users,
  BarChart3,
  UserCog,
  FileBarChart,
  Settings,
  HelpCircle,
  Shield,
} from 'lucide-react';
import './layout.css';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/policies', icon: FileText, label: 'Policies' },
  { to: '/claims', icon: ClipboardList, label: 'Claims' },
  { to: '/large-loss', icon: AlertTriangle, label: 'Legacy Console' },
  { to: '/customers', icon: Users, label: 'Customers' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/agents', icon: UserCog, label: 'Agents' },
  { to: '/reports', icon: FileBarChart, label: 'Reports' },
];

const bottomNav = [
  { to: '/settings', icon: Settings, label: 'Settings' },
  { to: '/support', icon: HelpCircle, label: 'Support' },
];

export default function InsureLayout() {
  return (
    <Morph userId="demo-user" apiUrl="http://localhost:3001" editable>
      <div className="layout">
        <aside className="layout__sidebar">
          <div className="layout__brand">
            <div className="layout__logo">
              <Shield size={20} />
            </div>
            <span>insure.me</span>
          </div>
          <nav className="layout__nav">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `layout__nav-item${isActive ? ' layout__nav-item--active' : ''}`
                }
              >
                <item.icon size={18} />
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="layout__nav-bottom">
            {bottomNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `layout__nav-item${isActive ? ' layout__nav-item--active' : ''}`
                }
              >
                <item.icon size={18} />
                {item.label}
              </NavLink>
            ))}
          </div>
        </aside>
        <main className="layout__main">
          <Outlet />
        </main>
      </div>
    </Morph>
  );
}
