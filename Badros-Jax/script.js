const form = document.getElementById('psa-form');
const board = document.getElementById('board');
const clearAll = document.getElementById('clear-all');
const storageKey = 'psaAnnouncements';

let announcements = JSON.parse(localStorage.getItem(storageKey)) || [];

function renderAnnouncements() {
  if (announcements.length === 0) {
    board.innerHTML = '<p class="empty">No announcements yet. Add one above to share it here.</p>';
    clearAll.disabled = true;
    return;
  }

  board.innerHTML = announcements
    .map((announcement, index) => {
      const date = new Date(announcement.createdAt);
      return `
        <article class="announcement" data-index="${index}">
          <h3>${announcement.title}</h3>
          <p>${announcement.message}</p>
          <div class="meta-row">
            <span>${date.toLocaleString()}</span>
            <button class="delete-btn" type="button">Delete</button>
          </div>
        </article>
      `;
    })
    .join('');

  clearAll.disabled = false;
}

function saveAnnouncements() {
  localStorage.setItem(storageKey, JSON.stringify(announcements));
  renderAnnouncements();
}

form.addEventListener('submit', event => {
  event.preventDefault();
  const title = document.getElementById('title').value.trim();
  const message = document.getElementById('message').value.trim();

  if (!title || !message) {
    return;
  }

  announcements.unshift({
    title,
    message,
    createdAt: new Date().toISOString(),
  });

  form.reset();
  saveAnnouncements();
});

board.addEventListener('click', event => {
  const deleteButton = event.target.closest('.delete-btn');
  if (!deleteButton) {
    return;
  }

  const announcementElement = deleteButton.closest('.announcement');
  const index = Number(announcementElement.dataset.index);
  announcements.splice(index, 1);
  saveAnnouncements();
});

clearAll.addEventListener('click', () => {
  if (announcements.length === 0) {
    return;
  }

  const confirmed = confirm('Remove all announcements from the board?');
  if (!confirmed) {
    return;
  }

  announcements = [];
  saveAnnouncements();
});

renderAnnouncements();

