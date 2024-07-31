import { auth, serversRef } from './firebase/firebase-config.js';

document.addEventListener("DOMContentLoaded", async function () {
	async function fetchServerAddressAPI() {
		const serverDoc = await serversRef.doc('3050-1').get();
		if (serverDoc.exists) {
			const serverAddress = serverDoc.data()['serverAdress-API'];
			return serverAddress || null;
		} else {
			return null;
		}
	}

	// Use the function to fetch the server address
	const serverAddressAPI = await fetchServerAddressAPI();
	console.log('Fetched server address (API):', serverAddressAPI);

	async function fetchServerAddressPAYTR() {
		const serverDoc = await serversRef.doc('3050-1').get();
		if (serverDoc.exists) {
			const serverAddress = serverDoc.data()['serverAdress-PAYTR'];
			return serverAddress || null;
		}

		return null;
	}

	// Use the function to fetch the server address
	const serverAddressPAYTR = await fetchServerAddressPAYTR();
	console.log('Fetched server address (PAYTR):', serverAddressPAYTR);

	async function fetchConversionRates() {
		try {
			const response = await fetch('https://api.frankfurter.app/latest?from=USD');
			const data = await response.json();
			return data.rates;
		} catch (error) {
			console.error("Error fetching conversion rates:", error);
			return null;
		}
	}

	// Fetch conversion rates from Frankfurter API
	let selectedCurrency = 'USD';
	let conversionRates = await fetchConversionRates();

	// These data's are needed in server to determine the payment type.
	const sliderElement = document.getElementById("slider");
	const subscriptionMode = document.getElementById("subscription-mode");
	const creditsMode = document.getElementById("credits-mode");

	// These data's are not usefull for server-side but client-side, helps user to select a better plan.
	const currencyOptions = document.querySelectorAll(".card-option[data-currency]");
	const dailyPriceAmountElement = document.getElementById("cost-per-day");
	const discountElement = document.getElementById("discount");
	const discountDetailsElement = document.getElementById("discount-details");
	const purchase = document.getElementById("purchase");

	// Initial prices and durations
	const prices = [24.99, 49.99, 99.99, 249.99, 499.99, 799.99];
	const subprices = [14.99, 52.5, 149.99, 224.99, 456.25, 699.99];
	const durationsInDays = [1, 7, 30, 90, 365, -1];
	const durations = ["1 day", "7 days", "1 month", "3 months", "1 year", "Lifetime"];

	// Credits options
	const credits = [100, 250, 1000, 5000, 20000];

	function calculatePrice(value) {
		return prices[value - 1];
	}

	function calculateSubPrice(value) {
		return subprices[value - 1];
	}
	
	function calculateCredit(value) {
		return credits[value - 1];
	}

	function formatNumber(value) {
		if (value === 0) return '0';
		const precision = 2;
		return Number(value).toFixed(precision).replace(/\.?0+$/, '');
	}

	function updatePrices() {
		if (!conversionRates) return;

		updateSliderRange();
		const value = sliderElement.value;
		const isCreditsMode = creditsMode.classList.contains("selected");
		const currencySymbol = getCurrencySymbol(selectedCurrency);

		let dailyPriceAmount;
		let priceInSelectedCurrency;
		let displayText;
		let discountMessage = '';

		// Calculate cost per day and discount based on mode
		if (isCreditsMode) {
			const price = calculatePrice(value);
			const creditAmount = calculateCredit(value);
			dailyPriceAmount = creditAmount > 0 ? Math.max(0, price / creditAmount) : null;

			priceInSelectedCurrency = price;
			if (selectedCurrency !== 'USD' && selectedCurrency !== 'BTC') {
				priceInSelectedCurrency = price * conversionRates[selectedCurrency];
				if (dailyPriceAmount !== null) {
					dailyPriceAmount *= conversionRates[selectedCurrency];
				}
			}

			displayText = `${currencySymbol}${formatNumber(dailyPriceAmount)} `;

			const basePrice = prices[0];
			const baseCredits = credits[0];
			const totalBasePrice = (basePrice / baseCredits) * credits;
			let discount = Math.max(0, totalBasePrice - price); // Ensure discount is not negative

			if (selectedCurrency !== 'USD') {
				discount *= conversionRates[selectedCurrency];
			}

			document.getElementById('cost-per-day-unit').textContent = '/credit';
			discountMessage = discount > 0 ? `You are saving ${currencySymbol}${formatNumber(discount)} with this plan...` : 'This plan has the worst discount ratio.';
			discountDetailsElement.textContent = `The total payment is ${formatNumber(priceInSelectedCurrency)} ${selectedCurrency}.`;

			dailyPriceAmountElement.textContent = displayText;
			discountElement.textContent = discountMessage;
		} else {
			// Subscription mode
			const price = calculateSubPrice(value);
			const durationDays = durationsInDays[value - 1];
			dailyPriceAmount = durationDays > 0 ? Math.max(0, price / durationDays) : null;

			priceInSelectedCurrency = price;
			if (selectedCurrency !== 'USD') {
				priceInSelectedCurrency = price * conversionRates[selectedCurrency];
				if (dailyPriceAmount !== null) {
					dailyPriceAmount *= conversionRates[selectedCurrency];
				}
			}

			displayText = durationDays === -1 ? `${currencySymbol}${formatNumber(priceInSelectedCurrency)}` : `${currencySymbol}${formatNumber(dailyPriceAmount)}`;
			document.getElementById('cost-per-day-unit').textContent = '/day';

			if (durationDays === -1) {
				// Lifetime plan
				document.getElementById('cost-per-day-unit').textContent = '';
				discountMessage = 'The lifetime plan has the best ratio.';
				discountDetailsElement.textContent = '';
			} else {
				// Regular plans
				const daysInPeriod = durationsInDays[0]; // Assuming daily is always the first period
				const costForPeriod = prices[0] * (durationDays / daysInPeriod);
				let discount = costForPeriod - price;

				if (selectedCurrency !== 'USD') {
					discount *= conversionRates[selectedCurrency];
				}

				discountMessage = discount > 0 ? `You are saving ${currencySymbol}${formatNumber(discount)} with this plan...` : 'This plan has the worst discount ratio.';
				discountDetailsElement.textContent = `The total payment is ${formatNumber(priceInSelectedCurrency)} ${selectedCurrency}.`;
			}

			dailyPriceAmountElement.textContent = displayText;
			discountElement.textContent = discountMessage;
		}
	}

	function getCurrencySymbol(currency) {
		const symbols = {
			USD: '$',
			EUR: '€',
			GBP: '£',
			TRY: '₺'
		};
		return symbols[currency] || currency;
	}

	// Set event listeners for currency options
	currencyOptions.forEach(option => {
		option.addEventListener("click", () => {
			currencyOptions.forEach(opt => opt.classList.remove("selected"));
			option.classList.add("selected");

			selectedCurrency = option.getAttribute("data-currency");
			updatePrices();
		});
	});

	function updateSliderRange() {
		const isCreditsMode = creditsMode.classList.contains("selected");

		if (isCreditsMode) {
			sliderElement.max = credits.length;
		} else {
			sliderElement.max = durations.length;
		}

		// Ensure the current value is within the new range
		const currentValue = sliderElement.value;
		if (currentValue > sliderElement.max) {
			sliderElement.value = sliderElement.max;
		}
	}

	function updateSliderValue() {
		const value = sliderElement.value;
		const isCreditsMode = creditsMode.classList.contains("selected");
		if (isCreditsMode) {
			const creditAmount = calculateCredit(value);
			sliderElement.nextElementSibling.textContent = `${creditAmount} credit${creditAmount > 1 ? 's' : ''}`;
		} else {
			const selectedDuration = durations[value - 1];
			sliderElement.nextElementSibling.textContent = selectedDuration;
		}

		updatePrices();
	}

	sliderElement.addEventListener("input", updateSliderValue);

	subscriptionMode.addEventListener("click", () => {
		subscriptionMode.classList.add("selected");
		creditsMode.classList.remove("selected");
		updateSliderRange(); // Update slider range for subscription mode
		updateSliderValue();
	});

	creditsMode.addEventListener("click", () => {
		creditsMode.classList.add("selected");
		subscriptionMode.classList.remove("selected");
		updateSliderRange(); // Update slider range for credits mode
		updateSliderValue();
	});

	// Initial slider range update
	updateSliderRange();

	// Initial update
	updateSliderValue();

	// User clicked on purchase button
	purchase.addEventListener("click", async () => {
		await handleBuyNow();
	});

	// Function to handle charge creation and payment
	async function handleBuyNow() {
		{
			try {
				const user = await new Promise((resolve) => {
					const unsubscribe = auth.onAuthStateChanged((user) => {
						unsubscribe(); // Unsubscribe once we have the user object
						resolve(user);
					});
				});

				// Check the selected mode
				let selectedMode = '';
				if (subscriptionMode.classList.contains("selected")) {
					selectedMode = 'subscription';
				} else {
					selectedMode = 'credits';
				}

				// Check if the user is authenticated
				if (user) {
					const requestData = {
						userId: auth.currentUser.uid,
						userEmail: auth.currentUser.email,
						selectedCurrency: selectedCurrency,
						sliderElement: sliderElement.value,
						selectedMode: selectedMode,
					};

					if (selectedCurrency !== 'BTC') {
						const cardResponse = await fetch(serverAddressPAYTR + '/create-charge-2', {
							method: 'POST',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify(requestData)
						});

						const cardHtml = await cardResponse.text();
						if (cardHtml.error) {
							alert(cardHtml.error);
						} else {
							document.getElementById('paymentContainer').style.display = 'block';
							document.getElementById('paymentContainer').innerHTML = cardHtml;
						}
					} else {
						// Pay with coin.
						const coinResponse = await fetch(serverAddressAPI + '/create-charge-new', {
							method: 'POST',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify(requestData)
						});

						const coinData = await coinResponse.json();
						console.log('Response from server:', coinData);

						if (coinData.data && coinData.data.hosted_url) {
							// Open the Coinbase Commerce payment page in a new tab
							window.open(coinData.data.hosted_url, '_blank');
						} else {
							alert(coinData.error);
						}
					}
				}
			} catch (error) {
				console.error('Error checking referral:', error);
			}
		}
	}
});