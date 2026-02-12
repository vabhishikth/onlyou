'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
    ArrowRight,
    Shield,
    MessageCircle,
    Truck,
    Clock,
    CheckCircle,
    Star,
    Lock,
    Award,
    ChevronDown,
} from 'lucide-react';
import { useState } from 'react';

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <Header />

            {/* Hero Section */}
            <HeroSection />

            {/* Trust Banner */}
            <TrustBanner />

            {/* Health Verticals */}
            <VerticalsSection />

            {/* How It Works */}
            <HowItWorksSection />

            {/* Why Choose Us */}
            <WhyChooseUsSection />

            {/* Testimonials */}
            <TestimonialsSection />

            {/* FAQ */}
            <FAQSection />

            {/* CTA Banner */}
            <CTABanner />

            {/* Footer */}
            <Footer />
        </div>
    );
}

function Header() {
    return (
        <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-border/50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <Link href="/" className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-primary">onlyou</span>
                    </Link>
                    <nav className="hidden md:flex items-center gap-8">
                        <Link
                            href="#conditions"
                            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Treatments
                        </Link>
                        <Link
                            href="#how-it-works"
                            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                            How It Works
                        </Link>
                        <Link
                            href="#faq"
                            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                            FAQ
                        </Link>
                    </nav>
                    <div className="flex items-center gap-3">
                        <Link href="/login" className="hidden sm:block">
                            <Button variant="ghost" size="sm">
                                Doctor Login
                            </Button>
                        </Link>
                        <Link href="#download">
                            <Button size="sm">Download App</Button>
                        </Link>
                    </div>
                </div>
            </div>
        </header>
    );
}

function HeroSection() {
    return (
        <section className="pt-24 pb-16 sm:pt-32 sm:pb-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-primary-50 via-background to-accent-50/30">
            <div className="max-w-7xl mx-auto">
                <div className="grid lg:grid-cols-2 gap-12 items-center">
                    {/* Left: Content */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                            Trusted by 50,000+ patients
                        </span>
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-6">
                            Healthcare that
                            <br />
                            <span className="text-primary">understands you</span>
                        </h1>
                        <p className="text-lg text-muted-foreground max-w-xl mb-8">
                            Get expert medical care for hair loss, sexual health, PCOS, and
                            weight management. Consult board-certified doctors from home.
                            100% confidential.
                        </p>

                        {/* CTA Buttons */}
                        <div className="flex flex-col sm:flex-row gap-4 mb-8">
                            <Link href="#download">
                                <Button size="xl" className="w-full sm:w-auto">
                                    Start Free Assessment
                                    <ArrowRight className="w-5 h-5 ml-2" />
                                </Button>
                            </Link>
                            <Link href="#how-it-works">
                                <Button
                                    variant="outline"
                                    size="xl"
                                    className="w-full sm:w-auto"
                                >
                                    See How It Works
                                </Button>
                            </Link>
                        </div>

                        {/* Trust indicators */}
                        <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                                <Shield className="w-5 h-5 text-primary" />
                                <span>100% Confidential</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Award className="w-5 h-5 text-primary" />
                                <span>Board-Certified Doctors</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Truck className="w-5 h-5 text-primary" />
                                <span>Discreet Delivery</span>
                            </div>
                        </div>
                    </motion.div>

                    {/* Right: App mockup */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="relative hidden lg:block"
                    >
                        <div className="relative w-full max-w-md mx-auto">
                            {/* Phone frame */}
                            <div className="relative bg-neutral-900 rounded-[3rem] p-3 shadow-2xl">
                                <div className="bg-white rounded-[2.5rem] overflow-hidden aspect-[9/19]">
                                    {/* App screenshot placeholder */}
                                    <div className="w-full h-full bg-gradient-to-br from-primary-50 to-primary-100 flex flex-col items-center justify-center p-8">
                                        <div className="text-4xl font-bold text-primary mb-4">
                                            onlyou
                                        </div>
                                        <div className="text-sm text-muted-foreground text-center mb-8">
                                            Your health journey starts here
                                        </div>
                                        <div className="grid grid-cols-2 gap-3 w-full">
                                            {['Hair Loss', 'Sexual Health', 'PCOS', 'Weight'].map(
                                                (item) => (
                                                    <div
                                                        key={item}
                                                        className="bg-white rounded-xl p-3 text-center shadow-soft"
                                                    >
                                                        <div className="text-xs font-medium text-foreground">
                                                            {item}
                                                        </div>
                                                    </div>
                                                )
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {/* Floating badges */}
                            <div className="absolute -left-8 top-1/4 bg-white rounded-xl p-3 shadow-soft-lg">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center">
                                        <CheckCircle className="w-4 h-4 text-success" />
                                    </div>
                                    <div>
                                        <div className="text-xs font-medium">Prescription Ready</div>
                                        <div className="text-[10px] text-muted-foreground">
                                            Dr. verified in 24h
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="absolute -right-8 bottom-1/3 bg-white rounded-xl p-3 shadow-soft-lg">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                        <Truck className="w-4 h-4 text-primary" />
                                    </div>
                                    <div>
                                        <div className="text-xs font-medium">Discreet Packaging</div>
                                        <div className="text-[10px] text-muted-foreground">
                                            No labels visible
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}

function TrustBanner() {
    return (
        <section className="py-8 px-4 sm:px-6 lg:px-8 bg-white border-y border-border/50">
            <div className="max-w-7xl mx-auto">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                    <div>
                        <div className="text-3xl font-bold text-primary">50K+</div>
                        <div className="text-sm text-muted-foreground">Happy Patients</div>
                    </div>
                    <div>
                        <div className="text-3xl font-bold text-primary">100+</div>
                        <div className="text-sm text-muted-foreground">Expert Doctors</div>
                    </div>
                    <div>
                        <div className="text-3xl font-bold text-primary">4.8</div>
                        <div className="text-sm text-muted-foreground">App Rating</div>
                    </div>
                    <div>
                        <div className="text-3xl font-bold text-primary">24h</div>
                        <div className="text-sm text-muted-foreground">Avg Response Time</div>
                    </div>
                </div>
            </div>
        </section>
    );
}

function VerticalsSection() {
    const verticals = [
        {
            id: 'hair-loss',
            title: 'Hair Loss',
            subtitle: 'Regrow your confidence',
            description:
                'Clinically proven treatments for male and female pattern hair loss. See results in 3-6 months.',
            icon: '💇',
            features: ['FDA-approved treatments', 'Progress tracking', 'DHT blockers + growth stimulants'],
        },
        {
            id: 'sexual-health',
            title: 'Sexual Health',
            subtitle: 'Performance solutions',
            description:
                'Discreet treatment for ED and PE. Board-certified doctors, genuine medications, delivered privately.',
            icon: '💪',
            features: ['100% confidential', 'Same-day prescriptions', 'Genuine branded medications'],
        },
        {
            id: 'pcos',
            title: 'PCOS Care',
            subtitle: 'Hormone balance',
            description:
                'Comprehensive PCOS management with personalized treatment plans and ongoing support.',
            icon: '🌸',
            features: ['Hormonal balance', 'Weight management', 'Fertility support'],
        },
        {
            id: 'weight',
            title: 'Weight Loss',
            subtitle: 'Medical weight management',
            description:
                'Doctor-supervised weight loss programs with proven medications and lifestyle coaching.',
            icon: '⚖️',
            features: ['GLP-1 medications', 'Diet planning', 'Regular check-ins'],
        },
    ];

    return (
        <section id="conditions" className="py-20 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-16"
                >
                    <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
                        Our Treatments
                    </span>
                    <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
                        Expert care for sensitive conditions
                    </h2>
                    <p className="text-muted-foreground max-w-2xl mx-auto">
                        We specialize in conditions that people often feel embarrassed to
                        discuss. Our platform ensures complete privacy and professional care.
                    </p>
                </motion.div>

                <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
                    {verticals.map((vertical, index) => (
                        <motion.div
                            key={vertical.id}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                            className="group relative bg-white rounded-2xl p-6 sm:p-8 shadow-soft hover:shadow-soft-lg transition-all duration-300 border border-border/50"
                        >
                            <div className="flex items-start gap-4">
                                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center text-2xl shrink-0">
                                    {vertical.icon}
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-xl font-semibold text-foreground mb-1">
                                        {vertical.title}
                                    </h3>
                                    <p className="text-sm text-primary font-medium mb-3">
                                        {vertical.subtitle}
                                    </p>
                                    <p className="text-muted-foreground text-sm mb-4">
                                        {vertical.description}
                                    </p>
                                    <ul className="space-y-2 mb-6">
                                        {vertical.features.map((feature) => (
                                            <li
                                                key={feature}
                                                className="flex items-center gap-2 text-sm text-muted-foreground"
                                            >
                                                <CheckCircle className="w-4 h-4 text-success shrink-0" />
                                                {feature}
                                            </li>
                                        ))}
                                    </ul>
                                    <Link href="#download">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="group-hover:bg-primary group-hover:text-white transition-colors"
                                        >
                                            Start Assessment
                                            <ArrowRight className="w-4 h-4 ml-2" />
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}

function HowItWorksSection() {
    const steps = [
        {
            number: '1',
            title: 'Quick Health Assessment',
            description:
                'Answer a few questions about your health and symptoms. Takes just 5 minutes.',
        },
        {
            number: '2',
            title: 'Doctor Review',
            description:
                'A board-certified doctor reviews your case and creates a personalized treatment plan.',
        },
        {
            number: '3',
            title: 'Get Your Treatment',
            description:
                'Receive your prescribed medications in discreet packaging at your doorstep.',
        },
        {
            number: '4',
            title: 'Ongoing Support',
            description:
                'Track your progress and message your doctor anytime with questions or concerns.',
        },
    ];

    return (
        <section
            id="how-it-works"
            className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-neutral-50 to-white"
        >
            <div className="max-w-7xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-16"
                >
                    <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
                        Simple Process
                    </span>
                    <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
                        How Onlyou works
                    </h2>
                    <p className="text-muted-foreground max-w-2xl mx-auto">
                        Get started in minutes. No waiting rooms, no awkward conversations.
                    </p>
                </motion.div>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {steps.map((step, index) => (
                        <motion.div
                            key={step.number}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                            className="relative"
                        >
                            {/* Connector line */}
                            {index < steps.length - 1 && (
                                <div className="hidden lg:block absolute top-8 left-1/2 w-full h-0.5 bg-border" />
                            )}
                            <div className="relative bg-white rounded-2xl p-6 text-center shadow-soft">
                                <div className="w-16 h-16 rounded-full bg-primary text-white flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                                    {step.number}
                                </div>
                                <h3 className="text-lg font-semibold text-foreground mb-2">
                                    {step.title}
                                </h3>
                                <p className="text-sm text-muted-foreground">{step.description}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}

function WhyChooseUsSection() {
    const benefits = [
        {
            icon: <Shield className="w-6 h-6" />,
            title: '100% Confidential',
            description:
                'Your health information is encrypted and never shared. We take privacy seriously.',
        },
        {
            icon: <Award className="w-6 h-6" />,
            title: 'Board-Certified Doctors',
            description:
                'All our doctors are registered with the Medical Council of India and specialize in their fields.',
        },
        {
            icon: <Truck className="w-6 h-6" />,
            title: 'Discreet Delivery',
            description:
                'Plain packaging with no indication of contents. Your privacy is our priority.',
        },
        {
            icon: <Lock className="w-6 h-6" />,
            title: 'Genuine Medications',
            description:
                'Only FDA-approved medications from licensed pharmacies. No counterfeits, ever.',
        },
        {
            icon: <MessageCircle className="w-6 h-6" />,
            title: 'Ongoing Support',
            description:
                'Message your doctor anytime. We are here to help throughout your treatment journey.',
        },
        {
            icon: <Clock className="w-6 h-6" />,
            title: '24-Hour Response',
            description:
                'Most consultations reviewed within 24 hours. No more waiting weeks for appointments.',
        },
    ];

    return (
        <section className="py-20 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-16"
                >
                    <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
                        Why Choose Us
                    </span>
                    <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
                        Healthcare designed around you
                    </h2>
                    <p className="text-muted-foreground max-w-2xl mx-auto">
                        We have built Onlyou to address the challenges of seeking care for
                        sensitive health conditions in India.
                    </p>
                </motion.div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {benefits.map((benefit, index) => (
                        <motion.div
                            key={benefit.title}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.05 }}
                            className="bg-white rounded-xl p-6 shadow-soft border border-border/50"
                        >
                            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                                {benefit.icon}
                            </div>
                            <h3 className="text-lg font-semibold text-foreground mb-2">
                                {benefit.title}
                            </h3>
                            <p className="text-sm text-muted-foreground">{benefit.description}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}

function TestimonialsSection() {
    const testimonials = [
        {
            quote: 'Finally found a platform where I could discuss my hair loss without feeling judged. The treatment is working great!',
            author: 'Rahul M.',
            location: 'Mumbai',
            condition: 'Hair Loss',
            rating: 5,
        },
        {
            quote: 'The discreet packaging and professional doctors made this so much easier than I expected. Highly recommend.',
            author: 'Amit K.',
            location: 'Delhi',
            condition: 'Sexual Health',
            rating: 5,
        },
        {
            quote: 'Managing my PCOS has never been easier. The personalized treatment plan and follow-ups are excellent.',
            author: 'Priya S.',
            location: 'Bangalore',
            condition: 'PCOS',
            rating: 5,
        },
    ];

    return (
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-primary-50/50 to-white">
            <div className="max-w-7xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-16"
                >
                    <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
                        Patient Stories
                    </span>
                    <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
                        Trusted by thousands
                    </h2>
                    <p className="text-muted-foreground max-w-2xl mx-auto">
                        Real stories from real patients who found the care they needed.
                    </p>
                </motion.div>

                <div className="grid md:grid-cols-3 gap-6">
                    {testimonials.map((testimonial, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                            className="bg-white rounded-2xl p-6 shadow-soft border border-border/50"
                        >
                            <div className="flex gap-1 mb-4">
                                {[...Array(testimonial.rating)].map((_, i) => (
                                    <Star
                                        key={i}
                                        className="w-5 h-5 fill-accent text-accent"
                                    />
                                ))}
                            </div>
                            <p className="text-foreground mb-6 italic">
                                &quot;{testimonial.quote}&quot;
                            </p>
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="font-medium text-foreground">
                                        {testimonial.author}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        {testimonial.location}
                                    </div>
                                </div>
                                <span className="text-xs px-3 py-1 rounded-full bg-primary/10 text-primary">
                                    {testimonial.condition}
                                </span>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}

function FAQSection() {
    const faqs = [
        {
            question: 'Is my information kept confidential?',
            answer: 'Absolutely. We use bank-grade encryption for all data. Your health information is never shared with anyone except your treating doctor. Even our delivery packages have no indication of what is inside.',
        },
        {
            question: 'Are your doctors real and licensed?',
            answer: 'Yes, all our doctors are registered with the Medical Council of India (MCI) and have verified credentials. They specialize in their respective fields and undergo regular training.',
        },
        {
            question: 'How quickly will I receive my medication?',
            answer: 'Most consultations are reviewed within 24 hours. Once prescribed, medications are typically delivered within 2-4 business days depending on your location.',
        },
        {
            question: 'What if the treatment does not work for me?',
            answer: 'Our doctors monitor your progress and can adjust your treatment plan as needed. If you are not seeing results, message your doctor and they will work with you to find a better solution.',
        },
        {
            question: 'Are the medications genuine?',
            answer: 'We only source medications from licensed pharmacies. All medications are FDA/CDSCO approved and come with proper packaging and batch numbers.',
        },
    ];

    const [openIndex, setOpenIndex] = useState<number | null>(0);

    return (
        <section id="faq" className="py-20 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-16"
                >
                    <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
                        FAQ
                    </span>
                    <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
                        Common questions
                    </h2>
                    <p className="text-muted-foreground">
                        Everything you need to know about Onlyou.
                    </p>
                </motion.div>

                <div className="space-y-4">
                    {faqs.map((faq, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 10 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.05 }}
                            className="bg-white rounded-xl border border-border/50 overflow-hidden"
                        >
                            <button
                                onClick={() =>
                                    setOpenIndex(openIndex === index ? null : index)
                                }
                                className="w-full flex items-center justify-between p-5 text-left"
                            >
                                <span className="font-medium text-foreground pr-4">
                                    {faq.question}
                                </span>
                                <ChevronDown
                                    className={`w-5 h-5 text-muted-foreground shrink-0 transition-transform ${
                                        openIndex === index ? 'rotate-180' : ''
                                    }`}
                                />
                            </button>
                            {openIndex === index && (
                                <div className="px-5 pb-5 text-muted-foreground text-sm">
                                    {faq.answer}
                                </div>
                            )}
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}

function CTABanner() {
    return (
        <section
            id="download"
            className="py-20 px-4 sm:px-6 lg:px-8 bg-primary"
        >
            <div className="max-w-4xl mx-auto text-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                >
                    <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                        Start your health journey today
                    </h2>
                    <p className="text-primary-100 text-lg mb-8 max-w-2xl mx-auto">
                        Download the Onlyou app and get your free health assessment. Your
                        first consultation is on us.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <a
                            href="#"
                            className="inline-flex items-center justify-center gap-3 bg-white text-foreground px-6 py-3 rounded-xl hover:bg-neutral-100 transition-colors"
                        >
                            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                            </svg>
                            <div className="text-left">
                                <div className="text-xs">Download on the</div>
                                <div className="text-lg font-semibold -mt-1">App Store</div>
                            </div>
                        </a>
                        <a
                            href="#"
                            className="inline-flex items-center justify-center gap-3 bg-white text-foreground px-6 py-3 rounded-xl hover:bg-neutral-100 transition-colors"
                        >
                            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.198l2.807 1.626a1 1 0 010 1.73l-2.808 1.626L15.206 12l2.492-2.491zM5.864 2.658L16.8 8.99l-2.302 2.302-8.634-8.634z" />
                            </svg>
                            <div className="text-left">
                                <div className="text-xs">Get it on</div>
                                <div className="text-lg font-semibold -mt-1">Google Play</div>
                            </div>
                        </a>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}

function Footer() {
    return (
        <footer className="py-12 px-4 sm:px-6 lg:px-8 bg-neutral-900 text-white">
            <div className="max-w-7xl mx-auto">
                <div className="grid md:grid-cols-4 gap-8 mb-12">
                    {/* Brand */}
                    <div className="md:col-span-2">
                        <Link href="/" className="text-2xl font-bold text-white">
                            onlyou
                        </Link>
                        <p className="mt-4 text-neutral-400 max-w-md">
                            Confidential healthcare for hair loss, sexual health, PCOS, and
                            weight management. Expert doctors, discreet delivery, ongoing
                            support.
                        </p>
                        <div className="mt-6 flex gap-4">
                            <a
                                href="#"
                                className="text-neutral-400 hover:text-white transition-colors"
                                aria-label="Twitter"
                            >
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" />
                                </svg>
                            </a>
                            <a
                                href="#"
                                className="text-neutral-400 hover:text-white transition-colors"
                                aria-label="Instagram"
                            >
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                                </svg>
                            </a>
                            <a
                                href="#"
                                className="text-neutral-400 hover:text-white transition-colors"
                                aria-label="LinkedIn"
                            >
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                                </svg>
                            </a>
                        </div>
                    </div>

                    {/* Links */}
                    <div>
                        <h4 className="font-semibold text-white mb-4">Treatments</h4>
                        <ul className="space-y-2">
                            <li>
                                <a
                                    href="#"
                                    className="text-neutral-400 hover:text-white transition-colors"
                                >
                                    Hair Loss
                                </a>
                            </li>
                            <li>
                                <a
                                    href="#"
                                    className="text-neutral-400 hover:text-white transition-colors"
                                >
                                    Sexual Health
                                </a>
                            </li>
                            <li>
                                <a
                                    href="#"
                                    className="text-neutral-400 hover:text-white transition-colors"
                                >
                                    PCOS
                                </a>
                            </li>
                            <li>
                                <a
                                    href="#"
                                    className="text-neutral-400 hover:text-white transition-colors"
                                >
                                    Weight Loss
                                </a>
                            </li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-semibold text-white mb-4">Company</h4>
                        <ul className="space-y-2">
                            <li>
                                <a
                                    href="#"
                                    className="text-neutral-400 hover:text-white transition-colors"
                                >
                                    About Us
                                </a>
                            </li>
                            <li>
                                <a
                                    href="#"
                                    className="text-neutral-400 hover:text-white transition-colors"
                                >
                                    For Doctors
                                </a>
                            </li>
                            <li>
                                <a
                                    href="#"
                                    className="text-neutral-400 hover:text-white transition-colors"
                                >
                                    Privacy Policy
                                </a>
                            </li>
                            <li>
                                <a
                                    href="#"
                                    className="text-neutral-400 hover:text-white transition-colors"
                                >
                                    Terms of Service
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Bottom */}
                <div className="pt-8 border-t border-neutral-800 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <p className="text-sm text-neutral-500">
                        &copy; {new Date().getFullYear()} Onlyou Health Pvt. Ltd. All rights
                        reserved.
                    </p>
                    <div className="flex items-center gap-4 text-sm text-neutral-500">
                        <span>Made with care in India</span>
                        <span>|</span>
                        <a href="mailto:support@onlyou.life" className="hover:text-white">
                            support@onlyou.life
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
}
