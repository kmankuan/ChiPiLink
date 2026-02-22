/**
 * SysbookInventoryTab — Sysbook (School Textbook) Inventory
 * Wraps UnifiedInventoryTab in sysbook mode: dedicated API, no public products.
 */
import UnifiedInventoryTab from '@/modules/unatienda/tabs/UnifiedInventoryTab';

export default function SysbookInventoryTab() {
  const token = localStorage.getItem('auth_token');
  return <UnifiedInventoryTab token={token} sysbook />;
}
