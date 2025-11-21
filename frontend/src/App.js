import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';
import { motion, useInView, useMotionValue, useSpring, useTransform } from 'framer-motion';
import MDEditor from '@uiw/react-md-editor';
import ReactMarkdown from 'react-markdown';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Authentication Context
const AuthContext = createContext();

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in on app start
    const token = localStorage.getItem('admin_token');
    if (token) {
      fetch(`${API}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      .then(response => {
        if (response.ok) {
          return response.json();
        }
        throw new Error('Invalid token');
      })
      .then(userData => {
        setUser({ ...userData, token });
      })
      .catch(() => {
        localStorage.removeItem('admin_token');
      })
      .finally(() => {
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username, password) => {
    try {
      const response = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('admin_token', data.access_token);
        setUser({ username, token: data.access_token });
        return { success: true };
      } else {
        return { success: false, error: 'Invalid credentials' };
      }
    } catch (error) {
      return { success: false, error: 'Login failed' };
    }
  };

  const logout = () => {
    localStorage.removeItem('admin_token');
    setUser(null);
  };

  const value = {
    user,
    login,
    logout,
    loading
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

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
  const [isScrolled, setIsScrolled] = useState(false);
  const scrollToTop = useScrollToTop();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 60);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
    <nav className={`navigation-redesign ${isScrolled ? 'scrolled' : ''}`}>
      <div className="nav-container-redesign">
        <Link to="/" className="logo-redesign" onClick={handleLinkClick}>
          <img 
            src="https://customer-assets.emergentagent.com/job_87b36088-4f8b-4f3a-a10a-49faeb5d7cca/artifacts/17d24le9_ohne%20hintergrund%20das%20gute%20Kopie.png" 
            alt="Rudi-Media Logo" 
            className="logo-img-redesign"
          />
        </Link>
        
        <div className={`nav-menu-redesign ${isMenuOpen ? 'active' : ''}`}>
          <Link to="/" className="nav-link-redesign" onClick={handleLinkClick}>Home</Link>
          <a href="/#services" className="nav-link-redesign" onClick={handleMenuClick}>Leistungen</a>
          <Link to="/blog" className="nav-link-redesign" onClick={handleLinkClick}>Blog</Link>
          <Link to="/about" className="nav-link-redesign" onClick={handleLinkClick}>Über uns</Link>
          <a href="/#contact" className="nav-link-redesign" onClick={handleMenuClick}>Kontakt</a>
        </div>
        
        <div className="nav-actions-redesign">
          <a 
            href="tel:+4915222539425" 
            className="nav-phone-redesign"
            title="Anrufen: +49 1522 2539425"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22 16.92V19.92C22 20.52 21.52 21 20.92 21C9.4 21 0 11.6 0 0.08C0 -0.52 0.48 -1 1.08 -1H4.08C4.68 -1 5.16 -0.52 5.16 0.08V3.08" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="phone-number">+49 1522 2539425</span>
          </a>
          
          <a href="#contact" className="nav-cta-redesign" onClick={handleMenuClick}>
            Strategiegespräch
          </a>
        </div>
        
        <button 
          className="nav-toggle-redesign"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle navigation menu"
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
    <section id="home" className="hero-redesign">
      {/* Hero Background with subtle overlay */}
      <div className="hero-bg-redesign">
        <svg className="hero-shape" viewBox="0 0 1200 800" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="heroGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e53f9" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#3afaff" stopOpacity="0.12" />
            </linearGradient>
          </defs>
          <path d="M0,100 C200,200 400,50 600,150 C800,250 1000,100 1200,200 L1200,800 L0,800 Z" fill="url(#heroGradient)" />
        </svg>
      </div>
      
      <div className="container">
        <div className="hero-content-redesign">
          <motion.div 
            className="hero-text-redesign"
            initial="hidden"
            animate="visible"
            variants={stagger}
          >
            <motion.h1 className="hero-title-redesign" variants={fadeInUp}>
              Mehr Sichtbarkeit. Mehr Kunden. <span className="hero-highlight">Mehr Umsatz.</span>
            </motion.h1>
            <motion.h2 className="hero-subtitle-redesign" variants={fadeInUp}>
              Wir erstellen Social-First Content & Webdesign, das verkauft. Kostenlose Erstberatung.
            </motion.h2>
            <motion.div className="hero-buttons-redesign" variants={fadeInUp}>
              <a href="#contact" className="btn-primary-hero">
                Jetzt Strategiegespräch
              </a>
              <a href="#services" className="btn-secondary-hero">
                Leistungen ansehen
              </a>
            </motion.div>
            
            {/* Trust indicators */}
            <motion.div className="hero-trust" variants={fadeInUp}>
              <div className="trust-item">
                <span className="trust-number">50+</span>
                <span className="trust-label">Erfolgreiche Projekte</span>
              </div>
              <div className="trust-item">
                <span className="trust-number">5+</span>
                <span className="trust-label">Jahre Erfahrung</span>
              </div>
              <div className="trust-item">
                <span className="trust-number">100%</span>
                <span className="trust-label">Kundenzufriedenheit</span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

const WhyChooseUs = () => {
  return (
    <section className="why-choose-us-viral">
      <div className="container">
        <motion.div 
          className="why-content-viral"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeInUp}
        >
          <h2>
            Wir lassen 
            <span className="viral-highlight"> Marken wachsen</span>
            & verwandeln Reichweite in echte Kunden.
          </h2>
          
          <div className="why-benefits-viral">
            <div className="benefit-viral">
              <div className="benefit-number">01</div>
              <div className="benefit-content">
                <h3>Messbare Erfolge</h3>
                <p>Transparente Ergebnisse, die Ihren ROI maximieren</p>
              </div>
            </div>
            
            <div className="benefit-viral">
              <div className="benefit-number">02</div>
              <div className="benefit-content">
                <h3>Marketing aus einer Hand</h3>
                <p>Ein Ansprechpartner für alle Marketing-Bedürfnisse</p>
              </div>
            </div>
            
            <div className="benefit-viral">
              <div className="benefit-number">03</div>
              <div className="benefit-content">
                <h3>Persönliche Betreuung</h3>
                <p>Direkter Kontakt ohne Warteschleifen</p>
              </div>
            </div>
          </div>
          
          <div className="why-cta-viral">
            <a href="#contact" className="btn-primary-xl">
              Jetzt durchstarten
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

const Services = () => {
  const services = [
    {
      title: "Social Media Marketing",
      description: "Professionelle Betreuung Ihrer Social Media Kanäle mit viral-optimiertem Content, der verkauft.",
      icon: (
        <svg width="60" height="60" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
          <path d="M8 21L16 21" stroke="currentColor" strokeWidth="2"/>
          <path d="M12 17L12 21" stroke="currentColor" strokeWidth="2"/>
          <circle cx="7" cy="9" r="1" fill="currentColor"/>
          <circle cx="12" cy="9" r="1" fill="currentColor"/>
          <circle cx="17" cy="9" r="1" fill="currentColor"/>
          <path d="M6 13L8 11L11 14L16 9L18 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      benefits: ["Content-Erstellung & Design", "Virale Reels & Stories", "Community Management", "Analytics & ROI-Tracking"]
    },
    {
      title: "Google & Meta Ads",
      description: "ROI-optimierte Werbekampagnen, die messbare Ergebnisse liefern.",
      icon: (
        <svg width="60" height="60" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L13.09 8.26L22 9L17 14L18.18 21L12 17.77L5.82 21L7 14L2 9L8.91 8.26L12 2Z" fill="currentColor"/>
          <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="2" fill="none"/>
          <path d="M16 6C16.5523 6 17 6.44772 17 7V9C17 9.55228 16.5523 10 16 10H14C13.4477 10 13 9.55228 13 9V7C13 6.44772 13.4477 6 14 6H16Z" fill="currentColor"/>
          <text x="8" y="12" fontSize="3" fill="currentColor">G</text>
          <text x="16" y="12" fontSize="3" fill="currentColor">M</text>
        </svg>
      ),
      benefits: ["Google Ads Management", "Facebook & Instagram Ads", "Conversion Tracking", "Landing Page Optimierung"]
    },
    {
      title: "SEO & Webdesign",
      description: "Moderne Websites, die nicht nur gut aussehen, sondern auch bei Google gefunden werden.",
      icon: (
        <svg width="60" height="60" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
          <line x1="8" y1="21" x2="16" y2="21" stroke="currentColor" strokeWidth="2"/>
          <line x1="12" y1="17" x2="12" y2="21" stroke="currentColor" strokeWidth="2"/>
        </svg>
      ),
      benefits: ["Responsive Webdesign", "Suchmaschinenoptimierung", "Performance Optimierung", "Local SEO"]
    }
  ];

  return (
    <section id="services" className="services-redesign">
      <div className="container">
        <motion.div 
          className="section-header-redesign"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeInUp}
        >
          <h2>Unsere Leistungen</h2>
          <p>Social-First Marketing Lösungen, die verkaufen</p>
        </motion.div>
        
        <motion.div 
          className="services-grid-redesign"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
        >
          {services.map((service, index) => (
            <motion.div 
              key={index} 
              className="service-card-redesign" 
              variants={fadeInUp}
            >
              <div className="service-icon-redesign">
                {service.icon}
              </div>
              
              <div className="service-content-redesign">
                <h3>{service.title}</h3>
                <p>{service.description}</p>
                
                <ul className="service-benefits">
                  {service.benefits.map((benefit, idx) => (
                    <li key={idx}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      {benefit}
                    </li>
                  ))}
                </ul>
                
                <a href="#contact" className="service-cta">
                  Mehr erfahren
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M7 17L17 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M7 7H17V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </a>
              </div>
            </motion.div>
          ))}
        </motion.div>
        
        {/* CTA Section */}
        <motion.div 
          className="services-cta-section"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeInUp}
        >
          <h3>Bereit für mehr Erfolg?</h3>
          <p>Lassen Sie uns gemeinsam Ihre Digital Marketing Strategie entwickeln.</p>
          <a href="#contact" className="btn-primary-large">
            Jetzt Strategiegespräch buchen
          </a>
        </motion.div>
      </div>
    </section>
  );
};

// New Big Impact Section - Viral House Style
const BigImpactSection = () => {
  return (
    <section className="big-impact-section">
      <div className="container">
        <motion.div 
          className="big-impact-content"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeInUp}
        >
          <h2>
            Mit kreativer Strategie & 
            <span className="impact-highlight"> datengetriebenem Marketing </span>
            verwandeln wir Reichweite in echte Kunden.
          </h2>
          
          <div className="impact-stats">
            <div className="impact-stat">
              <div className="stat-number">320%</div>
              <div className="stat-label">Mehr Reichweite</div>
            </div>
            <div className="impact-stat">
              <div className="stat-number">150+</div>
              <div className="stat-label">Zufriedene Kunden</div>
            </div>
            <div className="impact-stat">
              <div className="stat-number">5M+</div>
              <div className="stat-label">Views generiert</div>
            </div>
          </div>
          
          <a href="#contact" className="btn-primary-xl">
            Kostenlose Beratung sichern
          </a>
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
          _subject: `Neue Kontaktanfrage von ${formData.name} - Rudi-Media Website`
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
    <section id="contact" className="contact-viral">
      <div className="container">
        <motion.div 
          className="contact-header-viral"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeInUp}
        >
          <h2>
            Bereit für 
            <span className="viral-highlight"> mehr Erfolg?</span>
          </h2>
          <p>Kostenlose Beratung sichern</p>
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
    <footer className="footer-viral">
      <div className="container">
        <div className="footer-main-viral">
          <div className="footer-brand-viral">
            <img 
              src="https://customer-assets.emergentagent.com/job_87b36088-4f8b-4f3a-a10a-49faeb5d7cca/artifacts/17d24le9_ohne%20hintergrund%20das%20gute%20Kopie.png" 
              alt="Rudi-Media Logo" 
              className="footer-logo-viral"
            />
            <div className="footer-brand-text">
              <h3>Rudi-Media</h3>
              <p>&copy; 2025</p>
            </div>
          </div>
          
          <div className="footer-contact-viral">
            <h4>Kontakt</h4>
            <div className="contact-details-viral">
              <p>Rudi-Media</p>
              <p>Kampenwandstr. 2</p>
              <p>85586 Poing</p>
              <p>+49 1522 2539425</p>
              <p>info@rudi-media.de</p>
            </div>
          </div>
          
          <div className="footer-links-viral">
            <h4>Service</h4>
            <ul>
              <li><a href="#services">Social Media Marketing</a></li>
              <li><a href="#services">Google & Meta Ads</a></li>
              <li><a href="#services">SEO & Webdesign</a></li>
              <li><a href="/blog">Blog</a></li>
            </ul>
          </div>
        </div>
        
        <div className="footer-bottom-viral" id="impressum">
          <div className="footer-legal">
            <a href="#impressum">Impressum</a>
            <a href="#datenschutz">Datenschutz</a>
            <a href="#agb">AGB</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

// Admin Components
const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState({ posts: 0, contacts: 0 });

  useEffect(() => {
    // Fetch dashboard stats
    const fetchStats = async () => {
      try {
        const postsResponse = await fetch(`${API}/admin/blog/posts`, {
          headers: {
            'Authorization': `Bearer ${user.token}`
          }
        });
        
        if (postsResponse.ok) {
          const posts = await postsResponse.json();
          setStats(prev => ({ ...prev, posts: posts.length }));
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      }
    };

    fetchStats();
  }, [user.token]);

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <h1>Admin Dashboard</h1>
        <div className="admin-user-info">
          <span>Welcome, {user.username}</span>
          <button onClick={logout} className="logout-btn">Logout</button>
        </div>
      </div>
      
      <div className="admin-stats">
        <div className="stat-card">
          <h3>Blog Posts</h3>
          <p className="stat-number">{stats.posts}</p>
        </div>
        <div className="stat-card">
          <h3>Contacts</h3>
          <p className="stat-number">{stats.contacts}</p>
        </div>
      </div>
      
      <div className="admin-quick-actions">
        <Link to="/admin/posts" className="admin-action-btn">
          Manage Blog Posts
        </Link>
        <Link to="/admin/posts/new" className="admin-action-btn primary">
          Create New Post
        </Link>
      </div>
    </div>
  );
};

const AdminBlogPosts = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const response = await fetch(`${API}/admin/blog/posts`, {
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setPosts(data);
      }
    } catch (error) {
      console.error('Failed to fetch posts:', error);
    }
    setLoading(false);
  };

  const deletePost = async (postId) => {
    if (!window.confirm('Are you sure you want to delete this post?')) {
      return;
    }

    try {
      const response = await fetch(`${API}/admin/blog/posts/${postId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });

      if (response.ok) {
        setPosts(posts.filter(post => post.id !== postId));
      }
    } catch (error) {
      console.error('Failed to delete post:', error);
    }
  };

  if (loading) {
    return <div className="admin-loading">Loading posts...</div>;
  }

  return (
    <div className="admin-blog-posts">
      <div className="admin-header">
        <h1>Manage Blog Posts</h1>
        <Link to="/admin/posts/new" className="admin-btn-primary">Create New Post</Link>
      </div>
      
      <div className="posts-table">
        {posts.map(post => (
          <div key={post.id} className="post-row">
            <div className="post-info">
              <h3>{post.title}</h3>
              <p>{post.excerpt}</p>
              <div className="post-meta">
                <span className={`status ${post.published ? 'published' : 'draft'}`}>
                  {post.published ? 'Published' : 'Draft'}
                </span>
                <span>{new Date(post.created_at).toLocaleDateString()}</span>
              </div>
            </div>
            <div className="post-actions">
              <Link to={`/admin/posts/edit/${post.id}`} className="admin-btn-secondary">Edit</Link>
              <button onClick={() => deletePost(post.id)} className="btn-danger">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const AdminBlogEditor = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [post, setPost] = useState({
    title: '',
    content: '',
    excerpt: '',
    tags: [],
    published: true,
    meta_description: '',
    meta_keywords: '',
    featured_image: null
  });
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [postId, setPostId] = useState(null);
  const [tagInput, setTagInput] = useState('');
  const [imageUploading, setImageUploading] = useState(false);

  useEffect(() => {
    // Check if editing an existing post
    const path = window.location.pathname;
    const editMatch = path.match(/\/admin\/posts\/edit\/(.+)/);
    
    if (editMatch) {
      setIsEditing(true);
      setPostId(editMatch[1]);
      fetchPost(editMatch[1]);
    }
  }, []);

  const fetchPost = async (id) => {
    setLoading(true);
    try {
      const response = await fetch(`${API}/blog/posts/${id}`);
      if (response.ok) {
        const data = await response.json();
        setPost({
          title: data.title,
          content: data.content,
          excerpt: data.excerpt,
          tags: data.tags || [],
          published: data.published,
          meta_description: data.meta_description || '',
          meta_keywords: data.meta_keywords || '',
          featured_image: data.featured_image
        });
      }
    } catch (error) {
      console.error('Failed to fetch post:', error);
    }
    setLoading(false);
  };

  const handleImageUpload = async (file) => {
    if (!file) return;

    setImageUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API}/admin/upload/image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`
        },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        setPost(prev => ({ ...prev, featured_image: data.url }));
      } else {
        alert('Image upload failed. Please try again.');
      }
    } catch (error) {
      console.error('Image upload error:', error);
      alert('Image upload failed. Please try again.');
    }
    setImageUploading(false);
  };

  const addTag = () => {
    if (tagInput.trim() && !post.tags.includes(tagInput.trim())) {
      setPost(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove) => {
    setPost(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = isEditing 
        ? `${API}/admin/blog/posts/${postId}`
        : `${API}/admin/blog/posts`;
      
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify(post)
      });

      if (response.ok) {
        navigate('/admin/posts');
      } else {
        alert('Failed to save post. Please try again.');
      }
    } catch (error) {
      console.error('Failed to save post:', error);
      alert('Failed to save post. Please try again.');
    }
    setLoading(false);
  };

  if (loading && isEditing) {
    return <div className="admin-loading">Loading post...</div>;
  }

  return (
    <div className="admin-blog-editor">
      <div className="admin-header">
        <h1>{isEditing ? 'Edit Blog Post' : 'Create New Blog Post'}</h1>
        <Link to="/admin/posts" className="admin-btn-secondary">Back to Posts</Link>
      </div>

      <form onSubmit={handleSubmit} className="blog-editor-form">
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="title">Title *</label>
            <input
              type="text"
              id="title"
              value={post.title}
              onChange={(e) => setPost(prev => ({ ...prev, title: e.target.value }))}
              required
              disabled={loading}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="published">Status</label>
            <select
              id="published"
              value={post.published}
              onChange={(e) => setPost(prev => ({ ...prev, published: e.target.value === 'true' }))}
              disabled={loading}
            >
              <option value="true">Published</option>
              <option value="false">Draft</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="excerpt">Excerpt *</label>
          <textarea
            id="excerpt"
            value={post.excerpt}
            onChange={(e) => setPost(prev => ({ ...prev, excerpt: e.target.value }))}
            rows="3"
            required
            disabled={loading}
            placeholder="Short description of the post..."
          />
        </div>

        <div className="form-group">
          <label>Content *</label>
          <MDEditor
            value={post.content}
            onChange={(val) => setPost(prev => ({ ...prev, content: val || '' }))}
            data-color-mode="light"
            height={400}
            placeholder="Write your blog post content here..."
          />
        </div>

        <div className="form-group">
          <label htmlFor="featured_image">Featured Image</label>
          <div className="image-upload-section">
            {post.featured_image && (
              <div className="current-image">
                <img src={post.featured_image} alt="Featured" style={{ maxWidth: '200px', maxHeight: '150px' }} />
                <button 
                  type="button" 
                  onClick={() => setPost(prev => ({ ...prev, featured_image: null }))}
                  className="remove-image-btn"
                >
                  Remove
                </button>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleImageUpload(e.target.files[0])}
              disabled={imageUploading || loading}
            />
            {imageUploading && <p>Uploading image...</p>}
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="tags">Tags</label>
          <div className="tags-input">
            <div className="current-tags">
              {post.tags.map(tag => (
                <span key={tag} className="tag">
                  {tag}
                  <button type="button" onClick={() => removeTag(tag)}>×</button>
                </span>
              ))}
            </div>
            <div className="add-tag">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                placeholder="Add a tag..."
                disabled={loading}
              />
              <button type="button" onClick={addTag} disabled={loading}>Add</button>
            </div>
          </div>
        </div>

        <div className="seo-section">
          <h3>SEO Settings</h3>
          
          <div className="form-group">
            <label htmlFor="meta_description">Meta Description</label>
            <textarea
              id="meta_description"
              value={post.meta_description}
              onChange={(e) => setPost(prev => ({ ...prev, meta_description: e.target.value }))}
              rows="2"
              maxLength="160"
              disabled={loading}
              placeholder="Brief description for search engines (max 160 characters)..."
            />
            <small>{post.meta_description.length}/160 characters</small>
          </div>

          <div className="form-group">
            <label htmlFor="meta_keywords">Meta Keywords</label>
            <input
              type="text"
              id="meta_keywords"
              value={post.meta_keywords}
              onChange={(e) => setPost(prev => ({ ...prev, meta_keywords: e.target.value }))}
              disabled={loading}
              placeholder="Comma-separated keywords for SEO..."
            />
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" disabled={loading} className="admin-btn-primary">
            {loading ? 'Saving...' : (isEditing ? 'Update Post' : 'Create Post')}
          </button>
          <Link to="/admin/posts" className="admin-btn-secondary">Cancel</Link>
        </div>
      </form>
    </div>
  );
};

const AdminLogin = () => {
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await login(credentials.username, credentials.password);
    
    if (result.success) {
      navigate('/admin/dashboard');
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="admin-login-page">
      <div className="admin-login-container">
        <div className="admin-login-form">
          <h2>Admin Login</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                type="text"
                id="username"
                value={credentials.username}
                onChange={(e) => setCredentials(prev => ({ ...prev, username: e.target.value }))}
                required
                disabled={loading}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                value={credentials.password}
                onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                required
                disabled={loading}
              />
            </div>
            
            {error && <div className="error-message">{error}</div>}
            
            <button type="submit" disabled={loading} className="login-btn">
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return user ? children : <Navigate to="/admin/login" />;
};
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
In der heutigen digitalen Welt ist Social Media Marketing nicht mehr nur eine Option – es ist eine Notwendigkeit für jedes Unternehmen, das erfolgreich sein möchte.

### Die Macht der sozialen Medien

Mit über 4,8 Milliarden aktiven Social Media Nutzern weltweit bieten Plattformen wie Facebook, Instagram, LinkedIn und TikTok eine unglaubliche Reichweite für Ihr Unternehmen.

### Vorteile von professionellem Social Media Marketing:

- **Erhöhte Markenbekanntheit:** Regelmäßige, hochwertige Inhalte steigern die Sichtbarkeit Ihrer Marke
- **Direkter Kundenkontakt:** Interaktion und Engagement mit Ihrer Zielgruppe in Echtzeit
- **Kostengünstige Werbung:** Gezieltes Targeting zu einem Bruchteil traditioneller Werbekosten
- **Messbare Ergebnisse:** Detaillierte Analytics für kontinuierliche Optimierung

Bei Rudi-Media entwickeln wir maßgeschneiderte Social Media Strategien, die Ihre Unternehmensziele unterstützen und messbare Ergebnisse liefern.
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
Die Wahl zwischen Google Ads und Meta Ads (Facebook/Instagram) ist eine der häufigsten Fragen unserer Kunden. Beide Plattformen haben ihre Stärken – die richtige Wahl hängt von Ihren spezifischen Zielen ab.

### Google Ads – Der Klassiker für gezielte Suche

**Vorteile:**
- Nutzer suchen aktiv nach Ihren Produkten/Dienstleistungen
- Hohe Kaufbereitschaft der Zielgruppe
- Vielfältige Anzeigenformate (Text, Shopping, Display)
- Lokale Ausrichtung möglich

### Meta Ads – Emotionale Ansprache und Reichweite

**Vorteile:**
- Detailliertes Targeting nach Interessen und Verhalten
- Visuelle, ansprechende Anzeigenformate
- Große Reichweite, besonders bei jüngeren Zielgruppen
- Günstigere Kosten pro Klick

### Unsere Empfehlung: Eine kombinierte Strategie

Die besten Ergebnisse erzielen unsere Kunden mit einer durchdachten Kombination beider Plattformen:
- **Google Ads** für die Erfassung von Suchintentionen
- **Meta Ads** für Markenbekanntheit und Retargeting

Wir analysieren Ihre Zielgruppe und entwickeln die optimale Strategie für Ihr Unternehmen.
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
Suchmaschinenoptimierung entwickelt sich ständig weiter. Hier sind die wichtigsten SEO-Trends für 2025, die Ihre Website-Strategie beeinflussen werden.

### 1. KI-gestützte Inhalte und E-A-T

Google legt zunehmend Wert auf Expertise, Autorität und Vertrauenswürdigkeit (E-A-T). Hochwertige, von Experten erstellte Inhalte werden noch wichtiger.

### 2. Core Web Vitals und Page Experience

Die Ladegeschwindigkeit und Nutzerfreundlichkeit Ihrer Website sind entscheidende Ranking-Faktoren:
- Largest Contentful Paint (LCP) unter 2,5 Sekunden
- First Input Delay (FID) unter 100 Millisekunden
- Cumulative Layout Shift (CLS) unter 0,1

### 3. Lokale SEO wird wichtiger

Für lokale Unternehmen ist die Optimierung für "Near Me"-Suchen entscheidend:
- Google My Business Profil pflegen
- Lokale Keywords verwenden
- Positive Bewertungen sammeln

### 4. Voice Search Optimierung

Mit der zunehmenden Nutzung von Sprachassistenten wird die Optimierung für gesprochene Suchanfragen immer wichtiger.

### Unser SEO-Ansatz bei Rudi-Media

Wir kombinieren technische SEO-Expertise mit hochwertiger Content-Strategie, um nachhaltige Ergebnisse zu erzielen. Von der On-Page-Optimierung bis zur Local-SEO-Betreuung – wir sorgen dafür, dass Ihre Website bei Google gefunden wird.
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
            <ReactMarkdown>{post.content}</ReactMarkdown>
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
      <BigImpactSection />
      <ContactForm />
      <Footer />
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
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
            
            {/* Admin Routes */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/dashboard" element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin/posts" element={
              <ProtectedRoute>
                <AdminBlogPosts />
              </ProtectedRoute>
            } />
            <Route path="/admin/posts/new" element={
              <ProtectedRoute>
                <AdminBlogEditor />
              </ProtectedRoute>
            } />
            <Route path="/admin/posts/edit/:id" element={
              <ProtectedRoute>
                <AdminBlogEditor />
              </ProtectedRoute>
            } />
          </Routes>
        </BrowserRouter>
      </div>
    </AuthProvider>
  );
}

export default App;