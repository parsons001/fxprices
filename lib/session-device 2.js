function browserFor(userAgent) {
  const browsers = [
    ["Edge", /Edg(?:e|A|iOS)?\/[\d.]+/],
    ["Opera", /OPR\/[\d.]+/],
    ["Samsung Internet", /SamsungBrowser\/[\d.]+/],
    ["Firefox", /(?:Firefox|FxiOS)\/[\d.]+/],
    ["Chrome", /(?:Chrome|CriOS)\/[\d.]+/],
    ["Safari", /Version\/[\d.]+.*Safari/],
  ];

  return browsers.find(([, pattern]) => pattern.test(userAgent))?.[0];
}

function operatingSystemFor(userAgent) {
  if (/iPhone|iPad|iPod/.test(userAgent)) return "iOS";
  if (/Android/.test(userAgent)) return "Android";
  if (/Windows NT/.test(userAgent)) return "Windows";
  if (/Mac OS X|Macintosh/.test(userAgent)) return "macOS";
  if (/CrOS/.test(userAgent)) return "ChromeOS";
  if (/Linux/.test(userAgent)) return "Linux";
}

function deviceTypeFor(userAgent) {
  if (
    /iPad|Tablet/.test(userAgent) ||
    (/Android/.test(userAgent) && !/Mobile/.test(userAgent))
  ) {
    return "Tablet";
  }
  if (/Mobile|iPhone|iPod|Android/.test(userAgent)) return "Mobile";
  return "Desktop";
}

export function describeSessionDevice(userAgent) {
  if (!userAgent) return "Unknown device";

  const details = [
    browserFor(userAgent),
    operatingSystemFor(userAgent),
    deviceTypeFor(userAgent),
  ].filter(Boolean);

  return details.length > 1 ? details.join(" · ") : "Unknown device";
}
