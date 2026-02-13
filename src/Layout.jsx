import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "./utils";
import { base44 } from "@/api/base44Client";
import {
  Home,
  Map,
  CalendarDays,
  Settings,
  Menu,
  X,
  TreePine,
  LogOut,
  Plus,
  Users,
  ArrowLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
  { name: "Přehled", page: "Home", icon: Home },
];

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  // Detect groundId from URL for back button
  const urlParams = new URLSearchParams(window.location.search);
  const groundId = urlParams.get("groundId") || urlParams.get("id");
  const showBackButton = groundId && (currentPageName === "Reservations" || currentPageName === "ManageGround");

  const handleLogout = () => {
    base44.auth.logout();
  };

  // Full-screen pages without layout
  if (currentPageName === "GroundMap") {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <style>{`
        :root {
          --hunt-green: #2D5016;
          --hunt-green-light: #4A7C23;
          --hunt-brown: #6B4226;
          --hunt-cream: #F5F0E8;
          --hunt-gold: #C4A35A;
        }
      `}</style>

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 bg-[#2D5016] text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to={createPageUrl("Home")} className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-white/15 rounded-lg flex items-center justify-center backdrop-blur-sm">
                <TreePine className="w-5 h-5 text-[#C4A35A]" />
              </div>
              <span className="text-lg font-bold tracking-tight hidden sm:block">
                Revírník
              </span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPageName === item.page;
                return (
                  <Link
                    key={item.page}
                    to={createPageUrl(item.page)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "text-white/70 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            {/* Right side */}
            <div className="flex items-center gap-3">
              {user && (
                <div className="hidden sm:flex items-center gap-2 text-sm text-white/80">
                  <div className="w-8 h-8 rounded-full bg-[#C4A35A] flex items-center justify-center text-white font-semibold text-xs">
                    {user.full_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase()}
                  </div>
                  <span className="hidden lg:block">{user.full_name || user.email}</span>
                </div>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="text-white/70 hover:text-white hover:bg-white/10"
                title="Odhlásit se"
              >
                <LogOut className="w-4 h-4" />
              </Button>
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="md:hidden p-2 rounded-lg hover:bg-white/10"
              >
                {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile nav overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="fixed top-16 right-0 w-64 bg-white shadow-xl rounded-bl-2xl p-4">
            <nav className="flex flex-col gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPageName === item.page;
                return (
                  <Link
                    key={item.page}
                    to={createPageUrl(item.page)}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? "bg-[#2D5016]/10 text-[#2D5016]"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {showBackButton && (
          <div className="mb-6">
            <Link to={`${createPageUrl("GroundInfo")}?id=${groundId}`}>
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Zpět na přehled honitby
              </Button>
            </Link>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}