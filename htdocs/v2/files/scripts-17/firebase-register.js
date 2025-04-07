import { auth, usersRef, serversRef } from '../scripts-17/firebase-config.js';

const $ = (s, o = document) => o.querySelector(s);
const $$ = (s, o = document) => o.querySelectorAll(s);

const signupForm = $('#signup-form');
signupForm.addEventListener('submit', async (event) => {
  event.preventDefault();
});

const passwordContainer = $('.password', signupForm);
const password = $('input', passwordContainer);
const passwordList = $('.dots', passwordContainer);

const submit = document.getElementById("submit");
const google = document.getElementById("google");

function generateUniqueId() {
	var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789%^&*()_-+=';
	var uniqueId = '';

	for (var i = 0; i < 12; i++) {
		var randomIndex = Math.floor(Math.random() * characters.length);
		uniqueId += characters.charAt(randomIndex);
	}

	return uniqueId;
}

password.addEventListener('input', e => {
  if (password.value.length > $$('i', passwordList).length) {
    passwordList.appendChild(document.createElement('i'));
  }
  submit.disabled = !password.value.length;
  passwordContainer.style.setProperty('--cursor-x', password.value.length * 10 + 'px');
});

let pressed = false;

password.addEventListener('keydown', e => {
  if (pressed || signupForm.classList.contains('processing') || password.value.length > 14 && e.keyCode != 8 && e.keyCode != 13) {
    e.preventDefault();
  }
  pressed = true;
  setTimeout(() => pressed = false, 50);
  if (e.keyCode == 8) {
    let last = $('i:last-child', passwordList);
    if (last !== undefined && last) {
      last.classList.add('remove');
      setTimeout(() => last.remove(), 50);
    }
  }
});

password.addEventListener('select', function () {
  this.selectionStart = this.selectionEnd;
});

// Initialize Google Sign-In
google.addEventListener("click", async (event) => {
  event.preventDefault();
  
  if (!signupForm.classList.contains('processing')) {
    signupForm.classList.add('processing');

    try {
      var provider = new firebase.auth.GoogleAuthProvider();
      const result = await auth.signInWithPopup(provider);

      // Handle the successful sign-in, update UI, etc.
      console.log("Google sign-in successful:", result.user);
	  
	  // Display username.
      document.getElementById("username").innerText = result.user.displayName || result.user.email;

	  // Its a succes.
      signupForm.classList.remove('processing', 'error');
    } catch (error) {
      // Handle errors
      console.error("Google sign-in error:", error);

	  // Its a failure.
      signupForm.classList.remove('processing');
      signupForm.classList.add('error');
      setTimeout(() => {
        signupForm.classList.remove('error');
      }, 2000);
    }
  }
});

submit.addEventListener('click', async (event) => {
  event.preventDefault();
  
  if (!signupForm.classList.contains('processing')) {
    signupForm.classList.add('processing');
	
	const email = document.getElementById("email").value;
    console.log('email:', email);
	
	const referral = document.getElementById("referral").value;
    console.log('referral:', referral);
	
	const username = document.getElementById("username").value;
    console.log('username:', username);
	
	const password = document.getElementById("password").value;
    console.log('password:', password);
		
    // Collect browser fingerprint data (example using FingerprintJS library)
    //const fingerprintData = await new Fingerprint2.getPromise();
    //const visitorId = fingerprintData.visitorId;

    // Obtain the user's IP address
    const userIpAddress = await fetch('https://api64.ipify.org?format=json')
      .then((response) => response.json())
      .then((data) => data.ip)
      .catch((error) => {
        console.error('Error fetching IP address:', error);
        return null;
      });

      // Generate a UniqueID and store it in a cookie (as shown in the previous responses)
	  var storedUniqueId = localStorage.getItem('uniqueUserBrowserRegisterId');
	  if (!storedUniqueId) {
		var newUniqueId = await generateUniqueId();
		localStorage.setItem('uniqueUserBrowserRegisterId', newUniqueId);
	  }
	  
      // Create the registration request with visitorId, userIpAddress, and UniqueID
      const requestData = {
        email,
        password,
        username,
        referral,
        userIpAddress,
        uniqueId: localStorage.getItem('uniqueUserBrowserRegisterId'),
      };
	
		async function fetchServerAddressAPI() {
			const serverDoc = await serversRef.doc('3050-1').get();
			if (serverDoc.exists) {
				const serverAddress = serverDoc.data()['serverAdress-API'];
				return serverAddress || null;
			} else {
				return null; // Handle the case where the document doesn't exist
			}
		}

		// Use the function to fetch the server address
		const serverAddressAPI = await fetchServerAddressAPI();
		console.log('Fetched server address (API):', serverAddressAPI);

	  try {
		const response = await fetch(serverAddressAPI + '/register', {
		  method: 'POST',
		  headers: {
			'ngrok-skip-browser-warning': 'true',
			'bypass-tunnel-reminder': 'true',
			'Content-Type': 'application/json',
		  },
		  body: JSON.stringify(requestData),
		});

		if (response.ok) {
		  console.log('User registered successfully');
		  
		  // Perform any necessary actions after successful registration
		  const cls = 'success';
		  signupForm.classList.add(cls);

		  setTimeout(() => {
			signupForm.classList.remove('processing', cls);
			if (cls === 'error') {
			  document.getElementById("password").value = '';
			  // Assuming you have a passwordList and submit element references
			  passwordList.innerHTML = '';
			  submit.disabled = true;
			}
		  }, 2000);

		  setTimeout(() => {
			if (cls === 'error') {
			  // Assuming you have a passwordContainer reference
			  passwordContainer.style.setProperty('--cursor-x', 0 + 'px');
			}
		  }, 600);
		  
		  // Redirect to login.html after a 2-second delay
		  setTimeout(() => {
			window.location.href = 'login.html';
		  }, 3000);
		} else {
		  const errorData = await response.json();
		  console.error('Error registering user:', errorData.error);
		  
		  // Display error message
		  const errorMessageElement = $('#error-message');
		  errorMessageElement.textContent = errorData.error.message; // Use the specific error message from the API

		  // Display error message to the user
		  const cls = 'error';
		  signupForm.classList.add(cls);
		  
		  setTimeout(() => {
			signupForm.classList.remove('processing', cls);
			  document.getElementById("password").value = '';
			  passwordList.innerHTML = '';
			  submit.disabled = true;
		  }, 2000);

		  setTimeout(() => {
			  passwordContainer.style.setProperty('--cursor-x', 0 + 'px');
		  }, 600);
		}
	  } 
	  catch (error) {
		console.error('Error sending registration request:', error);
		
		// Display error message
		const errorMessageElement = $('#error-message');
		errorMessageElement.textContent = error.message; // Use the specific error message from the API

		// Display error message to the user
		const cls = 'error';
		signupForm.classList.add(cls);
		
		setTimeout(() => {
			signupForm.classList.remove('processing', cls);
			document.getElementById("password").value = '';
			passwordList.innerHTML = '';
			submit.disabled = true;
		}, 2000);

		setTimeout(() => {
			passwordContainer.style.setProperty('--cursor-x', 0 + 'px');
		}, 600);
	  }
    }
});