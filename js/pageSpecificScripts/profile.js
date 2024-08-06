// import { auth } from '../firebase/firebase-auth.js';
import * as State from '../defaultPageLoads/accessVariables.js';

function isBanned(mainContainers) {
    const isBanned = false;
    return isBanned;
}

document.addEventListener('DOMContentLoaded', function () {
	const mainContainers = document.querySelectorAll('.main-container');

    if (isBanned(mainContainers)) {
        mainContainers.forEach((mainContainer) => {
            mainContainer.innerHTML = '';
            mainContainer.insertAdjacentHTML('beforeend', `<h1 style="text-align: center;align-content: center;width: inherit;height: inherit;">This account has been permanently banned.<h1>`);
        });
        return;
    }

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
                                                                <div class="flex-column background-dot-container-header">
                                                                    <h3 class="uppercase text-gradient">Profile</h3>
                                                                    <p>Here you can manage your profile.</p>
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
                                                                <h4 style="font-weight: 300;margin-top: 6px;">Referral link</h4>
                                                                <div style="display: flex;flex-direction: column;gap: 12px;">
                                                                    <div style="display: flex;flex-direction: row;gap: 12px;">
                                                                         <input class="important-outline profile-input" value="https://deepany.ai/register?referral=KYN1HG"></input>
                                                                         <button>Copy</input>
                                                                    </div>
                                                                   <div style="display: flex;flex-direction: row;gap: 12px;">
                                                                        <button style="width: -webkit-fill-available">Referral Credits</input>
                                                                        <button style="width: -webkit-fill-available">Daily Credits</input>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <!-- Account Information -->
                                                    <div class="background-container">
                                                        <a class="background-dot-container">
                                                            <div class="background-dot-container-content">
                                                                <div class="flex-column background-dot-container-header">
                                                                    <h3 class="uppercase text-gradient">My account</h3>
                                                                    <p>Here you can manage your account.</p>
                                                                </div>
                                                                <div class="line"></div>
                                                                <div class="background-dot-container-discounts">
                                                                    <h4 id="discount-details">User information</h4>
                                                                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin: 12px; justify-content: space-between;">
                                                                        <div>
                                                                            <h4 style="font-weight: 300;margin-top: 6px;">Username</h4>
                                                                            <input class="profile-input" value="Duri Eun"></input>
                                                                        </div>
                                                                        <div>
                                                                            <h4 style="font-weight: 300;margin-top: 6px;">Email Address</h4>
                                                                            <input class="profile-input" value="durieun02@gmail.com"></input>
                                                                        </div>
                                                                        <div>
                                                                            <h4 style="font-weight: 300;margin-top: 6px;">Password</h4>
                                                                            <input class="profile-input" value="******"></input>
                                                                        </div>
                                                                        <div>
                                                                            <h4 style="font-weight: 300;margin-top: 6px;">Phone Number (Optional)</h4>
                                                                            <input class="profile-input" value="******"></input>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div class="line"></div>
                                                                    <h4 id="discount-details">About Me</h4>
                                                                    <div style="margin-left: 12px;margin-top: 12px;">
                                                                        <h4 style="font-weight: 300;">About Me</h4>
                                                                    </div>
                                                                    <div style="margin-left: 12px;margin-right: 12px;width: -webkit-fill-available;height: 100%;">
                                                                        <textarea placeholder="Tell us about yourself..." maxlength="2000" class="profile-input" style="width: -webkit-fill-available;/*height: 100%;*/"></textarea>
                                                                    </div>
                                                            </div>
                                                        </a>
                                                    </div>

                                                    <!-- Subscription Information -->
                                                    <div class="background-container">
                                                        <a class="background-dot-container">
                                                            <div class="background-dot-container-content">
                                                                <div class="flex-column background-dot-container-header">
                                                                    <h3 class="uppercase text-gradient">Billing & Subscription</h3>
                                                                    <p>Here you can manage your plan and payment details.</p>
                                                                </div>
                                                                <div class="line"></div>
                                                                <h4 id="discount-details">Plan</h4>
                                                                <div style="margin: 12px;">
                                                                    <p style="font-weight: 300;">Subscription: 01/01/2024</p>
                                                                </div>
                                                                <div class="line"></div>
                                                                <h4 id="discount-details">Invoices</h4>
                                                                <div style="margin: 12px;">
                                                                    <p style="font-weight: 300;">Payment Date: 01/01/2024</p>
                                                                    <p style="font-weight: 300;">Payment Amount: $99.99</p>
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
                                                                <div class="flex-column background-dot-container-header">
                                                                    <h3 class="uppercase text-gradient">Comments</h3>
                                                                    <p>Here you can see your comments.</p>
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
                                                                <div class="flex-column background-dot-container-header">
                                                                    <h3 class="uppercase text-gradient">Privacy Settings</h3>
                                                                    <p>Here you can manage your privacy.</p>
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