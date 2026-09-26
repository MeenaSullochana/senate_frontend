import { useState } from 'react'
import { Link } from 'react-router-dom'
import senateLogo from '../assets/senate-logo.png'
import { FooterMailIcon, FooterPhoneIcon, WhatsAppIcon } from './icons'
import { useSiteCms } from './SiteCmsContext'

export default function SiteFooter() {
  const { contacts, branches, solutions, footerBlurb } = useSiteCms()
  const [contactOpen, setContactOpen] = useState(false)

  return (
    <>
      <footer className="footer">
        <div className="footer__grid">
          <div className="footer__brand-block">
            <div className="footer__logo">
              <img src={senateLogo} alt="" />
              <p className="footer__brand">
                SENATE<span>Space</span>
              </p>
            </div>
            <p className="footer__blurb">{footerBlurb}</p>
          </div>

          <div className="footer__col">
            <h3>Quick Links</h3>
            <ul className="footer__links">
              {[
                ['/', 'Home'],
                ['/about', 'About'],
                ['/solutions', 'Solutions'],
                ['/packages', 'Packages'],
                ['/gallery', 'Gallery'],
                ['/blog', 'Blog'],
                ['/contact', 'Contact'],
              ].map(([to, label]) => (
                <li key={to}>
                  <Link to={to}>{label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="footer__col">
            <h3>Solutions</h3>
            <ul className="footer__links">
              {solutions.map((item) => (
                <li key={item.slug}>
                  <Link to={`/solutions/${item.slug}`}>{item.title}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="footer__col footer__col--contact">
            <h3>Contact Us</h3>
            <ul className="footer__contacts">
              {(contacts.call || []).map((item) => (
                <li key={item.href}>
                  <a href={item.href}>
                    <span className="footer__icon">
                      <FooterPhoneIcon />
                    </span>
                    {item.label}
                  </a>
                </li>
              ))}
              {(contacts.email || []).map((item) => (
                <li key={item.href}>
                  <a href={item.href}>
                    <span className="footer__icon">
                      <FooterMailIcon />
                    </span>
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="footer__maps">
          <h3 className="footer__maps-title">Our Branches</h3>
          <div className="footer__maps-grid">
            {branches
              .filter((b) => b.mapEmbed)
              .map((branch) => (
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
            {(contacts.whatsapp || []).map((item) => (
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
            {(contacts.call || []).map((item) => (
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
            {(contacts.email || []).map((item) => (
              <a key={item.href} href={item.href}>
                <span className="contact-fab__icon">
                  <FooterMailIcon />
                </span>
                {item.label}
              </a>
            ))}
          </div>
          <Link to="/contact" className="contact-fab__label" onClick={() => setContactOpen(false)}>
            Send an enquiry →
          </Link>
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
    </>
  )
}
