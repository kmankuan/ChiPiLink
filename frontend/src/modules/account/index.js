/**
 * Account Module
 * User's personal portal - profile, wallet, connections, and student linking
 */

// Main dashboard
export { default as AccountDashboard } from './pages/AccountDashboard';

// Linking (Compra Exclusiva)
export { default as LinkingPage } from './linking/LinkingPage';

// Profile
export { default as ProfilePage } from './profile/ProfilePage';
export { default as MembershipCard } from './profile/MembershipCard';
export { default as MisCapacidades } from './profile/MisCapacidades';
export { default as UserQRCode } from './profile/UserQRCode';

// Wallet
export { default as WalletPage } from './wallet/WalletPage';
export { default as TransferenciasDialog } from './wallet/TransferenciasDialog';
export { default as AlertasSaldo } from './wallet/AlertasSaldo';
export { default as QRScanner } from './wallet/QRScanner';

// Connections
export { default as ConnectionsPage } from './connections/ConnectionsPage';
export { default as MisAcudidos } from './connections/MisAcudidos';

// Shared
export { default as ServiciosSugeridos } from './ServiciosSugeridos';
