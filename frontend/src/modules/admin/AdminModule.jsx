import { useState, useMemo } from 'react';
import {
  Settings,
  Palette,
  FileText,
  Languages,
  Database,
  Shield,
  ArrowRightLeft,
  LayoutGrid,
  Paintbrush,
  Layout,
  Radio,
  Layers,
  Megaphone,
  Send,
  ChevronDown,
  ChevronRight,
  Search,
} from 'lucide-react';
import LandingPageEditor from '@/components/admin/LandingPageEditor';
import SiteConfigModule from './SiteConfigModule';
import FormsManagerModule from './FormsManagerModule';
import DictionaryManagerModule from './DictionaryManagerModule';
import TranslationsModule from './TranslationsModule';
import TranslationCoverageCard from './TranslationCoverageCard';
import DemoDataModule from './DemoDataModule';
import AuthMethodsConfig from './AuthMethodsConfig';
import DatabaseMigrationModule from './DatabaseMigrationModule';
import ModuleStatusModule from './ModuleStatusModule';
import UIStyleModule from './UIStyleModule';
import WidgetManagerModule from './WidgetManagerModule';
import TickerAdminModule from './TickerAdminModule';
import LayoutPreviewModule from './LayoutPreviewModule';
import ShowcaseAdminModule from './ShowcaseAdminModule';
import TelegramAdminModule from './TelegramAdminModule';
import { cn } from '@/lib/utils';

const SECTIONS = [
  {
    group: 'General',
    items: [
      { id: 'site', label: 'Site Config', icon: Settings },
      { id: 'auth', label: 'Authentication', icon: Shield },
      { id: 'ui-style', label: 'UI Style', icon: Paintbrush },
    ],
  },
  {
    group: 'Content',
    items: [
      { id: 'landing', label: 'Landing Page', icon: Palette },
      { id: 'showcase', label: 'Banners & Media', icon: Megaphone },
      { id: 'layouts', label: 'Layouts & Icons', icon: Layers },
      { id: 'ticker', label: 'Activity Ticker', icon: Radio },
      { id: 'widget', label: 'Widget', icon: Layout },
    ],
  },
  {
    group: 'Community',
    items: [
      { id: 'telegram', label: 'Telegram', icon: Send },
      { id: 'forms', label: 'Forms', icon: FileText },
    ],
  },
  {
    group: 'Data & System',
    items: [
      { id: 'translations', label: 'Translations', icon: Languages },
      { id: 'demo', label: 'Demo Data', icon: Database },
      { id: 'migration', label: 'Migration', icon: ArrowRightLeft },
      { id: 'modules', label: 'Module Status', icon: LayoutGrid },
    ],
  },
];

const PANELS = {
  site: () => <SiteConfigModule />,
  auth: () => <AuthMethodsConfig />,
  'ui-style': () => <UIStyleModule />,
  landing: () => <LandingPageEditor />,
  showcase: () => <ShowcaseAdminModule />,
  layouts: () => <LayoutPreviewModule />,
  ticker: () => <TickerAdminModule />,
  widget: () => <WidgetManagerModule />,
  telegram: () => <TelegramAdminModule />,
  forms: () => <FormsManagerModule />,
  translations: () => (
    <div className="space-y-8">
      <TranslationCoverageCard />
      <DictionaryManagerModule />
      <div className="border-t pt-6">
        <TranslationsModule />
      </div>
    </div>
  ),
  demo: () => <DemoDataModule />,
  migration: () => <DatabaseMigrationModule />,
  modules: () => <ModuleStatusModule />,
};

function SidebarSection({ group, items, active, onSelect, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen);
  const hasActive = items.some(i => i.id === active);

  return (
    <div className="mb-1">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md hover:bg-accent/50 transition-colors"
        style={{ color: hasActive ? '#8B6914' : '#94a3b8' }}
        data-testid={`admin-section-${group.toLowerCase().replace(/\s+/g, '-')}`}
      >
        {group}
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
      </button>
      {open && (
        <div className="mt-0.5 space-y-0.5">
          {items.map(item => {
            const Icon = item.icon;
            const isActive = active === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelect(item.id)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all',
                  isActive
                    ? 'bg-accent font-semibold text-foreground'
                    : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                )}
                data-testid={`admin-nav-${item.id}`}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AdminModule() {
  const [active, setActive] = useState('site');
  const [mobileNav, setMobileNav] = useState(false);

  const activeItem = SECTIONS.flatMap(s => s.items).find(i => i.id === active);
  const ActiveIcon = activeItem?.icon || Settings;
  const Renderer = PANELS[active];

  return (
    <div className="flex gap-0 min-h-[60vh]" data-testid="admin-module">
      {/* Mobile nav toggle */}
      <div className="lg:hidden mb-4 w-full">
        <button
          onClick={() => setMobileNav(!mobileNav)}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl border bg-card text-sm font-medium"
          data-testid="admin-mobile-nav-toggle"
        >
          <span className="flex items-center gap-2">
            <ActiveIcon className="h-4 w-4" />
            {activeItem?.label || 'Site Config'}
          </span>
          <ChevronDown className={cn('h-4 w-4 transition-transform', mobileNav && 'rotate-180')} />
        </button>
        {mobileNav && (
          <div className="mt-2 p-2 rounded-xl border bg-card shadow-lg">
            {SECTIONS.map(sec => (
              <SidebarSection
                key={sec.group}
                group={sec.group}
                items={sec.items}
                active={active}
                onSelect={(id) => { setActive(id); setMobileNav(false); }}
                defaultOpen={true}
              />
            ))}
          </div>
        )}
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-52 flex-shrink-0 pr-4 border-r" data-testid="admin-sidebar">
        <nav className="sticky top-4 space-y-1 py-1">
          {SECTIONS.map((sec, i) => (
            <SidebarSection
              key={sec.group}
              group={sec.group}
              items={sec.items}
              active={active}
              onSelect={setActive}
              defaultOpen={i < 2}
            />
          ))}
        </nav>
      </aside>

      {/* Content panel */}
      <div className="flex-1 lg:pl-6 min-w-0">
        {Renderer ? <Renderer /> : <SiteConfigModule />}
      </div>
    </div>
  );
}
