/**
 * SysbookInventoryTab — Sysbook (School Textbook) Inventory
 * Wraps PrivateCatalogTab in sysbook mode: dedicated API, no public products.
 */
import PrivateCatalogTab from '@/modules/unatienda/tabs/PrivateCatalogTab';

export default function SysbookInventoryTab() {
  const token = localStorage.getItem('auth_token');
  return <PrivateCatalogTab token={token} sysbook />;
}
