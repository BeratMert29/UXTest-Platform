import { Link, useLocation } from 'react-router-dom';

function Layout({ children }) {
  const location = useLocation();
  
  return (
    <div className="layout">
      <header className="header">
        <div className="header-content">
          <Link to="/" className="logo">
            <div className="logo-icon">◈</div>
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
      
      <style>{`
        .portal-link {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          padding: 0.5rem 1rem !important;
          border-radius: 6px;
          color: white !important;
          font-weight: 500;
        }
        
        .portal-link:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }
      `}</style>
    </div>
  );
}

export default Layout;
