import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import {
  PhotoRequirementsService,
  PhotoRequirement,
  HAIR_LOSS_PHOTOS,
  ED_PHOTOS,
  WEIGHT_PHOTOS,
  PCOS_PHOTOS,
  MIN_PHOTO_WIDTH,
  MIN_PHOTO_HEIGHT,
} from './photo-requirements.service';
import { HealthVertical } from '@prisma/client';

// Spec: hair-loss spec Section 4, weight-management spec Section 4,
//       ed spec Section 4, pcos spec Section 4

describe('PhotoRequirementsService', () => {
  let service: PhotoRequirementsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PhotoRequirementsService],
    }).compile();

    service = module.get<PhotoRequirementsService>(PhotoRequirementsService);
  });

  describe('Hair Loss Photo Requirements', () => {
    // Spec: hair-loss spec Section 4 — 4 Required Photos
    it('should require exactly 4 photos for hair loss', () => {
      const requirements = service.getPhotoRequirements(HealthVertical.HAIR_LOSS);
      expect(requirements.length).toBe(4);
    });

    it('should require front hairline photo', () => {
      const requirements = service.getPhotoRequirements(HealthVertical.HAIR_LOSS);
      const frontHairline = requirements.find((r) => r.type === 'front_hairline');
      expect(frontHairline).toBeDefined();
      expect(frontHairline?.required).toBe(true);
      expect(frontHairline?.label).toBe('Front hairline');
      expect(frontHairline?.instructions).toContain('Forehead visible');
    });

    it('should require crown/top photo', () => {
      const requirements = service.getPhotoRequirements(HealthVertical.HAIR_LOSS);
      const crown = requirements.find((r) => r.type === 'crown');
      expect(crown).toBeDefined();
      expect(crown?.required).toBe(true);
      expect(crown?.label).toBe('Crown / top');
    });

    it('should require left side photo', () => {
      const requirements = service.getPhotoRequirements(HealthVertical.HAIR_LOSS);
      const leftSide = requirements.find((r) => r.type === 'left_side');
      expect(leftSide).toBeDefined();
      expect(leftSide?.required).toBe(true);
      expect(leftSide?.label).toBe('Left side');
    });

    it('should require right side photo', () => {
      const requirements = service.getPhotoRequirements(HealthVertical.HAIR_LOSS);
      const rightSide = requirements.find((r) => r.type === 'right_side');
      expect(rightSide).toBeDefined();
      expect(rightSide?.required).toBe(true);
      expect(rightSide?.label).toBe('Right side');
    });

    it('should have all 4 hair loss photos as required', () => {
      const requirements = service.getPhotoRequirements(HealthVertical.HAIR_LOSS);
      const requiredCount = requirements.filter((r) => r.required).length;
      expect(requiredCount).toBe(4);
    });
  });

  describe('ED Photo Requirements', () => {
    // Spec: ed spec Section 4 — NO PHOTOS REQUIRED
    it('should require 0 photos for ED (maximum privacy)', () => {
      const requirements = service.getPhotoRequirements(HealthVertical.SEXUAL_HEALTH);
      expect(requirements.length).toBe(0);
    });

    it('should block photo uploads for ED consultations', () => {
      const canUpload = service.canUploadPhotos(HealthVertical.SEXUAL_HEALTH);
      expect(canUpload).toBe(false);
    });

    it('should throw error when trying to validate photos for ED', () => {
      const photos = [{ type: 'any', url: 'https://example.com/photo.jpg' }];
      expect(() =>
        service.validatePhotosForVertical(HealthVertical.SEXUAL_HEALTH, photos)
      ).toThrow('Photos are not accepted for this consultation type');
    });
  });

  describe('Weight Management Photo Requirements', () => {
    // Spec: weight-management spec Section 4 — 2 Required, 1 Optional
    it('should have 3 total photos for weight management (2 required + 1 optional)', () => {
      const requirements = service.getPhotoRequirements(HealthVertical.WEIGHT_MANAGEMENT);
      expect(requirements.length).toBe(3);
    });

    it('should require full body front photo', () => {
      const requirements = service.getPhotoRequirements(HealthVertical.WEIGHT_MANAGEMENT);
      const bodyFront = requirements.find((r) => r.type === 'body_front');
      expect(bodyFront).toBeDefined();
      expect(bodyFront?.required).toBe(true);
      expect(bodyFront?.label).toBe('Full body — front');
    });

    it('should require full body side photo', () => {
      const requirements = service.getPhotoRequirements(HealthVertical.WEIGHT_MANAGEMENT);
      const bodySide = requirements.find((r) => r.type === 'body_side');
      expect(bodySide).toBeDefined();
      expect(bodySide?.required).toBe(true);
      expect(bodySide?.label).toBe('Full body — side');
    });

    it('should have waist measurement photo as optional', () => {
      const requirements = service.getPhotoRequirements(HealthVertical.WEIGHT_MANAGEMENT);
      const waist = requirements.find((r) => r.type === 'waist_measurement');
      expect(waist).toBeDefined();
      expect(waist?.required).toBe(false);
    });

    it('should have exactly 2 required photos for weight', () => {
      const requirements = service.getPhotoRequirements(HealthVertical.WEIGHT_MANAGEMENT);
      const requiredCount = requirements.filter((r) => r.required).length;
      expect(requiredCount).toBe(2);
    });
  });

  describe('PCOS Photo Requirements', () => {
    // Spec: pcos spec Section 4 — Optional (doctor can request later)
    it('should have all optional photos for PCOS', () => {
      const requirements = service.getPhotoRequirements(HealthVertical.PCOS);
      const requiredCount = requirements.filter((r) => r.required).length;
      expect(requiredCount).toBe(0);
    });

    it('should have 3 optional photo types for PCOS', () => {
      const requirements = service.getPhotoRequirements(HealthVertical.PCOS);
      expect(requirements.length).toBe(3);
    });

    it('should include facial acne option', () => {
      const requirements = service.getPhotoRequirements(HealthVertical.PCOS);
      const facialAcne = requirements.find((r) => r.type === 'facial_acne');
      expect(facialAcne).toBeDefined();
      expect(facialAcne?.required).toBe(false);
    });

    it('should include hirsutism areas option', () => {
      const requirements = service.getPhotoRequirements(HealthVertical.PCOS);
      const hirsutism = requirements.find((r) => r.type === 'hirsutism_areas');
      expect(hirsutism).toBeDefined();
      expect(hirsutism?.required).toBe(false);
    });

    it('should include acanthosis nigricans option', () => {
      const requirements = service.getPhotoRequirements(HealthVertical.PCOS);
      const acanthosis = requirements.find((r) => r.type === 'acanthosis_nigricans');
      expect(acanthosis).toBeDefined();
      expect(acanthosis?.required).toBe(false);
    });
  });

  describe('Photo Storage Path', () => {
    // Spec: hair-loss spec Section 4 — Storage path format
    it('should generate correct storage path format', () => {
      const path = service.generateStoragePath('patient-123', 'consult-456', 'front_hairline');
      expect(path).toMatch(/^patients\/patient-123\/consultations\/consult-456\/front_hairline_\d+\.jpg$/);
    });

    it('should include patient ID in path', () => {
      const path = service.generateStoragePath('my-patient-id', 'consult-1', 'crown');
      expect(path).toContain('patients/my-patient-id/');
    });

    it('should include consultation ID in path', () => {
      const path = service.generateStoragePath('patient-1', 'my-consult-id', 'crown');
      expect(path).toContain('consultations/my-consult-id/');
    });

    it('should include photo type in filename', () => {
      const path = service.generateStoragePath('p1', 'c1', 'left_side');
      expect(path).toContain('left_side_');
    });

    it('should include timestamp in filename', () => {
      const before = Date.now();
      const path = service.generateStoragePath('p1', 'c1', 'right_side');
      const after = Date.now();

      // Extract timestamp from path
      const match = path.match(/right_side_(\d+)\.jpg$/);
      expect(match).not.toBeNull();
      const timestamp = parseInt(match![1], 10);
      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('Photo Resolution Validation', () => {
    // Spec: hair-loss spec Section 4 — Minimum 1024x768
    it('should define minimum resolution as 1024x768', () => {
      expect(MIN_PHOTO_WIDTH).toBe(1024);
      expect(MIN_PHOTO_HEIGHT).toBe(768);
    });

    it('should accept photos meeting minimum resolution', () => {
      const result = service.validateResolution(1024, 768);
      expect(result.valid).toBe(true);
    });

    it('should accept photos exceeding minimum resolution', () => {
      const result = service.validateResolution(1920, 1080);
      expect(result.valid).toBe(true);
    });

    it('should reject photos below minimum width', () => {
      const result = service.validateResolution(800, 768);
      expect(result.valid).toBe(false);
      expect(result.message).toContain('1024x768');
    });

    it('should reject photos below minimum height', () => {
      const result = service.validateResolution(1024, 600);
      expect(result.valid).toBe(false);
      expect(result.message).toContain('1024x768');
    });

    it('should reject photos below both dimensions', () => {
      const result = service.validateResolution(640, 480);
      expect(result.valid).toBe(false);
    });
  });

  describe('Photo Validation for Vertical', () => {
    it('should validate all required photos are present for hair loss', () => {
      const photos = [
        { type: 'front_hairline', url: 'https://s3.../1.jpg' },
        { type: 'crown', url: 'https://s3.../2.jpg' },
        { type: 'left_side', url: 'https://s3.../3.jpg' },
        { type: 'right_side', url: 'https://s3.../4.jpg' },
      ];

      const result = service.validatePhotosForVertical(HealthVertical.HAIR_LOSS, photos);
      expect(result.valid).toBe(true);
      expect(result.missingRequired.length).toBe(0);
    });

    it('should fail validation when missing required hair loss photos', () => {
      const photos = [
        { type: 'front_hairline', url: 'https://s3.../1.jpg' },
        { type: 'crown', url: 'https://s3.../2.jpg' },
        // Missing left_side and right_side
      ];

      const result = service.validatePhotosForVertical(HealthVertical.HAIR_LOSS, photos);
      expect(result.valid).toBe(false);
      expect(result.missingRequired).toContain('left_side');
      expect(result.missingRequired).toContain('right_side');
    });

    it('should validate required weight photos', () => {
      const photos = [
        { type: 'body_front', url: 'https://s3.../1.jpg' },
        { type: 'body_side', url: 'https://s3.../2.jpg' },
        // waist_measurement is optional, not required
      ];

      const result = service.validatePhotosForVertical(HealthVertical.WEIGHT_MANAGEMENT, photos);
      expect(result.valid).toBe(true);
    });

    it('should accept PCOS with no photos (all optional)', () => {
      const photos: any[] = [];

      const result = service.validatePhotosForVertical(HealthVertical.PCOS, photos);
      expect(result.valid).toBe(true);
    });

    it('should accept PCOS with some optional photos', () => {
      const photos = [{ type: 'facial_acne', url: 'https://s3.../1.jpg' }];

      const result = service.validatePhotosForVertical(HealthVertical.PCOS, photos);
      expect(result.valid).toBe(true);
    });

    it('should reject unknown photo types', () => {
      const photos = [
        { type: 'front_hairline', url: 'https://s3.../1.jpg' },
        { type: 'unknown_type', url: 'https://s3.../x.jpg' },
      ];

      const result = service.validatePhotosForVertical(HealthVertical.HAIR_LOSS, photos);
      expect(result.valid).toBe(false);
      expect(result.invalidTypes).toContain('unknown_type');
    });
  });

  describe('Follow-up Photo Linking', () => {
    // Spec: Follow-up consultations link new photos to baseline for comparison
    it('should link follow-up photos to baseline consultation', () => {
      const linkedPhotos = service.linkToBaseline(
        [{ type: 'front_hairline', url: 'https://s3.../new.jpg' }],
        'baseline-consult-123'
      );

      expect(linkedPhotos[0].baselineConsultationId).toBe('baseline-consult-123');
    });

    it('should preserve photo data when linking', () => {
      const originalPhoto = { type: 'crown', url: 'https://s3.../follow.jpg' };
      const linkedPhotos = service.linkToBaseline([originalPhoto], 'baseline-1');

      expect(linkedPhotos[0].type).toBe('crown');
      expect(linkedPhotos[0].url).toBe('https://s3.../follow.jpg');
    });

    it('should mark photos as follow-up type', () => {
      const linkedPhotos = service.linkToBaseline(
        [{ type: 'left_side', url: 'https://s3.../new.jpg' }],
        'baseline-123'
      );

      expect(linkedPhotos[0].isFollowUp).toBe(true);
    });
  });

  describe('getRequiredPhotoCount', () => {
    it('should return 4 for hair loss', () => {
      expect(service.getRequiredPhotoCount(HealthVertical.HAIR_LOSS)).toBe(4);
    });

    it('should return 0 for ED', () => {
      expect(service.getRequiredPhotoCount(HealthVertical.SEXUAL_HEALTH)).toBe(0);
    });

    it('should return 2 for weight management', () => {
      expect(service.getRequiredPhotoCount(HealthVertical.WEIGHT_MANAGEMENT)).toBe(2);
    });

    it('should return 0 for PCOS (all optional)', () => {
      expect(service.getRequiredPhotoCount(HealthVertical.PCOS)).toBe(0);
    });
  });

  describe('Constants Verification', () => {
    it('HAIR_LOSS_PHOTOS should have 4 entries', () => {
      expect(HAIR_LOSS_PHOTOS.length).toBe(4);
    });

    it('ED_PHOTOS should be empty array', () => {
      expect(ED_PHOTOS.length).toBe(0);
    });

    it('WEIGHT_PHOTOS should have 3 entries', () => {
      expect(WEIGHT_PHOTOS.length).toBe(3);
    });

    it('PCOS_PHOTOS should have 3 entries', () => {
      expect(PCOS_PHOTOS.length).toBe(3);
    });
  });
});
