'use client';

import { useEffect, useState, Fragment } from 'react';
import { CalendarView, generateMonthCalendar, generateTimeSlots, formatDate, formatTime, CalendarDay, TimeSlot } from '@/lib/calendar-utils';
import { Appointment } from '@/db/types';
import { AppointmentCard } from './AppointmentCard';
import { apiRequest } from '@/lib/auth/api-client';
import { useAuth } from '@/contexts/AuthContext';

interface CalendarProps {
  view: CalendarView;
  currentDate: Date;
}

export function Calendar({ view, currentDate }: CalendarProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedAppointment, setDraggedAppointment] = useState<Appointment | null>(null);
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!isAuthenticated) {
      setAppointments([]);
      setLoading(false);
      return;
    }

    loadAppointments();
  }, [currentDate, view, isAuthenticated, authLoading]);

  async function loadAppointments() {
    if (!isAuthenticated) {
      setAppointments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Calculate date range based on view
      const start = new Date(currentDate);
      const end = new Date(currentDate);

      if (view === 'month') {
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        end.setMonth(end.getMonth() + 1, 0);
        end.setHours(23, 59, 59, 999);
      } else if (view === 'week') {
        const day = start.getDay();
        start.setDate(start.getDate() - day);
        start.setHours(0, 0, 0, 0);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
      } else if (view === 'day') {
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
      }

      const params = new URLSearchParams({
        start: start.toISOString(),
        end: end.toISOString(),
      });

      const data = await apiRequest<Appointment[]>(`/api/appointments?${params.toString()}`);
      setAppointments(data);
    } catch (error) {
      console.error('Failed to load appointments:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleReschedule(appointmentId: string, newStartTime: Date) {
    if (!isAuthenticated) {
      alert('You must be signed in to reschedule appointments.');
      return;
    }

    try {
      await apiRequest('/api/appointments/reschedule', {
        method: 'POST',
        body: JSON.stringify({
          appointmentId,
          newStartTime: newStartTime.toISOString(),
        }),
      });

      await loadAppointments();
    } catch (error) {
      console.error('Failed to reschedule:', error);
      const message = error instanceof Error ? error.message : 'Failed to reschedule appointment';
      alert(message);
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-8 flex items-center justify-center min-h-96">
        <div className="text-gray-500">Loading appointments...</div>
      </div>
    );
  }

  if (!authLoading && !isAuthenticated) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-8 flex items-center justify-center min-h-96">
        <div className="text-gray-500">Please sign in to view appointments.</div>
      </div>
    );
  }

  if (view === 'month') {
    return <MonthView currentDate={currentDate} appointments={appointments} onReschedule={handleReschedule} />;
  }

  if (view === 'week') {
    return <WeekView currentDate={currentDate} appointments={appointments} onReschedule={handleReschedule} />;
  }

  if (view === 'day') {
    return <DayView currentDate={currentDate} appointments={appointments} onReschedule={handleReschedule} />;
  }

  return null;
}

function MonthView({ currentDate, appointments, onReschedule }: { currentDate: Date; appointments: Appointment[]; onReschedule: (id: string, date: Date) => void }) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const days = generateMonthCalendar(year, month, appointments);

  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-2xl font-semibold text-gray-900">{monthName}</h2>
      </div>

      <div className="grid grid-cols-7 gap-px bg-gray-200">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="bg-gray-50 px-3 py-2 text-center text-sm font-medium text-gray-700">
            {day}
          </div>
        ))}

        {days.map((day, idx) => (
          <DayCell key={idx} day={day} onAppointmentDrop={(date) => {
            // Handle drop
          }} />
        ))}
      </div>
    </div>
  );
}

function DayCell({ day, onAppointmentDrop }: { day: CalendarDay; onAppointmentDrop: (date: Date) => void }) {
  const [isDragOver, setIsDragOver] = useState(false);

  return (
    <div
      className={`bg-white min-h-32 p-2 relative ${
        !day.isCurrentMonth ? 'bg-gray-50 text-gray-400' : ''
      } ${day.isToday ? 'ring-2 ring-inset ring-teal-500' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        onAppointmentDrop(day.date);
      }}
    >
      <div className={`text-sm font-medium mb-1 ${day.isToday ? 'text-teal-600' : ''}`}>
        {day.date.getDate()}
      </div>

      <div className="space-y-1">
        {day.appointments.slice(0, 3).map((apt) => (
          <div
            key={apt.id}
            draggable
            className="text-xs px-2 py-1 rounded bg-teal-100 text-teal-800 cursor-move hover:bg-teal-200 transition-colors truncate"
          >
            {formatTime(new Date(apt.start_time))}
          </div>
        ))}
        {day.appointments.length > 3 && (
          <div className="text-xs text-gray-500 px-2">
            +{day.appointments.length - 3} more
          </div>
        )}
      </div>

      {isDragOver && (
        <div className="absolute inset-0 bg-teal-100 bg-opacity-50 border-2 border-teal-500 border-dashed rounded" />
      )}
    </div>
  );
}

function WeekView({ currentDate, appointments, onReschedule }: { currentDate: Date; appointments: Appointment[]; onReschedule: (id: string, date: Date) => void }) {
  const weekStart = new Date(currentDate);
  const dayOfWeek = weekStart.getDay();
  weekStart.setDate(weekStart.getDate() - dayOfWeek);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + i);
    return date;
  });

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="grid grid-cols-8 gap-px bg-gray-200">
        <div className="bg-gray-50 p-4"></div>
        {weekDays.map((day) => (
          <div key={day.toISOString()} className="bg-gray-50 p-4 text-center">
            <div className="text-sm font-medium text-gray-700">
              {day.toLocaleDateString('en-US', { weekday: 'short' })}
            </div>
            <div className="text-2xl font-semibold text-gray-900 mt-1">
              {day.getDate()}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-8 gap-px bg-gray-200 max-h-[600px] overflow-y-auto">
        {Array.from({ length: 24 }, (_, hour) => (
          <Fragment key={`hour-${hour}`}>
            <div className="bg-white p-2 text-xs text-gray-500 text-right">
              {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
            </div>
            {weekDays.map((day) => {
              const slotStart = new Date(day);
              slotStart.setHours(hour, 0, 0, 0);
              const slotEnd = new Date(slotStart);
              slotEnd.setHours(hour + 1);

              const slotAppointments = appointments.filter((apt) => {
                const aptStart = new Date(apt.start_time);
                return aptStart >= slotStart && aptStart < slotEnd;
              });

              return (
                <TimeSlotCell
                  key={`${day.toISOString()}-${hour}`}
                  date={slotStart}
                  appointments={slotAppointments}
                  onReschedule={onReschedule}
                />
              );
            })}
          </Fragment>
        ))}
      </div>
    </div>
  );
}

function DayView({ currentDate, appointments, onReschedule }: { currentDate: Date; appointments: Appointment[]; onReschedule: (id: string, date: Date) => void }) {
  const START_HOUR = 6; // 6 AM
  const END_HOUR = 22; // 10 PM
  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => i + START_HOUR);
  const HOUR_HEIGHT = 80; // pixels per hour (taller blocks)
  const now = new Date();
  const isToday = currentDate.toDateString() === now.toDateString();

  // Calculate current time indicator position
  const currentTimeTop = isToday && now.getHours() >= START_HOUR && now.getHours() < END_HOUR
    ? ((now.getHours() - START_HOUR) + now.getMinutes() / 60) * HOUR_HEIGHT
    : null;

  // Calculate position for each appointment
  const appointmentsWithPosition = appointments.map(apt => {
    const start = new Date(apt.start_time);
    const end = new Date(apt.end_time);

    const startHour = start.getHours();
    const startMinute = start.getMinutes();
    const endHour = end.getHours();
    const endMinute = end.getMinutes();

    // Calculate position relative to START_HOUR
    const top = ((startHour - START_HOUR) + startMinute / 60) * HOUR_HEIGHT;
    const height = ((endHour + endMinute / 60) - (startHour + startMinute / 60)) * HOUR_HEIGHT;

    return { ...apt, top, height };
  });

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-2xl font-semibold text-gray-900">{formatDate(currentDate, 'long')}</h2>
      </div>

      <div className="max-h-[600px] overflow-y-auto bg-white">
        <div className="flex">
          {/* Time labels column */}
          <div className="w-20 flex-shrink-0 bg-white">
            {hours.map(hour => (
              <div key={hour} className="relative" style={{ height: `${HOUR_HEIGHT}px` }}>
                <div className="absolute -top-2 right-3 text-[11px] text-gray-500 font-medium">
                  {hour === 12 ? '12 PM' : hour < 12 ? `${hour} AM` : `${hour - 12} PM`}
                </div>
              </div>
            ))}
          </div>

          {/* Appointments column */}
          <div className="flex-1 relative border-l border-gray-200/60">
            {/* Hour grid */}
            {hours.map(hour => (
              <div key={hour} className="relative" style={{ height: `${HOUR_HEIGHT}px` }}>
                {/* Hour line */}
                <div className="absolute top-0 left-0 right-0 border-t border-gray-200/60" />
                {/* Half-hour line (dotted) */}
                <div className="absolute left-0 right-0 border-t border-dashed border-gray-100" style={{ top: `${HOUR_HEIGHT / 2}px` }} />
              </div>
            ))}

            {/* Current time indicator */}
            {currentTimeTop !== null && (
              <div
                className="absolute left-0 right-0 z-20 pointer-events-none"
                style={{ top: `${currentTimeTop}px` }}
              >
                <div className="flex items-center">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <div className="flex-1 h-0.5 bg-red-500" />
                </div>
              </div>
            )}

            {/* Appointments positioned absolutely */}
            {appointmentsWithPosition.map(apt => (
              <div
                key={apt.id}
                className="absolute left-2 right-2 px-3 py-2 bg-teal-50/80 hover:bg-teal-100/80 rounded border-l-4 border-teal-500 cursor-pointer overflow-hidden transition-colors"
                style={{
                  top: `${apt.top + 1}px`,
                  height: `${Math.max(apt.height - 2, 32)}px`,
                }}
                onClick={() => {
                  // Could open appointment details modal here
                }}
              >
                <div className="text-sm font-semibold text-gray-900 leading-tight">
                  {formatTime(new Date(apt.start_time))}
                </div>
                <div className="text-sm text-gray-700 leading-tight truncate">
                  {apt.customer_name}
                </div>
                {apt.service_name && apt.height > 60 && (
                  <div className="text-xs text-gray-600 leading-tight truncate mt-1">
                    {apt.service_name}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function TimeSlotCell({ date, appointments, onReschedule }: { date: Date; appointments: Appointment[]; onReschedule: (id: string, date: Date) => void }) {
  const [isDragOver, setIsDragOver] = useState(false);

  return (
    <div
      className="bg-white p-2 min-h-16 border-t border-gray-100 relative"
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        // Handle drop
      }}
    >
      {appointments.map((apt) => (
        <div
          key={apt.id}
          draggable
          className="text-xs px-2 py-1 mb-1 rounded bg-teal-100 text-teal-800 cursor-move hover:bg-teal-200 transition-colors"
        >
          {formatTime(new Date(apt.start_time))}
        </div>
      ))}

      {isDragOver && (
        <div className="absolute inset-0 bg-teal-100 bg-opacity-50 border-2 border-teal-500 border-dashed" />
      )}
    </div>
  );
}

function TimeSlotRow({ slot, onReschedule }: { slot: TimeSlot; onReschedule: (id: string, date: Date) => void }) {
  const [isDragOver, setIsDragOver] = useState(false);

  return (
    <div
      className="flex border-t border-gray-100 hover:bg-gray-50 transition-colors"
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        // Handle drop
      }}
    >
      <div className="w-24 p-4 text-sm text-gray-500 flex-shrink-0">
        {formatTime(slot.startTime)}
      </div>
      <div className="flex-1 p-2 relative">
        {slot.appointments.map((apt) => (
          <AppointmentCard
            key={apt.id}
            appointment={apt}
            onReschedule={(newDate) => onReschedule(apt.id, newDate)}
          />
        ))}

        {isDragOver && (
          <div className="absolute inset-0 bg-teal-100 bg-opacity-50 border-2 border-teal-500 border-dashed" />
        )}
      </div>
    </div>
  );
}