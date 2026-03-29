import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Search, ChevronRight } from 'lucide-react';

export default function AdminCommandPalette({ open, setOpen, menuData, onNavigate, iconMap }) {
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [setOpen]);

  // Flatten the menu items
  const items = [];
  if (menuData?.modules) {
    menuData.modules.forEach(mod => {
      mod.groups?.forEach(g => {
        g.items?.forEach(item => {
          if (item.enabled !== false) {
            items.push({
              ...item,
              moduleId: mod.id,
              moduleName: mod.label?.en || mod.id,
              groupName: g.label?.en || g.id,
              searchLabel: `${mod.label?.en || mod.id} ${g.label?.en || g.id} ${item.label?.en || item.id}`
            });
          }
        });
      });
    });
  }

  const handleSelect = (item) => {
    setOpen(false);
    if (item.path) {
      navigate(item.path);
    } else {
      onNavigate(item.id, item.moduleId); // Need to pass module id to switch active tab if needed
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="p-0 overflow-hidden shadow-2xl border-0 max-w-2xl sm:rounded-xl">
        <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
          <CommandInput placeholder="Type a command or search... (e.g., 'Pages', 'Sport')" />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup heading="Admin Navigation">
              {items.map((item) => {
                const Icon = iconMap[item.icon] || Search;
                return (
                  <CommandItem key={item.id} value={item.searchLabel} onSelect={() => handleSelect(item)} className="cursor-pointer gap-3">
                    <Icon className="text-muted-foreground" />
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">{item.label?.en || item.label}</span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        {item.moduleName} <ChevronRight className="h-2 w-2" /> {item.groupName}
                      </span>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
