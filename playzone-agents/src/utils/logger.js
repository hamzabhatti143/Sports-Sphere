// Tiny structured logger — every agent step logs through here so the payment
// flow is traceable (the spec asks for console.log on every step).
function ts() {
  return new Date().toISOString();
}
module.exports = {
  info: (...a) => console.log(`[${ts()}] ℹ️ `, ...a),
  ok: (...a) => console.log(`[${ts()}] ✅`, ...a),
  warn: (...a) => console.warn(`[${ts()}] ⚠️ `, ...a),
  error: (...a) => console.error(`[${ts()}] ❌`, ...a),
  step: (name, ...a) => console.log(`[${ts()}] → ${name}`, ...a),
};
