#!/usr/bin/env python3
"""Add useTranslation import and hook to all React components that don't have it."""
import re, os

BASE = "/app/frontend/src"

FILES = [
    "modules/admin/RolesModule.jsx",
    "modules/admin/AuthMethodsConfig.jsx",
    "modules/admin/FormConfigModule.jsx",
    "modules/admin/WidgetManagerModule.jsx",
    "modules/admin/DemoDataModule.jsx",
    "modules/admin/store/StoreAnalyticsModule.jsx",
    "modules/admin/users/components/AdminWalletTab.jsx",
    "components/layout/BottomNav.jsx",
    "components/layout/NotificationBar.jsx",
    "modules/community/CommunityFeedModule.jsx",
    "modules/monday/MondayModule.jsx",
    "modules/store/StoreModule.jsx",
    "modules/account/linking/LinkingPage.jsx",
    "modules/wallet/tabs/WalletOverviewTab.jsx",
    "modules/unatienda/components/InventoryImport.jsx",
    "modules/unatienda/tabs/InventoryTab.jsx",
    "modules/unatienda/tabs/OrderFormConfigTab.jsx",
    "components/admin/GoogleSheetsSync.jsx",
    "components/admin/LandingPageEditor.jsx",
    "components/common/ImageUploader.jsx",
    "components/common/InlineEditToggle.jsx",
    "components/common/RichTextEditor.jsx",
    "components/chat/OrderChat.jsx",
    "components/notifications/PushNotificationSubscribe.jsx",
    "components/payment/YappyButton.jsx",
    "components/store/BooksByStudent.jsx",
    "components/store/CategoryLanding.jsx",
    "components/store/FloatingStoreNav.jsx",
    "pages/AdminDashboard.jsx",
    "pages/AgentPanel.jsx",
    "pages/Checkout.jsx",
    "pages/EmbedWidget.jsx",
    "pages/PaymentResult.jsx",
    "pages/PrivateBookDetail.jsx",
    "pages/ProductDetail.jsx",
    "pages/UnatiendaCheckout.jsx",
    "modules/pinpanclub/components/ArbiterPanel.jsx",
    "modules/pinpanclub/pages/PingPongCanvas.jsx",
    "modules/pinpanclub/pages/PingPongMobileArbiter.jsx",
    "modules/pinpanclub/pages/PingPongTV.jsx",
]

added = 0
for relpath in FILES:
    fp = os.path.join(BASE, relpath)
    if not os.path.exists(fp):
        continue
    with open(fp, 'r') as f:
        content = f.read()
    if 'useTranslation' in content:
        continue
    
    lines = content.split('\n')
    # Find last import line
    last_import = -1
    for i, line in enumerate(lines):
        stripped = line.strip()
        if stripped.startswith('import ') or (stripped.startswith('} from ') and "'" in stripped):
            last_import = i
    
    if last_import >= 0:
        lines.insert(last_import + 1, "import { useTranslation } from 'react-i18next';")
    
    content = '\n'.join(lines)
    
    # Add hook after main export default function
    # Try pattern: export default function Name(
    m = re.search(r'(export default function \w+\([^)]*\)\s*\{)', content)
    if m:
        pos = m.end()
        content = content[:pos] + "\n  const { t } = useTranslation();" + content[pos:]
    
    with open(fp, 'w') as f:
        f.write(content)
    added += 1
    print(f"  OK: {relpath}")

print(f"\nAdded to {added} files")
