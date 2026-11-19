// Runs before every build (also on Vercel): pull content from the Google Sheet,
// then create audio for anything new. Both steps are skipped when not configured,
// and neither can break the build.
import { syncSheet } from './sync-sheet';
import { generateAudio } from './gen-audio';

try { await syncSheet(); } catch (err) { console.warn('[sheet] Lỗi:', err.message); }
try { await generateAudio(); } catch (err) { console.warn('[audio] Lỗi:', err.message); }
