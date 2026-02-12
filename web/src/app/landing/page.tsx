'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-50 via-background to-accent-50">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-border/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <Link href="/" className="text-2xl font-bold text-primary">
                            onlyou
                        </Link>
                        <Link href="/login">
                            <Button variant="ghost">Sign In</Button>
                        </Link>
                    </div>
                </div>
            </header>

            {/* Hero */}
            <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
                <div className="max-w-4xl mx-auto text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                            Healthcare Provider Portal
                        </span>
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-6">
                            Modern healthcare
                            <br />
                            <span className="text-primary">management</span>
                        </h1>
                        <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
                            Streamline your practice with our comprehensive telehealth platform.
                            Manage consultations, prescriptions, and patient care — all in one place.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link href="/login">
                                <Button size="xl" className="w-full sm:w-auto">
                                    Access Doctor Portal
                                    <ArrowRight className="w-5 h-5 ml-2" />
                                </Button>
                            </Link>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Features preview */}
            <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white/50">
                <div className="max-w-6xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5 }}
                        className="text-center mb-12"
                    >
                        <h2 className="text-3xl font-bold text-foreground mb-4">
                            Built for healthcare professionals
                        </h2>
                        <p className="text-muted-foreground max-w-2xl mx-auto">
                            Everything you need to provide exceptional patient care
                        </p>
                    </motion.div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {features.map((feature, index) => (
                            <motion.div
                                key={feature.title}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: index * 0.1 }}
                                className="card-premium p-6"
                            >
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                                    <span className="text-2xl">{feature.emoji}</span>
                                </div>
                                <h3 className="text-lg font-semibold text-foreground mb-2">
                                    {feature.title}
                                </h3>
                                <p className="text-muted-foreground text-sm">
                                    {feature.description}
                                </p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-border/50">
                <div className="max-w-6xl mx-auto text-center">
                    <p className="text-sm text-muted-foreground">
                        &copy; {new Date().getFullYear()} Onlyou Health. All rights reserved.
                    </p>
                </div>
            </footer>
        </div>
    );
}

const features = [
    {
        emoji: '📋',
        title: 'Smart Case Queue',
        description:
            'AI-prioritized case management with condition-specific workflows and automatic flagging.',
    },
    {
        emoji: '💊',
        title: 'Prescription Builder',
        description:
            'Condition-specific templates with contraindication checking and digital signing.',
    },
    {
        emoji: '🧪',
        title: 'Lab Integration',
        description:
            'Order and track lab tests with automated result notifications and abnormal value alerts.',
    },
];
