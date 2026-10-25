-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "address" TEXT NOT NULL DEFAULT '',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "fiscalYearStartMonth" INTEGER NOT NULL DEFAULT 4,
    "defaultPaymentTermsDays" INTEGER NOT NULL DEFAULT 30,
    "logoUrl" TEXT,
    "settingsJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "BusinessUnit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    CONSTRAINT "BusinessUnit_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "team" TEXT,
    "customerId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "User_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "segment" TEXT NOT NULL DEFAULT '',
    "gstin" TEXT,
    "billingAddress" TEXT NOT NULL DEFAULT '',
    "shippingAddress" TEXT NOT NULL DEFAULT '',
    "city" TEXT NOT NULL DEFAULT '',
    "state" TEXT NOT NULL DEFAULT '',
    "primaryContactName" TEXT NOT NULL DEFAULT '',
    "primaryContactEmail" TEXT NOT NULL DEFAULT '',
    "primaryContactPhone" TEXT NOT NULL DEFAULT '',
    "procurementContactName" TEXT NOT NULL DEFAULT '',
    "procurementContactEmail" TEXT NOT NULL DEFAULT '',
    "procurementContactPhone" TEXT NOT NULL DEFAULT '',
    "accountsContactName" TEXT NOT NULL DEFAULT '',
    "accountsContactEmail" TEXT NOT NULL DEFAULT '',
    "accountsContactPhone" TEXT NOT NULL DEFAULT '',
    "paymentTermsDays" INTEGER NOT NULL DEFAULT 30,
    "ownerId" TEXT,
    "businessUnitId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "notes" TEXT NOT NULL DEFAULT '',
    "tags" TEXT NOT NULL DEFAULT '',
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "importBatchId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Customer_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Quotation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "quoteDate" DATETIME NOT NULL,
    "validUntil" DATETIME,
    "amount" REAL NOT NULL,
    "ownerId" TEXT,
    "status" TEXT NOT NULL,
    "lastContactDate" DATETIME,
    "nextFollowUpDate" DATETIME,
    "lostReason" TEXT,
    "feedback" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "businessUnitId" TEXT,
    "importBatchId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SalesOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "customerPoNumber" TEXT NOT NULL DEFAULT '',
    "orderDate" DATETIME NOT NULL,
    "value" REAL NOT NULL,
    "expectedDeliveryDate" DATETIME,
    "ownerId" TEXT,
    "status" TEXT NOT NULL,
    "quotationId" TEXT,
    "delayReason" TEXT,
    "notes" TEXT NOT NULL DEFAULT '',
    "businessUnitId" TEXT,
    "importBatchId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Dispatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "challanNumber" TEXT NOT NULL,
    "committedDate" DATETIME NOT NULL,
    "dispatchDate" DATETIME,
    "deliveredDate" DATETIME,
    "status" TEXT NOT NULL,
    "podReceived" BOOLEAN NOT NULL DEFAULT false,
    "transporter" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "ownerId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "orderId" TEXT,
    "invoiceDate" DATETIME NOT NULL,
    "dueDate" DATETIME,
    "total" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "onHold" BOOLEAN NOT NULL DEFAULT false,
    "holdReason" TEXT,
    "ownerId" TEXT,
    "lastFollowUpDate" DATETIME,
    "nextFollowUpDate" DATETIME,
    "businessUnitId" TEXT,
    "importBatchId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "amount" REAL NOT NULL,
    "paymentDate" DATETIME NOT NULL,
    "reference" TEXT NOT NULL DEFAULT '',
    "mode" TEXT NOT NULL DEFAULT 'bank_transfer',
    "importBatchId" TEXT,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "CreditAdjustment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "type" TEXT NOT NULL,
    "reference" TEXT NOT NULL DEFAULT '',
    "date" DATETIME NOT NULL,
    "reason" TEXT NOT NULL DEFAULT '',
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "PaymentPromise" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "promisedDate" DATETIME NOT NULL,
    "contactName" TEXT NOT NULL,
    "recordedAt" DATETIME NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'open',
    "ownerId" TEXT,
    "createdById" TEXT,
    "importBatchId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "CollectionActivity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "occurredAt" DATETIME NOT NULL,
    "channel" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "customerResponse" TEXT NOT NULL DEFAULT '',
    "nextStep" TEXT NOT NULL DEFAULT '',
    "nextFollowUpDate" DATETIME,
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Issue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "orderId" TEXT,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "reportedBy" TEXT NOT NULL DEFAULT '',
    "source" TEXT NOT NULL DEFAULT 'internal',
    "ownerId" TEXT,
    "team" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "dueDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'open',
    "rootCause" TEXT,
    "resolutionNotes" TEXT,
    "missingEvidence" TEXT,
    "nextAction" TEXT,
    "blocksPayment" BOOLEAN NOT NULL DEFAULT false,
    "customerConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "unblockConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "customerId" TEXT,
    "invoiceId" TEXT,
    "orderId" TEXT,
    "issueId" TEXT,
    "ownerId" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "dueDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdById" TEXT,
    "completedById" TEXT,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ActionItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "customerId" TEXT,
    "invoiceId" TEXT,
    "orderId" TEXT,
    "issueId" TEXT,
    "quotationId" TEXT,
    "taskId" TEXT,
    "promiseId" TEXT,
    "amount" REAL,
    "ownerId" TEXT,
    "dueDate" DATETIME,
    "priority" TEXT NOT NULL,
    "priorityScore" INTEGER NOT NULL,
    "priorityReason" TEXT NOT NULL,
    "recommendedAction" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "resolution" TEXT,
    "systemClosed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" DATETIME,
    "completedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ActivityEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "customerId" TEXT,
    "kind" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'user',
    "visibility" TEXT NOT NULL DEFAULT 'internal',
    "message" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "customerId" TEXT,
    "invoiceId" TEXT,
    "orderId" TEXT,
    "issueId" TEXT,
    "type" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "storageKey" TEXT,
    "sharedWithCustomer" BOOLEAN NOT NULL DEFAULT false,
    "uploadedById" TEXT,
    "uploadedByPortal" BOOLEAN NOT NULL DEFAULT false,
    "isSynthetic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ImportBatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'committed',
    "createdById" TEXT,
    "summaryJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "BusinessUnit_orgId_idx" ON "BusinessUnit"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_orgId_idx" ON "User"("orgId");

-- CreateIndex
CREATE INDEX "Customer_orgId_idx" ON "Customer"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_orgId_code_key" ON "Customer"("orgId", "code");

-- CreateIndex
CREATE INDEX "Quotation_orgId_customerId_idx" ON "Quotation"("orgId", "customerId");

-- CreateIndex
CREATE UNIQUE INDEX "Quotation_orgId_number_key" ON "Quotation"("orgId", "number");

-- CreateIndex
CREATE INDEX "SalesOrder_orgId_customerId_idx" ON "SalesOrder"("orgId", "customerId");

-- CreateIndex
CREATE UNIQUE INDEX "SalesOrder_orgId_number_key" ON "SalesOrder"("orgId", "number");

-- CreateIndex
CREATE INDEX "Dispatch_orgId_orderId_idx" ON "Dispatch"("orgId", "orderId");

-- CreateIndex
CREATE INDEX "Invoice_orgId_customerId_idx" ON "Invoice"("orgId", "customerId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_orgId_number_key" ON "Invoice"("orgId", "number");

-- CreateIndex
CREATE INDEX "Payment_orgId_invoiceId_idx" ON "Payment"("orgId", "invoiceId");

-- CreateIndex
CREATE INDEX "CreditAdjustment_orgId_invoiceId_idx" ON "CreditAdjustment"("orgId", "invoiceId");

-- CreateIndex
CREATE INDEX "PaymentPromise_orgId_invoiceId_idx" ON "PaymentPromise"("orgId", "invoiceId");

-- CreateIndex
CREATE INDEX "CollectionActivity_orgId_customerId_idx" ON "CollectionActivity"("orgId", "customerId");

-- CreateIndex
CREATE INDEX "Issue_orgId_customerId_idx" ON "Issue"("orgId", "customerId");

-- CreateIndex
CREATE UNIQUE INDEX "Issue_orgId_number_key" ON "Issue"("orgId", "number");

-- CreateIndex
CREATE INDEX "Task_orgId_ownerId_idx" ON "Task"("orgId", "ownerId");

-- CreateIndex
CREATE INDEX "ActionItem_orgId_status_idx" ON "ActionItem"("orgId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ActionItem_orgId_key_key" ON "ActionItem"("orgId", "key");

-- CreateIndex
CREATE INDEX "ActivityEvent_orgId_entityType_entityId_idx" ON "ActivityEvent"("orgId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "ActivityEvent_orgId_customerId_idx" ON "ActivityEvent"("orgId", "customerId");

-- CreateIndex
CREATE INDEX "Document_orgId_customerId_idx" ON "Document"("orgId", "customerId");

-- CreateIndex
CREATE INDEX "ImportBatch_orgId_idx" ON "ImportBatch"("orgId");
