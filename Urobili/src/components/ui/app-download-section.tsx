"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface AppFeature {
  icon: React.ReactNode;
  title: string;
}

export interface AppBenefit {
  icon: React.ReactNode;
  title: string;
}

export interface AppDownloadSectionProps {
  title: string;
  subtitle: string;
  features: AppFeature[];
  benefits: AppBenefit[];
  qrCodeUrl?: string;
  qrCodeAlt?: string;
  mainImageUrl: string;
  mainImageAlt: string;
  actionSlot?: React.ReactNode;
  qrCaption?: string;
  className?: string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { y: 18, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring" as const,
      stiffness: 110,
      damping: 16,
    },
  },
};

const imageVariants = {
  hidden: { y: 24, opacity: 0, scale: 0.94 },
  visible: {
    y: 0,
    opacity: 1,
    scale: 1,
    transition: {
      type: "spring" as const,
      duration: 0.9,
      bounce: 0.25,
    },
  },
};

export const AppDownloadSection = ({
  title,
  subtitle,
  features,
  benefits,
  qrCodeUrl,
  qrCodeAlt,
  mainImageUrl,
  mainImageAlt,
  actionSlot,
  qrCaption,
  className,
}: AppDownloadSectionProps) => {
  return (
    <section className={cn("w-full bg-transparent text-slate-900 dark:text-slate-100 py-4 sm:py-8", className)}>
      <motion.div
        className="mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-12 items-center"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* Left Content Column */}
        <div className="flex flex-col space-y-6">
          <motion.div className="space-y-2 text-center lg:text-left" variants={itemVariants}>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">{title}</h2>
            <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base leading-relaxed">{subtitle}</p>
          </motion.div>

          {/* Primary Android PWA Action Slot */}
          {actionSlot && <motion.div variants={itemVariants}>{actionSlot}</motion.div>}

          {/* Features Section */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                className="flex flex-col items-center text-center space-y-2 p-3 rounded-2xl bg-white/90 dark:bg-slate-900/80 border border-blue-100 dark:border-slate-800 shadow-xs"
                variants={itemVariants}
              >
                <div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-500/15 text-[#1D63DC] dark:text-sky-400">
                  {feature.icon}
                </div>
                <span className="text-xs font-bold leading-snug text-slate-800 dark:text-slate-100">
                  {feature.title}
                </span>
              </motion.div>
            ))}
          </div>

          {/* QR Code Section (when provided) */}
          {qrCodeUrl && (
            <motion.div
              className="flex flex-col items-center space-y-2 p-4 rounded-2xl bg-white/90 dark:bg-slate-900/80 border border-blue-100 dark:border-slate-800"
              variants={itemVariants}
            >
              <img
                src={qrCodeUrl}
                alt={qrCodeAlt || "Scan QR Code"}
                className="w-32 h-32 rounded-xl border border-slate-200 dark:border-slate-700 bg-white p-1.5"
              />
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {qrCaption || "Scan QR Code to Open Android Web App"}
              </p>
            </motion.div>
          )}

          {/* Benefits Section */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            {benefits.map((benefit, index) => (
              <motion.div
                key={index}
                className="flex items-center justify-center lg:justify-start gap-2 px-3 py-2.5 rounded-xl bg-blue-50/70 dark:bg-slate-900/70 border border-blue-100/80 dark:border-slate-800"
                variants={itemVariants}
              >
                <div className="text-[#1D63DC] dark:text-sky-400 shrink-0">{benefit.icon}</div>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{benefit.title}</span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Right Image Column */}
        <motion.div className="flex items-center justify-center" variants={imageVariants}>
          <div className="relative w-full max-w-sm rounded-3xl overflow-hidden shadow-xl border border-blue-100 dark:border-slate-800 bg-white dark:bg-slate-900">
            <img
              src={mainImageUrl}
              alt={mainImageAlt}
              className="w-full h-56 sm:h-72 object-cover"
            />
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
};
