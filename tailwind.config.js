module.exports = {
  content: [
    "./src/renderer/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    fontSize: {
      'xs': '1rem',      // 16px
      'sm': '1.25rem',   // 20px
      'base': '1.5rem',  // 24px
      'lg': '1.75rem',   // 28px
      'xl': '2rem',      // 32px
      '2xl': '2.5rem',   // 40px
      '3xl': '3rem',     // 48px
      '4xl': '3.5rem',   // 56px
      '5xl': '4rem',     // 64px
    },
    spacing: {
      px: '1px',
      0: '0px',
      0.5: '0.125rem',
      1: '0.5rem',      // 8px -> 16px
      2: '1rem',        // 16px -> 32px
      3: '1.5rem',      // 24px -> 48px
      4: '2rem',        // 32px -> 64px
      5: '2.5rem',      // 40px -> 80px
      6: '3rem',        // 48px -> 96px
      8: '4rem',        // 64px -> 128px
      10: '5rem',       // 80px -> 160px
      12: '6rem',       // 96px -> 192px
      16: '8rem',       // 128px -> 256px
      20: '10rem',      // 160px -> 320px
      24: '12rem',      // 192px -> 384px
      32: '16rem',      // 256px -> 512px
      40: '20rem',      // 320px -> 640px
      48: '24rem',      // 384px -> 768px
      56: '28rem',      // 448px -> 896px
      64: '32rem',      // 512px -> 1024px
    },
    extend: {
      colors: {
        main: '#57F3A8',
      },
      borderRadius: {
        'none': '0',
        'sm': '0.25rem',    // 4px -> 8px
        'DEFAULT': '0.5rem', // 8px -> 16px
        'md': '0.75rem',     // 12px -> 24px
        'lg': '1rem',        // 16px -> 32px
        'xl': '1.5rem',      // 24px -> 48px
        '2xl': '2rem',       // 32px -> 64px
        '3xl': '3rem',       // 48px -> 96px
        'full': '9999px',
      },
      width: {
        '1': '0.5rem',     // 8px -> 16px
        '2': '1rem',       // 16px -> 32px
        '3': '1.5rem',     // 24px -> 48px
        '4': '2rem',       // 32px -> 64px
        '5': '2.5rem',     // 40px -> 80px
        '6': '3rem',       // 48px -> 96px
        '8': '4rem',       // 64px -> 128px
        '10': '5rem',      // 80px -> 160px
        '12': '6rem',      // 96px -> 192px
        '16': '8rem',      // 128px -> 256px
        '20': '10rem',     // 160px -> 320px
        '24': '12rem',     // 192px -> 384px
        '32': '16rem',     // 256px -> 512px
        '40': '20rem',     // 320px -> 640px
        '44': '22rem',     // 352px -> 704px
        '48': '24rem',     // 384px -> 768px
        '56': '28rem',     // 448px -> 896px
        '64': '32rem',     // 512px -> 1024px
      },
      height: {
        '1': '0.5rem',     // 8px -> 16px
        '2': '1rem',       // 16px -> 32px
        '3': '1.5rem',     // 24px -> 48px
        '4': '2rem',       // 32px -> 64px
        '5': '2.5rem',     // 40px -> 80px
        '6': '3rem',       // 48px -> 96px
        '8': '4rem',       // 64px -> 128px
        '10': '5rem',      // 80px -> 160px
        '12': '6rem',      // 96px -> 192px
        '16': '8rem',      // 128px -> 256px
        '20': '10rem',     // 160px -> 320px
        '24': '12rem',     // 192px -> 384px
        '32': '16rem',     // 256px -> 512px
        '40': '20rem',     // 320px -> 640px
        '44': '22rem',     // 352px -> 704px
        '48': '24rem',     // 384px -> 768px
        '56': '28rem',     // 448px -> 896px
        '60': '30rem',     // 480px -> 960px
        '64': '32rem',     // 512px -> 1024px
      },
    },
  },
  plugins: [],
}