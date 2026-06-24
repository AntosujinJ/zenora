// Central marketing content + data for the site.

export const services = [
  { icon: "🩺", title: "General Medicine", desc: "Routine check-ups, illness care, chronic disease management, and preventive health screening.", tag: "Most booked" },
  { icon: "🧴", title: "Dermatology", desc: "Acne, eczema, hair loss, skin cancer screening, and advanced cosmetic treatments.", tag: "" },
  { icon: "👶", title: "Pediatrics", desc: "Vaccinations, growth monitoring, and gentle expert care for newborns to teens.", tag: "" },
  { icon: "🦷", title: "Dental Care", desc: "Cleanings, fillings, root canals, braces, and same-day smile makeovers.", tag: "" },
  { icon: "❤️", title: "Cardiology", desc: "ECG, echo, blood-pressure management, and ongoing heart-health monitoring.", tag: "" },
  { icon: "🦴", title: "Orthopedics", desc: "Joint pain, sports injuries, fracture care, and physiotherapy referrals.", tag: "" },
  { icon: "🧠", title: "Neurology", desc: "Headache, migraine, epilepsy, and nerve-related condition assessment.", tag: "" },
  { icon: "🧪", title: "Lab & Diagnostics", desc: "Blood tests, imaging, and fast online reports you can access anytime.", tag: "24/7" },
];

export const checkups = [
  {
    name: "Basic Health Checkup",
    price: "₹999",
    icon: "🩹",
    tag: "",
    desc: "Essential screening for everyday peace of mind.",
    items: ["Complete Blood Count (CBC)", "Blood sugar (fasting)", "Blood pressure & BMI", "Doctor consultation"],
  },
  {
    name: "Full Body Checkup",
    price: "₹2,499",
    icon: "🧬",
    tag: "Most popular",
    desc: "A head-to-toe 50+ test health screen.",
    items: ["50+ lab tests", "Liver, kidney & thyroid panel", "ECG + chest X-ray", "Specialist consultation", "Free follow-up visit"],
  },
  {
    name: "Heart Health",
    price: "₹1,799",
    icon: "❤️",
    tag: "",
    desc: "Know your heart inside out.",
    items: ["ECG & 2D Echo", "Lipid profile", "BP & risk assessment", "Cardiologist consultation"],
  },
  {
    name: "Diabetes Care",
    price: "₹1,299",
    icon: "🩸",
    tag: "",
    desc: "Track and manage your blood sugar.",
    items: ["HbA1c + fasting/PP sugar", "Kidney function test", "Diet & lifestyle plan", "Doctor consultation"],
  },
];

export const features = [
  { icon: "📅", title: "Book in 30 seconds", desc: "Pick a doctor, see real open slots, and confirm — no phone calls, no waiting on hold." },
  { icon: "🤖", title: "24/7 AI assistant", desc: "Get instant answers about doctors, hours, and services any time, day or night." },
  { icon: "🔔", title: "Smart reminders", desc: "Automatic email & WhatsApp reminders so you never miss an appointment again." },
  { icon: "🔒", title: "Private & secure", desc: "Your health data is encrypted and never shared without your consent." },
  { icon: "🌐", title: "Care in your language", desc: "Talk to our assistant in the language you're most comfortable with." },
  { icon: "💳", title: "Transparent pricing", desc: "Know your costs and insurance coverage up front — no surprises." },
];

export const steps = [
  { n: "01", title: "Choose your doctor", desc: "Browse specialists by department and read their experience." },
  { n: "02", title: "Pick a time", desc: "See live availability and grab the slot that suits you." },
  { n: "03", title: "Confirm details", desc: "Add your info and reason for visit in a few taps." },
  { n: "04", title: "Get reminders", desc: "Receive instant confirmation and friendly reminders." },
];

export const stats = [
  { value: 15000, suffix: "+", label: "Patients cared for" },
  { value: 24, suffix: "+", label: "Specialist doctors" },
  { value: 98, suffix: "%", label: "Patient satisfaction" },
  { value: 12, suffix: " yrs", label: "Serving the community" },
];

export const testimonials = [
  { name: "Meera S.", role: "Patient", text: "Booking used to mean 20 minutes on hold. Now I do it in seconds and the reminders are a lifesaver.", avatar: "https://i.pravatar.cc/120?img=32", rating: 5 },
  { name: "Rahul K.", role: "Parent", text: "The pediatric team is wonderful with my daughter, and the AI chat answered all my questions at midnight.", avatar: "https://i.pravatar.cc/120?img=15", rating: 5 },
  { name: "Anjali T.", role: "Patient", text: "Clean clinic, friendly doctors, and I could see my lab reports online the same day. Highly recommend.", avatar: "https://i.pravatar.cc/120?img=44", rating: 5 },
  { name: "Vivek M.", role: "Patient", text: "Got a same-day dermatology slot for my son. The whole experience felt modern and effortless.", avatar: "https://i.pravatar.cc/120?img=68", rating: 5 },
];

export const faqs = [
  { q: "Do I need an account to book?", a: "No. You can book in seconds with just your name and phone number. Creating an account is optional and lets you view past visits." },
  { q: "Can I reschedule or cancel?", a: "Yes. Use the link in your confirmation message, or just ask our AI assistant and it will guide you." },
  { q: "Is the AI assistant a doctor?", a: "No — the assistant helps with information and booking only. It never diagnoses or prescribes. For medical concerns, our doctors are here to help." },
  { q: "Do you accept insurance?", a: "We work with most major insurers. Our team confirms your coverage and likely costs before your visit." },
  { q: "What are your hours?", a: "We're open Monday to Saturday, 9:00 AM to 6:00 PM. The AI assistant and online booking are available 24/7." },
  { q: "Is my data safe?", a: "Absolutely. All health information is encrypted in transit and at rest, and we never share it without your consent." },
];

export const partners = [
  "MediCare", "HealthFirst", "CareWell", "VitaPlus", "Wellnest", "PrimeHealth",
];
