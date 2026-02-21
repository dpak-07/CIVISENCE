import { motion as Motion } from "framer-motion";
import { ArrowRight, Bot, Building2, Download, ShieldCheck, UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import { staggerContainer } from "../animations/variants";
import GradientButton from "../components/common/GradientButton";
import PageTransition from "../components/common/PageTransition";
import SectionReveal from "../components/common/SectionReveal";

const steps = [
  {
    title: "Capture",
    description:
      "Citizens report issues with geotagged details and AI instantly classifies severity, category, and duplicate likelihood.",
  },
  {
    title: "Route",
    description:
      "CiviSense dispatches complaints to the right municipal office by area intelligence and priority scoring.",
  },
  {
    title: "Resolve",
    description:
      "Offices update progress in real-time while headquarters monitors trends, risk zones, and resolution performance.",
  },
];

const features = [
  "AI-powered triage and duplicate detection",
  "Role-based workflow for Admin, Municipal, and Citizens",
  "Live city map with severity-aware complaint clusters",
  "Actionable analytics with resolution performance tracking",
  "Sensitive location monitoring and risk overlays",
  "Mobile-first interface with guided civic workflows",
];

const roles = [
  {
    title: "Main Admin",
    icon: ShieldCheck,
    description: "National and city-level oversight, policy decisions, and office allocation controls.",
  },
  {
    title: "Municipal Office",
    icon: Building2,
    description: "Area-level operations center for resolving assigned complaints and reporting progress.",
  },
  {
    title: "Citizen",
    icon: UserRound,
    description: "Simple reporting experience with transparent complaint status and timeline tracking.",
  },
];

function LandingPage() {
  return (
    <PageTransition>
      <div className="landing-shell relative min-h-screen overflow-hidden text-white">
        <div className="gradient-wave wave-one" />
        <div className="gradient-wave wave-two" />

        <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6 md:px-10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-300 to-blue-500 text-slate-950">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-cyan-200">CiviSense</p>
              <p className="text-sm text-slate-300">Futuristic Civic AI</p>
            </div>
          </div>

          <Link
            to="/login"
            className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm transition hover:bg-white/20"
          >
            Sign In
          </Link>
        </header>

        <main className="relative z-10 mx-auto w-full max-w-7xl px-6 pb-20 md:px-10">
          <section className="grid items-center gap-12 py-12 lg:grid-cols-[1.2fr_1fr] lg:py-20">
            <Motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="space-y-6"
            >
              <Motion.p
                variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
                className="inline-flex rounded-full border border-cyan-300/25 bg-cyan-300/8 px-4 py-1 text-xs uppercase tracking-[0.2em] text-cyan-200"
              >
                Civic Intelligence Platform
              </Motion.p>

              <Motion.h1
                variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
                className="max-w-3xl text-4xl font-semibold leading-tight md:text-6xl"
              >
                CiviSense - Smart Civic Intelligence
              </Motion.h1>

              <Motion.p
                variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
                className="max-w-2xl text-base text-slate-300 md:text-lg"
              >
                AI-Driven Civic Issue Resolution System for faster decisions, cleaner neighborhoods, and transparent governance.
              </Motion.p>

              <Motion.div
                variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
                className="flex flex-wrap items-center gap-3"
              >
                <Link to="/login">
                  <GradientButton className="gap-2">
                    Get Started <ArrowRight className="h-4 w-4" />
                  </GradientButton>
                </Link>

                <a href="#download" aria-label="Download app">
                  <GradientButton variant="secondary" className="gap-2">
                    Download App <Download className="h-4 w-4" />
                  </GradientButton>
                </a>
              </Motion.div>
            </Motion.div>

            <SectionReveal className="glass-panel rounded-3xl border border-white/15 p-6 md:p-8">
              <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Project Overview</p>
              <h2 className="mt-3 text-2xl font-semibold">One command center for civic outcomes.</h2>
              <p className="mt-4 text-sm leading-relaxed text-slate-300">
                CiviSense connects citizens, municipal operators, and city leadership inside one intelligence loop. Complaints are prioritized, routed, visualized, and resolved through measurable service workflows.
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3 text-sm text-slate-200">
                <div className="rounded-xl border border-white/10 bg-white/8 p-3">
                  <p className="text-xs uppercase tracking-[0.12em] text-slate-300">AI Models</p>
                  <p className="mt-1 text-xl font-semibold">14+</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/8 p-3">
                  <p className="text-xs uppercase tracking-[0.12em] text-slate-300">Resolution Lift</p>
                  <p className="mt-1 text-xl font-semibold">+37%</p>
                </div>
              </div>
            </SectionReveal>
          </section>

          <SectionReveal className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl md:p-10">
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">How It Works</p>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {steps.map((step, index) => (
                <Motion.article
                  key={step.title}
                  whileHover={{ y: -3 }}
                  className="rounded-2xl border border-white/10 bg-slate-950/45 p-5"
                >
                  <p className="text-sm font-semibold text-cyan-300">Step {index + 1}</p>
                  <h3 className="mt-1 text-lg font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm text-slate-300">{step.description}</p>
                </Motion.article>
              ))}
            </div>
          </SectionReveal>

          <section className="mt-12 grid gap-5 md:grid-cols-2">
            <SectionReveal className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl md:p-8">
              <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Features</p>
              <ul className="mt-4 space-y-3 text-sm text-slate-200">
                {features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <span className="mt-1 h-2.5 w-2.5 rounded-full bg-cyan-300" />
                    {feature}
                  </li>
                ))}
              </ul>
            </SectionReveal>

            <SectionReveal className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl md:p-8">
              <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Role Based Access Overview</p>
              <div className="mt-4 space-y-3">
                {roles.map((role) => {
                  const Icon = role.icon;
                  return (
                    <article key={role.title} className="rounded-2xl border border-white/10 bg-slate-950/55 p-4">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-cyan-300" />
                        <h3 className="font-semibold">{role.title}</h3>
                      </div>
                      <p className="mt-2 text-sm text-slate-300">{role.description}</p>
                    </article>
                  );
                })}
              </div>
            </SectionReveal>
          </section>
        </main>

        <footer id="download" className="relative z-10 border-t border-white/10 px-6 py-6 text-center text-sm text-slate-300 md:px-10">
          Built for smarter, faster, and more transparent urban governance.
        </footer>
      </div>
    </PageTransition>
  );
}

export default LandingPage;
