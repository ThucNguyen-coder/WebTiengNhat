// Đánh dấu thẻ từ vựng: { [jp]: 'known' | 'review' }, lưu localStorage.
import { useCallback, useEffect, useState } from 'react';

const KEY = 'konnichiwa-flashcards-v1';

export function loadMarks() {
  try {
    const data = JSON.parse(localStorage.getItem(KEY) || '{}');
    return data && typeof data === 'object' && !Array.isArray(data) ? data : {};
  } catch {
    return {};
  }
}

function saveMarks(marks) {
  try { localStorage.setItem(KEY, JSON.stringify(marks)); } catch { /* storage blocked */ }
}

export function useFlashcardMarks() {
  const [marks, setMarks] = useState(loadMarks);
  useEffect(() => { saveMarks(marks); }, [marks]);
  const mark = useCallback((jp, status) => setMarks((m) => ({ ...m, [jp]: status })), []);
  return { marks, mark };
}
