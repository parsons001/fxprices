function browserFor(userAgent) {
  const browsers = [
    ["Microsoft Edge", /Edg(?:e|A|iOS)?\/([\d.]+)/],
    ["Opera", /OPR\/([\d.]+)/],
    ["Samsung Internet", /SamsungBrowser\/([\d.]+)/],
    ["Firefox", /(?:Firefox|FxiOS)\/([\d.]+)/],
    ["Chrome", /(?:Chrome|CriOS)\/([\d.]+)/],
    ["Safari", /Version\/([\d.]+).*Safari/],
  ];

  for (const [name, pattern] of browsers) {
    const match = userAgent.match(pattern);
    if (match) return `${name} ${match[1]}`;
  }
}

function operatingSystemFor(userAgent) {
  const iosVersion = userAgent.match(/(?:iPhone|CPU) OS ([\d_]+)/)?.[1];
  if (iosVersion) return `iOS ${iosVersion.replaceAll("_", ".")}`;

  const androidVersion = userAgent.match(/Android\s+([\d.]+)/)?.[1];
  if (androidVersion) {
    const model = userAgent
      .match(/Android\s+[\d.]+;\s*([^;)]+)/)?.[1]
      ?.replace(/\s+Build\/.*$/, "")
      .trim();
    const usefulModel =
      model && !/^(?:Mobile|Tablet|wv)$/i.test(model) ? model : undefined;
    return `Android ${androidVersion}${usefulModel ? ` · ${usefulModel}` : ""}`;
  }

  const windowsVersion = userAgent.match(/Windows NT ([\d.]+)/)?.[1];
  if (windowsVersion) {
    const versionName = {
      "10.0": "10 or 11",
      6.3: "8.1",
      6.2: "8",
      6.1: "7",
    }[windowsVersion];
    return `Windows ${versionName ?? windowsVersion}`;
  }

  const macVersion = userAgent.match(/Mac OS X ([\d_]+)/)?.[1];
  if (macVersion) return `macOS ${macVersion.replaceAll("_", ".")}`;

  const chromeOsVersion = userAgent.match(/CrOS [^ ]+ ([\d.]+)/)?.[1];
  if (chromeOsVersion) return `ChromeOS ${chromeOsVersion}`;
  if (/Linux/.test(userAgent)) return "Linux";
}

function deviceFor(userAgent) {
  if (/iPad/.test(userAgent)) return "iPad";
  if (/iPhone/.test(userAgent)) return "iPhone";
  if (/iPod/.test(userAgent)) return "iPod";
  if (/Android/.test(userAgent)) {
    return /Mobile/.test(userAgent) ? "Mobile device" : "Tablet";
  }
  if (/Tablet/.test(userAgent)) return "Tablet";
  if (/Mobile/.test(userAgent)) return "Mobile";
  if (/Windows|Macintosh|Linux|CrOS/.test(userAgent)) return "Desktop";
}

export function describeSessionDevice(userAgent) {
  if (!userAgent) return "Unknown device";

  const details = [
    browserFor(userAgent),
    operatingSystemFor(userAgent),
    deviceFor(userAgent),
  ].filter(Boolean);

  return details.length ? details.join(" · ") : "Unknown device";
}
