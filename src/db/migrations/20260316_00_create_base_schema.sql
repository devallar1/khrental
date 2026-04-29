-- Base schema migration for PostgreSQL
-- Creates all core tables (excluding tenant tables created by 20260317_01)
-- Idempotent: uses CREATE TABLE IF NOT EXISTS

BEGIN;

-- ============================================================
-- Helper function: update_updated_at_column (used by triggers)
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updatedat = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updatedat = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_timestamps()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.createdat IS NULL THEN
        NEW.createdat = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_properties_timestamps()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.createdat IS NULL THEN
        NEW.createdat = NOW();
    END IF;
    NEW.updatedat = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- app_users
-- ============================================================
CREATE TABLE IF NOT EXISTS app_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    auth_id UUID,
    email VARCHAR(255),
    name VARCHAR(255),
    role VARCHAR(100),
    user_type VARCHAR(100),
    contact_details JSONB,
    skills TEXT[],
    availability JSONB,
    notes TEXT,
    status VARCHAR(50),
    id_copy_url TEXT,
    invited BOOLEAN DEFAULT FALSE,
    active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMPTZ,
    createdat TIMESTAMPTZ DEFAULT NOW(),
    updatedat TIMESTAMPTZ DEFAULT NOW(),
    associated_property_ids UUID[],
    permanent_address TEXT,
    national_id VARCHAR(100)
);

-- ============================================================
-- properties
-- ============================================================
CREATE TABLE IF NOT EXISTS properties (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255),
    address TEXT,
    unitconfiguration VARCHAR(255),
    rentalvalues JSONB,
    checklistitems TEXT[],
    terms JSONB,
    images TEXT[],
    description TEXT,
    status VARCHAR(100) DEFAULT 'available',
    createdat TIMESTAMPTZ DEFAULT NOW(),
    updatedat TIMESTAMPTZ DEFAULT NOW(),
    availablefrom TIMESTAMPTZ,
    propertytype VARCHAR(100),
    squarefeet DECIMAL(18,2),
    yearbuilt INTEGER,
    amenities TEXT[],
    bank_name VARCHAR(255),
    bank_branch VARCHAR(255),
    bank_account_number VARCHAR(255),
    electricity_rate DECIMAL(18,2),
    water_rate DECIMAL(18,2),
    latitude DECIMAL(10,7),
    longitude DECIMAL(10,7)
);

-- ============================================================
-- property_units
-- ============================================================
CREATE TABLE IF NOT EXISTS property_units (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    propertyid UUID REFERENCES properties(id),
    unitnumber VARCHAR(100) NOT NULL,
    floor VARCHAR(100),
    bedrooms INTEGER,
    bathrooms INTEGER,
    squarefeet DECIMAL(18,2),
    description VARCHAR(500),
    rentalvalues JSONB,
    status VARCHAR(50) DEFAULT 'available',
    createdat TIMESTAMPTZ DEFAULT NOW(),
    updatedat TIMESTAMPTZ DEFAULT NOW(),
    bank_name VARCHAR(255),
    bank_branch VARCHAR(255),
    bank_account_number VARCHAR(255),
    terms JSONB
);

-- ============================================================
-- agreement_templates
-- ============================================================
CREATE TABLE IF NOT EXISTS agreement_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255),
    language VARCHAR(100) DEFAULT 'English',
    content TEXT,
    version VARCHAR(50) DEFAULT '1.0',
    createdat TIMESTAMPTZ DEFAULT NOW(),
    updatedat TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- agreements
-- ============================================================
CREATE TABLE IF NOT EXISTS agreements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    templateid UUID REFERENCES agreement_templates(id),
    renteeid UUID REFERENCES app_users(id),
    propertyid UUID REFERENCES properties(id),
    unitid UUID REFERENCES property_units(id),
    status VARCHAR(50) DEFAULT 'draft',
    startdate DATE,
    enddate DATE,
    rentamount DECIMAL(18,2),
    depositamount DECIMAL(18,2),
    documenturl TEXT,
    signeddocumenturl TEXT,
    signed_document_url TEXT,
    signatureurl TEXT,
    signature_pdf_url TEXT,
    pdfurl TEXT,
    evia_document_id VARCHAR(255),
    eviasignreference UUID,
    title VARCHAR(255),
    content TEXT,
    processedcontent TEXT,
    terms JSONB,
    notes TEXT,
    needs_document_generation BOOLEAN DEFAULT FALSE,
    signature_status TEXT,
    signature_sent_at TIMESTAMPTZ,
    signature_completed_at TIMESTAMPTZ,
    signatories_status JSONB,
    signature_request_id TEXT,
    signeddate TIMESTAMPTZ,
    cancellation_reason TEXT,
    createdat TIMESTAMPTZ DEFAULT NOW(),
    updatedat TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- invoices
-- ============================================================
CREATE TABLE IF NOT EXISTS invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    renteeid UUID REFERENCES app_users(id),
    propertyid UUID REFERENCES properties(id),
    billingperiod VARCHAR(100),
    components JSONB,
    totalamount DECIMAL(18,2),
    status VARCHAR(50) DEFAULT 'pending',
    paymentproofurl TEXT,
    paymentdate TIMESTAMPTZ,
    duedate DATE,
    notes TEXT,
    createdat TIMESTAMPTZ DEFAULT NOW(),
    updatedat TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- payments
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    invoiceid UUID REFERENCES invoices(id),
    amount DECIMAL(18,2),
    paymentmethod VARCHAR(100),
    transactionreference VARCHAR(255),
    paymentdate TIMESTAMPTZ,
    status VARCHAR(50),
    notes TEXT,
    createdat TIMESTAMPTZ DEFAULT NOW(),
    updatedat TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- maintenance_requests
-- ============================================================
CREATE TABLE IF NOT EXISTS maintenance_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    propertyid UUID REFERENCES properties(id),
    renteeid UUID REFERENCES app_users(id),
    title TEXT,
    description TEXT,
    priority TEXT,
    status TEXT DEFAULT 'pending',
    requesttype TEXT,
    createdat TIMESTAMPTZ DEFAULT NOW(),
    updatedat TIMESTAMPTZ DEFAULT NOW(),
    assignedto UUID REFERENCES app_users(id),
    assignedat TIMESTAMPTZ,
    startedat TIMESTAMPTZ,
    completedat TIMESTAMPTZ,
    cancelledat TIMESTAMPTZ,
    cancellationreason TEXT,
    notes TEXT
);

-- ============================================================
-- maintenance_request_images
-- ============================================================
CREATE TABLE IF NOT EXISTS maintenance_request_images (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    maintenance_request_id UUID REFERENCES maintenance_requests(id),
    image_url TEXT,
    image_type TEXT,
    uploaded_by UUID REFERENCES app_users(id),
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    description TEXT
);

-- ============================================================
-- maintenance_request_comments
-- ============================================================
CREATE TABLE IF NOT EXISTS maintenance_request_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    maintenance_request_id UUID REFERENCES maintenance_requests(id),
    user_id UUID REFERENCES app_users(id),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- notifications
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES app_users(id),
    message TEXT,
    createdat TIMESTAMPTZ DEFAULT NOW(),
    is_read BOOLEAN DEFAULT FALSE,
    updatedat TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- webhook_events
-- ============================================================
CREATE TABLE IF NOT EXISTS webhook_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_type TEXT,
    request_id UUID,
    user_name TEXT,
    user_email TEXT,
    subject TEXT,
    event_id INTEGER,
    event_time TIMESTAMPTZ,
    raw_data JSONB,
    createdat TIMESTAMPTZ DEFAULT NOW(),
    updatedat TIMESTAMPTZ DEFAULT NOW(),
    processed BOOLEAN DEFAULT FALSE
);

-- ============================================================
-- utility_readings
-- ============================================================
CREATE TABLE IF NOT EXISTS utility_readings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    renteeid UUID REFERENCES app_users(id),
    propertyid UUID REFERENCES properties(id),
    utilitytype VARCHAR(100),
    previousreading DECIMAL(18,2),
    currentreading DECIMAL(18,2),
    readingdate DATE,
    photourl TEXT,
    calculatedbill DECIMAL(18,2),
    status VARCHAR(50) DEFAULT 'pending',
    createdat TIMESTAMPTZ DEFAULT NOW(),
    updatedat TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- utility_configs
-- ============================================================
CREATE TABLE IF NOT EXISTS utility_configs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    utilitytype VARCHAR(100),
    billingtype VARCHAR(100),
    rate DECIMAL(18,2),
    fixedamount DECIMAL(18,2),
    createdat TIMESTAMPTZ DEFAULT NOW(),
    updatedat TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- action_records
-- ============================================================
CREATE TABLE IF NOT EXISTS action_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    propertyid UUID REFERENCES properties(id),
    renteeid UUID REFERENCES app_users(id),
    actiontype VARCHAR(100),
    amount DECIMAL(18,2),
    status VARCHAR(50),
    date DATE,
    comments TEXT,
    relateddocs TEXT[],
    createdat TIMESTAMPTZ DEFAULT NOW(),
    updatedat TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- scheduled_tasks
-- ============================================================
CREATE TABLE IF NOT EXISTS scheduled_tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    propertyid UUID REFERENCES properties(id),
    tasktype VARCHAR(100),
    frequency VARCHAR(100),
    description TEXT,
    assignedteam VARCHAR(255),
    lastcompleteddate TIMESTAMPTZ,
    nextduedate TIMESTAMPTZ,
    status VARCHAR(50),
    notes TEXT,
    createdat TIMESTAMPTZ DEFAULT NOW(),
    updatedat TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- task_assignments
-- ============================================================
CREATE TABLE IF NOT EXISTS task_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    teammemberid UUID REFERENCES app_users(id),
    tasktype VARCHAR(100),
    tasktitle VARCHAR(255),
    taskdescription TEXT,
    status VARCHAR(50),
    priority VARCHAR(50),
    duedate TIMESTAMPTZ,
    completiondate TIMESTAMPTZ,
    notes TEXT,
    relatedentitytype VARCHAR(100),
    relatedentityid UUID,
    createdat TIMESTAMPTZ DEFAULT NOW(),
    updatedat TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- letter_templates
-- ============================================================
CREATE TABLE IF NOT EXISTS letter_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type VARCHAR(100),
    subject VARCHAR(255),
    content TEXT,
    language VARCHAR(100),
    version VARCHAR(50),
    createdat TIMESTAMPTZ DEFAULT NOW(),
    updatedat TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- sent_letters
-- ============================================================
CREATE TABLE IF NOT EXISTS sent_letters (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    templateid UUID REFERENCES letter_templates(id),
    renteeid UUID REFERENCES app_users(id),
    propertyid UUID REFERENCES properties(id),
    sentdate TIMESTAMPTZ,
    channel VARCHAR(100),
    status VARCHAR(50),
    content TEXT,
    createdat TIMESTAMPTZ DEFAULT NOW(),
    updatedat TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- cameras
-- ============================================================
CREATE TABLE IF NOT EXISTS cameras (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    propertyid UUID REFERENCES properties(id),
    locationdescription TEXT,
    cameratype VARCHAR(100),
    installationdetails TEXT,
    datapackageinfo JSONB,
    status VARCHAR(50),
    createdat TIMESTAMPTZ DEFAULT NOW(),
    updatedat TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- camera_monitoring
-- ============================================================
CREATE TABLE IF NOT EXISTS camera_monitoring (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    cameraid UUID REFERENCES cameras(id),
    monitoringdate DATE,
    statusupdate VARCHAR(255),
    notes TEXT,
    createdat TIMESTAMPTZ DEFAULT NOW(),
    updatedat TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS ix_properties_status ON properties (status);
CREATE INDEX IF NOT EXISTS ix_property_units_propertyid ON property_units (propertyid);
CREATE UNIQUE INDEX IF NOT EXISTS ux_property_units_propertyid_unitnumber ON property_units (propertyid, unitnumber);
CREATE INDEX IF NOT EXISTS ix_agreements_propertyid ON agreements (propertyid);
CREATE INDEX IF NOT EXISTS ix_agreements_renteeid ON agreements (renteeid);
CREATE INDEX IF NOT EXISTS ix_agreements_status ON agreements (status);
CREATE INDEX IF NOT EXISTS ix_invoices_propertyid ON invoices (propertyid);
CREATE INDEX IF NOT EXISTS ix_invoices_renteeid ON invoices (renteeid);
CREATE INDEX IF NOT EXISTS ix_maintenance_requests_propertyid ON maintenance_requests (propertyid);
CREATE INDEX IF NOT EXISTS ix_maintenance_requests_renteeid ON maintenance_requests (renteeid);
CREATE INDEX IF NOT EXISTS ix_utility_readings_propertyid ON utility_readings (propertyid);
CREATE INDEX IF NOT EXISTS ix_utility_readings_renteeid ON utility_readings (renteeid);
CREATE INDEX IF NOT EXISTS ix_action_records_propertyid ON action_records (propertyid);
CREATE INDEX IF NOT EXISTS ix_task_assignments_teammemberid ON task_assignments (teammemberid);
CREATE INDEX IF NOT EXISTS ix_cameras_propertyid ON cameras (propertyid);
CREATE INDEX IF NOT EXISTS ix_notifications_user_id ON notifications (user_id);
CREATE INDEX IF NOT EXISTS ix_payments_invoiceid ON payments (invoiceid);

-- ============================================================
-- Constraints
-- ============================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'utility_readings_status_check'
    ) THEN
        ALTER TABLE utility_readings
            ADD CONSTRAINT utility_readings_status_check
            CHECK (status IN ('pending', 'verified', 'billed', 'disputed', 'approved', 'completed', 'rejected', 'cancelled'));
    END IF;
END $$;

COMMIT;
