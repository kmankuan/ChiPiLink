/**
 * StoreCheckoutFormConfigTab — Admin config for public store checkout form fields
 * Thin wrapper around OrderFormConfigTab with different API path
 */
import OrderFormConfigTab from './OrderFormConfigTab';

export default function StoreCheckoutFormConfigTab() {
  return (
    <OrderFormConfigTab
      configApiPath="/api/store/checkout-form-config"
      title="Configuración del Formulario de Checkout"
      description="Gestiona los campos que aparecen en el checkout de la tienda pública"
    />
  );
}
