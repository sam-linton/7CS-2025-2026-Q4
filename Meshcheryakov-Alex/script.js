const form = document.getElementById('listingForm');
const listingGrid = document.getElementById('listingGrid');
const listingCount = document.getElementById('listingCount');
const darkModeToggle = document.getElementById('darkModeToggle');
let listings = [];

// Dark mode toggle
darkModeToggle.addEventListener('click', () => {
  document.body.classList.toggle('dark-mode');
  darkModeToggle.textContent = document.body.classList.contains('dark-mode') ? 'Light Mode' : 'Dark Mode';
});

function renderListings() {
  listingGrid.innerHTML = '';
  if (listings.length === 0) {
    listingGrid.innerHTML = '<div class="no-items">No listings available. Add one using the form.</div>';
    listingCount.textContent = 'No listings yet.';
    return;
  }

  listingCount.textContent = `${listings.length} listing${listings.length === 1 ? '' : 's'} active`;
  listings.forEach(listing => {
    const item = document.createElement('article');
    item.className = 'listing-item';
    item.innerHTML = `
      <h3>${listing.name}</h3>
      <p>${listing.description}</p>
      <div class="listing-price">$${listing.price.toLocaleString()}</div>
      <p style="margin-top: 12px; color: #65676b; font-size: 0.92rem;">Category: ${listing.category}</p>
    `;
    listingGrid.appendChild(item);
  });
}

form.addEventListener('submit', event => {
  event.preventDefault();
  const name = form.itemName.value.trim();
  const category = form.category.value;
  const description = form.description.value.trim();
  const price = Number(form.price.value);

  if (!name || !category || !description || Number.isNaN(price) || price < 1 || price > 1000000) {
    return;
  }

  listings.unshift({ name, category, description, price });
  form.reset();
  form.price.value = 100;
  renderListings();
});

renderListings();