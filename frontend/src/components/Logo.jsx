// Zenora Clinic brand mark — a teal gradient tile with a Z monogram + pulse dot.
export default function Logo({ size = 38, showText = true, light = false }) {
  return (
    <a href="#top" className="flex items-center gap-2.5">
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Zenora Clinic logo"
        className="shrink-0"
      >
        <defs>
          <linearGradient id="zenoraG" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
            <stop stopColor="#2dd4bf" />
            <stop offset="1" stopColor="#0f766e" />
          </linearGradient>
        </defs>
        <rect width="48" height="48" rx="13" fill="url(#zenoraG)" />
        {/* Z monogram */}
        <path
          d="M15 17 H33 L15 31 H33"
          stroke="white"
          strokeWidth="4.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* pulse accent */}
        <circle cx="33" cy="17" r="2.6" fill="#a7f3d0" />
      </svg>
      {showText && (
        <span
          className={`font-display font-extrabold text-lg tracking-tight ${
            light ? "text-white" : "text-ink-900"
          }`}
        >
          Zenora{" "}
          <span className={light ? "text-brand-300" : "text-brand-600"}>Clinic</span>
        </span>
      )}
    </a>
  );
}
