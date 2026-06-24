import { motion } from "framer-motion";
import { Heading, Reveal } from "./ui.jsx";
import { checkups } from "../content.js";

export default function Packages({ onBook }) {
  return (
    <section id="packages" className="container-x py-24">
      <Heading
        eyebrow="Health Checkups"
        title="Checkup packages & pricing"
        subtitle="Transparent, all-inclusive prices — no hidden charges. Pick a package and book in seconds."
      />

      <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch">
        {checkups.map((c, i) => {
          const popular = !!c.tag;
          return (
            <Reveal key={c.name} delay={(i % 4) * 0.07}>
              <motion.div
                whileHover={{ y: -8 }}
                className={`relative h-full flex flex-col rounded-2xl p-6 border transition ${
                  popular
                    ? "border-brand-500 bg-gradient-to-b from-brand-600 to-brand-700 text-white shadow-soft"
                    : "border-slate-100 bg-white shadow-sm hover:shadow-soft"
                }`}
              >
                {popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent-500 text-white text-[10px] font-bold uppercase tracking-wide px-3 py-1 rounded-full">
                    {c.tag}
                  </span>
                )}
                <div className="text-3xl">{c.icon}</div>
                <h3 className={`mt-3 font-display font-bold text-lg ${popular ? "text-white" : "text-ink-900"}`}>
                  {c.name}
                </h3>
                <p className={`mt-1 text-sm ${popular ? "text-brand-100" : "text-slate-500"}`}>{c.desc}</p>

                <div className="mt-4">
                  <span className="font-display text-3xl font-extrabold">{c.price}</span>
                  <span className={`text-sm ${popular ? "text-brand-100" : "text-slate-400"}`}> / visit</span>
                </div>

                <ul className="mt-4 space-y-2 flex-1">
                  {c.items.map((it) => (
                    <li key={it} className="flex items-start gap-2 text-sm">
                      <span className={popular ? "text-brand-200" : "text-brand-600"}>✓</span>
                      <span className={popular ? "text-brand-50" : "text-slate-600"}>{it}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => onBook?.(c)}
                  className={`mt-6 w-full font-semibold py-2.5 rounded-xl transition active:scale-[0.98] ${
                    popular
                      ? "bg-white text-brand-700 hover:bg-brand-50"
                      : "bg-brand-50 text-brand-700 hover:bg-brand-600 hover:text-white"
                  }`}
                >
                  Book this checkup
                </button>
              </motion.div>
            </Reveal>
          );
        })}
      </div>

      <p className="mt-8 text-center text-sm text-slate-400">
        Prices are indicative and include taxes. Reports are available online within 24 hours.
      </p>
    </section>
  );
}
