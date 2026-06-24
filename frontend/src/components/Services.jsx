import { motion } from "framer-motion";
import { Heading, Reveal } from "./ui.jsx";
import { services } from "../content.js";

export default function Services() {
  return (
    <section id="services" className="container-x py-24">
      <Heading
        eyebrow="Our Services"
        title="Comprehensive care, all in one place"
        subtitle="From everyday health needs to specialist treatment, our expert team has you covered."
      />

      <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {services.map((s, i) => (
          <Reveal key={s.title} delay={(i % 4) * 0.06}>
            <motion.div
              whileHover={{ y: -8 }}
              className="shine group relative h-full rounded-2xl border border-slate-100 bg-white p-6 shadow-sm hover:shadow-soft transition"
            >
              {s.tag && (
                <span className="absolute top-4 right-4 text-[10px] font-bold uppercase tracking-wide text-brand-700 bg-brand-50 px-2 py-1 rounded-full">
                  {s.tag}
                </span>
              )}
              <div className="w-12 h-12 grid place-items-center rounded-xl bg-gradient-to-br from-brand-50 to-brand-100 text-2xl group-hover:scale-110 transition">
                {s.icon}
              </div>
              <h3 className="mt-4 font-display font-bold text-lg text-ink-900">
                {s.title}
              </h3>
              <p className="mt-2 text-sm text-slate-500 leading-relaxed">{s.desc}</p>
            </motion.div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
