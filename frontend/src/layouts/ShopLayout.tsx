import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { TopAppBar } from "@/components/TopAppBar";
import { BottomNav } from "@/components/BottomNav";

/**
 * The frame every shop screen renders inside: sticky top app bar, scrollable
 * content, and a persistent bottom navigation. Content is constrained to a
 * phone-width column and centered on larger screens.
 */
export function ShopLayout() {
  const location = useLocation();
  return (
    <div className="flex min-h-dvh flex-col bg-surface-muted">
      <TopAppBar />

      <main className="mx-auto w-full max-w-screen-sm md:max-w-screen-md lg:max-w-screen-lg xl:max-w-screen-xl flex-1 px-4 pb-28 pt-4">
        {/* Subtle cross-fade/slide on route change. Respects reduced-motion via CSS. */}
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      <BottomNav />
    </div>
  );
}
