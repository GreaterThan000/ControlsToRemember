// scripts/main.js
/*
Connecting a suggestion to an article file
*/
const games = [
    //["Autocomplete suggestion Text","Article Name or file name for the artricle in the articles folder without the file extension"]
    ["Minecraft", "minecraft"],
    ["Fortnite", "fortnite"],
    ["Terraria", "terraria"]
];

/*
This will load a game article based on the "game" parameter in the URL
Example: /index.html?game=minecraft
*/
function page_loaded() {
    //Look in url for game parameter "www.controlbuddies.xyz/index.html?game=minecraft"
    const params = new URLSearchParams(window.location.search); // Get URLSearchParams object from the query string
    const pageParam = params.get('page');
    const gameParam = params.get('game'); // Get the value of 'game' parameter ("minecraft" in example url)

    if (pageParam === 'QuadHelp') {
        const base = (typeof get_base_url === 'function') ? get_base_url().replace(/\/$/, '') : window.location.origin.replace(/\/$/, '');
        window.location.href = base + '/pages/GuideToTheQuadraticFormula.html';
        return;
    }

    if (gameParam) {
        get_article_content(gameParam, document.getElementById("main_content")).then(() => {
            finish_setting_up_page_elements();
        });
    }
    else {
        finish_setting_up_page_elements();
    }

}

//When the browser finishes loading the page, call the page_loaded function
document.addEventListener('DOMContentLoaded', page_loaded);

/*
Adds funtionality to interactive elements
 */
function finish_setting_up_page_elements() {
    setup_accordian_buttons();

    setup_gallery();
}
/*
Makes the thumbnails clickable and displays large pop up when clicked.
*/
function setup_gallery() {
    //Grab elements from page 
    const galleryItems = document.querySelectorAll('.gallery-item');
    const modal = document.getElementById('modal');
    const modalImage = document.getElementById('modal-image');
    const closeModal = document.getElementById('close-modal');

    //For each thumbnail add click event
    galleryItems.forEach(item => {
        item.addEventListener('click', () => {
            const fullSizeImage = item.getAttribute('data-full');
            modalImage.src = fullSizeImage;
            modal.style.display = 'block';
        });
    });

    //Adding the close button click on gallery pop up
    window.addEventListener('click', (event) => {
        if (event.target === modal || event.target == closeModal) {
            modal.style.display = 'none';
        }
    });
}


function get_base_url(){
    let url = "";

    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        url = "http://localhost:3000";    
    }else{
        url = "https://controlbuddy.xyz";
    }
    
    
    return url;
}

/*
Adds inteactivity to the accordian buttons on page
*/
function setup_accordian_buttons() {
    //Get all elements that have accordian-button or videos-button and stored them in an array
    const accordionButtons = document.querySelectorAll('.accordion-button, .videos-button');

    //Will add click events to accordian buttons
    accordionButtons.forEach(button => {
        //add the click event
        button.addEventListener('click', function () {
            // Toggle the active class for the clicked button
            this.classList.toggle('active');

            // Get the associated content div
            const content = this.nextElementSibling;

            // Toggle the display of the content
            if (content.style.display === 'block') {
                content.style.display = 'none';
            } else {
                content.style.display = 'block';
            }

            // Close other accordion panels
            accordionButtons.forEach(btn => {
                if (btn !== this) {
                    btn.classList.remove('active');
                    btn.nextElementSibling.style.display = 'none';
                }
            });
        });


    });
}

/*
Showing suggestions as the user types in  the search bar
*/
function autocompleteBar(input, suggestions) {
    let currentFocus;

    input.addEventListener("input", function () {
        let val = this.value;
        closeAllLists();
        if (!val) return false;
        currentFocus =  0;

        const listContainer = document.createElement("div");
        listContainer.setAttribute("id", this.id + "-autocomplete-list");
        listContainer.setAttribute("class", "autocomplete-items");
        this.parentNode.appendChild(listContainer);

        suggestions.forEach(game => {
            if (game[0].substr(0, val.length).toUpperCase() === val.toUpperCase()) {
                const suggestionItem = document.createElement("div");
                suggestionItem.innerHTML = "<strong>" + game[0].substr(0, val.length) + "</strong>" + game[0].substr(val.length);
                suggestionItem.innerHTML += "<input type='hidden' value='" + game[0] + "'>";

                suggestionItem.addEventListener("click", function () {
                    input.value = this.getElementsByTagName("input")[0].value;
                    closeAllLists();

                    let url = get_base_url();

                    window.location.href = url + '/index.html?game='+game[1];

                });

                listContainer.appendChild(suggestionItem);
            }
        });

    });

    input.addEventListener("keydown", function (e) {
        let x = document.getElementById(this.id + "-autocomplete-list");
        if (x) x = x.getElementsByTagName("div");
        if (e.keyCode === 40) {
            currentFocus++;
            addActive(x);
        } else if (e.keyCode === 38) {
            currentFocus--;
            addActive(x);
        } else if (e.keyCode === 13) {
            e.preventDefault();
            if (currentFocus > -1) {
                if (x) x[currentFocus].click();
            }
        }
    });

    function addActive(items) {
        if (!items) return false;
        removeActive(items);
        if (currentFocus >= items.length) currentFocus = 0;
        if (currentFocus < 0) currentFocus = items.length - 1;
        items[currentFocus].classList.add("autocomplete-active");
    }

    function removeActive(items) {
        for (let i = 0; i < items.length; i++) {
            items[i].classList.remove("autocomplete-active");
        }
    }

    function closeAllLists(elmnt) {
        const items = document.getElementsByClassName("autocomplete-items");
        for (let i = 0; i < items.length; i++) {
            if (elmnt !== items[i] && elmnt !== input) {
                items[i].parentNode.removeChild(items[i]);
            }
        }
    }

    document.addEventListener("click", function (e) {
        closeAllLists(e.target);
    });
}

function autocomplete(inputs, suggestions) {
    for (var i = 0; i < inputs.length; i++) {
        autocompleteBar(inputs[i], suggestions);
    }
}



const searchInput = document.querySelectorAll('.search');
autocomplete(searchInput, games);


// Define the Konami Code sequence
const konamiCode = [
    'ArrowUp', 'ArrowUp', 
    'ArrowDown', 'ArrowDown', 
    'ArrowLeft', 'ArrowRight', 
    'ArrowLeft', 'ArrowRight', 
    'b', 'a'
];

// Variable to keep track of the current position in the code
let currentPosition = 0;
// Timer for reset
let timeout;

// Function to handle keydown events
function onKeyDown(event) {
    // Clear the timeout if a key is pressed
    clearTimeout(timeout);
    
    // Check if the pressed key matches the current position in the Konami Code
    if (event.key === konamiCode[currentPosition]) {
        currentPosition++;
        // Check if the entire code has been entered
        if (currentPosition === konamiCode.length) {
            const base = (typeof get_base_url === 'function') ? get_base_url().replace(/\/$/, '') : window.location.origin.replace(/\/$/, '');
            window.location.href = base + '/pages/GuideToTheQuadraticFormula.html';
            reset();
        } else {
            // Set a timeout to reset if the user doesn't continue within 2 seconds
            timeout = setTimeout(reset, 1000);
        }
    } else {
        reset(); // Reset if the sequence is broken
    }
}

// Function to reset the sequence
function reset() {
    currentPosition = 0;
    clearTimeout(timeout); // Clear the timeout if it exists
}

// Attach the keydown event listener to the document
document.addEventListener('keydown', onKeyDown);
