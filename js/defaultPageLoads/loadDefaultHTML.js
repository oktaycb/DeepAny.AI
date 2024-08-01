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
		let animation = false;
		if (animation) {
			loadBlurEffect(loadingScreen, mains, sidebar, navbar);
	
			State.removeNavbar(navbar, mains, sidebar);
			setTimeout(() => { State.showNavbar(navbar, mains, sidebar); }, 1);
	
			State.removeSidebar(sidebar);
			setTimeout(() => { State.showSidebar(sidebar); }, 1);
		}
		else {
			State.showNavbar(navbar, mains, sidebar);
			State.showSidebar(sidebar);
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
								<a href="#">Services</a>
								<ul class="dropdown-menu">
									<li><a href="faceswap.html">Face Swap</a></li>
									<li><a href="inpainter.html">Inpainter</a></li>
									<li><a href="artgenerator.html">Art</a></li>
								</ul>
							</li>
							<li>
								<a href="#">Community</a>
								<ul class="dropdown-menu">
									<li><a href="https://x.com/zeroduri">X</a></li>
									<li><a href="https://discord.com/invite/Vrmt8UfDK8">Discord</a></li>
									<li><a href="https://www.reddit.com/r/bodyswapai/">Reddit</a></li>
								</ul>
							</li>
							<li><a href="pricing.html">Pricing</a></li>
						</ul>
						<ul class="nav-links">
							<div class="button-container">
								<button id="registerButton">Register</button>
								<button class="important" id="loginButton">Login</button>
							</div>
							<section class="layout__header_user__2N4fp "><div class="layout_header_user__y0W0A"><div class="layout_credits___9aXf"><div class="layout_plan_name__xtBaL">Free plan</div><div class="layout__credits_bar__copYC"><div class="layout_credits_bar__HR_UZ" style="width: 100%;"></div></div><div class="layout_credits_number__Y7hOA"><span>100</span> / 100 <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-coins "><circle cx="8" cy="8" r="6"></circle><path d="M18.09 10.37A6 6 0 1 1 10.34 18"></path><path d="M7 6h1v4"></path><path d="m16.71 13.88.7.71-2.82 2.82"></path></svg></div></div><div class="layout_header_avatar__CjhHu"><div class="avatar____u7GMl" style="width: 36px; height: 36px; background: rgb(189, 136, 242); color: rgb(77, 15, 138);"><img src="https://lh3.googleusercontent.com/a/ACg8ocITT4wEdxUrENk_s5DJPOsAxy5c0Vi7RFwHrxro-oDadKPUZA=s96-c" width="36" height="36"></div></div></div></section>
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
		
		setTimeout(() => { hideLoadingScreen(loadingScreen, navbar, mains, sidebar); }, 1);
	}

	loadDefaultHTML();
});
