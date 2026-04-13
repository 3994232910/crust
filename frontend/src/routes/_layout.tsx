import { createFileRoute, Outlet, redirect, useLocation } from "@tanstack/react-router"

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

function Layout() {
  const location = useLocation()
  const isForgePage = location.pathname === "/forge"

  return (
    <SidebarProvider className={isForgePage ? "h-svh overflow-hidden" : ""}>
      <AppSidebar />
      <SidebarInset className={isForgePage ? "overflow-hidden" : ""}>
        {!isForgePage && (
          <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1 text-muted-foreground" />
          </header>
        )}
        {isForgePage ? (
          <main className="flex-1 overflow-hidden h-full">
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
