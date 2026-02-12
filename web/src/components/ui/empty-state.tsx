'use client';

import {
    Inbox,
    Search,
    Users,
    Calendar,
    ShoppingBag,
    MessageSquare,
    Bell,
    ClipboardList,
    Pill,
    TestTube,
    type LucideIcon,
} from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';

export type EmptyStateType =
    | 'default'
    | 'search'
    | 'cases'
    | 'patients'
    | 'appointments'
    | 'orders'
    | 'messages'
    | 'notifications'
    | 'prescriptions'
    | 'lab-results';

interface EmptyStateProps {
    type?: EmptyStateType;
    title?: string;
    message?: string;
    icon?: LucideIcon;
    action?: {
        label: string;
        onClick: () => void;
    };
    className?: string;
    compact?: boolean;
}

const emptyConfig: Record<
    EmptyStateType,
    { icon: LucideIcon; title: string; message: string }
> = {
    default: {
        icon: Inbox,
        title: 'No data yet',
        message: 'There is nothing to display here at the moment.',
    },
    search: {
        icon: Search,
        title: 'No results found',
        message: 'Try adjusting your search or filter criteria.',
    },
    cases: {
        icon: ClipboardList,
        title: 'No cases',
        message: 'No cases match your current filters. Cases will appear here once assigned.',
    },
    patients: {
        icon: Users,
        title: 'No patients',
        message: 'No patients found. New patients will appear here after registration.',
    },
    appointments: {
        icon: Calendar,
        title: 'No appointments',
        message: 'No appointments scheduled. Appointments will appear here once booked.',
    },
    orders: {
        icon: ShoppingBag,
        title: 'No orders',
        message: 'No orders found. Orders will appear here once placed.',
    },
    messages: {
        icon: MessageSquare,
        title: 'No messages',
        message: 'No messages yet. Start a conversation to see your messages here.',
    },
    notifications: {
        icon: Bell,
        title: 'No notifications',
        message: 'You are all caught up! Notifications will appear here.',
    },
    prescriptions: {
        icon: Pill,
        title: 'No prescriptions',
        message: 'No prescriptions found. Prescriptions will appear here once created.',
    },
    'lab-results': {
        icon: TestTube,
        title: 'No lab results',
        message: 'No lab results yet. Results will appear here once available.',
    },
};

export function EmptyState({
    type = 'default',
    title,
    message,
    icon: CustomIcon,
    action,
    className,
    compact = false,
}: EmptyStateProps) {
    const config = emptyConfig[type];
    const Icon = CustomIcon || config.icon;

    if (compact) {
        return (
            <div
                className={cn(
                    'flex items-center gap-3 p-4 bg-muted/50 rounded-xl',
                    className
                )}
            >
                <Icon className="w-5 h-5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                    <p className="text-sm text-muted-foreground">
                        {title || config.title}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div
            className={cn(
                'flex flex-col items-center justify-center py-12 px-4 text-center',
                className
            )}
        >
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Icon className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
                {title || config.title}
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm mb-6">
                {message || config.message}
            </p>
            {action && (
                <Button variant="outline" onClick={action.onClick}>
                    {action.label}
                </Button>
            )}
        </div>
    );
}

// Search empty state with illustration
export function SearchEmptyState({
    query,
    onClear,
}: {
    query: string;
    onClear?: () => void;
}) {
    return (
        <EmptyState
            type="search"
            title="No results found"
            message={`No results for "${query}". Try different keywords or check spelling.`}
            action={
                onClear
                    ? {
                          label: 'Clear search',
                          onClick: onClear,
                      }
                    : undefined
            }
        />
    );
}

// Filter empty state
export function FilterEmptyState({
    onClearFilters,
}: {
    onClearFilters?: () => void;
}) {
    return (
        <EmptyState
            type="search"
            title="No matching results"
            message="No items match your current filters. Try adjusting or clearing filters."
            action={
                onClearFilters
                    ? {
                          label: 'Clear filters',
                          onClick: onClearFilters,
                      }
                    : undefined
            }
        />
    );
}
