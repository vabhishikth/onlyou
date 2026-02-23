import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { HealthVertical, UserRole, ConsultationStatus, DoctorProfile } from '@prisma/client';

// Spec: Phase 12 — Doctor Onboarding + Management

// Canonical list of valid specializations — used for validation
export const VALID_SPECIALIZATIONS = [
  'Dermatology',
  'Trichology',
  'Urology',
  'Andrology',
  'Sexology',
  'Endocrinology',
  'Bariatrics',
  'Gynecology',
  'Reproductive Medicine',
  'Internal Medicine',
] as const;

// Each vertical requires at least ONE matching specialization from its list
export const VERTICAL_SPECIALIZATION_MAP: Record<HealthVertical, string[]> = {
  [HealthVertical.HAIR_LOSS]: ['Dermatology', 'Trichology'],
  [HealthVertical.SEXUAL_HEALTH]: ['Urology', 'Andrology', 'Sexology'],
  [HealthVertical.WEIGHT_MANAGEMENT]: ['Endocrinology', 'Bariatrics'],
  [HealthVertical.PCOS]: ['Gynecology', 'Endocrinology', 'Reproductive Medicine'],
};

export interface CreateDoctorServiceInput {
  name: string;
  phone: string;
  email: string;
  registrationNo: string;
  specializations: string[];
  verticals: HealthVertical[];
  qualifications: string[];
  yearsOfExperience: number;
  dailyCaseLimit: number;
  consultationFee: number;
  bio?: string;
  seniorDoctor?: boolean;
}

export interface UpdateDoctorServiceInput {
  specializations?: string[];
  verticals?: HealthVertical[];
  dailyCaseLimit?: number;
  consultationFee?: number;
  seniorDoctor?: boolean;
  bio?: string;
  qualifications?: string[];
  yearsOfExperience?: number;
}

export interface DoctorListFilters {
  vertical?: HealthVertical;
  isAvailable?: boolean;
}

export interface DoctorStatsResult {
  activeCases: number;
  completedToday: number;
  dailyCaseLimit: number;
  avgResponseTimeHours: number | null;
  isAvailable: boolean;
  seniorDoctor: boolean;
}

@Injectable()
export class DoctorService {
  private readonly logger = new Logger(DoctorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Validate that verticals are consistent with specializations
   * Spec: Phase 12 — Each vertical requires at least one matching specialization
   */
  validateVerticalSpecializations(verticals: HealthVertical[], specializations: string[]): void {
    for (const vertical of verticals) {
      const requiredSpecs = VERTICAL_SPECIALIZATION_MAP[vertical];
      const hasMatch = requiredSpecs.some(spec => specializations.includes(spec));
      if (!hasMatch) {
        throw new BadRequestException(
          `Vertical ${vertical} requires at least one specialization from: ${requiredSpecs.join(', ')}`,
        );
      }
    }
  }

  /**
   * Create a new doctor (admin-only)
   * Spec: Phase 12 — Creates User (role=DOCTOR) + DoctorProfile in transaction
   */
  async createDoctor(input: CreateDoctorServiceInput): Promise<DoctorProfile> {
    // Validate phone format (+91, 10 digits)
    if (!input.phone || !/^\+91\d{10}$/.test(input.phone)) {
      throw new BadRequestException('Phone must be valid Indian mobile (+91 followed by 10 digits)');
    }

    // Check phone uniqueness
    const existingPhone = await this.prisma.user.findFirst({
      where: { phone: input.phone },
    });
    if (existingPhone) {
      throw new BadRequestException('A user with this phone number already exists');
    }

    // Check email uniqueness
    if (input.email) {
      const existingEmail = await this.prisma.user.findFirst({
        where: { email: input.email },
      });
      if (existingEmail) {
        throw new BadRequestException('A user with this email already exists');
      }
    }

    // Validate NMC registration number non-empty
    if (!input.registrationNo || input.registrationNo.trim() === '') {
      throw new BadRequestException('NMC Registration Number is required');
    }

    // Validate at least one specialization
    if (!input.specializations || input.specializations.length === 0) {
      throw new BadRequestException('At least one specialization is required');
    }

    // Validate at least one vertical
    if (!input.verticals || input.verticals.length === 0) {
      throw new BadRequestException('At least one vertical is required');
    }

    // Validate vertical-specialization consistency
    this.validateVerticalSpecializations(input.verticals, input.specializations);

    // Validate daily case limit (1-50)
    if (input.dailyCaseLimit < 1 || input.dailyCaseLimit > 50) {
      throw new BadRequestException('Daily case limit must be between 1 and 50');
    }

    // Validate consultation fee > 0
    if (input.consultationFee <= 0) {
      throw new BadRequestException('Consultation fee must be greater than 0');
    }

    // Transaction: create User + DoctorProfile
    const doctorProfile = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          phone: input.phone,
          email: input.email,
          name: input.name,
          role: UserRole.DOCTOR,
          isVerified: true,
        },
      });

      const profile = await tx.doctorProfile.create({
        data: {
          userId: user.id,
          registrationNo: input.registrationNo,
          specialization: input.specializations[0], // Legacy field — first specialization
          specializations: input.specializations,
          verticals: input.verticals,
          qualifications: input.qualifications,
          yearsOfExperience: input.yearsOfExperience,
          dailyCaseLimit: input.dailyCaseLimit,
          consultationFee: input.consultationFee,
          seniorDoctor: input.seniorDoctor || false,
          isAvailable: true,
          isActive: true,
          ...(input.bio && { bio: input.bio }),
        },
        include: { user: true },
      });

      return profile;
    });

    // Send welcome notification (fire-and-forget)
    this.notificationService.sendNotification({
      recipientId: doctorProfile.userId,
      recipientRole: 'DOCTOR',
      channel: 'SMS',
      eventType: 'WELCOME',
      title: 'Welcome to Onlyou',
      body: 'Welcome to Onlyou. Login at doctor.onlyou.life with your phone number. Use OTP to sign in.',
    }).catch(err => {
      this.logger.error(`Failed to send welcome notification to doctor ${doctorProfile.userId}: ${err?.message}`);
    });

    this.logger.log(`Doctor created: ${input.name} (${input.phone}), verticals: ${input.verticals.join(', ')}`);

    return doctorProfile;
  }

  /**
   * Update doctor details
   * Spec: Phase 12 — Admin can edit specializations, verticals, limits, fees
   */
  async updateDoctor(doctorProfileId: string, input: UpdateDoctorServiceInput): Promise<DoctorProfile> {
    const existing = await this.prisma.doctorProfile.findUnique({
      where: { id: doctorProfileId },
    });

    if (!existing) {
      throw new NotFoundException('Doctor profile not found');
    }

    // If updating verticals or specializations, validate consistency
    const newVerticals = input.verticals || existing.verticals;
    const newSpecs = input.specializations || existing.specializations;
    if (input.verticals || input.specializations) {
      this.validateVerticalSpecializations(newVerticals, newSpecs);
    }

    // Validate daily case limit if provided
    if (input.dailyCaseLimit !== undefined) {
      if (input.dailyCaseLimit < 1 || input.dailyCaseLimit > 50) {
        throw new BadRequestException('Daily case limit must be between 1 and 50');
      }
    }

    // Validate consultation fee if provided
    if (input.consultationFee !== undefined) {
      if (input.consultationFee <= 0) {
        throw new BadRequestException('Consultation fee must be greater than 0');
      }
    }

    const updateData: any = {};
    if (input.specializations) {
      updateData.specializations = input.specializations;
      updateData.specialization = input.specializations[0]; // Keep legacy field in sync
    }
    if (input.verticals) updateData.verticals = input.verticals;
    if (input.dailyCaseLimit !== undefined) updateData.dailyCaseLimit = input.dailyCaseLimit;
    if (input.consultationFee !== undefined) updateData.consultationFee = input.consultationFee;
    if (input.seniorDoctor !== undefined) updateData.seniorDoctor = input.seniorDoctor;
    if (input.bio !== undefined) updateData.bio = input.bio;
    if (input.qualifications) updateData.qualifications = input.qualifications;
    if (input.yearsOfExperience !== undefined) updateData.yearsOfExperience = input.yearsOfExperience;

    return this.prisma.doctorProfile.update({
      where: { id: doctorProfileId },
      data: updateData,
      include: { user: true },
    });
  }

  /**
   * Toggle doctor availability
   * Spec: Phase 12 — When off, no new cases assigned
   */
  async toggleAvailability(doctorProfileId: string): Promise<DoctorProfile> {
    const existing = await this.prisma.doctorProfile.findUnique({
      where: { id: doctorProfileId },
    });

    if (!existing) {
      throw new NotFoundException('Doctor profile not found');
    }

    return this.prisma.doctorProfile.update({
      where: { id: doctorProfileId },
      data: { isAvailable: !existing.isAvailable },
      include: { user: true },
    });
  }

  /**
   * Deactivate doctor (soft delete)
   * Spec: Phase 12 — Sets isActive=false, isAvailable=false
   */
  async deactivateDoctor(doctorProfileId: string): Promise<boolean> {
    const existing = await this.prisma.doctorProfile.findUnique({
      where: { id: doctorProfileId },
    });

    if (!existing) {
      throw new NotFoundException('Doctor profile not found');
    }

    await this.prisma.doctorProfile.update({
      where: { id: doctorProfileId },
      data: { isActive: false, isAvailable: false },
    });

    return true;
  }

  /**
   * List doctors with optional filters
   * Spec: Phase 12 — Filterable by vertical, availability
   */
  async listDoctors(filters?: DoctorListFilters): Promise<DoctorProfile[]> {
    const where: any = { isActive: true };

    if (filters?.vertical) {
      where.verticals = { has: filters.vertical };
    }

    if (filters?.isAvailable !== undefined) {
      where.isAvailable = filters.isAvailable;
    }

    return this.prisma.doctorProfile.findMany({
      where,
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get doctor stats — active cases, completed today, avg response time
   * Spec: Phase 12 — Active consultation count is always real-time query
   */
  async getDoctorStats(doctorProfileId: string): Promise<DoctorStatsResult> {
    const profile = await this.prisma.doctorProfile.findUnique({
      where: { id: doctorProfileId },
      include: { user: true },
    });

    if (!profile) {
      throw new NotFoundException('Doctor profile not found');
    }

    const userId = profile.userId;

    // Active cases — real-time count
    const activeCases = await this.prisma.consultation.count({
      where: {
        doctorId: userId,
        status: { in: [ConsultationStatus.DOCTOR_REVIEWING, ConsultationStatus.NEEDS_INFO] },
      },
    });

    // Completed today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const completedToday = await this.prisma.consultation.count({
      where: {
        doctorId: userId,
        status: { in: [ConsultationStatus.APPROVED, ConsultationStatus.REJECTED] },
        completedAt: { gte: todayStart },
      },
    });

    // Average response time (from recent completed consultations)
    const recentCompleted = await this.prisma.consultation.findMany({
      where: {
        doctorId: userId,
        assignedAt: { not: null },
        completedAt: { not: null },
      },
      select: { assignedAt: true, completedAt: true },
      orderBy: { completedAt: 'desc' },
      take: 20,
    });

    let avgResponseTimeHours: number | null = null;
    if (recentCompleted.length > 0) {
      const totalHours = recentCompleted.reduce((sum, c) => {
        if (c.assignedAt && c.completedAt) {
          return sum + (c.completedAt.getTime() - c.assignedAt.getTime()) / (1000 * 60 * 60);
        }
        return sum;
      }, 0);
      avgResponseTimeHours = Math.round((totalHours / recentCompleted.length) * 10) / 10;
    }

    return {
      activeCases,
      completedToday,
      dailyCaseLimit: profile.dailyCaseLimit,
      avgResponseTimeHours,
      isAvailable: profile.isAvailable,
      seniorDoctor: profile.seniorDoctor,
    };
  }

  /**
   * Get doctor by ID
   */
  async getDoctorById(doctorProfileId: string): Promise<DoctorProfile> {
    const profile = await this.prisma.doctorProfile.findUnique({
      where: { id: doctorProfileId },
      include: { user: true },
    });

    if (!profile) {
      throw new NotFoundException('Doctor profile not found');
    }

    return profile;
  }
}
