import { useEffect, useState, useRef, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './App.css'
import SpecularButton from './SpecularButton'
import TiltedCard from './TiltedCard'
import LightRays from './LightRays'
import ParticleText from './ParticleText'
import { useSiteCms } from './site/SiteCmsContext'
import partnerKobelco from './assets/partners/kobelco.png'
import partnerEverstage from './assets/partners/everstage.png'
import partnerEnabl from './assets/partners/enabl.png'
import partnerBlackstraw from './assets/partners/blackstraw.png'
import partnerQuickplay from './assets/partners/quickplay.png'
import partnerRenault from './assets/partners/renault.png'
import partnerFirstChoice from './assets/partners/first-choice.png'
import partnerLebara from './assets/partners/lebara.png'
import senateLogo from './assets/senate-logo.png'
import shabirPortrait from './assets/shabir.png'
import solWorkstations from './assets/solutions/workstations.jpg'
import solPrivateCabin from './assets/solutions/private-cabin.jpg'
import solPassage from './assets/solutions/passage.jpg'
import solOpenSpace from './assets/solutions/open-space.jpg'
import solPantry from './assets/solutions/pantry.jpg'
import galleryLobby from './assets/gallery/lobby.jpg'
import galleryOpenDesk from './assets/gallery/open-desk.jpg'
import galleryCabin from './assets/gallery/cabin.jpg'
import galleryMeeting from './assets/gallery/meeting.jpg'
import galleryLounge from './assets/gallery/lounge.jpg'
import galleryPantry from './assets/gallery/pantry.jpg'
import galleryWorkstations from './assets/gallery/workstations.jpg'
import galleryPassage from './assets/gallery/passage.jpg'
import galleryNature from './assets/gallery/nature.jpg'
import blogWorkspace from './assets/blog/workspace.jpg'
import blogCulture from './assets/blog/culture.jpg'
import blogTips from './assets/blog/tips.jpg'

const FALLBACK_NAV_SOLUTIONS = [
  { id: 'sol-workstations', label: 'Work Stations', to: '/solutions/workstations' },
  { id: 'sol-private-cabin', label: 'Private Cabin', to: '/solutions/private-cabin' },
  { id: 'sol-passage', label: 'Passage', to: '/solutions/passage' },
  { id: 'sol-open-space', label: "Open Space with Nature's Touch", to: '/solutions/open-space' },
  { id: 'sol-pantry', label: 'Pantry', to: '/solutions/pantry' },
]

const FALLBACK_NAV_PACKAGES = [
  { id: 'plan-a', label: 'Plan A – Virtual Office', to: '/packages' },
  { id: 'plan-b', label: 'Plan B – Coworking / Private Cabin', to: '/packages' },
  { id: 'plan-c', label: 'Plan C – Day Pass', to: '/packages' },
]

const FALLBACK_CONTACTS_LOCAL = {
  whatsapp: [
    { label: '99401 59401', href: 'https://wa.me/919940159401' },
    { label: '99406 87628', href: 'https://wa.me/919940687628' },
  ],
  call: [{ label: '98405 95229', href: 'tel:+919840595229' }],
  email: [
    { label: 'prime@senatespace.com', href: 'mailto:prime@senatespace.com' },
    { label: 'federal@senatespace.com', href: 'mailto:federal@senatespace.com' },
    { label: 'shabeer@senatespace.com', href: 'mailto:shabeer@senatespace.com' },
  ],
}

const FALLBACK_BRANCHES_LOCAL = [
  {
    id: 's1',
    label: 'S1',
    address: 'W 126, 3rd Floor, 3rd Avenue, Anna Nagar, Chennai – 600040',
    mapEmbed:
      'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3693.8861956887554!2d80.2178548!3d13.0883669!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a526424513aab9d%3A0x924a769fbc797c5b!2sSenate%20Space!5e1!3m2!1sen!2sin!4v1786613903801!5m2!1sen!2sin',
  },
  {
    id: 's2',
    label: 'S2',
    address: '1&1A, U R Nagar Extn., Anna Nagar Western Extn., Chennai – 600101',
    mapEmbed:
      'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3693.7117350751587!2d80.1941523!3d13.1000011!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a5265821eda188b%3A0x80e65cd6ee68c39a!2sSenate%20Space%2002!5e1!3m2!1sen!2sin!4v1786613944055!5m2!1sen!2sin',
  },
  {
    id: 's3',
    label: 'S3',
    address: 'W 115, 1st Floor, 3rd Avenue, Anna Nagar, Chennai – 600040',
    mapEmbed:
      'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3693.8861956887554!2d80.2178548!3d13.0883669!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a526424513aab9d%3A0x924a769fbc797c5b!2sSenate%20Space!5e1!3m2!1sen!2sin!4v1786613972120!5m2!1sen!2sin',
  },
  {
    id: 's4',
    label: 'S4',
    address: 'W117, 2nd Floor, Ravilla Towers, 3rd Ave, Anna Nagar, Chennai, Tamil Nadu 600040',
    mapEmbed:
      'https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d3693.9319681985953!2d80.2167838!3d13.0853128!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a52642682635e65%3A0xee16759e2e192143!2sVIP%20LOUNGE%20-%20ANNANAGAR%201%20-%20CHENNAI!5e1!3m2!1sen!2sin!4v1786613992145!5m2!1sen!2sin',
  },
  {
    id: 's5',
    label: 'S5',
    address: 'W110, Gokulam Building, 3rd Avenue, Anna Nagar, Chennai – 600040',
    mapEmbed:
      'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3693.8861956887554!2d80.2178548!3d13.0883669!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a526424513aab9d%3A0x924a769fbc797c5b!2sSenate%20Space!5e1!3m2!1sen!2sin!4v1786614011324!5m2!1sen!2sin',
  },
]

const QUICK_LINKS = [
  { id: 'home', label: 'Home' },
  { id: 'about', label: 'About' },
  { id: 'solutions', label: 'Solutions' },
  { id: 'package', label: 'Packages' },
  { id: 'gallery', label: 'Gallery' },
]

const USEFUL_LINKS = [
  { id: 'partners', label: 'Our Partner' },
  { id: 'why-choose', label: 'Why choose us' },
  { id: 'all-in', label: 'ALL IN...' },
  { id: 'senators-work', label: 'How Senators work' },
  { id: 'why-apart', label: 'Why we are apart' },
  { id: 'blog', label: 'Blog' },
]

const specularProps = {
  radius: 18,
  tint: '#ffffff',
  tintOpacity: 0,
  blur: 0,
  textColor: '#f5f5f5',
  lineColor: '#ffffff',
  baseColor: '#525252',
  intensity: 1,
  shineSize: 10,
  shineFade: 40,
  thickness: 1,
  speed: 0.35,
  followMouse: true,
  proximity: 250,
  autoAnimate: false,
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.14-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.06 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.48.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.42-.07-.12-.27-.2-.57-.35Zm-5.42 7.4h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37A9.86 9.86 0 0 1 2.16 11.9C2.16 6.45 6.6 2.01 12.05 2.01a9.82 9.82 0 0 1 6.99 2.9 9.83 9.83 0 0 1 2.89 6.99c0 5.45-4.44 9.88-9.88 9.88Zm8.41-18.3A11.82 11.82 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L0 24l6.3-1.65a11.88 11.88 0 0 0 5.69 1.45h.01c6.55 0 11.89-5.34 11.89-11.9 0-3.18-1.24-6.16-3.49-8.41Z"
      />
    </svg>
  )
}

function FooterPhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6.5 3.75h2.2c.6 0 1.1.4 1.25 1l.7 2.5c.12.45 0 .93-.32 1.27L9.1 9.8a12.4 12.4 0 0 0 5.1 5.1l1.28-1.23c.34-.33.82-.45 1.27-.33l2.5.7c.6.16 1 .65 1 1.25v2.2c0 .7-.57 1.26-1.26 1.2C9.9 18.3 5.7 14.1 5.3 5.01c-.06-.7.5-1.26 1.2-1.26Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function FooterMailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect
        x="3.5"
        y="5.5"
        width="17"
        height="13"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M4.5 7.5 12 13l7.5-5.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ContactIcon() {
  return (
    <svg className="btn-contact__icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M4.5 5.25h15A1.5 1.5 0 0 1 21 6.75v10.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.25V6.75a1.5 1.5 0 0 1 1.5-1.5Zm.75 2.13v-.63h13.5v.63l-6.75 4.5-6.75-4.5Zm13.5 1.74v8.13H5.25V9.12l6.4 4.27a.75.75 0 0 0 .82 0l6.28-4.27Z"
      />
    </svg>
  )
}

const FALLBACK_PARTNERS = [
  { name: 'Kobelco', logo: partnerKobelco },
  { name: 'Everstage', logo: partnerEverstage },
  { name: 'Enabl', logo: partnerEnabl },
  { name: 'Blackstraw', logo: partnerBlackstraw },
  { name: 'Quickplay', logo: partnerQuickplay },
  { name: 'Renault', logo: partnerRenault },
  { name: 'Mahindra First Choice', logo: partnerFirstChoice },
  { name: 'Lebara', logo: partnerLebara },
]

const FALLBACK_TICKER_LOCAL = [
  'Curious · Hard working · Dedicated · Sociable entrepreneurs',
  'Focus on products — not rent, electricity, or Wi‑Fi',
  'House-keeping, maintenance & coffee handled for you',
  'We are renting the spots — grow with Senate Space',
  '450+ seats · 11,500 Sq.ft · 5+ years · 350+ businesses',
]

const FALLBACK_SEARCH_CITIES = ['Chennai', 'Trichy', 'Kerala', 'Hyderabad']

const FALLBACK_SLIDES_LOCAL = [
  {
    title: 'Managed Workspaces That Just Work',
    text: 'Desks, cabins, and community — without the hassle of running an office.',
    image:
      'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1920&q=80',
  },
  {
    title: 'Build Faster In The Right Space',
    text: 'High-speed internet, meeting rooms, and a team that keeps the lights on.',
    image:
      'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1920&q=80',
  },
  {
    title: 'Private Cabins For Growing Teams',
    text: 'Lockable suites with branding, storage, and priority support.',
    image:
      'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1920&q=80',
  },
  {
    title: 'Book A Visit Today',
    text: 'Come see the workspace, meet the community, and find your fit.',
    image:
      'https://images.unsplash.com/photo-1600508774634-4e11d34730e2?auto=format&fit=crop&w=1920&q=80',
  },
]

const FALLBACK_STATS_LOCAL = [
  { title: 'LIMITED', value: '450+', unit: 'Seats' },
  { title: 'COMPACT', value: '11,500', unit: 'Sq.ft' },
  { title: 'EXPERIENCE', value: '5+', unit: 'Years' },
  { title: 'CLIENTS', value: '350+', unit: 'Business' },
]

const FALLBACK_SOLUTIONS = [
  {
    id: 'sol-workstations',
    title: 'Work Stations',
    text: 'Flexible desks built for focus, collaboration, and daily hustle.',
    image: solWorkstations,
    to: '/solutions/workstations',
  },
  {
    id: 'sol-private-cabin',
    title: 'Private Cabin',
    text: 'Quiet, lockable cabins for teams that need privacy and space.',
    image: solPrivateCabin,
    to: '/solutions/private-cabin',
  },
  {
    id: 'sol-passage',
    title: 'Passage',
    text: 'Open walkways that connect zones and keep the floor flowing.',
    image: solPassage,
    to: '/solutions/passage',
  },
  {
    id: 'sol-open-space',
    title: "Open Space with Nature's Touch",
    text: 'Bright shared areas with greenery for calm, creative work.',
    image: solOpenSpace,
    to: '/solutions/open-space',
  },
  {
    id: 'sol-pantry',
    title: 'Pantry',
    text: 'Coffee, snacks, and a social corner that keeps energy high.',
    image: solPantry,
    to: '/solutions/pantry',
  },
]

const FALLBACK_PACKAGES = [
  {
    id: 'plan-a',
    name: 'Plan A',
    subtitle: 'Virtual Office',
    price: '₹60',
    period: '/ Day',
    points: [
      'Instant Documentation GST',
      'Registration Support',
      'Meeting Room Usage',
      'Signage Board',
    ],
  },
  {
    id: 'plan-b',
    name: 'Plan B',
    subtitle: 'Coworking / Private Cabin',
    price: '₹249',
    period: '/ Day',
    badge: 'Recommended',
    points: [
      'Permanent Desk',
      'Private Cabin',
      'Lock & Key Facility',
      'Storage Space',
      'Unlimited WiFi',
      'Conference Room Usage',
      'Power & AC',
      'Tea & Coffee',
      'Printer Solution',
      'Signage Board',
      'Registration Support',
    ],
    featured: true,
  },
  {
    id: 'plan-c',
    name: 'Plan C',
    subtitle: 'Day Pass',
    price: '₹399',
    period: '/ Day',
    points: [
      'Dedicated Desk',
      'Unlimited WiFi',
      'Conference Room Usage',
      'Power & AC',
      'Tea & Coffee',
      'Printer Solution',
    ],
  },
]

const FALLBACK_GALLERY = [
  { label: 'Lobby', image: galleryLobby },
  { label: 'Open Desk', image: galleryOpenDesk },
  { label: 'Cabin Suite', image: galleryCabin },
  { label: 'Meeting Room', image: galleryMeeting },
  { label: 'Lounge', image: galleryLounge },
  { label: 'Pantry', image: galleryPantry },
  { label: 'Work Stations', image: galleryWorkstations },
  { label: 'Passage', image: galleryPassage },
  { label: "Nature's Touch", image: galleryNature },
]

const FALLBACK_POSTS = [
  {
    tag: 'Workspace',
    title: 'Why founders choose managed offices',
    excerpt: 'Less admin, more shipping — how Senate Space removes the friction of running a workplace.',
    image: blogWorkspace,
  },
  {
    tag: 'Culture',
    title: 'Building a community that works',
    excerpt: 'From coffee chats to demo nights, the people around you shape how fast you grow.',
    image: blogCulture,
  },
  {
    tag: 'Tips',
    title: 'Designing a desk that helps you focus',
    excerpt: 'Small layout choices that keep deep work intact in a shared environment.',
    image: blogTips,
  },
]

const FALLBACK_AMENITIES_LOCAL = [
  { id: 'desk', label: 'Furnished Workstations' },
  { id: 'ac', label: 'Air Condition & Electricity' },
  { id: 'plug', label: 'Electricity' },
  { id: 'wifi', label: 'High Speed Internet' },
  { id: 'ups', label: 'Power Backup' },
  { id: 'bio', label: 'Biometric Access' },
  { id: 'cctv', label: 'CCTV Security' },
  { id: 'clean', label: 'House Keeping' },
  { id: 'tea', label: 'Drinking Water, Tea/Coffee' },
  { id: 'desk-live', label: 'Live Reception' },
  { id: 'print', label: 'Printing Solutions' },
  { id: 'clock', label: '12 Hours Access' },
  { id: 'pantry', label: 'Pantry/Sitout' },
  { id: 'events', label: 'Events/ Gaming' },
  { id: 'storage', label: 'Storage Space' },
]

const SENATOR_DAY = [
  { time: '6-9 a.m', text: 'Wake up with your cup of caffeine, finish your routines & suit up!' },
  { time: '9:30 a.m', text: 'Exchange greetings with other Senators & start your day with a smile.' },
  { time: '10 a.m-12 p.m', text: 'Prioritize your tasks & keep yourself occupied with clients and works.' },
  { time: '1 p.m', text: "Ring! Ring! No, it's not your phone. 'It's your tummy calling for lunch! '" },
  { time: '2-4 p.m', text: 'Brawl begins between you and sleep, you win by sipping up a cup of fresh coffee.' },
  {
    time: '4-6 p.m',
    text: 'Brainstorm & Strategize - use our white board. Stressed out & Drained off - use our carrom board',
  },
  { time: '6-7 p.m', text: 'Plan & Organize works for the next day.' },
  { time: '8 p.m', text: 'Log out, load out to home and the loop continues.' },
]

const APART = [
  { lead: 'We are not grown -', rest: 'We like to grow like you!', tag: 'BUT' },
  { lead: 'We are a start-up -', rest: 'We know the value of starting up!', tag: 'SO' },
  { lead: 'We are cost-efficient -', rest: 'We do all infrastructure by ourself!', tag: 'WHY' },
  { lead: 'We started to achieve -', rest: 'To giveup and walk-back', tag: 'NOT' },
]

function AmenityIcon({ id }) {
  const common = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  }
  const paths = {
    desk: (
      <>
        <rect x="3" y="8" width="18" height="8" rx="1.5" {...common} />
        <path d="M7 16v4M17 16v4M5 20h14M8 8V5h8v3" {...common} />
      </>
    ),
    ac: (
      <>
        <rect x="3" y="5" width="18" height="8" rx="1.5" {...common} />
        <path d="M7 16v3M12 16v4M17 16v3" {...common} />
      </>
    ),
    plug: (
      <>
        <circle cx="12" cy="12" r="8" {...common} />
        <path d="M9 10v4M15 10v4M12 14v3" {...common} />
      </>
    ),
    wifi: (
      <>
        <rect x="3" y="4" width="18" height="14" rx="2" {...common} />
        <path d="M8 18h8M9 11a4 4 0 0 1 6 0M11 13.5a1.6 1.6 0 0 1 2 0" {...common} />
      </>
    ),
    ups: (
      <>
        <rect x="7" y="3" width="10" height="18" rx="2" {...common} />
        <path d="M12 8v4l2 2" {...common} />
      </>
    ),
    bio: (
      <>
        <path d="M12 3 4.5 6.5v5.2c0 4.7 3.2 8 7.5 9.3 4.3-1.3 7.5-4.6 7.5-9.3V6.5L12 3Z" {...common} />
        <path d="M12 8.5v5M10 10.5a3 3 0 0 0 4 2.6" {...common} />
      </>
    ),
    cctv: (
      <>
        <path d="M4 9h10l4 3v4H8l-4-3V9Z" {...common} />
        <path d="M8 16v3h4" {...common} />
      </>
    ),
    clean: (
      <>
        <path d="M5 20h8V9H5v11ZM13 12h6v8h-6" {...common} />
        <path d="M8 6h6v3" {...common} />
      </>
    ),
    tea: (
      <>
        <path d="M6 10h9v6a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4v-6Z" {...common} />
        <path d="M15 12h2.5a2 2 0 0 1 0 4H15M9 6c.4 1 .4 2 0 3M12 5.5c.4 1 .4 2 0 3" {...common} />
      </>
    ),
    'desk-live': (
      <>
        <circle cx="12" cy="7" r="2.5" {...common} />
        <path d="M7 20v-2a4 4 0 0 1 4-4h2a4 4 0 0 1 4 4v2M4 13h16v7H4z" {...common} />
      </>
    ),
    print: (
      <>
        <path d="M7 9V4h10v5M6 14h12v6H6z" {...common} />
        <rect x="4" y="9" width="16" height="7" rx="1.5" {...common} />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="8" {...common} />
        <path d="M12 8v4l3 2" {...common} />
      </>
    ),
    pantry: (
      <>
        <rect x="4" y="4" width="16" height="16" rx="1.5" {...common} />
        <path d="M4 10h16M12 10v10" {...common} />
      </>
    ),
    events: (
      <>
        <rect x="4" y="5" width="16" height="15" rx="1.5" {...common} />
        <path d="M4 10h16M8 3v4M16 3v4M12 14l1 .7.2 1.3-1 .7-1-.7.2-1.3z" {...common} />
      </>
    ),
    storage: (
      <>
        <path d="M4 7h16v4H4V7Zm0 6h16v4H4v-4ZM8 7v10M16 7v10" {...common} />
      </>
    ),
  }
  return (
    <svg className="allin__icon" viewBox="0 0 24 24" aria-hidden="true">
      {paths[id] || paths.desk}
    </svg>
  )
}

function App() {
  const navigate = useNavigate()
  const cms = useSiteCms()
  const [menuOpen, setMenuOpen] = useState(false)
  const [active, setActive] = useState('home')
  const [slide, setSlide] = useState(0)
  const [paused, setPaused] = useState(false)
  const [openDropdown, setOpenDropdown] = useState(null)
  const [contactOpen, setContactOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(null)
  const [amenityActive, setAmenityActive] = useState(null)
  const [searchCity, setSearchCity] = useState('')
  const [searchType, setSearchType] = useState('')
  const closeTimer = useRef(null)

  const ABOUT_TICKER = cms.ticker?.length ? cms.ticker : FALLBACK_TICKER_LOCAL
  const SEARCH_CITIES = cms.searchCities?.length ? cms.searchCities : FALLBACK_SEARCH_CITIES
  const SLIDES = cms.slides?.length ? cms.slides : FALLBACK_SLIDES_LOCAL
  const STATS = cms.stats?.length ? cms.stats : FALLBACK_STATS_LOCAL
  const CONTACTS = cms.contacts || FALLBACK_CONTACTS_LOCAL
  const BRANCHES = cms.branches?.length ? cms.branches : FALLBACK_BRANCHES_LOCAL
  const PARTNERS = cms.partnerItems?.length ? cms.partnerItems : FALLBACK_PARTNERS
  const SOLUTIONS = cms.solutionItems?.length ? cms.solutionItems : FALLBACK_SOLUTIONS
  const GALLERY = cms.galleryItems?.length ? cms.galleryItems : FALLBACK_GALLERY
  const POSTS = cms.blogItems?.length ? cms.blogItems : FALLBACK_POSTS
  const PACKAGES = cms.packageItems?.length ? cms.packageItems : FALLBACK_PACKAGES
  const AMENITIES = cms.amenities?.length ? cms.amenities : FALLBACK_AMENITIES_LOCAL
  const footerBlurb = cms.footerBlurb || 'Redefining managed workspaces — desks, cabins, and community without the hassle of running an office.'

  const NAV = useMemo(() => {
    const solutionChildren = SOLUTIONS.map((s) => ({
      id: s.id,
      label: s.title,
      to: s.to || (s.slug ? `/solutions/${s.slug}` : '/solutions'),
    }))
    const packageChildren = PACKAGES.map((p) => ({
      id: p.id,
      label: `${p.name}${p.subtitle ? ` – ${p.subtitle}` : ''}`,
      to: '/packages',
    }))
    return [
      { id: 'home', label: 'Home', to: '/' },
      { id: 'about', label: 'About', to: '/about' },
      { id: 'partners', label: 'Our Partner', to: '/partners' },
      {
        id: 'solutions',
        label: 'Solutions',
        to: '/solutions',
        children: solutionChildren.length ? solutionChildren : FALLBACK_NAV_SOLUTIONS,
      },
      {
        id: 'package',
        label: 'Packages',
        to: '/packages',
        children: packageChildren.length ? packageChildren : FALLBACK_NAV_PACKAGES,
      },
      { id: 'gallery', label: 'Gallery', to: '/gallery' },
      { id: 'blog', label: 'Blog', to: '/blog' },
    ]
  }, [SOLUTIONS, PACKAGES])

  const lightboxOpen = lightboxIndex !== null
  const lightboxItem = lightboxOpen ? GALLERY[lightboxIndex] : null

  const openLightbox = (index) => setLightboxIndex(index)
  const closeLightbox = () => setLightboxIndex(null)
  const showPrev = () =>
    setLightboxIndex((i) => (i === null ? null : (i - 1 + GALLERY.length) % GALLERY.length))
  const showNext = () =>
    setLightboxIndex((i) => (i === null ? null : (i + 1) % GALLERY.length))

  const openDrop = (id) => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
    setOpenDropdown(id)
  }

  const closeDrop = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    closeTimer.current = setTimeout(() => setOpenDropdown(null), 200)
  }

  useEffect(() => {
    if (cms.metaTitle) document.title = cms.metaTitle
    const meta = document.querySelector('meta[name="description"]')
    if (cms.metaDescription && meta) meta.setAttribute('content', cms.metaDescription)
  }, [cms.metaTitle, cms.metaDescription])

  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current)
    },
    [],
  )

  useEffect(() => {
    const onScroll = () => {
      const offset = 140
      let current = 'home'
      for (const item of NAV) {
        const el = document.getElementById(item.id)
        if (el && el.getBoundingClientRect().top <= offset) current = item.id
      }
      setActive(current)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (paused) return undefined
    const timer = setInterval(() => {
      setSlide((s) => (s + 1) % SLIDES.length)
    }, 4500)
    return () => clearInterval(timer)
  }, [paused, SLIDES.length])

  const goTo = (id) => {
    setMenuOpen(false)
    setOpenDropdown(null)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    document.body.classList.toggle('menu-open', menuOpen)
    return () => document.body.classList.remove('menu-open')
  }, [menuOpen])

  useEffect(() => {
    if (!lightboxOpen) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') closeLightbox()
      if (e.key === 'ArrowLeft') showPrev()
      if (e.key === 'ArrowRight') showNext()
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [lightboxOpen])

  return (
    <div className={`page ${menuOpen ? 'page--menu-open' : ''}`}>
      <header className="header">
        <Link to="/" className="brand" onClick={() => setMenuOpen(false)}>
          <img src={senateLogo} alt="" className="brand__logo" />
          <span className="brand__text">
            <span className="brand__name">
              SENATE<span>Space</span>
            </span>
            <span className="brand__tag">{footerBlurb}</span>
          </span>
        </Link>

        <button
          type="button"
          className={`nav-toggle ${menuOpen ? 'is-open' : ''}`}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span />
          <span />
          <span />
        </button>

        <div
          className={`nav-backdrop ${menuOpen ? 'is-visible' : ''}`}
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />

        <nav className={`nav ${menuOpen ? 'nav--open' : ''}`}>
          <div className="nav__side-brand">
            <img src={senateLogo} alt="" className="brand__logo" />
            <div className="brand__text">
              <p className="brand__name">
                SENATE<span>Space</span>
              </p>
              <p className="brand__tag">{footerBlurb}</p>
            </div>
          </div>
          {NAV.map((item) =>
            item.children ? (
              <div
                key={item.id}
                className={`nav__item nav__item--has-drop ${
                  openDropdown === item.id ? 'is-open' : ''
                }`}
                onMouseEnter={() => {
                  if (!window.matchMedia('(max-width: 900px)').matches) {
                    openDrop(item.id)
                  }
                }}
                onMouseLeave={() => {
                  if (!window.matchMedia('(max-width: 900px)').matches) {
                    closeDrop()
                  }
                }}
              >
                <Link
                  to={item.to}
                  className={`nav__link${active === item.id ? ' is-active' : ''}`}
                  onClick={(e) => {
                    if (window.matchMedia('(max-width: 900px)').matches) {
                      e.preventDefault()
                      setOpenDropdown((d) => (d === item.id ? null : item.id))
                      return
                    }
                    setMenuOpen(false)
                    setOpenDropdown(null)
                  }}
                >
                  {item.label}
                  <span className="nav__chevron" aria-hidden="true" />
                </Link>
                <div className="nav__dropdown">
                  <div className="nav__dropdown-panel">
                    {item.children.map((child) => (
                      <Link key={child.id} to={child.to} onClick={() => { setMenuOpen(false); setOpenDropdown(null) }}>
                        {child.label}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <Link
                key={item.id}
                to={item.to}
                className={`nav__link${active === item.id ? ' is-active' : ''}`}
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </Link>
            ),
          )}
          <Link to="/login" className="nav__link" onClick={() => setMenuOpen(false)}>
            Member login
          </Link>

          <SpecularButton
            {...specularProps}
            size="md"
            className="nav__tour-mobile"
            onClick={() => navigate('/contact')}
          >
            <ContactIcon />
            Contact Us
          </SpecularButton>
        </nav>

        <SpecularButton
          {...specularProps}
          size="md"
          className="btn-tour--desktop specular-button--header"
          onClick={() => navigate('/contact')}
        >
          <ContactIcon />
          Contact Us
        </SpecularButton>
      </header>

      <div className="about-ticker" aria-label="About highlights">
        <div className="about-ticker__track">
          {[...ABOUT_TICKER, ...ABOUT_TICKER].map((item, i) => (
            <span key={`${item}-${i}`} className="about-ticker__item">
              {item}
            </span>
          ))}
        </div>
      </div>

      <main>
        <section
          id="home"
          className="banner"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <div className="banner__slides">
            {SLIDES.map((item, i) => (
              <article
                key={item.title}
                className={`banner__slide ${i === slide ? 'is-active' : ''}`}
                style={{ backgroundImage: `url(${item.image})` }}
                aria-hidden={i !== slide}
              >
                <div className="banner__overlay" />
              </article>
            ))}
          </div>

          <div className="banner__front">
            <div className="banner__content">
              <p className="banner__eyebrow">Senate Space</p>
              <h1>{SLIDES[slide].title}</h1>
              <p>{SLIDES[slide].text}</p>
            </div>

            <form
              className="banner__search"
              onSubmit={(e) => {
                e.preventDefault()
                goTo(searchType || 'solutions')
              }}
            >
              <p className="banner__search-title">
                Find managed office spaces in Chennai, Trichy, Kerala and Hyderabad
              </p>
              <div className="banner__search-row">
                <label className="banner__search-field">
                  <span className="sr-only">Select a city</span>
                  <select
                    value={searchCity}
                    onChange={(e) => setSearchCity(e.target.value)}
                    required
                  >
                    <option value="">Select a city*</option>
                    {SEARCH_CITIES.map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="banner__search-field">
                  <span className="sr-only">Select a workspace type</span>
                  <select
                    value={searchType}
                    onChange={(e) => setSearchType(e.target.value)}
                    required
                  >
                    <option value="">Select a workspace type*</option>
                    {SOLUTIONS.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.title}
                      </option>
                    ))}
                  </select>
                </label>
                <button type="submit" className="banner__search-btn">
                  Explore Workspaces
                </button>
              </div>
            </form>

            <div className="banner__controls">
            <button
              type="button"
              className="banner__arrow"
              aria-label="Previous slide"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation()
                setPaused(true)
                setSlide((s) => (s - 1 + SLIDES.length) % SLIDES.length)
              }}
            >
              ‹
            </button>
            <div className="banner__dots">
              {SLIDES.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  className={i === slide ? 'is-active' : ''}
                  aria-label={`Go to slide ${i + 1}`}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation()
                    setPaused(true)
                    setSlide(i)
                  }}
                />
              ))}
            </div>
            <button
              type="button"
              className="banner__arrow"
              aria-label="Next slide"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation()
                setPaused(true)
                setSlide((s) => (s + 1) % SLIDES.length)
              }}
            >
              ›
            </button>
          </div>
          </div>
        </section>

        <section className="hatch-band" aria-label="Senate Space at a glance">
          <div className="hatch-band__inner">
            <p className="hatch-band__tag">{footerBlurb}</p>
            <ul className="hatch-band__cities">
              {SEARCH_CITIES.map((city) => (
                <li key={city}>{city}</li>
              ))}
            </ul>
            <p className="hatch-band__facts">450+ seats · 11,500 sq.ft · 5+ years · 350+ businesses</p>
          </div>
        </section>

        <section id="about" className="about">
          <div
            className="about__bg"
            aria-hidden="true"
            style={{ backgroundImage: `url(${galleryLobby})` }}
          />
          <div className="about__glow" aria-hidden="true" />
          <div className="about__layout">
            <div className="about__intro">
              <p className="about__eyebrow">About Senate Space</p>
              <h2 className="about__title">
                <span>We are</span>
                <span className="about__title-accent">Senate</span>
              </h2>
              <ul className="about__traits">
                {['Curious', 'Hard-working', 'Dedicated', 'Sociable'].map((trait) => (
                  <li key={trait}>{trait}</li>
                ))}
              </ul>
            </div>

            <div className="about__copy">
              <p>
                We founded Senate Space for people just like us. Curious, hard-working, dedicated
                and sociable entrepreneurs and people who want to focus on creating great,
                innovative products and business without worrying about hassles like rent,
                electricity, internet, housekeeping, maintenance, power failure, water or running
                out of coffee...
              </p>
              <p className="about__tag">
                Are you planning to grow, then you are at the right place,{' '}
                <em>we are renting the spots.</em>
              </p>
              <button type="button" className="about__cta" onClick={() => goTo('package')}>
                Explore packages
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>

          <div className="stats">
            <p className="stats__label">Statistics</p>
            <div className="stats__grid">
              {STATS.map((stat) => (
                <div key={stat.title} className="stat">
                  <span className="stat__title">{stat.title}</span>
                  <span className="stat__value">{stat.value}</span>
                  <span className="stat__unit">{stat.unit}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="partners" className="partners">
          <div className="partners__head">
            <p className="partners__eyebrow">Trusted by teams</p>
            <h2>Our Partners</h2>
          </div>

          <div className="partners__marquee partners__marquee--left" aria-label="Partner logos scrolling left">
            <div className="partners__track">
              {[...PARTNERS, ...PARTNERS].map((partner, i) => (
                <div key={`left-${partner.name}-${i}`} className="partners__item">
                  <img src={partner.logo} alt={partner.name} />
                </div>
              ))}
            </div>
          </div>

          <div className="partners__marquee partners__marquee--right" aria-label="Partner logos scrolling right">
            <div className="partners__track">
              {[...PARTNERS, ...PARTNERS].map((partner, i) => (
                <div key={`right-${partner.name}-${i}`} className="partners__item">
                  <img src={partner.logo} alt={partner.name} />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="innovator" className="innovator" aria-label="Innovator">
          <div className="innovator__bg" aria-hidden="true">
            <LightRays
              raysOrigin="top-center"
              raysColor="#d8d4cc"
              raysSpeed={0.9}
              lightSpread={1.15}
              rayLength={2.8}
              followMouse
              mouseInfluence={0.1}
              noiseAmount={0.12}
              distortion={0.05}
              pulsating={false}
              fadeDistance={1.1}
              saturation={0.85}
            />
          </div>
          <div className="innovator__inner">
            <div className="innovator__content">
              <div className="innovator__particles">
                <ParticleText
                  text={'SHARING IS THE\nNEW MULTIPLICATION'}
                  particleSize={1.35}
                  density={2}
                  color="#ffffff"
                  highlightColor="#ffffff"
                  scatter={160}
                  gatherDuration={1400}
                  stagger={320}
                  pointerRepel={36}
                  repelRadius={100}
                  idleDrift={0.25}
                  trigger="inview"
                  fontSize="clamp(1.55rem, 3.6vw, 3.15rem)"
                  fontWeight={800}
                  fontFamily="Manrope, sans-serif"
                />
              </div>
              <div className="innovator__credit">
                <ParticleText
                  text="— INNOVATOR"
                  particleSize={1.25}
                  density={2}
                  color="#ffffff"
                  highlightColor="#ffffff"
                  scatter={70}
                  gatherDuration={1100}
                  stagger={220}
                  pointerRepel={24}
                  repelRadius={80}
                  idleDrift={0.2}
                  trigger="inview"
                  fontSize="clamp(1rem, 1.9vw, 1.35rem)"
                  fontWeight={600}
                  fontFamily="Inter, sans-serif"
                />
              </div>
            </div>
            <div className="innovator__person">
              <img src={shabirPortrait} alt="Innovator" />
            </div>
          </div>
        </section>

        <section id="solutions" className="section solutions">
          <div className="section__head">
            <h2>Solutions</h2>
            <p>Spaces sized for how you work today — and how you plan to grow tomorrow.</p>
          </div>
          <div className="solutions__grid">
            {SOLUTIONS.map((item, i) => (
              <article
                key={item.id}
                id={item.id}
                className="solution solution--tilt"
                style={{ '--i': i }}
              >
                <TiltedCard
                  imageSrc={item.image}
                  altText={item.title}
                  captionText={item.title}
                  containerHeight="340px"
                  containerWidth="100%"
                  imageHeight="340px"
                  imageWidth="100%"
                  rotateAmplitude={24}
                  scaleOnHover={1.1}
                  showMobileWarning={false}
                  showTooltip
                  displayOverlayContent
                  overlayContent={
                    <div>
                      <p className="tilted-card-overlay-title">
                        <span className="solution__index-inline">0{i + 1}</span> {item.title}
                      </p>
                      <p className="tilted-card-overlay-text">{item.text}</p>
                    </div>
                  }
                />
              </article>
            ))}
          </div>
          <div className="section-actions">
            <SpecularButton
              {...specularProps}
              size="md"
              tint="#000000"
              tintOpacity={1}
              textColor="#ffffff"
              className="section-actions__btn"
              onClick={() => goTo('solutions')}
            >
              View Solutions
            </SpecularButton>
          </div>
        </section>

        <section id="package" className="section packages">
          <div className="packages__rays" aria-hidden="true">
            <LightRays
              raysOrigin="top-center"
              raysColor="#ebe7df"
              raysSpeed={1}
              lightSpread={0.5}
              rayLength={3}
              followMouse
              mouseInfluence={0.1}
              noiseAmount={0}
              distortion={0}
              className="custom-rays"
              pulsating={false}
              fadeDistance={1}
              saturation={1}
            />
          </div>
          <div className="packages__content">
            <div className="section__head section__head--light">
              <h2>Packages</h2>
              <p>Simple plans. Clear value. Start for a day or stay for the long run.</p>
            </div>
            <div className="one-pack">
              <p className="one-pack__badge">ONE PACK SOLUTION</p>
              <ul className="one-pack__list">
                <li>No Hidden Charges</li>
                <li>No Extra Charges</li>
                <li>No Exit Fee</li>
              </ul>
            </div>
            <div className="packages__grid">
              {PACKAGES.map((pkg) => (
                <article
                  key={pkg.id}
                  id={pkg.id}
                  className={`package-card ${pkg.featured ? 'package-card--featured' : ''}`}
                >
                  {pkg.badge ? <span className="package-card__badge">{pkg.badge}</span> : null}
                  <div className="package-card__top">
                    <p className="package-card__plan">{pkg.name}</p>
                    <h3>{pkg.subtitle}</h3>
                  </div>
                  <p className="package-card__price">
                    {pkg.price}
                    <span>{pkg.period}</span>
                  </p>
                  <ul>
                    {pkg.points.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                  <button type="button" className="package-card__btn" onClick={() => setContactOpen(true)}>
                    Choose plan
                  </button>
                </article>
              ))}
            </div>
            <div className="section-actions packages__action">
              <SpecularButton
                {...specularProps}
                size="md"
                tint="#ebe7df"
                tintOpacity={1}
                textColor="#111111"
                className="section-actions__btn section-actions__btn--light"
                onClick={() => goTo('package')}
              >
                View Package
              </SpecularButton>
            </div>
          </div>
        </section>

        <section id="why-choose" className="section why-choose">
          <div className="why-choose__grid">
            <div className="why-choose__media">
              <img src={galleryLounge} alt="Senate Space coworking interior" loading="lazy" />
            </div>
            <div className="why-choose__body">
              <div className="why-choose__head">
                <p className="why-choose__eyebrow">Best Coworking Space in Anna Nagar</p>
                <h2>Why choose Senate Space?</h2>
              </div>
              <div className="why-choose__copy">
                <p>
                  If you have Seed(Business) we rent our Pot(Office Space) to grow. Senate Space can
                  be referred to as a term value of money. From startups to Corporates we got
                  everything covered for your business, Our exclusive private cabin, small meeting
                  room, shared office, coworking space, shared workspace, virtual office space,
                  office space for rent, amenities and positive environment makes you feel like
                  SENATORS.
                </p>
                <p>Wanted positive working environment that boots your business?</p>
                <p className="why-choose__close">We, SENATE SPACE is here.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="all-in" className="section allin">
          <div className="allin__bg" aria-hidden="true">
            <LightRays
              raysOrigin="top-center"
              raysColor="#d8d4cc"
              raysSpeed={0.9}
              lightSpread={1.15}
              rayLength={2.8}
              followMouse
              mouseInfluence={0.1}
              noiseAmount={0.12}
              distortion={0.05}
              pulsating={false}
              fadeDistance={1.1}
              saturation={0.85}
            />
          </div>
          <div className="allin__content">
            <div className="allin__head">
              <h2>ALL IN...</h2>
            </div>
            <div className="allin__marquee" aria-label="Amenities scrolling">
              <div className="allin__track">
                {[...AMENITIES, ...AMENITIES].map((item, i) => (
                  <button
                    key={`${item.label}-${i}`}
                    type="button"
                    className={`allin__item${amenityActive === item.id ? ' is-active' : ''}`}
                    style={{ '--i': i % AMENITIES.length }}
                    onClick={() =>
                      setAmenityActive((cur) => (cur === item.id ? null : item.id))
                    }
                    aria-pressed={amenityActive === item.id}
                  >
                    <span className="allin__icon-wrap">
                      <AmenityIcon id={item.id} />
                    </span>
                    <p>{item.label}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="senators-work" className="section senators-work">
          <div className="senators-work__head">
            <h2>
              HOW <span>SENATORS</span> WORK ?
            </h2>
            <p>The Loops begins..</p>
          </div>
          <div className="senators-work__grid">
            {SENATOR_DAY.map((item) => (
              <article key={item.time} className="senators-work__card">
                <span>{item.time}</span>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="why-apart" className="section why-apart">
          <div className="why-apart__bg" aria-hidden="true">
            <LightRays
              raysOrigin="top-center"
              raysColor="#d8d4cc"
              raysSpeed={0.85}
              lightSpread={1.1}
              rayLength={2.6}
              followMouse
              mouseInfluence={0.1}
              noiseAmount={0.1}
              distortion={0.04}
              pulsating={false}
              fadeDistance={1.1}
              saturation={0.8}
            />
          </div>
          <div className="why-apart__layout">
            <h2>
              WHY WE
              <br />
              ARE APART?
            </h2>
            <div className="why-apart__list">
              {APART.map((item, i) => (
                <article key={item.tag} className="why-apart__row" style={{ '--i': i }}>
                  <div>
                    <p>{item.lead}</p>
                    <strong>{item.rest}</strong>
                  </div>
                  <span>{item.tag}</span>
                </article>
              ))}
              <p className="why-apart__banner">BUT SO, WHY NOT !</p>
            </div>
          </div>
        </section>

        <section id="gallery" className="section gallery">
          <div className="section__head">
            <h2>Gallery</h2>
            <p>A look inside the floors where ideas get built.</p>
          </div>
          <div className="gallery__grid">
            {GALLERY.map((item, index) => (
              <button
                key={item.label}
                type="button"
                className="gallery__item"
                onClick={() => openLightbox(index)}
                aria-label={`View ${item.label}`}
              >
                <img src={item.image} alt={item.label} loading="lazy" />
                <span className="gallery__caption">{item.label}</span>
              </button>
            ))}
          </div>
          <div className="section-actions">
            <SpecularButton
              {...specularProps}
              size="md"
              tint="#000000"
              tintOpacity={1}
              textColor="#ffffff"
              className="section-actions__btn"
              onClick={() => goTo('gallery')}
            >
              View Gallery
            </SpecularButton>
          </div>
        </section>

        <section id="blog" className="section blog">
          <div className="section__head">
            <h2>Blog</h2>
            <p>Notes on work, community, and building without the noise.</p>
          </div>
          <div className="blog__grid">
            {POSTS.map((post) => (
              <article key={post.title} className="blog-card">
                <div className="blog-card__media">
                  <img src={post.image} alt={post.title} loading="lazy" />
                </div>
                <div className="blog-card__body">
                  <span className="blog-card__tag">{post.tag}</span>
                  <h3>{post.title}</h3>
                  <p>{post.excerpt}</p>
                  <a href="#blog" className="blog-card__link">
                    Read more
                  </a>
                </div>
              </article>
            ))}
          </div>
          <div className="section-actions">
            <SpecularButton
              {...specularProps}
              size="md"
              tint="#000000"
              tintOpacity={1}
              textColor="#ffffff"
              className="section-actions__btn"
              onClick={() => goTo('blog')}
            >
              View Blog
            </SpecularButton>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="footer__grid">
          <div className="footer__about">
            <div className="footer__logo">
              <img src={senateLogo} alt="Senate Space" />
              <div>
                <p className="footer__brand">SENATE<span>Space</span></p>
                <p className="footer__tag">{footerBlurb}</p>
              </div>
            </div>
            <p className="footer__about-text">
              Senate Space is built for ambitious, hardworking entrepreneurs who want to focus on
              growing their business without worrying about rent, internet, maintenance, or everyday
              office hassles.
            </p>
          </div>

          <div className="footer__col">
            <h3>Quick Links</h3>
            <ul className="footer__links">
              {QUICK_LINKS.map((item) => (
                <li key={item.id}>
                  <button type="button" onClick={() => goTo(item.id)}>
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="footer__col">
            <h3>Useful Links</h3>
            <ul className="footer__links">
              {USEFUL_LINKS.map((item) => (
                <li key={item.id}>
                  <button type="button" onClick={() => goTo(item.id)}>
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="footer__col">
            <h3>Solutions</h3>
            <ul className="footer__links">
              {SOLUTIONS.map((item) => (
                <li key={item.id}>
                  <button type="button" onClick={() => goTo(item.id)}>
                    {item.title}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="footer__col footer__col--contact">
            <h3>Contact Us</h3>
            <ul className="footer__contacts">
              <li>
                <a href="tel:+919940159401">
                  <span className="footer__icon">
                    <FooterPhoneIcon />
                  </span>
                  99401 59401
                </a>
              </li>
              <li>
                <a href="tel:+919940687628">
                  <span className="footer__icon">
                    <FooterPhoneIcon />
                  </span>
                  99406 87628
                </a>
              </li>
              <li>
                <a href="tel:+919840595229">
                  <span className="footer__icon">
                    <FooterPhoneIcon />
                  </span>
                  98405 95229
                </a>
              </li>
              <li>
                <a href="mailto:prime@senatespace.com">
                  <span className="footer__icon">
                    <FooterMailIcon />
                  </span>
                  prime@senatespace.com
                </a>
              </li>
              <li>
                <a href="mailto:federal@senatespace.com">
                  <span className="footer__icon">
                    <FooterMailIcon />
                  </span>
                  federal@senatespace.com
                </a>
              </li>
              <li>
                <a href="mailto:shabeer@senatespace.com">
                  <span className="footer__icon">
                    <FooterMailIcon />
                  </span>
                  shabeer@senatespace.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="footer__maps">
          <h3 className="footer__maps-title">Our Branches</h3>
          <div className="footer__maps-grid">
            {BRANCHES.map((branch) => (
              <article key={branch.id} className="footer__map-card">
                <div className="footer__map-head">
                  <h4>{branch.label}</h4>
                  <p>{branch.address}</p>
                </div>
                <iframe
                  title={`${branch.label} map`}
                  src={branch.mapEmbed}
                  loading="lazy"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                />
              </article>
            ))}
          </div>
        </div>

        <p className="footer__copy">© {new Date().getFullYear()} Senate Space. All rights reserved.</p>
      </footer>

      <div className={`contact-fab ${contactOpen ? 'is-open' : ''}`}>
        <div className="contact-fab__panel" role="dialog" aria-label="Contact Senate Space">
          <p className="contact-fab__title">Contact us</p>

          <div className="contact-fab__group">
            <span className="contact-fab__label">WhatsApp</span>
            {CONTACTS.whatsapp.map((item) => (
              <a key={item.href} href={item.href} target="_blank" rel="noreferrer">
                <span className="contact-fab__icon contact-fab__icon--whatsapp">
                  <WhatsAppIcon />
                </span>
                {item.label}
              </a>
            ))}
          </div>

          <div className="contact-fab__group">
            <span className="contact-fab__label">Call</span>
            {CONTACTS.call.map((item) => (
              <a key={item.href} href={item.href}>
                <span className="contact-fab__icon">
                  <FooterPhoneIcon />
                </span>
                {item.label}
              </a>
            ))}
          </div>

          <div className="contact-fab__group">
            <span className="contact-fab__label">Email</span>
            {CONTACTS.email.map((item) => (
              <a key={item.href} href={item.href}>
                <span className="contact-fab__icon">
                  <FooterMailIcon />
                </span>
                {item.label}
              </a>
            ))}
          </div>
        </div>

        <button
          type="button"
          className="fab"
          aria-label={contactOpen ? 'Close contact menu' : 'Open contact menu'}
          aria-expanded={contactOpen}
          onClick={() => setContactOpen((v) => !v)}
        >
          <img src={senateLogo} alt="" className="fab__logo" />
        </button>
      </div>

      {contactOpen ? (
        <button
          type="button"
          className="contact-fab__backdrop"
          aria-label="Close contact menu"
          onClick={() => setContactOpen(false)}
        />
      ) : null}

      {lightboxOpen && lightboxItem ? (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label={lightboxItem.label}>
          <button
            type="button"
            className="lightbox__backdrop"
            aria-label="Close gallery view"
            onClick={closeLightbox}
          />
          <button
            type="button"
            className="lightbox__close"
            aria-label="Close"
            onClick={closeLightbox}
          >
            ×
          </button>
          <button
            type="button"
            className="lightbox__nav lightbox__nav--prev"
            aria-label="Previous image"
            onClick={showPrev}
          >
            ‹
          </button>
          <figure className="lightbox__figure">
            <img src={lightboxItem.image} alt={lightboxItem.label} />
            <figcaption>{lightboxItem.label}</figcaption>
          </figure>
          <button
            type="button"
            className="lightbox__nav lightbox__nav--next"
            aria-label="Next image"
            onClick={showNext}
          >
            ›
          </button>
        </div>
      ) : null}
    </div>
  )
}

export default App
