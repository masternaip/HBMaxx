const API_KEY = '7e863169c39e42ac68d117c538af97fc'; // <<< IMPORTANT: Replace with YOUR TMDB API Key!
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_URL = 'https://image.tmdb.org/t/p/w500';
const VIDEASY_BASE_URL = 'https://player.videasy.net/'; // Your preferred embed server
const INTERSTITIAL_URL = 'https://doodpl.site/uwzgd'; // The URL for the first click redirection

// --- DOM Elements for newpage.html ---
const pageTitleElement = document.getElementById('page-title');
const detailsVideoIframe = document.getElementById('details-video-iframe');
const detailsPoster = document.getElementById('details-poster');
const detailsTitleElement = document.getElementById('details-title');
const detailsRatingElement = document.getElementById('details-rating');
const detailsOverview = document.getElementById('details-overview');
const detailsGenres = document.getElementById('details-genres');
const mediafireDownloadButton = document.getElementById('mediafire-download-button');
const addToListButton = document.getElementById('add-to-list-button'); // NEW: Add to List button


// --- DOM Elements for Search Modal ---
const searchModal = document.getElementById('search-modal');
const searchModalInput = document.getElementById('search-modal-input');
const searchResultsContainer = document.getElementById('search-results');
const newpageSearchButton = document.getElementById('search-button-newpage');

// My List array - loaded from localStorage
let myList = JSON.parse(localStorage.getItem('myList')) || [];

let actualMediafireLink = 'https://www.mediafire.com/file/example_download_link'; // !!! IMPORTANT: Replace with your actual MediaFire link or logic to get it !!!

// --- Helper to get URL parameters ---
function getUrlParameter(name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    var results = regex.exec(location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}

// --- Data Fetching ---
async function fetchItemDetails(id, type) {
    try {
        const res = await fetch(`${BASE_URL}/${type}/${id}?api_key=${API_KEY}&append_to_response=videos,genres`);
        if (!res.ok) {
            throw new Error(`Error fetching details for ${type} ${id}: ${res.statusText}`);
        }
        return await res.json();
    } catch (error) {
        console.error("Failed to fetch item details:", error);
        return null;
    }
}

// --- Display Details Function ---
async function displayItemDetails() {
    const itemId = getUrlParameter('id');
    const itemType = getUrlParameter('type'); // 'movie' or 'tv'

    if (!itemId || (!itemType || (itemType !== 'movie' && itemType !== 'tv'))) {
        pageTitleElement.textContent = "Error: Item Not Found";
        detailsTitleElement.textContent = "Error: Item ID or type missing.";
        detailsOverview.textContent = "Please return to the home page and select an item.";
        mediafireDownloadButton.style.display = 'none'; // Hide button on error
        if (addToListButton) addToListButton.style.display = 'none'; // Hide add to list button
        return;
    }

    const item = await fetchItemDetails(itemId, itemType);

    if (!item) {
        pageTitleElement.textContent = "Error: Item Not Found";
        detailsTitleElement.textContent = "Error: Could not load item details.";
        detailsOverview.textContent = "The requested movie or TV show could not be found.";
        mediafireDownloadButton.style.display = 'none'; // Hide button on error
        if (addToListButton) addToListButton.style.display = 'none'; // Hide add to list button
        return;
    }

    // Set page title
    pageTitleElement.textContent = item.title || item.name || 'Details';

    // Set poster
    if (item.poster_path) {
        detailsPoster.src = `${IMG_URL}${item.poster_path}`;
        detailsPoster.alt = item.title || item.name;
    } else {
        detailsPoster.style.display = 'none'; // Hide poster if not available
    }

    // Set title, overview, rating
    detailsTitleElement.textContent = item.title || item.name;
    detailsOverview.textContent = item.overview || 'No description available.';

    // Display star rating
    detailsRatingElement.innerHTML = '';
    const ratingStars = Math.round((item.vote_average || 0) / 2);
    for (let i = 0; i < 5; i++) {
        const starIcon = document.createElement('i');
        starIcon.classList.add('fas', 'fa-star');
        if (i < ratingStars) {
            starIcon.style.color = 'var(--gold-rating)';
        } else {
            starIcon.style.color = 'gray';
        }
        detailsRatingElement.appendChild(starIcon);
    }

    // Display genres
    detailsGenres.innerHTML = '';
    if (item.genres && item.genres.length > 0) {
        item.genres.forEach(genre => {
            const span = document.createElement('span');
            span.textContent = genre.name;
            detailsGenres.appendChild(span);
        });
    } else {
        const span = document.createElement('span');
        span.textContent = 'No genres available';
        detailsGenres.appendChild(span);
    }

    // --- Add to List Button Logic (NEW) ---
    if (addToListButton) {
        addToListButton.style.display = 'inline-block'; // Ensure button is visible
        updateMyListButton(item); // Set initial state
        addToListButton.onclick = () => {
            toggleMyList(item); // Toggle and update button
        };
    } else {
        console.warn("Add to List button not found in newpage.html");
    }

    // --- MediaFire Download Button Logic ---
    mediafireDownloadButton.style.display = 'inline-block'; // Ensure button is visible
    
    // Set up the click handler for the MediaFire button
    mediafireDownloadButton.onclick = (event) => {
        event.preventDefault(); // Prevent the default link behavior immediately

        const downloadRedirectKey = `mediafire_redirect_${itemId}_${itemType}`;
        const hasRedirectedForDownload = sessionStorage.getItem(downloadRedirectKey);

        if (hasRedirectedForDownload) {
            sessionStorage.removeItem(downloadRedirectKey); 
            window.open(actualMediafireLink, '_blank');
        } else {
            sessionStorage.setItem(downloadRedirectKey, 'true'); 
            window.open(INTERSTITIAL_URL, '_blank');
        }
    };

    // Load video player
    loadVideoPlayer(item, itemType);
}

function loadVideoPlayer(item, type) {
    let embedURL;
    if (type === "tv") {
        embedURL = `${VIDEASY_BASE_URL}tv/${item.id}/1/1?episodeSelector=true`;
    } else {
        embedURL = `${VIDEASY_BASE_URL}movie/${item.id}`;
    }
    
    detailsVideoIframe.src = embedURL;
    console.log("Attempting to load video from URL:", embedURL);
}


// --- Search Modal Logic ---
function openSearchModal() {
    if (searchModal) {
        searchModal.style.display = 'flex';
        searchModalInput.focus();
        document.body.style.overflow = 'hidden';
    } else {
        console.error("Search modal not found.");
    }
}

function closeSearchModal() {
    if (searchModal) {
        searchModal.style.display = 'none';
        searchResultsContainer.innerHTML = '';
        searchModalInput.value = '';
        document.body.style.overflow = 'auto';
    } else {
        console.error("Search modal not found during close attempt.");
    }
}

async function searchTMDB() {
    const query = searchModalInput.value;
    if (!query.trim()) {
        searchResultsContainer.innerHTML = '';
        return;
    }

    try {
        const res = await fetch(`${BASE_URL}/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(query)}`);
        const data = await res.json();

        searchResultsContainer.innerHTML = '';
        data.results.forEach(item => {
            if (!item.poster_path || (item.media_type !== 'movie' && item.media_type !== 'tv')) return;
            
            const img = document.createElement('img');
            img.src = `${IMG_URL}${item.poster_path}`;
            img.alt = item.title || item.name;
            img.loading = "lazy";
            img.onclick = (event) => {
                showDetailsFromSearch(item, event, true); 
            };
            searchResultsContainer.appendChild(img);
        });
    } catch (error) {
        console.error("Error during search:", error);
        searchResultsContainer.innerHTML = '<p style="color: #aaa;">Failed to load search results.</p>';
    }
}

function showDetailsFromSearch(item, event = null, fromSearchModal = false) {
    if (event) {
        event.preventDefault();
    }

    const type = item.first_air_date ? "tv" : "movie";
    const itemId = item.id;
    const itemType = type;

    const interstitialRedirectKey = `interstitial_redirect_${itemId}_${itemType}`;
    const hasRedirected = sessionStorage.getItem(interstitialRedirectKey);

    if (hasRedirected) {
        sessionStorage.removeItem(interstitialRedirectKey);
        window.open(`newpage.html?id=${itemId}&type=${itemType}`, '_blank');
        if (fromSearchModal) {
            closeSearchModal();
        }
    } else {
        sessionStorage.setItem(interstitialRedirectKey, 'true');
        window.open(INTERSTITIAL_URL, '_blank');
    }
}

// --- My List Logic (Copied from home.js and adapted for newpage.js) ---
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
        console.log(`Removed ${itemToStore.title} from My List`);
    } else {
        myList.push(itemToStore);
        console.log(`Added ${itemToStore.title} to My List`);
    }
    localStorage.setItem('myList', JSON.stringify(myList));
    // Update button state immediately
    updateMyListButton(item);
}

function updateMyListButton(item) {
    if (!addToListButton) return; // Ensure button exists

    const type = item.first_air_date ? 'tv' : 'movie';
    const isInList = myList.some(i => i.id === item.id && i.type === type);

    if (isInList) {
        addToListButton.innerHTML = '<i class="fas fa-check"></i> Added to List';
        addToListButton.classList.add('added'); 
    } else {
        addToListButton.innerHTML = '<i class="fas fa-plus"></i> Add to List';
        addToListButton.classList.remove('added');
    }
}

// --- Initialization & Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
    displayItemDetails();

    // Event listener for search button on newpage.html
    if (newpageSearchButton) {
        newpageSearchButton.addEventListener('click', openSearchModal);
    }

    // Global click listener for closing search modal when clicking outside
    // This is needed because the modal is `position: fixed` and covers the whole screen.
    window.addEventListener('click', (event) => {
        if (event.target == searchModal) {
            closeSearchModal();
        }
    });

    // Header Navigation for newpage.html (Navigates to index.html in current tab)
    document.getElementById('logo-link').addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = 'index.html'; 
    });

    document.getElementById('home-link').addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = 'index.html'; 
    });

    document.getElementById('my-list-link').addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = 'index.html#my-list-section';
    });
});

// --- New code for shuffling iframe content ---
const urls = [
    "https://doodpl.site/Gg7vt",
    "https://doodpl.site/UJ5qN",
    "https://www.profitableratecpm.com/tiwyre78?key=626d7b48fb0488d017e3fdffa3cb1916",
    "https://www.profitableratecpm.com/tbiavdrg6?key=775d00bb96808047c2a65d8a71b7cdf2",
    "https://doodpl.site/UJ5qN"
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
