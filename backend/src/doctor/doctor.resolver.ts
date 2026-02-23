import { Resolver, Query, Mutation, Args, ObjectType, Field, ID, Int, ResolveField, Parent } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { DoctorService, CreateDoctorServiceInput, UpdateDoctorServiceInput } from './doctor.service';
import { CreateDoctorInput } from './dto/create-doctor.input';
import { UpdateDoctorInput } from './dto/update-doctor.input';
import { DoctorStats } from './dto/doctor-stats.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole, HealthVertical } from '@prisma/client';

// Spec: Phase 12 — Doctor Onboarding Resolver (Admin-only)

// GraphQL output type for DoctorProfile
@ObjectType()
class DoctorProfileType {
  @Field(() => ID)
  id: string;

  @Field()
  userId: string;

  @Field()
  registrationNo: string;

  @Field()
  specialization: string;

  // Resolved from the related User model via @ResolveField
  @Field({ nullable: true })
  name?: string;

  @Field({ nullable: true })
  phone?: string;

  @Field({ nullable: true })
  email?: string;

  @Field(() => [String])
  specializations: string[];

  @Field(() => [HealthVertical])
  verticals: HealthVertical[];

  @Field(() => [String])
  qualifications: string[];

  @Field(() => Int)
  yearsOfExperience: number;

  @Field({ nullable: true })
  bio?: string;

  @Field({ nullable: true })
  avatarUrl?: string;

  @Field({ nullable: true })
  signatureUrl?: string;

  @Field()
  isAvailable: boolean;

  @Field()
  isActive: boolean;

  @Field()
  seniorDoctor: boolean;

  @Field(() => Int)
  dailyCaseLimit: number;

  @Field(() => Int)
  consultationFee: number;

  @Field({ nullable: true })
  lastAssignedAt?: Date;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}

@Resolver(() => DoctorProfileType)
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class DoctorResolver {
  constructor(private readonly doctorService: DoctorService) {}

  // Resolve user fields from the included user relation
  @ResolveField(() => String, { nullable: true })
  name(@Parent() doctor: any): string | null {
    return doctor.user?.name ?? doctor.name ?? null;
  }

  @ResolveField(() => String, { nullable: true })
  phone(@Parent() doctor: any): string | null {
    return doctor.user?.phone ?? doctor.phone ?? null;
  }

  @ResolveField(() => String, { nullable: true })
  email(@Parent() doctor: any): string | null {
    return doctor.user?.email ?? doctor.email ?? null;
  }

  // ========================================
  // Mutations
  // ========================================

  @Mutation(() => DoctorProfileType)
  async createDoctor(
    @Args('input') input: CreateDoctorInput,
  ): Promise<any> {
    return this.doctorService.createDoctor(input as CreateDoctorServiceInput);
  }

  @Mutation(() => DoctorProfileType)
  async updateDoctor(
    @Args('id') id: string,
    @Args('input') input: UpdateDoctorInput,
  ): Promise<any> {
    return this.doctorService.updateDoctor(id, input as UpdateDoctorServiceInput);
  }

  @Mutation(() => DoctorProfileType)
  async toggleDoctorAvailability(
    @Args('id') id: string,
  ): Promise<any> {
    return this.doctorService.toggleAvailability(id);
  }

  @Mutation(() => Boolean)
  async deactivateDoctor(
    @Args('id') id: string,
  ): Promise<boolean> {
    return this.doctorService.deactivateDoctor(id);
  }

  // ========================================
  // Queries
  // ========================================

  @Query(() => [DoctorProfileType])
  async doctors(
    @Args('vertical', { type: () => HealthVertical, nullable: true }) vertical?: HealthVertical,
    @Args('isAvailable', { type: () => Boolean, nullable: true }) isAvailable?: boolean,
  ): Promise<any[]> {
    return this.doctorService.listDoctors({ vertical, isAvailable });
  }

  @Query(() => DoctorStats)
  async doctorStats(
    @Args('id') id: string,
  ): Promise<DoctorStats> {
    return this.doctorService.getDoctorStats(id);
  }

  @Query(() => DoctorProfileType)
  async doctorById(
    @Args('id') id: string,
  ): Promise<any> {
    return this.doctorService.getDoctorById(id);
  }
}
