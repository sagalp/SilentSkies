import { useState } from 'react';
import { X, Leaf, Heart, ExternalLink, ChevronRight, CheckCircle, Copy } from 'lucide-react';
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
  icon: string;
}

const CONSERVATION_ORGS: ConservationOrg[] = [
  { name: 'BirdLife International', region: 'Global', url: 'https://www.birdlife.org', focus: 'Species conservation & international advocacy', icon: '🌍' },
  { name: 'American Bird Conservancy', region: 'Americas', url: 'https://abcbirds.org', focus: 'Bird habitat protection & policy reform', icon: '🦅' },
  { name: 'RSPB', region: 'Europe', url: 'https://www.rspb.org.uk', focus: 'UK-wide bird conservation & reserves', icon: '🐦' },
  { name: 'Cornell Lab of Ornithology', region: 'North America', url: 'https://www.birds.cornell.edu', focus: 'Research, eBird & citizen science', icon: '🔬' },
  { name: 'African Bird Club', region: 'Africa', url: 'https://www.africanbirdclub.org', focus: 'African avifauna research & protection', icon: '🌿' },
  { name: 'Wildlife Conservation Society', region: 'Global', url: 'https://www.wcs.org', focus: 'Large-scale habitat protection', icon: '🏔️' },
];

type Setting = 'urban' | 'suburban' | 'rural';

const SETTING_TIPS: Record<Setting, { tips: { title: string; sub: string }[] }> = {
  urban: {
    tips: [
      { title: 'Install window strike decals', sub: 'Up to 1 billion birds die from window collisions annually in North America' },
      { title: 'Turn off city lights during migration season', sub: 'Artificial light at night disorients migrants — reduce from April–May & Sept–Oct' },
      { title: 'Plant native species in window boxes & balconies', sub: 'Even small containers attract insects that sustain songbirds' },
      { title: 'Keep cats indoors — especially May through September', sub: 'Free-roaming cats kill 1.3–4 billion birds per year in the US alone' },
    ],
  },
  suburban: {
    tips: [
      { title: 'Create a native plant corridor in your garden', sub: 'Connect habitat patches to support migration routes through your neighborhood' },
      { title: 'Eliminate pesticide use on your lawn', sub: 'Switch to organic alternatives — insecticide-treated lawns remove the food base birds depend on' },
      { title: 'Install a nest box appropriate for local species', sub: 'Proper placement (height, direction, predator guard) doubles occupation rates' },
      { title: 'Reduce mowing frequency during May–July', sub: 'Tall grass margins provide critical foraging and nesting cover for ground-nesting birds' },
    ],
  },
  rural: {
    tips: [
      { title: 'Maintain hedgerow corridors between fields', sub: 'Hedgerows are critical migration highways and nesting refuges for farmland birds' },
      { title: 'Enroll in agri-environment stewardship schemes', sub: 'Government programs can compensate for habitat-friendly farming practices' },
      { title: 'Create beetle banks and grass margins', sub: '2m wildflower/grass margins around fields restore insect prey and provide shelter' },
      { title: 'Delay field clearance to winter after September', sub: 'Allows seed-producing plants to persist through autumn when migrants need fuel most' },
    ],
  },
};

const HABITAT_TIPS_BY_FAMILY: Record<string, { title: string; sub: string }[]> = {
  Hirundinidae: [
    { title: 'Install mud nest cups under eaves', sub: 'Swallows return to the same nest sites annually — protect existing nests under eaves and barns' },
    { title: 'Maintain insect-rich habitats near water bodies', sub: 'Swallows feed exclusively on aerial insects; ponds and streams are essential foraging corridors' },
  ],
  Apodidae: [
    { title: 'Install swift nest boxes 6m+ high on walls', sub: 'Swifts cannot take off from flat ground — high-mounted boxes are essential for successful colonies' },
    { title: 'Retrofit new buildings with swift bricks', sub: 'Advocate for swift brick inclusion in local planning applications' },
  ],
  Gruidae: [
    { title: 'Support wetland restoration projects', sub: 'Cranes depend on undisturbed shallow wetlands for roosting — wetland restoration is the highest-impact intervention' },
    { title: 'Avoid disturbing winter roost sites', sub: 'Disturbance at traditional crane roost sites causes energy-costly displacement during the critical winter period' },
  ],
  Accipitridae: [
    { title: 'Report illegal raptor persecution immediately', sub: 'Poisoning, shooting and nest destruction are illegal — report to local wildlife crime officers' },
    { title: 'Campaign against lead ammunition', sub: 'Ingested lead from shot game causes fatal poisoning in raptors — advocate for lead-free alternatives' },
  ],
};

const NATIVE_PLANTS: Record<string, string[]> = {
  'North America': ['Purple Coneflower', 'Black-eyed Susan', 'Wild Bergamot', 'Native Oak', 'Serviceberry', 'Wild Columbine'],
  'Europe': ['Hawthorn', 'Blackthorn', 'Field Scabious', 'Ox-eye Daisy', 'Purple Loosestrife', 'Bramble'],
  'Africa': ['Acacia', 'Wild Fig', 'Cape Honeybush', 'Rooibos', 'Wild Olive'],
  'Asia': ['Chinese Hackberry', 'Mulberry', 'Japanese Snowbell', 'Native Bamboo', 'Wild Cherry'],
  'Arctic': ['Arctic Willow', 'Bog Cotton', 'Crowberry', 'Cloudberry'],
  default: ['Native Wildflower Mix', 'Local Berry Shrubs', 'Native Grasses', 'Insect-friendly Herbs'],
};

const SETTING_OPTIONS = [
  { key: 'urban' as Setting, icon: '🏙️', title: 'Urban / City', subtitle: 'Apartment, rooftop, or dense neighborhood' },
  { key: 'suburban' as Setting, icon: '🏡', title: 'Suburban / Garden', subtitle: 'House with a garden or yard' },
  { key: 'rural' as Setting, icon: '🌾', title: 'Rural / Farmland', subtitle: 'Countryside, field, or large land plot' },
];

export function ActionPanel({ species, onClose }: ActionPanelProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [setting, setSetting] = useState<Setting | null>(null);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [orgRegion, setOrgRegion] = useState<string>('All');
  const [pledgeCopied, setPledgeCopied] = useState(false);

  const region = species.nativeRegions[0];
  const plants = NATIVE_PLANTS[region] || NATIVE_PLANTS.default;

  // Merge family-specific + setting-specific tips
  const settingTips = setting ? SETTING_TIPS[setting].tips : [];
  const familyTips = HABITAT_TIPS_BY_FAMILY[species.family] || [];
  const allTips = [...familyTips, ...settingTips];

  const toggleCheck = (i: number) => {
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  };

  const handlePledge = () => {
    const pledgeText = `I pledge to take action for ${species.name} (${species.scientific})! 🐦 #SilentSkies #AI4World #BirdConservation\n\nMy actions:\n${allTips.map((t, i) => `${i + 1}. ${t.title}`).join('\n')}`;
    navigator.clipboard.writeText(pledgeText).then(() => {
      setPledgeCopied(true);
      setTimeout(() => setPledgeCopied(false), 2500);
    });
  };

  const filteredOrgs = orgRegion === 'All'
    ? CONSERVATION_ORGS
    : CONSERVATION_ORGS.filter(o => o.region === orgRegion || o.region === 'Global');

  const orgRegions = ['All', 'Global', 'Americas', 'North America', 'Europe', 'Africa'];

  const stepDone = (s: number) =>
    (s === 1 && setting !== null) ||
    (s === 2 && checked.size > 0) ||
    s === 3;

  return (
    <div className="action-panel glass-panel">
      <div className="panel-header">
        <div className="panel-title-group">
          <Heart size={16} className="accent-pink" />
          <h2 className="panel-title">Take Action</h2>
        </div>
        <button className="close-btn" onClick={onClose} aria-label="Close">
          <X size={16} />
        </button>
      </div>

      {/* Step progress bar */}
      <div className="action-steps-bar">
        {[
          { n: 1, label: 'Your Setting' },
          { n: 2, label: 'Action Plan' },
          { n: 3, label: 'Connect' },
        ].map((s, i) => (
          <>
            <button
              key={s.n}
              className={`action-step-pill ${step === s.n ? 'active' : ''} ${stepDone(s.n) && step !== s.n ? 'done' : ''}`}
              onClick={() => setStep(s.n as 1 | 2 | 3)}
            >
              <span className={`action-step-num ${stepDone(s.n) && step !== s.n ? 'done-check' : ''}`}>
                {stepDone(s.n) && step !== s.n ? '✓' : s.n}
              </span>
              {s.label}
            </button>
            {i < 2 && <div className="action-step-sep" />}
          </>
        ))}
      </div>

      {/* STEP 1: Setting quiz */}
      {step === 1 && (
        <div className="action-step-content">
          <div className="action-species-hero">
            <span className="action-hero-emoji">{species.emoji}</span>
            <div>
              <p className="action-hero-text">Help protect <strong>{species.name}</strong></p>
              <p className="action-hero-sub">{species.nativeRegions.join(' · ')}</p>
            </div>
          </div>

          <p className="action-quiz-heading">Where do you live?</p>
          <p className="action-quiz-sub">
            We'll tailor your action plan to your environment so every step is practical and achievable.
          </p>

          {SETTING_OPTIONS.map(opt => (
            <button
              key={opt.key}
              className={`setting-option ${setting === opt.key ? 'selected' : ''}`}
              onClick={() => setSetting(opt.key)}
            >
              <span className="setting-icon">{opt.icon}</span>
              <div className="setting-text">
                <span className="setting-title">{opt.title}</span>
                <span className="setting-subtitle">{opt.subtitle}</span>
              </div>
              <div className="setting-check">
                {setting === opt.key && <CheckCircle size={11} color="#050a0e" strokeWidth={3} />}
              </div>
            </button>
          ))}

          <button
            className="action-next-btn"
            onClick={() => setStep(2)}
            disabled={!setting}
          >
            Build My Action Plan <ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* STEP 2: Action plan checklist */}
      {step === 2 && (
        <div className="action-step-content">
          <div className="action-species-hero">
            <span className="action-hero-emoji">{species.emoji}</span>
            <div>
              <p className="action-hero-text">
                {setting === 'urban' ? '🏙️ Urban' : setting === 'suburban' ? '🏡 Suburban' : '🌾 Rural'} action plan for <strong>{species.name}</strong>
              </p>
              <p className="action-hero-sub">
                {checked.size}/{allTips.length} actions checked — tick each one as you take it
              </p>
            </div>
          </div>

          <div className="action-plan-section">
            {familyTips.length > 0 && (
              <p className="action-plan-label">Species-specific ({species.family})</p>
            )}
            {familyTips.map((tip, i) => (
              <button
                key={i}
                className={`action-card ${checked.has(i) ? 'checked' : ''}`}
                onClick={() => toggleCheck(i)}
              >
                <span className="action-card-num">0{i + 1}</span>
                <div className="action-card-body">
                  <span className="action-card-title">{tip.title}</span>
                  <span className="action-card-sub">{tip.sub}</span>
                </div>
                <div className="action-card-check">
                  {checked.has(i) && <CheckCircle size={10} color="#050a0e" strokeWidth={3} />}
                </div>
              </button>
            ))}

            {settingTips.length > 0 && (
              <p className="action-plan-label" style={{ marginTop: familyTips.length > 0 ? 6 : 0 }}>
                Your {setting} environment
              </p>
            )}
            {settingTips.map((tip, i) => {
              const idx = familyTips.length + i;
              return (
                <button
                  key={idx}
                  className={`action-card ${checked.has(idx) ? 'checked' : ''}`}
                  onClick={() => toggleCheck(idx)}
                >
                  <span className="action-card-num">0{idx + 1}</span>
                  <div className="action-card-body">
                    <span className="action-card-title">{tip.title}</span>
                    <span className="action-card-sub">{tip.sub}</span>
                  </div>
                  <div className="action-card-check">
                    {checked.has(idx) && <CheckCircle size={10} color="#050a0e" strokeWidth={3} />}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Native plants */}
          <div>
            <p className="action-plan-label"><Leaf size={10} style={{ display: 'inline', marginRight: 4 }} />Native plants for {region}</p>
            <div className="plant-tags">
              {plants.map((plant, i) => (
                <span key={i} className="plant-tag">{plant}</span>
              ))}
            </div>
          </div>

          <button className="action-next-btn" onClick={() => setStep(3)}>
            Connect with Organizations <ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* STEP 3: Orgs + pledge */}
      {step === 3 && (
        <div className="action-step-content">
          <div className="action-species-hero">
            <span className="action-hero-emoji">🌍</span>
            <div>
              <p className="action-hero-text">Conservation organizations</p>
              <p className="action-hero-sub">Join the people protecting {species.name} globally</p>
            </div>
          </div>

          {/* Region filter chips */}
          <div className="region-chips">
            {orgRegions.map(r => (
              <button
                key={r}
                className={`region-chip ${orgRegion === r ? 'active' : ''}`}
                onClick={() => setOrgRegion(r)}
              >
                {r}
              </button>
            ))}
          </div>

          <div className="org-list">
            {filteredOrgs.map(org => (
              <a
                key={org.name}
                href={org.url}
                target="_blank"
                rel="noreferrer"
                className="org-card"
              >
                <div className="org-icon">{org.icon}</div>
                <div className="org-info">
                  <span className="org-name">{org.name}</span>
                  <span className="org-region">{org.region}</span>
                  <span className="org-focus">{org.focus}</span>
                </div>
                <ExternalLink size={12} className="org-link-icon" />
              </a>
            ))}
          </div>

          {/* Share pledge */}
          <button
            className={`pledge-btn ${pledgeCopied ? 'copied' : ''}`}
            onClick={handlePledge}
          >
            {pledgeCopied ? (
              <><CheckCircle size={14} /> Pledge copied to clipboard!</>
            ) : (
              <><Copy size={14} /> Share your pledge</>
            )}
          </button>
        </div>
      )}

      <div className="action-footer">
        🌿 Every observation counts — report sightings on eBird or iNaturalist to power future migration data.
      </div>
    </div>
  );
}
