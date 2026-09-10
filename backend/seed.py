from datetime import date
from app.core.database import Base, engine, SessionLocal
from app.models import Department, User, Document, DocumentChunk, AutomationCatalog
from app.services.document_service import chunk_text
from app.core.config import settings

Base.metadata.create_all(bind=engine)
db = SessionLocal()

for name in ["HR", "IT", "AUTOMATION", "MEDIA"]:
    if not db.query(Department).filter_by(name=name).first():
        db.add(Department(name=name))
db.commit()

auto_dept = db.query(Department).filter_by(name="AUTOMATION").first()
if not db.query(User).filter_by(email=f"demo@{settings.allowed_google_domain}").first():
    db.add(User(name="Demo Employee", email=f"demo@{settings.allowed_google_domain}", role="SUPER_ADMIN", department_id=auto_dept.id))
db.commit()

demo_docs = [
    ("Automation Request Process", "AUTOMATION", "To request a new automation, submit the automation opportunity form with process name, business owner, transaction volume, current manual effort, applications involved, sample inputs and expected output. The RPA team performs suitability assessment, effort estimation, prioritization, development, UAT and deployment. This is DEMO / SYNTHETIC DATA."),
    ("RPA Suitability Guide", "AUTOMATION", "Good RPA candidates are repetitive, rule-based, stable, high-volume processes with structured inputs and clear business rules. Processes requiring frequent judgement, unstable applications or undocumented rules need additional assessment. This is DEMO / SYNTHETIC DATA."),
    ("IT Access Request SOP", "IT", "Employees requiring system access should submit the approved access request with manager approval and required role details. IT validates the request and provisions access according to the approved access matrix. This is DEMO / SYNTHETIC DATA."),
    ("Employee Onboarding Guide", "HR", "New employees complete joining documentation, receive IT access, attend orientation and review required policies. Managers confirm role-specific access and induction requirements. This is DEMO / SYNTHETIC DATA."),
    ("Media Production SOP", "MEDIA", "Media production requests include approved storyboard, source assets, output specifications and delivery date. Production follows review, QA and final delivery stages. This is DEMO / SYNTHETIC DATA."),
]
for title, dept_name, text in demo_docs:
    if db.query(Document).filter_by(title=title).first():
        continue
    dept = db.query(Department).filter_by(name=dept_name).first()
    doc = Document(title=title, description="DEMO / SYNTHETIC DATA", department_id=dept.id, category="Demo", owner=f"{dept_name} Team", status="APPROVED", version="1.0", last_verified_date=date.today(), confidentiality_level="PUBLIC_INTERNAL", extracted_text=text)
    db.add(doc); db.commit(); db.refresh(doc)
    for i, c in enumerate(chunk_text(text)):
        db.add(DocumentChunk(document_id=doc.id, chunk_index=i, content=c, metadata_json={"demo": True}))
    db.commit()

automations = [
    ("Monthly Reporting Bot", "Downloads and consolidates monthly reports into a standardized workbook.", "Reporting", "Report download; Excel consolidation; validation", "RPA Team", "UiPath"),
    ("Excel Processing Automation", "Validates and processes standardized Excel workbooks using configurable business rules.", "Operations", "Excel validation; row processing; exception report", "RPA Team", "Python/UiPath"),
    ("File Download Assistant", "Downloads approved source files from configured portals and records processing status.", "Content Operations", "Browser automation; file download; status logging", "RPA Team", "Python/Playwright"),
    ("Automation Opportunity Intake", "Captures new automation ideas and routes them for RPA suitability assessment.", "Enterprise", "Intake; assessment routing; tracking", "RPA Team", "Workflow"),
]
for name, desc, function, caps, owner, tech in automations:
    if not db.query(AutomationCatalog).filter_by(name=name).first():
        db.add(AutomationCatalog(name=name, short_description=desc, detailed_description=desc + " DEMO / SYNTHETIC DATA.", business_function=function, capabilities=caps, owner=owner, technology=tech, status="ACTIVE", last_reviewed_date=date.today()))
db.commit()
db.close()
print("Seed complete")
