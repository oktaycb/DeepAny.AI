import * as State from './accessVariables.js';

// If you are looking for buttons and services li's refer to sizeBasedElements inside loadDefaultHTML.
const websiteTitle = document.title.split('.')[0];
const loadSideBarAndNavBar = `
			<nav class="navbar">
				<div class="container">
					<div class="logo">
						<img onclick="location.href='index.html';" style="cursor: pointer;" class="logoimg" src="assets/logo.png" alt="Logo" loading="lazy">
						<h2 onclick="location.href='index.html';" style="cursor: pointer;">${websiteTitle}.<span class="text-gradient">AI</span></h2>
					</div>
				</div>
			</nav>
			<nav class="sidebar">
				<div style="flex: 1; justify-content: space-between;">
					<div>
						<button id="exploreButton"><img src="./assets/explore.svg" loading="lazy">Explore</button>
						<button id="profileButton"><img src="./assets/profile.svg" loading="lazy">Profile</button>
						<button id="premiumButton" class="important"><img src="./assets/premium.svg" loading="lazy">Premium</button>
					</div>
					<div>
						<button id="discordButton"><img src="./assets/discord.svg" loading="lazy">Discord </button>
						<button id="twitterButton"><img src="./assets/x.svg" loading="lazy">X</button>
						<button id="redditButton"><img src="./assets/reddit.svg" loading="lazy">Reddit</button>
					</div>
					<div>
						<button id="contactButton"><img src="./assets/contact.svg" alt="Contact Icon" loading="lazy">Contact</button>
						<button><img src="./assets/trophy.svg" loading="lazy">Affiliation</button>
						<button><img src="./assets/settings.svg" loading="lazy">Settings</button>
					</div>
				</div>
			</nav>
			<div class="loading-screen">
				<div class="loading-spinner"></div>
			</div>
		`;

function loadBars() {
	document.body.insertAdjacentHTML('afterbegin', loadSideBarAndNavBar);
	document.getElementById('contactButton').addEventListener('click', function () { window.location.href = 'mailto:durieun02@gmail.com'; });
	document.getElementById('discordButton').addEventListener('click', function () { window.open('https://discord.gg/6FTmwtaK', '_blank'); });
	document.getElementById('twitterButton').addEventListener('click', function () { window.open('https://x.com/zeroduri', '_blank'); });
	document.getElementById('redditButton').addEventListener('click', function () { window.open('https://www.reddit.com/r/bodyswapai/', '_blank'); });
	document.getElementById('exploreButton').addEventListener('click', function () { window.location.href = 'index.html'; });
	document.getElementById('profileButton').addEventListener('click', function () { window.location.href = 'profile.html'; });
	document.getElementById('premiumButton').addEventListener('click', function () { window.location.href = 'pricing.html'; });
}

const swipeThreshold = 50;

function loadScrollingAndMain(navbar, mains, sidebar, hamburgerMenu) {
	if (mains && mains.length > 0) {
		mains.forEach((main, index) => {
			main.style.display = 'flex';
			main.style.top = `${index * State.getWindowHeight() + State.getNavbarHeight()}px`;
			main.style.height = `${State.getWindowHeight() - State.getNavbarHeight()}px`;
			main.style.width = `${State.getWindowWidth()}px`;
		});

		let scrolling = false;
		let touchStartY = 0;
		let touchEndY = 0;
		let touchStartTime = 0;

		function showMain(index, transitionDuration = 250) {
			console.log(mains.length);
			if (index >= 0 && index < mains.length && !scrolling) {
				scrolling = true;
				const wentDown = index >= State.getCurrentMain();
				State.setCurrentMain(index);
				if (wentDown) {
					State.removeNavbar(navbar, mains, sidebar);
				} else {
					State.showNavbar(navbar, mains, sidebar);
				}
				setTimeout(() => {
					scrolling = false;
				}, transitionDuration);
			}
		}

		const handleKeydown = (event) => {
			if (!scrolling) {
				if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
					event.preventDefault();
					showMain(State.getCurrentMain() + 1);
				} else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
					event.preventDefault();
					showMain(State.getCurrentMain() - 1);
				}
			}
		};

		const handleWheel = (event) => {
			if (event.ctrlKey)
				return;

			if (!scrolling) {
				if (event.deltaY > 0) {
					showMain(State.getCurrentMain() + 1);
				} else if (event.deltaY < 0) {
					showMain(State.getCurrentMain() - 1);
				}
			}
		};

		const handleEvent = (event) => {
			if (event) {
				const clientY = event.type === 'touchstart' ? event.touches[0].clientY : event.clientY;
				const clientX = event.type === 'touchstart' ? event.touches[0].clientX : event.clientX;

				if (clientX > State.getActualSidebarWidth()) {
					if (clientY <= State.getActualNavbarHeight()) {
						State.showNavbar(navbar, mains, sidebar);
					} else if (event.type === 'click') {
						// State.removeNavbar(navbar, mains, sidebar);
					}
				}

				if (clientY > State.getActualNavbarHeight()) {
					if (!clientX) {
						State.showSidebar(sidebar, hamburgerMenu);
					} else if (event.type === 'click' && clientX > State.getActualSidebarWidth()) {
						State.removeSidebar(sidebar, hamburgerMenu);
					}
				}
			}
		};

		const handleTouchMove = (event) => {
			touchEndY = event.changedTouches[0].clientY;
			handleSwipe();
		};

		const handleTouchStart = (event) => {
			handleEvent(event);
			touchStartY = event.touches[0].clientY;
			touchStartTime = Date.now();
		};

		const handleSwipe = () => {
			const touchDistance = touchEndY - touchStartY;
			const touchDuration = Date.now() - touchStartTime;
			if (Math.abs(touchDistance) > swipeThreshold && touchDuration < 500) {
				if (touchDistance < 0) {
					showMain(State.getCurrentMain() + 1);
				} else {
					showMain(State.getCurrentMain() - 1);
				}
			}
		};

		document.addEventListener('keydown', handleKeydown);
		document.addEventListener('wheel', handleWheel);
		document.addEventListener('click', handleEvent);
		document.addEventListener('mousemove', handleEvent);
		document.addEventListener('touchmove', handleTouchMove);
		document.addEventListener('touchstart', handleTouchStart);

		return function cleanup() {
			document.removeEventListener('keydown', handleKeydown);
			document.removeEventListener('wheel', handleWheel);
			document.removeEventListener('click', handleEvent);
			document.removeEventListener('mousemove', handleEvent);
			document.removeEventListener('touchmove', handleTouchMove);
			document.removeEventListener('touchstart', handleTouchStart);
		};
	}
}

document.addEventListener('DOMContentLoaded', function () {
	function loadDefaultHTML() {
		loadBars();

		let hamburgerMenu = document.querySelector('.hamburger-menu');
		let navbar = document.querySelector('.navbar');
		let navLinks = document.querySelectorAll('.navbar .nav-links');
		let navContainer = document.querySelector('.navbar .container');
		let loadingScreen = document.querySelector('.loading-screen');
		let mains = document.querySelectorAll('main');
		let sidebar = document.querySelector('.sidebar');

		if (loadingScreen) {
			loadingScreen.remove();
		}

		let cleanupEvents = null;

		function sizeBasedElements() {
			State.setNavbar(navbar, mains, sidebar);
			State.setSidebar(sidebar);

			if (State.getAspectRatio() <= 4 / 3) {
				if (!hamburgerMenu) {
					navContainer.insertAdjacentHTML('beforeend', `
						<div class="hamburger-menu open">
							<div class="line"></div>
							<div class="line"></div>
							<div class="line"></div>
						</div>
					`);
					hamburgerMenu = document.querySelector('.hamburger-menu');
					hamburgerMenu.addEventListener('click', function () {
						State.getSidebarActive() ? State.removeSidebar(sidebar, hamburgerMenu) : State.showSidebar(sidebar, hamburgerMenu);
					});

					if (navLinks && navLinks.length > 0) {
						navLinks.forEach(navLink => navLink.remove());
						navLinks = null;
					}
				}
			} else {
				if (!navLinks || navLinks.length === 0) {
					navContainer.insertAdjacentHTML('beforeend', `
						<ul class="nav-links" style="display: grid;grid-template-columns: 2fr 1fr 2fr;justify-items: center;">
							<li>
								<a class="text" href="#">Services</a>
								<ul class="dropdown-menu">
									<li><a class="text" href="faceswap.html">Face Swap</a></li>
									<li><a class="text" href="inpainter.html">Inpainter</a></li>
									<li><a class="text" href="artgenerator.html">Art</a></li>
								</ul>
							</li>
							<li>
								<a class="text" href="#">Community</a>
								<ul class="dropdown-menu">
									<li><a class="text" href="https://x.com/zeroduri" target="_blank">X</a></li>
									<li><a class="text" href="https://discord.com/invite/Vrmt8UfDK8" target="_blank">Discord</a></li>
									<li><a class="text" href="https://www.reddit.com/r/bodyswapai/" target="_blank">Reddit</a></li>
								</ul>
							</li>
							<li><a class="text" href="pricing.html">Pricing</a></li>
						</ul>
						<ul class="nav-links" style="display: flex;flex-direction: column;align-items: flex-end;">
							<div class="button-container">
								<button id="registerButton">Register</button>
								<button class="important" id="loginButton">Login</button>
							</div>
						</ul>
					`);
					navLinks = document.querySelectorAll('.navbar .nav-links');

					if (hamburgerMenu) {
						hamburgerMenu.remove();
						hamburgerMenu = null;
					}
				}
			}

			mains = document.querySelectorAll('main');
			sidebar = document.querySelector('.sidebar');
			navbar = document.querySelector('.navbar');

			if (cleanupEvents) {
				cleanupEvents();
			}

			cleanupEvents = loadScrollingAndMain(navbar, mains, sidebar, hamburgerMenu);
		}

		sizeBasedElements();

		window.addEventListener('resize', sizeBasedElements);

		State.showNavbar(navbar, mains, sidebar);
		State.showSidebar(sidebar, hamburgerMenu);
	}

	loadDefaultHTML();
});
