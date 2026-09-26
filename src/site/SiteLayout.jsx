import { Outlet } from 'react-router-dom'
import '../App.css'
import { SiteCmsProvider } from './SiteCmsContext'
import SiteFooter from './SiteFooter'
import SiteHeader from './SiteHeader'

export default function SiteLayout() {
  return (
    <SiteCmsProvider>
      <div className="page">
        <SiteHeader />
        <Outlet />
        <SiteFooter />
      </div>
    </SiteCmsProvider>
  )
}
