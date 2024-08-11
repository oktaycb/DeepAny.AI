document.addEventListener('DOMContentLoaded', function () {
	const mainContainers = document.querySelectorAll('.main-container');

	function sizeBasedElements() {
		mainContainers.forEach((mainContainer, index) => {
			mainContainer.innerHTML = '';

			switch (index) {
				case 0:
					mainContainer.insertAdjacentHTML('beforeend', `
										<div style="display: grid;gap: clamp(0px, calc(2vh* var(--scale-factor)), calc(4vw* var(--scale-factor)));justify-content: center;font-weight: 600;">
											<div style="display: flex;flex-direction: column; gap: clamp(0px, calc(2vh* var(--scale-factor)), calc(4vw* var(--scale-factor)));width: min-content;">
															<div class="background-container">
																<p class="background-dot-container-option selected" id="credits-mode">Credits</p>
																<p class="background-dot-container-option" id="subscription-mode">Subscription</p>
															</div>

															<div class="background-container" style="grid: unset; display: grid;grid-template-columns: 1fr 1fr;">
																<input type="range" id="slider" min="1" max="6" step="1" value="1"></input>
																<p class="slider-value">1 day</p>
															</div>


															<div class="background-container" style="display: flex;flex-direction: row;height: 100%;">
																<p class="background-dot-container-option selected" data-currency="USD" style="height: 100%;">$</p>
																<p class="background-dot-container-option" data-currency="EUR" style="height: 100%;">€</p>
																<p class="background-dot-container-option" data-currency="GBP" style="height: 100%;">£</p>
																<p class="background-dot-container-option" data-currency="TRY" style="height: 100%;">₺</p>
																<p class="background-dot-container-option important-outline" data-currency="BTC" style="height: 100%;">₿</p>
															</div>
												<div class="background-container" style="display: flex;flex-direction: column;align-items: stretch;">
													<div style="display: flex; gap: clamp(0px, calc(1vh* var(--scale-factor)), calc(2vw* var(--scale-factor)));">
														<a class="background-dot-container">
															<div class="background-dot-container-content">
																<div class="background-dot-container-header">
																	<p class="plans-name text-gradient">Starter</p>
																	<div class="plans-popular">
																		<p class="plans-name text-gradient">Popular</p>
																	</div>
																</div>
																<div class="background-dot-container-price">
																	<h1 id="cost-per-day">⟳ Loading...</h1>
																	<h4 id="cost-per-day-unit" style="opacity: 0.5;">/day</h4>
																</div>
																<div class="background-dot-container-link" id="purchase">Purchase</div>
																<div>
																	<div class="line"></div>
																	<h4 id="discount-details">⟳ Loading...</h4>
																	<p class="discount-details" id="discount">⟳ Loading...</p>
																	<div class="line"></div>
																	<div>
																		<p class="feature">
																			<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
																				<path d="M20 6 9 17l-5-5"></path>
																			</svg> Unlimited Generation
																		</p>
																		<p class="feature">
																			<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
																				<path d="M20 6 9 17l-5-5"></path>
																			</svg> 24/7 Support
																		</p>
																		<p class="feature">
																			<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
																				<path d="M20 6 9 17l-5-5"></path>
																			</svg> Priority Queue
																		</p>
																	</div>
																</div>
															</div>
														</a>
													</div>
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
});