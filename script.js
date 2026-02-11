// Global state
let allTools = [];
let currentSearchTerm = '';
let selectedCategory = null;

// DOM elements
const searchInput = document.getElementById('searchInput');
const clearButton = document.getElementById('clearButton');
const searchStats = document.getElementById('searchStats');
const categoryFilters = document.getElementById('categoryFilters');
const resultsDiv = document.getElementById('results');
const loadingState = document.getElementById('loadingState');

// Debounce function for search optimization
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Show loading state
function showLoading() {
  loadingState.classList.add('active');
  resultsDiv.style.display = 'none';
}

// Hide loading state
function hideLoading() {
  loadingState.classList.remove('active');
  resultsDiv.style.display = 'grid';
}

// Fetch the markdown file from the GitHub repository
showLoading();

fetch('https://cdn.jsdelivr.net/gh/Astrosp/Awesome-OSINT-For-Everything/README.md')
  .then(response => {
    if (!response.ok) {
      throw new Error('Failed to fetch the markdown file');
    }
    return response.text();
  })
  .then(text => {
    allTools = parseMarkdown(text);
    hideLoading();
    displayResults(allTools);
    updateSearchStats(allTools.length, allTools.length);
    createCategoryFilters(allTools);
    setupEventListeners();
  })
  .catch(error => {
    console.error('Error:', error);
    hideLoading();
    resultsDiv.innerHTML = `
      <div class="no-results">
        <div class="no-results-icon">⚠️</div>
        <h3>Error Loading Tools</h3>
        <p>Unable to fetch OSINT tools. Please check your connection and try again later.</p>
      </div>
    `;
  });

// Function to parse the markdown file
function parseMarkdown(text) {
  const lines = text.split('\n');
  let currentCategory = '';
  const tools = [];

  lines.forEach(line => {
    line = line.trim();
    // Check for category headers (##)
    if (line.startsWith('## ')) {
      currentCategory = line.substring(3).trim();
    }
    // Check for tool entries (bullet points)
    else if (line.startsWith('- ')) {
      const match = line.match(/-\s*\[(.*?)\]\((.*?)\)\s*-\s*(.*)/);
      if (match) {
        const tool = {
          name: match[1],
          link: match[2],
          description: match[3],
          category: currentCategory
        };
        tools.push(tool);
      }
    }
  });
  return tools;
}

// Create category filter chips
function createCategoryFilters(tools) {
  const categories = [...new Set(tools.map(tool => tool.category))].filter(cat => cat);

  if (categories.length === 0) return;

  // Add "All" chip
  const allChip = document.createElement('button');
  allChip.className = 'category-chip active';
  allChip.textContent = 'All';
  allChip.setAttribute('data-category', 'all');
  categoryFilters.appendChild(allChip);

  // Add category chips
  categories.forEach(category => {
    const chip = document.createElement('button');
    chip.className = 'category-chip';
    chip.textContent = category;
    chip.setAttribute('data-category', category);
    categoryFilters.appendChild(chip);
  });

  // Add click event listeners to chips
  categoryFilters.addEventListener('click', (e) => {
    if (e.target.classList.contains('category-chip')) {
      // Remove active class from all chips
      document.querySelectorAll('.category-chip').forEach(chip => {
        chip.classList.remove('active');
      });

      // Add active class to clicked chip
      e.target.classList.add('active');

      // Update selected category
      const category = e.target.getAttribute('data-category');
      selectedCategory = category === 'all' ? null : category;

      // Apply filters
      performSearch();
    }
  });
}

// Function to search tools based on the search term and category
function searchTools(searchTerm, tools, category) {
  let results = tools;

  // Filter by category if selected
  if (category) {
    results = results.filter(tool => tool.category === category);
  }

  // Filter by search term
  if (searchTerm) {
    searchTerm = searchTerm.toLowerCase();
    results = results.filter(tool =>
      tool.name.toLowerCase().includes(searchTerm) ||
      tool.description.toLowerCase().includes(searchTerm) ||
      tool.category.toLowerCase().includes(searchTerm)
    );
  }

  return results;
}

// Perform search with current filters
function performSearch() {
  currentSearchTerm = searchInput.value.trim();
  const results = searchTools(currentSearchTerm, allTools, selectedCategory);
  displayResults(results);
  updateSearchStats(results.length, allTools.length);
}

// Debounced search function
const debouncedSearch = debounce(performSearch, 300);

// Update search statistics
function updateSearchStats(resultCount, totalCount) {
  if (currentSearchTerm || selectedCategory) {
    searchStats.textContent = `Showing ${resultCount} of ${totalCount} tools`;
  } else {
    searchStats.textContent = `${totalCount} tools available`;
  }
}

// Function to display search results
function displayResults(results) {
  resultsDiv.innerHTML = '';

  if (results.length === 0) {
    resultsDiv.innerHTML = `
      <div class="no-results">
        <div class="no-results-icon">🔍</div>
        <h3>No Results Found</h3>
        <p>Try adjusting your search terms or filters</p>
      </div>
    `;
    return;
  }

  // Add stagger animation delay to cards
  results.forEach((tool, index) => {
    const toolDiv = document.createElement('div');
    toolDiv.className = 'tool';
    toolDiv.style.animationDelay = `${Math.min(index * 0.05, 1)}s`;
    toolDiv.innerHTML = `
      <h3><a href="${escapeHtml(tool.link)}" target="_blank" rel="noopener noreferrer">${escapeHtml(tool.name)}</a></h3>
      <p class="tool-description">${escapeHtml(tool.description)}</p>
      <span class="category-badge">${escapeHtml(tool.category)}</span>
    `;
    resultsDiv.appendChild(toolDiv);
  });
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// Setup event listeners
function setupEventListeners() {
  // Real-time search with debouncing
  searchInput.addEventListener('input', () => {
    // Show/hide clear button
    if (searchInput.value) {
      clearButton.style.display = 'flex';
    } else {
      clearButton.style.display = 'none';
    }

    debouncedSearch();
  });

  // Search on Enter key press
  searchInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      performSearch();
    }
  });

  // Clear button functionality
  clearButton.addEventListener('click', () => {
    searchInput.value = '';
    clearButton.style.display = 'none';
    searchInput.focus();
    performSearch();
  });

  // Focus search input on "/" key press
  document.addEventListener('keydown', (event) => {
    if (event.key === '/' && document.activeElement !== searchInput) {
      event.preventDefault();
      searchInput.focus();
    }
  });
}
