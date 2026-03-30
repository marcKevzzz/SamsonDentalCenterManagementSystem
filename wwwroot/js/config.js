tailwind.config = {
  theme: {
    extend: {
      colors: {
        primary: "#1E40AF", // replace COLORS.primary
        brand: "#0F172A", // replace COLORS.dark
        muted: "#6B7280", // replace COLORS.textMuted
        offwhite: "#F8FAFC", // replace COLORS.offwhite
      },
      fontFamily: {
        display: ["Roboto", "sans-serif"],
        body: ["DM Sans", "sans-serif"],
      },
    },
  },
};

window.COLORS = {
  primary: "#c0392b", // Red accent (buttons, badges, hover)
  dark: "#0f1117", // Dark backgrounds, footer, nav scrolled
  darkNavBg: "rgba(15,17,23,0.92)", // Navbar bg after scroll
  white: "#ffffff",
  offwhite: "#f5f5f7", // Section bg, card bg
  text: "#1a1a2e",
  textMuted: "#6b7280",
  badgePurple: "#7c3aed", // Whitening promo badge
  badgeTeal: "#059669", // Free consultation badge
  star: "#f59e0b", // Star rating
  border: "#e5e7eb",
};
