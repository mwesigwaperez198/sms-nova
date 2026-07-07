import { useEffect, useRef, useState } from "react";

interface LandingPageProps {
  onEnterApp: () => void;
}

function useCountUp(target: number, active: boolean): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) return;
    const steps = 60;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setValue(target);
        clearInterval(timer);
      } else {
        setValue(Math.floor(current));
      }
    }, 1800 / steps);
    return () => clearInterval(timer);
  }, [target, active]);
  return value;
}

function AnimatedStat({ value, label, suffix = "+" }: { value: number; label: string; suffix?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const count = useCountUp(value, visible);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) setVisible(true); },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="landing-stat">
      <strong>{count}{suffix}</strong>
      <span>{label}</span>
    </div>
  );
}

const FEATURES = [
  {
    icon: "💳",
    title: "Smart Fee Tracking",
    desc: "Digital invoices, MTN & Airtel Money integration, instant receipts, and zero leakage. Bursars save hours every term.",
  },
  {
    icon: "👨‍👩‍👧",
    title: "Parent Visibility",
    desc: "Real-time attendance alerts, fee balance reminders, and report card delivery — straight to parents' phones.",
  },
  {
    icon: "📊",
    title: "Academic Analytics",
    desc: "Class performance trends, per-subject grade breakdowns, and at-risk student detection powered by historical data.",
  },
  {
    icon: "📚",
    title: "NCDC Digital Library",
    desc: "Curriculum-filtered books, past papers, and Q&A sheets aligned to Ugandan UNEB and NCDC syllabi by education tier.",
  },
  {
    icon: "📡",
    title: "Offline-First Sync",
    desc: "Works on low bandwidth. Data syncs when connectivity returns — built for Uganda's real infrastructure reality.",
  },
  {
    icon: "🔐",
    title: "Enterprise Security",
    desc: "Role-based access across 8 roles, JWT session management, audit logs, and tenant data isolation — fully hardened.",
  },
];

export function LandingPage({ onEnterApp }: LandingPageProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <div className="landing-root">
      <nav className={`landing-nav${scrolled ? " scrolled" : ""}`}>
        <div className="landing-nav-inner">
          <div className="landing-brand">
            <span className="landing-logo">N</span>
            <strong>Novara</strong>
          </div>
          <div className="landing-nav-actions">
            <button className="landing-btn-ghost" onClick={onEnterApp}>Sign In</button>
            <button className="landing-btn-primary" onClick={onEnterApp}>Register School</button>
          </div>
        </div>
      </nav>

      <section className="landing-hero">
        <div className="landing-hero-orb landing-orb-1" />
        <div className="landing-hero-orb landing-orb-2" />
        <div className="landing-hero-inner">
          <span className="landing-badge">🇺🇬 Built for Ugandan Schools</span>
          <h1 className="landing-headline">
            The School Management Platform<br />
            <span className="landing-gradient-text">Your School Deserves</span>
          </h1>
          <p className="landing-subline">
            Fees. Attendance. Report Cards. Library. Communication.<br />
            One platform. Eight roles. Zero chaos.
          </p>
          <div className="landing-hero-actions">
            <button className="landing-btn-primary landing-btn-lg" onClick={onEnterApp}>
              Get Started Free
            </button>
            <button className="landing-btn-ghost landing-btn-lg" onClick={onEnterApp}>
              Sign In →
            </button>
          </div>
          <div className="landing-stats">
            <AnimatedStat value={120} label="Schools Managed" />
            <AnimatedStat value={48000} label="Students" />
            <AnimatedStat value={3200} label="Teachers" />
            <AnimatedStat value={99} label="Uptime %" suffix="%" />
          </div>
        </div>
      </section>

      <section className="landing-trust">
        <p>Trusted by institutions across Uganda &amp; East Africa</p>
        <div className="landing-trust-row">
          {["Primary Schools", "Secondary Schools", "A-Level Institutions", "Tertiary Colleges", "Universities", "Special Needs Schools"].map((label) => (
            <span key={label} className="landing-trust-tag">{label}</span>
          ))}
        </div>
      </section>

      <section className="landing-features">
        <div className="landing-section-header">
          <h2>Everything your school needs</h2>
          <p>Purpose-built for the Ugandan educational ecosystem — from Nursery to University.</p>
        </div>
        <div className="landing-feature-grid">
          {FEATURES.map((feature, i) => (
            <article
              key={feature.title}
              className="landing-feature-card"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="landing-feature-icon">{feature.icon}</div>
              <h3>{feature.title}</h3>
              <p>{feature.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-roles">
        <div className="landing-section-header">
          <h2>One platform, eight powerful roles</h2>
          <p>Every stakeholder gets exactly the access they need — nothing more, nothing less.</p>
        </div>
        <div className="landing-role-grid">
          {[
            { role: "Super Admin", desc: "Global platform control & tenant provisioning" },
            { role: "Headmaster", desc: "Full school oversight & financial dashboards" },
            { role: "Teacher", desc: "Attendance, marks, lesson plans & communications" },
            { role: "Bursar", desc: "Fees, invoices, Mobile Money & financial reports" },
            { role: "Librarian", desc: "Book catalog, NCDC filtering & borrow tracking" },
            { role: "Secretary", desc: "Admissions, profiles & registration cards" },
            { role: "Parent", desc: "Child's grades, fees, attendance & library" },
            { role: "Student", desc: "Academic profile, digital library & exam results" },
          ].map(({ role, desc }) => (
            <div key={role} className="landing-role-card">
              <strong>{role}</strong>
              <span>{desc}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-cta">
        <div className="landing-cta-inner">
          <h2>Ready to modernise your school?</h2>
          <p>Join hundreds of Ugandan schools managing fees, attendance, and academics in one place.</p>
          <button className="landing-btn-primary landing-btn-lg" onClick={onEnterApp}>
            Register Your School Today
          </button>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="landing-footer-brand">
            <span className="landing-logo landing-logo-sm">N</span>
            <div>
              <strong>Novara</strong>
              <p>Smart School Management for East Africa</p>
            </div>
          </div>
          <div className="landing-footer-links">
            <div>
              <strong>Product</strong>
              <a href="#" onClick={(e) => e.preventDefault()}>Features</a>
              <a href="#" onClick={(e) => e.preventDefault()}>Pricing</a>
              <a href="#" onClick={(e) => e.preventDefault()}>Security</a>
            </div>
            <div>
              <strong>Company</strong>
              <a href="#" onClick={(e) => e.preventDefault()}>About Novara</a>
              <a href="#" onClick={(e) => e.preventDefault()}>Contact</a>
              <a href="#" onClick={(e) => e.preventDefault()}>Support</a>
            </div>
            <div>
              <strong>Legal</strong>
              <a href="#" onClick={(e) => e.preventDefault()}>Privacy Policy</a>
              <a href="#" onClick={(e) => e.preventDefault()}>Terms of Service</a>
              <a href="#" onClick={(e) => e.preventDefault()}>Data Protection</a>
            </div>
          </div>
        </div>
        <div className="landing-footer-bottom">
          <span>© {new Date().getFullYear()} Novara Tech Africa. All rights reserved.</span>
          <span className="powered-by-novara">Powered by Novara</span>
        </div>
      </footer>
    </div>
  );
}
