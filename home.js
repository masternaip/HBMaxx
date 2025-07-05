const API_KEY = '7e863169c39e42ac68d117c538af97fc'; // <<< IMPORTANT: Replace with YOUR TMDB API Key!
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_URL = 'https://image.tmdb.org/t/p/w500'; // Standard size for list images
const BANNER_IMG_URL = 'https://image.tmdb.org/t/p/original'; // Large size for banner
const VIDEASY_BASE_URL = 'https://player.videasy.net/'; // Your preferred embed server
const INTERSTITIAL_URL = 'https://doodpl.site/uwzgd'; // The URL for the first click redirection
const CHAT_APP_URL = 'https://modalchatroom.netlify.app/?openChat=true'; // Added the parameter!
chatModalIframe.src = CHAT_APP_URL;

let currentItem;
let bannerItems = [];
let currentBannerIndex = 0;
let myList = JSON.parse(localStorage.getItem('myList')) || [];

// --- DOM Elements for Search Modal ---
const searchModal = document.getElementById('search-modal');
const searchModalInput = document.getElementById('search-modal-input');
const searchResultsContainer = document.getElementById('search-results');

// --- Pre-load placeholders for lists ---
document.getElementById('movies-list').innerHTML = '<p style="text-align: center; color: #aaa;">Loading movies...</p>';
document.getElementById('tvshows-list').innerHTML = '<p style="text-align: center; color: #aaa;">Loading TV shows...</p>';
document.getElementById('anime-list').innerHTML = '<p style="text-align: center; color: #aaa;">Loading anime...</p>';
document.getElementById('netflix-movies-list').innerHTML = '<p style="text-align: center; color: #aaa;">Loading Netflix originals...</p>';
document.getElementById('tagalog-movies-list').innerHTML = '<p style="text-align: center; color: #aaa;">Loading Tagalog movies...</p>';


// --- Data Fetching Functions ---
async function fetchData(url) {
    try {
        const res = await fetch(url);
        if (!res.ok) {
            throw new Error(`Error fetching data from ${url}: ${res.statusText}`);
        }
        return await res.json();
    } catch (error) {
        console.error("Failed to fetch data:", error);
        return { results: [] };
    }
}

async function fetchTrending(type) {
    return (await fetchData(`${BASE_URL}/trending/${type}/week?api_key=${API_KEY}`)).results;
}

async function fetchTrendingNetflix() {
    return (await fetchData(`${BASE_URL}/discover/movie?api_key=${API_KEY}&with_networks=213&sort_by=popularity.desc`)).results;
}

async function fetchTrendingTagalog() {
    return (await fetchData(`${BASE_URL}/discover/movie?api_key=${API_KEY}&with_original_language=tl&sort_by=popularity.desc`)).results;
}

async function fetchTrendingAnime() {
    let allResults = [];
    // Fetching more pages for more anime to ensure a decent list size
    for (let page = 1; page <= 3; page++) {
        const data = await fetchData(`${BASE_URL}/discover/tv?api_key=${API_KEY}&with_genres=16&with_keywords=210024|287501&sort_by=popularity.desc&page=${page}`);
        allResults = allResults.concat(data.results);
    }
    return allResults;
}

async function fetchItemById(id, type) {
    try {
        const res = await fetch(`${BASE_URL}/${type}/${id}?api_key=${API_KEY}`);
        if (!res.ok) {
            console.error(`Error fetching item ${id} of type ${type}: ${res.statusText}`);
            return null;
        }
        return await res.json();
    } catch (error) {
        console.error(`Network error fetching item ${id} of type ${type}:`, error);
        return null;
    }
}

// --- Display Functions ---

function displayBanner() {
    if (bannerItems.length === 0) {
        document.getElementById('banner-title').textContent = "Content Loading...";
        document.getElementById('banner').style.backgroundImage = 'none';
        return;
    }
    const item = bannerItems[currentBannerIndex];
    document.getElementById('banner').style.backgroundImage = `url(${BANNER_IMG_URL}${item.backdrop_path})`;
    document.getElementById('banner-title').textContent = item.title || item.name;

    document.getElementById('banner-play-button').onclick = () => showDetails(item);
}

function nextBanner() {
    currentBannerIndex = (currentBannerIndex + 1) % bannerItems.length;
    displayBanner();
}

function prevBanner() {
    currentBannerIndex = (currentBannerIndex - 1 + bannerItems.length) % bannerItems.length;
    displayBanner();
}

function displayList(items, containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = ''; // Clear loading message/previous content
    if (!items || items.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #aaa;">No content available.</p>';
        return;
    }

    items.forEach(item => {
        if (!item.poster_path) return;
        const img = document.createElement('img');
        img.src = `${IMG_URL}${item.poster_path}`;
        img.alt = item.title || item.name;
        img.loading = "lazy"; // Add lazy loading attribute
        img.onclick = (event) => {
             // Pass the event object to prevent default behavior if needed
            showDetails(item, event);
        };
        container.appendChild(img);
    });
}

// --- Movie Details Redirection (MODIFIED for two-click and new tab, including search modal behavior) ---
function showDetails(item, event = null, fromSearchModal = false) {
    // Prevent default click behavior if an event is provided, to ensure our JS handles the redirect
    if (event) {
        event.preventDefault();
    }

    const type = item.first_air_date ? "tv" : "movie";
    const itemId = item.id;
    const itemType = type;

    // Use sessionStorage to track the first click for this item within the session
    const interstitialRedirectKey = `interstitial_redirect_${itemId}_${itemType}`;
    const hasRedirected = sessionStorage.getItem(interstitialRedirectKey);

    if (hasRedirected) {
        // This is the "second click" (or subsequent) for this item in this session
        sessionStorage.removeItem(interstitialRedirectKey); // Clear the flag
        // Open newpage.html in a new tab
        window.open(`newpage.html?id=${itemId}&type=${itemType}`, '_blank');
        if (fromSearchModal) { // Close modal only on second click if from search
            closeSearchModal();
        }
    } else {
        // This is the "first click" for this item in this session
        sessionStorage.setItem(interstitialRedirectKey, 'true'); // Set the flag
        // Open the interstitial URL in a NEW TAB, keeping the current page in position
        window.open(INTERSTITIAL_URL, '_blank');
        // Do NOT close modal here if from search, as per your request "search result will stay remain"
    }
}


// --- Search Modal Logic ---

function openSearchModal() {
    searchModal.style.display = 'flex';
    searchModalInput.focus();
    document.body.style.overflow = 'hidden';
}

function closeSearchModal() {
    searchModal.style.display = 'none';
    searchResultsContainer.innerHTML = '';
    searchModalInput.value = '';
    document.body.style.overflow = 'auto';
}

async function searchTMDB() {
    const query = searchModalInput.value;
    if (!query.trim()) {
        searchResultsContainer.innerHTML = '';
        return;
    }

    const res = await fetch(`${BASE_URL}/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(query)}`);
    const data = await res.json();

    searchResultsContainer.innerHTML = '';
    data.results.forEach(item => {
        if (!item.poster_path || (item.media_type !== 'movie' && item.media_type !== 'tv')) return;
        
        const img = document.createElement('img');
        img.src = `${IMG_URL}${item.poster_path}`;
        img.alt = item.title || item.name;
        img.loading = "lazy"; // Add lazy loading attribute
        img.onclick = (event) => {
            // Pass 'true' to indicate this click came from the search modal
            showDetails(item, event, true);
        };
        searchResultsContainer.appendChild(img);
    });
}

// --- My List Logic ---
function toggleMyList(item) {
    const type = item.first_air_date ? 'tv' : 'movie';
    const itemToStore = {
        id: item.id,
        type: type,
        title: item.title || item.name,
        poster_path: item.poster_path,
        backdrop_path: item.backdrop_path
    };

    const index = myList.findIndex(i => i.id === itemToStore.id && i.type === itemToStore.type);
    if (index > -1) {
        myList.splice(index, 1);
    } else {
        myList.push(itemToStore);
    }
    localStorage.setItem('myList', JSON.stringify(myList));
    // If My List is currently displayed, refresh it
    if (document.getElementById('my-list-section').style.display !== 'none') {
        displayMyList();
    }
}

async function displayMyList() {
    const container = document.getElementById('my-list-container');
    container.innerHTML = '<p style="text-align: center; color: #aaa;">Loading your list...</p>';
    
    if (myList.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #aaa;">Your list is empty. Add some movies or TV shows!</p>';
        return;
    }

    const validMyListItems = myList.filter(item => item.id && item.type && item.poster_path);

    if (validMyListItems.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #aaa;">Your list is empty. Add some movies or TV shows!</p>';
        return;
    }

    const fetchPromises = validMyListItems.map(item => fetchItemById(item.id, item.type));
    const fetchedItems = await Promise.all(fetchPromises);
    
    const finalItemsToDisplay = fetchedItems.filter(item => item && item.poster_path);

    container.innerHTML = '';
    if (finalItemsToDisplay.length === 0 && validMyListItems.length > 0) {
        container.innerHTML = '<p style="text-align: center; color: #aaa;">Could not load items from your list. Some items may have been removed or are unavailable.</p>';
    } else if (finalItemsToDisplay.length === 0) {
         container.innerHTML = '<p style="text-align: center; color: #aaa;">Your list is empty. Add some movies or TV shows!</p>';
    } else {
        finalItemsToDisplay.forEach(item => {
            const img = document.createElement('img');
            img.src = `${IMG_URL}${item.poster_path}`;
            img.alt = item.title || item.name;
            img.loading = "lazy"; // Add lazy loading attribute
            img.onclick = (event) => showDetails(item, event); // showDetails is called without fromSearchModal flag
            container.appendChild(img);
        });
    }
}


// --- Page Visibility & Active Navigation (Home/My List Tab functionality) ---
function setActiveNavLink(activeId) {
    document.querySelectorAll('nav a').forEach(link => {
        link.classList.remove('active-nav');
    });
    if (activeId) {
        document.getElementById(activeId).classList.add('active-nav');
    }
}

function showHomePage() {
    document.getElementById('banner').style.display = 'flex';
    document.querySelectorAll('#main-content section').forEach(s => {
        if(s.id !== 'my-list-section') {
            s.style.display = 'block';
        } else {
            s.style.display = 'none';
        }
    });
    setActiveNavLink('home-link'); // Set 'Home' as active
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function showMyListPage() {
    document.getElementById('banner').style.display = 'none';
    document.querySelectorAll('#main-content section').forEach(s => {
        if(s.id === 'my-list-section') {
            s.style.display = 'block';
        } else {
            s.style.display = 'none';
        }
    });
    await displayMyList();
    setActiveNavLink('my-list-link'); // Set 'My List' as active
    window.scrollTo({ top: 0, behavior: 'smooth' });
}


// --- Initialization ---
async function init() {
    // Fetch banner items immediately
    const movies = await fetchTrending('movie');
    bannerItems = movies.filter(m => m.backdrop_path);
    displayBanner();
    setInterval(nextBanner, 7000);

    // Display the first few lists immediately as they are likely above the fold
    displayList(movies, 'movies-list'); // Trending Movies
    displayList(await fetchTrending('tv'), 'tvshows-list'); // Trending TV Shows

    // Use Intersection Observer for lists likely to be below the fold
    const observerOptions = {
        root: null, // viewport
        rootMargin: '0px',
        threshold: 0.1 // Trigger when 10% of the target is visible
    };

    // Corrected target for IntersectionObserver to observe the entire section
    const sectionsToLazyLoad = [
        { sectionId: 'trending-anime-section', listId: 'anime-list', fetchFunc: fetchTrendingAnime, fetched: false },
        { sectionId: 'netflix-originals-section', listId: 'netflix-movies-list', fetchFunc: fetchTrendingNetflix, fetched: false },
        { sectionId: 'tagalog-movies-section', listId: 'tagalog-movies-list', fetchFunc: fetchTrendingTagalog, fetched: false }
    ];

    const lazyLoadObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const sectionData = sectionsToLazyLoad.find(s => s.sectionId === entry.target.id);
                if (sectionData && !sectionData.fetched) {
                    sectionData.fetchFunc().then(items => {
                        displayList(items, sectionData.listId);
                        sectionData.fetched = true; // Mark as fetched
                    }).catch(error => {
                        console.error(`Error loading section ${sectionData.sectionId}:`, error);
                        document.getElementById(sectionData.listId).innerHTML = '<p style="text-align: center; color: #aaa;">Failed to load content.</p>';
                    });
                    observer.unobserve(entry.target); // Stop observing once loaded
                }
            }
        });
    }, observerOptions);

    sectionsToLazyLoad.forEach(section => {
        const targetElement = document.getElementById(section.sectionId); // Observe the section
        if (targetElement) {
            lazyLoadObserver.observe(targetElement);
        }
    });
    
    // Event listeners for internal header navigation
    document.getElementById('my-list-link').addEventListener('click', (e) => { e.preventDefault(); showMyListPage(); });
    document.getElementById('home-link').addEventListener('click', (e) => { e.preventDefault(); showHomePage(); });
    document.getElementById('logo-link').addEventListener('click', (e) => { e.preventDefault(); showHomePage(); });


    // Ensure search modal is hidden on load
    searchModal.style.display = 'none';

    // Set initial page view to Home or My List based on URL hash
    if (window.location.hash === '#my-list-section') {
        await showMyListPage();
    } else {
        showHomePage();
    }
}

// --- Global Event Listeners ---
window.onclick = function(event) {
    if (event.target == searchModal) {
        closeSearchModal();
    }
}

document.addEventListener('DOMContentLoaded', init);

// --- New code for shuffling iframe content ---
const urls = [
    ""
];

let currentIndex = 0;
const iframe = document.getElementById('contentFrame');

// Function to load content into the iframe
function loadNextContent() {
    // Check if the iframe element exists before trying to set its src
    if (iframe) {
        const currentContent = urls[currentIndex];
        iframe.src = currentContent; // Set src for external URLs
        currentIndex = (currentIndex + 1) % urls.length; // Cycle through URLs
    } else {
        console.error("Iframe with ID 'contentFrame' not found.");
    }
}

// Load the first content immediately
// Ensure this runs after the DOM is fully loaded, which `DOMContentLoaded` already handles for `init`
// If this script is loaded `defer` or at the end of body, it should be fine.
loadNextContent();

// Set interval to shuffle every 10 seconds
setInterval(loadNextContent, 10000); // 10000 milliseconds = 10 seconds

// Watch History
function addToWatchHistory(item) {
    let history = JSON.parse(localStorage.getItem('watchHistory')) || []; // 
    // Ensure item has necessary properties
    const historyItem = {
        id: item.id, // 
        title: item.title || item.name, // 
        poster_path: item.poster_path, // 
        media_type: item.media_type || (item.title ? 'movie' : 'tv'), // 
        timestamp: new Date().toISOString() // 
    };

    // Remove if already exists to move it to the top/most recent
    history = history.filter(h => !(h.id === historyItem.id && h.media_type === historyItem.media_type)); // 

    history.unshift(historyItem); // Add to the beginning // 

    // Keep history to a reasonable size, e.g., 50 items
    localStorage.setItem('watchHistory', JSON.stringify(history.slice(0, 50))); // 
    displayWatchHistory(); // Update the UI // 
}

function displayWatchHistory() {
    const history = JSON.parse(localStorage.getItem('watchHistory')) || []; // 
    const container = document.getElementById('watch-history-list'); // 
    if (!container) return; // 

    if (history.length === 0) {
        container.innerHTML = '<p class="search-placeholder">No watch history yet.</p>'; // 
        return; // 
    }

    container.innerHTML = history.map(item => `
        <div class="movie-item" onclick="handleMovieClick(${JSON.stringify(item).replace(/"/g, '\'')})">
            <img src="${item.poster_path ? IMG_URL + item.poster_path : 'https://via.placeholder.com/200x300?text=No+Image'}"
                 alt="${item.title || item.name}" loading="lazy">
            <div class="movie-overlay">
                <div class="movie-title">${item.title || item.name}</div>
            </div>
        </div>
    `).join(''); // 
}
