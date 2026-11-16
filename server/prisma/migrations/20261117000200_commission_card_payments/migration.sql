-- Hosts pay the monthly commission by card; the payment is recorded from Stripe.
ALTER TABLE "HostCommissionPayment" ADD COLUMN "stripeSessionId" TEXT;
CREATE UNIQUE INDEX "HostCommissionPayment_stripeSessionId_key" ON "HostCommissionPayment"("stripeSessionId");
