import { X, Leaf, MapPin, Heart, ExternalLink } from 'lucide-react';
import type { Species } from '../types';

interface ActionPanelProps {
  species: Species;
  onClose: () => void;
}

interface ConservationOrg {
  name: string;
  region: string;
  url: string;
  focus: string;
}

const CONSERVATION_ORGS: ConservationOrg[] = [
  { name: 'BirdLife International', region: 'Global', url: 'https://www.birdlife.org', focus: 'Species conservation & advocacy' },
  { name: 'American Bird Conservancy', region: 'Americas', url: 'https://abcbirds.org', focus: 'Bird habitat & policy' },
  { name: 'Royal Society for the Protection of Birds', region: 'Europe', url: 'https://www.rspb.org.uk', focus: 'UK bird conservation' },
  { name: 'Cornell Lab of Ornithology', region: 'North America', url: 'https://www.birds.cornell.edu', focus: 'Research & citizen science' },
  { name: 'African Bird Club', region: 'Africa', url: 'https://www.africanbirdclub.org', focus: 'African avifauna' },
  { name: 'Wildlife Conservation Society', region: 'Global', url: 'https://www.wcs.org', focus: 'Habitat protection' },
];

const HABITAT_TIPS: Record<string, string[]> = {
  Hirundinidae: [
    'Install mud nest cups under eaves to support nesting',
    'Avoid disturbing nests between April and August',
    'Maintain insect-rich habitats near water bodies',
    'Reduce pesticide use — swallows depend on flying insects',
  ],
  Apodidae: [
    'Install swift nest boxes high on building walls (6m+)',
    'Retrofit new buildings with swift bricks',
    'Keep outdoor cats indoors during breeding season',
    'Report swift colonies to local wildlife trusts',
  ],
  Gruidae: [
    'Support wetland restoration projects',
    'Avoid disturbing wintering crane roosts',
    'Advocate for protected flyway corridors',
    'Join crane monitoring volunteer networks',
  ],
  Accipitridae: [
    'Report illegal raptor persecution to wildlife crime units',
    'Support campaign to end lead ammunition in hunting',
    'Avoid disturbing nest sites during breeding season',
    'Install nest platforms in suitable woodland edges',
  ],
  Columbidae: [
    'Plant native seed-bearing plants (millet, sunflowers)',
    'Advocate for sustainable farming practices on farmland',
    'Support agri-environment schemes that benefit farmland birds',
    'Create hedgerow corridors connecting habitat patches',
  ],
  default: [
    'Plant native species — they support far more insects than exotic plants',
    'Keep cats indoors, especially May–September',
    'Reduce window strike risk with decals or exterior screens',
    'Turn off outdoor lights during migration season (spring & fall)',
    'Contribute bird observations to eBird or iNaturalist',
    'Support local land trusts protecting open habitat',
  ],
};

const NATIVE_PLANTS: Record<string, string[]> = {
  'North America': ['Purple Coneflower', 'Black-eyed Susan', 'Wild Bergamot', 'Native Oak', 'Serviceberry', 'Wild Columbine'],
  'Europe': ['Hawthorn', 'Blackthorn', 'Field Scabious', 'Ox-eye Daisy', 'Purple Loosestrife', 'Bramble'],
  'Africa': ['Acacia', 'Wild Fig', 'Cape Honeybush', 'Rooibos', 'Wild Olive'],
  'Asia': ['Chinese Hackberry', 'Mulberry', 'Japanese Snowbell', 'Native Bamboo', 'Wild Cherry'],
  default: ['Native Wildflower Mix', 'Local Shrubs', 'Native Grasses', 'Insect-friendly Herbs'],
};

export function ActionPanel({ species, onClose }: ActionPanelProps) {
  const tips = HABITAT_TIPS[species.family] || HABITAT_TIPS.default;
  const region = species.nativeRegions[0];
  const plants = NATIVE_PLANTS[region] || NATIVE_PLANTS.default;

  return (
    <div className="action-panel glass-panel">
      <div className="panel-header">
        <div className="panel-title-group">
          <Heart size={18} className="panel-icon accent-pink" />
          <h2 className="panel-title">Take Action</h2>
        </div>
        <button className="close-btn" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>
      </div>

      {/* Species context */}
      <div className="action-hero">
        <span className="action-emoji">{species.emoji}</span>
        <div>
          <p className="action-hero-text">
            Help protect <strong>{species.name}</strong>
          </p>
          <p className="action-hero-sub">
            {species.nativeRegions.join(' · ')}
          </p>
        </div>
      </div>

      {/* Habitat tips */}
      <div className="action-section">
        <div className="action-section-header">
          <Leaf size={15} />
          <h3>What You Can Do at Home</h3>
        </div>
        <ul className="action-list">
          {tips.map((tip, i) => (
            <li key={i} className="action-list-item">
              <span className="action-check">✓</span>
              {tip}
            </li>
          ))}
        </ul>
      </div>

      {/* Native plants */}
      <div className="action-section">
        <div className="action-section-header">
          <MapPin size={15} />
          <h3>Native Plants for {region}</h3>
        </div>
        <div className="plant-tags">
          {plants.map((plant, i) => (
            <span key={i} className="plant-tag">{plant}</span>
          ))}
        </div>
      </div>

      {/* Conservation orgs */}
      <div className="action-section">
        <div className="action-section-header">
          <Heart size={15} />
          <h3>Conservation Organizations</h3>
        </div>
        <div className="org-list">
          {CONSERVATION_ORGS.slice(0, 4).map((org) => (
            <a
              key={org.name}
              href={org.url}
              target="_blank"
              rel="noreferrer"
              className="org-card"
            >
              <div className="org-info">
                <span className="org-name">{org.name}</span>
                <span className="org-region">{org.region}</span>
                <span className="org-focus">{org.focus}</span>
              </div>
              <ExternalLink size={13} className="org-link-icon" />
            </a>
          ))}
        </div>
      </div>

      <div className="action-footer">
        <p>🌍 Every observation counts — report sightings on eBird or iNaturalist to power the next generation of migration data.</p>
      </div>
    </div>
  );
}
