-- CreateIndex
CREATE INDEX "res_car_time_idx" ON "Reservation"("tenantId", "carId", "startAt", "endAt");
