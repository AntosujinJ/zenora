import { motion } from "framer-motion";
import { Heading, Reveal } from "./ui.jsx";
import { testimonials } from "../content.js";

export default function Testimonials() {
  return (
    <section id="reviews" className="container-x py-24">
      <Heading
        eyebrow="Patient stories"
        title="Loved by thousands of patients"
        subtitle="Real experiences from the people we care for every day."
      />

      <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {testimonials.map((t, i) => (
          <Reveal key={t.name} delay={(i % 4) * 0.07}>
            <motion.div
              whileHover={{ y: -6 }}
              className="h-full rounded-2xl bg-white border border-slate-100 p-6 shadow-sm hover:shadow-soft transition flex flex-col"
            >
              <div className="text-amber-400 text-sm">
                {"★".repeat(t.rating)}
              </div>
              <p className="mt-3 text-slate-600 text-sm leading-relaxed flex-1">
                "{t.text}"
              </p>
              <div className="mt-5 flex items-center gap-3">
                <img src={t.avatar} alt={t.name} className="w-10 h-10 rounded-full object-cover" />
                <div>
                  <div className="font-semibold text-ink-900 text-sm">{t.name}</div>
                  <div className="text-xs text-slate-400">{t.role}</div>
                </div>
              </div>
            </motion.div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
