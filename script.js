// Fallback top OSINT tools in case CDN/GitHub is offline or blocked
const FALLBACK_TOOLS = [
  {
    name: "Shodan",
    link: "https://www.shodan.io",
    description: "Search engine for Internet-connected devices, industrial control systems, cameras, and open ports.",
    category: "Search Engines"
  },
  {
    name: "Sherlock",
    link: "https://github.com/sherlock-project/sherlock",
    description: "Hunt down social media accounts by username across 400+ social networks and forums simultaneously.",
    category: "Social Media"
  },
  {
    name: "Maltego",
    link: "https://www.maltego.com",
    description: "Interactive data mining and visualization tool that renders directed graphs for link analysis and threat recon.",
    category: "Reconnaissance & Mapping"
  },
  {
    name: "SpiderFoot",
    link: "https://github.com/smicallef/spiderfoot",
    description: "Automated OSINT reconnaissance engine integrating 100+ public data sources for threat scanning and IP analysis.",
    category: "Reconnaissance & Mapping"
  },
  {
    name: "VirusTotal",
    link: "https://www.virustotal.com",
    description: "Analyze suspicious files, domains, IPs, and URLs to detect malware and breach indicators from 70+ antivirus scanners.",
    category: "Threat Intelligence"
  },
  {
    name: "theHarvester",
    link: "https://github.com/laramies/theHarvester",
    description: "Gather emails, subdomains, hosts, employee names, and open ports using search engine dorks and public sources.",
    category: "Threat Intelligence"
  },
  {
    name: "Censys",
    link: "https://censys.io",
    description: "Attack surface management and search engine for discovering internet-wide devices, certificates, and exposures.",
    category: "Search Engines"
  },
  {
    name: "OSINT Framework",
    link: "https://osintframework.com",
    description: "Comprehensive web-based directory of OSINT tools organized into tree-view categories for threat intelligence.",
    category: "Frameworks & Directories"
  },
  {
    name: "Wayback Machine",
    link: "https://archive.org/web",
    description: "Digital archive of the World Wide Web allowing historical inspection of website versions and deleted pages.",
    category: "Archiving & History"
  },
  {
    name: "Bellingcat Toolkit",
    link: "https://www.bellingcat.com/resources/",
    description: "Guides, open source investigative datasets, satellite imagery tools, and verification methodologies.",
    category: "Investigative Journalism"
  },
  {
    name: "DeHashed",
    link: "https://www.dehashed.com",
    description: "Asset search engine to help prevent data breaches and analyze compromised credentials, usernames, and emails.",
    category: "Credentials & Breaches"
  },
  {
    name: "IntelX",
    link: "https://intelx.io",
    description: "Search engine and data archive looking through public archives, darknet, and file shares for indicators.",
    category: "Threat Intelligence"
  }
];

// App State
let allTools = [];
let activeCategory = 'all';
let searchQuery = '';
let searchDebounceTimer = null;
let toastTimeout = null;

// DOM Elements
const searchInput = document.getElementById('searchInput');
const clearSearchBtn = document.getElementById('clearSearchBtn');
const categoryFilters = document.getElementById('categoryFilters');
const resultsDiv = document.getElementById('results');
const resultsStats = document.getElementById('resultsStats');
const emptyState = document.getElementById('emptyState');
const resetFiltersBtn = document.getElementById('resetFiltersBtn');
const totalToolsCount = document.getElementById('totalToolsCount');
const totalCategoriesCount = document.getElementById('totalCategoriesCount');
const allCount = document.getElementById('allCount');
const toast = document.getElementById('toast');
const toastMsg = document.getElementById('toastMsg');

// Show initial loading skeletons
renderSkeletons(8);

// Fetch tools markdown - tries Awesome-osint-list first, then falls back to Awesome-OSINT-For-Everything
const REPO_ENDPOINTS = [
  'https://cdn.jsdelivr.net/gh/Astrosp/Awesome-osint-list/README.md',
  'https://cdn.jsdelivr.net/gh/Astrosp/Awesome-OSINT-For-Everything/README.md'
];

async function fetchAwesomeList() {
  for (const endpoint of REPO_ENDPOINTS) {
    try {
      const response = await fetch(endpoint);
      if (response.ok) {
        const markdownText = await response.text();
        const parsedTools = parseMarkdown(markdownText);
        if (parsedTools && parsedTools.length > 0) {
          initializeWithTools(parsedTools);
          return;
        }
      }
    } catch (e) {
      console.warn(`Could not load from ${endpoint}:`, e);
    }
  }

  // If remote requests fail (e.g. offline / rate-limited), initialize with curated fallback tools
  console.warn('Network endpoints unreachable, activating fallback tools dataset.');
  initializeWithTools(FALLBACK_TOOLS);
}

fetchAwesomeList();

function initializeWithTools(tools) {
  allTools = tools;

  // Extract categories
  const categories = extractCategories(allTools);

  // Update header metrics
  totalToolsCount.textContent = allTools.length;
  totalCategoriesCount.textContent = categories.length;
  allCount.textContent = allTools.length;

  buildCategoryChips(categories);

  setupEventListeners();

  filterAndRender();
}

function parseMarkdown(text) {
  const lines = text.split('\n');
  let currentCategory = 'General Recon';
  const tools = [];

  lines.forEach(line => {
    line = line.trim();
    if (line.startsWith('## ')) {
      const cat = line.substring(3).trim();
      if (cat && !cat.toLowerCase().includes('contributing') && !cat.toLowerCase().includes('license')) {
        currentCategory = cat;
      }
    }
    else if (line.startsWith('- ')) {
      const match = line.match(/-\s*\[(.*?)\]\((.*?)\)\s*-\s*(.*)/);
      if (match) {
        const name = match[1].trim();
        const link = match[2].trim();
        const description = match[3].trim();

        if (link && !link.startsWith('#') && name) {
          tools.push({
            name: name,
            link: link,
            description: description || 'Open-source intelligence tool and resource.',
            category: currentCategory
          });
        }
      }
    }
  });

  return tools;
}

function extractCategories(tools) {
  const countMap = {};
  tools.forEach(tool => {
    countMap[tool.category] = (countMap[tool.category] || 0) + 1;
  });

  return Object.keys(countMap)
    .sort()
    .map(name => ({
      name: name,
      count: countMap[name]
    }));
}

function buildCategoryChips(categories) {
  // Clear any existing except the 'All' button
  const allBtn = categoryFilters.querySelector('[data-category="all"]');
  categoryFilters.innerHTML = '';
  categoryFilters.appendChild(allBtn);

  categories.forEach(cat => {
    const chip = document.createElement('button');
    chip.className = 'cat-chip';
    chip.dataset.category = cat.name;
    chip.innerHTML = `${escapeHtml(cat.name)} <span class="chip-count">${cat.count}</span>`;

    chip.addEventListener('click', () => {
      setCategory(cat.name);
    });

    categoryFilters.appendChild(chip);
  });
}

function setCategory(catName) {
  activeCategory = catName;

  const chips = categoryFilters.querySelectorAll('.cat-chip');
  chips.forEach(chip => {
    if (chip.dataset.category === catName) {
      chip.classList.add('active');
      chip.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    } else {
      chip.classList.remove('active');
    }
  });

  filterAndRender();
}

function setupEventListeners() {
  // Live search input with debounce
  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
      searchQuery = e.target.value.trim();
      toggleClearButton(searchQuery.length > 0);
      filterAndRender();
    }, 150);
  });

  // Clear button click
  clearSearchBtn.addEventListener('click', () => {
    clearSearch();
  });

  resetFiltersBtn.addEventListener('click', () => {
    clearSearch();
    setCategory('all');
  });

  const allBtn = categoryFilters.querySelector('[data-category="all"]');
  if (allBtn) {
    allBtn.addEventListener('click', () => setCategory('all'));
  }

  // Global keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Press '/' to focus search
    if (e.key === '/' && document.activeElement !== searchInput) {
      e.preventDefault();
      searchInput.focus();
      searchInput.select();
    }
    // Press 'Escape' to clear and blur search
    else if (e.key === 'Escape') {
      if (searchQuery || searchInput.value) {
        clearSearch();
      } else {
        searchInput.blur();
      }
    }
  });
}

function clearSearch() {
  searchInput.value = '';
  searchQuery = '';
  toggleClearButton(false);
  searchInput.focus();
  filterAndRender();
}

function toggleClearButton(show) {
  if (show) {
    clearSearchBtn.classList.remove('hidden');
  } else {
    clearSearchBtn.classList.add('hidden');
  }
}

function filterAndRender() {
  const query = searchQuery.toLowerCase();

  const filtered = allTools.filter(tool => {
    // Category match
    const categoryMatch = (activeCategory === 'all') || (tool.category === activeCategory);
    if (!categoryMatch) return false;

    // Search query match
    if (!query) return true;

    return (
      tool.name.toLowerCase().includes(query) ||
      tool.description.toLowerCase().includes(query) ||
      tool.category.toLowerCase().includes(query) ||
      tool.link.toLowerCase().includes(query)
    );
  });

  if (searchQuery || activeCategory !== 'all') {
    resultsStats.textContent = `Showing ${filtered.length} of ${allTools.length} tools`;
  } else {
    resultsStats.textContent = `Showing all ${allTools.length} curated tools`;
  }

  renderTools(filtered, query);
}

function renderTools(tools, query) {
  resultsDiv.innerHTML = '';

  if (tools.length === 0) {
    emptyState.classList.remove('hidden');
    resultsDiv.classList.add('hidden');
    return;
  }

  emptyState.classList.add('hidden');
  resultsDiv.classList.remove('hidden');

  const fragment = document.createDocumentFragment();

  tools.forEach(tool => {
    const card = document.createElement('div');
    card.className = 'tool-card';

    // Extract domain name for badge
    const domain = extractDomain(tool.link);

    // Highlight search match in title and description
    const highlightedName = highlightMatch(tool.name, query);
    const highlightedDesc = highlightMatch(tool.description, query);
    const highlightedCat = highlightMatch(tool.category, query);

    card.innerHTML = `
      <div class="card-top">
        <span class="category-tag" title="${escapeHtml(tool.category)}">${highlightedCat}</span>
        <button class="copy-btn" title="Copy URL to clipboard" data-url="${escapeHtml(tool.link)}">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
          <span>Copy</span>
        </button>
      </div>

      <div class="card-content">
        <a href="${escapeHtml(tool.link)}" target="_blank" rel="noopener noreferrer" class="tool-name-link">
          <span>${highlightedName}</span>
          <svg class="external-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
            <polyline points="15 3 21 3 21 9"></polyline>
            <line x1="10" y1="14" x2="21" y2="3"></line>
          </svg>
        </a>
        <p class="tool-desc">${highlightedDesc}</p>
      </div>

      <div class="card-footer">
        <span class="tool-domain" title="${escapeHtml(tool.link)}">${escapeHtml(domain)}</span>
        <a href="${escapeHtml(tool.link)}" target="_blank" rel="noopener noreferrer" class="tool-open-action">
          Open Tool ↗
        </a>
      </div>
    `;

    const copyBtn = card.querySelector('.copy-btn');
    copyBtn.addEventListener('click', (e) => {
      e.preventDefault();
      copyUrl(tool.link, copyBtn);
    });

    fragment.appendChild(card);
  });

  resultsDiv.appendChild(fragment);
}

function extractDomain(url) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace('www.', '');
  } catch (e) {
    return url.replace(/^https?:\/\//, '').split('/')[0];
  }
}

function highlightMatch(text, query) {
  if (!query || !text) return escapeHtml(text);

  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedQuery})`, 'gi');

  const safeText = escapeHtml(text);
  return safeText.replace(regex, '<mark class="search-highlight">$1</mark>');
}

function copyUrl(url, button) {
  navigator.clipboard.writeText(url)
    .then(() => {
      button.classList.add('copied');
      button.innerHTML = `
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        <span>Copied!</span>
      `;

      showToast(`Copied ${url}`);

      setTimeout(() => {
        button.classList.remove('copied');
        button.innerHTML = `
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
          <span>Copy</span>
        `;
      }, 1800);
    })
    .catch(err => {
      console.error('Failed to copy text: ', err);
    });
}

function showToast(msg) {
  toastMsg.textContent = msg;
  toast.classList.remove('hidden');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.add('hidden');
  }, 2200);
}

function renderSkeletons(count) {
  resultsDiv.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const skel = document.createElement('div');
    skel.className = 'skeleton-card';
    skel.innerHTML = `
      <div class="skeleton-shimmer"></div>
      <div class="skeleton-line skeleton-tag"></div>
      <div class="skeleton-line skeleton-title"></div>
      <div class="skeleton-line skeleton-text"></div>
      <div class="skeleton-line skeleton-text short"></div>
    `;
    resultsDiv.appendChild(skel);
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
