const display = document.getElementById('display');
const keys = document.querySelectorAll('.calculator__key');

function roundResult(value) {
  return Math.round(value * 1000) / 1000;
}

keys.forEach((key) => {
  key.addEventListener('click', () => {
    const value = key.textContent;
    const dataKey = key.dataset.key; // grab data-key attribute

    if (value === 'C') {
      display.textContent = '0';
      return;
    }

    // +/- toggle
    if (value === '+/-') {
      const current = parseFloat(display.textContent);
      display.textContent = String(current * -1);
      return;
    }

    // Backspace
    if (value === '⌫') {
      const current = display.textContent;
      display.textContent = current.length > 1 ? current.slice(0, -1) : '0';
      return;
    }
    if (value === '=') {
      try {
        const raw = eval(display.textContent);
        display.textContent = String(roundResult(raw));
      } catch {
        display.textContent = '0';
      }
      return;
    }

    if (display.textContent === '0') {
      display.textContent = value;
      return;
    }

    display.textContent += value;
  });
});