'use client';

import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
    'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
    {
        variants: {
            variant: {
                default: 'bg-primary/10 text-primary',
                secondary: 'bg-secondary/10 text-secondary',
                success: 'bg-success/10 text-success',
                warning: 'bg-warning/10 text-warning',
                error: 'bg-error/10 text-error',
                outline: 'border border-border text-muted-foreground',
                muted: 'bg-muted text-muted-foreground',
            },
            size: {
                default: 'px-2.5 py-0.5 text-xs',
                sm: 'px-2 py-0.5 text-[10px]',
                lg: 'px-3 py-1 text-sm',
            },
        },
        defaultVariants: {
            variant: 'default',
            size: 'default',
        },
    }
);

export interface BadgeProps
    extends React.HTMLAttributes<HTMLSpanElement>,
        VariantProps<typeof badgeVariants> {
    dot?: boolean;
}

export function Badge({
    className,
    variant,
    size,
    dot,
    children,
    ...props
}: BadgeProps) {
    return (
        <span
            className={cn(badgeVariants({ variant, size }), className)}
            {...props}
        >
            {dot && (
                <span
                    className={cn(
                        'w-1.5 h-1.5 rounded-full mr-1.5',
                        variant === 'success' && 'bg-success',
                        variant === 'warning' && 'bg-warning',
                        variant === 'error' && 'bg-error',
                        variant === 'default' && 'bg-primary',
                        variant === 'secondary' && 'bg-secondary',
                        (variant === 'outline' || variant === 'muted') && 'bg-muted-foreground'
                    )}
                />
            )}
            {children}
        </span>
    );
}

// Pre-built status badges for common use cases

export type ConsultationStatusBadgeProps = {
    status:
        | 'PENDING_REVIEW'
        | 'IN_REVIEW'
        | 'NEEDS_INFO'
        | 'APPROVED'
        | 'REJECTED'
        | 'FLAGGED';
};

const consultationStatusConfig: Record<
    ConsultationStatusBadgeProps['status'],
    { label: string; variant: BadgeProps['variant'] }
> = {
    PENDING_REVIEW: { label: 'Pending Review', variant: 'warning' },
    IN_REVIEW: { label: 'In Review', variant: 'default' },
    NEEDS_INFO: { label: 'Needs Info', variant: 'warning' },
    APPROVED: { label: 'Approved', variant: 'success' },
    REJECTED: { label: 'Rejected', variant: 'error' },
    FLAGGED: { label: 'Flagged', variant: 'error' },
};

export function ConsultationStatusBadge({ status }: ConsultationStatusBadgeProps) {
    const config = consultationStatusConfig[status];
    return (
        <Badge variant={config.variant} dot>
            {config.label}
        </Badge>
    );
}

export type OrderStatusBadgeProps = {
    status:
        | 'PRESCRIPTION_CREATED'
        | 'SENT_TO_PHARMACY'
        | 'PHARMACY_PREPARING'
        | 'PHARMACY_READY'
        | 'PHARMACY_ISSUE'
        | 'PICKUP_ARRANGED'
        | 'OUT_FOR_DELIVERY'
        | 'DELIVERED'
        | 'DELIVERY_FAILED'
        | 'CANCELLED';
};

const orderStatusConfig: Record<
    OrderStatusBadgeProps['status'],
    { label: string; variant: BadgeProps['variant'] }
> = {
    PRESCRIPTION_CREATED: { label: 'Created', variant: 'muted' },
    SENT_TO_PHARMACY: { label: 'Sent to Pharmacy', variant: 'default' },
    PHARMACY_PREPARING: { label: 'Preparing', variant: 'warning' },
    PHARMACY_READY: { label: 'Ready', variant: 'success' },
    PHARMACY_ISSUE: { label: 'Issue', variant: 'error' },
    PICKUP_ARRANGED: { label: 'Pickup Arranged', variant: 'default' },
    OUT_FOR_DELIVERY: { label: 'Out for Delivery', variant: 'warning' },
    DELIVERED: { label: 'Delivered', variant: 'success' },
    DELIVERY_FAILED: { label: 'Failed', variant: 'error' },
    CANCELLED: { label: 'Cancelled', variant: 'muted' },
};

export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
    const config = orderStatusConfig[status];
    return (
        <Badge variant={config.variant} dot>
            {config.label}
        </Badge>
    );
}

export type LabOrderStatusBadgeProps = {
    status:
        | 'ORDERED'
        | 'SLOT_BOOKED'
        | 'PHLEBOTOMIST_ASSIGNED'
        | 'PHLEBOTOMIST_EN_ROUTE'
        | 'SAMPLE_COLLECTED'
        | 'COLLECTION_FAILED'
        | 'SAMPLE_IN_TRANSIT'
        | 'SAMPLE_RECEIVED'
        | 'PROCESSING'
        | 'RESULTS_UPLOADED'
        | 'RESULTS_REVIEWED'
        | 'CANCELLED';
};

const labOrderStatusConfig: Record<
    LabOrderStatusBadgeProps['status'],
    { label: string; variant: BadgeProps['variant'] }
> = {
    ORDERED: { label: 'Ordered', variant: 'muted' },
    SLOT_BOOKED: { label: 'Slot Booked', variant: 'default' },
    PHLEBOTOMIST_ASSIGNED: { label: 'Assigned', variant: 'default' },
    PHLEBOTOMIST_EN_ROUTE: { label: 'En Route', variant: 'warning' },
    SAMPLE_COLLECTED: { label: 'Collected', variant: 'success' },
    COLLECTION_FAILED: { label: 'Failed', variant: 'error' },
    SAMPLE_IN_TRANSIT: { label: 'In Transit', variant: 'warning' },
    SAMPLE_RECEIVED: { label: 'Received', variant: 'success' },
    PROCESSING: { label: 'Processing', variant: 'warning' },
    RESULTS_UPLOADED: { label: 'Results Ready', variant: 'success' },
    RESULTS_REVIEWED: { label: 'Reviewed', variant: 'success' },
    CANCELLED: { label: 'Cancelled', variant: 'muted' },
};

export function LabOrderStatusBadge({ status }: LabOrderStatusBadgeProps) {
    const config = labOrderStatusConfig[status];
    return (
        <Badge variant={config.variant} dot>
            {config.label}
        </Badge>
    );
}

// Priority badge
export function PriorityBadge({ priority }: { priority: 'low' | 'medium' | 'high' | 'urgent' }) {
    const config: Record<typeof priority, { label: string; variant: BadgeProps['variant'] }> = {
        low: { label: 'Low', variant: 'muted' },
        medium: { label: 'Medium', variant: 'default' },
        high: { label: 'High', variant: 'warning' },
        urgent: { label: 'Urgent', variant: 'error' },
    };
    return (
        <Badge variant={config[priority].variant} size="sm">
            {config[priority].label}
        </Badge>
    );
}

// Vertical badge
export function VerticalBadge({
    vertical,
}: {
    vertical: 'HAIR_LOSS' | 'SEXUAL_HEALTH' | 'PCOS' | 'WEIGHT_MANAGEMENT';
}) {
    const labels: Record<typeof vertical, string> = {
        HAIR_LOSS: 'Hair Loss',
        SEXUAL_HEALTH: 'Sexual Health',
        PCOS: 'PCOS',
        WEIGHT_MANAGEMENT: 'Weight',
    };
    return <Badge variant="outline">{labels[vertical]}</Badge>;
}
