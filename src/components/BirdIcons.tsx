/**
 * BirdIcons — SVG icons for each species group, no emoji.
 * Each group has a unique, hand-crafted silhouette SVG.
 */

interface BirdIconProps {
  size?: number;
  color?: string;
  className?: string;
}

// Raptor (eagle/hawk in soaring pose)
export function RaptorIcon({ size = 24, color = 'currentColor', className }: BirdIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M12 5C12 5 7 7 2 8.5C4 9.5 7 9 9 9L4 13C6 12 9 11.5 11 12L8 17C10 15.5 12 14 12 14C12 14 14 15.5 16 17L13 12C15 11.5 18 12 20 13L15 9C17 9 20 9.5 22 8.5C17 7 12 5 12 5Z"
        fill={color}
        stroke={color}
        strokeWidth="0.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Swallow (forked tail, swift wings)
export function SwallowIcon({ size = 24, color = 'currentColor', className }: BirdIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M12 9C12 9 5 6 2 7.5C4.5 8.5 7 8.5 9 9L5 12.5C7 12 9.5 12 11 12.5L8 16C9.5 15 11 14.5 12 15L13 14.5C14 14 15.5 15 17 16L14 12.5C15.5 12 18 12 20 12.5L16 9C18 8.5 20.5 8.5 22 7.5C19 6 12 9 12 9Z"
        fill={color}
        stroke={color}
        strokeWidth="0.3"
        strokeLinejoin="round"
      />
      {/* Forked tail */}
      <path d="M10.5 15.5L8 19.5M13.5 15.5L16 19.5" stroke={color} strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}

// Crane (long neck, long legs silhouette)
export function CraneIcon({ size = 24, color = 'currentColor', className }: BirdIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      {/* Body */}
      <ellipse cx="12" cy="13" rx="5" ry="3" fill={color}/>
      {/* Neck */}
      <path d="M8 13C8 13 7 10 8 8C9 6 10 5.5 11 5" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
      {/* Head */}
      <circle cx="11.5" cy="4.5" r="1.5" fill={color}/>
      {/* Beak */}
      <path d="M12.5 4.2L15 3.5" stroke={color} strokeWidth="1.2" strokeLinecap="round"/>
      {/* Legs */}
      <path d="M10 16L9 20M14 16L15 20" stroke={color} strokeWidth="1.2" strokeLinecap="round"/>
      {/* Toes */}
      <path d="M9 20L7.5 21M9 20L10.5 21" stroke={color} strokeWidth="1" strokeLinecap="round"/>
      <path d="M15 20L13.5 21M15 20L16.5 21" stroke={color} strokeWidth="1" strokeLinecap="round"/>
      {/* Wing */}
      <path d="M17 12C19 11 21 12 21 12L17 14" stroke={color} strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}

// Owl (round head, facial disc)
export function OwlIcon({ size = 24, color = 'currentColor', className }: BirdIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      {/* Body */}
      <path d="M8 12C8 9 9.5 7 12 7C14.5 7 16 9 16 12V17C16 18.5 14.5 19.5 12 19.5C9.5 19.5 8 18.5 8 17V12Z" fill={color}/>
      {/* Facial disc / head */}
      <path d="M9 10C9 8 10.3 6.5 12 6.5C13.7 6.5 15 8 15 10" fill={color} stroke={color} strokeWidth="0.5"/>
      {/* Ear tufts */}
      <path d="M10 6.5L9 4M14 6.5L15 4" stroke={color} strokeWidth="1.4" strokeLinecap="round"/>
      {/* Eyes */}
      <circle cx="10.5" cy="10" r="1.2" fill="var(--bg-void, #050a0e)"/>
      <circle cx="13.5" cy="10" r="1.2" fill="var(--bg-void, #050a0e)"/>
      {/* Beak */}
      <path d="M11.5 11.5L12 12.5L12.5 11.5" fill="var(--bg-void, #050a0e)"/>
      {/* Talons */}
      <path d="M10 19.5L8.5 21.5M12 19.5L12 21.5M14 19.5L15.5 21.5" stroke={color} strokeWidth="1.1" strokeLinecap="round"/>
    </svg>
  );
}

// Wader/Shorebird (long bill, hunching stance)
export function WaderIcon({ size = 24, color = 'currentColor', className }: BirdIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      {/* Body */}
      <ellipse cx="12" cy="14" rx="5.5" ry="3.5" fill={color}/>
      {/* Neck + head */}
      <path d="M8 12C8 12 7.5 9 9 8C10 7 11 7 11.5 7" stroke={color} strokeWidth="1.8" strokeLinecap="round" fill="none"/>
      <ellipse cx="12" cy="6.5" rx="2" ry="1.8" fill={color}/>
      {/* Long downcurved bill */}
      <path d="M13.5 6C14.5 5 17.5 5.5 20 5" stroke={color} strokeWidth="1.3" strokeLinecap="round"/>
      {/* Tail */}
      <path d="M17 14C19 13.5 21 14.5 22 14" stroke={color} strokeWidth="1.4" strokeLinecap="round"/>
      {/* Legs */}
      <path d="M10.5 17.5L10 21M13.5 17.5L14 21" stroke={color} strokeWidth="1.2" strokeLinecap="round"/>
      {/* Toes */}
      <path d="M10 21L8.5 22M10 21L11.5 22" stroke={color} strokeWidth="0.9" strokeLinecap="round"/>
      <path d="M14 21L12.5 22M14 21L15.5 22" stroke={color} strokeWidth="0.9" strokeLinecap="round"/>
    </svg>
  );
}

// Hummingbird (hovering, long bill)
export function HummingbirdIcon({ size = 24, color = 'currentColor', className }: BirdIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      {/* Body */}
      <ellipse cx="11" cy="13" rx="4" ry="2.5" fill={color}/>
      {/* Head */}
      <circle cx="8" cy="10.5" r="2" fill={color}/>
      {/* Long straight bill */}
      <path d="M6.5 10L2 9.5" stroke={color} strokeWidth="1.2" strokeLinecap="round"/>
      {/* Tail */}
      <path d="M15 13L18 11.5M15 13L18 14.5" stroke={color} strokeWidth="1.3" strokeLinecap="round"/>
      {/* Wings (blurred hover effect) */}
      <path d="M10 11C10 8 13 5 16 7" stroke={color} strokeWidth="1.6" strokeLinecap="round" fill="none" opacity="0.9"/>
      <path d="M10 11C10 14 13 17 16 15" stroke={color} strokeWidth="1.6" strokeLinecap="round" fill="none" opacity="0.7"/>
      {/* Eye */}
      <circle cx="7.5" cy="10" r="0.7" fill="var(--bg-void, #050a0e)"/>
    </svg>
  );
}

// Passerine / Songbird (small perching bird)
export function PasserineIcon({ size = 24, color = 'currentColor', className }: BirdIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      {/* Body */}
      <ellipse cx="12.5" cy="14" rx="5" ry="3.5" fill={color}/>
      {/* Head */}
      <circle cx="8.5" cy="11" r="3" fill={color}/>
      {/* Beak */}
      <path d="M6 10.5L3.5 9.8" stroke={color} strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M6 11L3.5 11.5" stroke={color} strokeWidth="1.2" strokeLinecap="round"/>
      {/* Eye */}
      <circle cx="8" cy="10.5" r="0.8" fill="var(--bg-void, #050a0e)"/>
      {/* Tail */}
      <path d="M17 14L20 12.5M17 14.5L20 15.5" stroke={color} strokeWidth="1.3" strokeLinecap="round"/>
      {/* Leg & perch foot */}
      <path d="M12 17.5L12 20" stroke={color} strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M10.5 20L12 20L14 20" stroke={color} strokeWidth="1" strokeLinecap="round"/>
      <path d="M12 20L12 21.5" stroke={color} strokeWidth="1" strokeLinecap="round"/>
    </svg>
  );
}

// Dove / Pigeon (round body, small head, gentle look)
export function DoveIcon({ size = 24, color = 'currentColor', className }: BirdIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      {/* Body (plump) */}
      <ellipse cx="12" cy="14" rx="6" ry="4" fill={color}/>
      {/* Head */}
      <circle cx="7.5" cy="10.5" r="2.5" fill={color}/>
      {/* Beak */}
      <path d="M5.5 10L3 9.5" stroke={color} strokeWidth="1.1" strokeLinecap="round"/>
      {/* Eye */}
      <circle cx="7" cy="10" r="0.8" fill="var(--bg-void, #050a0e)"/>
      {/* Wing highlights */}
      <path d="M10 13C12 11 16 11 18 12" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" strokeLinecap="round"/>
      {/* Tail fan */}
      <path d="M18 14L20.5 12M18 14.5L21 14.5M18 15L20.5 17" stroke={color} strokeWidth="1.2" strokeLinecap="round"/>
      {/* Legs */}
      <path d="M11 18L10.5 21M13 18L13.5 21" stroke={color} strokeWidth="1.1" strokeLinecap="round"/>
    </svg>
  );
}

// Grassland bird (bustard-like, long-legged ground bird)
export function GrasslandIcon({ size = 24, color = 'currentColor', className }: BirdIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      {/* Body (heavy, ground-hugging) */}
      <ellipse cx="12" cy="13" rx="6.5" ry="4" fill={color}/>
      {/* Head + neck */}
      <path d="M6.5 11C6.5 11 6 8.5 7.5 7.5" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
      <circle cx="8.5" cy="7" r="2" fill={color}/>
      {/* Beak */}
      <path d="M7.5 6.5L5 5.5" stroke={color} strokeWidth="1.2" strokeLinecap="round"/>
      {/* Eye */}
      <circle cx="8.2" cy="6.5" r="0.7" fill="var(--bg-void, #050a0e)"/>
      {/* Tail */}
      <path d="M18.5 12L21 10.5M18.5 13L21.5 13M18.5 14L21 15.5" stroke={color} strokeWidth="1.1" strokeLinecap="round"/>
      {/* Legs (longer) */}
      <path d="M10 17L9 21M14 17L15 21" stroke={color} strokeWidth="1.3" strokeLinecap="round"/>
      {/* Toes */}
      <path d="M9 21L7.5 22M9 21L10.5 22" stroke={color} strokeWidth="0.9" strokeLinecap="round"/>
      <path d="M15 21L13.5 22M15 21L16.5 22" stroke={color} strokeWidth="0.9" strokeLinecap="round"/>
    </svg>
  );
}

/** Map from speciesGroup string → icon component */
export const GROUP_ICONS: Record<string, React.ComponentType<BirdIconProps>> = {
  'Raptors': RaptorIcon,
  'Swallows & Swifts': SwallowIcon,
  'Cranes': CraneIcon,
  'Nightjars & Owls': OwlIcon,
  'Seabirds & Waders': WaderIcon,
  'Hummingbirds': HummingbirdIcon,
  'Passerines': PasserineIcon,
  'Doves & Pigeons': DoveIcon,
  'Grassland Birds': GrasslandIcon,
};

/** Returns the icon for a given speciesGroup, or PasserineIcon as fallback */
export function getBirdIcon(speciesGroup: string): React.ComponentType<BirdIconProps> {
  return GROUP_ICONS[speciesGroup] ?? PasserineIcon;
}

/** Accent colours per group */
export const GROUP_COLORS: Record<string, string> = {
  'Raptors':          '#e9a64a',
  'Swallows & Swifts':'#48cae4',
  'Cranes':           '#b7e4c7',
  'Nightjars & Owls': '#9b72cf',
  'Seabirds & Waders':'#52b788',
  'Hummingbirds':     '#f97316',
  'Passerines':       '#84cc16',
  'Doves & Pigeons':  '#e8d5b7',
  'Grassland Birds':  '#d4a843',
};
