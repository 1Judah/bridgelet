module.exports = {
  ci: {
    collect: {
      numberOfRuns: 1,
      startServerCommand: "npm start",
      startServerTimeout: 90000,
      url: ["http://localhost:3000"],
      settings: {
        chromeFlags: "--no-sandbox --headless=new",
      },
    },
    upload: {
      target: "temporary-public-storage",
    },
  },
};