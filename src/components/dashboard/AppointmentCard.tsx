'use client';

import { useState } from 'react';
import { Appointment } from '@/db/types';
import { formatTime, getAppointmentDuration } from '@/lib/calendar-utils';

interface AppointmentCardProps {
  appointment: Appointment;
  onReschedule: (newDate: Date) => void;
  onCancel?: () => void;
  onEdit?: () => void;
}

export function AppointmentCard({ appointment, onReschedule, onCancel, onEdit }: AppointmentCardProps) {
  const [isDragging, setIsDragging] = useState(false);
  const duration = getAppointmentDuration(appointment);

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    confirmed: 'bg-teal-100 text-teal-800 border-teal-200',
    cancelled: 'bg-gray-100 text-gray-600 border-gray-200',
    completed: 'bg-green-100 text-green-800 border-green-200',
  };

  return (
    <div
      draggable
      onDragStart={(e) => {
        setIsDragging(true);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('appointmentId', appointment.id);
      }}
      onDragEnd={() => setIsDragging(false)}
      className={`p-3 mb-2 rounded-lg border-2 transition-all cursor-move ${
        statusColors[appointment.status]
      } ${isDragging ? 'opacity-50 scale-95' : 'hover:shadow-md'}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="font-medium text-sm mb-1">
            {formatTime(new Date(appointment.start_time))} - {formatTime(new Date(appointment.end_time))}
          </div>
          <div className="text-xs opacity-75">
            {duration} minutes
          </div>
          {appointment.customer_name && (
            <div className="text-xs mt-1 font-medium">
              {appointment.customer_name}
            </div>
          )}
          {appointment.customer_email && (
            <div className="text-xs opacity-75">
              {appointment.customer_email}
            </div>
          )}
        </div>

        <div className="flex gap-1 ml-2">
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="p-1 hover:bg-white hover:bg-opacity-50 rounded transition-colors"
              title="Edit appointment"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          )}
          {onCancel && appointment.status !== 'cancelled' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm('Are you sure you want to cancel this appointment?')) {
                  onCancel();
                }
              }}
              className="p-1 hover:bg-white hover:bg-opacity-50 rounded transition-colors"
              title="Cancel appointment"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {appointment.notes && (
        <div className="text-xs mt-2 pt-2 border-t border-current border-opacity-20">
          {appointment.notes}
        </div>
      )}
    </div>
  );
}