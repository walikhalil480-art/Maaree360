const fs = require('fs')
const path = require('path')

const targetDir = path.join(__dirname, '..', '..', '..', 'client', 'public', 'products')
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true })
}

const products = [
  {
    filename: 'pembe-maize-flour-2kg.svg',
    title: 'PEMBE',
    subtitle: 'SIFTED MAIZE MEAL',
    weight: '2 KG NET',
    primaryColor: '#1B5E20',
    accentColor: '#D32F2F',
    bgColor: '#FFFDE7',
    badgeText: 'FORTIFIED',
    iconType: 'maize',
  },
  {
    filename: 'jogoo-maize-flour-2kg.svg',
    title: 'JOGOO',
    subtitle: 'SIFTED MAIZE MEAL',
    weight: '2 KG',
    primaryColor: '#C62828',
    accentColor: '#FDD835',
    bgColor: '#FFF8E1',
    badgeText: 'KENYA FAVOURITE',
    iconType: 'rooster',
  },
  {
    filename: 'soko-wheat-flour-2kg.svg',
    title: 'SOKO',
    subtitle: 'HOME BAKING FLOUR',
    weight: '2 KG',
    primaryColor: '#1565C0',
    accentColor: '#FFB300',
    bgColor: '#E3F2FD',
    badgeText: 'ALL PURPOSE',
    iconType: 'wheat',
  },
  {
    filename: 'mwea-pishori-rice-2kg.svg',
    title: 'MWEA',
    subtitle: 'PURE PISHORI RICE',
    weight: '2 KG',
    primaryColor: '#4A148C',
    accentColor: '#FFD700',
    bgColor: '#F3E5F5',
    badgeText: 'AROMATIC GRADE 1',
    iconType: 'rice',
  },
  {
    filename: 'white-sugar-1kg.svg',
    title: 'PURE SUGAR',
    subtitle: 'CANE WHITE SUGAR',
    weight: '1 KG',
    primaryColor: '#00838F',
    accentColor: '#00E5FF',
    bgColor: '#E0F7FA',
    badgeText: 'FINE GRANULATED',
    iconType: 'sugar',
  },
  {
    filename: 'kensalt-iodized-salt-500g.svg',
    title: 'KENSALT',
    subtitle: 'IODIZED TABLE SALT',
    weight: '500G',
    primaryColor: '#0277BD',
    accentColor: '#D50000',
    bgColor: '#E1F5FE',
    badgeText: 'VACUUM EVAPORATED',
    iconType: 'salt',
  },
  {
    filename: 'rina-cooking-oil-1l.svg',
    title: 'RINA',
    subtitle: 'VEGETABLE COOKING OIL',
    weight: '1 LITRE',
    primaryColor: '#E65100',
    accentColor: '#FBC02D',
    bgColor: '#FFF3E0',
    badgeText: 'CHOLESTEROL FREE',
    iconType: 'oil',
  },
  {
    filename: 'kcc-uht-milk-500ml.svg',
    title: 'KCC',
    subtitle: 'HOMOGENIZED UHT MILK',
    weight: '500 ML',
    primaryColor: '#0D47A1',
    accentColor: '#00B0FF',
    bgColor: '#E1F5FE',
    badgeText: 'FULL CREAM',
    iconType: 'milk-carton',
  },
  {
    filename: 'brookside-fresh-milk-1l.svg',
    title: 'BROOKSIDE',
    subtitle: 'FRESH WHOLE MILK',
    weight: '1 LITRE',
    primaryColor: '#2E7D32',
    accentColor: '#81C784',
    bgColor: '#E8F5E9',
    badgeText: 'PASTEURIZED',
    iconType: 'milk-bottle',
  },
  {
    filename: 'supaloaf-white-bread-400g.svg',
    title: 'SUPALOAF',
    subtitle: 'FRESH WHITE BREAD',
    weight: '400G',
    primaryColor: '#B71C1C',
    accentColor: '#FFD600',
    bgColor: '#FFEBEE',
    badgeText: 'ENRICHED SLICED',
    iconType: 'bread',
  },
  {
    filename: 'fresh-farm-eggs.svg',
    title: 'FARM EGGS',
    subtitle: 'GRADED BROWN EGGS',
    weight: 'FRESH TRAY',
    primaryColor: '#795548',
    accentColor: '#FFA000',
    bgColor: '#EFEBE9',
    badgeText: 'GRADE A FARM',
    iconType: 'eggs',
  },
  {
    filename: 'blueband-margarine-250g.svg',
    title: 'BLUE BAND',
    subtitle: 'ORIGINAL SPREAD',
    weight: '250G',
    primaryColor: '#1A237E',
    accentColor: '#FFD600',
    bgColor: '#FFFDE7',
    badgeText: 'OMEGA 3 & 6',
    iconType: 'tub',
  },
  {
    filename: 'ketepa-tea-bags-50s.svg',
    title: 'KETEPA PRIDE',
    subtitle: 'KENYAN BLACK TEA',
    weight: '50 TEA BAGS',
    primaryColor: '#1B5E20',
    accentColor: '#FBC02D',
    bgColor: '#E8F5E9',
    badgeText: 'RICH CTC TEA',
    iconType: 'tea',
  },
  {
    filename: 'nescafe-instant-coffee-100g.svg',
    title: 'NESCAFE',
    subtitle: 'CLASSIC SOLUBLE COFFEE',
    weight: '100G JAR',
    primaryColor: '#3E2723',
    accentColor: '#D32F2F',
    bgColor: '#EFEBE9',
    badgeText: '100% PURE COFFEE',
    iconType: 'jar',
  },
  {
    filename: 'keringet-water-1l.svg',
    title: 'KERINGET',
    subtitle: 'NATURAL MINERAL WATER',
    weight: '1 LITRE',
    primaryColor: '#01579B',
    accentColor: '#00E5FF',
    bgColor: '#E0F7FA',
    badgeText: 'RIFT VALLEY SOURCE',
    iconType: 'water',
  },
  {
    filename: 'fanta-orange-500ml.svg',
    title: 'FANTA',
    subtitle: 'ORANGE FLAVOURED SODA',
    weight: '500 ML',
    primaryColor: '#E65100',
    accentColor: '#1B5E20',
    bgColor: '#FFF3E0',
    badgeText: 'SPARKLING SODA',
    iconType: 'soda',
  },
  {
    filename: 'ariel-washing-powder-1kg.svg',
    title: 'ARIEL',
    subtitle: 'LAUNDRY DETERGENT',
    weight: '1 KG',
    primaryColor: '#00695C',
    accentColor: '#00E676',
    bgColor: '#E0F2F1',
    badgeText: 'ACTIVE ENZYMES',
    iconType: 'detergent',
  },
  {
    filename: 'sunlight-dishwashing-liquid-500ml.svg',
    title: 'SUNLIGHT',
    subtitle: 'DISHWASHING LIQUID',
    weight: '500 ML',
    primaryColor: '#F57F17',
    accentColor: '#2E7D32',
    bgColor: '#FFFDE7',
    badgeText: 'REAL LEMON JUICE',
    iconType: 'dishwashing',
  },
  {
    filename: 'geisha-bathing-soap-125g.svg',
    title: 'GEISHA',
    subtitle: 'BEAUTY BAR SOAP',
    weight: '125G',
    primaryColor: '#2E7D32',
    accentColor: '#FFB300',
    bgColor: '#E8F5E9',
    badgeText: 'ALOE VERA & HONEY',
    iconType: 'soap',
  },
  {
    filename: 'colgate-toothpaste-100ml.svg',
    title: 'COLGATE',
    subtitle: 'MAXIMUM CAVITY PROTECTION',
    weight: '100 ML',
    primaryColor: '#C62828',
    accentColor: '#0288D1',
    bgColor: '#FFEBEE',
    badgeText: 'FLUORIDE & CALCIUM',
    iconType: 'toothpaste',
  },
]

function renderPackagingSvg(p) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320" width="100%" height="100%">
  <defs>
    <radialGradient id="bgGrad_${p.title}" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FFFFFF" />
      <stop offset="100%" stop-color="${p.bgColor}" />
    </radialGradient>
    <filter id="packShadow" x="-10%" y="-10%" width="125%" height="130%" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#172B4D" flood-opacity="0.12" />
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#172B4D" flood-opacity="0.08" />
    </filter>
    <linearGradient id="primaryGrad_${p.title}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${p.primaryColor}" />
      <stop offset="100%" stop-color="${p.primaryColor}" stop-opacity="0.85" />
    </linearGradient>
  </defs>

  <!-- Background Canvas -->
  <rect width="320" height="320" rx="16" fill="url(#bgGrad_${p.title})" />

  <!-- Shadow under pack -->
  <ellipse cx="160" cy="275" rx="72" ry="12" fill="#172B4D" opacity="0.10" />

  <!-- Main Product Container (Square / Retail Packshot) -->
  <g filter="url(#packShadow)">
    <!-- Package Body -->
    <rect x="75" y="45" width="170" height="220" rx="14" fill="#FFFFFF" stroke="#E4E7EC" stroke-width="2" />
    
    <!-- Top Header Color Block -->
    <path d="M 75 59 Q 75 45 89 45 L 231 45 Q 245 45 245 59 L 245 125 L 75 125 Z" fill="url(#primaryGrad_${p.title})" />
    
    <!-- Accent Ribbon / Stripe -->
    <rect x="75" y="125" width="170" height="6" fill="${p.accentColor}" />
    
    <!-- Brand Title -->
    <text x="160" y="85" font-family="'Inter', -apple-system, BlinkMacSystemFont, sans-serif" font-size="20" font-weight="900" fill="#FFFFFF" text-anchor="middle" letter-spacing="0.5">
      ${p.title}
    </text>
    
    <!-- Subtitle on Header -->
    <text x="160" y="105" font-family="'Inter', -apple-system, BlinkMacSystemFont, sans-serif" font-size="8.5" font-weight="700" fill="#FFFFFF" opacity="0.9" text-anchor="middle" letter-spacing="1">
      ${p.subtitle}
    </text>

    <!-- Center Pack Visual Motif -->
    <circle cx="160" cy="180" r="38" fill="${p.bgColor}" stroke="#E4E7EC" stroke-width="1.5" />
    <circle cx="160" cy="180" r="30" fill="#FFFFFF" />

    <!-- Quality Seal / Badge -->
    <rect x="110" y="222" width="100" height="18" rx="9" fill="${p.primaryColor}" opacity="0.08" />
    <text x="160" y="234" font-family="'Inter', -apple-system, BlinkMacSystemFont, sans-serif" font-size="8" font-weight="800" fill="${p.primaryColor}" text-anchor="middle" letter-spacing="0.5">
      ${p.badgeText}
    </text>

    <!-- Net Quantity / Weight -->
    <text x="160" y="255" font-family="'JetBrains Mono', monospace" font-size="11" font-weight="700" fill="#252B36" text-anchor="middle">
      ${p.weight}
    </text>

    <!-- Inner Illustration Symbol based on product type -->
    ${getCenterIcon(p.iconType, p.primaryColor, p.accentColor)}
  </g>
</svg>`
}

function getCenterIcon(type, primary, accent) {
  switch (type) {
    case 'maize':
      return `<path d="M152 165 C152 155 168 155 168 165 L166 195 C166 200 154 200 154 195 Z" fill="${accent}" />
              <path d="M148 185 C145 175 142 165 152 160 C154 175 152 185 148 185 Z" fill="${primary}" />
              <path d="M172 185 C175 175 178 165 168 160 C166 175 168 185 172 185 Z" fill="${primary}" />`
    case 'rooster':
      return `<path d="M155 168 Q158 160 165 162 Q168 165 168 172 Q173 175 170 185 Q164 195 154 195 Q148 190 148 180 Q148 172 155 168 Z" fill="${primary}" />
              <circle cx="164" cy="166" r="1.5" fill="#FFFFFF" />
              <polygon points="167,167 173,170 167,173" fill="${accent}" />`
    case 'wheat':
      return `<path d="M160 160 L160 200" stroke="${primary}" stroke-width="2" stroke-linecap="round" />
              <ellipse cx="156" cy="168" rx="4" ry="7" transform="rotate(-30 156 168)" fill="${accent}" />
              <ellipse cx="164" cy="168" rx="4" ry="7" transform="rotate(30 164 168)" fill="${accent}" />
              <ellipse cx="156" cy="180" rx="4" ry="7" transform="rotate(-30 156 180)" fill="${accent}" />
              <ellipse cx="164" cy="180" rx="4" ry="7" transform="rotate(30 164 180)" fill="${accent}" />`
    case 'rice':
      return `<path d="M145 185 Q160 202 175 185 Z" fill="${primary}" />
              <path d="M142 185 Q160 180 178 185 Z" fill="#FFFFFF" stroke="${primary}" stroke-width="1.5" />
              <ellipse cx="156" cy="178" rx="2" ry="4" transform="rotate(25 156 178)" fill="${accent}" />
              <ellipse cx="164" cy="178" rx="2" ry="4" transform="rotate(-20 164 178)" fill="${accent}" />`
    case 'sugar':
      return `<polygon points="160,162 172,172 168,188 152,188 148,172" fill="${primary}" opacity="0.8" />
              <polygon points="160,165 169,173 160,185 151,173" fill="#FFFFFF" opacity="0.6" />`
    case 'salt':
      return `<path d="M152 165 L168 165 L172 195 L148 195 Z" fill="${primary}" rx="2" />
              <rect x="154" y="160" width="12" height="5" rx="1" fill="${accent}" />
              <circle cx="160" cy="180" r="3" fill="#FFFFFF" />`
    case 'oil':
      return `<path d="M154 162 L166 162 L172 175 L172 198 L148 198 L148 175 Z" fill="${accent}" />
              <rect x="156" y="157" width="8" height="5" fill="${primary}" />
              <circle cx="160" cy="185" r="4" fill="#FFFFFF" opacity="0.7" />`
    case 'milk-carton':
      return `<polygon points="152,160 168,160 172,166 148,166" fill="${primary}" />
              <rect x="148" y="166" width="24" height="32" fill="#FFFFFF" stroke="${primary}" stroke-width="1.5" />
              <path d="M148 178 Q160 170 172 178 L172 198 L148 198 Z" fill="${accent}" />`
    case 'milk-bottle':
      return `<rect x="156" y="158" width="8" height="4" fill="${primary}" />
              <path d="M155 162 Q150 170 150 185 L150 198 L170 198 L170 185 Q170 170 165 162 Z" fill="#FFFFFF" stroke="${primary}" stroke-width="1.5" />
              <rect x="150" y="180" width="20" height="12" fill="${accent}" opacity="0.8" />`
    case 'bread':
      return `<rect x="146" y="165" width="28" height="30" rx="6" fill="${accent}" stroke="${primary}" stroke-width="1.5" />
              <line x1="152" y1="170" x2="152" y2="190" stroke="#FFFFFF" stroke-width="1.5" />
              <line x1="160" y1="170" x2="160" y2="190" stroke="#FFFFFF" stroke-width="1.5" />
              <line x1="168" y1="170" x2="168" y2="190" stroke="#FFFFFF" stroke-width="1.5" />`
    case 'eggs':
      return `<ellipse cx="155" cy="180" rx="7" ry="10" transform="rotate(-15 155 180)" fill="${primary}" />
              <ellipse cx="166" cy="180" rx="7" ry="10" transform="rotate(15 166 180)" fill="${accent}" />`
    case 'tub':
      return `<polygon points="146,168 174,168 170,195 150,195" fill="${accent}" />
              <rect x="144" y="164" width="32" height="6" rx="2" fill="${primary}" />`
    case 'tea':
      return `<rect x="146" y="166" width="28" height="28" rx="3" fill="${primary}" />
              <path d="M160 172 Q166 176 164 185 Q158 185 160 172 Z" fill="${accent}" />`
    case 'jar':
      return `<rect x="152" y="160" width="16" height="6" rx="1" fill="${accent}" />
              <rect x="148" y="166" width="24" height="32" rx="4" fill="${primary}" />
              <rect x="151" y="174" width="18" height="16" rx="2" fill="#FFFFFF" />`
    case 'water':
      return `<rect x="157" y="158" width="6" height="4" fill="${primary}" />
              <rect x="152" y="162" width="16" height="36" rx="4" fill="${accent}" opacity="0.6" stroke="${primary}" stroke-width="1" />
              <path d="M152 178 Q160 174 168 178" stroke="#FFFFFF" stroke-width="1.5" fill="none" />`
    case 'soda':
      return `<rect x="157" y="158" width="6" height="4" fill="${accent}" />
              <path d="M155 162 L165 162 L168 175 L166 198 L154 198 L152 175 Z" fill="${primary}" />
              <circle cx="160" cy="180" r="4" fill="#FFFFFF" opacity="0.9" />`
    case 'detergent':
      return `<path d="M150 165 L170 165 L174 198 L146 198 Z" fill="${primary}" rx="2" />
              <ellipse cx="160" cy="180" rx="8" ry="4" stroke="${accent}" stroke-width="2" fill="none" transform="rotate(45 160 180)" />
              <ellipse cx="160" cy="180" rx="8" ry="4" stroke="${accent}" stroke-width="2" fill="none" transform="rotate(-45 160 180)" />`
    case 'dishwashing':
      return `<rect x="158" y="158" width="4" height="5" fill="${accent}" />
              <path d="M154 163 L166 163 L169 174 L167 198 L153 198 L151 174 Z" fill="${primary}" />
              <circle cx="160" cy="182" r="6" fill="#FFFDE7" />
              <path d="M156 182 Q160 178 164 182" stroke="${accent}" stroke-width="1.5" fill="none" />`
    case 'soap':
      return `<rect x="146" y="168" width="28" height="22" rx="6" fill="${primary}" />
              <ellipse cx="160" cy="179" rx="8" ry="5" fill="#FFFFFF" opacity="0.4" />`
    case 'toothpaste':
      return `<rect x="144" y="170" width="32" height="18" rx="2" fill="${primary}" />
              <rect x="144" y="175" width="32" height="6" fill="#FFFFFF" />
              <polygon points="144,179 176,179 176,182 144,182" fill="${accent}" />`
    default:
      return `<circle cx="160" cy="180" r="10" fill="${primary}" />`
  }
}

for (const p of products) {
  const filePath = path.join(targetDir, p.filename)
  fs.writeFileSync(filePath, renderPackagingSvg(p), 'utf-8')
  console.log(`Generated: ${p.filename}`)
}

console.log('All 20 Kenyan retail product packshot illustrations generated successfully!')
