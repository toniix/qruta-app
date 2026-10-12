import { useContext } from 'react';
import { ToastContext } from '../components/admin/common/ToastContextInstance';

export function useAdminToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useAdminToast must be used within a ToastProvider');
  }
  return ctx;
}
