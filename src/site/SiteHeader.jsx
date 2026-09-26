import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import SpecularButton from '../SpecularButton'
import senateLogo from '../assets/senate-logo.png'
import { ContactIcon } from './icons'
import { useSiteCms } from './SiteCmsContext'

const specularProps = {
  color: [1.12, 1.08, 0.98],
  accentColor: [0.92, 0.9, 0.86],
  backgroundColor: [0.08, 0.08, 0.08],
}

export default function SiteHeader() {
  const navigate = useNavigate()
  const { solutions, ticker } = useSiteCms()
  const [menuOpen, setMenuOpen] = useState(false)
  const [openDropdown, setOpenDropdown] = useState(null)
  const closeTimer = useRef(null)

  const openDrop = (id) => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setOpenDropdown(id)
  }
  const closeDrop = () => {
    closeTimer.current = setTimeout(() => setOpenDropdown(null), 120)
  }

  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current)
    },
    [],
  )

  useEffect(() => {
    document.body.classList.toggle('menu-open', menuOpen)
    return () => document.body.classList.remove('menu-open')
  }, [menuOpen])

  const closeMenu = () => {
    setMenuOpen(false)
    setOpenDropdown(null)
  }

  const solutionChildren = solutions.length
    ? solutions.map((s) => ({ to: `/solutions/${s.slug}`, label: s.title }))
    : [
        { to: '/solutions/workstations', label: 'Work Stations' },
        { to: '/solutions/private-cabin', label: 'Private Cabin' },
        { to: '/solutions/passage', label: 'Passage' },
        { to: '/solutions/open-space', label: "Open Space with Nature's Touch" },
        { to: '/solutions/pantry', label: 'Pantry' },
      ]

  const nav = [
    { to: '/', label: 'Home', end: true },
    { to: '/about', label: 'About' },
    { to: '/partners', label: 'Our Partner' },
    { to: '/solutions', label: 'Solutions', children: solutionChildren },
    {
      to: '/packages',
      label: 'Packages',
      children: [
        { to: '/packages', label: 'Plan A – Virtual Office' },
        { to: '/packages', label: 'Plan B – Coworking / Private Cabin' },
        { to: '/packages', label: 'Plan C – Day Pass' },
      ],
    },
    { to: '/gallery', label: 'Gallery' },
    { to: '/blog', label: 'Blog' },
  ]

  return (
    <>
      <header className="header">
        <Link to="/" className="brand" onClick={closeMenu}>
          <img src={senateLogo} alt="" className="brand__logo" />
          <span className="brand__text">
            <span className="brand__name">
              SENATE<span>Space</span>
            </span>
            <span className="brand__tag">Redefining managed workspaces</span>
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
              <p className="brand__tag">Redefining managed workspaces</p>
            </div>
          </div>
          {nav.map((item) =>
            item.children ? (
              <div
                key={item.to}
                className={`nav__item nav__item--has-drop ${openDropdown === item.to ? 'is-open' : ''}`}
                onMouseEnter={() => {
                  if (!window.matchMedia('(max-width: 900px)').matches) openDrop(item.to)
                }}
                onMouseLeave={() => {
                  if (!window.matchMedia('(max-width: 900px)').matches) closeDrop()
                }}
              >
                <NavLink
                  to={item.to}
                  className={({ isActive }) => `nav__link${isActive ? ' is-active' : ''}`}
                  onClick={(e) => {
                    if (window.matchMedia('(max-width: 900px)').matches) {
                      e.preventDefault()
                      setOpenDropdown((d) => (d === item.to ? null : item.to))
                      return
                    }
                    closeMenu()
                  }}
                >
                  {item.label}
                  <span className="nav__chevron" aria-hidden="true" />
                </NavLink>
                <div className="nav__dropdown">
                  <div className="nav__dropdown-panel">
                    {item.children.map((child) => (
                      <Link key={child.to} to={child.to} onClick={closeMenu}>
                        {child.label}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `nav__link${isActive ? ' is-active' : ''}`}
                onClick={closeMenu}
              >
                {item.label}
              </NavLink>
            ),
          )}
          <Link to="/login" className="nav__link" onClick={closeMenu}>
            Member login
          </Link>

          <SpecularButton
            {...specularProps}
            size="md"
            className="nav__contact-mobile"
            onClick={() => {
              closeMenu()
              navigate('/contact')
            }}
          >
            <ContactIcon />
            Contact Us
          </SpecularButton>
        </nav>

        <SpecularButton
          {...specularProps}
          size="md"
          className="btn-contact--desktop specular-button--header"
          onClick={() => navigate('/contact')}
        >
          <ContactIcon />
          Contact Us
        </SpecularButton>
      </header>

      <div className="about-ticker" aria-label="About highlights">
        <div className="about-ticker__track">
          {[...ticker, ...ticker].map((item, i) => (
            <span key={`${item}-${i}`} className="about-ticker__item">
              {item}
            </span>
          ))}
        </div>
      </div>
    </>
  )
}
