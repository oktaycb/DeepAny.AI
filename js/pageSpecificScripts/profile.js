// import { auth } from '../firebase/authentication.js';
import * as State from '../defaultPageLoads/accessVariables.js';

function isBanned() {
    const isBanned = false;
    return isBanned;
}

document.addEventListener('DOMContentLoaded', function () {
    let pageContents = [];

    function updatePageContents() {
        if (isBanned()) {
            pageContents = [`<h1 style="text-align: center;align-content: center;width: inherit;height: inherit;">This account has been permanently banned.<h1>`];
            return;
        }

        if (State.getAspectRatio() <= 4 / 3) {
            pageContents = [
                ` 
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
                                                                    <img src="assets/profile.png" alt="Profile Image" class="profile-image" loading="lazy">
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
										`,
                ` 
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
                                                                    <div style="font-size: 0px;margin-left: clamp(0px, calc(2vh* var(--scale-factor)), calc(4vw* var(--scale-factor)));;margin-right: clamp(0px, calc(2vh* var(--scale-factor)), calc(4vw* var(--scale-factor)));margin-bottom: clamp(0px, calc(1vh* var(--scale-factor)), calc(2vw* var(--scale-factor)));width: -webkit-fill-available;height: 100%;">
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
										`,
                `
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
                                            `,
            ];
        }
        else {
            pageContents = [
                ` 
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
                                                                    <img src="assets/profile.png" alt="Profile Image" class="profile-image" loading="lazy">
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
                                                                    <div style="font-size: 0px;margin-left: clamp(0px, calc(2vh* var(--scale-factor)), calc(4vw* var(--scale-factor)));;margin-right: clamp(0px, calc(2vh* var(--scale-factor)), calc(4vw* var(--scale-factor)));margin-bottom: clamp(0px, calc(1vh* var(--scale-factor)), calc(2vw* var(--scale-factor)));width: -webkit-fill-available;height: 100%;">
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
										`
            ];
        }
    }

    updatePageContents();

    State.createPages(pageContents);
    State.updateContent(pageContents);

    function sizeBasedElements() {
        const oldContentLenght = pageContents.length;
        updatePageContents();
        const currentContentLenght = pageContents.length;
        if (oldContentLenght != currentContentLenght) {
            State.cleanPages(pageContents);
            State.createPages(pageContents);
            State.reconstructMainStyles(pageContents);
        }

        State.updateContent(pageContents);
    }

	sizeBasedElements();

	window.addEventListener('resize', sizeBasedElements);
});