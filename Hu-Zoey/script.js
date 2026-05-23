// ─── SOLVER LOGIC ────────────────────────────────────────────────────────────
//
// Strategy: generate every permutation of the 4 numbers, then for each
// permutation try every combination of 3 operators (+, -, *, /) and every
// way of parenthesising 4 numbers (5 distinct tree shapes).
//
// The 5 parenthesisation templates for numbers a,b,c,d and ops o1,o2,o3:
//   1. ((a o1 b) o2 c) o3 d        (left-to-right chain)
//   2. (a o1 (b o2 c)) o3 d
//   3. (a o1 b) o2 (c o3 d)        (split in the middle)
//   4. a o1 ((b o2 c) o3 d)
//   5. a o1 (b o2 (c o3 d))        (right-to-left chain)

const TARGET = 24;
const OPS = ['+', '-', '*', '/'];
const EPSILON = 1e-9;

function applyOp(a, b, op) {
  if (op === '+') return a + b;
  if (op === '-') return a - b;
  if (op === '*') return a * b;
  if (op === '/') return b === 0 ? null : a / b;
}

// Check if a sub-expression needs wrapping based on its own operator vs parent
function needsParen(childOp, parentOp, side) {
  const prec = { '+': 1, '-': 1, '*': 2, '/': 2 };
  if (prec[childOp] < prec[parentOp]) return true;
  if (side === 'right' && prec[childOp] === prec[parentOp] && (parentOp === '-' || parentOp === '/')) return true;
  return false;
}

// Evaluate all 5 tree shapes; return array of {value, expression} objects
function evaluate5Shapes(nums, ops) {
  const [a, b, c, d] = nums;
  const [sa, sb, sc, sd] = nums.map(n => n % 1 === 0 ? String(n) : n.toFixed(4));
  const [o1, o2, o3] = ops;
  const results = [];

  function push(val, str) {
    if (val !== null) results.push({ value: val, expression: str });
  }

  // Shape 1: ((a o1 b) o2 c) o3 d
  {
    const v1 = applyOp(a, b, o1);
    if (v1 !== null) {
      const v2 = applyOp(v1, c, o2);
      if (v2 !== null) {
        const v3 = applyOp(v2, d, o3);
        const e1 = `${sa} ${o1} ${sb}`;
        const p1 = needsParen(o1, o2, 'left') ? `(${e1})` : e1;
        const e2 = `${p1} ${o2} ${sc}`;
        const p2 = needsParen(o2, o3, 'left') ? `(${e2})` : e2;
        push(v3, `${p2} ${o3} ${sd}`);
      }
    }
  }

  // Shape 2: (a o1 (b o2 c)) o3 d
  {
    const v1 = applyOp(b, c, o2);
    if (v1 !== null) {
      const inner = `${sb} ${o2} ${sc}`;
      const p_inner = needsParen(o2, o1, 'right') ? `(${inner})` : inner;
      const e2 = `${sa} ${o1} ${p_inner}`;
      const v2 = applyOp(a, v1, o1);
      if (v2 !== null) {
        const v3 = applyOp(v2, d, o3);
        const p2 = needsParen(o1, o3, 'left') ? `(${e2})` : e2;
        push(v3, `${p2} ${o3} ${sd}`);
      }
    }
  }

  // Shape 3: (a o1 b) o2 (c o3 d)
  {
    const v1 = applyOp(a, b, o1);
    const v2 = applyOp(c, d, o3);
    if (v1 !== null && v2 !== null) {
      const v3 = applyOp(v1, v2, o2);
      const e1 = `${sa} ${o1} ${sb}`;
      const e2 = `${sc} ${o3} ${sd}`;
      const p1 = needsParen(o1, o2, 'left') ? `(${e1})` : e1;
      const p2 = needsParen(o3, o2, 'right') ? `(${e2})` : e2;
      push(v3, `${p1} ${o2} ${p2}`);
    }
  }

  // Shape 4: a o1 ((b o2 c) o3 d)
  {
    const v1 = applyOp(b, c, o2);
    if (v1 !== null) {
      const inner = `${sb} ${o2} ${sc}`;
      const p_inner = needsParen(o2, o3, 'left') ? `(${inner})` : inner;
      const e2 = `${p_inner} ${o3} ${sd}`;
      const v2 = applyOp(v1, d, o3);
      if (v2 !== null) {
        const v3 = applyOp(a, v2, o1);
        const p2 = needsParen(o3, o1, 'right') ? `(${e2})` : e2;
        push(v3, `${sa} ${o1} ${p2}`);
      }
    }
  }

  // Shape 5: a o1 (b o2 (c o3 d))
  {
    const v1 = applyOp(c, d, o3);
    if (v1 !== null) {
      const inner = `${sc} ${o3} ${sd}`;
      const v2 = applyOp(b, v1, o2);
      if (v2 !== null) {
        const v3 = applyOp(a, v2, o1);
        const p_inner = needsParen(o3, o2, 'right') ? `(${inner})` : inner;
        const e2 = `${sb} ${o2} ${p_inner}`;
        const p2 = needsParen(o2, o1, 'right') ? `(${e2})` : e2;
        push(v3, `${sa} ${o1} ${p2}`);
      }
    }
  }

  return results;
}

// Generate all permutations of an array
function permutations(arr) {
  if (arr.length <= 1) return [arr];
  const result = [];
  for (let i = 0; i < arr.length; i++) {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
    for (const perm of permutations(rest)) {
      result.push([arr[i], ...perm]);
    }
  }
  return result;
}

function findSolutions(numbers) {
  const solutions = new Set(); // use Set to deduplicate
  const perms = permutations(numbers);

  for (const perm of perms) {
    for (const o1 of OPS) {
      for (const o2 of OPS) {
        for (const o3 of OPS) {
          const candidates = evaluate5Shapes(perm, [o1, o2, o3]);
          for (const { value, expression } of candidates) {
            if (Math.abs(value - TARGET) < EPSILON) {
              solutions.add(expression);
            }
          }
        }
      }
    }
  }

  return [...solutions];
}

// ─── UI ──────────────────────────────────────────────────────────────────────

function getNumbers() {
  const ids = ['n1', 'n2', 'n3', 'n4'];
  const nums = ids.map(id => {
    const val = document.getElementById(id).value.trim();
    return val === '' ? null : parseFloat(val);
  });
  return nums;
}

function solve() {
  const nums = getNumbers();

  // Validate all four inputs are filled in
  if (nums.some(n => n === null || isNaN(n))) {
    showError('Please fill in all four numbers.');
    return;
  }

  const resultCard = document.getElementById('result-card');
  const loader = document.getElementById('loader');
  resultCard.style.display = 'none';
  loader.classList.add('active');

  // Small timeout so the loader renders before the computation begins
  setTimeout(() => {
    const solutions = findSolutions(nums);
    loader.classList.remove('active');
    displayResults(solutions);
  }, 30);
}

function displayResults(solutions) {
  const resultCard = document.getElementById('result-card');
  const statusEl = document.getElementById('result-status');
  const listEl = document.getElementById('solution-list');
  const moreEl = document.getElementById('more-count');

  listEl.innerHTML = '';
  moreEl.textContent = '';

  if (solutions.length === 0) {
    statusEl.textContent = 'No solution exists.';
    statusEl.className = 'result-status failure';
  } else {
    statusEl.textContent = `${solutions.length} solution${solutions.length > 1 ? 's' : ''} found!`;
    statusEl.className = 'result-status success';

    solutions.forEach((sol, i) => {
      const li = document.createElement('li');
      li.textContent = sol + ' = 24';
      li.style.animationDelay = `${i * 0.05}s`;
      listEl.appendChild(li);
    });
  }

  resultCard.style.display = 'block';
}

function showError(msg) {
  const resultCard = document.getElementById('result-card');
  const statusEl = document.getElementById('result-status');
  const listEl = document.getElementById('solution-list');
  const moreEl = document.getElementById('more-count');

  listEl.innerHTML = '';
  moreEl.textContent = '';
  statusEl.textContent = msg;
  statusEl.className = 'result-status failure';
  resultCard.style.display = 'block';
}

function randomNumbers() {
  const ids = ['n1', 'n2', 'n3', 'n4'];
  ids.forEach(id => {
    document.getElementById(id).value = Math.floor(Math.random() * 13) + 1;
  });
  document.getElementById('result-card').style.display = 'none';
}

// Allow pressing Enter in any input to trigger solve
document.querySelectorAll('.num-input').forEach(input => {
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') solve();
  });
});
