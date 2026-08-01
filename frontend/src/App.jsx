import { BrowserRouter } from 'react-router-dom';
import { RouteProvider } from './contexts/RouteContext';
import { AppRoutes } from './routes/AppRoutes';

export default function App() {
  return (
    <BrowserRouter>
      <RouteProvider>
        <AppRoutes />
      </RouteProvider>
    </BrowserRouter>
  );
}
