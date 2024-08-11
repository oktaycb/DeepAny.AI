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

			if (State.getAspectRatio() <= 4 / 3) {
				switch (index) {
					case 0:
						mainContainer.insertAdjacentHTML('beforeend', ` 
                                            <div style="display: grid;height: -webkit-fill-available;gap: clamp(0px, calc(2vh * var(--scale-factor)), calc(4vw * var(--scale-factor)));">
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
                                                                <div style="text-align: center;">
                                                                    <h3>Duri Eun</h3>
                                                                    <p style="opacity: 0.5; font-weight: 300;">durieun02@gmail.com</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
 
                                                    <div class="background-container">
                                                        <a class="background-dot-container">
                                                            <div class="background-dot-container-content">
                                                                <div class="flex-column background-dot-container-header">
                                                                    <h3 class="uppercase text-gradient">Privacy</h3>
                                                                    <p>Here you can manage your privacy.</p>
                                                                </div>
                                                                <div class="line"></div>
                                                                <div style="display: grid; grid-template-columns: repeat(1, 1fr); gap: clamp(0px, calc(2vh * var(--scale-factor)), calc(4vw * var(--scale-factor))); margin: clamp(0px, calc(1vh * var(--scale-factor)), calc(2vw * var(--scale-factor))) clamp(0px, calc(2vh * var(--scale-factor)), calc(4vw * var(--scale-factor))); justify-content: space-between;">
                                                                    <div style="font-size: 0px;">
                                                                        <h4 style="font-weight: 300;">Profile Visibility</h4>
                                                                        <select id="profileVisibility">
                                                                            <option value="public">Public</option>
                                                                            <option value="private">Private</option>
                                                                            <option value="friends">Friends Only</option>
                                                                        </select>
                                                                    </div>
                                                                    <div style="font-size: 0px;">
                                                                        <h4 style="font-weight: 300;">Post Visibility</h4>
                                                                        <select id="postVisibility">
                                                                            <option value="private">Private</option>
                                                                            <option value="friends">Friends Only</option>
                                                                            <option value="public">Public</option>
                                                                        </select>
                                                                    </div>
                                                                    <div style="font-size: 0px;">
                                                                        <h4 style="font-weight: 300;">Email Visibility</h4>
                                                                        <select id="emailVisibility">
                                                                            <option value="private">Private</option>
                                                                            <option value="friends">Friends Only</option>
                                                                            <option value="public">Public</option>
                                                                        </select>
                                                                    </div>
                                                                    <div style="font-size: 0px;">
                                                                        <h4 style="font-weight: 300;">Phone Visibility</h4>
                                                                        <select id="phoneVisibility">
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
										`);
						break;
					case 1:
						mainContainer.insertAdjacentHTML('beforeend', ` 
                                            <div style="display: grid;height: -webkit-fill-available;gap: clamp(0px, calc(2vh * var(--scale-factor)), calc(4vw * var(--scale-factor)));">
                                                <!-- Profile Information -->
 
                                                    <!-- Account Information -->
                                                    <div class="background-container">
                                                        <a class="background-dot-container">
                                                            <div class="background-dot-container-content">
                                                                <div class="flex-column background-dot-container-header">
                                                                    <h3 class="uppercase text-gradient">Account</h3>
                                                                    <p>Here you can manage your account.</p>
                                                                </div>
                                                                <div class="line"></div>
                                                                    <h4>User information</h4>
                                                                    <div style="display: grid; grid-template-columns: repeat(1, 1fr); gap: clamp(0px, calc(2vh * var(--scale-factor)), calc(4vw * var(--scale-factor))); margin: clamp(0px, calc(1vh * var(--scale-factor)), calc(2vw * var(--scale-factor))) clamp(0px, calc(2vh * var(--scale-factor)), calc(4vw * var(--scale-factor))); justify-content: space-between;">
                                                                        <div style="font-size: 0px;">
                                                                            <h4 style="font-weight: 300;">Username</h4>
                                                                            <input value="Duri Eun"></input>
                                                                        </div>
                                                                        <div style="font-size: 0px;">
                                                                            <h4 style="font-weight: 300;">Email Address</h4>
                                                                            <input value="durieun02@gmail.com"></input>
                                                                        </div>
                                                                        <div style="font-size: 0px;">
                                                                            <h4 style="font-weight: 300;">Password</h4>
                                                                            <input value="******"></input>
                                                                        </div>
                                                                        <div style="font-size: 0px;">
                                                                            <h4 style="font-weight: 300;">Phone Number</h4>
                                                                            <input value="******"></input>
                                                                        </div>
                                                                    </div>
                                                                <div class="line"></div>
                                                                    <h4>About Me</h4>
                                                                    <div style="margin-left: clamp(0px, calc(2vh* var(--scale-factor)), calc(4vw* var(--scale-factor)));;margin-top: clamp(0px, calc(1vh* var(--scale-factor)), calc(2vw* var(--scale-factor)));;">
                                                                        <h4 style="font-weight: 300;">About Me</h4>
                                                                    </div>
                                                                    <div style="font-size: 0px;margin-left: clamp(0px, calc(2vh* var(--scale-factor)), calc(4vw* var(--scale-factor)));;margin-right: clamp(0px, calc(2vh* var(--scale-factor)), calc(4vw* var(--scale-factor)));;width: -webkit-fill-available;height: 100%;">
                                                                        <textarea placeholder="Tell us about yourself..." maxlength="2000" style="width: -webkit-fill-available;/*height: 100%;*/"></textarea>
                                                                    </div>
                                                                <div class="line"></div>
                                                                <div style="margin-left: clamp(0px, calc(2vh* var(--scale-factor)), calc(4vw* var(--scale-factor)));;margin-top: clamp(0px, calc(1vh* var(--scale-factor)), calc(2vw* var(--scale-factor)));;"> 
                                                                    <h4 style="font-weight: 300;">Referral link</h4>
                                                                    <div style="display: flex;flex-direction: column;gap: clamp(0px, calc(2vh * var(--scale-factor)), calc(4vw * var(--scale-factor)));">
                                                                        <div style="display: flex;flex-direction: row;gap: clamp(0px, calc(2vh * var(--scale-factor)), calc(4vw * var(--scale-factor)));">
                                                                            <input class="important-outline" value="https://deepany.ai/register?referral=KYN1HG"></input>
                                                                            <button>Copy</input>
                                                                        </div>
                                                                    <div style="display: flex;flex-direction: row;gap: clamp(0px, calc(2vh * var(--scale-factor)), calc(4vw * var(--scale-factor)));">
                                                                            <button style="width: -webkit-fill-available">Referral Credits</input>
                                                                            <button style="width: -webkit-fill-available">Daily Credits</input>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </a>
                                                    </div>
                                            </div>
										`);
						break;
                        case 2:
                            mainContainer.insertAdjacentHTML('beforeend', `
                                                <div style="display: grid;grid-template-rows: repeat(2, 1fr);height: -webkit-fill-available;gap: clamp(0px, calc(2vh * var(--scale-factor)), calc(4vw * var(--scale-factor)));">
                                                    <!-- Subscription Information -->
                                                    <div class="background-container">
                                                        <a class="background-dot-container">
                                                            <div class="background-dot-container-content">
                                                                <div class="flex-column background-dot-container-header">
                                                                    <h3 class="uppercase text-gradient">Billing</h3>
                                                                    <p>Here you can manage your billing.</p>
                                                                </div>
                                                                <div class="line"></div>
                                                                <h4>Plan</h4>
                                                                <div style="margin: clamp(0px, calc(2vh * var(--scale-factor)), calc(4vw * var(--scale-factor)));">
                                                                    <p style="font-weight: 300;">Subscription: 01/01/2024</p>
                                                                </div>
                                                                <div class="line"></div>
                                                                <h4>Invoices</h4>
                                                                <div style="margin: clamp(0px, calc(2vh * var(--scale-factor)), calc(4vw * var(--scale-factor)));">
                                                                    <p style="font-weight: 300;">Payment Date: 01/01/2024</p>
                                                                    <p style="font-weight: 300;">Payment Amount: $99.99</p>
                                                                </div>
                                                            </div>
                                                        </a>
                                                    </div>
                                                        <!-- Comments Section -->
                                                        <div class="background-container">
                                                            <a class="background-dot-container">
                                                                <div class="background-dot-container-content">
                                                                    <div class="flex-column background-dot-container-header">
                                                                        <h3 class="uppercase text-gradient">Comments</h3>
                                                                        <p>Here you can see your comments.</p>
                                                                    </div>
                                                                    <div class="line"></div>
                                                                    <div style="text-align: center; margin: clamp(0px, calc(2vh * var(--scale-factor)), calc(4vw * var(--scale-factor)));">
                                                                        <p style="opacity: 0.5; font-weight: 300;">No additional information available.</p>
                                                                    </div>
                                                                </div>
                                                            </a>
                                                        </div>
                                                </div>
                                            `);
                            break;
				}
            }
            else {
				switch (index) {
					case 0:
						mainContainer.insertAdjacentHTML('beforeend', ` 
                                            <div style="display: contents; height: -webkit-fill-available; gap: clamp(0px, calc(2vh * var(--scale-factor)), calc(4vw * var(--scale-factor)));">
                                                <!-- Profile Information -->
                                                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; justify-items: center; gap: clamp(0px, calc(2vh * var(--scale-factor)), calc(4vw * var(--scale-factor)));">
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
                                                                <div style="text-align: center;">
                                                                    <h3>Duri Eun</h3>
                                                                    <p style="opacity: 0.5; font-weight: 300;">durieun02@gmail.com</p>
                                                                </div>
                                                                <div class="line"></div>
                                                                <h4 style="font-weight: 300;">Referral link</h4>
                                                                <div style="display: flex;flex-direction: column;gap: clamp(0px, calc(2vh * var(--scale-factor)), calc(4vw * var(--scale-factor)));">
                                                                    <div style="display: flex;flex-direction: row;gap: clamp(0px, calc(2vh * var(--scale-factor)), calc(4vw * var(--scale-factor)));">
                                                                         <input class="important-outline" value="https://deepany.ai/register?referral=KYN1HG"></input>
                                                                         <button>Copy</input>
                                                                    </div>
                                                                   <div style="display: flex;flex-direction: row;gap: clamp(0px, calc(2vh * var(--scale-factor)), calc(4vw * var(--scale-factor)));">
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
                                                                    <h3 class="uppercase text-gradient">Account</h3>
                                                                    <p>Here you can manage your account.</p>
                                                                </div>
                                                                <div class="line"></div>
                                                                    <h4>User information</h4>
                                                                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: clamp(0px, calc(2vh * var(--scale-factor)), calc(4vw * var(--scale-factor))); margin: clamp(0px, calc(1vh * var(--scale-factor)), calc(2vw * var(--scale-factor))) clamp(0px, calc(2vh * var(--scale-factor)), calc(4vw * var(--scale-factor))); justify-content: space-between;">
                                                                        <div style="font-size: 0px;">
                                                                            <h4 style="font-weight: 300;">Username</h4>
                                                                            <input value="Duri Eun"></input>
                                                                        </div>
                                                                        <div style="font-size: 0px;">
                                                                            <h4 style="font-weight: 300;">Email Address</h4>
                                                                            <input value="durieun02@gmail.com"></input>
                                                                        </div>
                                                                        <div style="font-size: 0px;">
                                                                            <h4 style="font-weight: 300;">Password</h4>
                                                                            <input value="******"></input>
                                                                        </div>
                                                                        <div style="font-size: 0px;">
                                                                            <h4 style="font-weight: 300;">Phone Number</h4>
                                                                            <input value="******"></input>
                                                                        </div>
                                                                    </div>
                                                                <div class="line"></div>
                                                                    <h4>About Me</h4>
                                                                    <div style="margin-left: clamp(0px, calc(2vh* var(--scale-factor)), calc(4vw* var(--scale-factor)));;margin-top: clamp(0px, calc(1vh* var(--scale-factor)), calc(2vw* var(--scale-factor)));;">
                                                                        <h4 style="font-weight: 300;">About Me</h4>
                                                                    </div>
                                                                    <div style="font-size: 0px;margin-left: clamp(0px, calc(2vh* var(--scale-factor)), calc(4vw* var(--scale-factor)));;margin-right: clamp(0px, calc(2vh* var(--scale-factor)), calc(4vw* var(--scale-factor)));;width: -webkit-fill-available;height: 100%;">
                                                                        <textarea placeholder="Tell us about yourself..." maxlength="2000" style="width: -webkit-fill-available;/*height: 100%;*/"></textarea>
                                                                    </div>
                                                            </div>
                                                        </a>
                                                    </div>

                                                    <!-- Subscription Information -->
                                                    <div class="background-container">
                                                        <a class="background-dot-container">
                                                            <div class="background-dot-container-content">
                                                                <div class="flex-column background-dot-container-header">
                                                                    <h3 class="uppercase text-gradient">Billing</h3>
                                                                    <p>Here you can manage your billing.</p>
                                                                </div>
                                                                <div class="line"></div>
                                                                <h4>Plan</h4>
                                                                <div style="margin: clamp(0px, calc(2vh * var(--scale-factor)), calc(4vw * var(--scale-factor)));">
                                                                    <p style="font-weight: 300;">Subscription: 01/01/2024</p>
                                                                </div>
                                                                <div class="line"></div>
                                                                <h4>Invoices</h4>
                                                                <div style="margin: clamp(0px, calc(2vh * var(--scale-factor)), calc(4vw * var(--scale-factor)));">
                                                                    <p style="font-weight: 300;">Payment Date: 01/01/2024</p>
                                                                    <p style="font-weight: 300;">Payment Amount: $99.99</p>
                                                                </div>
                                                            </div>
                                                        </a>
                                                    </div>
                                                </div>

                                                <!-- Comments Information -->
                                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: clamp(0px, calc(2vh * var(--scale-factor)), calc(4vw * var(--scale-factor)));">
                                                    <!-- Comments Section -->
                                                    <div class="background-container">
                                                        <a class="background-dot-container">
                                                            <div class="background-dot-container-content">
                                                                <div class="flex-column background-dot-container-header">
                                                                    <h3 class="uppercase text-gradient">Comments</h3>
                                                                    <p>Here you can see your comments.</p>
                                                                </div>
                                                                <div class="line"></div>
                                                                <div style="text-align: center; margin: clamp(0px, calc(2vh * var(--scale-factor)), calc(4vw * var(--scale-factor)));">
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
                                                                    <h3 class="uppercase text-gradient">Privacy</h3>
                                                                    <p>Here you can manage your privacy.</p>
                                                                </div>
                                                                <div class="line"></div>
                                                                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: clamp(0px, calc(2vh * var(--scale-factor)), calc(4vw * var(--scale-factor))); margin: clamp(0px, calc(1vh * var(--scale-factor)), calc(2vw * var(--scale-factor))) clamp(0px, calc(2vh * var(--scale-factor)), calc(4vw * var(--scale-factor))); justify-content: space-between;">
                                                                    <div style="font-size: 0px;">
                                                                        <h4 style="font-weight: 300;">Profile Visibility</h4>
                                                                        <select id="profileVisibility">
                                                                            <option value="public">Public</option>
                                                                            <option value="private">Private</option>
                                                                            <option value="friends">Friends Only</option>
                                                                        </select>
                                                                    </div>
                                                                    <div style="font-size: 0px;">
                                                                        <h4 style="font-weight: 300;">Post Visibility</h4>
                                                                        <select id="postVisibility">
                                                                            <option value="private">Private</option>
                                                                            <option value="friends">Friends Only</option>
                                                                            <option value="public">Public</option>
                                                                        </select>
                                                                    </div>
                                                                    <div style="font-size: 0px;">
                                                                        <h4 style="font-weight: 300;">Email Visibility</h4>
                                                                        <select id="emailVisibility">
                                                                            <option value="private">Private</option>
                                                                            <option value="friends">Friends Only</option>
                                                                            <option value="public">Public</option>
                                                                        </select>
                                                                    </div>
                                                                    <div style="font-size: 0px;">
                                                                        <h4 style="font-weight: 300;">Phone Visibility</h4>
                                                                        <select id="phoneVisibility">
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