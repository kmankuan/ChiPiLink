/**
 * TextbookCatalogModule — Standalone wrapper for the Textbook Inventory
 * Used by the Unatienda admin view (non-sysbook mode).
 */
import UnifiedInventoryTab from '@/modules/unatienda/tabs/UnifiedInventoryTab';

export default function TextbookCatalogModule() {
  const token = localStorage.getItem('auth_token');
  return <UnifiedInventoryTab token={token} />;
}
