import { partners } from "../content.js";

export default function Partners() {
  const row = [...partners, ...partners];
  return (
    <section className="py-10 border-y border-slate-100 bg-white/60">
      <div className="container-x">
        <p className="text-center text-xs font-semibold uppercase tracking-wider text-slate-400">
          Trusted by leading insurers & partners
        </p>
        <div className="mt-6 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_15%,#000_85%,transparent)]">
          <div className="flex gap-12 w-max animate-marquee">
            {row.map((p, i) => (
              <span
                key={i}
                className="text-xl font-display font-bold text-slate-300 whitespace-nowrap"
              >
                {p}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
