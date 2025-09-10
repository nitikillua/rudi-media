import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { motion, useInView, useMotionValue, useSpring, useTransform } from 'framer-motion';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Counter Animation Component
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

// Animation variants
const fadeInUp = {
  hidden: { 
    opacity: 0, 
    y: 60,
    transition: { duration: 0.6 }
  },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { 
      duration: 0.6,
      ease: "easeOut"
    }
  }
};

const stagger = {
  visible: {
    transition: {
      staggerChildren: 0.2
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

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  const handleMenuClick = (e) => {
    // Close menu when clicking on a link in mobile view
    if (window.innerWidth <= 768) {
      closeMenu();
    }
  };

  return (
    <nav className="navigation">
      <div className="nav-container">
        <Link to="/" className="logo">
          <img 
            src="https://customer-assets.emergentagent.com/job_87b36088-4f8b-4f3a-a10a-49faeb5d7cca/artifacts/17d24le9_ohne%20hintergrund%20das%20gute%20Kopie.png" 
            alt="Rudi-Media Logo" 
            className="logo-img"
          />
        </Link>
        
        <div className={`nav-menu ${isMenuOpen ? 'active' : ''}`}>
          <Link to="/" className="nav-link" onClick={handleMenuClick}>Home</Link>
          <a href="/#services" className="nav-link" onClick={handleMenuClick}>Leistungen</a>
          <a href="/#about" className="nav-link" onClick={handleMenuClick}>Über uns</a>
          <Link to="/blog" className="nav-link" onClick={handleMenuClick}>Blog</Link>
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
                src="https://images.unsplash.com/photo-1560250097-0b93528c311a?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzR8MHwxfHNlYXJjaHw0fHxidXNpbmVzcyUyMHByb2Zlc3Npb25hbHxlbnwwfHx8fDE3NTc1NDc2NTB8MA&ixlib=rb-4.1.0&q=85" 
                alt="Professionelle Beratung bei Rudi-Media"
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
      const response = await fetch(`${API}/contact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (response.ok) {
        setSubmitStatus({
          type: 'success',
          message: result.message
        });
        setFormData({ name: '', email: '', phone: '', message: '' });
      } else {
        throw new Error(result.detail || 'Fehler beim Senden');
      }
    } catch (error) {
      setSubmitStatus({
        type: 'error',
        message: 'Es ist ein Fehler aufgetreten. Bitte versuchen Sie es später erneut.'
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
              <div className="contact-icon">📍</div>
              <div>
                <h4>Adresse</h4>
                <p>Kampenwandstr. 2<br />85586 Poing</p>
              </div>
            </div>
            
            <div className="contact-item">
              <div className="contact-icon">📞</div>
              <div>
                <h4>Telefon</h4>
                <p>+49 1522 2539425</p>
              </div>
            </div>
            
            <div className="contact-item">
              <div className="contact-icon">✉️</div>
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

// Blog Components
const BlogList = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const response = await fetch(`${API}/blog/posts`);
        const data = await response.json();
        setPosts(data);
      } catch (error) {
        console.error('Error fetching blog posts:', error);
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

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const response = await fetch(`${API}/blog/posts/slug/${slug}`);
        if (response.ok) {
          const data = await response.json();
          setPost(data);
        } else {
          setError('Blog-Beitrag nicht gefunden');
        }
      } catch (error) {
        console.error('Error fetching blog post:', error);
        setError('Fehler beim Laden des Beitrags');
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
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/blog" element={<BlogList />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;