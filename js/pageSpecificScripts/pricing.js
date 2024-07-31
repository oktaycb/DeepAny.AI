document.addEventListener('DOMContentLoaded', function () {
	const mainContainers = document.querySelectorAll('.main-container');

	function sizeBasedElements() {
		mainContainers.forEach((mainContainer, index) => {
			mainContainer.innerHTML = '';

			switch (index) {
				case 0:
					mainContainer.insertAdjacentHTML('beforeend', `
										<div class="start-content">
											<h3 class="start-content-title">
												Make your own plan<br>
											</h3>
											<h4 class="start-content-subtitle text-gradient">
												Create the best plan for your needs.
											</h4>
										</div>
										
										<div class="card-container">
											<div class="card-option selected" id="subscription-mode">Subscription</div>
											<div class="card-option" id="credits-mode">Credits</div>
										</div>

										<div class="card-container">
											<div class="card-option selected" data-currency="USD">$</div>
											<div class="card-option" data-currency="EUR">€</div>
											<div class="card-option" data-currency="GBP">£</div>
											<div class="card-option" data-currency="TRY">₺</div>
											<div class="card-option" data-currency="BTC">₿</div>
										</div>

										<div class="card-container">
											<input type="range" id="slider" class="slider" min="1" max="6" step="1" value="1">
											<span class="slider-value">1 day</span>
										</div>

										<div class="card-container">
											<a class="card">
												<div class="card-content">
													<div class="card-header">
														<h4 class="plans-name">Starter</h4>
														<h4 class="plans-popular">Popular</h4>
													</div>
													<div class="card-price">
														<h1 id="cost-per-day">$9.99</h1>
														<h4 id="cost-per-day-unit" style="opacity: 0.5;">/day</h4>
													</div>
													<div class="card-link" id="purchase">Purchase</div>
													<div class="card-discounts">
														<div id="discount-details">
															The total payment is 9.99 USD.
														</div>
														<div class="discount-details" id="discount">
															You are saving 0$ with this plan...
														</div>
													</div>
													<div class="card-features">
														<div class="feature">
															<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
																<path d="M20 6 9 17l-5-5"></path>
															</svg> Unlimited Generation
														</div>
														<div class="feature">
															<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
																<path d="M20 6 9 17l-5-5"></path>
															</svg> 24/7 Support
														</div>
														<div class="feature">
															<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
																<path d="M20 6 9 17l-5-5"></path>
															</svg> Priority Queue
														</div>
													</div>
												</div>
											</a>
										</div>
									`);
					break;
			}
		});
	}

	sizeBasedElements();

	window.addEventListener('resize', sizeBasedElements);
});