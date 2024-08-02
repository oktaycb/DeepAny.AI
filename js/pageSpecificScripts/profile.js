// import { auth } from '../firebase/firebase-auth.js';
import * as State from '../defaultPageLoads/accessVariables.js';

document.addEventListener('DOMContentLoaded', function () {
	const mainContainers = document.querySelectorAll('.main-container');

	function sizeBasedElements() {
		mainContainers.forEach((mainContainer, index) => {
			mainContainer.innerHTML = '';

				switch (index) {
					case 0:
						mainContainer.insertAdjacentHTML('beforeend', ` 
												<div style="display: grid;grid-template-rows: 2fr 1fr;height: -webkit-fill-available;gap: 12px;">
													<div style="display: grid;grid-template-columns: 1fr 2fr 1fr;justify-items: center;gap: 12px;">											
														<div class="background-container">
															<div class="pricing">
																<div class="pricing-content">
																	<div class="pricing-header">
																		<h3 class="plans-name-profile">Profile</h3>
																	</div>
																	<div class="line"></div>
																	<div class="profile-link" onclick="#">
																		<img src="../assets/profile.png" alt="Profile Image" class="profile-image">
																	</div>
																	<div style="align-self: center;text-align: center;margin: 12px;">
																		<h3>Duri Eun</h3>
																		<p style="opacity: 0.5;">durieun02@gmail.com</p>
																	</div>
																	<div class="line"></div>
																	<div class="pricing-discounts">
																		<h4 style="align-self: center;text-align: center;margin-bottom: 12px;">Generations</h4>
																		<div style="display: grid;grid-template-columns: 1fr 1fr 1fr;justify-content: space-between;text-align: center;">
																			<div style="border-left: 1px solid #303236;border-right: 1px solid #303236;">
																				<p>125 Face Swap</p>
																			</div>
																			<div>
																				<p>50 Inpaint</p>
																			</div>
																			<div style="border-left: 1px solid #303236;border-right: 1px solid #303236;">
																				<p>252 Art</p>
																			</div>
																		</div>
																	</div>
																</div>
															</div>
														</div>
														<div class="background-container">
															<a class="pricing">
																<div class="pricing-content">
																	<div class="pricing-header">
																		<h3 class="plans-name-profile">My account</h3>
																	</div>
																	<div class="line"></div>
																	<div class="pricing-discounts">
																		<div id="discount-details">User information</div>
																		<div style="display: grid;grid-template-columns: repeat(2, 1fr);gap: 12px;margin: 12px;justify-content: space-between;">
																			<div>
																				<h4 style="font-weight: 200;">Username</h4>
																				<input class="profile-input"></input>
																			</div>
																			<div>
																				<h4 style="font-weight: 200;">E-Mail Adress</h4>
																				<input class="profile-input"></input>
																			</div>																	
																			<div>
																				<h4 style="font-weight: 200;">First Name</h4>
																				<input class="profile-input"></input>
																			</div>
																			<div>
																				<h4 style="font-weight: 200;">Last Name</h4>
																				<input class="profile-input"></input>
																			</div>
																		</div>
																	</div>
																	<div class="line"></div>
																	<textarea placeholder="Enter about yourself..." maxlength="2000" class="profile-input" style="max-height: 10vh;width: -webkit-fill-available;height: -webkit-fill-available;""></textarea>
																</div>
															</a>
														</div>
														<div class="background-container">
															<a class="pricing">
																<div class="pricing-content">
																	<div class="pricing-header">
																		<h4 class="plans-name-profile">Subscription</h4>
																	</div>
																</div>
															</a>
														</div>
													</div>
													
													<div style="">											
														<div class="background-container">
															<a class="pricing">
																<div class="pricing-content">
																	<div class="pricing-header">
																		<h4 class="plans-name-profile">Other</h4>
																	</div>
																</div>
															</a>
														</div>
													</div>
												</div>
										`);
						break;
				}
		});
	}

	sizeBasedElements();

	window.addEventListener('resize', sizeBasedElements);

	function setupTextRotation(aspectRatio) {
		let texts = [
			"Enhanced Face Swapping",
			"Advanced Inpainting",
			"Renowned Art Generator"
		];

		if (aspectRatio <= 4 / 3) {
			texts = [
				"Face Swapping",
				"Inpainting",
				"Art Generator"
			];
		}

		let index = 0;
		let intervalId;
		let isFirstHover = true;

		const element = document.getElementById("dynamic-text");
		const hoverDiv = document.getElementById("hover-div");

		if (hoverDiv && element) {
			function rotateText() {
				element.classList.add("change");
				setTimeout(() => {
					element.textContent = texts[index];
					index = (index + 1) % texts.length;
					element.classList.remove("change");
				}, 300);
			}

			function resetText() {
				isFirstHover = true;
				clearInterval(intervalId);
				element.classList.add("change");
				setTimeout(() => {
					element.textContent = aspectRatio <= 4 / 3 ? "AI Services" : "AI-Powered Services";
					element.classList.remove("change");
				}, 300);
			}

			let timeoutId;

			hoverDiv.addEventListener("mouseenter", function () {
				clearTimeout(timeoutId);
				timeoutId = setTimeout(() => {
					if (isFirstHover) {
						isFirstHover = false;
						rotateText();
						intervalId = setInterval(rotateText, 3000);
					}
				}, 600);
			});

			hoverDiv.addEventListener("mouseleave", function () {
				clearTimeout(timeoutId);
				timeoutId = setTimeout(() => {
					resetText();
				}, 600);
			});
		}
	}

	setupTextRotation(State.getAspectRatio());
});