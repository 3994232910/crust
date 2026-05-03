import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query"
import { createRouter, RouterProvider } from "@tanstack/react-router"
import { StrictMode } from "react"
import ReactDOM from "react-dom/client"
import { ApiError, OpenAPI } from "./client"
import { ThemeProvider } from "./components/theme-provider"
import { Toaster } from "./components/ui/sonner"
import "./index.css"
import "highlight.js/styles/github-dark.css"
import { routeTree } from "./routeTree.gen"

// 配置 API 基础路径
// dev 环境用空 BASE 走 Vite proxy，避免跨域丢 Authorization header
OpenAPI.BASE = import.meta.env.DEV ? "" : (import.meta.env.VITE_API_URL ?? "")
OpenAPI.TOKEN = async () => {
  return localStorage.getItem("access_token") || ""
}

// 统一处理 API 错误（如登录过期）
const handleApiError = (error: Error) => {
  if (error instanceof ApiError && [401, 403].includes(error.status)) {
    localStorage.removeItem("access_token")
    window.location.href = "/login"
  }
}

// 初始化 QueryClient
const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: handleApiError,
  }),
  mutationCache: new MutationCache({
    onError: handleApiError,
  }),
})

// 初始化路由
const router = createRouter({ routeTree })

// 注册路由类型（用于 TypeScript 提示）
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}

// 渲染应用
ReactDOM.createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <RouterProvider router={router} />
        <Toaster richColors closeButton />
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
)
