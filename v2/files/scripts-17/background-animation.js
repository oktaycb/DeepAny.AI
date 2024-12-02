import { auth, usersRef, paymentsRef } from '../scripts-17/firebase-config.js';

// Function to hide the loading screen
function hideLoadingScreen() {
    const loadingScreen = document.querySelector('.loading-screen');
    if (loadingScreen) 
        loadingScreen.style.display = 'none';
}

// Function to show the loading screen
function showLoadingScreen() {
    const loadingScreen = document.querySelector('.loading-screen');
    if (loadingScreen) 
        loadingScreen.style.display = 'flex';
}

// Ensure the loading screen is shown initially
//showLoadingScreen();
	
// Fallback to hide the loading screen after a timeout
setTimeout(() => {
    hideLoadingScreen();
}, 3000); // Adjust the timeout duration as needed

// Check if the user is authenticated
auth.onAuthStateChanged((user) => {
    if (user) {
        // User is authenticated, fetch the user's document from Firestore
        const userId = user.uid;

        // Fetch the user's document from Firestore
        usersRef.doc(userId).get().then((userDoc) => {
            if (userDoc.exists) {
                // User document exists, hide the loading screen
                hideLoadingScreen();
            } else {
                // User document does not exist, handle it as needed
                console.log('User document does not exist.');
                hideLoadingScreen(); // Hide the loading screen even if the document doesn't exist
            }
        }).catch((error) => {
            // Handle any errors that occur during document retrieval
            console.error('Error fetching user document:', error);
            hideLoadingScreen(); // Hide the loading screen even on error
        });
    } else {
        // User is not authenticated, hide the loading screen
        console.log('User document does not exist.');
		setTimeout(() => {
			hideLoadingScreen();
		}, 175);
    }
});

// Dark & Light toggle
const checkbox = document.querySelector(".day-night input");
const body = document.querySelector("body");

// Load initial state from localStorage
if (localStorage.getItem("lightMode") === "enabled") {
  body.classList.add("light");
  checkbox.checked = true;
} else {
  body.classList.remove("light");
  checkbox.checked = false;
}

        // JavaScript to toggle the mobile menu
        const menuToggle = document.querySelector(".menu-toggle");
        const navLinks = document.getElementById("nav-links");

        menuToggle.addEventListener("click", function () {
            navLinks.classList.toggle("show");
            this.classList.toggle("active");
        });
	
checkbox.addEventListener("change", () => {
  body.classList.add("toggle");
  setTimeout(() => {
    body.classList.toggle("light");
    // Save state to localStorage
    if (body.classList.contains("light")) {
      localStorage.setItem("lightMode", "enabled");
    } else {
      localStorage.setItem("lightMode", "disabled");
    }
    
    // Save checkbox state to localStorage
    if (checkbox.checked) {
      localStorage.setItem("checkboxChecked", "true");
    } else {
      localStorage.setItem("checkboxChecked", "false");
    }

    setTimeout(() => body.classList.remove("toggle"), 10);
  }, 5);
});

// pure javascrip random function ============
function random(min, max) {
  return Math.random() * (max - min) + min;
}

window.requestAnimFrame = function () {
  return window.requestAnimationFrame ||
  function (callback, element) {
    window.setTimeout(callback, 1000 / 60);
  };
}();

function init() {} //end init

function animate() {
  requestAnimFrame(animate);
  draw();
}

function draw() {

  //setup canvas enviroment
  let time = new Date().getTime() * 0.002;
  //console.log(time);
  const color1 = "rgba(163,32,109,0.3)";
  const color2 = "rgba(154,25,172,0.4)";
  let canvas = document.getElementById("hero-canvas");
  let ctx = document.getElementById("hero-canvas").getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();

  // random float to be used in the sin & cos
  let randomX = random(.2, .9);
  let randomY = random(.1, .2);

  // sin & cos for the movement of the triangles in the canvas
  let rectX = Math.cos(time * 1) * 1.5 + randomX;
  let rectY = Math.sin(time * 1) * 1.5 + randomY;
  let rectX2 = Math.cos(time * .7) * 3 + randomX;
  let rectY2 = Math.sin(time * .7) * 3 + randomY;
  let rectX3 = Math.cos(time * 1.4) * 4 + randomX;
  let rectY3 = Math.sin(time * 1.4) * 4 + randomY;

  //console.log(rectX + '-' + rectY + '-' + rectX2 + '-' + rectY2 + '-' + rectX3 + '-' + rectY3);

  //triangle gradiente ==========================================
  var triangle_gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  triangle_gradient.addColorStop(0, color1);
  triangle_gradient.addColorStop(1, color2);

  //triangle group 1 ===========================================
  // triangle 1.1
  ctx.beginPath();
  ctx.moveTo(rectX2 + 120, rectY2 - 100);
  ctx.lineTo(rectX2 + 460, rectY2 + 80);
  ctx.lineTo(rectX2 + 26, rectY2 + 185);
  ctx.fillStyle = triangle_gradient;
  ctx.fill();

  //triangle 1.2
  ctx.beginPath();
  ctx.moveTo(rectX - 50, rectY - 25);
  ctx.lineTo(rectX + 270, rectY + 25);
  ctx.lineTo(rectX - 50, rectY + 195);
  ctx.fillStyle = triangle_gradient;
  ctx.fill();

  //triangle 1.3
  ctx.beginPath();
  ctx.moveTo(rectX3 - 140, rectY3 - 150);
  ctx.lineTo(rectX3 + 180, rectY3 + 210);
  ctx.lineTo(rectX3 - 225, rectY3 - 50);
  ctx.fillStyle = triangle_gradient;
  ctx.fill();

  //triangle group 2 ===========================================
  // triangle 2.1
  ctx.beginPath();
  ctx.moveTo(rectX + (canvas.width - 40), rectY - 30);
  ctx.lineTo(rectX + (canvas.width + 40), rectY + 190);
  ctx.lineTo(rectX + (canvas.width - 450), rectY + 120);
  ctx.fillStyle = triangle_gradient;
  ctx.fill();

  // triangle 2.2
  ctx.beginPath();
  ctx.moveTo(rectX3 + (canvas.width - 200), rectY3 - 240);
  ctx.lineTo(rectX3 + (canvas.width + 80), rectY3 - 240);
  ctx.lineTo(rectX3 + (canvas.width - 50), rectY3 + 460);
  ctx.fillStyle = triangle_gradient;
  ctx.fill();

  // triangle 2.3
  ctx.beginPath();
  ctx.moveTo(rectX2 + (canvas.width - 400), rectY2 + 140);
  ctx.lineTo(rectX2 + (canvas.width + 20), rectY2 + 200);
  ctx.lineTo(rectX2 + (canvas.width - 350), rectY2 + 370);
  ctx.fillStyle = triangle_gradient;
  ctx.fill();

  //triangle group 3 ===========================================
  // triangle 3.1
  ctx.beginPath();
  ctx.moveTo(rectX3 - 50, rectY3 + (canvas.height - 350));
  ctx.lineTo(rectX3 + 350, rectY3 + (canvas.height - 220));
  ctx.lineTo(rectX3 - 100, rectY3 + (canvas.height - 120));
  ctx.fillStyle = triangle_gradient;
  ctx.fill();

  // triangle 3.2
  ctx.beginPath();
  ctx.moveTo(rectX + 100, rectY + (canvas.height - 380));
  ctx.lineTo(rectX + 320, rectY + (canvas.height - 180));
  ctx.lineTo(rectX - 275, rectY + (canvas.height + 150));
  ctx.fillStyle = triangle_gradient;
  ctx.fill();

  // triangle 3.3
  ctx.beginPath();
  ctx.moveTo(rectX2 - 230, rectY2 + (canvas.height - 50));
  ctx.lineTo(rectX2 + 215, rectY2 + (canvas.height - 110));
  ctx.lineTo(rectX2 + 250, rectY2 + (canvas.height + 130));
  ctx.fillStyle = triangle_gradient;
  ctx.fill();

  //triangle group 4 ===========================================
  // triangle 4.1
  ctx.beginPath();
  ctx.moveTo(rectX3 + (canvas.width - 80), rectY3 + (canvas.height - 320));
  ctx.lineTo(rectX3 + (canvas.width + 250), rectY3 + (canvas.height + 220));
  ctx.lineTo(rectX3 + (canvas.width - 200), rectY3 + (canvas.height + 140));
  ctx.fillStyle = triangle_gradient;
  ctx.fill();

  // triangle 4.2
  ctx.beginPath();
  ctx.moveTo(rectX + (canvas.width - 100), rectY + (canvas.height - 160));
  ctx.lineTo(rectX + (canvas.width - 30), rectY + (canvas.height + 90));
  ctx.lineTo(rectX + (canvas.width - 420), rectY + (canvas.height + 60));
  ctx.fillStyle = triangle_gradient;
  ctx.fill();

  // triangle 4.3
  ctx.beginPath();
  ctx.moveTo(rectX2 + (canvas.width - 320), rectY2 + (canvas.height - 200));
  ctx.lineTo(rectX2 + (canvas.width - 50), rectY2 + (canvas.height - 20));
  ctx.lineTo(rectX2 + (canvas.width - 420), rectY2 + (canvas.height + 120));
  ctx.fillStyle = triangle_gradient;
  ctx.fill();

  ctx.restore();

} //end function draw

//call init
init();
animate();