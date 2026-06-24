import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const HERO_IMAGES = [
  "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=1100&q=80", // smiling doctor
  "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=1100&q=80", // doctor with tablet
  "https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?w=1100&q=80", // medical team
  "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1100&q=80", // consultation
];

export default function Hero({ clinic, onBook }) {
  const [imgIdx, setImgIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setImgIdx((i) => (i + 1) % HERO_IMAGES.length), 4000);
    return () => clearInterval(t);
  }, []);

  return (
    <section id="top" className="relative mesh-bg overflow-hidden">
      {/* Animated decorative blobs */}
      <div className="pointer-events-none absolute -top-24 -right-24 w-96 h-96 bg-brand-300/40 rounded-full blur-3xl animate-blob" />
      <div className="pointer-events-none absolute top-40 -left-24 w-80 h-80 bg-sky-300/40 rounded-full blur-3xl animate-blob [animation-delay:4s]" />

      <div className="container-x relative pt-16 pb-24 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 glass rounded-full pl-1.5 pr-4 py-1.5 text-sm font-medium shadow-sm"
          >
            <span className="bg-brand-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              NEW
            </span>
            24/7 AI receptionist now live
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="mt-6 font-display text-5xl md:text-6xl font-extrabold leading-[1.05] text-ink-900"
          >
            Healthcare that{" "}
            <span className="gradient-text">feels effortless.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16 }}
            className="mt-5 text-lg text-slate-600 max-w-md"
          >
            {clinic?.name || "Zenora Clinic"} brings together trusted
            specialists, instant online booking, and an AI assistant that's always
            there for you.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.24 }}
            className="mt-8 flex flex-wrap gap-3"
          >
            <button onClick={onBook} className="btn-primary">
              Book Appointment →
            </button>
            <a href="#services" className="btn-ghost">
              Explore services
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-8 flex items-center gap-3 text-sm text-slate-500"
          >
            <div className="flex -space-x-3">
              {[32, 15, 44, 68].map((i) => (
                <img
                  key={i}
                  src={`https://i.pravatar.cc/80?img=${i}`}
                  className="w-9 h-9 rounded-full border-2 border-white object-cover"
                  alt=""
                />
              ))}
            </div>
            <div>
              <span className="text-amber-500">★★★★★</span>
              <div>Loved by 15,000+ patients</div>
            </div>
          </motion.div>
        </div>

        {/* Hero image with floating cards */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.7 }}
          className="relative"
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-brand-500/20 to-sky-400/20 rounded-[2rem] blur-2xl" />
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
            className="relative rounded-[2rem] overflow-hidden shadow-glow h-[520px]"
          >
            <AnimatePresence mode="wait">
              <motion.img
                key={imgIdx}
                src={HERO_IMAGES[imgIdx]}
                alt="Healthcare at Zenora Clinic"
                initial={{ opacity: 0, scale: 1.06 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.9, ease: "easeInOut" }}
                className="absolute inset-0 w-full h-full object-cover"
              />
            </AnimatePresence>
            {/* dots */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
              {HERO_IMAGES.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${i === imgIdx ? "w-5 bg-white" : "w-1.5 bg-white/60"}`}
                />
              ))}
            </div>
          </motion.div>

          <motion.div
            animate={{ y: [0, -12, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -bottom-5 -left-5 glass rounded-2xl shadow-soft px-5 py-4 flex items-center gap-3"
          >
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500" />
            </span>
            <div>
              <div className="font-bold text-ink-900 leading-tight">Doctors available now</div>
              <div className="text-xs text-slate-500">Same-day slots open</div>
            </div>
          </motion.div>

          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-6 -right-4 glass rounded-2xl shadow-soft px-4 py-3 flex items-center gap-2"
          >
            <div className="w-9 h-9 rounded-full bg-brand-100 grid place-items-center">✅</div>
            <div className="text-sm">
              <div className="font-bold text-ink-900 leading-tight">Booked!</div>
              <div className="text-xs text-slate-500">in 28 seconds</div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
