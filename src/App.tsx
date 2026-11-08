import { useEffect, useRef, lazy, Suspense } from "react";
import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/context/ThemeContext";
import { ContentProvider } from "@/lib/use-content";

import { SiteChrome } from "@/components/layout/SiteChrome";
import { Footer } from "@/components/layout/Footer";
import { PageTransition } from "@/components/layout/PageTransition";
import { IntroCurtain } from "@/components/layout/IntroCurtain";
import { SmoothScroll, scrollPageTo, useLenis } from "@/lib/smooth-scroll";
import { SiteMeta } from "@/components/SiteMeta";
import { FontApplier } from "@/components/FontApplier";
import { HrAssistant } from "@/components/HrAssistant";

// Lazy load all route-level pages for code splitting
const Home = lazy(() => import("@/pages/home"));
const WorkIndex = lazy(() => import("@/pages/work/index"));
const CaseStudy = lazy(() => import("@/pages/work/case-study"));
const About = lazy(() => import("@/pages/about"));
const Studio = lazy(() => import("@/pages/studio"));
const StudioDetail = lazy(() => import("@/pages/studio-detail"));
const Privacy = lazy(() => import("@/pages/privacy"));
const Terms = lazy(() => import("@/pages/terms"));
const NotFound = lazy(() => import("@/pages/not-found"));
const Admin = lazy(() => import("@/pages/admin"));

/**
 * Resets window scroll on every in-app navigation, and emulates
 * Back/Forward scroll restoration manually (since the browser's own
 * restoration races SPA rendering and lands on a not-yet-rendered
 * page).
 *
 * Strategy:
 * - Set `history.scrollRestoration = "manual"` to disable native
 *   restoration entirely.
 * - Listen to `popstate` to flag the next location change as a POP
 *   (Back/Forward) navigation.
 * - On every location change, save the scrollY of the page we're
 *   leaving keyed by its pathname. If the change was a POP, restore
 *   the saved scrollY for the new pathname; otherwise scroll to top.
 *   Note: positions are keyed by pathname, not by history entry, so
 *   visiting the same path multiple times with different scroll
 *   positions will only remember the most recent value — adequate
 *   for this portfolio's flat route graph.
 * - Scroll writes run inside `requestAnimationFrame` to defer past
 *   the React commit so the new route's content is in the DOM. This
 *   is not a hard guarantee against a one-frame flash in every
 *   browser, but is sufficient alongside the existing 0.6s
 *   PageTransition fade.
 */
function ScrollManager() {
  const [location] = useLocation();
  const lenis = useLenis();
  const prevLocation = useRef(location);
  const positions = useRef<Map<string, number>>(new Map());
  const isPop = useRef(false);

  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    const onPop = () => { isPop.current = true; };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    positions.current.set(prevLocation.current, window.scrollY);
    const wasPop = isPop.current;
    isPop.current = false;
    prevLocation.current = location;

    const hash = decodeURIComponent(window.location.hash.slice(1));
    if (hash && !wasPop) {
      // Pages are lazy-loaded, so the anchor may not exist on the first frame.
      let tries = 0;
      let timer = 0;
      const seek = () => {
        const el = document.getElementById(hash);
        if (el) {
          scrollPageTo(lenis, el, { smooth: true });
          return;
        }
        if (++tries < 40) timer = window.setTimeout(seek, 75);
      };
      seek();
      return () => window.clearTimeout(timer);
    }

    const targetY = wasPop ? (positions.current.get(location) ?? 0) : 0;
    const raf = requestAnimationFrame(() => {
      scrollPageTo(lenis, targetY);
    });
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  return null;
}

function WithLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Skip navigation link for keyboard users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg focus:font-sans focus:text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
      >
        Skip to content
      </a>
      <SiteChrome />
      <div className="relative flex flex-col min-h-screen bg-background px-5 md:pl-[calc(var(--rail-w)+2rem)] md:pr-8 pt-[var(--chrome-h)] pb-12 overflow-x-clip">
        <div className="relative z-10 flex flex-col flex-1">
          {children}
          <Footer />
        </div>
      </div>
    </>
  );
}

const PageLoading = () => (
  <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto py-12 px-6 animate-pulse" role="status" aria-label="Loading page">
    <div className="h-4 w-32 rounded bg-muted" />
    <div className="h-10 w-3/4 rounded bg-muted" />
    <div className="h-4 w-full rounded bg-muted" />
    <div className="h-4 w-5/6 rounded bg-muted" />
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
      <div className="aspect-[4/3] rounded-xl bg-muted" />
      <div className="aspect-[4/3] rounded-xl bg-muted" />
    </div>
    <span className="sr-only">Loading page content…</span>
  </div>
);

function AppRoutes() {
  return (
    <Switch>
      <Route path="/">
        <WithLayout><PageTransition><Suspense fallback={<PageLoading />}><Home /></Suspense></PageTransition></WithLayout>
      </Route>
      <Route path="/home">
        <Redirect to="/" />
      </Route>
      <Route path="/work">
        <WithLayout><PageTransition><Suspense fallback={<PageLoading />}><WorkIndex /></Suspense></PageTransition></WithLayout>
      </Route>
      <Route path="/work/:slug/full">
        <WithLayout><PageTransition><Suspense fallback={<PageLoading />}><CaseStudy full /></Suspense></PageTransition></WithLayout>
      </Route>
      <Route path="/work/:slug">
        <WithLayout><PageTransition><Suspense fallback={<PageLoading />}><CaseStudy /></Suspense></PageTransition></WithLayout>
      </Route>
      <Route path="/art">
        <Redirect to="/studio" />
      </Route>
      <Route path="/about">
        <WithLayout><PageTransition><Suspense fallback={<PageLoading />}><About /></Suspense></PageTransition></WithLayout>
      </Route>
      <Route path="/studio/:slug">
        <WithLayout><PageTransition><Suspense fallback={<PageLoading />}><StudioDetail /></Suspense></PageTransition></WithLayout>
      </Route>
      <Route path="/studio">
        <WithLayout><PageTransition><Suspense fallback={<PageLoading />}><Studio /></Suspense></PageTransition></WithLayout>
      </Route>
      <Route path="/contact">
        <Redirect to="/about#contact" replace />
      </Route>
      <Route path="/play">
        <Redirect to="/studio#play" replace />
      </Route>
      <Route path="/privacy">
        <WithLayout><PageTransition><Suspense fallback={<PageLoading />}><Privacy /></Suspense></PageTransition></WithLayout>
      </Route>
      <Route path="/terms">
        <WithLayout><PageTransition><Suspense fallback={<PageLoading />}><Terms /></Suspense></PageTransition></WithLayout>
      </Route>
      <Route path="/admin">
        <Suspense fallback={<PageLoading />}><Admin /></Suspense>
      </Route>
      <Route>
        <WithLayout><PageTransition><Suspense fallback={<PageLoading />}><NotFound /></Suspense></PageTransition></WithLayout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider>
      <ContentProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <SmoothScroll>
            <ScrollManager />
            <SiteMeta />
            <FontApplier />
            <div className="grain-overlay" />
            <IntroCurtain />
            <AppRoutes />
          </SmoothScroll>
        </WouterRouter>
        <Toaster />
        <HrAssistant />
      </ContentProvider>
    </ThemeProvider>
  );
}

export default App;
