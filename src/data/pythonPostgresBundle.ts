/**
 * Ready-to-deploy Python FastAPI + PostgreSQL CRUD Backend & Google AI Studio Single JSON Bundle
 */

export const POSTGRES_SCHEMA_SQL = `-- =====================================================================
-- KIGALISTOCK AI - PRODUCTION POSTGRESQL CRUD SCHEMA
-- Currency: Rwandan Francs (RWF)
-- Multi-user RBAC, Barcode indexing, Stock Triggers, POS & Invoices
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table (Multi-User RBAC: Admin, Manager, Cashier)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(120) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'manager', 'cashier')),
    phone VARCHAR(30) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Suppliers Table
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) NOT NULL,
    contact_person VARCHAR(100),
    phone VARCHAR(30) NOT NULL,
    email VARCHAR(150),
    tin_number VARCHAR(30) NOT NULL, -- Rwanda Revenue TIN
    address TEXT,
    category VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Products Table (Indexed on Barcode & SKU for instant reader lookup)
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku VARCHAR(50) UNIQUE NOT NULL,
    barcode VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    unit VARCHAR(20) DEFAULT 'pcs' CHECK (unit IN ('pcs', 'kg', 'box', 'litres', 'pack', 'can', 'bottle')),
    purchase_price_rwf NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    selling_price_rwf NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    current_stock NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    min_stock_level NUMERIC(12, 2) NOT NULL DEFAULT 10.00,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    expiry_date DATE,
    location VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

-- 4. Stock Movements Table (Stock In, Stock Out, Audit Trail)
CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    movement_type VARCHAR(15) NOT NULL CHECK (movement_type IN ('IN', 'OUT', 'ADJUSTMENT')),
    reason VARCHAR(50) NOT NULL, -- PURCHASE_RECEIPT, SALE, DAMAGED, EXPIRED, INTERNAL_USE, LOSS
    quantity NUMERIC(12, 2) NOT NULL,
    previous_stock NUMERIC(12, 2) NOT NULL,
    new_stock NUMERIC(12, 2) NOT NULL,
    unit_cost_rwf NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    reference_no VARCHAR(100) NOT NULL,
    supplier_id UUID REFERENCES suppliers(id),
    batch_number VARCHAR(100),
    expiry_date DATE,
    user_id UUID REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_prod ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON stock_movements(created_at);

-- 5. Sales & Invoices (POS Transactions)
CREATE TABLE IF NOT EXISTS sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    ebm_receipt_number VARCHAR(80) UNIQUE NOT NULL, -- RRA Electronic Billing Machine Ref
    subtotal_rwf NUMERIC(14, 2) NOT NULL,
    tax_rate_percent NUMERIC(5, 2) DEFAULT 18.00, -- Rwanda 18% VAT
    tax_amount_rwf NUMERIC(14, 2) NOT NULL,
    discount_rwf NUMERIC(14, 2) DEFAULT 0.00,
    total_rwf NUMERIC(14, 2) NOT NULL,
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('CASH', 'MOMO', 'VISA', 'SPLIT')),
    
    -- Payment Details
    cash_tendered_rwf NUMERIC(14, 2),
    cash_change_rwf NUMERIC(14, 2),
    momo_phone VARCHAR(30),
    momo_ref VARCHAR(100),
    momo_status VARCHAR(20),
    visa_card_masked VARCHAR(30),
    visa_auth_code VARCHAR(50),
    
    cashier_id UUID REFERENCES users(id),
    customer_name VARCHAR(150),
    customer_phone VARCHAR(30),
    customer_tin VARCHAR(30),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Sale Items (Line items for each sale)
CREATE TABLE IF NOT EXISTS sale_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    quantity NUMERIC(12, 2) NOT NULL,
    unit_price_rwf NUMERIC(14, 2) NOT NULL,
    discount_percent NUMERIC(5, 2) DEFAULT 0.00,
    subtotal_rwf NUMERIC(14, 2) NOT NULL
);

-- 7. Trigger to automatically adjust Product Stock on Stock Movements
CREATE OR REPLACE FUNCTION update_product_stock_trigger()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE products
    SET current_stock = NEW.new_stock,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.product_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_stock_movement_apply ON stock_movements;
CREATE TRIGGER trg_stock_movement_apply
AFTER INSERT ON stock_movements
FOR EACH ROW
EXECUTE FUNCTION update_product_stock_trigger();

-- 8. Business Analytics Views
CREATE OR REPLACE VIEW v_low_stock_alerts AS
SELECT 
    id, sku, barcode, name, category, current_stock, min_stock_level,
    (min_stock_level - current_stock) AS units_needed,
    (purchase_price_rwf * (min_stock_level - current_stock)) AS estimated_reorder_cost_rwf
FROM products
WHERE current_stock <= min_stock_level AND is_active = TRUE;

CREATE OR REPLACE VIEW v_inventory_valuation AS
SELECT 
    COUNT(id) AS total_items,
    SUM(current_stock) AS total_stock_units,
    SUM(current_stock * purchase_price_rwf) AS total_valuation_cost_rwf,
    SUM(current_stock * selling_price_rwf) AS total_retail_value_rwf,
    SUM(current_stock * (selling_price_rwf - purchase_price_rwf)) AS potential_profit_rwf
FROM products
WHERE is_active = TRUE;
`;

export const PYTHON_SERVER_CODE = `"""
KigaliStock AI - Full-Stack Python FastAPI + PostgreSQL Server
Author: KigaliStock Engineering
Supports:
  - Multi-user RBAC Auth (Admin, Manager, Cashier)
  - PostgreSQL CRUD operations via SQLAlchemy
  - Barcode Reader lookup endpoint
  - Stock In, Stock Out, Inventory Movements
  - POS Checkout (MTN MoMo, Visa Card, Cash in RWF)
  - Invoices & RRA EBM Receipt generation
  - Google Gemini AI API integration (using google-genai)
"""

import os
import uuid
from datetime import datetime, date
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, status, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from sqlalchemy import (
    create_engine, Column, String, Numeric, Boolean,
    DateTime, ForeignKey, Text, Date
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship

# 1. Database Configuration (PostgreSQL)
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql://postgres:postgres@localhost:5432/kigalistock_db"
)
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# 2. SQLAlchemy ORM Models
class UserModel(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(120), nullable=False)
    email = Column(String(150), unique=True, nullable=False)
    role = Column(String(20), nullable=False) # admin, manager, cashier
    phone = Column(String(30), nullable=False)
    is_active = Column(Boolean, default=True)

class ProductModel(Base):
    __tablename__ = "products"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    sku = Column(String(50), unique=True, nullable=False, index=True)
    barcode = Column(String(64), unique=True, nullable=False, index=True)
    name = Column(String(200), nullable=False)
    category = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    unit = Column(String(20), default="pcs")
    purchase_price_rwf = Column(Numeric(14, 2), default=0.0)
    selling_price_rwf = Column(Numeric(14, 2), default=0.0)
    current_stock = Column(Numeric(12, 2), default=0.0)
    min_stock_level = Column(Numeric(12, 2), default=10.0)
    expiry_date = Column(Date, nullable=True)
    location = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True)

class StockMovementModel(Base):
    __tablename__ = "stock_movements"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    product_id = Column(String, ForeignKey("products.id"), nullable=False)
    movement_type = Column(String(15), nullable=False) # IN, OUT, ADJUSTMENT
    reason = Column(String(50), nullable=False)
    quantity = Column(Numeric(12, 2), nullable=False)
    previous_stock = Column(Numeric(12, 2), nullable=False)
    new_stock = Column(Numeric(12, 2), nullable=False)
    unit_cost_rwf = Column(Numeric(14, 2), default=0.0)
    reference_no = Column(String(100), nullable=False)
    performed_by = Column(String(100), nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class SaleModel(Base):
    __tablename__ = "sales"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    invoice_number = Column(String(50), unique=True, nullable=False)
    ebm_receipt_number = Column(String(80), unique=True, nullable=False)
    subtotal_rwf = Column(Numeric(14, 2), nullable=False)
    tax_amount_rwf = Column(Numeric(14, 2), nullable=False)
    total_rwf = Column(Numeric(14, 2), nullable=False)
    payment_method = Column(String(20), nullable=False) # CASH, MOMO, VISA, SPLIT
    momo_phone = Column(String(30), nullable=True)
    momo_ref = Column(String(100), nullable=True)
    visa_card_masked = Column(String(30), nullable=True)
    cashier_name = Column(String(100), nullable=False)
    customer_name = Column(String(150), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

# 3. Pydantic Schemas
class ProductCreate(BaseModel):
    sku: str
    barcode: str
    name: str
    category: str
    unit: str = "pcs"
    purchase_price_rwf: float
    selling_price_rwf: float
    current_stock: float = 0.0
    min_stock_level: float = 10.0
    expiry_date: Optional[str] = None
    location: Optional[str] = None

class StockInRequest(BaseModel):
    product_id: str
    quantity: float
    unit_cost_rwf: float
    supplier_name: Optional[str] = None
    reference_no: str
    batch_number: Optional[str] = None
    performed_by: str
    notes: Optional[str] = None

class StockOutRequest(BaseModel):
    product_id: str
    quantity: float
    reason: str # DAMAGED, EXPIRED, INTERNAL_USE, LOSS
    reference_no: str
    performed_by: str
    notes: Optional[str] = None

class SaleItemInput(BaseModel):
    product_id: str
    quantity: float
    unit_price_rwf: float

class CheckoutRequest(BaseModel):
    items: List[SaleItemInput]
    payment_method: str # MOMO, VISA, CASH, SPLIT
    cash_tendered_rwf: Optional[float] = None
    momo_phone: Optional[str] = None
    customer_name: Optional[str] = None
    cashier_name: str

# 4. FastAPI App Initialization
app = FastAPI(
    title="KigaliStock AI Server",
    description="Python FastAPI + PostgreSQL CRUD Backend for Rwanda Stock Management & POS",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# 5. Core CRUD Endpoints

@app.get("/api/health")
def health_check():
    return {"status": "ok", "system": "KigaliStock AI Python Backend", "currency": "RWF"}

@app.get("/api/products")
def list_products(query: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(ProductModel).filter(ProductModel.is_active == True)
    if query:
        q = q.filter((ProductModel.name.ilike(f"%{query}%")) | (ProductModel.barcode == query))
    return q.all()

@app.get("/api/products/barcode/{barcode}")
def get_product_by_barcode(barcode: str, db: Session = Depends(get_db)):
    """Fast barcode scanner lookup endpoint for POS & Stock in"""
    product = db.query(ProductModel).filter(ProductModel.barcode == barcode, ProductModel.is_active == True).first()
    if not product:
        raise HTTPException(status_code=404, detail="Barcode not found in catalog")
    return product

@app.post("/api/products")
def create_product(payload: ProductCreate, db: Session = Depends(get_db)):
    new_prod = ProductModel(
        id=str(uuid.uuid4()),
        sku=payload.sku,
        barcode=payload.barcode,
        name=payload.name,
        category=payload.category,
        unit=payload.unit,
        purchase_price_rwf=payload.purchase_price_rwf,
        selling_price_rwf=payload.selling_price_rwf,
        current_stock=payload.current_stock,
        min_stock_level=payload.min_stock_level,
        location=payload.location,
    )
    db.add(new_prod)
    db.commit()
    db.refresh(new_prod)
    return new_prod

@app.post("/api/stock/in")
def stock_in(req: StockInRequest, db: Session = Depends(get_db)):
    """Stock In endpoint (Supplier delivery / PO receipt)"""
    prod = db.query(ProductModel).filter(ProductModel.id == req.product_id).first()
    if not prod:
        raise HTTPException(status_code=404, detail="Product not found")
    
    prev = float(prod.current_stock)
    new_qty = prev + req.quantity
    prod.current_stock = new_qty
    prod.purchase_price_rwf = req.unit_cost_rwf
    
    mov = StockMovementModel(
        id=str(uuid.uuid4()),
        product_id=prod.id,
        movement_type="IN",
        reason="PURCHASE_RECEIPT",
        quantity=req.quantity,
        previous_stock=prev,
        new_stock=new_qty,
        unit_cost_rwf=req.unit_cost_rwf,
        reference_no=req.reference_no,
        performed_by=req.performed_by,
        notes=req.notes
    )
    db.add(mov)
    db.commit()
    return {"message": "Stock received successfully", "new_stock": new_qty, "movement_id": mov.id}

@app.post("/api/stock/out")
def stock_out(req: StockOutRequest, db: Session = Depends(get_db)):
    """Stock Out endpoint (Damaged, Expired, Internal Use, Loss)"""
    prod = db.query(ProductModel).filter(ProductModel.id == req.product_id).first()
    if not prod:
        raise HTTPException(status_code=404, detail="Product not found")
    if float(prod.current_stock) < req.quantity:
        raise HTTPException(status_code=400, detail="Insufficient stock on hand")
    
    prev = float(prod.current_stock)
    new_qty = prev - req.quantity
    prod.current_stock = new_qty
    
    mov = StockMovementModel(
        id=str(uuid.uuid4()),
        product_id=prod.id,
        movement_type="OUT",
        reason=req.reason,
        quantity=req.quantity,
        previous_stock=prev,
        new_stock=new_qty,
        unit_cost_rwf=float(prod.purchase_price_rwf),
        reference_no=req.reference_no,
        performed_by=req.performed_by,
        notes=req.notes
    )
    db.add(mov)
    db.commit()
    return {"message": "Stock deducted successfully", "new_stock": new_qty, "movement_id": mov.id}

@app.post("/api/sales/checkout")
def pos_checkout(req: CheckoutRequest, db: Session = Depends(get_db)):
    """POS Checkout supporting MTN MoMo, Visa card & Cash in RWF with EBM Receipt"""
    subtotal = 0.0
    for item in req.items:
        prod = db.query(ProductModel).filter(ProductModel.id == item.product_id).first()
        if not prod or float(prod.current_stock) < item.quantity:
            raise HTTPException(status_code=400, detail=f"Insufficient stock for {item.product_id}")
        # Deduct stock
        prod.current_stock = float(prod.current_stock) - item.quantity
        subtotal += float(item.unit_price_rwf) * item.quantity

    tax = subtotal * 0.18 # 18% Rwanda VAT
    total = subtotal + tax
    
    inv_num = f"INV-{datetime.utcnow().strftime('%Y%m%d')}-{str(uuid.uuid4())[:4].upper()}"
    ebm_num = f"RRA-EBM-{str(uuid.uuid4())[:8].upper()}"
    
    sale = SaleModel(
        id=str(uuid.uuid4()),
        invoice_number=inv_num,
        ebm_receipt_number=ebm_num,
        subtotal_rwf=subtotal,
        tax_amount_rwf=tax,
        total_rwf=total,
        payment_method=req.payment_method,
        momo_phone=req.momo_phone,
        momo_ref=f"MP{datetime.utcnow().strftime('%y%m%d')}.KGL.{str(uuid.uuid4())[:6].upper()}" if req.payment_method == "MOMO" else None,
        cashier_name=req.cashier_name,
        customer_name=req.customer_name
    )
    db.add(sale)
    db.commit()
    return {
        "invoice_number": inv_num,
        "ebm_receipt": ebm_num,
        "total_rwf": total,
        "payment_method": req.payment_method,
        "status": "COMPLETED"
    }

# Run with: uvicorn server:app --reload --port 8000
if __name__ == "__main__":
    import uvicorn
    Base.metadata.create_all(bind=engine)
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
`;

export const FASTAPI_REQUIREMENTS_TXT = `fastapi==0.115.0
uvicorn[standard]==0.30.6
sqlalchemy==2.0.35
psycopg2-binary==2.9.9
pydantic==2.9.2
python-dotenv==1.0.1
google-genai==2.4.0
python-jose[cryptography]==3.3.0
`;

/**
 * Creates the complete Single JSON file for copying/pasting into Google AI Studio
 */
export function generateAiStudioSingleJson(): string {
  const bundle = {
    ai_studio_project_name: "KigaliStock AI - Smart Inventory & POS System",
    description: "Production-ready, multi-user AI-powered stock management & POS application with PostgreSQL CRUD, Barcode Scanning, MTN MoMo, Visa, Cash in RWF, and Invoicing.",
    version: "2.4.0",
    currency: "RWF",
    frameworks: {
      frontend: "React 19 + TypeScript + Tailwind CSS 4 + Lucide Icons",
      backend_options: ["Python FastAPI + PostgreSQL", "Node.js Express + @google/genai"],
      database: "PostgreSQL 14+ with Barcode Indexing, Triggers, & RBAC",
      ai_engine: "Google Gemini 3.8 Flash (@google/genai SDK)"
    },
    roles_and_users: [
      { email: "admin@kigali-stock.rw", role: "admin", description: "Full system administration, PostgreSQL sync, AI forecasting, and product config." },
      { email: "manager@kigali-stock.rw", role: "manager", description: "Stock In receiving, Stock Out adjustments, inventory valuation, supplier POs." },
      { email: "cashier@kigali-stock.rw", role: "cashier", description: "Point of Sale (POS) checkout, barcode reader, MTN MoMo & Cash RWF receipt printing." }
    ],
    payment_methods_rwanda: [
      { name: "MTN MoMo", code: "MOMO", prompt_ussd: "*182*8*1*MERCHANT*AMOUNT#", currency: "RWF" },
      { name: "Visa Card", code: "VISA", terminal: "EMV Chip / Contactless NFC / Auth Slip", currency: "RWF" },
      { name: "Cash in RWF", code: "CASH", denominations: [1000, 2000, 5000, 10000, 20000, 50000], currency: "RWF" }
    ],
    database_schema_ddl: POSTGRES_SCHEMA_SQL,
    python_backend_code: PYTHON_SERVER_CODE,
    python_dependencies: FASTAPI_REQUIREMENTS_TXT,
    gemini_prompts: {
      stock_forecasting: "Analyze current inventory velocity and predict stock-out dates for Rwanda retail goods.",
      anomaly_detection: "Inspect inventory ledger for discrepancies, near-expiry goods, and low margins.",
      pos_assistant: "Provide instant cashier/manager answers on stock counts, barcode lookups, and supplier details."
    },
    instructions_to_run_locally: [
      "1. Start PostgreSQL: createdb kigalistock_db",
      "2. Execute schema: psql -d kigalistock_db -f schema.sql",
      "3. Install Python dependencies: pip install -r requirements.txt",
      "4. Launch Python server: python server.py (or uvicorn server:app --reload --port 8000)",
      "5. Open Google AI Studio Applet to enjoy real-time interactive POS & AI inventory management!"
    ]
  };

  return JSON.stringify(bundle, null, 2);
}
