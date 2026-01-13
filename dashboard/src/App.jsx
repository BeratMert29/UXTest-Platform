import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import TestList from './pages/TestList';
import TestDetail from './pages/TestDetail';
import CreateTest from './pages/CreateTest';
import TesterPortal from './pages/TesterPortal';

function App() {
  return (
    <Routes>
      {/* Tester Portal - standalone page without layout */}
      <Route path="/portal" element={<TesterPortal />} />
      
      {/* Admin Dashboard */}
      <Route path="/" element={<Layout><TestList /></Layout>} />
      <Route path="/test/:testId" element={<Layout><TestDetail /></Layout>} />
      <Route path="/create" element={<Layout><CreateTest /></Layout>} />
    </Routes>
  );
}

export default App;
