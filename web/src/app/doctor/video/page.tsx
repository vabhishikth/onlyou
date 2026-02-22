'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Video, Plus, Clock, Trash2 } from 'lucide-react';
import {
    MY_AVAILABILITY,
    SET_MY_AVAILABILITY,
    DAYS_OF_WEEK,
    TIME_SLOTS,
} from '@/graphql/doctor-video';
import type {
    AvailabilitySlot,
    MyAvailabilityResponse,
    SetMyAvailabilityResponse,
    SetAvailabilitySlotInput,
    DayOfWeek,
} from '@/graphql/doctor-video';

// Spec: Phase 13 — Doctor video availability management

export default function VideoAvailabilityPage() {
    const [showAddForm, setShowAddForm] = useState(false);
    const [newDay, setNewDay] = useState<DayOfWeek>('MONDAY');
    const [newStartTime, setNewStartTime] = useState('09:00');
    const [newEndTime, setNewEndTime] = useState('12:00');

    const { data, loading, refetch } = useQuery<MyAvailabilityResponse>(MY_AVAILABILITY);

    const [setAvailability, { loading: saving }] = useMutation<SetMyAvailabilityResponse>(
        SET_MY_AVAILABILITY,
        {
            onCompleted: () => {
                setShowAddForm(false);
                refetch();
            },
        }
    );

    const slots = data?.myAvailability || [];

    // Group slots by day of week
    const slotsByDay = DAYS_OF_WEEK.reduce<Record<string, AvailabilitySlot[]>>(
        (acc, day) => {
            const daySlots = slots.filter((s) => s.dayOfWeek === day.value);
            if (daySlots.length > 0) {
                acc[day.value] = daySlots;
            }
            return acc;
        },
        {}
    );

    const handleSave = () => {
        const existingSlots: SetAvailabilitySlotInput[] = slots.map((s) => ({
            dayOfWeek: s.dayOfWeek,
            startTime: s.startTime,
            endTime: s.endTime,
        }));

        setAvailability({
            variables: {
                slots: [
                    ...existingSlots,
                    { dayOfWeek: newDay, startTime: newStartTime, endTime: newEndTime },
                ],
            },
        });
    };

    const handleRemoveSlot = (slotToRemove: AvailabilitySlot) => {
        const remaining: SetAvailabilitySlotInput[] = slots
            .filter((s) => s.id !== slotToRemove.id)
            .map((s) => ({
                dayOfWeek: s.dayOfWeek,
                startTime: s.startTime,
                endTime: s.endTime,
            }));

        setAvailability({ variables: { slots: remaining } });
    };

    const getDayLabel = (day: string) =>
        DAYS_OF_WEEK.find((d) => d.value === day)?.label || day;

    if (loading) {
        return (
            <div data-testid="availability-loading" className="p-6 space-y-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />
                ))}
            </div>
        );
    }

    return (
        <div className="p-6 max-w-2xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-serif font-bold text-foreground">
                        Video Availability
                    </h1>
                    <p className="text-sm text-neutral-500 mt-1">
                        Set your recurring consultation slots
                    </p>
                </div>
                <button
                    data-testid="add-slot-button"
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-foreground text-white rounded-xl text-sm font-medium hover:bg-foreground/90 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Add Slot
                </button>
            </div>

            {/* Add Slot Form */}
            <AnimatePresence>
                {showAddForm && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-6 p-4 bg-accent/5 border border-accent/20 rounded-xl"
                    >
                        <h3 className="text-sm font-semibold text-foreground mb-3">
                            New Availability Slot
                        </h3>
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className="text-xs text-neutral-500 mb-1 block">Day</label>
                                <select
                                    data-testid="day-select"
                                    value={newDay}
                                    onChange={(e) => setNewDay(e.target.value as DayOfWeek)}
                                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-white"
                                >
                                    {DAYS_OF_WEEK.map((d) => (
                                        <option key={d.value} value={d.value}>
                                            {d.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs text-neutral-500 mb-1 block">Start</label>
                                <select
                                    data-testid="start-time-select"
                                    value={newStartTime}
                                    onChange={(e) => setNewStartTime(e.target.value)}
                                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-white"
                                >
                                    {TIME_SLOTS.map((t) => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs text-neutral-500 mb-1 block">End</label>
                                <select
                                    data-testid="end-time-select"
                                    value={newEndTime}
                                    onChange={(e) => setNewEndTime(e.target.value)}
                                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-white"
                                >
                                    {TIME_SLOTS.map((t) => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-4">
                            <button
                                onClick={() => setShowAddForm(false)}
                                className="px-4 py-2 text-sm text-neutral-500 hover:text-foreground transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                data-testid="save-availability-button"
                                onClick={handleSave}
                                disabled={saving}
                                className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-50"
                            >
                                {saving ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Slots List */}
            {Object.keys(slotsByDay).length === 0 ? (
                <div className="text-center py-16">
                    <Video className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
                    <p className="text-neutral-500">No availability set</p>
                    <p className="text-sm text-neutral-400 mt-1">
                        Add your recurring video consultation slots
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {DAYS_OF_WEEK.map((day) => {
                        const daySlots = slotsByDay[day.value];
                        if (!daySlots) return null;

                        return (
                            <motion.div
                                key={day.value}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white border border-border rounded-xl p-4"
                            >
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-semibold text-foreground">
                                        {day.label}
                                    </h3>
                                </div>
                                <div className="mt-2 space-y-2">
                                    {daySlots.map((slot) => (
                                        <div
                                            key={slot.id}
                                            className="flex items-center justify-between bg-neutral-50 rounded-lg px-3 py-2"
                                        >
                                            <div className="flex items-center gap-2">
                                                <Clock className="w-4 h-4 text-accent" />
                                                <span className="text-sm text-foreground">
                                                    {slot.startTime} — {slot.endTime}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => handleRemoveSlot(slot)}
                                                className="p-1.5 text-neutral-400 hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
