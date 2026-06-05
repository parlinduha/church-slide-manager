import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import SongsPage from './pages/SongsPage';
import ServicePage from './pages/ServicePage';
import LivePage from './pages/LivePage';
import ProjectorPage from './pages/ProjectorPage';
import BiblePage from './pages/BiblePage';
import SettingsPage from './pages/SettingsPage';
import WelcomePage from './pages/WelcomePage';
import ToastContainer from './components/ToastContainer';

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/projector" element={<ProjectorPage />} />
        <Route element={<Layout />}>
          <Route index element={<LivePage />} />
          <Route path="/welcome" element={<WelcomePage />} />
          <Route path="/songs" element={<SongsPage />} />
          <Route path="/services" element={<ServicePage />} />
          <Route path="/bible" element={<BiblePage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
      <ToastContainer />
    </>
  );
}
