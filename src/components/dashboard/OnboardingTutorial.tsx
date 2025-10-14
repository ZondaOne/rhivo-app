"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface OnboardingStep {
  title: string;
  description: string;
  visual: "calendar" | "appointment" | "drag-drop" | "cancel" | "welcome";
}

const steps: OnboardingStep[] = [
  {
    title: "Welcome to Rivo",
    description: "Let's take a quick tour of your dashboard with real examples",
    visual: "welcome",
  },
  {
    title: "Your Calendar",
    description: "View all your appointments in one place. Switch between month, week, and day views",
    visual: "calendar",
  },
  {
    title: "Creating Appointments",
    description: "Click any empty slot or use the New Appointment button to book time with customers",
    visual: "appointment",
  },
  {
    title: "Drag to Reschedule",
    description: "Simply drag appointments to new time slots. Customers are automatically notified",
    visual: "drag-drop",
  },
  {
    title: "Managing Bookings",
    description: "Click any appointment to view details, edit, or cancel. Keep your schedule organized",
    visual: "cancel",
  },
];

const OnboardingTutorial = () => {
  const [showTutorial, setShowTutorial] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    const tutorialShown = localStorage.getItem("tutorialShown");
    if (!tutorialShown) {
      setShowTutorial(true);
    }
  }, []);

  const handleClose = () => {
    if (dontShowAgain) {
      localStorage.setItem("tutorialShown", "true");
    }
    setShowTutorial(false);
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (!showTutorial) return null;

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Progress Bar */}
          <div className="w-full h-1 bg-gray-100">
            <motion.div
              className="h-full bg-gradient-to-r from-teal-600 to-green-600"
              initial={{ width: "0%" }}
              animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-12">
              {/* Step Counter */}
              <div className="flex items-center justify-between mb-8">
                <span className="text-sm font-semibold text-gray-500">
                  Step {currentStep + 1} of {steps.length}
                </span>
                <button
                  onClick={handleClose}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Title & Description */}
                  <h2 className="text-4xl font-bold text-gray-900 mb-4">{step.title}</h2>
                  <p className="text-lg text-gray-600 mb-12">{step.description}</p>

                  {/* Visual Example */}
                  <div className="bg-gray-50 rounded-2xl p-8 border border-gray-200">
                    {step.visual === "welcome" && <WelcomeVisual />}
                    {step.visual === "calendar" && <CalendarVisual />}
                    {step.visual === "appointment" && <AppointmentVisual />}
                    {step.visual === "drag-drop" && <DragDropVisual />}
                    {step.visual === "cancel" && <CancelVisual />}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 p-6 bg-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="dont-show-again"
                  checked={dontShowAgain}
                  onChange={(e) => setDontShowAgain(e.target.checked)}
                  className="h-4 w-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                />
                <label htmlFor="dont-show-again" className="text-sm text-gray-600 cursor-pointer">
                  Don't show this again
                </label>
              </div>

              <div className="flex items-center gap-3">
                {currentStep > 0 && (
                  <button
                    onClick={handlePrev}
                    className="px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-xl transition-all"
                  >
                    Previous
                  </button>
                )}
                <button
                  onClick={handleNext}
                  className="px-6 py-3 bg-gradient-to-r from-teal-600 to-green-600 text-white rounded-xl font-semibold hover:shadow-lg hover:scale-[1.02] transition-all"
                >
                  {isLastStep ? "Get Started" : "Next"}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// Visual Components

const WelcomeVisual = () => {
  return (
    <div className="flex items-center justify-center py-16">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", duration: 0.6 }}
        className="relative"
      >
        <div className="w-32 h-32 bg-gradient-to-br from-teal-500 to-green-500 rounded-3xl flex items-center justify-center shadow-2xl">
          <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
          </svg>
        </div>
        <motion.div
          className="absolute -top-4 -right-4 w-12 h-12 bg-green-500 rounded-full"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
        />
        <motion.div
          className="absolute -bottom-4 -left-4 w-8 h-8 bg-teal-500 rounded-full"
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ repeat: Infinity, duration: 2, delay: 0.5 }}
        />
      </motion.div>
    </div>
  );
};

const CalendarVisual = () => {
  const [selectedView, setSelectedView] = useState<"month" | "week" | "day">("month");

  return (
    <div className="space-y-6">
      {/* View Selector */}
      <div className="flex justify-center">
        <div className="flex gap-1 bg-gray-200 p-1 rounded-xl">
          {(["month", "week", "day"] as const).map((view) => (
            <motion.button
              key={view}
              onClick={() => setSelectedView(view)}
              className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all capitalize ${
                selectedView === view ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {view}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Calendar Grid */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedView}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-xl p-6 border border-gray-200"
        >
          {selectedView === "month" && <MonthCalendarMini />}
          {selectedView === "week" && <WeekCalendarMini />}
          {selectedView === "day" && <DayCalendarMini />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

const MonthCalendarMini = () => {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const appointments = [8, 15, 16, 22];

  return (
    <div>
      <div className="grid grid-cols-7 gap-2 mb-2">
        {days.map((day) => (
          <div key={day} className="text-center text-xs font-semibold text-gray-500 py-2">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 35 }, (_, i) => {
          const dayNum = i + 1;
          const hasAppointment = appointments.includes(dayNum);
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.01 }}
              className={`aspect-square flex items-center justify-center rounded-lg border text-sm ${
                hasAppointment
                  ? "bg-teal-50 border-teal-200 text-teal-900 font-semibold"
                  : "bg-white border-gray-200 text-gray-700"
              }`}
            >
              {dayNum <= 31 ? dayNum : ""}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

const WeekCalendarMini = () => {
  const hours = ["9 AM", "12 PM", "3 PM", "6 PM"];
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-6 gap-2">
        <div></div>
        {days.map((day) => (
          <div key={day} className="text-center text-xs font-semibold text-gray-700">
            {day}
          </div>
        ))}
      </div>
      {hours.map((hour, hourIdx) => (
        <div key={hour} className="grid grid-cols-6 gap-2">
          <div className="text-xs text-gray-500 flex items-center">{hour}</div>
          {days.map((day, dayIdx) => {
            const hasAppointment = hourIdx === 1 && dayIdx === 2;
            return (
              <motion.div
                key={day}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: (hourIdx * 5 + dayIdx) * 0.02 }}
                className={`h-12 rounded-lg border ${
                  hasAppointment ? "bg-gradient-to-r from-teal-500 to-green-500 border-teal-600" : "bg-white border-gray-200"
                }`}
              >
                {hasAppointment && (
                  <div className="h-full flex items-center justify-center text-xs text-white font-semibold">
                    Meeting
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

const DayCalendarMini = () => {
  const hours = ["9 AM", "10 AM", "11 AM", "12 PM", "1 PM", "2 PM", "3 PM", "4 PM"];
  const appointments = [
    { start: 1, duration: 1, title: "Haircut", color: "from-teal-500 to-green-500" },
    { start: 3, duration: 2, title: "Color Treatment", color: "from-purple-500 to-pink-500" },
  ];

  return (
    <div className="space-y-1">
      {hours.map((hour, idx) => {
        const appointment = appointments.find((a) => a.start === idx);
        return (
          <motion.div
            key={hour}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="flex gap-3"
          >
            <div className="w-16 text-xs text-gray-500 pt-2">{hour}</div>
            <div className="flex-1 relative">
              {appointment ? (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className={`bg-gradient-to-r ${appointment.color} rounded-lg p-3 text-white font-semibold text-sm shadow-lg`}
                  style={{ height: `${appointment.duration * 60}px` }}
                >
                  {appointment.title}
                </motion.div>
              ) : (
                <div className="h-14 border border-gray-200 rounded-lg bg-white" />
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

const AppointmentVisual = () => {
  const [showModal, setShowModal] = useState(false);
  const [isCreated, setIsCreated] = useState(false);

  const handleCreate = () => {
    setIsCreated(true);
    setTimeout(() => {
      setShowModal(false);
      setTimeout(() => setIsCreated(false), 1000);
    }, 1500);
  };

  return (
    <div className="space-y-6">
      {/* Calendar Grid with Empty Slot */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="space-y-2">
          {["10 AM", "11 AM", "12 PM"].map((hour, idx) => (
            <div key={hour} className="flex gap-3">
              <div className="w-16 text-xs text-gray-500 pt-2">{hour}</div>
              <motion.button
                onClick={() => idx === 1 && !isCreated && setShowModal(true)}
                className={`flex-1 h-14 rounded-lg border-2 border-dashed transition-all ${
                  idx === 1
                    ? isCreated
                      ? "bg-gradient-to-r from-teal-500 to-green-500 border-teal-600 border-solid"
                      : "border-gray-300 hover:border-teal-500 hover:bg-teal-50 cursor-pointer"
                    : "border-gray-200 bg-gray-50"
                }`}
                whileHover={idx === 1 && !isCreated ? { scale: 1.02 } : {}}
                whileTap={idx === 1 && !isCreated ? { scale: 0.98 } : {}}
              >
                {idx === 1 && isCreated && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex items-center justify-center h-full text-white font-semibold text-sm"
                  >
                    New Appointment Created!
                  </motion.div>
                )}
                {idx === 1 && !isCreated && (
                  <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                    Click to add appointment
                  </div>
                )}
              </motion.button>
            </div>
          ))}
        </div>
      </div>

      {/* Create Appointment Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white rounded-xl p-6 border-2 border-teal-500 shadow-2xl"
          >
            <h3 className="text-lg font-bold text-gray-900 mb-4">Create New Appointment</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-semibold text-gray-700">Customer Name</label>
                <input
                  type="text"
                  className="w-full mt-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700">Service</label>
                <select className="w-full mt-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent">
                  <option>Haircut</option>
                  <option>Color Treatment</option>
                  <option>Styling</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-lg transition-all"
                >
                  Cancel
                </button>
                <motion.button
                  onClick={handleCreate}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-teal-600 to-green-600 text-white rounded-lg font-semibold"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Create
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const DragDropVisual = () => {
  const [draggedPosition, setDraggedPosition] = useState(1);
  const [isDragging, setIsDragging] = useState(false);

  const slots = ["10 AM", "11 AM", "12 PM", "1 PM"];

  return (
    <div className="space-y-4">
      <div className="text-center text-sm text-gray-600 mb-6">
        Try dragging the appointment to a new time slot
      </div>
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="space-y-2">
          {slots.map((hour, idx) => (
            <div key={hour} className="flex gap-3">
              <div className="w-16 text-xs text-gray-500 pt-2">{hour}</div>
              <motion.div
                onHoverStart={() => idx !== draggedPosition && setIsDragging(true)}
                onHoverEnd={() => setIsDragging(false)}
                onClick={() => {
                  if (idx !== draggedPosition) {
                    setDraggedPosition(idx);
                  }
                }}
                className={`flex-1 h-14 rounded-lg border transition-all cursor-pointer ${
                  idx === draggedPosition
                    ? "bg-gradient-to-r from-teal-500 to-green-500 border-teal-600"
                    : isDragging && idx !== draggedPosition
                    ? "border-2 border-dashed border-teal-500 bg-teal-50"
                    : "border-gray-200 bg-gray-50"
                }`}
                whileHover={{ scale: 1.02 }}
              >
                <AnimatePresence>
                  {idx === draggedPosition && (
                    <motion.div
                      layoutId="appointment"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center justify-between h-full px-4 text-white"
                    >
                      <span className="font-semibold text-sm">Customer Appointment</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                      </svg>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>
          ))}
        </div>
      </div>
      <div className="text-center">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg text-sm font-semibold"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Customer automatically notified
        </motion.div>
      </div>
    </div>
  );
};

const CancelVisual = () => {
  const [showDetails, setShowDetails] = useState(false);
  const [isCancelled, setIsCancelled] = useState(false);

  const handleCancel = () => {
    setIsCancelled(true);
    setTimeout(() => {
      setShowDetails(false);
      setTimeout(() => setIsCancelled(false), 1000);
    }, 1500);
  };

  return (
    <div className="space-y-6">
      {/* Appointment Card */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <AnimatePresence mode="wait">
          {!isCancelled ? (
            <motion.button
              key="appointment"
              onClick={() => setShowDetails(!showDetails)}
              className={`w-full text-left p-4 rounded-lg transition-all ${
                showDetails ? "bg-teal-50 border-2 border-teal-500" : "bg-gradient-to-r from-teal-500 to-green-500 hover:shadow-lg"
              }`}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <div className="flex items-center justify-between">
                <div className={showDetails ? "text-gray-900" : "text-white"}>
                  <div className="font-semibold">Sarah Johnson</div>
                  <div className="text-sm opacity-90">Haircut - 2:00 PM</div>
                </div>
                <svg
                  className={`w-5 h-5 transition-transform ${showDetails ? "rotate-180 text-gray-900" : "text-white"}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </motion.button>
          ) : (
            <motion.div
              key="cancelled"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="w-full p-4 rounded-lg bg-red-50 border-2 border-red-200"
            >
              <div className="flex items-center justify-center gap-2 text-red-700 font-semibold">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Appointment Cancelled
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Details Panel */}
      <AnimatePresence>
        {showDetails && !isCancelled && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white rounded-xl p-6 border border-gray-200 space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Customer</span>
                  <span className="font-semibold text-gray-900">Sarah Johnson</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Service</span>
                  <span className="font-semibold text-gray-900">Haircut</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Time</span>
                  <span className="font-semibold text-gray-900">2:00 PM - 3:00 PM</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Status</span>
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-lg font-semibold text-xs">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                    Confirmed
                  </span>
                </div>
              </div>
              <div className="flex gap-2 pt-4 border-t border-gray-200">
                <button className="flex-1 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-lg transition-all">
                  Edit
                </button>
                <motion.button
                  onClick={handleCancel}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold text-sm hover:bg-red-700 transition-all"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Cancel Appointment
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default OnboardingTutorial;
