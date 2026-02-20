/**
 * TextbookCatalogModule — Standalone wrapper for the Textbook Catalog (Private Catalog)
 * Extracted from UnatiendaModule into the School Textbooks sidebar group.
 */
import PrivateCatalogTab from '@/modules/unatienda/tabs/PrivateCatalogTab';

export default function TextbookCatalogModule() {
  const token = localStorage.getItem('auth_token');
  return <PrivateCatalogTab token={token} />;
}
