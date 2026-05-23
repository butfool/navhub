'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { searchIcons, getIconSvg, TOTAL_ICON_COUNT, type IconSearchResult } from '../../lib/icons';
import { hexToRgba, rgbaToHex, rgbaToForeground } from '../../lib/color';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { cn } from '../../lib/utils';

interface IconColorPickerProps {
  icon: string;
  color: string;
  onChange: (next: { icon: string; color: string }) => void;
}

const PAGE_SIZE = 60;

const PRESET_COLORS = [
  '#8b5cf6', '#22d3ee', '#f472b6', '#10b981',
  '#f59e0b', '#ef4444', '#3b82f6', '#94a3b8',
];

export function IconColorPicker({ icon, color, onChange }: IconColorPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const results: IconSearchResult[] = useMemo(
    () => searchIcons(search, PAGE_SIZE),
    [search]
  );

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(t);
  }, [open]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setSearch('');
  };

  const currentName = icon.includes(':') ? icon.split(':')[1] : icon;
  const isSimple = icon.startsWith('simple:');
  const currentSvg = getIconSvg(icon);
  const currentHex = rgbaToHex(color);
  const stroke = rgbaToForeground(color);

  const selectColor = (hex: string) => {
    onChange({ icon, color: hexToRgba(hex) });
  };

  const selectIcon = (item: IconSearchResult) => {
    const iconKey = `${item.pack}:${item.name}`;
    if (item.pack === 'simple' && item.brandColor) {
      onChange({ icon: iconKey, color: hexToRgba(`#${item.brandColor}`) });
    } else {
      onChange({ icon: iconKey, color });
    }
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="w-full h-10 flex items-center gap-2.5 pl-1.5 pr-3 rounded-md border border-border bg-card text-sm transition-colors hover:bg-accent"
        >
          <span
            className="flex items-center justify-center w-7 h-7 rounded shrink-0"
            style={{ background: color, color: stroke }}
            dangerouslySetInnerHTML={{
              __html: `<svg viewBox="0 0 24 24" fill="${isSimple ? 'currentColor' : 'none'}" stroke="${isSimple ? 'none' : 'currentColor'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px">${currentSvg}</svg>`,
            }}
          />
          <span className="flex-1 text-left truncate text-foreground">{currentName || 'link'}</span>
          <span className="font-mono text-xs text-muted-foreground shrink-0">{currentHex}</span>
          <svg className="w-4 h-4 text-muted-foreground shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[340px] p-3">
        <div className="flex items-center gap-1.5 mb-3">
          {PRESET_COLORS.map((c) => {
            const selected = currentHex.toLowerCase() === c.toLowerCase();
            return (
              <button
                key={c}
                type="button"
                onClick={() => selectColor(c)}
                className={cn(
                  'w-6 h-6 rounded-full transition-transform hover:scale-110',
                  selected && 'ring-2 ring-offset-2 ring-offset-background ring-foreground'
                )}
                style={{ background: c }}
                aria-label={c}
                title={c}
              />
            );
          })}
          <label
            className="relative w-6 h-6 rounded-full border border-dashed border-border cursor-pointer flex items-center justify-center hover:bg-accent ml-auto"
            title="Custom color"
          >
            <svg className="w-3.5 h-3.5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/>
              <circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/>
              <circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/>
              <circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/>
              <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>
            </svg>
            <input
              type="color"
              value={currentHex}
              onChange={(e) => selectColor(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
          </label>
        </div>

        <div className="h-px bg-border -mx-3 mb-3" />

        <div className="relative mb-3">
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none"
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${TOTAL_ICON_COUNT}+ icons…`}
            className="w-full h-9 pl-8 pr-3 text-sm rounded-md border border-border bg-card focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {results.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No matching icons found
          </div>
        ) : (
          <>
            <div className="grid grid-cols-8 gap-1 max-h-[260px] overflow-y-auto pr-1">
              {results.map((iconItem) => {
                const key = `${iconItem.pack}:${iconItem.name}`;
                const selected = icon === key || icon === iconItem.name;
                const displayLabel = iconItem.title ?? iconItem.name;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => selectIcon(iconItem)}
                    title={displayLabel}
                    className={cn(
                      'aspect-square rounded-md flex items-center justify-center transition-colors',
                      selected
                        ? 'ring-2 ring-ring'
                        : 'hover:bg-accent'
                    )}
                    style={{
                      background: selected ? color : 'transparent',
                      color: stroke,
                    }}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill={iconItem.pack === 'simple' ? 'currentColor' : 'none'}
                      stroke={iconItem.pack === 'simple' ? 'none' : 'currentColor'}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="w-4 h-4"
                      dangerouslySetInnerHTML={{ __html: iconItem.svg }}
                    />
                  </button>
                );
              })}
            </div>
            {!search && (
              <p className="mt-2 text-[11px] text-muted-foreground text-center">
                Showing common icons — type to search all {TOTAL_ICON_COUNT}
              </p>
            )}
            {search && results.length === PAGE_SIZE && (
              <p className="mt-2 text-[11px] text-muted-foreground text-center">
                Showing first {PAGE_SIZE} results — keep typing to narrow down
              </p>
            )}
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}