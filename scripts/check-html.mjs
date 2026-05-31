import fs from "node:fs";

const files = ["LectureAI_Working.html"];

for (const file of files) {
  const html = fs.readFileSync(file, "utf8");
  const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
    .map(match => match[1])
    .filter(script => script.trim());

  for (const script of scripts) {
    new Function(script);
  }

  console.log(`${file}: ${scripts.length} inline script(s) parse ok`);
}
