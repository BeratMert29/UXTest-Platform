import { Link, useLocation } from 'react-router-dom';

function Layout({ children }) {
  const location = useLocation();

  return (
    <div className="layout">
      <header className="header">
        <div className="header-content">
          <Link to="/" className="logo">
            <span className="logo-mark"></span>
            <span>UXTest</span>
          </Link>
          <nav className="nav">
            <Link to="/" className={location.pathname === '/' ? 'active' : ''}>
              Tests
            </Link>
            <Link to="/create" className={location.pathname === '/create' ? 'active' : ''}>
              + Create
            </Link>
            <Link to="/portal" className="portal-link">
              Tester Portal →
            </Link>
          </nav>
        </div>
      </header>
      <main className="main">
        {children}
      </main>
    </div>
  );
}

export default Layout;
