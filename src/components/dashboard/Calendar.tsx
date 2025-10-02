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
      } else if (view === 'list') {
        // For list view, show 30 days starting from current date
        start.setHours(0, 0, 0, 0);
        end.setDate(end.getDate() + 30);
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
      <div className="bg-white rounded-2xl border border-gray-200/60 p-12 flex items-center justify-center min-h-96">
        <div className="text-gray-500">Loading appointments...</div>
      </div>
    );
  }

  if (!authLoading && !isAuthenticated) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200/60 p-12 flex items-center justify-center min-h-96">
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

  if (view === 'list') {
    return <ListView currentDate={currentDate} appointments={appointments} onReschedule={handleReschedule} />;
  }

  return null;
}

function MonthView({ currentDate, appointments, onReschedule }: { currentDate: Date; appointments: Appointment[]; onReschedule: (id: string, date: Date) => void }) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const days = generateMonthCalendar(year, month, appointments);

  return (
    <div className="bg-white border border-gray-200/60 rounded-2xl overflow-hidden h-[calc(100vh-280px)] flex flex-col">
      {/* Day Labels */}
      <div className="grid grid-cols-7 border-b border-gray-200/60 flex-shrink-0">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
          <div key={day} className="py-4 text-center border-r border-gray-200/60 last:border-r-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              {day}
            </span>
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 flex-1 overflow-y-auto">
        {days.map((day, idx) => (
          <DayCell
            key={idx}
            day={day}
            isLastRow={idx >= days.length - 7}
            onAppointmentDrop={(date) => {
              // Handle drop
            }}
          />
        ))}
      </div>
    </div>
  );
}

function DayCell({ day, isLastRow, onAppointmentDrop }: { day: CalendarDay; isLastRow: boolean; onAppointmentDrop: (date: Date) => void }) {
  const [isDragOver, setIsDragOver] = useState(false);

  const isWeekend = day.date.getDay() === 0 || day.date.getDay() === 6;

  return (
    <div
      className={`min-h-[140px] relative border-r border-b border-gray-200/60 last:border-r-0 ${
        isLastRow ? 'border-b-0' : ''
      } ${
        !day.isCurrentMonth ? 'bg-gray-50/30' : 'bg-white'
      } ${
        day.isCurrentMonth ? 'hover:bg-gray-50/50' : ''
      } transition-colors`}
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
      {isDragOver && (
        <div className="absolute inset-0 bg-teal-50/80 border-2 border-teal-500 pointer-events-none z-10" />
      )}

      {/* Content */}
      <div className="p-3 h-full flex flex-col">
        {/* Day Number */}
        <div className="mb-3">
          {day.isToday ? (
            <div className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-teal-500 to-green-500">
              <span className="text-sm font-bold text-white">
                {day.date.getDate()}
              </span>
            </div>
          ) : (
            <span className={`text-sm font-semibold ${
              !day.isCurrentMonth
                ? 'text-gray-400'
                : isWeekend
                ? 'text-gray-500'
                : 'text-gray-900'
            }`}>
              {day.date.getDate()}
            </span>
          )}
        </div>

        {/* Appointments */}
        <div className="flex-1 space-y-1">
          {day.appointments.slice(0, 3).map((apt) => (
            <div
              key={apt.id}
              draggable
              className="text-xs px-2 py-1.5 rounded-lg bg-teal-50 border border-teal-100 text-teal-900 hover:bg-teal-100 cursor-move truncate font-medium transition-all"
            >
              {formatTime(new Date(apt.start_time))}
            </div>
          ))}
          {day.appointments.length > 3 && (
            <div className="text-xs text-gray-500 font-semibold px-2 py-1">
              +{day.appointments.length - 3} more
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function WeekView({ currentDate, appointments, onReschedule }: { currentDate: Date; appointments: Appointment[]; onReschedule: (id: string, date: Date) => void }) {
  const weekStart = new Date(currentDate);
  const dayOfWeek = weekStart.getDay();
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  weekStart.setDate(weekStart.getDate() - daysFromMonday);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + i);
    return date;
  });

  const START_HOUR = 6;
  const END_HOUR = 22;
  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => i + START_HOUR);

  const today = new Date();
  const todayStr = today.toDateString();

  // Calculate appointments with positions
  const appointmentsByDay = weekDays.map((day) => {
    const dayAppts = appointments
      .filter(apt => new Date(apt.start_time).toDateString() === day.toDateString())
      .map(apt => {
        const start = new Date(apt.start_time);
        const end = new Date(apt.end_time);

        const startHour = start.getHours();
        const startMinute = start.getMinutes();
        const endHour = end.getHours();
        const endMinute = end.getMinutes();

        const rowStart = ((startHour - START_HOUR) * 60 + startMinute) / 60;
        const rowEnd = ((endHour - START_HOUR) * 60 + endMinute) / 60;
        const rowSpan = rowEnd - rowStart;

        return { ...apt, rowStart, rowSpan };
      });

    return dayAppts;
  });

  return (
    <div className="bg-white border border-gray-200/60 rounded-2xl overflow-hidden h-[calc(100vh-280px)] flex flex-col">
      {/* Day Headers */}
      <div className="grid grid-cols-[64px_repeat(7,1fr)] border-b border-gray-200/60 flex-shrink-0">
        {/* Empty corner for time column */}
        <div className="border-r border-gray-200/60" />
        
        {/* Day labels */}
        {weekDays.map((day, idx) => {
          const isToday = day.toDateString() === todayStr;
          const isWeekend = day.getDay() === 0 || day.getDay() === 6;

          return (
            <div key={day.toISOString()} className="py-4 text-center border-r border-gray-200/60 last:border-r-0">
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
                {day.toLocaleDateString('en-US', { weekday: 'short' })}
              </div>
              {isToday ? (
                <div className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-teal-500 to-green-500">
                  <span className="text-sm font-bold text-white">
                    {day.getDate()}
                  </span>
                </div>
              ) : (
                <span className={`text-sm font-semibold ${isWeekend ? 'text-gray-500' : 'text-gray-900'}`}>
                  {day.getDate()}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Time Grid */}
      <div className="flex-1 overflow-y-auto">
        {hours.map((hour, hourIdx) => (
          <div key={hour} className="grid grid-cols-[64px_repeat(7,1fr)]">
            {/* Time Label */}
            <div className={`flex items-start justify-end pr-3 pt-2 border-r border-b border-gray-200/60 ${hourIdx === hours.length - 1 ? 'border-b-0' : ''} min-h-[80px]`}>
              <span className="text-xs text-gray-500 font-medium">
                {hour === 0 ? '12 AM' : hour === 12 ? '12 PM' : hour < 12 ? `${hour} AM` : `${hour - 12} PM`}
              </span>
            </div>

            {/* Day Cells */}
            {weekDays.map((day, dayIdx) => {
              const isWeekend = day.getDay() === 0 || day.getDay() === 6;
              
              return (
                <WeekDayCell
                  key={`${day.toISOString()}-${hour}`}
                  day={day}
                  hour={hour}
                  hourIdx={hourIdx}
                  isLastHour={hourIdx === hours.length - 1}
                  isLastDay={dayIdx === 6}
                  isWeekend={isWeekend}
                  appointments={appointmentsByDay[dayIdx].filter(apt => {
                    const aptStartHour = new Date(apt.start_time).getHours();
                    return aptStartHour === hour;
                  })}
                  startHour={START_HOUR}
                  onReschedule={onReschedule}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function WeekDayCell({ 
  day, 
  hour, 
  hourIdx,
  isLastHour, 
  isLastDay,
  isWeekend,
  appointments, 
  startHour,
  onReschedule
}: { 
  day: Date; 
  hour: number; 
  hourIdx: number;
  isLastHour: boolean; 
  isLastDay: boolean;
  isWeekend: boolean;
  appointments: Array<Appointment & { rowStart: number; rowSpan: number }>; 
  startHour: number;
  onReschedule: (id: string, date: Date) => void;
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragOverSlot, setDragOverSlot] = useState<number | null>(null); // 0=top half, 1=bottom half
  const CELL_HEIGHT = 80;

  const handleDragOver = (e: React.DragEvent, slot: number) => {
    e.preventDefault();
    setIsDragOver(true);
    setDragOverSlot(slot);
  };

  const handleDrop = (e: React.DragEvent, slot: number) => {
    e.preventDefault();
    setIsDragOver(false);
    setDragOverSlot(null);
    
    // Calculate the new time based on the slot (0 or 1 for half-hour increments)
    const newTime = new Date(day);
    newTime.setHours(hour, slot * 30, 0, 0);
    
    // TODO: Get appointment ID from drag data
    // onReschedule(appointmentId, newTime);
  };

  return (
    <div
      className={`relative min-h-[80px] border-r border-b border-gray-200/60 ${
        isLastDay ? 'border-r-0' : ''
      } ${
        isLastHour ? 'border-b-0' : ''
      } ${
        isWeekend ? 'bg-gray-50/30' : 'bg-white'
      } transition-colors`}
    >
      {/* Sub-hour drop zones */}
      <div
        className={`absolute inset-x-0 top-0 h-1/2 hover:bg-gray-50/50 transition-colors ${
          isDragOver && dragOverSlot === 0 ? 'bg-teal-50/80 border-2 border-teal-500' : ''
        }`}
        onDragOver={(e) => handleDragOver(e, 0)}
        onDragLeave={() => {
          setIsDragOver(false);
          setDragOverSlot(null);
        }}
        onDrop={(e) => handleDrop(e, 0)}
      />
      <div
        className={`absolute inset-x-0 bottom-0 h-1/2 hover:bg-gray-50/50 transition-colors ${
          isDragOver && dragOverSlot === 1 ? 'bg-teal-50/80 border-2 border-teal-500' : ''
        }`}
        onDragOver={(e) => handleDragOver(e, 1)}
        onDragLeave={() => {
          setIsDragOver(false);
          setDragOverSlot(null);
        }}
        onDrop={(e) => handleDrop(e, 1)}
      />

      {/* Half-hour divider line */}
      <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-gray-100 pointer-events-none" />

      {/* Appointments positioned within this cell */}
      {appointments.map(apt => {
        const startMinute = new Date(apt.start_time).getMinutes();
        const offsetFromHour = startMinute / 60;
        
        return (
          <div
            key={apt.id}
            draggable
            className="absolute left-1 right-1 px-2 py-1.5 rounded-lg bg-teal-50 border border-teal-100 text-teal-900 hover:bg-teal-100 cursor-move overflow-hidden transition-all z-10"
            style={{
              top: `${offsetFromHour * CELL_HEIGHT}px`,
              height: `${Math.max(apt.rowSpan * CELL_HEIGHT - 4, 32)}px`,
            }}
            onDragStart={(e) => {
              e.dataTransfer.setData('appointmentId', apt.id);
            }}
          >
            <div className="text-xs font-medium leading-tight">
              {formatTime(new Date(apt.start_time))}
            </div>
            {apt.rowSpan > 0.5 && (
              <div className="text-xs text-gray-700 leading-tight truncate mt-0.5">
                {apt.customer_name}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function DayView({ currentDate, appointments, onReschedule }: { currentDate: Date; appointments: Appointment[]; onReschedule: (id: string, date: Date) => void }) {
  const START_HOUR = 6;
  const END_HOUR = 22;
  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => i + START_HOUR);
  const now = new Date();
  const isToday = currentDate.toDateString() === now.toDateString();

  // Calculate current time indicator position
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const showCurrentTime = isToday && currentHour >= START_HOUR && currentHour < END_HOUR;
  const currentTimeRow = showCurrentTime ? currentHour - START_HOUR : null;
  const currentTimeOffset = showCurrentTime ? (currentMinute / 60) : 0;

  // Calculate position for each appointment
  const appointmentsByHour = hours.map(hour => {
    return appointments
      .filter(apt => {
        const start = new Date(apt.start_time);
        return start.getHours() === hour;
      })
      .map(apt => {
        const start = new Date(apt.start_time);
        const end = new Date(apt.end_time);

        const startHour = start.getHours();
        const startMinute = start.getMinutes();
        const endHour = end.getHours();
        const endMinute = end.getMinutes();

        const rowStart = startHour - START_HOUR + startMinute / 60;
        const rowEnd = endHour - START_HOUR + endMinute / 60;
        const rowSpan = rowEnd - rowStart;

        return { ...apt, rowStart, rowSpan };
      });
  });

  return (
    <div className="bg-white border border-gray-200/60 rounded-2xl overflow-hidden h-[calc(100vh-280px)] flex flex-col">
      {/* Day Header */}
      <div className="py-4 px-6 border-b border-gray-200/60 flex-shrink-0">
        <div className="text-center">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
            {currentDate.toLocaleDateString('en-US', { weekday: 'long' })}
          </div>
          {isToday ? (
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-green-500">
              <span className="text-lg font-bold text-white">
                {currentDate.getDate()}
              </span>
            </div>
          ) : (
            <span className="text-2xl font-bold text-gray-900">
              {currentDate.getDate()}
            </span>
          )}
        </div>
      </div>

      {/* Time Grid */}
      <div className="flex-1 overflow-y-auto">
        {hours.map((hour, hourIdx) => (
          <div key={hour} className="grid grid-cols-[64px_1fr]">
            {/* Time Label */}
            <div className={`flex items-start justify-end pr-3 pt-2 border-r border-b border-gray-200/60 ${hourIdx === hours.length - 1 ? 'border-b-0' : ''} min-h-[120px]`}>
              <span className="text-xs text-gray-500 font-medium">
                {hour === 0 ? '12 AM' : hour === 12 ? '12 PM' : hour < 12 ? `${hour} AM` : `${hour - 12} PM`}
              </span>
            </div>

            {/* Hour Cell */}
            <DayHourCell
              date={currentDate}
              hour={hour}
              hourIdx={hourIdx}
              isLastHour={hourIdx === hours.length - 1}
              appointments={appointmentsByHour[hourIdx]}
              startHour={START_HOUR}
              showCurrentTime={currentTimeRow === hourIdx}
              currentTimeOffset={currentTimeOffset}
              onReschedule={onReschedule}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function DayHourCell({
  date,
  hour,
  hourIdx,
  isLastHour,
  appointments,
  startHour,
  showCurrentTime,
  currentTimeOffset,
  onReschedule,
}: {
  date: Date;
  hour: number;
  hourIdx: number;
  isLastHour: boolean;
  appointments: Array<Appointment & { rowStart: number; rowSpan: number }>;
  startHour: number;
  showCurrentTime: boolean;
  currentTimeOffset: number;
  onReschedule: (id: string, date: Date) => void;
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragOverSlot, setDragOverSlot] = useState<number | null>(null);
  const CELL_HEIGHT = 120; // Increased from 80 to 120 for better visibility

  const handleDragOver = (e: React.DragEvent, slot: number) => {
    e.preventDefault();
    setIsDragOver(true);
    setDragOverSlot(slot);
  };

  const handleDrop = (e: React.DragEvent, slot: number) => {
    e.preventDefault();
    setIsDragOver(false);
    setDragOverSlot(null);
    
    // Calculate the new time based on the slot
    const newTime = new Date(date);
    newTime.setHours(hour, slot * 30, 0, 0);
    
    const appointmentId = e.dataTransfer.getData('appointmentId');
    if (appointmentId) {
      onReschedule(appointmentId, newTime);
    }
  };

  return (
    <div
      className={`relative min-h-[120px] border-b border-gray-200/60 ${
        isLastHour ? 'border-b-0' : ''
      } bg-white transition-colors`}
    >
      {/* Sub-hour drop zones */}
      <div
        className={`absolute inset-x-0 top-0 h-1/2 hover:bg-gray-50/50 transition-colors ${
          isDragOver && dragOverSlot === 0 ? 'bg-teal-50/80 border-2 border-teal-500' : ''
        }`}
        onDragOver={(e) => handleDragOver(e, 0)}
        onDragLeave={() => {
          setIsDragOver(false);
          setDragOverSlot(null);
        }}
        onDrop={(e) => handleDrop(e, 0)}
      />
      <div
        className={`absolute inset-x-0 bottom-0 h-1/2 hover:bg-gray-50/50 transition-colors ${
          isDragOver && dragOverSlot === 1 ? 'bg-teal-50/80 border-2 border-teal-500' : ''
        }`}
        onDragOver={(e) => handleDragOver(e, 1)}
        onDragLeave={() => {
          setIsDragOver(false);
          setDragOverSlot(null);
        }}
        onDrop={(e) => handleDrop(e, 1)}
      />

      {/* Half-hour divider line */}
      <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-gray-100 pointer-events-none" />

      {/* Current time indicator */}
      {showCurrentTime && (
        <div
          className="absolute left-0 right-0 z-20 pointer-events-none"
          style={{ top: `${currentTimeOffset * CELL_HEIGHT}px` }}
        >
          <div className="flex items-center">
            <div className="w-2 h-2 rounded-full bg-gradient-to-br from-teal-500 to-green-500 -ml-1" />
            <div className="flex-1 h-0.5 bg-gradient-to-r from-teal-500 to-green-500" />
          </div>
        </div>
      )}

      {/* Appointments positioned within this cell */}
      {appointments.map(apt => {
        // Get just the minutes to position within this specific hour cell
        const start = new Date(apt.start_time);
        const startMinute = start.getMinutes();
        const offsetFromHour = startMinute / 60; // 0 to 1 representing position within the hour
        
        return (
          <div
            key={apt.id}
            draggable
            className="absolute left-2 right-2 px-3 py-2 rounded-lg bg-teal-50 border border-teal-100 text-teal-900 hover:bg-teal-100 cursor-move overflow-hidden transition-all z-10"
            style={{
              top: `${offsetFromHour * CELL_HEIGHT}px`,
              height: `${Math.max(apt.rowSpan * CELL_HEIGHT - 4, 48)}px`,
            }}
            onDragStart={(e) => {
              e.dataTransfer.setData('appointmentId', apt.id);
            }}
          >
            <div className="text-sm font-semibold text-gray-900 leading-tight">
              {formatTime(new Date(apt.start_time))}
            </div>
            <div className="text-sm text-gray-700 leading-tight truncate mt-0.5">
              {apt.customer_name}
            </div>
            {apt.notes && apt.rowSpan > 1 && (
              <div className="text-xs text-gray-600 leading-tight truncate mt-1">
                {apt.notes}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ListView({ currentDate, appointments, onReschedule }: { currentDate: Date; appointments: Appointment[]; onReschedule: (id: string, date: Date) => void }) {
  // Group appointments by date
  const appointmentsByDate = appointments.reduce((acc, apt) => {
    const dateKey = new Date(apt.start_time).toDateString();
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(apt);
    return acc;
  }, {} as Record<string, Appointment[]>);

  // Sort dates
  const sortedDates = Object.keys(appointmentsByDate).sort((a, b) => 
    new Date(a).getTime() - new Date(b).getTime()
  );

  const today = new Date().toDateString();

  return (
    <div className="bg-white border border-gray-200/60 rounded-2xl overflow-hidden h-[calc(100vh-280px)] flex flex-col">
      {/* List content */}
      <div className="flex-1 overflow-y-auto">
        {sortedDates.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center py-12">
              <div className="text-gray-400 text-lg mb-2">No appointments</div>
              <div className="text-gray-500 text-sm">
                No appointments found for this period
              </div>
            </div>
          </div>
        ) : (
          sortedDates.map(dateKey => {
            const date = new Date(dateKey);
            const isToday = dateKey === today;
            const dayAppointments = appointmentsByDate[dateKey].sort(
              (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
            );

            return (
              <div key={dateKey} className="border-b border-gray-200/60 last:border-b-0">
                {/* Date Header */}
                <div className={`sticky top-0 z-10 px-6 py-4 border-b border-gray-200/60 ${
                  isToday ? 'bg-gradient-to-r from-teal-50 to-green-50' : 'bg-white'
                }`}>
                  <div className="flex items-center gap-3">
                    {isToday ? (
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-green-500 flex-shrink-0">
                        <span className="text-lg font-bold text-white">
                          {date.getDate()}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center w-10 h-10 rounded-full border-2 border-gray-200 flex-shrink-0">
                        <span className="text-lg font-semibold text-gray-900">
                          {date.getDate()}
                        </span>
                      </div>
                    )}
                    <div>
                      <div className="text-sm font-semibold text-gray-900">
                        {date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                      </div>
                      <div className="text-xs text-gray-500">
                        {dayAppointments.length} {dayAppointments.length === 1 ? 'appointment' : 'appointments'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Appointments List */}
                <div className="divide-y divide-gray-100">
                  {dayAppointments.map((apt, idx) => (
                    <ListAppointmentCard
                      key={apt.id}
                      appointment={apt}
                      isFirst={idx === 0}
                      isLast={idx === dayAppointments.length - 1}
                      onReschedule={onReschedule}
                    />
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function ListAppointmentCard({ 
  appointment, 
  isFirst, 
  isLast, 
  onReschedule 
}: { 
  appointment: Appointment; 
  isFirst: boolean; 
  isLast: boolean; 
  onReschedule: (id: string, date: Date) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const startTime = new Date(appointment.start_time);
  const endTime = new Date(appointment.end_time);
  const duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));

  const statusColors = {
    confirmed: 'bg-teal-50 border-teal-200 text-teal-700',
    pending: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    cancelled: 'bg-gray-50 border-gray-200 text-gray-500',
    canceled: 'bg-gray-50 border-gray-200 text-gray-500',
    completed: 'bg-green-50 border-green-200 text-green-700',
    no_show: 'bg-red-50 border-red-200 text-red-700',
  };

  const statusColor = statusColors[appointment.status as keyof typeof statusColors] || statusColors.confirmed;

  return (
    <div
      draggable
      className={`group px-6 py-4 hover:bg-gray-50/50 transition-all ${
        isDragging ? 'opacity-50' : ''
      } ${isLast ? '' : ''}`}
      onDragStart={(e) => {
        setIsDragging(true);
        e.dataTransfer.setData('appointmentId', appointment.id);
      }}
      onDragEnd={() => setIsDragging(false)}
    >
      <div className="flex items-start gap-4">
        {/* Time Badge */}
        <div className="flex-shrink-0 text-right min-w-[80px]">
          <div className="text-base font-semibold text-gray-900">
            {formatTime(startTime)}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">
            {duration} min
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 mb-2">
            <div className="flex-1">
              <div className="text-base font-semibold text-gray-900 mb-1">
                {appointment.customer_name || 'Unnamed Customer'}
              </div>
              {(appointment.customer_email || appointment.guest_email) && (
                <div className="text-sm text-gray-600">
                  {appointment.customer_email || appointment.guest_email}
                </div>
              )}
              {(appointment.customer_phone || appointment.guest_phone) && (
                <div className="text-sm text-gray-600">
                  {appointment.customer_phone || appointment.guest_phone}
                </div>
              )}
            </div>
            
            {/* Status Badge */}
            <div className={`px-3 py-1 rounded-lg border text-xs font-semibold uppercase tracking-wider ${statusColor}`}>
              {appointment.status}
            </div>
          </div>

          {/* Notes */}
          {appointment.notes && (
            <div className="mt-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-100">
              <div className="text-sm text-gray-700 leading-relaxed">
                {appointment.notes}
              </div>
            </div>
          )}
        </div>

        {/* Drag Handle */}
        <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity cursor-move">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
          </svg>
        </div>
      </div>
    </div>
  );
}

