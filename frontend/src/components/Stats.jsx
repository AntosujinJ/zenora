import { Counter, Reveal } from "./ui.jsx";
import { stats } from "../content.js";

export default function Stats() {
  return (
    <section className="container-x py-20">
      <div className="rounded-3xl bg-gradient-to-br from-brand-600 to-brand-800 text-white px-8 py-12 shadow-soft relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-white/10 rounded-full blur-2xl" />
        <div className="relative grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {stats.map((s, i) => (
            <Reveal key={s.label} delay={i * 0.08}>
              <div className="font-display text-4xl md:text-5xl font-extrabold">
                <Counter value={s.value} suffix={s.suffix} />
              </div>
              <div className="mt-2 text-brand-100 text-sm">{s.label}</div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
