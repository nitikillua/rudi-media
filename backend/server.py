from fastapi import FastAPI, APIRouter, HTTPException, BackgroundTasks, Depends, status, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from passlib.context import CryptContext
from jose import JWTError, jwt
import os
import uuid
import logging
from pathlib import Path
import aiofiles
import base64

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Security
SECRET_KEY = os.environ.get('SECRET_KEY', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create FastAPI app and router
app = FastAPI(title="Rudi-Media Website API")
api_router = APIRouter(prefix="/api")

# Models
class BlogPost(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    content: str
    excerpt: str
    author: str = "Arjanit Rudi"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    published: bool = True
    tags: List[str] = []
    slug: str
    # SEO Fields
    meta_description: Optional[str] = None
    meta_keywords: Optional[str] = None
    featured_image: Optional[str] = None

class BlogPostCreate(BaseModel):
    title: str
    content: str
    excerpt: str
    tags: List[str] = []
    published: bool = True
    meta_description: Optional[str] = None
    meta_keywords: Optional[str] = None
    featured_image: Optional[str] = None

class BlogPostUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    excerpt: Optional[str] = None
    tags: Optional[List[str]] = None
    published: Optional[bool] = None
    meta_description: Optional[str] = None
    meta_keywords: Optional[str] = None
    featured_image: Optional[str] = None

class ContactForm(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: EmailStr
    message: str
    phone: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ContactFormCreate(BaseModel):
    name: str
    email: EmailStr
    message: str
    phone: Optional[str] = None

class ContactFormResponse(BaseModel):
    status: str
    message: str

# Email Service
class EmailService:
    def __init__(self):
        self.api_key = os.environ.get('SENDGRID_API_KEY')
        self.sender_email = os.environ.get('SENDER_EMAIL', 'info@rudimedia.de')
        
    async def send_contact_email(self, contact_data: ContactForm):
        """Send contact form email"""
        if not self.api_key:
            raise Exception("SendGrid API key not configured")
            
        try:
            # Email to company
            company_subject = f"Neue Kontaktanfrage von {contact_data.name}"
            company_content = f"""
            <html>
                <body style="font-family: Arial, sans-serif; line-height: 1.6;">
                    <h2 style="color: #1e53f9;">Neue Kontaktanfrage - Rudi-Media</h2>
                    <p><strong>Name:</strong> {contact_data.name}</p>
                    <p><strong>E-Mail:</strong> {contact_data.email}</p>
                    {f'<p><strong>Telefon:</strong> {contact_data.phone}</p>' if contact_data.phone else ''}
                    <p><strong>Nachricht:</strong></p>
                    <div style="background-color: #f5f5f5; padding: 15px; border-left: 4px solid #1e53f9;">
                        {contact_data.message}
                    </div>
                    <p><small>Gesendet am: {contact_data.created_at.strftime('%d.%m.%Y um %H:%M Uhr')}</small></p>
                </body>
            </html>
            """
            
            company_message = Mail(
                from_email=self.sender_email,
                to_emails="info@rudi-media.de",
                subject=company_subject,
                html_content=company_content
            )
            
            # Confirmation email to customer
            customer_subject = "Ihre Anfrage bei Rudi-Media - Wir melden uns bald!"
            customer_content = f"""
            <html>
                <body style="font-family: Arial, sans-serif; line-height: 1.6;">
                    <h2 style="color: #1e53f9;">Vielen Dank für Ihre Anfrage!</h2>
                    <p>Hallo {contact_data.name},</p>
                    <p>vielen Dank für Ihr Interesse an Rudi-Media. Wir haben Ihre Nachricht erhalten und werden uns schnellstmöglich bei Ihnen melden.</p>
                    
                    <div style="background-color: #f8f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="color: #1e53f9; margin-top: 0;">Ihre Nachricht:</h3>
                        <p style="margin-bottom: 0;">{contact_data.message}</p>
                    </div>
                    
                    <p>In der Zwischenzeit können Sie uns auch direkt über WhatsApp kontaktieren:</p>
                    <p><a href="https://wa.me/4915222539425" style="color: #25D366; text-decoration: none; font-weight: bold;">📱 +49 1522 2539425</a></p>
                    
                    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                    <p style="color: #666; font-size: 14px;">
                        Mit freundlichen Grüßen<br>
                        <strong>Arjanit Rudi</strong><br>
                        Rudi-Media<br>
                        Kampenwandstr. 2, 85586 Poing<br>
                        Tel: +49 1522 2539425<br>
                        Web: rudimedia.de
                    </p>
                </body>
            </html>
            """
            
            customer_message = Mail(
                from_email=self.sender_email,
                to_emails=contact_data.email,
                subject=customer_subject,
                html_content=customer_content
            )
            
            sg = SendGridAPIClient(self.api_key)
            
            # Send both emails
            sg.send(company_message)
            sg.send(customer_message)
            
            return True
            
        except Exception as e:
            logging.error(f"Email sending failed: {str(e)}")
            return False

email_service = EmailService()

# Helper functions
def create_slug(title: str) -> str:
    """Create URL-friendly slug from title"""
    import re
    slug = title.lower()
    slug = re.sub(r'[^\w\s-]', '', slug)
    slug = re.sub(r'[-\s]+', '-', slug)
    return slug.strip('-')

def prepare_for_mongo(data: dict) -> dict:
    """Prepare data for MongoDB storage"""
    if isinstance(data.get('created_at'), datetime):
        data['created_at'] = data['created_at'].isoformat()
    if isinstance(data.get('updated_at'), datetime):
        data['updated_at'] = data['updated_at'].isoformat()
    return data

def parse_from_mongo(item: dict) -> dict:
    """Parse data from MongoDB"""
    if isinstance(item.get('created_at'), str):
        item['created_at'] = datetime.fromisoformat(item['created_at'])
    if isinstance(item.get('updated_at'), str):
        item['updated_at'] = datetime.fromisoformat(item['updated_at'])
    return item

# Routes
@api_router.get("/")
async def root():
    return {"message": "Rudi-Media API is running", "version": "1.0.0"}

# Blog Routes
@api_router.get("/blog/posts", response_model=List[BlogPost])
async def get_blog_posts(published_only: bool = True):
    """Get all blog posts"""
    query = {"published": True} if published_only else {}
    posts = await db.blog_posts.find(query).sort("created_at", -1).to_list(100)
    return [BlogPost(**parse_from_mongo(post)) for post in posts]

@api_router.get("/blog/posts/{post_id}", response_model=BlogPost)
async def get_blog_post(post_id: str):
    """Get single blog post"""
    post = await db.blog_posts.find_one({"id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Blog post nicht gefunden")
    return BlogPost(**parse_from_mongo(post))

@api_router.get("/blog/posts/slug/{slug}", response_model=BlogPost)
async def get_blog_post_by_slug(slug: str):
    """Get blog post by slug"""
    post = await db.blog_posts.find_one({"slug": slug})
    if not post:
        raise HTTPException(status_code=404, detail="Blog post nicht gefunden")
    return BlogPost(**parse_from_mongo(post))

@api_router.post("/blog/posts", response_model=BlogPost)
async def create_blog_post(post_data: BlogPostCreate):
    """Create new blog post"""
    slug = create_slug(post_data.title)
    
    # Check if slug already exists
    existing_post = await db.blog_posts.find_one({"slug": slug})
    if existing_post:
        slug = f"{slug}-{str(uuid.uuid4())[:8]}"
    
    post_dict = post_data.dict()
    post_dict["slug"] = slug
    post_obj = BlogPost(**post_dict)
    
    mongo_data = prepare_for_mongo(post_obj.dict())
    await db.blog_posts.insert_one(mongo_data)
    
    return post_obj

@api_router.put("/blog/posts/{post_id}", response_model=BlogPost)
async def update_blog_post(post_id: str, post_data: BlogPostUpdate):
    """Update blog post"""
    existing_post = await db.blog_posts.find_one({"id": post_id})
    if not existing_post:
        raise HTTPException(status_code=404, detail="Blog post nicht gefunden")
    
    update_data = {k: v for k, v in post_data.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Update slug if title changed
    if "title" in update_data:
        new_slug = create_slug(update_data["title"])
        # Check if new slug already exists
        slug_exists = await db.blog_posts.find_one({"slug": new_slug, "id": {"$ne": post_id}})
        if slug_exists:
            new_slug = f"{new_slug}-{str(uuid.uuid4())[:8]}"
        update_data["slug"] = new_slug
    
    await db.blog_posts.update_one({"id": post_id}, {"$set": update_data})
    
    updated_post = await db.blog_posts.find_one({"id": post_id})
    return BlogPost(**parse_from_mongo(updated_post))

@api_router.delete("/blog/posts/{post_id}")
async def delete_blog_post(post_id: str):
    """Delete blog post"""
    result = await db.blog_posts.delete_one({"id": post_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Blog post nicht gefunden")
    return {"message": "Blog post gelöscht"}

# Contact Form Routes
@api_router.post("/contact", response_model=ContactFormResponse)
async def submit_contact_form(contact_data: ContactFormCreate, background_tasks: BackgroundTasks):
    """Submit contact form"""
    try:
        # Create contact record
        contact_obj = ContactForm(**contact_data.dict())
        mongo_data = prepare_for_mongo(contact_obj.dict())
        await db.contacts.insert_one(mongo_data)
        
        # Send emails in background
        background_tasks.add_task(email_service.send_contact_email, contact_obj)
        
        return ContactFormResponse(
            status="success",
            message="Vielen Dank für Ihre Nachricht! Wir melden uns schnellstmöglich bei Ihnen."
        )
        
    except Exception as e:
        logging.error(f"Contact form error: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail="Es ist ein Fehler aufgetreten. Bitte versuchen Sie es später erneut."
        )

@api_router.get("/contacts")
async def get_contacts():
    """Get all contacts (admin only)"""
    contacts = await db.contacts.find().sort("created_at", -1).to_list(100)
    return [ContactForm(**parse_from_mongo(contact)) for contact in contacts]

# Include router
app.include_router(api_router)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_event():
    """Initialize database with sample blog posts"""
    try:
        # Check if blog posts exist
        existing_posts = await db.blog_posts.count_documents({})
        
        if existing_posts == 0:
            # Create sample blog posts
            sample_posts = [
                {
                    "id": str(uuid.uuid4()),
                    "title": "Warum Social Media Marketing für Ihr Unternehmen unverzichtbar ist",
                    "content": """
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
                    """,
                    "excerpt": "Entdecken Sie, warum Social Media Marketing für Ihr Unternehmen unverzichtbar ist und wie es Ihnen helfen kann, Ihre Ziele zu erreichen.",
                    "author": "Arjanit Rudi",
                    "slug": "warum-social-media-marketing-unverzichtbar-ist",
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                    "published": True,
                    "tags": ["Social Media", "Marketing", "Digital Marketing"]
                },
                {
                    "id": str(uuid.uuid4()),
                    "title": "Google Ads vs. Meta Ads: Welche Plattform ist die richtige für Sie?",
                    "content": """
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
                    """,
                    "excerpt": "Google Ads oder Meta Ads? Erfahren Sie, welche Plattform für Ihre Marketingziele am besten geeignet ist.",
                    "author": "Arjanit Rudi",
                    "slug": "google-ads-vs-meta-ads-vergleich",
                    "created_at": (datetime.now(timezone.utc) - timedelta(days=7)).isoformat(),
                    "updated_at": (datetime.now(timezone.utc) - timedelta(days=7)).isoformat(),
                    "published": True,
                    "tags": ["Google Ads", "Meta Ads", "Online Werbung", "PPC"]
                },
                {
                    "id": str(uuid.uuid4()),
                    "title": "SEO-Trends 2025: Was Sie jetzt wissen müssen",
                    "content": """
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
                    """,
                    "excerpt": "Entdecken Sie die wichtigsten SEO-Trends für 2025 und erfahren Sie, wie Sie Ihre Website für die Zukunft optimieren.",
                    "author": "Arjanit Rudi",
                    "slug": "seo-trends-2025",
                    "created_at": (datetime.now(timezone.utc) - timedelta(days=14)).isoformat(),
                    "updated_at": (datetime.now(timezone.utc) - timedelta(days=14)).isoformat(),
                    "published": True,
                    "tags": ["SEO", "Google", "Website Optimierung", "Trends 2025"]
                },
                # Neue Blog-Artikel
                {
                    "id": str(uuid.uuid4()),
                    "title": "Die ultimative Social Media Content-Strategie für 2025",
                    "content": """
                    <p>Eine durchdachte Content-Strategie ist das Herzstück erfolgreichen Social Media Marketings. In diesem Artikel zeigen wir Ihnen, wie Sie Inhalte erstellen, die nicht nur gesehen, sondern auch geteilt und geliebt werden.</p>
                    
                    <h3>1. Zielgruppen-Analyse: Der Grundstein jeder Strategie</h3>
                    <p>Bevor Sie den ersten Post erstellen, müssen Sie Ihre Zielgruppe in- und auswendig kennen:</p>
                    <ul>
                        <li><strong>Demografische Daten:</strong> Alter, Geschlecht, Standort, Einkommen</li>
                        <li><strong>Psychografische Merkmale:</strong> Interessen, Werte, Lifestyle</li>
                        <li><strong>Online-Verhalten:</strong> Welche Plattformen nutzen sie? Wann sind sie aktiv?</li>
                        <li><strong>Pain Points:</strong> Welche Probleme haben sie, die Sie lösen können?</li>
                    </ul>
                    
                    <h3>2. Content-Formate, die 2025 funktionieren</h3>
                    <p><strong>Video-Content dominiert weiterhin:</strong></p>
                    <ul>
                        <li>Short-Form Videos (TikTok, Instagram Reels, YouTube Shorts)</li>
                        <li>Live-Streaming für Authentizität</li>
                        <li>Tutorials und How-to-Videos</li>
                        <li>Behind-the-Scenes Content</li>
                    </ul>
                    
                    <p><strong>Interaktive Inhalte gewinnen an Bedeutung:</strong></p>
                    <ul>
                        <li>Umfragen und Quizze</li>
                        <li>AR-Filter und interaktive Stories</li>
                        <li>User-Generated Content Kampagnen</li>
                        <li>Live Q&A Sessions</li>
                    </ul>
                    
                    <h3>3. Die 80/20-Regel für Social Media Content</h3>
                    <p>80% Ihrer Inhalte sollten Mehrwert bieten (informieren, unterhalten, inspirieren), nur 20% sollten direkt verkaufsorientiert sein. Diese Aufteilung schafft Vertrauen und Engagement.</p>
                    
                    <h3>4. Content-Planung und Konsistenz</h3>
                    <p>Erfolgreiche Social Media Präsenz erfordert Planung:</p>
                    <ul>
                        <li><strong>Content-Kalender:</strong> Planen Sie mindestens einen Monat im Voraus</li>
                        <li><strong>Posting-Zeiten:</strong> Nutzen Sie Analytics, um optimale Zeiten zu identifizieren</li>
                        <li><strong>Hashtag-Strategie:</strong> Mix aus branded, branchenspezifischen und trending Hashtags</li>
                        <li><strong>Cross-Platform-Anpassung:</strong> Jede Plattform hat ihre eigenen Besonderheiten</li>
                    </ul>
                    
                    <h3>5. Erfolgsmessung und Optimierung</h3>
                    <p>KPIs, die wirklich zählen:</p>
                    <ul>
                        <li>Engagement Rate (Likes, Kommentare, Shares pro Follower)</li>
                        <li>Reach und Impressions</li>
                        <li>Website-Traffic aus Social Media</li>
                        <li>Lead-Generierung und Conversions</li>
                        <li>Brand Mention und Sentiment</li>
                    </ul>
                    
                    <h3>Unser Ansatz bei Rudi-Media</h3>
                    <p>Wir entwickeln für jeden Kunden eine individuelle Content-Strategie, die auf fundierten Daten basiert und kontinuierlich optimiert wird. Von der Ideenfindung über die Produktion bis hin zur Performance-Analyse – wir begleiten Sie auf dem gesamten Weg.</p>
                    
                    <p><strong>Bereit für eine Social Media Strategie, die wirklich funktioniert?</strong> Kontaktieren Sie uns für ein kostenloses Beratungsgespräch!</p>
                    """,
                    "excerpt": "Lernen Sie, wie Sie eine Social Media Content-Strategie entwickeln, die Engagement generiert und echte Geschäftsergebnisse liefert.",
                    "author": "Arjanit Rudi",
                    "slug": "social-media-content-strategie-2025",
                    "created_at": (datetime.now(timezone.utc) - timedelta(days=3)).isoformat(),
                    "updated_at": (datetime.now(timezone.utc) - timedelta(days=3)).isoformat(),
                    "published": True,
                    "tags": ["Social Media", "Content Marketing", "Strategie", "Digital Marketing"]
                },
                {
                    "id": str(uuid.uuid4()),
                    "title": "Google Ads Optimierung: 7 Strategien für maximalen ROI",
                    "content": """
                    <p>Google Ads kann ein mächtiges Werkzeug für Ihr Business sein – wenn es richtig eingesetzt wird. Viele Unternehmen verbrennen täglich Budgets mit schlecht optimierten Kampagnen. Hier sind 7 bewährte Strategien, um Ihren ROI zu maximieren.</p>
                    
                    <h3>1. Keyword-Recherche: Die Basis erfolgreicher Kampagnen</h3>
                    <p>Erfolgreiche Google Ads Kampagnen beginnen mit der richtigen Keyword-Strategie:</p>
                    <ul>
                        <li><strong>Long-Tail Keywords:</strong> Weniger Konkurrenz, höhere Conversion-Rate</li>
                        <li><strong>Negative Keywords:</strong> Vermeiden Sie irrelevante Klicks und sparen Sie Budget</li>
                        <li><strong>Keyword-Match-Types:</strong> Nutzen Sie Broad Match Modifier für kontrollierte Reichweite</li>
                        <li><strong>Suchvolumen vs. Intent:</strong> Fokus auf kaufbereite Nutzer</li>
                    </ul>
                    
                    <h3>2. Anzeigengruppen-Struktur optimieren</h3>
                    <p>Eine saubere Kontostruktur ist entscheidend:</p>
                    <ul>
                        <li>Maximal 10-20 Keywords pro Anzeigengruppe</li>
                        <li>Thematisch eng verwandte Keywords gruppieren</li>
                        <li>Separate Anzeigengruppen für verschiedene Match-Types</li>
                        <li>Brand- und Non-Brand-Keywords trennen</li>
                    </ul>
                    
                    <h3>3. Anzeigentexte, die konvertieren</h3>
                    <p>Ihre Anzeigen müssen aus der Masse herausstechen:</p>
                    <ul>
                        <li><strong>Headline-Optimierung:</strong> Keyword in Headline 1, Nutzen in Headline 2</li>
                        <li><strong>Unique Selling Proposition:</strong> Was macht Sie besser als die Konkurrenz?</li>
                        <li><strong>Call-to-Action:</strong> Klare Handlungsaufforderung</li>
                        <li><strong>Ad Extensions:</strong> Nutzen Sie alle verfügbaren Erweiterungen</li>
                    </ul>
                    
                    <h3>4. Landing Page Optimierung</h3>
                    <p>Der Klick ist nur der Anfang – die Landing Page muss überzeugen:</p>
                    <ul>
                        <li><strong>Message Match:</strong> Anzeige und Landing Page müssen harmonieren</li>
                        <li><strong>Ladegeschwindigkeit:</strong> Unter 3 Sekunden ist Pflicht</li>
                        <li><strong>Mobile Optimierung:</strong> Über 60% der Klicks kommen von mobilen Geräten</li>
                        <li><strong>Conversion-Elemente:</strong> Formulare und CTAs prominent platzieren</li>
                    </ul>
                    
                    <h3>5. Gebotsstrategien intelligent einsetzen</h3>
                    <p>Die richtige Gebotsstrategie kann Ihren ROI verdoppeln:</p>
                    <ul>
                        <li><strong>Target CPA:</strong> Für stabile Conversion-Kosten</li>
                        <li><strong>Target ROAS:</strong> Für E-Commerce mit unterschiedlichen Warenkörben</li>
                        <li><strong>Maximize Conversions:</strong> Für neue Kampagnen mit ausreichend Daten</li>
                        <li><strong>Manual CPC:</strong> Für maximale Kontrolle bei kleinen Budgets</li>
                    </ul>
                    
                    <h3>6. Demografisches und geografisches Targeting</h3>
                    <p>Fokussieren Sie auf Ihre wertvollsten Zielgruppen:</p>
                    <ul>
                        <li>Analyse der besten Zielgruppen nach Alter und Geschlecht</li>
                        <li>Geografische Leistung bewerten und Budget entsprechend verteilen</li>
                        <li>Dayparting: Anzeigen zu optimalen Zeiten schalten</li>
                        <li>Device-Performance: Mobile vs. Desktop Performance analysieren</li>
                    </ul>
                    
                    <h3>7. Kontinuierliches Monitoring und Optimierung</h3>
                    <p>Google Ads ist ein kontinuierlicher Prozess:</p>
                    <ul>
                        <li><strong>Wöchentliche Leistungsanalyse:</strong> KPIs im Blick behalten</li>
                        <li><strong>A/B-Tests:</strong> Anzeigen und Landing Pages kontinuierlich testen</li>
                        <li><strong>Competitor Analysis:</strong> Marktveränderungen rechtzeitig erkennen</li>
                        <li><strong>Budget-Umverteilung:</strong> Erfolgreiche Kampagnen stärken</li>
                    </ul>
                    
                    <h3>Unser Google Ads Management bei Rudi-Media</h3>
                    <p>Wir betreuen Google Ads Kampagnen mit einem datengetriebenen Ansatz. Unsere zertifizierten Google Ads Experten optimieren kontinuierlich für maximale Performance und transparente Ergebnisse.</p>
                    
                    <p><strong>Professionelle Google Ads Betreuung benötigt?</strong> Lassen Sie uns Ihre Kampagnen analysieren und Optimierungspotentiale aufzeigen!</p>
                    """,
                    "excerpt": "Maximieren Sie Ihren Google Ads ROI mit diesen 7 bewährten Optimierungsstrategien von unseren PPC-Experten.",
                    "author": "Arjanit Rudi",
                    "slug": "google-ads-optimierung-strategien",
                    "created_at": (datetime.now(timezone.utc) - timedelta(days=1)).isoformat(),
                    "updated_at": (datetime.now(timezone.utc) - timedelta(days=1)).isoformat(),
                    "published": True,
                    "tags": ["Google Ads", "PPC", "Online Marketing", "ROI Optimierung"]
                },
                {
                    "id": str(uuid.uuid4()),
                    "title": "Local SEO: Wie Sie in lokalen Suchergebnissen dominieren",
                    "content": """
                    <p>88% der Verbraucher, die eine lokale Suche auf ihrem Smartphone durchführen, besuchen oder rufen ein Geschäft innerhalb eines Tages an. Local SEO ist daher essentiell für jedes lokale Unternehmen.</p>
                    
                    <h3>1. Google My Business optimieren</h3>
                    <p>Ihr Google My Business Profil ist Ihr wichtigstes Local SEO Asset:</p>
                    <ul>
                        <li><strong>Vollständige Informationen:</strong> Name, Adresse, Telefonnummer, Öffnungszeiten</li>
                        <li><strong>Hochwertige Fotos:</strong> Außenansicht, Innenbereich, Team, Produkte</li>
                        <li><strong>Regelmäßige Posts:</strong> Updates, Angebote, Events</li>
                        <li><strong>Q&A Bereich:</strong> Häufige Fragen proaktiv beantworten</li>
                        <li><strong>Attribute nutzen:</strong> Alle relevanten Geschäftsattribute auswählen</li>
                    </ul>
                    
                    <h3>2. NAP-Konsistenz sicherstellen</h3>
                    <p>Name, Adresse und Telefonnummer (NAP) müssen überall identisch sein:</p>
                    <ul>
                        <li>Website und alle Unterseiten</li>
                        <li>Google My Business</li>
                        <li>Branchenverzeichnisse</li>
                        <li>Social Media Profile</li>
                        <li>Online-Bewertungsplattformen</li>
                    </ul>
                    
                    <h3>3. Lokale Keywords strategisch nutzen</h3>
                    <p>Integrieren Sie lokale Suchbegriffe natürlich in Ihre Inhalte:</p>
                    <ul>
                        <li><strong>Stadt + Dienstleistung:</strong> "SEO Agentur München"</li>
                        <li><strong>Stadtteil-spezifisch:</strong> "Webdesign Schwabing"</li>
                        <li><strong>"In der Nähe" Begriffe:</strong> "Marketing Agentur in meiner Nähe"</li>
                        <li><strong>Lokale Landmarken:</strong> "Nahe Marienplatz"</li>
                    </ul>
                    
                    <h3>4. Online-Bewertungen managen</h3>
                    <p>Bewertungen sind ein entscheidender Ranking-Faktor:</p>
                    <ul>
                        <li><strong>Proaktiv um Bewertungen bitten:</strong> Zufriedene Kunden ansprechen</li>
                        <li><strong>Schnell auf Bewertungen antworten:</strong> Sowohl positive als auch negative</li>
                        <li><strong>Bewertungsvielfalt:</strong> Google, Facebook, branchenspezifische Plattformen</li>
                        <li><strong>Bewertungen einbetten:</strong> Positive Reviews auf der Website zeigen</li>
                    </ul>
                    
                    <h3>5. Lokale Inhalte erstellen</h3>
                    <p>Content mit lokalem Bezug stärkt Ihre Relevanz:</p>
                    <ul>
                        <li>Blog-Artikel über lokale Events und Trends</li>
                        <li>Kooperationen mit anderen lokalen Unternehmen</li>
                        <li>Lokale Fallstudien und Erfolgsgeschichten</li>
                        <li>Community-Engagement dokumentieren</li>
                    </ul>
                    
                    <h3>6. Strukturierte Daten implementieren</h3>
                    <p>Schema Markup hilft Suchmaschinen, Ihr Unternehmen zu verstehen:</p>
                    <ul>
                        <li><strong>LocalBusiness Schema:</strong> Grundlegende Unternehmensdaten</li>
                        <li><strong>Review Schema:</strong> Bewertungen in Suchergebnissen anzeigen</li>
                        <li><strong>Opening Hours:</strong> Öffnungszeiten strukturiert auszeichnen</li>
                        <li><strong>FAQ Schema:</strong> Häufige Fragen direkt in den SERPs</li>
                    </ul>
                    
                    <h3>7. Mobile Optimierung priorisieren</h3>
                    <p>Lokale Suchen finden zu 80% auf mobilen Geräten statt:</p>
                    <ul>
                        <li>Schnelle Ladezeiten (unter 3 Sekunden)</li>
                        <li>Thumb-freundliche Navigation</li>
                        <li>Click-to-Call Buttons prominent platzieren</li>
                        <li>Standort-basierte Funktionen nutzen</li>
                    </ul>
                    
                    <h3>8. Local Citations aufbauen</h3>
                    <p>Erwähnungen Ihres Unternehmens in Online-Verzeichnissen:</p>
                    <ul>
                        <li><strong>Branchenverzeichnisse:</strong> Gelbe Seiten, Das Örtliche, 11880</li>
                        <li><strong>Bewertungsplattformen:</strong> Yelp, TripAdvisor, Qype</li>
                        <li><strong>Branchenspezifische Portale:</strong> Je nach Geschäftsfeld</li>
                        <li><strong>Lokale Websites:</strong> Stadtportale, Handelskammern</li>
                    </ul>
                    
                    <h3>Unser Local SEO Service bei Rudi-Media</h3>
                    <p>Wir helfen lokalen Unternehmen dabei, in den lokalen Suchergebnissen sichtbarer zu werden. Von der Google My Business Optimierung bis zur umfassenden Local SEO Strategie.</p>
                    
                    <p><strong>Möchten Sie lokal besser gefunden werden?</strong> Lassen Sie uns Ihre aktuelle Local SEO Performance analysieren!</p>
                    """,
                    "excerpt": "Dominieren Sie die lokalen Suchergebnisse mit unserer umfassenden Local SEO Anleitung für mehr Sichtbarkeit und Kunden.",
                    "author": "Arjanit Rudi",
                    "slug": "local-seo-strategien-lokale-suche",
                    "created_at": (datetime.now(timezone.utc) - timedelta(hours=12)).isoformat(),
                    "updated_at": (datetime.now(timezone.utc) - timedelta(hours=12)).isoformat(),
                    "published": True,
                    "tags": ["Local SEO", "Google My Business", "Lokale Suche", "SEO"]
                }
            ]
            
            # Insert sample posts
            await db.blog_posts.insert_many(sample_posts)
            logger.info("Sample blog posts created")
            
    except Exception as e:
        logger.error(f"Startup error: {str(e)}")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()