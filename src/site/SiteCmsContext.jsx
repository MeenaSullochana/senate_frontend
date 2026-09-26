import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { cmsApi, settingsApi } from '../services/api'
import {
  FALLBACK_AMENITIES,
  FALLBACK_BRANCHES,
  FALLBACK_CONTACTS,
  FALLBACK_SLIDES,
  FALLBACK_STATS,
  FALLBACK_TICKER,
  mediaUrl,
} from './defaults'

const SiteCmsContext = createContext(null)

export function SiteCmsProvider({ children }) {
  const [state, setState] = useState({
    loading: true,
    site: null,
    partners: [],
    solutions: [],
    blog: [],
    gallery: [],
    branches: FALLBACK_BRANCHES,
    plans: [],
  })

  useEffect(() => {
    let cancelled = false
    Promise.all([cmsApi.site().catch(() => null), settingsApi.public().catch(() => null)]).then(
      ([cmsRes, settingsRes]) => {
        if (cancelled) return
        const cms = cmsRes?.data?.data || {}
        const settings = settingsRes?.data?.data || {}
        const apiBranches = (settings.branches || []).map((b) => ({
          id: b.code || b.id,
          label: b.code || b.name,
          address: b.address,
          mapEmbed: b.mapEmbed || FALLBACK_BRANCHES.find((x) => x.label === b.code)?.mapEmbed || '',
        }))
        setState({
          loading: false,
          site: cms.site || null,
          partners: cms.partners || [],
          solutions: cms.solutions || [],
          blog: cms.blog || [],
          gallery: cms.gallery || [],
          branches: apiBranches.length ? apiBranches : FALLBACK_BRANCHES,
          plans: settings.plans || [],
        })
      },
    )
    return () => {
      cancelled = true
    }
  }, [])

  const value = useMemo(() => {
    const site = state.site
    const amenitiesRaw = site?.amenities
    const amenities = Array.isArray(amenitiesRaw) && amenitiesRaw.length
      ? amenitiesRaw.map((a, i) =>
          typeof a === 'string' ? { id: `amenity-${i}`, label: a } : { id: a.id || `amenity-${i}`, label: a.label || a.name },
        )
      : FALLBACK_AMENITIES

    return {
      ...state,
      ticker: site?.ticker?.length ? site.ticker : FALLBACK_TICKER,
      contacts: site?.contacts || FALLBACK_CONTACTS,
      slides: site?.slides?.length ? site.slides : FALLBACK_SLIDES,
      stats: site?.stats?.length ? site.stats : FALLBACK_STATS,
      searchCities: site?.searchCities?.length ? site.searchCities : ['Chennai', 'Trichy', 'Kerala', 'Hyderabad'],
      footerBlurb: site?.footerBlurb || 'Redefining managed workspaces',
      amenities,
      metaTitle: site?.metaTitle || 'Senate Space',
      metaDescription: site?.metaDescription || '',
      partnerItems: (state.partners || []).map((p) => ({
        name: p.name,
        logo: mediaUrl(p.logoUrl || p.logo),
      })),
      solutionItems: (state.solutions || []).map((s) => ({
        id: s.slug ? `sol-${s.slug}` : s.id,
        slug: s.slug,
        title: s.title,
        text: s.summary || s.text || '',
        image: mediaUrl(s.imageUrl || s.image),
        to: s.slug ? `/solutions/${s.slug}` : '/solutions',
      })),
      galleryItems: (state.gallery || []).map((g) => ({
        label: g.title || g.label,
        image: mediaUrl(g.imageUrl || g.image),
      })),
      blogItems: (state.blog || []).map((b) => ({
        tag: b.tag || 'Blog',
        title: b.title,
        excerpt: b.excerpt || '',
        image: mediaUrl(b.coverImageUrl || b.image),
        slug: b.slug,
        to: b.slug ? `/blog/${b.slug}` : '/blog',
      })),
      packageItems: (state.plans || []).map((p, i) => ({
        id: p.id || `plan-${i}`,
        name: p.name || `Plan ${String.fromCharCode(65 + i)}`,
        subtitle: p.marketingTagline || p.description || '',
        price: p.price != null ? `₹${p.price}` : '',
        period: p.durationUnit === 'DAY' ? '/ Day' : p.durationUnit === 'MONTH' ? '/ Month' : p.durationUnit === 'YEAR' ? '/ Year' : '',
        points: Array.isArray(p.featureList) ? p.featureList : [],
      })),
    }
  }, [state])

  return <SiteCmsContext.Provider value={value}>{children}</SiteCmsContext.Provider>
}

export function useSiteCms() {
  const ctx = useContext(SiteCmsContext)
  if (!ctx) throw new Error('useSiteCms must be used within SiteCmsProvider')
  return ctx
}
