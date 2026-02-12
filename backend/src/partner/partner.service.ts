import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Spec: master spec Section 7.5, Section 13 (Partner Management)

// ============================================
// INPUT TYPES
// ============================================

export interface CreateDiagnosticCentreInput {
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email?: string;
  contactPerson?: string;
  portalLoginPhone?: string;
  testsOffered: string[];
  testPricing?: Record<string, number>;
  panelPricing?: Record<string, number>;
  avgTurnaroundHours?: number;
  lat?: number;
  lng?: number;
}

export interface UpdateDiagnosticCentreInput {
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  phone?: string;
  email?: string;
  contactPerson?: string;
  testsOffered?: string[];
  testPricing?: Record<string, number>;
  panelPricing?: Record<string, number>;
  avgTurnaroundHours?: number;
  lat?: number;
  lng?: number;
}

export interface ListDiagnosticCentresInput {
  city?: string;
  isActive?: boolean;
}

export interface CreatePhlebotomistInput {
  name: string;
  phone: string;
  email?: string;
  certification?: string;
  certificationDocUrl?: string;
  availableDays?: string[];
  availableTimeStart?: string;
  availableTimeEnd?: string;
  maxDailyCollections?: number;
  currentCity: string;
  serviceableAreas: string[];
}

export interface UpdatePhlebotomistInput {
  name?: string;
  email?: string;
  certification?: string;
  certificationDocUrl?: string;
  availableDays?: string[];
  availableTimeStart?: string;
  availableTimeEnd?: string;
  maxDailyCollections?: number;
  currentCity?: string;
  serviceableAreas?: string[];
}

export interface ListPhlebotomistsInput {
  city?: string;
  pincode?: string;
  day?: string;
  isActive?: boolean;
}

export interface UpdatePhlebotomistStatsInput {
  incrementCompleted?: boolean;
  incrementFailed?: boolean;
}

export interface CreatePharmacyInput {
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email?: string;
  contactPerson?: string;
  portalLoginPhone?: string;
  drugLicenseNumber: string;
  gstNumber?: string;
  serviceableAreas: string[];
  avgPreparationMinutes?: number;
  lat?: number;
  lng?: number;
}

export interface UpdatePharmacyInput {
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  phone?: string;
  email?: string;
  contactPerson?: string;
  serviceableAreas?: string[];
  avgPreparationMinutes?: number;
  lat?: number;
  lng?: number;
}

export interface ListPharmaciesInput {
  city?: string;
  pincode?: string;
  isActive?: boolean;
}

@Injectable()
export class PartnerService {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================
  // DIAGNOSTIC CENTRE CRUD
  // ============================================

  async createDiagnosticCentre(input: CreateDiagnosticCentreInput): Promise<any> {
    // Check for duplicate portal phone
    if (input.portalLoginPhone) {
      const existing = await this.prisma.partnerDiagnosticCentre.findUnique({
        where: { portalLoginPhone: input.portalLoginPhone },
      });
      if (existing) {
        throw new ConflictException('Portal phone already registered');
      }
    }

    return this.prisma.partnerDiagnosticCentre.create({
      data: {
        name: input.name,
        address: input.address,
        city: input.city,
        state: input.state,
        pincode: input.pincode,
        phone: input.phone,
        email: input.email,
        contactPerson: input.contactPerson,
        portalLoginPhone: input.portalLoginPhone,
        testsOffered: input.testsOffered,
        testPricing: input.testPricing,
        panelPricing: input.panelPricing,
        avgTurnaroundHours: input.avgTurnaroundHours || 48,
        lat: input.lat,
        lng: input.lng,
      },
    });
  }

  async getDiagnosticCentre(id: string): Promise<any> {
    const centre = await this.prisma.partnerDiagnosticCentre.findUnique({
      where: { id },
    });

    if (!centre) {
      throw new NotFoundException('Diagnostic centre not found');
    }

    return centre;
  }

  async listDiagnosticCentres(input: ListDiagnosticCentresInput): Promise<any[]> {
    const where: any = {};

    if (input.city) {
      where.city = input.city;
    }
    if (input.isActive !== undefined) {
      where.isActive = input.isActive;
    }

    return this.prisma.partnerDiagnosticCentre.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  async updateDiagnosticCentre(id: string, input: UpdateDiagnosticCentreInput): Promise<any> {
    await this.getDiagnosticCentre(id); // Throws if not found

    return this.prisma.partnerDiagnosticCentre.update({
      where: { id },
      data: input,
    });
  }

  async deactivateDiagnosticCentre(id: string): Promise<any> {
    await this.getDiagnosticCentre(id);

    return this.prisma.partnerDiagnosticCentre.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async activateDiagnosticCentre(id: string): Promise<any> {
    await this.getDiagnosticCentre(id);

    return this.prisma.partnerDiagnosticCentre.update({
      where: { id },
      data: { isActive: true },
    });
  }

  // ============================================
  // PHLEBOTOMIST CRUD
  // ============================================

  async createPhlebotomist(input: CreatePhlebotomistInput): Promise<any> {
    // Check for duplicate phone
    const existing = await this.prisma.phlebotomist.findUnique({
      where: { phone: input.phone },
    });
    if (existing) {
      throw new ConflictException('Phone number already registered');
    }

    return this.prisma.phlebotomist.create({
      data: {
        name: input.name,
        phone: input.phone,
        email: input.email,
        certification: input.certification,
        certificationDocUrl: input.certificationDocUrl,
        availableDays: input.availableDays || [],
        availableTimeStart: input.availableTimeStart,
        availableTimeEnd: input.availableTimeEnd,
        maxDailyCollections: input.maxDailyCollections || 10,
        currentCity: input.currentCity,
        serviceableAreas: input.serviceableAreas,
      },
    });
  }

  async getPhlebotomist(id: string): Promise<any> {
    const phlebotomist = await this.prisma.phlebotomist.findUnique({
      where: { id },
    });

    if (!phlebotomist) {
      throw new NotFoundException('Phlebotomist not found');
    }

    return phlebotomist;
  }

  async listPhlebotomists(input: ListPhlebotomistsInput): Promise<any[]> {
    const where: any = {};

    if (input.city) {
      where.currentCity = input.city;
    }
    if (input.pincode) {
      where.serviceableAreas = { has: input.pincode };
    }
    if (input.day) {
      where.availableDays = { has: input.day };
    }
    if (input.isActive !== undefined) {
      where.isActive = input.isActive;
    }

    return this.prisma.phlebotomist.findMany({
      where,
      orderBy: [{ rating: 'desc' }, { completedCollections: 'desc' }],
    });
  }

  async updatePhlebotomist(id: string, input: UpdatePhlebotomistInput): Promise<any> {
    await this.getPhlebotomist(id);

    return this.prisma.phlebotomist.update({
      where: { id },
      data: input,
    });
  }

  async updatePhlebotomistStats(id: string, input: UpdatePhlebotomistStatsInput): Promise<any> {
    await this.getPhlebotomist(id);

    const data: any = {};
    if (input.incrementCompleted) {
      data.completedCollections = { increment: 1 };
    }
    if (input.incrementFailed) {
      data.failedCollections = { increment: 1 };
    }

    return this.prisma.phlebotomist.update({
      where: { id },
      data,
    });
  }

  async deactivatePhlebotomist(id: string): Promise<any> {
    await this.getPhlebotomist(id);

    return this.prisma.phlebotomist.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async activatePhlebotomist(id: string): Promise<any> {
    await this.getPhlebotomist(id);

    return this.prisma.phlebotomist.update({
      where: { id },
      data: { isActive: true },
    });
  }

  // ============================================
  // PHARMACY CRUD
  // ============================================

  async createPharmacy(input: CreatePharmacyInput): Promise<any> {
    // Check for duplicate drug license
    const existing = await this.prisma.partnerPharmacy.findUnique({
      where: { drugLicenseNumber: input.drugLicenseNumber },
    });
    if (existing) {
      throw new ConflictException('Drug license already registered');
    }

    return this.prisma.partnerPharmacy.create({
      data: {
        name: input.name,
        address: input.address,
        city: input.city,
        state: input.state,
        pincode: input.pincode,
        phone: input.phone,
        email: input.email,
        contactPerson: input.contactPerson,
        portalLoginPhone: input.portalLoginPhone,
        drugLicenseNumber: input.drugLicenseNumber,
        gstNumber: input.gstNumber,
        serviceableAreas: input.serviceableAreas,
        avgPreparationMinutes: input.avgPreparationMinutes || 30,
        lat: input.lat,
        lng: input.lng,
      },
    });
  }

  async getPharmacy(id: string): Promise<any> {
    const pharmacy = await this.prisma.partnerPharmacy.findUnique({
      where: { id },
    });

    if (!pharmacy) {
      throw new NotFoundException('Pharmacy not found');
    }

    return pharmacy;
  }

  async listPharmacies(input: ListPharmaciesInput): Promise<any[]> {
    const where: any = {};

    if (input.city) {
      where.city = input.city;
    }
    if (input.pincode) {
      where.serviceableAreas = { has: input.pincode };
    }
    if (input.isActive !== undefined) {
      where.isActive = input.isActive;
    }

    return this.prisma.partnerPharmacy.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  async updatePharmacy(id: string, input: UpdatePharmacyInput): Promise<any> {
    await this.getPharmacy(id);

    return this.prisma.partnerPharmacy.update({
      where: { id },
      data: input,
    });
  }

  async deactivatePharmacy(id: string): Promise<any> {
    await this.getPharmacy(id);

    return this.prisma.partnerPharmacy.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async activatePharmacy(id: string): Promise<any> {
    await this.getPharmacy(id);

    return this.prisma.partnerPharmacy.update({
      where: { id },
      data: { isActive: true },
    });
  }

  // ============================================
  // FIND NEAREST PARTNERS
  // ============================================

  async findNearestDiagnosticCentres(_pincode: string): Promise<any[]> {
    // For now, just filter by city (pincode prefix) and active status
    // In future, could use lat/lng for proper distance calculation
    return this.prisma.partnerDiagnosticCentre.findMany({
      where: {
        isActive: true,
        // In a real app, we'd do geolocation-based filtering
      },
      orderBy: [{ rating: 'desc' }],
    });
  }

  async findNearestPharmacies(pincode: string): Promise<any[]> {
    return this.prisma.partnerPharmacy.findMany({
      where: {
        isActive: true,
        serviceableAreas: { has: pincode },
      },
      orderBy: [{ rating: 'desc' }],
    });
  }

  async findAvailablePhlebotomists(pincode: string, day: string): Promise<any[]> {
    return this.prisma.phlebotomist.findMany({
      where: {
        isActive: true,
        serviceableAreas: { has: pincode },
        availableDays: { has: day },
      },
      orderBy: [{ rating: 'desc' }, { completedCollections: 'desc' }],
    });
  }

  // ============================================
  // PORTAL AUTHENTICATION (find by phone)
  // ============================================

  async findDiagnosticCentreByPortalPhone(phone: string): Promise<any | null> {
    return this.prisma.partnerDiagnosticCentre.findUnique({
      where: { portalLoginPhone: phone },
    });
  }

  async findPharmacyByPortalPhone(phone: string): Promise<any | null> {
    return this.prisma.partnerPharmacy.findUnique({
      where: { portalLoginPhone: phone },
    });
  }

  async findPhlebotomistByPhone(phone: string): Promise<any | null> {
    return this.prisma.phlebotomist.findUnique({
      where: { phone },
    });
  }

  // ============================================
  // PARTNER STATISTICS
  // ============================================

  async getDiagnosticCentreStats(): Promise<{ total: number; active: number; inactive: number }> {
    const centres = await this.prisma.partnerDiagnosticCentre.findMany({
      select: { isActive: true },
    });

    const active = centres.filter((c) => c.isActive).length;
    const inactive = centres.filter((c) => !c.isActive).length;

    return {
      total: centres.length,
      active,
      inactive,
    };
  }

  async getPhlebotomistStats(): Promise<{
    total: number;
    active: number;
    totalCompletedCollections: number;
    totalFailedCollections: number;
  }> {
    const phlebotomists = await this.prisma.phlebotomist.findMany({
      select: {
        isActive: true,
        completedCollections: true,
        failedCollections: true,
      },
    });

    const active = phlebotomists.filter((p) => p.isActive).length;
    const totalCompletedCollections = phlebotomists.reduce(
      (sum, p) => sum + p.completedCollections,
      0
    );
    const totalFailedCollections = phlebotomists.reduce(
      (sum, p) => sum + p.failedCollections,
      0
    );

    return {
      total: phlebotomists.length,
      active,
      totalCompletedCollections,
      totalFailedCollections,
    };
  }

  async getPharmacyStats(): Promise<{ total: number; active: number; inactive: number }> {
    const pharmacies = await this.prisma.partnerPharmacy.findMany({
      select: { isActive: true },
    });

    const active = pharmacies.filter((p) => p.isActive).length;
    const inactive = pharmacies.filter((p) => !p.isActive).length;

    return {
      total: pharmacies.length,
      active,
      inactive,
    };
  }

  // ============================================
  // PARTNER RATINGS
  // ============================================

  private validateRating(rating: number): void {
    if (rating < 0 || rating > 5) {
      throw new BadRequestException('Rating must be between 0 and 5');
    }
  }

  async updateDiagnosticCentreRating(id: string, rating: number): Promise<any> {
    this.validateRating(rating);
    await this.getDiagnosticCentre(id);

    return this.prisma.partnerDiagnosticCentre.update({
      where: { id },
      data: { rating },
    });
  }

  async updatePhlebotomistRating(id: string, rating: number): Promise<any> {
    this.validateRating(rating);
    await this.getPhlebotomist(id);

    return this.prisma.phlebotomist.update({
      where: { id },
      data: { rating },
    });
  }

  async updatePharmacyRating(id: string, rating: number): Promise<any> {
    this.validateRating(rating);
    await this.getPharmacy(id);

    return this.prisma.partnerPharmacy.update({
      where: { id },
      data: { rating },
    });
  }
}
