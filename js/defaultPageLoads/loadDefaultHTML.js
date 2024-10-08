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
	setScaleFactors,
	clamp,
} from './accessVariables.js';

import {
	setAuthentication
} from '../firebase/authentication.js';

export function loadPageContent(updateMainContent, savePageState = null) {
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
							<img onclick="location.href='/'" style="cursor: pointer;" alt="DeepAny.AI Logo" width="calc((6vh * var(--scale-factor-h) + 12vw / 2 * var(--scale-factor-w)))" height="auto" loading="eager">
							<h2 onclick="location.href='/'" style="cursor: pointer;" translate="no">DeepAny.<span class="text-gradient" translate="no">AI</span></h2>
						</div>
					</div>
				</nav>
				<nav class="sidebar"></nav>
			`);

	function updateAspectRatio(screenMode) { document.documentElement.classList.toggle('ar-4-3', screenMode !== 1); }
	updateAspectRatio(screenMode);

	let hamburgerMenu = document.querySelector('.hamburger-menu');
	let navLinks = document.querySelectorAll('.navbar .nav-links');
	let navContainer = document.querySelector('.navbar .container');

	let navbar = document.querySelector('.navbar');
	let sidebar = document.querySelector('.sidebar');

	let scaleFactorHeight = parseFloat(localStorage.getItem('scaleFactorHeight')) || 0.5;
	let scaleFactorWidth = parseFloat(localStorage.getItem('scaleFactorWidth')) || 0.5;
	setScaleFactors(scaleFactorHeight, scaleFactorWidth);

	window.addEventListener('wheel', function (event) {
		if (event.ctrlKey) {
			event.preventDefault();

			scaleFactorHeight = clamp(scaleFactorHeight + (event.deltaY < 0 ? 0.05 : -0.05), 0.1, 1);
			scaleFactorWidth = clamp(scaleFactorWidth + (event.deltaY < 0 ? 0.05 : -0.05), 0.1, 1);
			setScaleFactors(scaleFactorHeight, scaleFactorWidth);
			localStorage.setItem('scaleFactorHeight', scaleFactorHeight);
			localStorage.setItem('scaleFactorWidth', scaleFactorWidth);

			showZoomIndicator(event, scaleFactorHeight, scaleFactorWidth);
			setTimeout(() => { window.dispatchEvent(new Event('resize')); }, 100);
		}
	}, { passive: false });

	let pageUpdated = false;
	let pageContent = [];
	let mainQuery = document.querySelectorAll('main');

	async function sizeBasedElements() {
		setScaleFactors(scaleFactorHeight, scaleFactorWidth);
		mainQuery = document.querySelectorAll('main');
		sidebar = document.querySelector('.sidebar');
		navbar = document.querySelector('.navbar');
		hamburgerMenu = document.querySelector('.hamburger-menu');

		setTimeout(() => {
			setNavbar(navbar, mainQuery, sidebar);
			setSidebar(sidebar);
			setupMainSize(mainQuery);
			moveMains(mainQuery, getCurrentMain());
		}, 1);

		screenMode = getScreenMode();
		const shouldUpdate = previousScreenMode !== screenMode;
		previousScreenMode = screenMode;
		if (!shouldUpdate)
			return;

		if (pageUpdated) {
			const elements = document.querySelectorAll('*');
			elements.forEach(element => {
				const oldTransition = element.style.transition;
				element.style.transition = 'unset';

				setTimeout(() => {
					element.style.transition = oldTransition;
				}, 1);
			});
		}

		updateAspectRatio(screenMode);

		if (screenMode !== 1) {
			if (navLinks && navLinks.length > 0) {
				navLinks.forEach(navLink => navLink.remove());
				navLinks = null;
			}
			if (!hamburgerMenu) {
				navContainer.insertAdjacentHTML('beforeend', `
			<div id="menu-container" style="display: flex;gap: 2vw;">
				<div class="indicator">
					<button class="zoom-minus" translate="no">-</button>
					<button class="zoom-plus" translate="no">+</button>
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

				menuContainer.querySelector('.zoom-minus').onclick = () => {
					scaleFactorHeight = clamp((scaleFactorHeight || 1) - 0.05, 0.1, 1);
					scaleFactorWidth = clamp((scaleFactorWidth || 1) - 0.05, 0.1, 1);
					setScaleFactors(scaleFactorHeight, scaleFactorWidth);
					localStorage.setItem('scaleFactorHeight', scaleFactorHeight);
					localStorage.setItem('scaleFactorWidth', scaleFactorWidth);
					showZoomIndicator(`${Math.round(scaleFactorHeight * 100)}%`, scaleFactorHeight, scaleFactorWidth);
					setTimeout(() => { window.dispatchEvent(new Event('resize')); }, 100);
				};

				menuContainer.querySelector('.zoom-plus').onclick = () => {
					scaleFactorHeight = clamp((scaleFactorHeight || 1) + 0.05, 0.1, 1);
					scaleFactorWidth = clamp((scaleFactorWidth || 1) + 0.05, 0.1, 1);
					setScaleFactors(scaleFactorHeight, scaleFactorWidth);
					localStorage.setItem('scaleFactorHeight', scaleFactorHeight);
					localStorage.setItem('scaleFactorWidth', scaleFactorWidth);
					showZoomIndicator(`${Math.round(scaleFactorHeight * 100)}%`, scaleFactorHeight, scaleFactorWidth);
					setTimeout(() => { window.dispatchEvent(new Event('resize')); }, 100);
				};
			}
		} else {
			const menuContainer = document.getElementById('menu-container');
			if (menuContainer) {
				menuContainer.remove();
			}
			if (!navLinks || navLinks.length === 0) {
				navContainer.insertAdjacentHTML('beforeend', `
			<ul class="nav-links" style="display: grid;grid-template-columns: 2fr 1fr 2fr;justify-items: center;">
				<li>
					<a class="text" href="#">Services</a>
					<ul class="dropdown-menu">
						<li><a class="text" href="face-swap.html">Face Swap</a></li>
						<li><a class="text" href="inpaint.html">Inpaint</a></li>
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
			<div class="nav-links" style="display: flex;justify-content: center;gap: calc(1vh * var(--scale-factor-h));">
				<button id="registerButton">Register</button>
				<button class="important" id="loginButton">Login</button>
				<a href="/profile" id="userLayout" style="display: flex;gap: calc(1vh * var(--scale-factor-h));align-items: center;">
                    <img alt="Profile Image" class="profile-image" style="width: calc((6vh* var(--scale-factor-h) + 14vw / 2 * var(--scale-factor-w)));height: calc((6vh* var(--scale-factor-h) + 14vw / 2 * var(--scale-factor-w)));">
					<div>
						<p>Hello, <span class="username">Username</span></p>
                        <div class="line" style="margin: unset;"></div>
						<p id="creditsAmount">0 Credits</p>
					</div>
				</a>
			</div>
		`);
				navLinks = document.querySelectorAll('.navbar .nav-links');
			}
		}

		if (savePageState)
			savePageState();

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

	const tooltipElements = document.querySelectorAll('.tooltip');



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

	document.body.classList.add('no-animation');

	setTimeout(() => {
		document.body.classList.remove('no-animation');
	}, 0);

	const link = document.getElementById('loading-stylesheet');
	if (link)
		link.parentNode.removeChild(link);

	document.documentElement.classList.remove('loading-screen');
	pageUpdated = true;
}