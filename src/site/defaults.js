/** Fallback marketing content when CMS API is empty/unavailable */
export const FALLBACK_NAV = [
  { to: '/', label: 'Home', end: true },
  { to: '/about', label: 'About' },
  { to: '/partners', label: 'Our Partner' },
  {
    to: '/solutions',
    label: 'Solutions',
    children: true,
  },
  { to: '/packages', label: 'Packages' },
  { to: '/gallery', label: 'Gallery' },
  { to: '/blog', label: 'Blog' },
]

export const FALLBACK_TICKER = [
  'Curious · Hard working · Dedicated · Sociable entrepreneurs',
  'Focus on products — not rent, electricity, or Wi‑Fi',
  'House-keeping, maintenance & coffee handled for you',
  'We are renting the spots — grow with Senate Space',
  '450+ seats · 11,500 Sq.ft · 5+ years · 350+ businesses',
]

export const FALLBACK_CONTACTS = {
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

export const FALLBACK_SLIDES = [
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

export const FALLBACK_STATS = [
  { title: 'LIMITED', value: '450+', unit: 'Seats' },
  { title: 'COMPACT', value: '11,500', unit: 'Sq.ft' },
  { title: 'EXPERIENCE', value: '5+', unit: 'Years' },
  { title: 'CLIENTS', value: '350+', unit: 'Business' },
]

export const FALLBACK_AMENITIES = [
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

export const FALLBACK_BRANCHES = [
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

export function mediaUrl(url) {
  if (!url) return ''
  if (url.startsWith('http') || url.startsWith('/media') || url.startsWith('data:')) return url
  if (url.startsWith('/uploads')) return url
  return url
}
