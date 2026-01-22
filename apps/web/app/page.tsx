import styles from "./page.module.css";
import { AuthScreen } from "./components/AuthScreen";

const features = [
  {
    icon: "🏆",
    title: "Tournament Management",
    description:
      "Create brackets with ease. Single elimination, double elimination, round-robin, and Swiss formats supported.",
  },
  {
    icon: "⚡",
    title: "Real-Time Scoring",
    description:
      "Update scores instantly—standings sync in real-time across all devices. Powered by Convex.",
  },
  {
    icon: "📊",
    title: "Live Leaderboards",
    description:
      "Dynamic leaderboards that update automatically. Track standings, stats, and tournament progress.",
  },
  {
    icon: "👥",
    title: "Team Profiles",
    description:
      "Manage teams and players with detailed profiles, historical stats, and performance analytics.",
  },
  {
    icon: "📱",
    title: "Mobile Ready",
    description:
      "Score matches from any device. Perfect for courtside scoring and field updates.",
  },
  {
    icon: "🔔",
    title: "Instant Alerts",
    description:
      "Real-time notifications on match results, upcoming games, and tournament milestones.",
  },
];

const stats = [
  { value: "10K+", label: "Tournaments" },
  { value: "50K+", label: "Matches" },
  { value: "100K+", label: "Users" },
  { value: "99.9%", label: "Uptime" },
];

export default function Home() {
  return (
    <div className={styles.page}>
      {/* Navigation */}
      <nav className={styles.nav}>
        <div className={styles.navLogo}>
          <span className={styles.navLogoIcon}>⚡</span>
          SCOREFORGE
        </div>
        <div className={styles.navLinks}>
          <a href="#features" className={styles.navLink}>
            Features
          </a>
          <a href="#stats" className={styles.navLink}>
            Stats
          </a>
          <a href="#get-started" className={styles.navCta}>
            Get Started
          </a>
        </div>
      </nav>

      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.heroEyebrow}>
            <span className={styles.heroEyebrowDot} />
            Live Tournament Platform
          </div>
          <h1 className={styles.heroTitle}>
            SCORE
            <span className={styles.heroTitleAccent}>FORGE</span>
          </h1>
          <p className={styles.heroSubtitle}>
            The definitive platform for managing sports tournaments and tracking
            scores in real-time. From local leagues to major competitions—forge
            your path to victory.
          </p>
          <div className={styles.heroCta}>
            <a href="#get-started" className={styles.btnPrimary}>
              Start Free →
            </a>
            <a href="#features" className={styles.btnSecondary}>
              Explore Features
            </a>
          </div>

          <div className={styles.heroStats}>
            {stats.map((stat) => (
              <div key={stat.label} className={styles.heroStat}>
                <span className={styles.heroStatValue}>{stat.value}</span>
                <span className={styles.heroStatLabel}>{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className={styles.features}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionLabel}>Features</span>
          <h2 className={styles.sectionTitle}>
            EVERYTHING YOU NEED TO RUN TOURNAMENTS
          </h2>
          <p className={styles.sectionSubtitle}>
            Powerful features designed for tournament organizers, coaches, and
            sports enthusiasts who demand the best.
          </p>
        </div>
        <div className={styles.featureGrid}>
          {features.map((feature) => (
            <div key={feature.title} className={styles.featureCard}>
              <div className={styles.featureIcon}>{feature.icon}</div>
              <h3 className={styles.featureTitle}>{feature.title}</h3>
              <p className={styles.featureDesc}>{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats Section */}
      <section id="stats" className={styles.stats}>
        <div className={styles.statsInner}>
          <div className={styles.statsHeader}>
            <span className={styles.sectionLabel}>By The Numbers</span>
            <h2 className={styles.sectionTitle}>TRUSTED WORLDWIDE</h2>
          </div>
          <div className={styles.statsGrid}>
            {stats.map((stat) => (
              <div key={stat.label} className={styles.statItem}>
                <div className={styles.statValue}>{stat.value}</div>
                <div className={styles.statLabel}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Auth Section */}
      <section id="get-started" className={styles.authSection}>
        <div className={styles.authContainer}>
          <div className={styles.authHeader}>
            <h2 className={styles.authTitle}>JOIN THE GAME</h2>
            <p className={styles.authSubtitle}>
              Create your free account and start managing tournaments today.
            </p>
          </div>
          <AuthScreen />
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerLogo}>SCOREFORGE</div>
          <p className={styles.footerText}>Built for the love of sports</p>
          <div className={styles.footerLinks}>
            <a href="#features" className={styles.footerLink}>
              Features
            </a>
            <a href="#stats" className={styles.footerLink}>
              Stats
            </a>
            <a href="#get-started" className={styles.footerLink}>
              Sign Up
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
