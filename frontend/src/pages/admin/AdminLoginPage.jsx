import { authService } from '../../services/authService';
import { PortalLoginPage } from '../../components/common/PortalLoginPage';
import { loginSchema } from '../../schemas';

export function AdminLoginPage() {
  const devHint = import.meta.env.DEV ? (
    <div className="space-y-1 rounded-2xl border border-blue-200/80 bg-blue-50 p-3 text-xs text-blue-800">
      <p className="font-semibold">Credenciales por defecto:</p>
      <p className="font-mono text-blue-600">admin@rutasya.pe / admin123</p>
    </div>
  ) : null;

  return (
    <PortalLoginPage
      pageTitle="Administración · QRuta"
      heading="Portal de Administración"
      subtitle="Gestión de rutas, líneas de transporte y paraderos de QRuta"
      emailPlaceholder="admin@ejemplo.com"
      onLogin={(email, password) => authService.login(email, password)}
      redirectTo="/admin/overview"
      schema={loginSchema}
      devHint={devHint}
    />
  );
}

export default AdminLoginPage;
