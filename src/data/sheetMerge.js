// Merges content coming from the Google Sheet (src/data/generated/sheetContent.json,
// written by `npm run content`) on top of the content written in code.
// The sheet wins: same topic id / same word (jp) / same scenario id = replaced, new ones are added.

export function mergeTopics(base, sheet) {
  const byId = new Map(base.map((t) => [t.id, { ...t, words: [...t.words] }]));
  const order = base.map((t) => t.id);
  for (const t of sheet?.topics || []) {
    if (byId.has(t.id)) byId.set(t.id, { ...byId.get(t.id), ...t, words: byId.get(t.id).words });
    else { byId.set(t.id, { ...t, words: [] }); order.push(t.id); }
  }
  for (const w of sheet?.words || []) {
    const t = byId.get(w.topic);
    if (!t) continue;
    const word = { jp: w.jp, kana: w.kana, vi: w.vi };
    const i = t.words.findIndex((x) => x.jp === w.jp);
    if (i >= 0) t.words[i] = word;
    else t.words.push(word);
  }
  return order.map((id) => byId.get(id)).filter((t) => t.words.length > 0);
}

export function mergeScenarios(base, sheet) {
  const out = [...base];
  for (const sc of sheet?.relay || []) {
    const i = out.findIndex((x) => x.id === sc.id);
    if (i >= 0) out[i] = sc;
    else out.push(sc);
  }
  return out;
}
