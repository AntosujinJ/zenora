import { motion } from "framer-motion";
import { Heading, Reveal } from "./ui.jsx";
import { features } from "../content.js";

export default function WhyUs() {
  return (
    <section id="why" className="bg-slate-50/70 py-24">
      <div className="container-x">
        <Heading
          eyebrow="Why choose us"
          title="A clinic built around your time"
          subtitle="Modern tools and a caring team that make healthcare simple, fast, and stress-free."
        />

        <div className="mt-14 grid md:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <Reveal key={f.title} delay={(i % 3) * 0.07}>
              <motion.div
                whileHover={{ y: -6 }}
                className="h-full rounded-2xl bg-white p-7 border border-slate-100 shadow-sm hover:shadow-soft transition"
              >
                <div className="w-12 h-12 grid place-items-center rounded-xl bg-brand-600/10 text-2xl">
                  {f.icon}
                </div>
                <h3 className="mt-4 font-display font-bold text-lg text-ink-900">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm text-slate-500 leading-relaxed">{f.desc}</p>
              </motion.div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
