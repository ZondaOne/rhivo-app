'use client';

import { useState } from 'react';

export interface Service {
  id: string;
  name: string;
  description: string;
  duration: number; // minutes
  price: number; // euros
  color?: string;
  sortOrder: number;
  enabled: boolean;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  sortOrder: number;
  services: Service[];
}

interface ServiceBuilderProps {
  categories: Category[];
  onChange: (categories: Category[]) => void;
}

// Pre-defined color palette following style guide
const SERVICE_COLORS = [
  '#0ea5e9', // Sky blue
  '#0284c7', // Darker sky
  '#0369a1', // Deep sky
  '#7c3aed', // Purple
  '#6d28d9', // Deeper purple
  '#5b21b6', // Dark purple
  '#4c1d95', // Darkest purple
  '#059669', // Green
  '#047857', // Darker green
  '#991b1b', // Red
  '#dc2626', // Lighter red
  '#b91c1c', // Medium red
  '#7f1d1d', // Dark red
];

export default function ServiceBuilder({ categories, onChange }: ServiceBuilderProps) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [expandedService, setExpandedService] = useState<string | null>(null);

  const generateId = (name: string): string => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  };

  const addCategory = () => {
    const newCategory: Category = {
      id: `category-${Date.now()}`,
      name: '',
      description: '',
      sortOrder: categories.length,
      services: [],
    };
    onChange([...categories, newCategory]);
    setExpandedCategory(newCategory.id);
  };

  const updateCategory = (categoryId: string, updates: Partial<Category>) => {
    onChange(
      categories.map((cat) =>
        cat.id === categoryId ? { ...cat, ...updates } : cat
      )
    );
  };

  const updateCategoryName = (categoryId: string, name: string) => {
    updateCategory(categoryId, {
      name,
      id: name ? generateId(name) : categoryId,
    });
  };

  const removeCategory = (categoryId: string) => {
    onChange(categories.filter((cat) => cat.id !== categoryId));
  };

  const addService = (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId);
    if (!category) return;

    const newService: Service = {
      id: `service-${Date.now()}`,
      name: '',
      description: '',
      duration: 30,
      price: 0,
      sortOrder: category.services.length,
      enabled: true,
    };

    updateCategory(categoryId, {
      services: [...category.services, newService],
    });
    setExpandedService(newService.id);
  };

  const updateService = (categoryId: string, serviceId: string, updates: Partial<Service>) => {
    const category = categories.find((c) => c.id === categoryId);
    if (!category) return;

    updateCategory(categoryId, {
      services: category.services.map((svc) =>
        svc.id === serviceId ? { ...svc, ...updates } : svc
      ),
    });
  };

  const updateServiceName = (categoryId: string, serviceId: string, name: string) => {
    updateService(categoryId, serviceId, {
      name,
      id: name ? generateId(name) : serviceId,
    });
  };

  const removeService = (categoryId: string, serviceId: string) => {
    const category = categories.find((c) => c.id === categoryId);
    if (!category) return;

    updateCategory(categoryId, {
      services: category.services.filter((svc) => svc.id !== serviceId),
    });
  };

  return (
    <div className="space-y-4">
      {categories.map((category, catIndex) => (
        <div key={category.id} className="border-2 border-gray-200 rounded-2xl overflow-hidden">
          {/* Category header */}
          <div className="bg-gray-50 p-4">
            <div className="flex items-center gap-3 mb-3">
              <input
                type="text"
                value={category.name}
                onChange={(e) => updateCategory(category.id, { name: e.target.value })}
                onBlur={(e) => {
                  const name = e.target.value;
                  if (name) {
                    updateCategory(category.id, { id: generateId(name) });
                  }
                }}
                placeholder="Category name (e.g., Hair Services)"
                className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent font-semibold text-gray-900"
              />
              <button
                onClick={() =>
                  setExpandedCategory(expandedCategory === category.id ? null : category.id)
                }
                className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-all"
              >
                <svg
                  className={`w-5 h-5 text-gray-500 transition-transform ${
                    expandedCategory === category.id ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              <button
                onClick={() => removeCategory(category.id)}
                className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-red-50 text-gray-400 hover:text-red-600 transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>

            {expandedCategory === category.id && (
              <div className="space-y-3">
                <textarea
                  value={category.description}
                  onChange={(e) => updateCategory(category.id, { description: e.target.value })}
                  placeholder="Category description (optional)"
                  rows={2}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                />
              </div>
            )}
          </div>

          {/* Services list */}
          <div className="p-4 space-y-3">
            {category.services.map((service, svcIndex) => (
              <div key={service.id} className="border border-gray-200 rounded-xl overflow-hidden">
                {/* Service header */}
                <div className="flex items-center gap-3 p-3 bg-white">
                  {service.color && (
                    <div
                      className="w-4 h-4 rounded-md"
                      style={{ backgroundColor: service.color }}
                    />
                  )}
                  <input
                    type="text"
                    value={service.name}
                    onChange={(e) => updateService(category.id, service.id, { name: e.target.value })}
                    onBlur={(e) => {
                      const name = e.target.value;
                      if (name) {
                        updateService(category.id, service.id, { id: generateId(name) });
                      }
                    }}
                    placeholder="Service name (e.g., Haircut)"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent font-medium text-sm"
                  />
                  <button
                    onClick={() =>
                      setExpandedService(expandedService === service.id ? null : service.id)
                    }
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-all"
                  >
                    <svg
                      className={`w-4 h-4 text-gray-500 transition-transform ${
                        expandedService === service.id ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => removeService(category.id, service.id)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                {/* Service details (expanded) */}
                {expandedService === service.id && (
                  <div className="p-4 bg-gray-50 space-y-4 border-t border-gray-200">
                    <textarea
                      value={service.description}
                      onChange={(e) =>
                        updateService(category.id, service.id, { description: e.target.value })
                      }
                      placeholder="Service description"
                      rows={2}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                    />

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Duration (minutes)
                        </label>
                        <input
                          type="number"
                          value={service.duration}
                          onChange={(e) =>
                            updateService(category.id, service.id, {
                              duration: Number(e.target.value),
                            })
                          }
                          min={5}
                          step={5}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Price (€)
                        </label>
                        <input
                          type="number"
                          value={service.price}
                          onChange={(e) =>
                            updateService(category.id, service.id, {
                              price: Number(e.target.value),
                            })
                          }
                          min={0}
                          step={0.5}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          e.g., 30.00
                        </p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-2">
                        Color (optional)
                      </label>
                      <div className="grid grid-cols-7 gap-2">
                        {SERVICE_COLORS.map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => updateService(category.id, service.id, { color })}
                            className={`w-8 h-8 rounded-lg transition-all ${
                              service.color === color
                                ? 'ring-2 ring-teal-500 ring-offset-2 scale-110'
                                : 'hover:scale-105'
                            }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                      {service.color && (
                        <button
                          type="button"
                          onClick={() => updateService(category.id, service.id, { color: undefined })}
                          className="mt-2 text-xs text-gray-500 hover:text-gray-700 underline"
                        >
                          Use brand colors (default)
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}

            <button
              onClick={() => addService(category.id)}
              className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm font-semibold text-gray-500 hover:border-teal-500 hover:text-teal-600 hover:bg-teal-50 transition-all"
            >
              + Add Service
            </button>
          </div>
        </div>
      ))}

      <button
        onClick={addCategory}
        className="w-full px-6 py-4 border-2 border-dashed border-gray-300 rounded-2xl text-sm font-semibold text-gray-500 hover:border-teal-500 hover:text-teal-600 hover:bg-teal-50 transition-all"
      >
        + Add Category
      </button>

      {categories.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No services yet</p>
          <p className="text-sm text-gray-400">
            Click "Add Category" above to create your first service category
          </p>
        </div>
      )}
    </div>
  );
}
