'use client';

import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { CREATE_DOCTOR, VERTICAL_LABELS } from '@/graphql/doctors';

// Spec: Phase 12 — Add Doctor Form Page

const SPECIALIZATIONS = [
    'Dermatology', 'Trichology', 'Urology', 'Andrology', 'Sexology',
    'Endocrinology', 'Bariatrics', 'Gynecology', 'Reproductive Medicine', 'Internal Medicine',
];

const VERTICAL_SPECIALIZATION_MAP: Record<string, string[]> = {
    HAIR_LOSS: ['Dermatology', 'Trichology'],
    SEXUAL_HEALTH: ['Urology', 'Andrology', 'Sexology'],
    WEIGHT_MANAGEMENT: ['Endocrinology', 'Bariatrics'],
    PCOS: ['Gynecology', 'Endocrinology', 'Reproductive Medicine'],
};

export default function AddDoctorPage() {
    const router = useRouter();
    const [createDoctor, { loading: submitting }] = useMutation(CREATE_DOCTOR);

    const [form, setForm] = useState({
        name: '',
        phone: '',
        email: '',
        registrationNo: '',
        specializations: [] as string[],
        verticals: [] as string[],
        qualifications: '',
        yearsOfExperience: '',
        dailyCaseLimit: '15',
        consultationFee: '',
        bio: '',
        seniorDoctor: false,
    });

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [submitError, setSubmitError] = useState('');

    const toggleSpecialization = (spec: string) => {
        setForm((prev) => ({
            ...prev,
            specializations: prev.specializations.includes(spec)
                ? prev.specializations.filter((s) => s !== spec)
                : [...prev.specializations, spec],
        }));
    };

    const toggleVertical = (vertical: string) => {
        setForm((prev) => ({
            ...prev,
            verticals: prev.verticals.includes(vertical)
                ? prev.verticals.filter((v) => v !== vertical)
                : [...prev.verticals, vertical],
        }));
    };

    // Validation: check if verticals match selected specializations
    const getVerticalWarning = (vertical: string): string | null => {
        if (!form.verticals.includes(vertical)) return null;
        const required = VERTICAL_SPECIALIZATION_MAP[vertical] || [];
        const hasMatch = required.some((s) => form.specializations.includes(s));
        if (!hasMatch) {
            return `Requires: ${required.join(' or ')}`;
        }
        return null;
    };

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!form.name.trim()) newErrors.name = 'Name is required';
        if (!form.phone.trim()) newErrors.phone = 'Phone is required';
        if (!form.registrationNo.trim()) newErrors.registrationNo = 'NMC registration is required';
        if (form.specializations.length === 0) newErrors.specializations = 'Select at least one';
        if (form.verticals.length === 0) newErrors.verticals = 'Select at least one';
        if (!form.qualifications.trim()) newErrors.qualifications = 'At least one qualification';

        const fee = parseInt(form.consultationFee);
        if (!fee || fee <= 0) newErrors.consultationFee = 'Must be greater than 0';

        const limit = parseInt(form.dailyCaseLimit);
        if (!limit || limit < 1 || limit > 50) newErrors.dailyCaseLimit = 'Must be 1-50';

        // Check vertical-specialization consistency
        for (const vertical of form.verticals) {
            const warning = getVerticalWarning(vertical);
            if (warning) {
                newErrors.verticals = `${VERTICAL_LABELS[vertical]}: ${warning}`;
                break;
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitError('');

        if (!validate()) return;

        try {
            await createDoctor({
                variables: {
                    input: {
                        name: form.name,
                        phone: form.phone,
                        email: form.email || undefined,
                        registrationNo: form.registrationNo,
                        specializations: form.specializations,
                        verticals: form.verticals,
                        qualifications: form.qualifications.split(',').map((q) => q.trim()).filter(Boolean),
                        yearsOfExperience: parseInt(form.yearsOfExperience) || 0,
                        dailyCaseLimit: parseInt(form.dailyCaseLimit),
                        consultationFee: parseInt(form.consultationFee),
                        bio: form.bio || undefined,
                        seniorDoctor: form.seniorDoctor,
                    },
                },
            });
            router.push('/admin/doctors');
        } catch (err: any) {
            setSubmitError(err.message || 'Failed to create doctor');
        }
    };

    return (
        <div className="p-4 lg:p-8 max-w-2xl">
            {/* Header */}
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                <Link href="/admin/doctors" className="flex items-center gap-2 text-sm text-muted-foreground mb-4 hover:text-foreground">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Doctors
                </Link>
                <h1 className="text-xl lg:text-2xl font-bold">Add New Doctor</h1>
                <p className="text-sm text-muted-foreground mt-1">Onboard a doctor to the platform</p>
            </motion.div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                {/* Name */}
                <div>
                    <label className="block text-sm font-medium mb-1">Full Name *</label>
                    <input
                        type="text"
                        value={form.name}
                        onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
                        placeholder="Dr. Ramesh Kumar"
                    />
                    {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                </div>

                {/* Phone + Email */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Phone *</label>
                        <input
                            type="tel"
                            value={form.phone}
                            onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                            className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
                            placeholder="+919876543210"
                        />
                        {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Email</label>
                        <input
                            type="email"
                            value={form.email}
                            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                            className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
                            placeholder="doctor@example.com"
                        />
                    </div>
                </div>

                {/* Registration + Experience */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">NMC Registration No *</label>
                        <input
                            type="text"
                            value={form.registrationNo}
                            onChange={(e) => setForm((p) => ({ ...p, registrationNo: e.target.value }))}
                            className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
                            placeholder="KA/12345/2020"
                        />
                        {errors.registrationNo && <p className="text-xs text-red-500 mt-1">{errors.registrationNo}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Years of Experience</label>
                        <input
                            type="number"
                            value={form.yearsOfExperience}
                            onChange={(e) => setForm((p) => ({ ...p, yearsOfExperience: e.target.value }))}
                            className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
                            placeholder="10"
                        />
                    </div>
                </div>

                {/* Qualifications */}
                <div>
                    <label className="block text-sm font-medium mb-1">Qualifications * (comma-separated)</label>
                    <input
                        type="text"
                        value={form.qualifications}
                        onChange={(e) => setForm((p) => ({ ...p, qualifications: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
                        placeholder="MBBS, MD Dermatology"
                    />
                    {errors.qualifications && <p className="text-xs text-red-500 mt-1">{errors.qualifications}</p>}
                </div>

                {/* Specializations */}
                <div>
                    <label className="block text-sm font-medium mb-1">Specializations *</label>
                    <div className="flex flex-wrap gap-2 mt-1">
                        {SPECIALIZATIONS.map((spec) => (
                            <button
                                key={spec}
                                type="button"
                                onClick={() => toggleSpecialization(spec)}
                                className={cn(
                                    'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                                    form.specializations.includes(spec)
                                        ? 'bg-primary text-white border-primary'
                                        : 'bg-background text-foreground border-border hover:bg-muted',
                                )}
                            >
                                {spec}
                            </button>
                        ))}
                    </div>
                    {errors.specializations && <p className="text-xs text-red-500 mt-1">{errors.specializations}</p>}
                </div>

                {/* Verticals */}
                <div>
                    <label className="block text-sm font-medium mb-1">Verticals *</label>
                    <div className="flex flex-wrap gap-2 mt-1">
                        {Object.entries(VERTICAL_LABELS).map(([key, label]) => {
                            const warning = getVerticalWarning(key);
                            return (
                                <div key={key}>
                                    <button
                                        type="button"
                                        onClick={() => toggleVertical(key)}
                                        className={cn(
                                            'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                                            form.verticals.includes(key)
                                                ? warning
                                                    ? 'bg-red-100 text-red-700 border-red-300'
                                                    : 'bg-primary text-white border-primary'
                                                : 'bg-background text-foreground border-border hover:bg-muted',
                                        )}
                                    >
                                        {label}
                                    </button>
                                    {warning && (
                                        <p className="text-xs text-red-500 mt-0.5">{warning}</p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    {errors.verticals && <p className="text-xs text-red-500 mt-1">{errors.verticals}</p>}
                </div>

                {/* Case Limit + Fee */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Daily Case Limit (1-50)</label>
                        <input
                            type="number"
                            value={form.dailyCaseLimit}
                            onChange={(e) => setForm((p) => ({ ...p, dailyCaseLimit: e.target.value }))}
                            className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
                            min={1}
                            max={50}
                        />
                        {errors.dailyCaseLimit && <p className="text-xs text-red-500 mt-1">{errors.dailyCaseLimit}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Consultation Fee (paise) *</label>
                        <input
                            type="number"
                            value={form.consultationFee}
                            onChange={(e) => setForm((p) => ({ ...p, consultationFee: e.target.value }))}
                            className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
                            placeholder="20000"
                        />
                        {errors.consultationFee && <p className="text-xs text-red-500 mt-1">{errors.consultationFee}</p>}
                    </div>
                </div>

                {/* Bio */}
                <div>
                    <label className="block text-sm font-medium mb-1">Bio</label>
                    <textarea
                        value={form.bio}
                        onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
                        rows={3}
                        placeholder="Short bio about the doctor..."
                    />
                </div>

                {/* Senior Doctor */}
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={form.seniorDoctor}
                        onChange={(e) => setForm((p) => ({ ...p, seniorDoctor: e.target.checked }))}
                        className="rounded"
                    />
                    <span className="text-sm font-medium">Senior Doctor (priority for high-risk cases)</span>
                </label>

                {/* Submit Error */}
                {submitError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                        {submitError}
                    </div>
                )}

                {/* Submit */}
                <button
                    type="submit"
                    disabled={submitting}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                >
                    {submitting ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</>
                    ) : (
                        'Create Doctor'
                    )}
                </button>
            </form>
        </div>
    );
}
