import { createFileRoute, Outlet, redirect, useLocation, useNavigate, useSearch } from "@tanstack/react-router"

import { Footer } from "@/components/Common/Footer"
import AppSidebar from "@/components/Sidebar/AppSidebar"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { isLoggedIn } from "@/hooks/useAuth"

export const Route = createFileRoute("/_layout")({
  component: Layout,
  beforeLoad: async () => {
    if (!isLoggedIn()) {
      throw redirect({
        to: "/login",
      })
    }
  },
})

const communityTabs = [
  { key: "feed", label: "全部" },
  { key: "my-posts", label: "我的帖子" },
  { key: "my-favorites", label: "我的收藏" },
  { key: "following", label: "关注的人" },
] as const

type CommunityTab = (typeof communityTabs)[number]["key"]

function CommunityNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const search = useSearch({ from: "/_layout/community" })
  const activeTab = search.tab ?? "feed"

  const setTab = (tab: CommunityTab) => {
    navigate({
      to: location.pathname,
      search: (prev) => {
        const next = { ...prev }
        if (tab === "feed") {
          delete next.tab
        } else {
          next.tab = tab
        }
        return next
      },
      replace: true,
    })
  }

  return (
    <nav className="flex items-center gap-1 ml-2">
      {communityTabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => setTab(tab.key)}
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
            activeTab === tab.key
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  )
}

function Layout() {
  const location = useLocation()
  const isForgePage = location.pathname === "/forge"
  const isDashboardPage = location.pathname === "/"
  const isCommunityPage = location.pathname === "/community"

  return (
    <SidebarProvider className={(isForgePage || isDashboardPage) ? "h-svh overflow-hidden" : ""}>
      <AppSidebar />
      <SidebarInset className={(isForgePage || isDashboardPage) ? "overflow-hidden flex flex-col" : ""}>
        {!isForgePage && (
          <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1 text-muted-foreground" />
            {isCommunityPage && <CommunityNav />}
          </header>
        )}
        {isForgePage ? (
          <main className="flex-1 overflow-hidden h-full">
            <Outlet />
          </main>
        ) : isDashboardPage ? (
          <main className="flex-1 overflow-hidden min-h-0">
            <Outlet />
          </main>
        ) : (
          <>
            <main className="flex-1 p-6 md:p-8">
              <div className="mx-auto max-w-7xl">
                <Outlet />
              </div>
            </main>
            <Footer />
          </>
        )}
      </SidebarInset>
    </SidebarProvider>
  )
}

export default Layout
