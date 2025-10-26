interface TestButtonProps {
  label: string;
  testName: string;
  description: string;
  color: 'red' | 'purple' | 'cyan' | 'orange';
  status: 'passed' | 'failed' | 'pending';
  disabled: boolean;
  onClick: () => void;
}

const colorClasses = {
  red: {
    bg: 'bg-red-600',
    hover: 'hover:bg-red-700',
    ring: 'ring-red-500'
  },
  purple: {
    bg: 'bg-purple-600',
    hover: 'hover:bg-purple-700',
    ring: 'ring-purple-500'
  },
  cyan: {
    bg: 'bg-cyan-600',
    hover: 'hover:bg-cyan-700',
    ring: 'ring-cyan-500'
  },
  orange: {
    bg: 'bg-orange-600',
    hover: 'hover:bg-orange-700',
    ring: 'ring-orange-500'
  }
};

export function TestButton({ label, testName, description, color, status, disabled, onClick }: TestButtonProps) {
  const colors = colorClasses[color];

  return (
    <div className="space-y-2">
      <button
        className={`w-full px-4 py-3 text-white rounded-lg text-sm font-medium transition-colors relative ${colors.bg} ${colors.hover} ${
          status !== 'pending' ? 'ring-2 ring-offset-2' : ''
        } ${
          status === 'passed' ? 'ring-green-500' :
          status === 'failed' ? 'ring-red-500' : ''
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        disabled={disabled}
        onClick={onClick}
      >
        <div className="flex items-center justify-between">
          <span>{label}</span>
          {status === 'passed' && <span className="text-green-300 font-bold">✓</span>}
          {status === 'failed' && <span className="text-red-300 font-bold">✗</span>}
        </div>
      </button>
      <p className="text-xs text-gray-500 px-2">{description}</p>
    </div>
  );
}
