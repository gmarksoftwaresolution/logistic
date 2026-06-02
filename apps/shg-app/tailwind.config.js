module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      fontFamily: {
        regular: ["Poppins-Regular"],
        medium: ["Poppins-Medium"],
        semibold: ["Poppins-SemiBold"],
        bold: ["Poppins-Bold"],
        extrabold: ["Poppins-ExtraBold"],
        black: ["Poppins-Black"],
      },
      colors: {
        primary: "#073318",

        textPrimary: "#181D27",
        textSecondary: "#414651",
        placeholder: "#6C737F",

        background: "#F8FAFC", // Slightly cleaner modern background
        surface: "#FFFFFF",

        success: "#12B76A",
        warning: "#F79009",
        error: "#B42318",
      },
      boxShadow: {
        'modern': '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
        'premium': '0 10px 40px -4px rgba(0, 0, 0, 0.08)',
      }
    },
  },
  plugins: [],
};
