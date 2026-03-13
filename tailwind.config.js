module.exports = {
  content: [
    "./Pages/**/*.{cshtml,html}",
    "./Views/**/*.{cshtml,html}",
    "./wwwroot/js/**/*.js",
  ],
  theme: {
    extend: {
      colors: {
        primary: COLORS.primary,
        brand: COLORS.dark,
        muted: COLORS.textMuted,
        offwhite: COLORS.offwhite,
      },
      fontFamily: {
        display: ["Syne", "sans-serif"],
        body: ["DM Sans", "sans-serif"],
      },
    },
  },
  plugins: [],
};
