/**
 * Marketing pages (About, Partners, Solutions, Packages, Gallery, Blog, Contact).
 * Visual language matches homepage sections in LegacyHome — that file is not modified.
 */
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import TiltedCard from '../../TiltedCard'
import LightRays from '../../LightRays'
import { cmsApi, inquiryApi, settingsApi } from '../../services/api'
import { apiError } from '../../services/api/client'
import { FALLBACK_STATS, mediaUrl } from '../../site/defaults'
import { useSiteCms } from '../../site/SiteCmsContext'

import partnerKobelco from '../../assets/partners/kobelco.png'
import partnerEverstage from '../../assets/partners/everstage.png'
import partnerEnabl from '../../assets/partners/enabl.png'
import partnerBlackstraw from '../../assets/partners/blackstraw.png'
import partnerQuickplay from '../../assets/partners/quickplay.png'
import partnerRenault from '../../assets/partners/renault.png'
import partnerFirstChoice from '../../assets/partners/first-choice.png'
import partnerLebara from '../../assets/partners/lebara.png'
import solWorkstations from '../../assets/solutions/workstations.jpg'
import solPrivateCabin from '../../assets/solutions/private-cabin.jpg'
import solPassage from '../../assets/solutions/passage.jpg'
import solOpenSpace from '../../assets/solutions/open-space.jpg'
import solPantry from '../../assets/solutions/pantry.jpg'
import galleryLobby from '../../assets/gallery/lobby.jpg'
import galleryOpenDesk from '../../assets/gallery/open-desk.jpg'
import galleryCabin from '../../assets/gallery/cabin.jpg'
import galleryMeeting from '../../assets/gallery/meeting.jpg'
import galleryLounge from '../../assets/gallery/lounge.jpg'
import galleryPantry from '../../assets/gallery/pantry.jpg'
import galleryWorkstations from '../../assets/gallery/workstations.jpg'
import galleryPassage from '../../assets/gallery/passage.jpg'
import galleryNature from '../../assets/gallery/nature.jpg'
import blogWorkspace from '../../assets/blog/workspace.jpg'
import blogCulture from '../../assets/blog/culture.jpg'
import blogTips from '../../assets/blog/tips.jpg'

const FALLBACK_PARTNERS = [
  { name: 'Kobelco', logoUrl: partnerKobelco },
  { name: 'Everstage', logoUrl: partnerEverstage },
  { name: 'Enabl', logoUrl: partnerEnabl },
  { name: 'Blackstraw', logoUrl: partnerBlackstraw },
  { name: 'Quickplay', logoUrl: partnerQuickplay },
  { name: 'Renault', logoUrl: partnerRenault },
  { name: 'Mahindra First Choice', logoUrl: partnerFirstChoice },
  { name: 'Lebara', logoUrl: partnerLebara },
]

const FALLBACK_SOLUTIONS = [
  {
    slug: 'workstations',
    title: 'Work Stations',
    summary: 'Flexible desks built for focus, collaboration, and daily hustle.',
    imageUrl: solWorkstations,
    body: 'Flexible desks built for focus, collaboration, and daily hustle.\n\nVisit Senate Space to experience Work Stations in our Anna Nagar campuses.',
  },
  {
    slug: 'private-cabin',
    title: 'Private Cabin',
    summary: 'Quiet, lockable cabins for teams that need privacy and space.',
    imageUrl: solPrivateCabin,
    body: 'Quiet, lockable cabins for teams that need privacy and space.',
  },
  {
    slug: 'passage',
    title: 'Passage',
    summary: 'Open walkways that connect zones and keep the floor flowing.',
    imageUrl: solPassage,
    body: 'Open walkways that connect zones and keep the floor flowing.',
  },
  {
    slug: 'open-space',
    title: "Open Space with Nature's Touch",
    summary: 'Bright shared areas with greenery for calm, creative work.',
    imageUrl: solOpenSpace,
    body: 'Bright shared areas with greenery for calm, creative work.',
  },
  {
    slug: 'pantry',
    title: 'Pantry',
    summary: 'Coffee, snacks, and a social corner that keeps energy high.',
    imageUrl: solPantry,
    body: 'Coffee, snacks, and a social corner that keeps energy high.',
  },
]

const FALLBACK_PACKAGES = [
  {
    id: 'plan-a',
    name: 'Plan A',
    subtitle: 'Virtual Office',
    price: '₹60',
    period: '/ Day',
    points: ['Instant Documentation GST', 'Registration Support', 'Meeting Room Usage', 'Signage Board'],
  },
  {
    id: 'plan-b',
    name: 'Plan B',
    subtitle: 'Coworking / Private Cabin',
    price: '₹249',
    period: '/ Day',
    badge: 'Recommended',
    featured: true,
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
  { title: 'Lobby', imageUrl: galleryLobby },
  { title: 'Open Desk', imageUrl: galleryOpenDesk },
  { title: 'Cabin Suite', imageUrl: galleryCabin },
  { title: 'Meeting Room', imageUrl: galleryMeeting },
  { title: 'Lounge', imageUrl: galleryLounge },
  { title: 'Pantry', imageUrl: galleryPantry },
  { title: 'Work Stations', imageUrl: galleryWorkstations },
  { title: 'Passage', imageUrl: galleryPassage },
  { title: "Nature's Touch", imageUrl: galleryNature },
]

const FALLBACK_POSTS = [
  {
    slug: 'why-founders-choose-managed-offices',
    tag: 'Workspace',
    title: 'Why founders choose managed offices',
    excerpt: 'Less admin, more shipping — how Senate Space removes the friction of running a workplace.',
    coverImageUrl: blogWorkspace,
    body: 'Less admin, more shipping — how Senate Space removes the friction of running a workplace.\n\nSenate Space provides managed workspaces so teams can focus on building.',
  },
  {
    slug: 'building-a-community-that-works',
    tag: 'Culture',
    title: 'Building a community that works',
    excerpt: 'From coffee chats to demo nights, the people around you shape how fast you grow.',
    coverImageUrl: blogCulture,
    body: 'From coffee chats to demo nights, the people around you shape how fast you grow.',
  },
  {
    slug: 'designing-a-desk-that-helps-you-focus',
    tag: 'Tips',
    title: 'Designing a desk that helps you focus',
    excerpt: 'Small layout choices that keep deep work intact in a shared environment.',
    coverImageUrl: blogTips,
    body: 'Small layout choices that keep deep work intact in a shared environment.',
  },
]

const ABOUT_FALLBACK_BODY = `We founded Senate Space for people just like us. Curious, hard-working, dedicated and sociable entrepreneurs and people who want to focus on creating great, innovative products and business without worrying about hassles like rent, electricity, internet, housekeeping, maintenance, power failure, water or running out of coffee...

Are you planning to grow, then you are at the right place, we are renting the spots.`

export function AboutPage() {
  const [page, setPage] = useState(null)
  const { stats } = useSiteCms()
  useEffect(() => {
    cmsApi
      .page('about')
      .then((res) => setPage(res.data.data.page))
      .catch(() => setPage(null))
  }, [])

  const sections = page?.sections || {}
  const traits = sections.traits || ['Curious', 'Hard-working', 'Dedicated', 'Sociable']
  const bg = mediaUrl(sections.bgImage) || galleryLobby
  const body = page?.body || ABOUT_FALLBACK_BODY
  const paragraphs = body.split(/\n\n+/).filter(Boolean)
  const displayStats = stats?.length ? stats : FALLBACK_STATS
  const lead = paragraphs[0] || ''
  const rest = paragraphs.slice(1)

  return (
    <main className="about-page">
      <section className="about-page__hero">
        <div className="about-page__hero-media" aria-hidden="true">
          <img src={bg} alt="" />
          <div className="about-page__hero-shade" />
        </div>
        <div className="about-page__hero-inner">
          <p className="about-page__kicker">{page?.subtitle || 'About Senate Space'}</p>
          <h1 className="about-page__brand">
            <span className="about-page__brand-soft">We are</span>
            <span className="about-page__brand-name">Senate</span>
          </h1>
          <p className="about-page__lede">
            Managed workspaces for people who want to build — not babysit an office.
          </p>
          <div className="about-page__hero-actions">
            <Link to="/packages" className="about-page__btn about-page__btn--solid">
              Explore packages
            </Link>
            <Link to="/contact" className="about-page__btn about-page__btn--ghost">
              Book a visit
            </Link>
          </div>
        </div>
      </section>

      <section className="about-page__story">
        <div className="about-page__story-grid">
          <div className="about-page__story-label">
            <span>Our story</span>
            <strong>Built for builders</strong>
          </div>
          <div className="about-page__story-copy">
            <p>{lead}</p>
            {rest.map((p, i) => (
              <p key={i} className={/renting the spots/i.test(p) ? 'about-page__pull' : undefined}>
                {/renting the spots/i.test(p) ? (
                  <>
                    {p.split(/we are renting the spots\.?/i)[0]}
                    <em>we are renting the spots.</em>
                  </>
                ) : (
                  p
                )}
              </p>
            ))}
          </div>
        </div>

        <ul className="about-page__traits" aria-label="Who we are">
          {traits.map((trait) => (
            <li key={trait}>
              <span>{trait}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="about-page__stats" aria-label="Statistics">
        <p className="about-page__stats-label">By the numbers</p>
        <div className="about-page__stats-grid">
          {displayStats.map((stat) => (
            <article key={stat.title} className="about-page__stat">
              <span className="about-page__stat-title">{stat.title}</span>
              <span className="about-page__stat-value">{stat.value}</span>
              <span className="about-page__stat-unit">{stat.unit}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="about-page__next">
        <h2>Find your floor</h2>
        <p>Desks, cabins, and day passes — ready when you are.</p>
        <div className="about-page__hero-actions">
          <Link to="/solutions" className="about-page__btn about-page__btn--solid">
            View solutions
          </Link>
          <Link to="/gallery" className="about-page__btn about-page__btn--ghost">
            See the gallery
          </Link>
        </div>
      </section>
    </main>
  )
}

export function PartnersPage() {
  const { partners } = useSiteCms()
  const [items, setItems] = useState([])
  useEffect(() => {
    cmsApi
      .partners()
      .then((res) => setItems(res.data.data.items || []))
      .catch(() => setItems([]))
  }, [])

  const list =
    (items.length ? items : null) ||
    (partners.length
      ? partners.map((p) => ({ name: p.name, logoUrl: p.logoUrl }))
      : FALLBACK_PARTNERS)

  return (
    <main>
      <section className="partners">
        <div className="partners__head">
          <p className="partners__eyebrow">Trusted by teams</p>
          <h2>Our Partners</h2>
        </div>
        <div className="partners__marquee partners__marquee--left" aria-label="Partner logos scrolling left">
          <div className="partners__track">
            {[...list, ...list].map((partner, i) => (
              <div key={`left-${partner.name}-${i}`} className="partners__item">
                <img src={mediaUrl(partner.logoUrl) || partner.logoUrl} alt={partner.name} />
              </div>
            ))}
          </div>
        </div>
        <div className="partners__marquee partners__marquee--right" aria-label="Partner logos scrolling right">
          <div className="partners__track">
            {[...list, ...list].map((partner, i) => (
              <div key={`right-${partner.name}-${i}`} className="partners__item">
                <img src={mediaUrl(partner.logoUrl) || partner.logoUrl} alt={partner.name} />
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}

export function SolutionsPage() {
  const [items, setItems] = useState([])
  useEffect(() => {
    cmsApi
      .solutions()
      .then((res) => setItems(res.data.data.items || []))
      .catch(() => setItems([]))
  }, [])
  const list = items.length ? items : FALLBACK_SOLUTIONS

  return (
    <main>
      <section className="section solutions">
        <div className="section__head">
          <h2>Solutions</h2>
          <p>Spaces sized for how you work today — and how you plan to grow tomorrow.</p>
        </div>
        <div className="solutions__grid">
          {list.map((item, i) => (
            <Link
              key={item.slug || item.id}
              to={`/solutions/${item.slug}`}
              className="solution solution--tilt"
              style={{ '--i': i, textDecoration: 'none', color: 'inherit' }}
            >
              <TiltedCard
                imageSrc={mediaUrl(item.imageUrl) || item.imageUrl}
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
                    <p className="tilted-card-overlay-text">{item.summary}</p>
                  </div>
                }
              />
            </Link>
          ))}
        </div>
      </section>
    </main>
  )
}

export function SolutionDetailPage() {
  const { slug } = useParams()
  const [item, setItem] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    cmsApi
      .solution(slug)
      .then((res) => setItem(res.data.data.item))
      .catch((err) => {
        const fallback = FALLBACK_SOLUTIONS.find((s) => s.slug === slug)
        if (fallback) setItem(fallback)
        else setError(apiError(err))
      })
  }, [slug])

  if (error) {
    return (
      <main>
        <section className="section site-page">
          <p>{error}</p>
          <Link to="/solutions" className="about__cta">
            ← All solutions
          </Link>
        </section>
      </main>
    )
  }
  if (!item) {
    return (
      <main>
        <section className="section site-page">
          <p>Loading…</p>
        </section>
      </main>
    )
  }

  return (
    <main>
      <section className="section solutions site-detail">
        <div className="site-detail__media">
          <img src={mediaUrl(item.imageUrl) || item.imageUrl} alt={item.title} />
        </div>
        <div className="section__head">
          <h2>{item.title}</h2>
          <p>{item.summary}</p>
        </div>
        <div className="site-detail__body">
          {(item.body || item.summary || '')
            .split(/\n\n+/)
            .filter(Boolean)
            .map((p) => (
              <p key={p.slice(0, 40)}>{p}</p>
            ))}
        </div>
        <div className="section-actions">
          <Link to="/contact" className="about__cta">
            Enquire about this space →
          </Link>
          <Link to="/solutions" className="about__cta" style={{ marginLeft: 16 }}>
            ← All solutions
          </Link>
        </div>
      </section>
    </main>
  )
}

function mapApiPlan(pkg) {
  const namePart = (pkg.name || '').split('–')[0].trim() || pkg.name
  const unit = pkg.durationUnit === 'DAY' ? '/ Day' : ` / ${String(pkg.durationUnit || '').toLowerCase()}`
  return {
    id: pkg.id,
    name: namePart.startsWith('Plan') ? namePart : pkg.name,
    subtitle: pkg.marketingTagline || pkg.description || '',
    price: `₹${Number(pkg.price).toLocaleString('en-IN')}`,
    period: unit,
    badge: pkg.isPromotional ? 'Recommended' : null,
    featured: !!pkg.isPromotional,
    points: pkg.featureList || [],
  }
}

export function PackagesPage() {
  const navigate = useNavigate()
  const [plans, setPlans] = useState(FALLBACK_PACKAGES)

  useEffect(() => {
    settingsApi
      .public()
      .then((res) => {
        const apiPlans = (res.data.data.plans || [])
          .filter((p) => /Plan [ABC]/i.test(p.name))
          .map(mapApiPlan)
        if (apiPlans.length) {
          setPlans(
            FALLBACK_PACKAGES.map((fb) => {
              const match = apiPlans.find((p) => p.name.startsWith(fb.name) || fb.name.startsWith(p.name.split(' ')[0] + ' ' + p.name.split(' ')[1]))
              if (!match) return fb
              return {
                ...fb,
                price: match.price,
                period: match.period || fb.period,
                points: match.points?.length ? match.points : fb.points,
                featured: match.featured || fb.featured,
                badge: match.badge || fb.badge,
              }
            }),
          )
        }
      })
      .catch(() => {})
  }, [])

  return (
    <main>
      <section className="section packages">
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
            {plans.map((pkg) => (
              <article
                key={pkg.id}
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
                <button type="button" className="package-card__btn" onClick={() => navigate('/contact')}>
                  Choose plan
                </button>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}

export function GalleryPage() {
  const [items, setItems] = useState(FALLBACK_GALLERY)
  const [lightboxIndex, setLightboxIndex] = useState(null)

  useEffect(() => {
    cmsApi
      .gallery()
      .then((res) => {
        const apiItems = res.data.data.items || []
        if (apiItems.length) setItems(apiItems)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (lightboxIndex == null) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') setLightboxIndex(null)
      if (e.key === 'ArrowLeft') setLightboxIndex((i) => (i - 1 + items.length) % items.length)
      if (e.key === 'ArrowRight') setLightboxIndex((i) => (i + 1) % items.length)
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [lightboxIndex, items.length])

  const active = lightboxIndex != null ? items[lightboxIndex] : null

  return (
    <main>
      <section className="section gallery">
        <div className="section__head">
          <h2>Gallery</h2>
          <p>A look inside the floors where ideas get built.</p>
        </div>
        <div className="gallery__grid">
          {items.map((item, index) => (
            <button
              key={item.id || item.title}
              type="button"
              className="gallery__item"
              onClick={() => setLightboxIndex(index)}
              aria-label={`View ${item.title}`}
            >
              <img src={mediaUrl(item.imageUrl) || item.imageUrl} alt={item.title} loading="lazy" />
              <span className="gallery__caption">{item.title}</span>
            </button>
          ))}
        </div>
      </section>
      {active && (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label={active.title}>
          <button
            type="button"
            className="lightbox__backdrop"
            aria-label="Close gallery view"
            onClick={() => setLightboxIndex(null)}
          />
          <button type="button" className="lightbox__close" aria-label="Close" onClick={() => setLightboxIndex(null)}>
            Close
          </button>
          <button
            type="button"
            className="lightbox__nav lightbox__nav--prev"
            onClick={() => setLightboxIndex((i) => (i - 1 + items.length) % items.length)}
          >
            ‹
          </button>
          <img src={mediaUrl(active.imageUrl) || active.imageUrl} alt={active.title} />
          <button
            type="button"
            className="lightbox__nav lightbox__nav--next"
            onClick={() => setLightboxIndex((i) => (i + 1) % items.length)}
          >
            ›
          </button>
          <p className="lightbox__caption">{active.title}</p>
        </div>
      )}
    </main>
  )
}

export function BlogPage() {
  const [items, setItems] = useState(FALLBACK_POSTS)
  useEffect(() => {
    cmsApi
      .blog()
      .then((res) => {
        const apiItems = res.data.data.items || []
        if (apiItems.length) setItems(apiItems)
      })
      .catch(() => {})
  }, [])

  return (
    <main>
      <section className="section blog">
        <div className="section__head">
          <h2>Blog</h2>
          <p>Notes on work, community, and building without the noise.</p>
        </div>
        <div className="blog__grid">
          {items.map((post) => (
            <article key={post.id || post.slug} className="blog-card">
              <div className="blog-card__media">
                <img src={mediaUrl(post.coverImageUrl) || post.coverImageUrl} alt={post.title} loading="lazy" />
              </div>
              <div className="blog-card__body">
                {post.tag && <span className="blog-card__tag">{post.tag}</span>}
                <h3>{post.title}</h3>
                <p>{post.excerpt}</p>
                <Link to={`/blog/${post.slug}`} className="blog-card__link">
                  Read more
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}

export function BlogDetailPage() {
  const { slug } = useParams()
  const [post, setPost] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    cmsApi
      .blogPost(slug)
      .then((res) => setPost(res.data.data.post))
      .catch((err) => {
        const fallback = FALLBACK_POSTS.find((p) => p.slug === slug)
        if (fallback) setPost(fallback)
        else setError(apiError(err))
      })
  }, [slug])

  if (error) {
    return (
      <main>
        <section className="section site-page">
          <p>{error}</p>
          <Link to="/blog" className="about__cta">
            ← Back to blog
          </Link>
        </section>
      </main>
    )
  }
  if (!post) {
    return (
      <main>
        <section className="section site-page">
          <p>Loading…</p>
        </section>
      </main>
    )
  }

  return (
    <main>
      <section className="section blog site-detail">
        {post.coverImageUrl && (
          <div className="site-detail__media">
            <img src={mediaUrl(post.coverImageUrl) || post.coverImageUrl} alt={post.title} />
          </div>
        )}
        <div className="section__head">
          {post.tag && <p className="blog-card__tag">{post.tag}</p>}
          <h2>{post.title}</h2>
          <p>{post.excerpt}</p>
        </div>
        <div className="site-detail__body">
          {(post.body || '')
            .split(/\n\n+/)
            .filter(Boolean)
            .map((p) => (
              <p key={p.slice(0, 40)}>{p}</p>
            ))}
        </div>
        <Link to="/blog" className="about__cta">
          ← Back to blog
        </Link>
      </section>
    </main>
  )
}

export function ContactPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    mobile: '',
    city: '',
    workspaceType: '',
    message: '',
  })
  const [status, setStatus] = useState({ error: '', success: '' })
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setStatus({ error: '', success: '' })
    try {
      await inquiryApi.create({
        ...form,
        source: 'CONTACT_FORM',
        requirement: form.message,
        productType:
          /virtual/i.test(form.workspaceType)
            ? 'VIRTUAL_OFFICE'
            : /conference|meeting/i.test(form.workspaceType)
              ? 'CONFERENCE'
              : form.workspaceType
                ? 'PHYSICAL_OFFICE'
                : undefined,
      })
      setStatus({ error: '', success: 'Thanks — we received your enquiry and will get back soon.' })
      setForm({ name: '', email: '', mobile: '', city: '', workspaceType: '', message: '' })
    } catch (err) {
      setStatus({ error: apiError(err), success: '' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <main>
      <section className="section site-page contact-page">
        <div className="section__head">
          <h2>Contact Us</h2>
          <p>Share a few details and our team will respond shortly.</p>
        </div>
        <form className="contact-form" onSubmit={submit}>
          {status.error && <p className="contact-form__error">{status.error}</p>}
          {status.success && <p className="contact-form__ok">{status.success}</p>}
          {[
            ['name', 'Full name', true],
            ['email', 'Email', true],
            ['mobile', 'Mobile', false],
            ['city', 'City', false],
            ['workspaceType', 'Workspace interest', false],
          ].map(([key, label, required]) => (
            <label key={key} className="contact-form__field">
              <span>{label}</span>
              <input
                value={form[key]}
                required={required}
                type={key === 'email' ? 'email' : 'text'}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              />
            </label>
          ))}
          <label className="contact-form__field">
            <span>Message</span>
            <textarea
              rows={5}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
            />
          </label>
          <button type="submit" className="banner__search-btn" disabled={busy}>
            {busy ? 'Sending…' : 'Send enquiry'}
          </button>
        </form>
      </section>
    </main>
  )
}
