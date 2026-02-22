/**
 * SysbookInventoryTab — Entry point for Sysbook Inventory in AdminDashboard.
 */
import SysbookInventoryTable from './SysbookInventoryTable';

export default function SysbookInventoryTab() {
  const token = localStorage.getItem('auth_token');
  return <SysbookInventoryTable token={token} />;
}
