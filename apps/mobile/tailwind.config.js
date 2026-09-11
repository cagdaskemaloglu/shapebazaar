/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      // apps/web/src/app/globals.css içindeki @theme bloğuyla birebir aynı —
      // iki app de aynı marka renklerini kullanır. Renk değiştirirsen ikisini
      // de güncellemeyi unutma (ya da ileride bunu da packages/shared'a taşı).
      colors: {
        brand: {
          orange: "#FF6B35",
          dark: "#1E293B",
          light: "#F8FAFC",
          green: "#10B981",
        },
      },
    },
  },
  plugins: [],
};
