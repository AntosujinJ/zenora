import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Logo from "./Logo.jsx";

export default function Navbar({ clinic, onBook }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    ["Services", "#services"],
    ["Packages", "#packages"],
    ["Why us", "#why"],
    ["Doctors", "#doctors"],
    ["Reviews", "#reviews"],
    ["FAQ", "#faq"],
  ];

  return (
    <>
      {/* Announcement bar */}
      <div className="bg-brand-700 text-brand-50 text-xs md:text-sm text-center py-2 px-4">
        🎉 New patients get a free first consultation this month —{" "}
        <button onClick={onBook} className="underline font-semibold hover:text-white">
          book now
        </button>
      </div>

      <motion.header
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className={`sticky top-0 z-40 transition-all ${
          scrolled ? "bg-white/85 backdrop-blur-xl shadow-sm" : "bg-transparent"
        }`}
      >
        <div className="container-x h-16 flex items-center justify-between">
          <Logo />

          <nav className="hidden md:flex items-center gap-7 text-sm font-semibold text-slate-600">
            {links.map(([label, href]) => (
              <a key={href} href={href} className="hover:text-brand-600 transition">
                {label}
              </a>
            ))}
          </nav>

          <button onClick={onBook} className="btn-primary !px-5 !py-2 text-sm">
            Book Appointment
          </button>
        </div>
      </motion.header>
    </>
  );
}
