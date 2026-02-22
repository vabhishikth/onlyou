import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Spec: Phase 16 Chunk 7 — Biomarker Dashboard Data Layer

export interface BiomarkerGroup {
  testCode: string;
  testName: string;
  unit: string;
  latestValue: number;
  latestStatus: string;
  referenceRangeMin: number | null;
  referenceRangeMax: number | null;
  results: any[];
}

@Injectable()
export class BiomarkerDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get patient's biomarker history grouped by test code
   * Spec: Phase 16 Chunk 7 — All results grouped with trend lines
   */
  async getPatientBiomarkerHistory(patientId: string): Promise<BiomarkerGroup[]> {
    // Find all completed lab orders for the patient
    const labOrders = await this.prisma.labOrder.findMany({
      where: {
        patientId,
        status: { in: ['DOCTOR_REVIEWED', 'CLOSED', 'RESULTS_READY'] },
      },
      orderBy: { createdAt: 'asc' },
    });

    if (labOrders.length === 0) {
      return [];
    }

    const labOrderIds = labOrders.map((o: any) => o.id);

    // Get all results for these orders
    const results = await this.prisma.labResult.findMany({
      where: { labOrderId: { in: labOrderIds } },
      orderBy: { createdAt: 'asc' },
    });

    if (results.length === 0) {
      return [];
    }

    // Group by testCode
    const grouped = new Map<string, any[]>();
    for (const r of results) {
      const existing = grouped.get(r.testCode) || [];
      existing.push(r);
      grouped.set(r.testCode, existing);
    }

    // Build response
    const biomarkerGroups: BiomarkerGroup[] = [];
    for (const [testCode, testResults] of grouped) {
      const latest = testResults[testResults.length - 1];
      biomarkerGroups.push({
        testCode,
        testName: latest.testName,
        unit: latest.unit,
        latestValue: latest.value,
        latestStatus: latest.status,
        referenceRangeMin: latest.referenceRangeMin,
        referenceRangeMax: latest.referenceRangeMax,
        results: testResults,
      });
    }

    return biomarkerGroups;
  }

  /**
   * Get trend data for a specific test code
   * Spec: Phase 16 Chunk 7 — Chronological values for charting
   */
  async getTestTrend(patientId: string, testCode: string) {
    // Find all results for this patient and test code via lab orders
    const results = await this.prisma.labResult.findMany({
      where: {
        testCode,
        labOrder: { patientId },
      },
      orderBy: { createdAt: 'asc' },
    });

    return results;
  }

  /**
   * Get latest result per test code (dashboard summary)
   * Spec: Phase 16 Chunk 7 — Quick overview of current values
   */
  async getLatestResults(patientId: string) {
    // Find most recent completed lab order
    const latestOrders = await this.prisma.labOrder.findMany({
      where: {
        patientId,
        status: { in: ['DOCTOR_REVIEWED', 'CLOSED', 'RESULTS_READY'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 1,
    });

    if (latestOrders.length === 0) {
      return [];
    }

    return this.prisma.labResult.findMany({
      where: { labOrderId: latestOrders[0].id },
      orderBy: { testCode: 'asc' },
    });
  }

  /**
   * Get lab order with all results (doctor detail view)
   * Spec: Phase 16 Chunk 7 — Full order summary with results
   */
  async getLabOrderSummary(labOrderId: string) {
    const order = await this.prisma.labOrder.findUnique({
      where: { id: labOrderId },
      include: { labResults: true },
    });

    if (!order) {
      throw new NotFoundException('Lab order not found');
    }

    return order;
  }

  /**
   * Get critical values summary for a patient
   * Spec: Phase 16 Chunk 7 — Unacknowledged and historical critical values
   */
  async getCriticalValuesSummary(patientId: string) {
    return this.prisma.labResult.findMany({
      where: {
        isCritical: true,
        labOrder: { patientId },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
