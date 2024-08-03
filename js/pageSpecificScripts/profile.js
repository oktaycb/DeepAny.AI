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
<div style="display: grid; grid-template-rows: 2fr 1fr; height: -webkit-fill-available; gap: 12px;">
    <!-- Profile Information -->
    <div style="display: grid; grid-template-columns: 1fr 2fr 1fr; justify-items: center; gap: 12px;">
        <!-- Profile Section -->
        <div class="background-container">
            <div class="background-dot-container">
                <div class="background-dot-container-content">
                    <div class="background-dot-container-header">
                        <h3 class="plans-name-profile text-gradient">Profile</h3>
                    </div>
                    <div class="line"></div>
                    <div class="profile-link" onclick="#">
                        <img src="assets/profile.png" alt="Profile Image" class="profile-image">
                    </div>
                    <div style="align-self: center; text-align: center; margin: 12px;">
                        <h3>Duri Eun</h3>
                        <p style="opacity: 0.5; font-weight: 300;">durieun02@gmail.com</p>
                    </div>
                    <div class="line"></div>
                    <div>
                        <h4 style="align-self: center; text-align: center; margin-bottom: 12px;">Generations</h4>
                        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; justify-content: space-between; text-align: center;">
                            <div style="border-left: 1px solid #303236; border-right: 1px solid #303236;">
                                <p style="font-weight: 300;">125 Face Swap</p>
                            </div>
                            <div>
                                <p style="font-weight: 300;">50 Inpaint</p>
                            </div>
                            <div style="border-left: 1px solid #303236; border-right: 1px solid #303236;">
                                <p style="font-weight: 300;">252 Art</p>
                            </div>
                        </div>
                    </div>
                    <div>
                        <h4 style="align-self: center; text-align: center; margin-top: 12px; margin-bottom: 12px;">Socials</h4>
                        <div style="display: flex; justify-content: center; gap: 12px;">
                            <a class="text" href="https://facebook.com" target="_blank">Facebook</a>
                            <a class="text" href="https://twitter.com" target="_blank">Twitter</a>
                            <a class="text" href="https://linkedin.com" target="_blank">LinkedIn</a>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Account Information -->
        <div class="background-container">
            <a class="background-dot-container">
                <div class="background-dot-container-content">
                    <div class="background-dot-container-header">
                        <h3 class="plans-name-profile text-gradient">My account</h3>
                    </div>
                    <div class="line"></div>
                    <div class="background-dot-container-discounts">
                        <div id="discount-details">User information</div>
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin: 12px; justify-content: space-between;">
                            <div>
                                <h4 style="font-weight: 300;">Username</h4>
                                <input class="profile-input" value="DuriEun"></input>
                            </div>
                            <div>
                                <h4 style="font-weight: 300;">E-Mail Address</h4>
                                <input class="profile-input" value="durieun02@gmail.com"></input>
                            </div>
                            <div>
                                <h4 style="font-weight: 300;">Password</h4>
                                <input class="profile-input" value="******"></input>
                            </div>
                            <div>
                                <h4 style="font-weight: 300;">Phone Number (Optional)</h4>
                                <input class="profile-input" value="******"></input>
                            </div>
                        </div>
                    </div>
                    <div class="line"></div>
                    <div id="discount-details">About Me</div>
                    <textarea placeholder="Tell us about yourself..." maxlength="2000" class="profile-input" style="max-height: 10vh; width: -webkit-fill-available; height: -webkit-fill-available;"></textarea>
                </div>
            </a>
        </div>

        <!-- Subscription Information -->
        <div class="background-container">
            <a class="background-dot-container">
                <div class="background-dot-container-content">
                    <div class="background-dot-container-header">
                        <h4 class="plans-name-profile text-gradient">Subscription</h4>
                    </div>
                    <div class="line"></div>
                    <div id="discount-details">Plan information</div>
                    <div style="margin: 12px;">
                        <p style="font-weight: 300;">Current Plan: Premium</p>
                        <p style="font-weight: 300;">Next Billing Date: 01/01/2025</p>
                        <p style="font-weight: 300;">Subscription Deadline: 31/12/2024</p>
                        <p style="font-weight: 300;">Credits Amount: 1,200</p>
                    </div>
                    <div class="line"></div>
                    <div id="discount-details">Last payment information</div>
                    <div style="margin: 12px;">
                        <p style="font-weight: 300;">Last Payment Date: 01/01/2024</p>
                        <p style="font-weight: 300;">Last Payment Amount: $99.99</p>
                    </div>
                </div>
            </a>
        </div>
    </div>

    <!-- Comments Information -->
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        <!-- Comments Section -->
        <div class="background-container">
            <a class="background-dot-container">
                <div class="background-dot-container-content">
                    <div class="background-dot-container-header">
                        <h4 class="plans-name-profile text-gradient">Comments</h4>
                    </div>
                    <div class="line"></div>
                    <div style="text-align: center; margin: 12px;">
                        <p style="opacity: 0.5; font-weight: 300;">No additional information available.</p>
                    </div>
                </div>
            </a>
        </div>

        <!-- Privacy Settings -->
        <div class="background-container">
            <a class="background-dot-container">
                <div class="background-dot-container-content">
                    <div class="background-dot-container-header">
                        <h4 class="plans-name-profile text-gradient">Privacy Settings</h4>
                    </div>
                    <div class="line"></div>
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin: 12px; justify-content: space-between;">
                        <div>
                            <h4 style="font-weight: 300;">Profile Visibility</h4>
                            <select id="profileVisibility" class="profile-input">
                                <option value="public">Public</option>
                                <option value="private">Private</option>
                                <option value="friends">Friends Only</option>
                            </select>
                        </div>
                        <div>
                            <h4 style="font-weight: 300;">Post Visibility</h4>
                            <select id="postVisibility" class="profile-input">
                                <option value="private">Private</option>
                                <option value="friends">Friends Only</option>
                                <option value="public">Public</option>
                            </select>
                        </div>
                        <div>
                            <h4 style="font-weight: 300;">Email Visibility</h4>
                            <select id="emailVisibility" class="profile-input">
                                <option value="private">Private</option>
                                <option value="friends">Friends Only</option>
                                <option value="public">Public</option>
                            </select>
                        </div>
                        <div>
                            <h4 style="font-weight: 300;">Phone Visibility</h4>
                            <select id="phoneVisibility" class="profile-input">
                                <option value="private">Private</option>
                                <option value="friends">Friends Only</option>
                                <option value="public">Public</option>
                            </select>
                        </div>
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