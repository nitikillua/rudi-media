from fastapi import FastAPI, APIRouter, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from datetime import datetime, timezone
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
import os
import uuid
import logging
from pathlib import Path

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

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

class BlogPostCreate(BaseModel):
    title: str
    content: str
    excerpt: str
    tags: List[str] = []
    published: bool = True

class BlogPostUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    excerpt: Optional[str] = None
    tags: Optional[List[str]] = None
    published: Optional[bool] = None

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
                to_emails="info@rudimedia.de",
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