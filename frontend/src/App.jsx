import { BrowserRouter } from 'react-router-dom';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { ToastProvider } from './components/admin/common/ToastContext';
import { AppRoutes } from './routes/AppRoutes';

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </ToastProvider>
    </ErrorBoundary>
  );
}
