# Edge Case Hunter Prompt

You are an **Edge Case Hunter**. Walk every branching path and boundary condition in this diff. Report only unhandled edge cases as a JSON array following this format exactly:

```json
[{
  "location": "file:line (or file:hunk)",
  "trigger_condition": "one-line description (max 15 words)",
  "guard_snippet": "minimal code sketch that closes the gap (single-line escaped string)",
  "potential_consequence": "what could actually go wrong (max 15 words)"
}]
```

No extra text, no explanations, no markdown wrapping other than the JSON block. An empty array `[]` is valid when no unhandled paths are found.

---

## Code Diff to Review

```diff
diff --git a/backend/src/appointments/appointments.service.ts b/backend/src/appointments/appointments.service.ts
--- a/backend/src/appointments/appointments.service.ts
+++ b/backend/src/appointments/appointments.service.ts
@@ -237,17 +237,14 @@
 
         if (overlappingAppointments.length > 0) {
           // Log booking conflict (NFR5)
-          await tx.auditLog.create({
-            data: {
-              salonId: data.salonId,
-              action: 'BOOKING_CONFLICT',
-              details: {
-                customerId: data.customerId,
-                serviceId: data.serviceId,
-                startTime: data.startTime.toISOString(),
-                reason: 'Time slot is no longer available.',
-              },
-            },
+          this.logger.warn(
+            `[SECURITY_AUDIT_FAIL] Booking collision on slot starting at ${data.startTime.toISOString()} for salon ${data.salonId}`,
+          );
+          await this.prisma.logSecurityEvent(data.salonId, 'BOOKING_CONFLICT', {
+            customerId: data.customerId,
+            serviceId: data.serviceId,
+            startTime: data.startTime.toISOString(),
+            reason: 'Requested time slot is no longer available.',
           });
           throw new BadRequestException('Time slot is no longer available');
         }
@@ -278,6 +278,16 @@
       if (error instanceof NotFoundException || error instanceof BadRequestException) {
         throw error;
       }
+      // Log database-level concurrency conflict/lock exception (NFR5)
+      this.logger.warn(
+        `[SECURITY_AUDIT_FAIL] Database-level booking collision or constraint violation for salon ${data.salonId}`,
+      );
+      await this.prisma.logSecurityEvent(data.salonId, 'BOOKING_CONFLICT', {
+        customerId: data.customerId,
+        serviceId: data.serviceId,
+        startTime: data.startTime.toISOString(),
+        reason: error.message || 'Database lock or constraint violation',
+      });
       throw new BadRequestException('Requested time slot is no longer available.');
     }
   }
@@ -356,17 +356,14 @@
 
         if (overlappingAppointments.length > 0) {
           // Log booking conflict (NFR5)
-          await tx.auditLog.create({
-            data: {
-              salonId: data.salonId,
-              action: 'BOOKING_CONFLICT',
-              details: {
-                customerId: data.customerId,
-                serviceId: service.id,
-                startTime: data.startTime.toISOString(),
-                reason: 'Requested time slot is not available.',
-              },
-            },
+          this.logger.warn(
+            `[SECURITY_AUDIT_FAIL] Booking collision on slot starting at ${data.startTime.toISOString()} for salon ${data.salonId}`,
+          );
+          await this.prisma.logSecurityEvent(data.salonId, 'BOOKING_CONFLICT', {
+            customerId: data.customerId,
+            serviceId: service.id,
+            startTime: data.startTime.toISOString(),
+            reason: 'Requested time slot is not available.',
           });
           throw new BadRequestException('Requested time slot is not available.');
         }
@@ -409,6 +409,16 @@
       if (error instanceof NotFoundException || error instanceof BadRequestException) {
         throw error;
       }
+      // Log database-level concurrency conflict/lock exception (NFR5)
+      this.logger.warn(
+        `[SECURITY_AUDIT_FAIL] Database-level booking collision or constraint violation for salon ${data.salonId}`,
+      );
+      await this.prisma.logSecurityEvent(data.salonId, 'BOOKING_CONFLICT', {
+        customerId: data.customerId,
+        serviceId: service?.id,
+        startTime: data.startTime.toISOString(),
+        reason: error.message || 'Database lock or constraint violation',
+      });
       throw new BadRequestException('Requested time slot is no longer available.');
     }
   }
diff --git a/backend/src/appointments/appointments.service.spec.ts b/backend/src/appointments/appointments.service.spec.ts
--- a/backend/src/appointments/appointments.service.spec.ts
+++ b/backend/src/appointments/appointments.service.spec.ts
@@ -28,6 +28,7 @@
       create: jest.fn(),
     },
     logSecurityEvent: jest.fn(),
+    $executeRaw: jest.fn(),
     $transaction: jest.fn(async (cb) => cb(mockPrismaService)),
   };
 
@@ -190,11 +190,15 @@
         }),
       ).rejects.toThrow(BadRequestException);
 
-      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
-        data: expect.objectContaining({
-          action: 'BOOKING_CONFLICT',
-        }),
-      });
+      expect(mockPrismaService.logSecurityEvent).toHaveBeenCalledWith(
+        'salon-1',
+        'BOOKING_CONFLICT',
+        expect.objectContaining({
+          customerId: 'cust-1',
+          serviceId: 'srv-1',
+          reason: 'Requested time slot is no longer available.',
+        }),
+      );
     });
   });
 
@@ -294,5 +294,93 @@
       ).rejects.toThrow(BadRequestException);
     });
   });
+
+  describe('concurrency and locking', () => {
+    it('should serialize concurrent bookings using advisory locks and reject the duplicate request', async () => {
+      const mockDate = new Date('2026-06-01T10:00:00Z');
+
+      mockPrismaService.service.findFirst.mockResolvedValue({
+        id: 'srv-1',
+        durationMins: 45,
+      });
+      mockPrismaService.customer.findFirst.mockResolvedValue({ id: 'cust-1' });
+
+      const databaseAppointments: any[] = [];
+
+      mockPrismaService.appointment.findMany.mockImplementation(async () => {
+        return databaseAppointments;
+      });
+
+      mockPrismaService.appointment.create.mockImplementation(async (args) => {
+        const newAppt = { id: `appt-${Date.now()}`, ...args.data };
+        databaseAppointments.push(newAppt);
+        return newAppt;
+      });
+
+      let lockHolder: string | null = null;
+      const lockQueue: Array<{ resolve: () => void; id: string }> = [];
+
+      const acquireLock = async (id: string) => {
+        if (lockHolder) {
+          await new Promise<void>((resolve) => {
+            lockQueue.push({ resolve, id });
+          });
+        }
+        lockHolder = id;
+      };
+
+      const releaseLock = () => {
+        lockHolder = null;
+        if (lockQueue.length > 0) {
+          const next = lockQueue.shift();
+          if (next) {
+            next.resolve();
+          }
+        }
+      };
+
+      let txCounter = 0;
+      mockPrismaService.$transaction.mockImplementation(async (cb) => {
+        const txId = `tx-${++txCounter}`;
+        const txMock = {
+          ...mockPrismaService,
+          $executeRaw: jest.fn(async () => {
+            await acquireLock(txId);
+          }),
+        };
+        try {
+          return await cb(txMock);
+        } finally {
+          releaseLock();
+        }
+      });
+
+      const call1 = service.createAppointment({
+        salonId: 'salon-1',
+        customerId: 'cust-1',
+        serviceId: 'srv-1',
+        startTime: mockDate,
+      });
+
+      const call2 = service.createAppointment({
+        salonId: 'salon-1',
+        customerId: 'cust-1',
+        serviceId: 'srv-1',
+        startTime: mockDate,
+      });
+
+      const results = await Promise.allSettled([call1, call2]);
+
+      const fulfilled = results.filter((r) => r.status === 'fulfilled') as PromiseFulfilledResult<any>[];
+      const rejected = results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];
+
+      expect(fulfilled).toHaveLength(1);
+      expect(rejected).toHaveLength(1);
+      expect(rejected[0].reason).toBeInstanceOf(BadRequestException);
+      expect(rejected[0].reason.message).toContain('Time slot is no longer available');
+
+      expect(databaseAppointments).toHaveLength(1);
+    });
+  });
 });
```
