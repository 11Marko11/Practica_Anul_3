-- Months whose commission a host has paid to Rent Motors (marked by the admin).
CREATE TABLE "HostCommissionPayment" (
    "id" TEXT NOT NULL,
    "hostId" INTEGER NOT NULL,
    "month" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HostCommissionPayment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "HostCommissionPayment_hostId_month_key" ON "HostCommissionPayment"("hostId", "month");
ALTER TABLE "HostCommissionPayment" ADD CONSTRAINT "HostCommissionPayment_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "Host"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- Not readable through Supabase's public Data API (see the first migration).
ALTER TABLE "HostCommissionPayment" ENABLE ROW LEVEL SECURITY;
