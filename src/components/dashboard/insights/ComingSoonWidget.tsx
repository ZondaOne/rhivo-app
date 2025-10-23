'use client';

import { ReactNode } from 'react';
import { useTranslations } from 'next-intl';

interface ComingSoonWidgetProps {
  title: string;
  description: string;
  icon: ReactNode;
}

export function ComingSoonWidget({ title, description, icon }: ComingSoonWidgetProps) {
  const t = useTranslations('dashboard.insights.comingSoon');

  return (
    <div className="bg-white border border-gray-200/60 rounded-2xl p-8 relative overflow-hidden shadow-sm">
      {/* Coming Soon Badge */}
      <div className="absolute top-6 right-6">
        <span className="inline-flex items-center px-3 py-1 rounded-xl text-xs font-semibold bg-gray-100 text-gray-600">
          {t('badge')}
        </span>
      </div>

      {/* Content */}
      <div className="flex items-start gap-6">
        {/* Icon */}
        <div className="flex-shrink-0 w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400">
          {icon}
        </div>

        {/* Text */}
        <div className="flex-1 pt-2">
          <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
          <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
        </div>
      </div>

      {/* Preview Placeholder */}
      <div className="mt-8 h-48 bg-gray-50 rounded-xl flex items-center justify-center">
        <div className="text-center">
          <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p className="text-xs text-gray-400">Preview coming soon</p>
        </div>
      </div>

      {/* Decorative gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-gray-50/50 pointer-events-none" />
    </div>
  );
}
