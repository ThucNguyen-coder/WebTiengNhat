// Bậc 2 điền từ: mồi nhử không bao giờ là cách viết khác được chấp nhận của cùng một ý.
// Chạy: node scripts/run.mjs scripts/check-fill.js
import { ALL_SCENARIOS, buildFill } from '../src/lib/relayTiers';

let bad = 0;
let blanks = 0;
for (const sc of ALL_SCENARIOS) {
  sc.steps.forEach((st, si) => {
    for (let n = 0; n < 200; n++) {
      const fill = buildFill(st);
      if (!fill) return;
      for (const b of fill.blanks) {
        blanks++;
        const kp = st.keypoints[b.kpIndex];
        const right = b.options.filter((o) => o.form === b.answer.form || kp.accept.includes(o.form));
        if (right.length !== 1) {
          bad++;
          console.log(`SAI ${sc.id}[${si}] ô "${b.label}": ${b.options.map((o) => o.form).join(' / ')} (đáp án ${b.answer.form})`);
          return;
        }
        if (!b.options.some((o) => o.form === b.answer.form)) { bad++; console.log(`SAI ${sc.id}[${si}]: thiếu đáp án`); return; }
      }
    }
  });
}
console.log(bad ? `${bad} lỗi` : `OK (${blanks} ô đã thử)`);
if (bad) process.exitCode = 1;
