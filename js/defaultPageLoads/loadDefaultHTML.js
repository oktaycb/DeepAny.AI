import { auth } from '../firebase/firebase-config.js';
import { hideLoadingScreen } from './hideLoadingScreen.js';
import { loadBars } from './loadBars.js';
import { loadBlurEffect } from './loadBlurEffect.js';
import * as State from './accessVariables.js';
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
		let animation = true;
		if (animation) {
			//loadBlurEffect(loadingScreen, mains, sidebar, navbar);
	
			State.removeNavbar(navbar, mains, sidebar);
			setTimeout(() => { State.showNavbar(navbar, mains, sidebar); }, 1);
	
			State.removeSidebar(sidebar);
			setTimeout(() => { State.showSidebar(sidebar); }, 1);
		}
		else {
			State.showNavbar(navbar, mains, sidebar);
			State.showSidebar(sidebar);
			//setTimeout(() => { State.removeNavbar(navbar, mains, sidebar); }, 1);
			//setTimeout(() => { State.removeSidebar(sidebar); }, 1);
		}

		State.setNavbar(navbar, mains, sidebar);
		State.setSidebar(sidebar);

		function sizeBasedElements() {
			State.setWindowHeight(window.innerHeight);
			State.setWindowWidth(window.innerWidth);
			State.setAspectRatio(State.getWindowWidth() / State.getWindowHeight());
			State.setNavbar(navbar, mains, sidebar);
			State.setSidebar(sidebar);

			if (State.getAspectRatio() <= 4 / 3) {
				if (!hamburgerMenu) {
					navContainer.insertAdjacentHTML('beforeend', `
						<div class="hamburger-menu">
							<div class="line"></div>
							<div class="line"></div>
							<div class="line"></div>
						</div>
					`);
					hamburgerMenu = document.querySelector('.hamburger-menu');

					if (navLinks && navLinks.length > 0) {
						navLinks.forEach(navLink => navLink.remove());
						navLinks = null;
					}
				}
			} else {
				if (!navLinks || navLinks.length === 0) {
					navContainer.insertAdjacentHTML('beforeend', `
						<ul class="nav-links">
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
						<ul class="nav-links">
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
		}

		sizeBasedElements();

		window.addEventListener('resize', sizeBasedElements);
		
		setTimeout(() => { hideLoadingScreen(loadingScreen, navbar, mains, sidebar); }, 500);
	}

	loadDefaultHTML();
});
