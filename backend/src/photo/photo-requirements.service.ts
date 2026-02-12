import { Injectable, BadRequestException } from '@nestjs/common';
import { HealthVertical } from '@prisma/client';

// Spec: hair-loss spec Section 4, weight-management spec Section 4,
//       ed spec Section 4, pcos spec Section 4

// Minimum photo resolution for medical photos
// Spec: hair-loss spec Section 4 — Minimum 1024x768
export const MIN_PHOTO_WIDTH = 1024;
export const MIN_PHOTO_HEIGHT = 768;

export interface PhotoRequirement {
  type: string;
  label: string;
  required: boolean;
  instructions: string;
  purpose: string;
}

export interface PhotoInput {
  type: string;
  url: string;
}

export interface LinkedPhoto extends PhotoInput {
  baselineConsultationId: string;
  isFollowUp: boolean;
}

export interface ValidationResult {
  valid: boolean;
  message?: string;
}

export interface PhotoValidationResult {
  valid: boolean;
  missingRequired: string[];
  invalidTypes: string[];
}

// Spec: hair-loss spec Section 4 — 4 Required Photos
export const HAIR_LOSS_PHOTOS: PhotoRequirement[] = [
  {
    type: 'front_hairline',
    label: 'Front hairline',
    required: true,
    instructions: 'Forehead visible, hair pulled back, eye level',
    purpose: 'Frontal recession assessment',
  },
  {
    type: 'crown',
    label: 'Crown / top',
    required: true,
    instructions: 'From above, someone else takes or front camera + tilt',
    purpose: 'Vertex thinning',
  },
  {
    type: 'left_side',
    label: 'Left side',
    required: true,
    instructions: 'Profile showing temple',
    purpose: 'Temporal recession',
  },
  {
    type: 'right_side',
    label: 'Right side',
    required: true,
    instructions: 'Profile showing temple',
    purpose: 'Symmetry check',
  },
];

// Spec: ed spec Section 4 — NO PHOTOS REQUIRED
// Maximum privacy feature for stigmatized condition
export const ED_PHOTOS: PhotoRequirement[] = [];

// Spec: weight-management spec Section 4 — 2 Required, 1 Optional
export const WEIGHT_PHOTOS: PhotoRequirement[] = [
  {
    type: 'body_front',
    label: 'Full body — front',
    required: true,
    instructions: 'Standing straight, arms at sides, wearing fitted clothes',
    purpose: 'Baseline body composition reference',
  },
  {
    type: 'body_side',
    label: 'Full body — side',
    required: true,
    instructions: 'Same position, 90° angle',
    purpose: 'Abdominal fat distribution',
  },
  {
    type: 'waist_measurement',
    label: 'Waist measurement',
    required: false,
    instructions: 'Tape measure around waist at navel level',
    purpose: 'Central obesity assessment',
  },
];

// Spec: pcos spec Section 4 — Optional (doctor can request later)
export const PCOS_PHOTOS: PhotoRequirement[] = [
  {
    type: 'facial_acne',
    label: 'Facial acne close-up',
    required: false,
    instructions: 'Clear photo of face showing acne areas',
    purpose: 'Acne severity assessment',
  },
  {
    type: 'hirsutism_areas',
    label: 'Hirsutism areas',
    required: false,
    instructions: 'Areas of excess hair growth (chin, upper lip, etc.)',
    purpose: 'Hirsutism assessment',
  },
  {
    type: 'acanthosis_nigricans',
    label: 'Acanthosis nigricans',
    required: false,
    instructions: 'Dark patches on neck, armpits, or groin',
    purpose: 'Insulin resistance indicator',
  },
];

// Photo requirements by vertical
const PHOTO_REQUIREMENTS: Record<HealthVertical, PhotoRequirement[]> = {
  [HealthVertical.HAIR_LOSS]: HAIR_LOSS_PHOTOS,
  [HealthVertical.SEXUAL_HEALTH]: ED_PHOTOS,
  [HealthVertical.WEIGHT_MANAGEMENT]: WEIGHT_PHOTOS,
  [HealthVertical.PCOS]: PCOS_PHOTOS,
};

@Injectable()
export class PhotoRequirementsService {
  /**
   * Get photo requirements for a specific vertical
   */
  getPhotoRequirements(vertical: HealthVertical): PhotoRequirement[] {
    return PHOTO_REQUIREMENTS[vertical] || [];
  }

  /**
   * Check if photos can be uploaded for this vertical
   * Spec: ED blocks photo uploads for maximum privacy
   */
  canUploadPhotos(vertical: HealthVertical): boolean {
    // ED specifically blocks photos
    if (vertical === HealthVertical.SEXUAL_HEALTH) {
      return false;
    }
    return true;
  }

  /**
   * Get count of required photos for a vertical
   */
  getRequiredPhotoCount(vertical: HealthVertical): number {
    const requirements = this.getPhotoRequirements(vertical);
    return requirements.filter((r) => r.required).length;
  }

  /**
   * Generate storage path for a photo
   * Spec: hair-loss spec Section 4 — Storage format:
   * patients/{id}/consultations/{cid}/{type}_{timestamp}.jpg
   */
  generateStoragePath(
    patientId: string,
    consultationId: string,
    photoType: string
  ): string {
    const timestamp = Date.now();
    return `patients/${patientId}/consultations/${consultationId}/${photoType}_${timestamp}.jpg`;
  }

  /**
   * Validate photo resolution meets minimum requirements
   * Spec: hair-loss spec Section 4 — Minimum 1024x768
   */
  validateResolution(width: number, height: number): ValidationResult {
    if (width < MIN_PHOTO_WIDTH || height < MIN_PHOTO_HEIGHT) {
      return {
        valid: false,
        message: `Photo resolution too low. Minimum ${MIN_PHOTO_WIDTH}x${MIN_PHOTO_HEIGHT} required for medical photos.`,
      };
    }
    return { valid: true };
  }

  /**
   * Validate photos submitted for a specific vertical
   */
  validatePhotosForVertical(
    vertical: HealthVertical,
    photos: PhotoInput[]
  ): PhotoValidationResult {
    // ED blocks all photos
    if (vertical === HealthVertical.SEXUAL_HEALTH && photos.length > 0) {
      throw new BadRequestException('Photos are not accepted for this consultation type');
    }

    const requirements = this.getPhotoRequirements(vertical);
    const validTypes = requirements.map((r) => r.type);
    const requiredTypes = requirements.filter((r) => r.required).map((r) => r.type);

    const missingRequired: string[] = [];
    const invalidTypes: string[] = [];

    // Check for invalid photo types
    for (const photo of photos) {
      if (!validTypes.includes(photo.type)) {
        invalidTypes.push(photo.type);
      }
    }

    // If there are invalid types, fail validation
    if (invalidTypes.length > 0) {
      return {
        valid: false,
        missingRequired: [],
        invalidTypes,
      };
    }

    // Check all required photos are present
    const submittedTypes = photos.map((p) => p.type);
    for (const requiredType of requiredTypes) {
      if (!submittedTypes.includes(requiredType)) {
        missingRequired.push(requiredType);
      }
    }

    return {
      valid: missingRequired.length === 0,
      missingRequired,
      invalidTypes: [],
    };
  }

  /**
   * Link follow-up photos to baseline consultation for comparison
   * Spec: Follow-up consultations link new photos to baseline
   */
  linkToBaseline(
    photos: PhotoInput[],
    baselineConsultationId: string
  ): LinkedPhoto[] {
    return photos.map((photo) => ({
      ...photo,
      baselineConsultationId,
      isFollowUp: true,
    }));
  }
}
