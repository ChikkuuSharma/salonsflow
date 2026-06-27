# Acceptance Auditor Prompt

You are an **Acceptance Auditor**. Review the diff below against the story specifications. Check for:
- Violations of acceptance criteria.
- Deviations from the spec's intent.
- Missing implementation of specified behavior.
- Contradradictions between spec constraints and the actual code.

Output your findings as a Markdown list. Each finding must include:
- A one-line title.
- The specific AC/constraint it violates.
- Evidence from the diff.

If no violations are found, reply with "No issues found."

---

## Story Specifications: 1-2-database-level-concurrency-locking

```markdown
# Story 1.2: Database-Level Concurrency Locking & Uniqueness

## Story

As a Salon Owner,
I want the platform's booking engine to enforce database-level transactional locks or uniqueness constraints,
so that duplicate concurrent booking requests for the same time slot and staff member are physically blocked at the database layer.

## Acceptance Criteria

1. **Database-Level Concurrency Safeguards (FR10)**:
   - Implement database-level safety to prevent concurrent booking conflicts (overlapping time slots for the same staff member/salon).
   - This must be implemented via one of two techniques:
     - **Pessimistic Locking**: Acquire a transactional row lock (e.g., using a raw SQL advisory lock `pg_advisory_xact_lock` or `SELECT ... FOR UPDATE` on the Staff/Salon record) inside the transaction before checking availability.
     - **PostgreSQL Exclusion Constraints**: Add a native PostgreSQL exclusion constraint using the `gist` index type to prevent overlapping intervals (`tsrange(startTime, endTime)`).
   - Note: Because staffId is optional in the schema (`staffId String?`), the locking/constraint mechanism must handle null staff values gracefully (e.g. defaulting to a salon-wide slot lock or global tenant lock if no staff is specified).

2. **Transaction Rollback & Exception Translation**:
   - If a concurrent conflict is detected at the database layer (e.g., a unique constraint violation, exclusion constraint violation, or lock timeout), the transaction must roll back cleanly.
   - Catch the database exception (e.g., Prisma unique constraint error code `P2002` or exclusion violation error) and translate it into a NestJS standard `BadRequestException` with a user-friendly message (`"Requested time slot is no longer available."`).

3. **Security Audit Log for Booking Conflicts (NFR5)**:
   - When a concurrent booking collision occurs (caught by application validation or database constraint rollbacks), log a structured security event:
     - Record a database row in the `AuditLog` table with `action: 'BOOKING_CONFLICT'`.
     - Log a warning using the NestJS `Logger` containing `[SECURITY_AUDIT_FAIL]` to flag the collision.

4. **Testing Concurrency & Race Conditions**:
   - Write integration/E2E test scripts or Jest unit tests mocking concurrent promises (`Promise.all`) to verify that two overlapping booking transactions executed simultaneously result in exactly one success and one rollback/exception.
```

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
