'use client';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showText?: boolean;
}

export function Logo({ size = 'lg', className = '', showText = true }: LogoProps) {
  const sizeClasses = {
    sm: {
      text: 'text-4xl',
      padding: 'px-4 py-2',
    },
    md: {
      text: 'text-6xl',
      padding: 'px-6 py-3',
    },
    lg: {
      text: 'clamp(80px, 14vw, 140px)',
      padding: 'px-10 py-5',
    },
    xl: {
      text: 'clamp(100px, 16vw, 180px)',
      padding: 'px-12 py-6',
    },
  };

  return (
    <>
      {/* SVG Filter - hidden but needed for the color effect */}
      <svg style={{ display: 'none' }}>
        <defs>
          <filter id="remove-red">
            <feComponentTransfer>
              <feFuncR type="linear" slope="0"/>
              <feFuncG type="linear" slope="1" intercept="0.15"/>
              <feFuncB type="linear" slope="1"/>
            </feComponentTransfer>
          </filter>
        </defs>
      </svg>

      {showText ? (
        <h1 className={`rivo-logo ${className}`}>
          rivo
        </h1>
      ) : (
        <div
          className={`rivo-logo-icon ${className}`}
          style={{
            // Use a shared CSS variable to size the icon consistently per variant
            // This ensures the inner "r" remains centered and doesn't touch the "O"
            // across all size options
            ['--icon-size' as any]:
              size === 'lg'
                ? '6rem'
                : size === 'xl'
                ? '7rem'
                : size === 'md'
                ? '5rem'
                : '4rem',
            // Inner scale controls how much smaller the "r" is than the outer "O"
            // Lower value => more padding from the ring
            ['--inner-scale' as any]: '0.30',
            // Slight positional nudge for the inner "r"
            ['--r-offset-x' as any]: 'calc(var(--icon-size) * 0.03)', // right
            ['--r-offset-y' as any]: 'calc(var(--icon-size) * -0.06)', // up
          }}
        >
          <span className="icon-o">o</span>
          <span className="icon-r">r</span>
        </div>
      )}

      <style jsx>{`
        @font-face {
          font-family: 'ColorTube';
          src: url('/ColorTube.otf') format('opentype');
          font-display: swap;
        }

        .rivo-logo {
          font-family: 'ColorTube', sans-serif;
          font-size: ${size === 'lg' ? 'clamp(80px, 14vw, 140px)' : size === 'xl' ? 'clamp(100px, 16vw, 180px)' : size === 'md' ? '3.75rem' : '2.25rem'};
          line-height: 1.4;
          letter-spacing: 0.01em;
          background: linear-gradient(to right, #0d9488, #10b981, #0d9488);
          background-size: 200% auto;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer 8s ease-in-out infinite;
          filter: url(#remove-red);
          margin: ${size === 'lg' ? '20px 0' : size === 'xl' ? '24px 0' : size === 'md' ? '16px 0' : '12px 0'};
          padding: ${size === 'lg' ? '20px 40px' : size === 'xl' ? '24px 48px' : size === 'md' ? '16px 30px' : '12px 20px'};
          display: block;
        }

        .rivo-logo-icon {
          font-family: 'ColorTube', sans-serif;
          /* Size the container to the outer "O" */
          width: var(--icon-size);
          height: var(--icon-size);
          display: inline-grid;
          place-items: center;
          position: relative;
          filter: url(#remove-red);
          letter-spacing: 0;
          line-height: 1;
          /* Optional: small outer padding per size for breathing room around the icon */
          padding: ${size === 'lg' ? '0.25rem' : size === 'xl' ? '0.375rem' : size === 'md' ? '0.2rem' : '0.15rem'};
        }

        /* Make both glyphs share the same grid cell so they perfectly overlay */
        .rivo-logo-icon > .icon-o,
        .rivo-logo-icon > .icon-r {
          grid-area: 1 / 1;
        }

        .icon-o {
          background: linear-gradient(to right, #0d9488, #10b981, #0d9488);
          background-size: 200% auto;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer 8s ease-in-out infinite;
          font-size: var(--icon-size);
          line-height: 1;
          letter-spacing: 0;
        }

        .icon-r {
          background: linear-gradient(to right, #0d9488, #10b981, #0d9488);
          background-size: 200% auto;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer 8s ease-in-out infinite;
          /* Render at the outer size, then translate (not scaled) and scale from center */
          font-size: var(--icon-size);
          transform: translate(var(--r-offset-x), var(--r-offset-y)) scale(var(--inner-scale));
          transform-origin: center center;
          line-height: 1;
          letter-spacing: 0;
        }

        @keyframes shimmer {
          0%, 100% { background-position: 0% center; }
          50% { background-position: 100% center; }
        }
      `}</style>
    </>
  );
}
