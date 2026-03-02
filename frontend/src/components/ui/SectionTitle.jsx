/**
 * SectionTitle — Uniform section heading for landing page blocks.
 * Style is configurable from admin (site config).
 * Styles: bar (A), uppercase (B), pill (C), underline (D), chip (E), dot (F)
 */
import { useSiteConfig } from '@/contexts/SiteConfigContext';

const STYLES = {
  bar: ({ title, subtitle }) => (
    <div className="flex items-center gap-2.5 px-1 mb-2">
      <div className="w-[3px] h-5 rounded-sm bg-[#C8102E] shrink-0" />
      <div className="min-w-0">
        <h3 className="text-sm sm:text-base font-bold text-foreground tracking-tight truncate">{title}</h3>
        {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  ),
  uppercase: ({ title, subtitle }) => (
    <div className="flex items-center gap-3 px-1 mb-2">
      <div className="min-w-0 shrink-0">
        <h3 className="text-[11px] font-extrabold uppercase tracking-[2px] text-[#8b7355]">{title}</h3>
        {subtitle && <p className="text-[9px] text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="flex-1 h-px bg-gradient-to-r from-[#d4c5a9] to-transparent" />
    </div>
  ),
  pill: ({ title, subtitle, icon: Icon }) => (
    <div className="px-1 mb-2">
      <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold bg-[#C8102E] text-white">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {title}
      </span>
      {subtitle && <p className="text-[10px] text-muted-foreground mt-1 px-1">{subtitle}</p>}
    </div>
  ),
  underline: ({ title, subtitle }) => (
    <div className="px-1 mb-2">
      <div className="inline-block pb-1.5 border-b-2 border-[#C8102E]">
        <h3 className="text-sm sm:text-base font-bold text-foreground">{title}</h3>
      </div>
      {subtitle && <p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>}
    </div>
  ),
  chip: ({ title, subtitle }) => (
    <div className="px-1 mb-2">
      <span className="inline-block px-3.5 py-1.5 rounded-lg text-[13px] font-bold text-amber-900 bg-amber-100/50 border border-amber-200/50">
        {title}{subtitle ? ` · ${subtitle}` : ''}
      </span>
    </div>
  ),
  dot: ({ title, subtitle }) => (
    <div className="flex items-center gap-2 px-1 mb-2">
      <div className="w-2 h-2 rounded-full bg-[#C8102E] shrink-0" />
      <h3 className="text-[15px] font-extrabold text-foreground tracking-tight">{title}</h3>
      {subtitle && <span className="text-[11px] font-medium text-muted-foreground">{subtitle}</span>}
    </div>
  ),
};

export default function SectionTitle({ title, subtitle, icon, style: styleProp }) {
  const { siteConfig } = useSiteConfig();
  const selectedStyle = styleProp || siteConfig?.section_title_style || 'bar';
  const Renderer = STYLES[selectedStyle] || STYLES.bar;
  if (!title) return null;
  return <Renderer title={title} subtitle={subtitle} icon={icon} />;
}

export const SECTION_TITLE_OPTIONS = [
  { value: 'bar', label: 'Minimal Left Bar' },
  { value: 'uppercase', label: 'Uppercase + Line' },
  { value: 'pill', label: 'Pill Badge' },
  { value: 'underline', label: 'Bottom Border' },
  { value: 'chip', label: 'Background Chip' },
  { value: 'dot', label: 'Dot + Bold' },
];
