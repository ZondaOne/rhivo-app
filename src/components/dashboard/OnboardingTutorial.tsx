"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";

interface OnboardingStep {
  id: string;
  visual: "welcome" | "calendar" | "createAppointment" | "dragDrop" | "manageBookings" | "insights" | "settings";
}

const OnboardingTutorial = () => {
  const t = useTranslations("dashboard.onboarding");

  const steps: OnboardingStep[] = [
    { id: "welcome", visual: "welcome" },
    { id: "calendar", visual: "calendar" },
    { id: "createAppointment", visual: "createAppointment" },
    { id: "dragDrop", visual: "dragDrop" },
    { id: "manageBookings", visual: "manageBookings" },
    { id: "insights", visual: "insights" },
    { id: "settings", visual: "settings" },
  ];

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
        className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-5xl h-[85vh] overflow-hidden flex flex-col"
        >
          {/* Progress Bar */}
          <div className="w-full h-1 bg-gray-100 flex-shrink-0">
            <motion.div
              className="h-full bg-gradient-to-r from-teal-600 to-green-600"
              initial={{ width: "0%" }}
              animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          {/* Header - Fixed height */}
          <div className="flex-shrink-0 p-4 sm:p-6 lg:p-8">
            {/* Step Counter */}
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <span className="text-xs sm:text-sm font-semibold text-gray-500">
                {t("progress.stepOf", { current: currentStep + 1, total: steps.length })}
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
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2 sm:mb-3">
                  {t(`${step.id}.title`)}
                </h2>
                <p className="text-sm sm:text-base lg:text-lg text-gray-600">
                  {t(`${step.id}.description`)}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Visual Example - Scrollable area with flex-1 to fill remaining space */}
          <div className="flex-1 px-4 sm:px-6 lg:px-8 overflow-y-auto min-h-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="bg-gray-50 rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 border border-gray-200 min-h-full"
              >
                {step.visual === "welcome" && <WelcomeVisual />}
                {step.visual === "calendar" && <CalendarVisual />}
                {step.visual === "createAppointment" && <CreateAppointmentVisual />}
                {step.visual === "dragDrop" && <DragDropVisual />}
                {step.visual === "manageBookings" && <ManageBookingsVisual />}
                {step.visual === "insights" && <InsightsVisual />}
                {step.visual === "settings" && <SettingsVisual />}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer - Fixed at bottom */}
          <div className="border-t border-gray-200 p-4 sm:p-6 bg-white flex-shrink-0">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2 order-2 sm:order-1">
                <input
                  type="checkbox"
                  id="dont-show-again"
                  checked={dontShowAgain}
                  onChange={(e) => setDontShowAgain(e.target.checked)}
                  className="h-4 w-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                />
                <label htmlFor="dont-show-again" className="text-xs sm:text-sm text-gray-600 cursor-pointer">
                  {t("dontShowAgain")}
                </label>
              </div>

              <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto order-1 sm:order-2">
                {currentStep > 0 && (
                  <button
                    onClick={handlePrev}
                    className="flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-xl transition-all"
                  >
                    {t("buttons.previous")}
                  </button>
                )}
                <button
                  onClick={handleNext}
                  className="flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-teal-600 to-green-600 text-white rounded-xl text-xs sm:text-sm font-semibold hover:shadow-lg hover:scale-[1.02] transition-all"
                >
                  {isLastStep ? t("buttons.getStarted") : t("buttons.next")}
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
  const t = useTranslations("dashboard.onboarding.calendar");
  const [selectedView, setSelectedView] = useState<"month" | "week" | "day" | "list">("month");

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* View Selector - Using actual dashboard style */}
      <div className="flex justify-center">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl sm:rounded-2xl w-full sm:w-auto">
          {(["month", "week", "day", "list"] as const).map((view) => (
            <motion.button
              key={view}
              onClick={() => setSelectedView(view)}
              className={`flex-1 sm:flex-none px-3 sm:px-6 py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                selectedView === view ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {t(`views.${view}`)}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Calendar Preview - Simplified version of actual calendar */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedView}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-xl p-3 sm:p-6 border border-gray-200"
        >
          {selectedView === "month" && <MonthCalendarPreview />}
          {selectedView === "week" && <WeekCalendarPreview />}
          {selectedView === "day" && <DayCalendarPreview />}
          {selectedView === "list" && <ListCalendarPreview />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

const MonthCalendarPreview = () => {
  const t = useTranslations("dashboard.onboarding.calendar.days");
  const days = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
  const appointments = [8, 15, 16, 22];

  return (
    <div>
      <div className="grid grid-cols-7 gap-2 mb-2">
        {days.map((day) => (
          <div key={day} className="text-center text-xs font-semibold text-gray-500 py-2">
            {t(day)}
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

const WeekCalendarPreview = () => {
  const t = useTranslations("dashboard.onboarding.calendar.days");
  const hours = ["9 AM", "12 PM", "3 PM", "6 PM"];
  const days = ["mon", "tue", "wed", "thu", "fri"] as const;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-6 gap-2">
        <div></div>
        {days.map((day) => (
          <div key={day} className="text-center text-xs font-semibold text-gray-700">
            {t(day)}
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
                    Sarah J.
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

const DayCalendarPreview = () => {
  const hours = ["9 AM", "10 AM", "11 AM", "12 PM", "1 PM", "2 PM", "3 PM", "4 PM"];
  const appointments = [
    { start: 1, duration: 1, title: "Haircut - Sarah J.", color: "from-teal-500 to-green-500" },
    { start: 3, duration: 2, title: "Color - Maria G.", color: "from-purple-500 to-pink-500" },
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

const ListCalendarPreview = () => {
  const appointments = [
    { time: "10:00 AM", customer: "Sarah Johnson", service: "Haircut", duration: "60 min" },
    { time: "12:00 PM", customer: "Maria Garcia", service: "Color Treatment", duration: "120 min" },
    { time: "3:00 PM", customer: "Emma Wilson", service: "Styling", duration: "45 min" },
  ];

  return (
    <div className="space-y-3">
      {appointments.map((apt, idx) => (
        <motion.div
          key={idx}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.1 }}
          className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-all"
        >
          <div className="w-20 text-sm font-semibold text-gray-900">{apt.time}</div>
          <div className="flex-1">
            <div className="font-semibold text-gray-900">{apt.customer}</div>
            <div className="text-sm text-gray-600">{apt.service} • {apt.duration}</div>
          </div>
          <div className="w-2 h-2 rounded-full bg-green-500" />
        </motion.div>
      ))}
    </div>
  );
};

const CreateAppointmentVisual = () => {
  const t = useTranslations("dashboard.onboarding.createAppointment.steps");
  const [showSteps, setShowSteps] = useState(false);
  const [currentSubStep, setCurrentSubStep] = useState(0);

  useEffect(() => {
    setShowSteps(true);
    const interval = setInterval(() => {
      setCurrentSubStep((prev) => (prev + 1) % 3);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const steps = ["service", "dateTime", "details"] as const;

  return (
    <div className="space-y-6">
      {/* Step indicators */}
      <div className="flex items-center justify-center gap-2">
        {steps.map((step, idx) => (
          <div key={step} className="flex items-center gap-2">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: idx * 0.2 }}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                idx === currentSubStep
                  ? "bg-gradient-to-r from-teal-600 to-green-600 text-white"
                  : idx < currentSubStep
                  ? "bg-green-500 text-white"
                  : "bg-gray-200 text-gray-600"
              }`}
            >
              {idx < currentSubStep ? "✓" : idx + 1}
            </motion.div>
            <span className={`text-sm font-semibold ${idx === currentSubStep ? "text-gray-900" : "text-gray-500"}`}>
              {t(step)}
            </span>
            {idx < 2 && <div className="w-8 h-0.5 bg-gray-200" />}
          </div>
        ))}
      </div>

      {/* Modal preview */}
      <AnimatePresence mode="wait">
        {showSteps && (
          <motion.div
            key={currentSubStep}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white rounded-xl p-6 border border-gray-200 shadow-lg"
          >
            {currentSubStep === 0 && <ServiceStepPreview />}
            {currentSubStep === 1 && <DateTimeStepPreview />}
            {currentSubStep === 2 && <DetailsStepPreview />}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ServiceStepPreview = () => {
  const t = useTranslations("dashboard.onboarding.createAppointment.serviceStep");
  const services = ["haircut", "color", "styling"] as const;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-gray-900">{t("title")}</h3>
      <div className="space-y-2">
        {services.map((service, idx) => (
          <motion.div
            key={service}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="p-4 border border-gray-200 rounded-lg hover:border-teal-500 hover:bg-teal-50 transition-all cursor-pointer"
          >
            <span className="text-sm font-semibold text-gray-900">{t(service)}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const DateTimeStepPreview = () => {
  const t = useTranslations("dashboard.onboarding.createAppointment.dateTimeStep");

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-gray-900">{t("title")}</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-semibold text-gray-700 block mb-2">{t("dateLabel")}</label>
          <div className="p-3 border border-gray-200 rounded-lg bg-gray-50">
            <span className="text-sm text-gray-900">{t("sampleDate")}</span>
          </div>
        </div>
        <div>
          <label className="text-sm font-semibold text-gray-700 block mb-2">{t("timeLabel")}</label>
          <div className="space-y-2">
            {["10:00 AM", "11:00 AM", "2:00 PM"].map((time, idx) => (
              <motion.div
                key={time}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.1 }}
                className={`p-2 text-center border rounded-lg text-sm font-semibold ${
                  idx === 0
                    ? "border-teal-500 bg-teal-50 text-teal-900"
                    : "border-gray-200 bg-white text-gray-700"
                }`}
              >
                {time}
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const DetailsStepPreview = () => {
  const t = useTranslations("dashboard.onboarding.createAppointment.detailsStep");

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-gray-900">{t("title")}</h3>
      <div className="space-y-3">
        <div>
          <label className="text-sm font-semibold text-gray-700 block mb-1">{t("nameLabel")}</label>
          <input
            type="text"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            placeholder={t("namePlaceholder")}
            readOnly
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-gray-700 block mb-1">{t("emailLabel")}</label>
          <input
            type="email"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            placeholder={t("emailPlaceholder")}
            readOnly
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-gray-700 block mb-1">{t("phoneLabel")}</label>
          <input
            type="tel"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            placeholder={t("phonePlaceholder")}
            readOnly
          />
        </div>
      </div>
    </div>
  );
};

const DragDropVisual = () => {
  const t = useTranslations("dashboard.onboarding.dragDrop");
  const [draggedPosition, setDraggedPosition] = useState(1);
  const [isDragging, setIsDragging] = useState(false);

  const slots = ["10 AM", "11 AM", "12 PM", "1 PM"];

  return (
    <div className="space-y-4">
      <div className="text-center text-sm text-gray-600 mb-6 bg-teal-50 p-3 rounded-lg">
        {t("tip")}
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
                    : "border-gray-200 bg-gray-50 hover:border-teal-300"
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
                      <span className="font-semibold text-sm">{t("appointmentName")}</span>
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
          {t("notification")}
        </motion.div>
      </div>
    </div>
  );
};

const ManageBookingsVisual = () => {
  const t = useTranslations("dashboard.onboarding.manageBookings");
  const [showDetails, setShowDetails] = useState(false);
  const [actionTaken, setActionTaken] = useState<"edited" | "cancelled" | null>(null);

  const handleEdit = () => {
    setActionTaken("edited");
    setTimeout(() => {
      setShowDetails(false);
      setActionTaken(null);
    }, 1500);
  };

  return (
    <div className="space-y-6">
      {/* Appointment Card */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <AnimatePresence mode="wait">
          {actionTaken === null ? (
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
                  <div className="font-semibold">{t("customerName")}</div>
                  <div className="text-sm opacity-90">{t("service")} - {t("time")} - {t("price")}</div>
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
              key="action-taken"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`w-full p-4 rounded-lg border-2 ${
                actionTaken === "edited"
                  ? "bg-green-50 border-green-200"
                  : "bg-red-50 border-red-200"
              }`}
            >
              <div className={`flex items-center justify-center gap-2 font-semibold ${
                actionTaken === "edited" ? "text-green-700" : "text-red-700"
              }`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {actionTaken === "edited" ? t("feedback.updated") : t("feedback.cancelled")}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Details Panel */}
      <AnimatePresence>
        {showDetails && actionTaken === null && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white rounded-xl p-6 border border-gray-200 space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t("labels.customer")}</span>
                  <span className="font-semibold text-gray-900">{t("customerName")}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t("labels.service")}</span>
                  <span className="font-semibold text-gray-900">{t("service")}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t("labels.time")}</span>
                  <span className="font-semibold text-gray-900">{t("time")}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t("labels.status")}</span>
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-lg font-semibold text-xs">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                    {t("status.confirmed")}
                  </span>
                </div>
              </div>
              <div className="flex gap-2 pt-4 border-t border-gray-200">
                <motion.button
                  onClick={handleEdit}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-teal-600 to-green-600 text-white rounded-lg font-semibold text-sm hover:shadow-lg transition-all"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {t("actions.edit")}
                </motion.button>
                <button className="flex-1 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-lg transition-all">
                  {t("actions.reschedule")}
                </button>
                <button className="px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-all">
                  {t("actions.cancel")}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const InsightsVisual = () => {
  const t = useTranslations("dashboard.onboarding.insights");
  const tDays = useTranslations("dashboard.onboarding.calendar.days");
  const days = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {[
          { label: t("stats.totalBookings"), value: "127", change: "+12%" },
          { label: t("stats.revenue"), value: "€3,840", change: "+8%" },
          { label: t("stats.avgRating"), value: "4.9", change: "+0.2" },
        ].map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white p-4 sm:p-6 rounded-xl border border-gray-200"
          >
            <div className="text-xs sm:text-sm text-gray-600 mb-1 sm:mb-2">{stat.label}</div>
            <div className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">{stat.value}</div>
            <div className="text-xs sm:text-sm font-semibold text-green-600">{stat.change}</div>
          </motion.div>
        ))}
      </div>

      {/* Chart Preview */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="bg-white p-6 rounded-xl border border-gray-200"
      >
        <h4 className="text-sm font-semibold text-gray-700 mb-4">{t("chart.title")}</h4>
        <div className="h-32 flex items-end justify-between gap-2">
          {[65, 80, 70, 90, 85, 95, 100].map((height, idx) => (
            <motion.div
              key={idx}
              initial={{ height: 0 }}
              animate={{ height: `${height}%` }}
              transition={{ delay: 0.5 + idx * 0.1 }}
              className="flex-1 bg-gradient-to-t from-teal-500 to-green-500 rounded-t-lg"
            />
          ))}
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          {days.map((day) => (
            <span key={day}>{tDays(day)}</span>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

const SettingsVisual = () => {
  const t = useTranslations("dashboard.onboarding.settings.sections");

  const sections = [
    { key: "profile" as const, icon: "👤" },
    { key: "business" as const, icon: "🏢" },
    { key: "booking" as const, icon: "📅" },
    { key: "security" as const, icon: "🔒" },
  ];

  return (
    <div className="space-y-4">
      {sections.map((section, idx) => (
        <motion.div
          key={section.key}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: idx * 0.1 }}
          className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-xl hover:border-teal-500 hover:shadow-md transition-all cursor-pointer"
        >
          <div className="text-3xl">{section.icon}</div>
          <div className="flex-1">
            <div className="font-semibold text-gray-900">{t(`${section.key}.title`)}</div>
            <div className="text-sm text-gray-600">{t(`${section.key}.description`)}</div>
          </div>
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </motion.div>
      ))}
    </div>
  );
};

export default OnboardingTutorial;
