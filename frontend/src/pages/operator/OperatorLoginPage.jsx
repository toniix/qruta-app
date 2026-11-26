import { operatorAuthService } from '../../services/operatorAuthService';
import { PortalLoginPage } from '../../components/common/PortalLoginPage';
import { loginSchema } from '../../schemas';

export function OperatorLoginPage() {
  return (
    <PortalLoginPage
      pageTitle="Portal del Operador · QRuta"
      heading="Portal del Operador"
      subtitle="Administra tus líneas, rutas, paraderos y desvíos"
      emailPlaceholder="operador@ejemplo.com"
      onLogin={(email, password) => operatorAuthService.login(email, password)}
      redirectTo="/operador/overview"
      redirectReplace
      schema={loginSchema}
    />
  );
}

export default OperatorLoginPage;
