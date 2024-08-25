import {
	getWindowHeight,
	getNavbarHeight,
	getActualSidebarWidth,
	getActualNavbarHeight,
	getWindowWidth,
	getCurrentMain,
	setCurrentMain,
	removeNavbar,
	showNavbar,
	getAspectRatio,
	setNavbar,
	setSidebar,
	showSidebar,
	removeSidebar,
	getSidebarActive
} from './accessVariables.js';

//console.log("[LOADING] loadDefaultHTML.js");

const swipeThreshold = 50;

function loadScrollingAndMain(navbar, mains, sidebar, hamburgerMenu) {
	if (mains && mains.length > 0) {
		mains.forEach((main, index) => {
			main.style.display = 'flex';
			main.style.top = `${index * getWindowHeight() + getNavbarHeight()}px`;
			main.style.height = `${getWindowHeight() - getNavbarHeight()}px`;
			main.style.width = `${getWindowWidth()}px`;
		});

		let scrolling = false;
		let touchStartY = 0;
		let touchEndY = 0;
		let touchStartTime = 0;

		function showMain(index, transitionDuration = 250) {
			//console.log(mains.length);
			if (index >= 0 && index < mains.length && !scrolling) {
				scrolling = true;
				const wentDown = index >= getCurrentMain();
				setCurrentMain(index);
				if (wentDown) {
					removeNavbar(navbar, mains, sidebar);
				} else {
					showNavbar(navbar, mains, sidebar);
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
					showMain(getCurrentMain() + 1);
				} else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
					event.preventDefault();
					showMain(getCurrentMain() - 1);
				}
			}
		};

		const handleWheel = (event) => {
			if (event.ctrlKey)
				return;

			if (!scrolling) {
				if (event.deltaY > 0) {
					showMain(getCurrentMain() + 1);
				} else if (event.deltaY < 0) {
					showMain(getCurrentMain() - 1);
				}
			}
		};

		const handleEvent = (event) => {
			if (event) {
				const clientY = event.type === 'touchstart' ? event.touches[0].clientY : event.clientY;
				const clientX = event.type === 'touchstart' ? event.touches[0].clientX : event.clientX;

				if (clientX > getActualSidebarWidth()) {
					if (clientY <= getActualNavbarHeight()) {
						showNavbar(navbar, mains, sidebar);
					} else if (event.type === 'click') {
						// removeNavbar(navbar, mains, sidebar);
					}
				}

				if (clientY > getActualNavbarHeight()) {
					if (!clientX) {
						showSidebar(sidebar, hamburgerMenu);
					} else if (event.type === 'click' && clientX > getActualSidebarWidth()) {
						removeSidebar(sidebar, hamburgerMenu);
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
					showMain(getCurrentMain() + 1);
				} else {
					showMain(getCurrentMain() - 1);
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

function loadBars() {
	document.body.insertAdjacentHTML('afterbegin', `
				<nav class="navbar">
					<div class="container">
						<div class="logo">
							<img onclick="location.href='index.html';" style="cursor: pointer;" alt="DeepAny.AI Logo" width="clamp(0px, calc(6vh * var(--scale-factor)), calc(12vw * var(--scale-factor)))" height="auto" loading="eager">
							<h2 onclick="location.href='index.html';" style="cursor: pointer;" translate="no">${document.title.split('.')[0]}.<span class="text-gradient" translate="no">${document.title.split('.')[1]}</span></h2>
						</div>
					</div>
				</nav>
				<nav class="sidebar"></nav>
			`);
}

document.addEventListener('DOMContentLoaded', function () {
	function loadDefaultHTML() {
		if (!localStorage.getItem('sidebarStateInitialized') && getAspectRatio() <= 4 / 3) {
			localStorage.setItem('sidebarState', 'keepSideBar');

			let sidebarImages = document.querySelectorAll('.sidebar img');
			sidebarImages.forEach(image => {
				image.setAttribute('loading', 'lazy');
			});

			localStorage.setItem('sidebarStateInitialized', 'true');
		}

		loadBars();

		let hamburgerMenu = document.querySelector('.hamburger-menu');
		let navbar = document.querySelector('.navbar');
		let navLinks = document.querySelectorAll('.navbar .nav-links');
		let navContainer = document.querySelector('.navbar .container');
		let mains = document.querySelectorAll('main');
		let sidebar = document.querySelector('.sidebar');

		let cleanupEvents = null;
		let bAspectRatio = getAspectRatio() <= 4 / 3;

		function sizeBasedElements() {
			bAspectRatio = getAspectRatio() <= 4 / 3;
			if (bAspectRatio)
				document.documentElement.classList.add('aspect-4-3');
			else document.documentElement.classList.remove('aspect-4-3');

			setNavbar(navbar, mains, sidebar);
			setSidebar(sidebar);

			if (bAspectRatio) {
				if (!hamburgerMenu) {
					navContainer.insertAdjacentHTML('beforeend', `
						<div class="hamburger-menu">
							<div class="line"></div>
							<div class="line"></div>
							<div class="line"></div>
						</div>
					`);
					hamburgerMenu = document.querySelector('.hamburger-menu');
					hamburgerMenu.addEventListener('click', function () {
						getSidebarActive() ? removeSidebar(sidebar, hamburgerMenu) : showSidebar(sidebar, hamburgerMenu);
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
									<li><a class="text" href="https://x.com/zeroduri" target="_blank" translate="no">X</a></li>
									<li><a class="text" href="https://discord.com/invite/Vrmt8UfDK8" target="_blank" translate="no">Discord</a></li>
									<li><a class="text" href="https://www.reddit.com/r/bodyswapai/" target="_blank" translate="no">Reddit</a></li>
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

		if (bAspectRatio)
			document.documentElement.classList.add('aspect-4-3');
		else document.documentElement.classList.remove('aspect-4-3');

		const sidebarState = localStorage.getItem('sidebarState');
		if (sidebarState === 'keepSideBar')
			removeSidebar(sidebar, hamburgerMenu);
		else showSidebar(sidebar, hamburgerMenu);
			
		sizeBasedElements();

		window.addEventListener('resize', sizeBasedElements);

		if (sidebarState === 'removeSidebar') {
			removeSidebar(sidebar, hamburgerMenu);
			localStorage.setItem('sidebarState', 'keepSideBar');
		}

		document.documentElement.classList.remove('loading-screen');
	}

	loadDefaultHTML();
});

//console.log("[LOADED] loadDefaultHTML.js");