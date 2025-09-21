import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { motion, useInView, useMotionValue, useSpring, useTransform } from 'framer-motion';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// ScrollToTop component - fixed to ignore anchor links
const ScrollToTop = () => {
  const location = window.location;
  
  useEffect(() => {
    // Only scroll to top if it's NOT an anchor link (hash)
    if (!location.hash) {
      window.scrollTo(0, 0);
    }
  }, [location.pathname, location.hash]);

  return null;
};

// Custom hook for scroll to top
const useScrollToTop = () => {
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };
  return scrollToTop;
};
const CounterAnimation = ({ target, duration = 2 }) => {
  const [count, setCount] = useState(0);
  const ref = useRef();
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (isInView) {
      let startTime;
      const animate = (timestamp) => {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);
        
        const easeOutCubic = 1 - Math.pow(1 - progress, 3);
        setCount(Math.floor(easeOutCubic * target));
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setCount(target);
        }
      };
      requestAnimationFrame(animate);
    }
  }, [isInView, target, duration]);

  return (
    <span ref={ref}>
      {count}{target < 100 ? '+' : ''}
    </span>
  );
};

// Animation variants - Mobile optimized
const fadeInUp = {
  hidden: { 
    opacity: 0, 
    y: 30, // Reduced from 60 for smoother mobile performance
    transition: { duration: 0.4 } // Reduced duration
  },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { 
      duration: 0.4, // Reduced duration
      ease: "easeOut"
    }
  }
};

const stagger = {
  visible: {
    transition: {
      staggerChildren: 0.1 // Reduced from 0.2 for faster mobile loading
    }
  }
};
const CookieBanner = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [cookieSettings, setCookieSettings] = useState({
    necessary: true,
    analytics: false,
    marketing: false
  });

  useEffect(() => {
    // Check if user has already made a choice
    const cookieConsent = localStorage.getItem('cookieConsent');
    if (!cookieConsent) {
      setShowBanner(true);
    }
  }, []);

  const acceptAllCookies = () => {
    setCookieSettings({
      necessary: true,
      analytics: true,
      marketing: true
    });
    localStorage.setItem('cookieConsent', JSON.stringify({
      necessary: true,
      analytics: true,
      marketing: true,
      timestamp: new Date().toISOString()
    }));
    setShowBanner(false);
  };

  const acceptSelectedCookies = () => {
    localStorage.setItem('cookieConsent', JSON.stringify({
      ...cookieSettings,
      timestamp: new Date().toISOString()
    }));
    setShowBanner(false);
    setShowSettings(false);
  };

  const rejectAllCookies = () => {
    setCookieSettings({
      necessary: true,
      analytics: false,
      marketing: false
    });
    localStorage.setItem('cookieConsent', JSON.stringify({
      necessary: true,
      analytics: false,
      marketing: false,
      timestamp: new Date().toISOString()
    }));
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="cookie-banner">
      <div className="cookie-content">
        {!showSettings ? (
          <>
            <div className="cookie-text">
              <h3>🍪 Cookie-Einstellungen</h3>
              <p>
                Wir verwenden Cookies, um Ihnen die bestmögliche Nutzererfahrung auf unserer Website zu bieten. 
                Dazu gehören essenzielle Cookies für den Betrieb der Seite sowie optionale Cookies für Analytics und Marketing.
              </p>
            </div>
            <div className="cookie-buttons">
              <button onClick={acceptAllCookies} className="cookie-btn primary">
                Alle akzeptieren
              </button>
              <button onClick={() => setShowSettings(true)} className="cookie-btn secondary">
                Auswählen
              </button>
              <button onClick={rejectAllCookies} className="cookie-btn reject">
                Alle ablehnen
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="cookie-settings">
              <h3>Cookie-Einstellungen anpassen</h3>
              
              <div className="cookie-category">
                <div className="cookie-category-header">
                  <label>
                    <input 
                      type="checkbox" 
                      checked={cookieSettings.necessary}
                      disabled={true}
                    />
                    <span>Notwendige Cookies</span>
                  </label>
                </div>
                <p>Diese Cookies sind für die Grundfunktionen der Website erforderlich und können nicht deaktiviert werden.</p>
              </div>

              <div className="cookie-category">
                <div className="cookie-category-header">
                  <label>
                    <input 
                      type="checkbox" 
                      checked={cookieSettings.analytics}
                      onChange={(e) => setCookieSettings(prev => ({...prev, analytics: e.target.checked}))}
                    />
                    <span>Analytische Cookies</span>
                  </label>
                </div>
                <p>Diese Cookies helfen uns zu verstehen, wie Besucher mit unserer Website interagieren, um sie zu verbessern.</p>
              </div>

              <div className="cookie-category">
                <div className="cookie-category-header">
                  <label>
                    <input 
                      type="checkbox" 
                      checked={cookieSettings.marketing}
                      onChange={(e) => setCookieSettings(prev => ({...prev, marketing: e.target.checked}))}
                    />
                    <span>Marketing Cookies</span>
                  </label>
                </div>
                <p>Diese Cookies werden verwendet, um Ihnen relevante Werbeinhalte zu zeigen.</p>
              </div>
            </div>
            
            <div className="cookie-buttons">
              <button onClick={acceptSelectedCookies} className="cookie-btn primary">
                Auswahl speichern
              </button>
              <button onClick={() => setShowSettings(false)} className="cookie-btn secondary">
                Zurück
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
const CustomCursor = () => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [followerPosition, setFollowerPosition] = useState({ x: 0, y: 0 });
  const [isActive, setIsActive] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if device is mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    // Don't show cursor on mobile
    if (isMobile) {
      return;
    }

    let animationFrameId;
    
    const updateMousePosition = (e) => {
      setPosition({ x: e.clientX, y: e.clientY });
    };

    const updateFollowerPosition = () => {
      setFollowerPosition(prev => ({
        x: prev.x + (position.x - prev.x) * 0.8,
        y: prev.y + (position.y - prev.y) * 0.8
      }));
      animationFrameId = requestAnimationFrame(updateFollowerPosition);
    };

    const handleMouseEnter = () => setIsActive(true);
    const handleMouseLeave = () => setIsActive(false);

    // Add event listeners
    window.addEventListener('mousemove', updateMousePosition);
    
    // Add hover effects for clickable elements
    const clickableElements = document.querySelectorAll('a, button, .btn-primary, .btn-secondary, .service-btn, .nav-link');
    clickableElements.forEach(el => {
      el.addEventListener('mouseenter', handleMouseEnter);
      el.addEventListener('mouseleave', handleMouseLeave);
    });

    // Start follower animation
    updateFollowerPosition();

    return () => {
      window.removeEventListener('mousemove', updateMousePosition);
      window.removeEventListener('resize', checkMobile);
      clickableElements.forEach(el => {
        el.removeEventListener('mouseenter', handleMouseEnter);
        el.removeEventListener('mouseleave', handleMouseLeave);
      });
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [position.x, position.y, isMobile]);

  // Don't render cursor on mobile
  if (isMobile) {
    return null;
  }

  return (
    <>
      <div 
        className="cursor"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`
        }}
      />
      <div 
        className={`cursor-follower ${isActive ? 'active' : ''}`}
        style={{
          left: `${followerPosition.x}px`,
          top: `${followerPosition.y}px`
        }}
      />
    </>
  );
};

// Components
const Navigation = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const scrollToTop = useScrollToTop();

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  const handleMenuClick = (e) => {
    // Close menu when clicking on a link in mobile view
    if (window.innerWidth <= 768) {
      closeMenu();
    }
    // Don't scroll to top for anchor links - let them work naturally
  };

  const handleLinkClick = () => {
    // Scroll to top immediately when clicking navigation links
    scrollToTop();
    closeMenu();
  };

  return (
    <nav className="navigation">
      <div className="nav-container">
        <Link to="/" className="logo" onClick={handleLinkClick}>
          <img 
            src="https://customer-assets.emergentagent.com/job_87b36088-4f8b-4f3a-a10a-49faeb5d7cca/artifacts/17d24le9_ohne%20hintergrund%20das%20gute%20Kopie.png" 
            alt="Rudi-Media Logo" 
            className="logo-img"
          />
        </Link>
        
        <div className={`nav-menu ${isMenuOpen ? 'active' : ''}`}>
          <Link to="/" className="nav-link" onClick={handleLinkClick}>Home</Link>
          <a href="/#services" className="nav-link" onClick={handleMenuClick}>Leistungen</a>
          <Link to="/about" className="nav-link" onClick={handleLinkClick}>Über uns</Link>
          <Link to="/blog" className="nav-link" onClick={handleLinkClick}>Blog</Link>
          <a href="/#contact" className="nav-link" onClick={handleMenuClick}>Kontakt</a>
        </div>
        
        <button 
          className="nav-toggle"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>
    </nav>
  );
};

const Hero = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <section id="home" className="hero">
      <div 
        className="hero-bg"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1508361727343-ca787442dcd7?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzR8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjB0ZWNobm9sb2d5fGVufDB8fHx8MTc1NzI4NzI5MHww&ixlib=rb-4.1.0&q=85')`,
          transform: `translate(${mousePosition.x * 0.02}px, ${mousePosition.y * 0.02}px)`
        }}
      />
      <div className="hero-overlay" />
      <div className="hero-content">
        <motion.div 
          className="hero-text"
          initial="hidden"
          animate="visible"
          variants={stagger}
        >
          <motion.h1 className="hero-title" variants={fadeInUp}>
            Ihr digitaler Erfolg beginnt hier
            <span className="gradient-text">mit Rudi-Media</span>
          </motion.h1>
          <motion.p className="hero-subtitle" variants={fadeInUp}>
            Professionelles Digital Marketing für mehr Sichtbarkeit, Kunden und Umsatz. 
            Von Social Media bis Google Ads – wir bringen Ihr Unternehmen online nach vorne.
          </motion.p>
          <motion.div className="hero-buttons" variants={fadeInUp}>
            <a href="#contact" className="btn-primary">
              Kostenlose Beratung
            </a>
            <a 
              href="https://wa.me/4915222539425?text=Hallo%20Rudi-Media,%20ich%20interessiere%20mich%20für%20Ihre%20Digital%20Marketing%20Leistungen."
              className="btn-secondary"
              target="_blank"
              rel="noopener noreferrer"
            >
              WhatsApp Chat
            </a>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

const WhyChooseUs = () => {
  const features = [
    {
      icon: "🎯",
      title: "Zielgerichtete Strategien",
      description: "Maßgeschneiderte Marketing-Lösungen, die auf Ihre spezifischen Unternehmensziele ausgerichtet sind."
    },
    {
      icon: "📈",
      title: "Messbare Erfolge",
      description: "Transparente Reporting-Systeme zeigen Ihnen genau, wie sich Ihr Investment in Marketing auszahlt."
    },
    {
      icon: "🤝",
      title: "Marketing aus einer Hand",
      description: "SEO-Agentur, Social-Media-Agentur etc. in Einem. Ein Ansprechpartner für alle Ihre Marketing-Bedürfnisse."
    },
    {
      icon: "👥",
      title: "Persönliche Betreuung",
      description: "Direkter Kontakt zu Ihrem Marketing-Experten – keine Warteschleifen, keine Anonymität."
    }
  ];

  return (
    <section id="about" className="why-choose-us">
      <div className="container">
        <motion.div 
          className="section-header"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeInUp}
        >
          <h2>Warum Rudi-Media?</h2>
          <p>Ihr Partner für nachhaltigen digitalen Erfolg</p>
        </motion.div>
        
        <motion.div 
          className="features-grid"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
        >
          {features.map((feature, index) => (
            <motion.div 
              key={index} 
              className="feature-card" 
              variants={fadeInUp}
            >
              <div className="feature-icon">{feature.icon}</div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>
        
        <div className="team-section">
          <motion.div 
            className="team-content"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={stagger}
          >
            <motion.div className="team-text" variants={fadeInUp}>
              <h3>Expertise, die sich auszahlt</h3>
              <p>
                Mit jahrelanger Erfahrung im digitalen Marketing und etlichen erfolgreichen 
                Projekten wissen wir genau, was funktioniert. Unser Fokus liegt auf messbaren 
                Ergebnissen und nachhaltigem Wachstum für Ihr Unternehmen.
              </p>
            </motion.div>
            <motion.div className="team-image" variants={fadeInUp}>
              <img 
                src="https://customer-assets.emergentagent.com/job_87b36088-4f8b-4f3a-a10a-49faeb5d7cca/artifacts/dhq0gyiw_schreibtisch.png" 
                alt="Authentischer Arbeitsplatz von Rudi-Media: Video-Editing, Analytics und Webdesign auf drei Monitoren"
              />
            </motion.div>
          </motion.div>
          
          <motion.div 
            className="trust-indicators"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={stagger}
          >
            <motion.div className="trust-item" variants={fadeInUp}>
              <h4><CounterAnimation target={50} /></h4>
              <p>Erfolgreiche Projekte</p>
            </motion.div>
            <motion.div className="trust-item" variants={fadeInUp}>
              <h4><CounterAnimation target={5} /></h4>
              <p>Jahre Erfahrung</p>
            </motion.div>
            <motion.div className="trust-item" variants={fadeInUp}>
              <h4><CounterAnimation target={100} />%</h4>
              <p>Kundenzufriedenheit</p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

const Services = () => {
  const services = [
    {
      title: "Social Media Marketing",
      description: "Professionelle Betreuung Ihrer Social Media Kanäle mit maßgeschneiderten Inhalten, die Ihre Zielgruppe begeistern und zu Kunden machen.",
      features: [
        "Content-Erstellung & Design",
        "vor Ort: Video & Fotaufnahmen",
        "virale Reels",
        "Analytics & Reporting"
      ],
      image: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1Nzl8MHwxfHNlYXJjaHwxfHxzb2NpYWwlMjBtZWRpYSUyMG1hcmtldGluZ3xlbnwwfHx8fDE3NTcyODczMTV8MA&ixlib=rb-4.1.0&q=85",
      icon: "📱"
    },
    {
      title: "Google & Meta Ads",
      description: "Maximieren Sie Ihren ROI mit professionell verwalteten Werbekampagnen auf Google, Facebook und Instagram.",
      features: [
        "Google Ads Management",
        "Facebook & Instagram Ads",
        "Keyword-Recherche & Optimierung",
        "Landing Page Optimierung",
        "Conversion Tracking"
      ],
      image: "https://images.unsplash.com/photo-1654277041042-8927699fcfd2?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1NzZ8MHwxfHNlYXJjaHwxfHxnb29nbGUlMjBhZHN8ZW58MHx8fHwxNzU3Mjg3MzIxfDA&ixlib=rb-4.1.0&q=85",
      icon: "🎯"
    },
    {
      title: "SEO & Webdesign",
      description: "Moderne, suchmaschinenoptimierte Websites, die nicht nur gut aussehen, sondern auch bei Google gefunden werden.",
      features: [
        "Responsive Webdesign",
        "Suchmaschinenoptimierung",
        "Performance Optimierung",
        "Content Management",
        "Local SEO"
      ],
      image: "https://images.pexels.com/photos/270637/pexels-photo-270637.jpeg",
      icon: "🌐"
    }
  ];

  return (
    <section id="services" className="services">
      <div className="container">
        <motion.div 
          className="section-header"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeInUp}
        >
          <h2>Unsere Leistungen</h2>
          <p>Ganzheitliche Digital Marketing Lösungen für Ihren Erfolg</p>
        </motion.div>
        
        <motion.div 
          className="services-grid"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
        >
          {services.map((service, index) => (
            <motion.div 
              key={index} 
              className="service-card" 
              variants={fadeInUp}
            >
              <div className="service-image">
                <img src={service.image} alt={service.title} />
                <div className="service-overlay">
                  <span className="service-icon">{service.icon}</span>
                </div>
              </div>
              
              <div className="service-content">
                <h3>{service.title}</h3>
                <p>{service.description}</p>
                
                <ul className="service-features">
                  {service.features.map((feature, idx) => (
                    <li key={idx}>{feature}</li>
                  ))}
                </ul>
                
                <a href="#contact" className="service-btn">
                  Mehr erfahren
                </a>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

const ContactForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      // Formspree submission with auto-reply
      const response = await fetch('https://formspree.io/f/xkgqwjkj', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          message: formData.message,
          _subject: `Neue Kontaktanfrage von ${formData.name} - Rudi-Media Website`,
          _replyto: formData.email,
          _autoresponse: `Hallo ${formData.name},

vielen Dank für Ihr Interesse an Rudi-Media und Ihre Kontaktaufnahme über unsere Website!

Wir haben Ihre Nachricht erhalten und werden uns schnellstmöglich bei Ihnen melden. In der Regel antworten wir innerhalb von 24 Stunden.

Ihre Nachricht:
"${formData.message}"

In der Zwischenzeit können Sie uns auch gerne direkt über WhatsApp kontaktieren:
📱 +49 1522 2539425

Oder besuchen Sie unseren Blog für weitere Informationen über Digital Marketing:
🌐 https://rudi-media.de/blog

Mit freundlichen Grüßen
Arjanit Rudi
Rudi-Media

---
Kampenwandstr. 2
85586 Poing
Tel: +49 1522 2539425
E-Mail: info@rudi-media.de
Web: rudi-media.de`
        })
      });

      if (response.ok) {
        setSubmitStatus({
          type: 'success',
          message: 'Vielen Dank für Ihre Nachricht! Wir melden uns schnellstmöglich bei Ihnen.'
        });
        setFormData({ name: '', email: '', phone: '', message: '' });
      } else {
        throw new Error('Fehler beim Senden');
      }
    } catch (error) {
      setSubmitStatus({
        type: 'error',
        message: 'Es ist ein Fehler aufgetreten. Bitte versuchen Sie es später erneut oder kontaktieren Sie uns direkt.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <section id="contact" className="contact">
      <div className="container">
        <motion.div 
          className="section-header"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeInUp}
        >
          <h2>Kontakt aufnehmen</h2>
          <p>Bereit für Ihren digitalen Durchbruch? Lassen Sie uns sprechen!</p>
        </motion.div>
        
        <motion.div 
          className="contact-content"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
        >
          <motion.div className="contact-info" variants={fadeInUp}>
            <div className="contact-item">
              <a 
                href="tel:+4915222539425"
                className="contact-icon-link"
              >
                <div className="contact-icon">📞</div>
              </a>
              <div>
                <h4>Telefon</h4>
                <p>+49 1522 2539425</p>
              </div>
            </div>
            
            <div className="contact-item">
              <a 
                href="mailto:info@rudi-media.de?subject=Anfrage%20über%20Website&body=Hallo%20Rudi-Media,%0D%0A%0D%0Aich%20interessiere%20mich%20für%20Ihre%20Digital%20Marketing%20Leistungen.%0D%0A%0D%0ABitte%20kontaktieren%20Sie%20mich%20für%20ein%20unverbindliches%20Beratungsgespräch.%0D%0A%0D%0AMit%20freundlichen%20Grüßen"
                className="contact-icon-link"
              >
                <div className="contact-icon">✉️</div>
              </a>
              <div>
                <h4>E-Mail</h4>
                <p>info@rudi-media.de</p>
              </div>
            </div>
            
            <div className="whatsapp-cta">
              <h4>Direkter Kontakt über WhatsApp</h4>
              <a 
                href="https://wa.me/4915222539425?text=Hallo%20Rudi-Media,%20ich%20möchte%20mehr%20über%20Ihre%20Digital%20Marketing%20Leistungen%20erfahren."
                className="whatsapp-btn"
                target="_blank"
                rel="noopener noreferrer"
              >
                Jetzt auf WhatsApp kontaktieren
              </a>
            </div>
          </motion.div>
          
          <motion.form className="contact-form" onSubmit={handleSubmit} variants={fadeInUp}>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="name">Name *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  disabled={isSubmitting}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="email">E-Mail *</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  disabled={isSubmitting}
                />
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="phone">Telefon</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                disabled={isSubmitting}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="message">Nachricht *</label>
              <textarea
                id="message"
                name="message"
                rows="5"
                value={formData.message}
                onChange={handleChange}
                required
                disabled={isSubmitting}
                placeholder="Erzählen Sie uns von Ihrem Projekt..."
              ></textarea>
            </div>
            
            <div className="form-privacy">
              <input type="checkbox" id="privacy" required />
              <label htmlFor="privacy">
                Ich stimme der Verarbeitung meiner Daten gemäß der 
                <a href="#impressum"> Datenschutzerklärung</a> zu. *
              </label>
            </div>
            
            <button 
              type="submit" 
              className="submit-btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Wird gesendet...' : 'Nachricht senden'}
            </button>
            
            {submitStatus && (
              <div className={`status-message ${submitStatus.type}`}>
                {submitStatus.message}
              </div>
            )}
          </motion.form>
        </motion.div>
      </div>
    </section>
  );
};

const Footer = () => {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-section">
            <img 
              src="https://customer-assets.emergentagent.com/job_87b36088-4f8b-4f3a-a10a-49faeb5d7cca/artifacts/17d24le9_ohne%20hintergrund%20das%20gute%20Kopie.png" 
              alt="Rudi-Media Logo" 
              className="footer-logo"
            />
            <p>Ihr Partner für professionelles Digital Marketing und nachhaltigen Online-Erfolg.</p>
          </div>
          
          <div className="footer-section">
            <h4>Kontakt</h4>
            <p>Kampenwandstr. 2<br />85586 Poing</p>
            <p>Tel: +49 1522 2539425</p>
            <p>info@rudi-media.de</p>
          </div>
          
          <div className="footer-section">
            <h4>Leistungen</h4>
            <ul>
              <li><a href="#services">Social Media Marketing</a></li>
              <li><a href="#services">Google & Meta Ads</a></li>
              <li><a href="#services">SEO & Webdesign</a></li>
            </ul>
          </div>
          
          <div className="footer-section">
            <h4>Social Media</h4>
            <div className="social-links">
              <a href="https://instagram.com/rudimedia.de" target="_blank" rel="noopener noreferrer">
                Instagram
              </a>
            </div>
          </div>
        </div>
        
        <div className="footer-bottom" id="impressum">
          <div className="impressum">
            <h4>Impressum</h4>
            <p>
              <strong>Rudi-Media</strong><br />
              Inhaber: Arjanit Rudi<br />
              Kampenwandstr. 2<br />
              85586 Poing<br />
              Telefon: +49 1522 2539425
            </p>
          </div>
          
          <div className="copyright">
            <p>&copy; 2025 Rudi-Media. Alle Rechte vorbehalten.</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

// About Page Component
const AboutPage = () => {
  const features = [
    {
      icon: "🎯",
      title: "Zielgerichtete Strategien",
      description: "Maßgeschneiderte Marketing-Lösungen, die auf Ihre spezifischen Unternehmensziele ausgerichtet sind."
    },
    {
      icon: "📈",
      title: "Messbare Erfolge", 
      description: "Transparente Reporting-Systeme zeigen Ihnen genau, wie sich Ihr Investment in Marketing auszahlt."
    },
    {
      icon: "🤝",
      title: "Marketing aus einer Hand",
      description: "SEO-Agentur, Social-Media-Agentur etc. in Einem. Ein Ansprechpartner für alle Ihre Marketing-Bedürfnisse."
    },
    {
      icon: "👥",
      title: "Persönliche Betreuung",
      description: "Direkter Kontakt zu Ihrem Marketing-Experten – keine Warteschleifen, keine Anonymität."
    }
  ];

  return (
    <div className="about-page">
      <Navigation />
      
      <section className="about-hero">
        <div className="container">
          <motion.div 
            className="about-hero-content"
            initial="hidden"
            animate="visible"
            variants={fadeInUp}
          >
            <h1>Über Rudi-Media</h1>
            <p>Ihr Partner für professionelles Digital Marketing</p>
          </motion.div>
        </div>
      </section>

      <section className="about-story">
        <div className="container">
          <motion.div 
            className="story-content"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={stagger}
          >
            <motion.div className="story-text" variants={fadeInUp}>
              <h2>Meine Geschichte</h2>
              <p>
                Als Digital Marketing Experte mit über 5 Jahren Erfahrung habe ich Rudi-Media mit einer klaren Vision gegründet: 
                Unternehmen dabei zu helfen, ihre digitalen Ziele zu erreichen und nachhaltiges Wachstum zu generieren.
              </p>
              <p>
                Mein Name ist Arjanit Rudi, und ich brenne für innovatives Online-Marketing. Von Social Media Strategien über 
                professionelle Google Ads Kampagnen bis hin zu suchmaschinenoptimiertem Webdesign – ich biete alles aus einer Hand.
              </p>
              <p>
                Was mich besonders auszeichnet, ist mein persönlicher Ansatz. Jeder Kunde erhält eine maßgeschneiderte Strategie, 
                die perfekt zu seinen Zielen und seinem Budget passt. Keine Standard-Lösungen, sondern echte, messbare Ergebnisse.
              </p>
            </motion.div>
            
            <motion.div className="story-image" variants={fadeInUp}>
              <img 
                src="https://customer-assets.emergentagent.com/job_87b36088-4f8b-4f3a-a10a-49faeb5d7cca/artifacts/dhq0gyiw_schreibtisch.png" 
                alt="Arjanit Rudi bei der Arbeit - Rudi-Media Workspace"
              />
            </motion.div>
          </motion.div>
        </div>
      </section>
      
      <section className="about-values">
        <div className="container">
          <motion.div 
            className="section-header"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeInUp}
          >
            <h2>Warum Rudi-Media?</h2>
            <p>Meine Werte und Ihr Vorteil</p>
          </motion.div>
          
          <motion.div 
            className="features-grid"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={stagger}
          >
            {features.map((feature, index) => (
              <motion.div 
                key={index} 
                className="feature-card" 
                variants={fadeInUp}
              >
                <div className="feature-icon">{feature.icon}</div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="about-numbers">
        <div className="container">
          <motion.div 
            className="section-header"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeInUp}
          >
            <h2>Fakten sprechen für sich</h2>
            <p>Meine Erfolge in Zahlen</p>
          </motion.div>
          
          <motion.div 
            className="trust-indicators"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={stagger}
          >
            <motion.div className="trust-item" variants={fadeInUp}>
              <h4><CounterAnimation target={50} /></h4>
              <p>Erfolgreiche Projekte</p>
            </motion.div>
            <motion.div className="trust-item" variants={fadeInUp}>
              <h4><CounterAnimation target={5} /></h4>
              <p>Jahre Erfahrung</p>
            </motion.div>
            <motion.div className="trust-item" variants={fadeInUp}>
              <h4><CounterAnimation target={100} />%</h4>
              <p>Kundenzufriedenheit</p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <section className="about-cta">
        <div className="container">
          <motion.div 
            className="cta-content"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeInUp}
          >
            <h2>Bereit für Ihren digitalen Erfolg?</h2>
            <p>Lassen Sie uns gemeinsam Ihre Online-Präsenz auf das nächste Level bringen!</p>
            <div className="cta-buttons">
              <Link to="/#contact" className="btn-primary">
                Kostenlose Beratung
              </Link>
              <a 
                href="https://wa.me/4915222539425?text=Hallo%20Rudi-Media,%20ich%20möchte%20mehr%20über%20Sie%20und%20Ihre%20Digital%20Marketing%20Leistungen%20erfahren."
                className="btn-secondary"
                target="_blank"
                rel="noopener noreferrer"
              >
                WhatsApp Chat
              </a>
            </div>
          </motion.div>
        </div>
      </section>
      
      <Footer />
    </div>
  );
};
const BlogList = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fallback static blog posts if backend is not available
  const staticPosts = [
    {
      id: "1",
      title: "Warum Social Media Marketing für Ihr Unternehmen unverzichtbar ist",
      excerpt: "Entdecken Sie, warum Social Media Marketing für Ihr Unternehmen unverzichtbar ist und wie es Ihnen helfen kann, Ihre Ziele zu erreichen.",
      author: "Arjanit Rudi",
      created_at: new Date().toISOString(),
      tags: ["Social Media", "Marketing", "Digital Marketing"],
      slug: "warum-social-media-marketing-unverzichtbar-ist"
    },
    {
      id: "2", 
      title: "Google Ads vs. Meta Ads: Welche Plattform ist die richtige für Sie?",
      excerpt: "Google Ads oder Meta Ads? Erfahren Sie, welche Plattform für Ihre Marketingziele am besten geeignet ist.",
      author: "Arjanit Rudi",
      created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      tags: ["Google Ads", "Meta Ads", "Online Werbung", "PPC"],
      slug: "google-ads-vs-meta-ads-vergleich"
    },
    {
      id: "3",
      title: "SEO-Trends 2025: Was Sie jetzt wissen müssen", 
      excerpt: "Entdecken Sie die wichtigsten SEO-Trends für 2025 und erfahren Sie, wie Sie Ihre Website für die Zukunft optimieren.",
      author: "Arjanit Rudi",
      created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      tags: ["SEO", "Google", "Website Optimierung", "Trends 2025"],
      slug: "seo-trends-2025"
    },
    {
      id: "4",
      title: "Die ultimative Social Media Content-Strategie für 2025",
      excerpt: "Lernen Sie, wie Sie eine Social Media Content-Strategie entwickeln, die Engagement generiert und echte Geschäftsergebnisse liefert.",
      author: "Arjanit Rudi",
      created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      tags: ["Social Media", "Content Marketing", "Strategie"],
      slug: "social-media-content-strategie-2025"
    },
    {
      id: "5",
      title: "Google Ads Optimierung: 7 Strategien für maximalen ROI",
      excerpt: "Maximieren Sie Ihren Google Ads ROI mit diesen 7 bewährten Optimierungsstrategien von unseren PPC-Experten.",
      author: "Arjanit Rudi",
      created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      tags: ["Google Ads", "PPC", "Online Marketing", "ROI Optimierung"],
      slug: "google-ads-optimierung-strategien"
    },
    {
      id: "6",
      title: "Local SEO: Wie Sie in lokalen Suchergebnissen dominieren",
      excerpt: "Dominieren Sie die lokalen Suchergebnisse mit unserer umfassenden Local SEO Anleitung für mehr Sichtbarkeit und Kunden.",
      author: "Arjanit Rudi",
      created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
      tags: ["Local SEO", "Google My Business", "Lokale Suche", "SEO"],
      slug: "local-seo-strategien-lokale-suche"
    }
  ];

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const response = await fetch(`${API}/blog/posts`);
        if (response.ok) {
          const data = await response.json();
          setPosts(data);
        } else {
          // Fallback to static posts if backend is not available
          console.log("Backend not available, using static posts");
          setPosts(staticPosts);
        }
      } catch (error) {
        console.error('Error fetching blog posts, using static posts:', error);
        setPosts(staticPosts);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  if (loading) {
    return (
      <div className="blog-loading">
        <div className="loading-spinner"></div>
        <p>Blog-Beiträge werden geladen...</p>
      </div>
    );
  }

  return (
    <div className="blog-page">
      <Navigation />
      
      <section className="blog-hero">
        <div className="container">
          <h1>Rudi-Media Blog</h1>
          <p>Insights, Tipps und Trends aus der Welt des Digital Marketing</p>
        </div>
      </section>
      
      <section className="blog-posts">
        <div className="container">
          <div className="posts-grid">
            {posts.map(post => (
              <article key={post.id} className="post-card">
                <div className="post-header">
                  <h2>
                    <Link to={`/blog/${post.slug}`}>{post.title}</Link>
                  </h2>
                  <div className="post-meta">
                    <span className="post-author">Von {post.author}</span>
                    <span className="post-date">
                      {new Date(post.created_at).toLocaleDateString('de-DE')}
                    </span>
                  </div>
                </div>
                
                <div className="post-excerpt">
                  <p>{post.excerpt}</p>
                </div>
                
                <div className="post-footer">
                  <div className="post-tags">
                    {post.tags.map(tag => (
                      <span key={tag} className="tag">{tag}</span>
                    ))}
                  </div>
                  <Link to={`/blog/${post.slug}`} className="read-more">
                    Weiterlesen →
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
      
      <Footer />
    </div>
  );
};

const BlogPost = () => {
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Get slug from URL
  const slug = window.location.pathname.split('/').pop();

  // Static blog posts with full content
  const staticPosts = {
    "warum-social-media-marketing-unverzichtbar-ist": {
      id: "1",
      title: "Warum Social Media Marketing für Ihr Unternehmen unverzichtbar ist",
      content: `
        <p>In der heutigen digitalen Welt ist Social Media Marketing nicht mehr nur eine Option – es ist eine Notwendigkeit für jedes Unternehmen, das erfolgreich sein möchte.</p>
        
        <h3>Die Macht der sozialen Medien</h3>
        <p>Mit über 4,8 Milliarden aktiven Social Media Nutzern weltweit bieten Plattformen wie Facebook, Instagram, LinkedIn und TikTok eine unglaubliche Reichweite für Ihr Unternehmen.</p>
        
        <h3>Vorteile von professionellem Social Media Marketing:</h3>
        <ul>
            <li><strong>Erhöhte Markenbekanntheit:</strong> Regelmäßige, hochwertige Inhalte steigern die Sichtbarkeit Ihrer Marke</li>
            <li><strong>Direkter Kundenkontakt:</strong> Interaktion und Engagement mit Ihrer Zielgruppe in Echtzeit</li>
            <li><strong>Kostengünstige Werbung:</strong> Gezieltes Targeting zu einem Bruchteil traditioneller Werbekosten</li>
            <li><strong>Messbare Ergebnisse:</strong> Detaillierte Analytics für kontinuierliche Optimierung</li>
        </ul>
        
        <p>Bei Rudi-Media entwickeln wir maßgeschneiderte Social Media Strategien, die Ihre Unternehmensziele unterstützen und messbare Ergebnisse liefern.</p>
      `,
      excerpt: "Entdecken Sie, warum Social Media Marketing für Ihr Unternehmen unverzichtbar ist und wie es Ihnen helfen kann, Ihre Ziele zu erreichen.",
      author: "Arjanit Rudi",
      created_at: new Date().toISOString(),
      tags: ["Social Media", "Marketing", "Digital Marketing"],
      slug: "warum-social-media-marketing-unverzichtbar-ist"
    },
    "google-ads-vs-meta-ads-vergleich": {
      id: "2",
      title: "Google Ads vs. Meta Ads: Welche Plattform ist die richtige für Sie?",
      content: `
        <p>Die Wahl zwischen Google Ads und Meta Ads (Facebook/Instagram) ist eine der häufigsten Fragen unserer Kunden. Beide Plattformen haben ihre Stärken – die richtige Wahl hängt von Ihren spezifischen Zielen ab.</p>
        
        <h3>Google Ads – Der Klassiker für gezielte Suche</h3>
        <p><strong>Vorteile:</strong></p>
        <ul>
            <li>Nutzer suchen aktiv nach Ihren Produkten/Dienstleistungen</li>
            <li>Hohe Kaufbereitschaft der Zielgruppe</li>
            <li>Vielfältige Anzeigenformate (Text, Shopping, Display)</li>
            <li>Lokale Ausrichtung möglich</li>
        </ul>
        
        <h3>Meta Ads – Emotionale Ansprache und Reichweite</h3>
        <p><strong>Vorteile:</strong></p>
        <ul>
            <li>Detailliertes Targeting nach Interessen und Verhalten</li>
            <li>Visuelle, ansprechende Anzeigenformate</li>
            <li>Große Reichweite, besonders bei jüngeren Zielgruppen</li>
            <li>Günstigere Kosten pro Klick</li>
        </ul>
        
        <h3>Unsere Empfehlung: Eine kombinierte Strategie</h3>
        <p>Die besten Ergebnisse erzielen unsere Kunden mit einer durchdachten Kombination beider Plattformen:</p>
        <ul>
            <li><strong>Google Ads</strong> für die Erfassung von Suchintentionen</li>
            <li><strong>Meta Ads</strong> für Markenbekanntheit und Retargeting</li>
        </ul>
        
        <p>Wir analysieren Ihre Zielgruppe und entwickeln die optimale Strategie für Ihr Unternehmen.</p>
      `,
      excerpt: "Google Ads oder Meta Ads? Erfahren Sie, welche Plattform für Ihre Marketingziele am besten geeignet ist.",
      author: "Arjanit Rudi",
      created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      tags: ["Google Ads", "Meta Ads", "Online Werbung", "PPC"],
      slug: "google-ads-vs-meta-ads-vergleich"
    },
    "seo-trends-2025": {
      id: "3",
      title: "SEO-Trends 2025: Was Sie jetzt wissen müssen",
      content: `
        <p>Suchmaschinenoptimierung entwickelt sich ständig weiter. Hier sind die wichtigsten SEO-Trends für 2025, die Ihre Website-Strategie beeinflussen werden.</p>
        
        <h3>1. KI-gestützte Inhalte und E-A-T</h3>
        <p>Google legt zunehmend Wert auf Expertise, Autorität und Vertrauenswürdigkeit (E-A-T). Hochwertige, von Experten erstellte Inhalte werden noch wichtiger.</p>
        
        <h3>2. Core Web Vitals und Page Experience</h3>
        <p>Die Ladegeschwindigkeit und Nutzerfreundlichkeit Ihrer Website sind entscheidende Ranking-Faktoren:</p>
        <ul>
            <li>Largest Contentful Paint (LCP) unter 2,5 Sekunden</li>
            <li>First Input Delay (FID) unter 100 Millisekunden</li>
            <li>Cumulative Layout Shift (CLS) unter 0,1</li>
        </ul>
        
        <h3>3. Lokale SEO wird wichtiger</h3>
        <p>Für lokale Unternehmen ist die Optimierung für "Near Me"-Suchen entscheidend:</p>
        <ul>
            <li>Google My Business Profil pflegen</li>
            <li>Lokale Keywords verwenden</li>
            <li>Positive Bewertungen sammeln</li>
        </ul>
        
        <h3>4. Voice Search Optimierung</h3>
        <p>Mit der zunehmenden Nutzung von Sprachassistenten wird die Optimierung für gesprochene Suchanfragen immer wichtiger.</p>
        
        <h3>Unser SEO-Ansatz bei Rudi-Media</h3>
        <p>Wir kombinieren technische SEO-Expertise mit hochwertiger Content-Strategie, um nachhaltige Ergebnisse zu erzielen. Von der On-Page-Optimierung bis zur Local-SEO-Betreuung – wir sorgen dafür, dass Ihre Website bei Google gefunden wird.</p>
      `,
      excerpt: "Entdecken Sie die wichtigsten SEO-Trends für 2025 und erfahren Sie, wie Sie Ihre Website für die Zukunft optimieren.",
      author: "Arjanit Rudi",
      created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      tags: ["SEO", "Google", "Website Optimierung", "Trends 2025"],
      slug: "seo-trends-2025"
    }
  };

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const response = await fetch(`${API}/blog/posts/slug/${slug}`);
        if (response.ok) {
          const data = await response.json();
          setPost(data);
        } else {
          // Fallback to static post if backend is not available
          console.log("Backend not available, using static post");
          const staticPost = staticPosts[slug];
          if (staticPost) {
            setPost(staticPost);
          } else {
            setError('Blog-Beitrag nicht gefunden');
          }
        }
      } catch (error) {
        console.error('Error fetching blog post, using static post:', error);
        const staticPost = staticPosts[slug];
        if (staticPost) {
          setPost(staticPost);
        } else {
          setError('Blog-Beitrag nicht gefunden');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [slug]);

  if (loading) {
    return (
      <div className="blog-loading">
        <div className="loading-spinner"></div>
        <p>Blog-Beitrag wird geladen...</p>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="blog-error">
        <Navigation />
        <div className="container">
          <h1>Fehler</h1>
          <p>{error || 'Blog-Beitrag nicht gefunden'}</p>
          <Link to="/blog" className="btn-primary">Zurück zum Blog</Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="blog-post-page">
      <Navigation />
      
      <article className="blog-post">
        <div className="container">
          <header className="post-header">
            <nav className="breadcrumb">
              <Link to="/">Home</Link> → 
              <Link to="/blog">Blog</Link> → 
              <span>{post.title}</span>
            </nav>
            
            <h1>{post.title}</h1>
            
            <div className="post-meta">
              <span className="post-author">Von {post.author}</span>
              <span className="post-date">
                {new Date(post.created_at).toLocaleDateString('de-DE')}
              </span>
            </div>
            
            <div className="post-tags">
              {post.tags.map(tag => (
                <span key={tag} className="tag">{tag}</span>
              ))}
            </div>
          </header>
          
          <div className="post-content">
            <div dangerouslySetInnerHTML={{ __html: post.content }} />
          </div>
          
          <footer className="post-footer">
            <div className="cta-section">
              <h3>Haben Sie Fragen zu diesem Thema?</h3>
              <p>Kontaktieren Sie uns für eine kostenlose Beratung!</p>
              <div className="cta-buttons">
                <a href="#contact" className="btn-primary">Kostenlose Beratung</a>
                <a 
                  href="https://wa.me/4915222539425?text=Hallo%20Rudi-Media,%20ich%20habe%20Ihren%20Blog-Artikel%20gelesen%20und%20hätte%20gerne%20mehr%20Informationen."
                  className="btn-secondary"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  WhatsApp Chat
                </a>
              </div>
            </div>
            
            <nav className="post-navigation">
              <Link to="/blog" className="back-to-blog">
                ← Zurück zum Blog
              </Link>
            </nav>
          </footer>
        </div>
      </article>
      
      <Footer />
    </div>
  );
};

// Main App Component
const Home = () => {
  useEffect(() => {
    // Smooth scrolling for anchor links
    const links = document.querySelectorAll('a[href^="#"]');
    links.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const target = document.querySelector(link.getAttribute('href'));
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });

    // Add scroll effects
    const handleScroll = () => {
      const nav = document.querySelector('.navigation');
      if (window.scrollY > 100) {
        nav?.classList.add('scrolled');
      } else {
        nav?.classList.remove('scrolled');
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="home-page">
      <Navigation />
      <Hero />
      <WhyChooseUs />
      <Services />
      <ContactForm />
      <Footer />
    </div>
  );
};

function App() {
  return (
    <div className="App">
      <CustomCursor />
      <CookieBanner />
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/blog" element={<BlogList />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;