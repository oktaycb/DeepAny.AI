import * as State from '../defaultPageLoads/accessVariables.js';

document.addEventListener('DOMContentLoaded', function () {
    let pageContents = [];

    function updatePageContents() {
		if (State.getAspectRatio() <= 4 / 3) {
            pageContents = [
                `
                    <div class="start-content" id="hover-div">
                        <p class="subtext">Discover the leading AI platform since 2023, renowned for its ease and excellence.</p>
                        <h1 class="text-gradient" id="dynamic-text">AI-Powered Services</h1>
                        <ul class="styled-list">
                            <li><strong>Daily Free Trial:</strong> Experience our full-featured services without cost.</li>
                            <li><strong>Security & Support:</strong> Your data is protected, with 24/7 support available.</li>
                            <li><strong>High Ratings:</strong> Trusted by users with a 4.9 rating on
                                <a class="trusted-link" href="https://www.trustpilot.com/review/bodyswap.me" target="_blank" rel="noopener noreferrer">Trustpilot</a>.
                            </li>
                            <li><strong>Cost-Effective:</strong> Only 1 credit per image & frame processed.</li>
                            <li><strong>Fast Processing:</strong> RTX 4090 GPUs in our servers for optimal performance.</li>
                            <li><strong>Pricing:</strong> Dynamic plans tailored to every budget.
                            </li>
                        </ul>
                        <p class="subtext">Unlock the potential of AI for your projects with our reliable and affordable services.</p>
                        <div class="button-container">
                            <button>Try Now</button>
                            <button class="important">Purchase</button>
                       </div>
                </div>
                <div class="card-container">
                    <div class="background"></div>
                    <a href="face-swap" class="card">
                        <div class="card-content">
                            <h3>Face Swapper</h3>
                            <div class="card-link">Try Face Swapper</div>
                        </div>
                    </a>
                    <a href="inpaint" class="card">
                        <div class="card-content">
                            <h3>Inpainter</h3>
                            <div class="card-link">Try Inpainter</div>
                        </div>
                    </a>
                    <a href="art" class="card">
                        <div class="card-content">
                            <h3>Art Generator</h3>
                            <div class="card-link">Create Art</div>
                        </div>
                    </a>
                </div>
            `
			];
		}
		else {
            pageContents = [
                `
                <div style="display: flex;gap: clamp(0px, calc(12vh* var(--scale-factor)), calc(24vw* var(--scale-factor)));justify-content: space-between;align-items: center;">
                    <div class="start-content" id="hover-div">
                        <p class="subtext">Discover the leading AI platform since 2023, renowned for its ease and excellence.</p>
                        <h1 class="text-gradient" id="dynamic-text">AI-Powered Services</h1>
                        <ul class="styled-list">
                            <li><strong>Daily Free Trial:</strong> Experience our full-featured services without cost.</li>
                            <li><strong>Security & Support:</strong> Your data is protected, with 24/7 support available.</li>
                            <li><strong>High Ratings:</strong> Trusted by users with a 4.9 rating on
                                <a class="trusted-link" href="https://www.trustpilot.com/review/bodyswap.me" target="_blank" rel="noopener noreferrer">Trustpilot</a>.
                            </li>
                            <li><strong>Cost-Effective:</strong> Only 1 credit per image & frame processed.</li>
                            <li><strong>Fast Processing:</strong> RTX 4090 GPUs in our servers for optimal performance.</li>
                            <li><strong>Pricing:</strong> Dynamic plans tailored to every budget.
                            </li>
                        </ul>
                        <p class="subtext">Unlock the potential of AI for your projects with our reliable and affordable services.</p>
                        <div class="button-container">
                            <button>Try Now</button>
                            <button class="important">Purchase</button>
                        </div>
                    </div>
                    <div class="end-content">
                        <img src="./assets/resize-large.webp" id="wide-img" loading="lazy">
                        <img src="./assets/resize-middle.webp" id="middle-img" loading="lazy">
                        <img src="./assets/resize-long.webp" id="long-img" loading="lazy">
                    </div>
                </div>
                <div class="card-container">
                    <div class="background"></div>
                    <a href="face-swap" class="card">
                        <div class="card-content">
                            <div>
                                <h3>Face Swapper</h3>
                                <div class="card-description">Swap faces in your photos with ease.</div>
                            </div>
                            <div class="card-link">Try Face Swapper</div>
                        </div>
                    </a>
                    <a href="inpaint" class="card">
                        <div class="card-content">
                            <div>
                                <h3>Inpainter</h3>
                                <div class="card-description">Remove or add elements in your images.</div>
                            </div>
                            <div class="card-link">Try Inpainter</div>
                        </div>
                    </a>
                    <a href="art" class="card">
                        <div class="card-content">
                            <div>
                                <h3>Art Generator</h3>
                                <div class="card-description">Create stunning digital artworks.</div>
                            </div>
                            <div class="card-link">Create Art</div>
                        </div>
                    </a>
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