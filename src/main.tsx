import '@fontsource-variable/inter'
import '@fontsource-variable/playfair-display'
import './index.css'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { Carregando, Layout } from './components/Layout'
import Catalogo from './pages/Catalogo'
import Home from './pages/Home'
import NaoEncontrado from './pages/NaoEncontrado'
import ProdutoPagina from './pages/ProdutoPagina'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 10 * 60_000,
      refetchOnWindowFocus: false,
    },
  },
})

// Fluxo principal de compra (home → catálogo → produto) no bundle inicial;
// páginas secundárias e o painel admin são carregados sob demanda.
const router = createBrowserRouter([
  {
    element: <Layout />,
    HydrateFallback: Carregando,
    children: [
      { index: true, element: <Home /> },
      { path: 'catalogo', element: <Catalogo /> },
      { path: 'produto/:slug', element: <ProdutoPagina /> },
      { path: 'quem-somos', lazy: async () => ({ Component: (await import('./pages/QuemSomos')).default }) },
      { path: 'contato', lazy: async () => ({ Component: (await import('./pages/Contato')).default }) },
      { path: '*', element: <NaoEncontrado /> },
    ],
  },
  // Painel só existe na versão com servidor (o site estático da Vercel não tem banco).
  // (condição inline para o compilador descartar o código do painel no build estático)
  ...(import.meta.env.VITE_ESTATICO === 'true'
    ? []
    : [
        {
          path: 'admin',
          HydrateFallback: Carregando,
          lazy: async () => ({ Component: (await import('./pages/admin/Admin')).default }),
        },
      ]),
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
)
