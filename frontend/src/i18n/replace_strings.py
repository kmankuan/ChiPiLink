#!/usr/bin/env python3
"""Batch replace hardcoded strings in JSX components with i18n t() calls."""
import os

BASE = "/app/frontend/src"

# Each entry: (filepath, [(old, new), ...])
REPLACEMENTS = [
    # WidgetManagerModule.jsx
    ("modules/admin/WidgetManagerModule.jsx", [
        ("toast.error('Failed to load widget config')", "toast.error(t('widgetManager.loadError'))"),
        ("toast.success('Widget config saved!')", "toast.success(t('widgetManager.configSaved'))"),
        ("toast.error('Failed to save')", "toast.error(t('widgetManager.saveError'))"),
        ("toast.success('Config reset to defaults')", "toast.success(t('widgetManager.configReset'))"),
        ("toast.error('Failed to reset')", "toast.error(t('widgetManager.resetError'))"),
        ("toast.success('Embed code copied!')", "toast.success(t('widgetManager.embedCopied'))"),
        ('>Widget Enabled<', '>{t("widgetManager.widgetEnabled")}<'),
        ('>Turn the widget on or off globally<', '>{t("widgetManager.widgetEnabledDesc")}<'),
        ('>Widget Features<', '>{t("widgetManager.widgetFeatures")}<'),
        ('>Toggle which features are available in the widget<', '>{t("widgetManager.widgetFeaturesDesc")}<'),
        ('>Display Options<', '>{t("widgetManager.displayOptions")}<'),
        ('>Control what the widget shows and hides when embedded<', '>{t("widgetManager.displayOptionsDesc")}<'),
        ('>Maintenance Message<', '>{t("widgetManager.maintenanceMessage")}<'),
        ('>Remove any visible URL or site information from the widget<', '>{t("widgetManager.hideUrlBarDesc")}<'),
        ('>Remove the top navigation bar and bottom footer from the widget view<', '>{t("widgetManager.hideNavbarFooterDesc")}<'),
        ('>Widget Appearance<', '>{t("widgetManager.widgetAppearance")}<'),
        ('>Customize how the widget looks<', '>{t("widgetManager.widgetAppearanceDesc")}<'),
        ('>Primary Color<', '>{t("widgetManager.primaryColorLabel")}<'),
        ('>Accent Color<', '>{t("widgetManager.accentColorLabel")}<'),
        ('>Font Family<', '>{t("widgetManager.fontFamily")}<'),
        ('>Border Radius<', '>{t("widgetManager.borderRadius")}<'),
        ('>Widget Placement<', '>{t("widgetManager.widgetPlacement")}<'),
        ('>Show floating button<', '>{t("widgetManager.showFloatingButton")}<'),
        ('>Position<', '>{t("widgetManager.position")}<'),
        ('>Horizontal Offset<', '>{t("widgetManager.horizontalOffset")}<'),
        ('>Vertical Offset<', '>{t("widgetManager.verticalOffset")}<'),
        ('>Security<', '>{t("widgetManager.securityTitle")}<'),
        ('>Embed Code<', '>{t("widgetManager.embedTitle")}<'),
    ]),
    # DemoDataModule.jsx
    ("modules/admin/DemoDataModule.jsx", [
        ("toast.error('Error al crear datos demo')", "toast.error(t('demoData.createError'))"),
        ("toast.error('Error al eliminar datos')", "toast.error(t('demoData.deleteError'))"),
        (">Datos de Demostración<", '>{t("demoData.title")}<'),
    ]),
    # AuthMethodsConfig.jsx
    ("modules/admin/AuthMethodsConfig.jsx", [
        ('>Activo<', '>{t("authConfig.activeStatus")}<'),
        ('>Deshabilitado<', '>{t("authConfig.disabledStatus")}<'),
        ('>Requerido<', '>{t("common.required")}<'),
        ('>Esencial<', '>{t("authConfig.essential")}<'),
        ('>Visible<', '>{t("common.visible")}<'),
    ]),
    # NotificationBar.jsx - remaining
    ("components/layout/NotificationBar.jsx", [
        (">Notificaciones<", '>{t("common.notifications")}<'),
    ]),
]

total = 0
for relpath, pairs in REPLACEMENTS:
    fp = os.path.join(BASE, relpath)
    if not os.path.exists(fp):
        print(f"SKIP: {relpath}")
        continue
    with open(fp, 'r') as f:
        content = f.read()
    count = 0
    for old, new in pairs:
        if old in content:
            content = content.replace(old, new, 1)
            count += 1
    with open(fp, 'w') as f:
        f.write(content)
    print(f"  {relpath}: {count}/{len(pairs)}")
    total += count

print(f"\nTotal: {total} replacements")
