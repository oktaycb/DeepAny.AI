import {
	getScreenMode,
	getCurrentMain,
	updateContent,
	createPages,
	setNavbar,
	setSidebar,
	showSidebar,
	removeSidebar,
	getSidebarActive,
	moveMains,
	setupMainSize,
	loadScrollingAndMain,
	showZoomIndicator,
	clamp,
} from './accessVariables.js';

import {
	setAuthentication
} from '../firebase/authentication.js';

export function loadPageContent(updateMainContent) {
	let previousScreenMode = null, cleanupEvents = null, cleanPages = null, reconstructMainStyles = null;
	let screenMode = getScreenMode();

	if (!localStorage.getItem('sidebarStateInitialized') && screenMode !== 1) {
		localStorage.setItem('sidebarState', 'keepSideBar');

		let sidebarImages = document.querySelectorAll('.sidebar img');
		sidebarImages.forEach(image => {
			image.setAttribute('loading', 'lazy');
		});

		localStorage.setItem('sidebarStateInitialized', 'true');
	}

	document.body.insertAdjacentHTML('afterbegin', `
				<nav class="navbar">
					<div class="container">
						<div class="logo">
							<img onclick="location.href='/'" style="cursor: pointer;" alt="DeepAny.AI Logo" width="clamp(0px, calc(6vh * var(--scale-factor)), calc(12vw * var(--scale-factor)))" height="auto" loading="eager">
							<h2 onclick="location.href='/'" style="cursor: pointer;" translate="no">${document.title.split('.')[0]}.<span class="text-gradient" translate="no">${document.title.split('.')[1]}</span></h2>
						</div>
					</div>
				</nav>
				<nav class="sidebar"></nav>
			`);

	function updateAspectRatio(screenMode) { document.documentElement.classList.toggle('aspect-4-3', screenMode !== 1); }
	updateAspectRatio(screenMode);

	let hamburgerMenu = document.querySelector('.hamburger-menu');
	let navLinks = document.querySelectorAll('.navbar .nav-links');
	let navContainer = document.querySelector('.navbar .container');

	let navbar = document.querySelector('.navbar');
	let sidebar = document.querySelector('.sidebar');

	let scaleFactor = parseFloat(localStorage.getItem('scaleFactor')) || 0.75;
	document.documentElement.style.setProperty('--scale-factor', scaleFactor);

	window.addEventListener('wheel', function (event) {
		if (event.ctrlKey) {
			event.preventDefault();

			scaleFactor = clamp(scaleFactor + (event.deltaY < 0 ? 0.05 : -0.05), 0.1, 1);
			document.documentElement.style.setProperty('--scale-factor', scaleFactor);
			localStorage.setItem('scaleFactor', scaleFactor);

			showZoomIndicator(event, scaleFactor);
			setTimeout(() => { window.dispatchEvent(new Event('resize')); }, 500);
		}
	}, { passive: false });

	let pageContent = [];
	let mainQuery = document.querySelectorAll('main');

	async function sizeBasedElements() {
		screenMode = getScreenMode();
		const shouldUpdate = previousScreenMode !== screenMode;
		previousScreenMode = screenMode;
		if (!shouldUpdate)
			return;

		updateAspectRatio(screenMode);

		function resetNavbar() {
			const menuContainer = document.getElementById('menu-container');
			if (menuContainer) {
				menuContainer.remove();
			}

			if (navLinks && navLinks.length > 0) {
				navLinks.forEach(navLink => navLink.remove());
				navLinks = null;
			}
		}

		if (screenMode !== 1) {
			resetNavbar();
			if (!hamburgerMenu) {
				navContainer.insertAdjacentHTML('beforeend', `
			<div id="menu-container" style="display: flex;gap: 2vw;">
				<div class="indicator">
					<button class="zoom-minus">-</button>
					<button class="zoom-plus">+</button>
				</div>
				<div class="hamburger-menu">
					<div class="line"></div>
					<div class="line"></div>
					<div class="line"></div>
				</div>
			</div>
		`);

				const menuContainer = document.getElementById('menu-container');
				hamburgerMenu = menuContainer.querySelector('.hamburger-menu');

				hamburgerMenu.addEventListener('click', function () {
					getSidebarActive() ? removeSidebar(sidebar, hamburgerMenu) : showSidebar(sidebar, hamburgerMenu);
				});

				let minusButton = menuContainer.querySelector('.zoom-minus');
				minusButton.onclick = () => {
					scaleFactor = clamp((scaleFactor || 1) - 0.05, 0.1, 1);
					document.documentElement.style.setProperty('--scale-factor', scaleFactor);
					localStorage.setItem('scaleFactor', scaleFactor);
					setTimeout(() => { window.dispatchEvent(new Event('resize')); }, 100);
				};

				let plusButton = menuContainer.querySelector('.zoom-plus');
				plusButton.onclick = () => {
					scaleFactor = clamp((scaleFactor || 1) + 0.05, 0.1, 1);
					document.documentElement.style.setProperty('--scale-factor', scaleFactor);
					localStorage.setItem('scaleFactor', scaleFactor);
					setTimeout(() => { window.dispatchEvent(new Event('resize')); }, 100);
				};
			}
		} else {
			resetNavbar();
			if (!navLinks || navLinks.length === 0) {
				navContainer.insertAdjacentHTML('beforeend', `
			<ul class="nav-links" style="display: grid;grid-template-columns: 2fr 1fr 2fr;justify-items: center;">
				<li>
					<a class="text" href="#">Services</a>
					<ul class="dropdown-menu">
						<li><a class="text" href="face-swap.html">Face Swap</a></li>
						<li><a class="text" href="inpainter.html">Inpainter</a></li>
						<li><a class="text" href="art-generator.html">Art Generator</a></li>
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
			<div class="nav-links" style="display: flex;justify-content: center;gap: clamp(0px, calc(1vh * var(--scale-factor)), calc(2vw * var(--scale-factor)));">
				<button id="registerButton">Register</button>
				<button class="important" id="loginButton">Login</button>
				<a href="/profile" id="userLayout" style="display: flex;gap: clamp(0px, calc(1vh * var(--scale-factor)), calc(2vw * var(--scale-factor)));align-items: center;">
                    <img alt="Profile Image" class="profile-image" style="width: clamp(0px, calc(6vh* var(--scale-factor)), calc(14vw* var(--scale-factor)));height: clamp(0px, calc(6vh* var(--scale-factor)), calc(14vw* var(--scale-factor)));">
					<div style="display: flex;flex-direction: column;">
						<p class="username">Duri Eun</p>
                        <div class="line" style="margin: unset;"></div>
						<p id="creditsAmount">100 Credits</p>
					</div>
				</a>
			</div>
		`);
				navLinks = document.querySelectorAll('.navbar .nav-links');
			}
		}

		const oldContentLength = pageContent.length;
		updateMainContent(screenMode, pageContent);
		const currentContentLength = pageContent.length;

		if (oldContentLength !== currentContentLength) {
			if (oldContentLength > 0) {
				if (!cleanPages) {
					const { cleanPages } = await import('../defaultPageLoads/accessVariables.js');
					cleanPages(pageContent);
				} else cleanPages(pageContent);
			}
			createPages(pageContent);
			if (oldContentLength > 0) {
				if (!reconstructMainStyles) {
					const { reconstructMainStyles } = await import('../defaultPageLoads/accessVariables.js');
					reconstructMainStyles(pageContent);
				} else reconstructMainStyles(pageContent);
			}
		}

		updateContent(pageContent);
		setAuthentication();

		mainQuery = document.querySelectorAll('main');
		sidebar = document.querySelector('.sidebar');
		navbar = document.querySelector('.navbar');
		hamburgerMenu = document.querySelector('.hamburger-menu');

		setNavbar(navbar, mainQuery, sidebar);
		setSidebar(sidebar);
		setupMainSize(mainQuery);
		moveMains(mainQuery, getCurrentMain());

		if (cleanupEvents) 
			cleanupEvents();

		cleanupEvents = loadScrollingAndMain(navbar, mainQuery, sidebar, hamburgerMenu);
	}

	const sidebarState = localStorage.getItem('sidebarState');
	if (sidebarState === 'keepSideBar') 
		removeSidebar(sidebar, hamburgerMenu);
	else {
		if (screenMode !== 1) {
			setNavbar(navbar, mainQuery, sidebar);
			setSidebar(sidebar);
		}

		showSidebar(sidebar, hamburgerMenu);
	}

	sizeBasedElements();

	window.addEventListener('resize', sizeBasedElements);

	if (sidebarState === 'removeSidebar') {
		removeSidebar(sidebar, hamburgerMenu);
		localStorage.setItem('sidebarState', 'keepSideBar');
	}

	function handleButtonClick(event) {
		const button = event.currentTarget;
		button.classList.add('button-click-animation');

		if (button.textContent.trim() === 'Copy') 
			button.textContent = 'Copied';

		setTimeout(() => {
			button.classList.remove('button-click-animation');
			if (button.textContent.trim() === 'Copied') 
				button.textContent = 'Copy';
		}, 500);
	}

	const buttons = document.querySelectorAll('button, a.button');
	buttons.forEach(button => { button.addEventListener('click', handleButtonClick); });

	const link = document.getElementById('loading-stylesheet');
	if (link)
		link.parentNode.removeChild(link);

	document.documentElement.classList.remove('loading-screen');
}