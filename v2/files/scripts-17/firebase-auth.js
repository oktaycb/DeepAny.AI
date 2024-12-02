import { auth, usersRef, paymentsRef, serversRef } from '../scripts-17/firebase-config.js';

// Function to display a list of payments for a user
function displayUserPayments(userId) {
  const paymentList = document.getElementById('paymentList');
  if (!paymentList)
  {
	return;
  }
  
  console.log("Displaying payments for user:", userId);

  // Query payments collection for payments with the given userId
  paymentsRef
    .where('userId', '==', userId)
    .get()
    .then((querySnapshot) => {
      console.log("Query snapshot:", querySnapshot);
      paymentList.innerHTML = ''; // Clear existing list

      querySnapshot.forEach((doc) => {
        const paymentData = doc.data();
        console.log("Payment data:", paymentData);

        const paymentItem = document.createElement('li');
        paymentItem.textContent = `Amount: ${paymentData.amount} | Status: ${paymentData.status} | Timestamp: ${paymentData.timestamp.toDate()}`;
        paymentList.appendChild(paymentItem);
      });

      // Add real-time listener for updates to payment status
      querySnapshot.docChanges().forEach((change) => {
        if (change.type === 'modified') {
          const paymentData = change.doc.data();
          const paymentItem = document.querySelector(`#paymentItem_${change.doc.id}`);
          paymentItem.textContent = `Amount: ${paymentData.amount} | Status: ${paymentData.status} | Timestamp: ${paymentData.timestamp.toDate()}`;
        }
      });
    })
    .catch((error) => {
      console.error('Error fetching payments:', error);
    });
}

async function getUserInfo(userData) {
    var userInfo = userData.username;
    if ((userData.credits || 0) + (userData.dailyCredits || 0) > 0) {
        userInfo += " | Credits: " + (userData.credits || 0);
		
		if ((userData.dailyCredits || 0)) 
			userInfo += " + " + (userData.dailyCredits || 0);
    }
	
	if (userData.deadline) {
		const currentDate = new Date();
		console.log("Current Date:", currentDate);

		const deadlineDate = userData.deadline.toDate();
		console.log("Converted Deadline Date:", deadlineDate);

		if (deadlineDate >= currentDate) 
			userInfo += " | Deadline: " + deadlineDate.toLocaleDateString();
	}
	
    return userInfo;
}

async function updateLoggedInMessage(userInfo) {
    var loggedInMessage = document.getElementById("loggedInMessage");
    loggedInMessage.style.display = "block";
    loggedInMessage.innerText = userInfo;
}

function generateUniqueId() {
	var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789%^&*()_-+=';
	var uniqueId = '';

	for (var i = 0; i < 12; i++) {
		var randomIndex = Math.floor(Math.random() * characters.length);
		uniqueId += characters.charAt(randomIndex);
	}

	return uniqueId;
}

// Listen for authentication state changes
auth.onAuthStateChanged(async function (user) {
  const priceSectionStandart = document.getElementById("priceSectionStandart");
  const priceSectionPremium = document.getElementById("priceSectionPremium");
  const sendVerificationButton = document.getElementById('sendVerificationButton');
  const referral = document.getElementById('referral');

  // Create a wrapper function to use async/await
  async function handleUserState(user) {
    if (user) {
      const userId = user.uid;

      try {
        const doc = await usersRef.doc(userId).get();

        if (doc.exists) {
          console.log("Document found: ", user.email);
          const userData = doc.data();
          const userInfo = await getUserInfo(userData);
          await updateLoggedInMessage(userInfo);
        } else {
          console.log("Document doesn't exist, creating a new one: ", user.displayName);

          // Collect browser fingerprint data (example using FingerprintJS library)
          // const fingerprintData = await Fingerprint2.getPromise();
          // const visitorId = fingerprintData.visitorId;

          // Obtain the user's IP address
          let userInternetProtocolAddress;
          try {
            const response = await fetch('https://api64.ipify.org?format=json');
            const data = await response.json();
            userInternetProtocolAddress = data.ip;
          } catch (error) {
            console.error('Error fetching IP address:', error);
            userInternetProtocolAddress = null;
          }

          // Generate a UniqueID and store it in a cookie
		  var storedUniqueId = localStorage.getItem('uniqueUserBrowserRegisterId');
		  if (!storedUniqueId) {
			var newUniqueId = await generateUniqueId();
			localStorage.setItem('uniqueUserBrowserRegisterId', newUniqueId);
		  }
		  
		  if (referral) {
			console.log('referral:', referral.value);
		  }
		  
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

          const response = await fetch(serverAddressAPI + '/create-user', {
            method: 'POST',
            headers: {
			  'ngrok-skip-browser-warning': 'true',
			  'bypass-tunnel-reminder': 'true',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId: userId,
              email: user.email,
              username: user.displayName,
              //visitorId: visitorId,
              userInternetProtocolAddress: userInternetProtocolAddress,
              uniqueId: localStorage.getItem('uniqueUserBrowserRegisterId'),
              referral: referral ? referral.value : null,
            }),
          });
		  
          const data = await response.json();
          console.log(data.message);
        }
      } catch (error) {
        console.error("Error getting user document:", error);
      }

      if (!user.emailVerified) {
        document.getElementById("emailVerificationMessage").style.display = "block";
        document.getElementById("emailVerificationMessage").innerText = "Please check your inbox for a verification email.";
        sendVerificationButton.style.display = "block";

        if (priceSectionStandart) {
          priceSectionStandart.textContent = "Verify E-Mail";
          priceSectionStandart.href = "https://mail.google.com/mail";  // Replace with the actual link
        }

        if (priceSectionPremium) {
          priceSectionPremium.textContent = "Verify E-Mail";
          priceSectionPremium.href = "https://mail.google.com/mail";  // Replace with the actual link
        }

        user.sendEmailVerification();
      } else {
        displayUserPayments(userId);

        if (priceSectionStandart) {
          priceSectionStandart.textContent = "Buy Now";
          priceSectionStandart.addEventListener('click', function () {
            handleBuyNow(userId, 1, 1);
          });
        }

        sendVerificationButton.style.display = "none";

        if (priceSectionPremium) {
          priceSectionPremium.textContent = "Buy Now";
          priceSectionPremium.addEventListener('click', function () {
            handleBuyNow(userId, 5, 5);
          });
        }

        document.getElementById("emailVerificationMessage").style.display = "none";
        document.getElementById("emailVerificationMessage").innerText = "";
      }

      document.getElementById("logoutButton").style.display = "block";
      document.getElementById("loginLink").style.display = "none";
      document.getElementById("registerLink").style.display = "none";
    } else {
      const paymentList = document.getElementById('paymentList');
      if (paymentList)
        paymentList.innerHTML = '';

      sendVerificationButton.style.display = "none";

      if (priceSectionStandart) {
        priceSectionStandart.textContent = "Sign Up";
        priceSectionStandart.href = "register.html";  // Replace with the actual link
      }

      if (priceSectionPremium) {
        priceSectionPremium.textContent = "Sign Up";
        priceSectionPremium.href = "register.html";  // Replace with the actual link
      }

      document.getElementById("loggedInMessage").style.display = "none";
      document.getElementById("loggedInMessage").innerText = "";

      document.getElementById("loginLink").style.display = "block";
      document.getElementById("registerLink").style.display = "block";
      document.getElementById("logoutButton").style.display = "none";

      document.getElementById("emailVerificationMessage").style.display = "none";
      document.getElementById("emailVerificationMessage").innerText = "";
    }
  }

  // Call the wrapper function
  await handleUserState(user);
});

sendVerificationButton.addEventListener('click', async () => {
	try {
		const user = auth.currentUser;
		if (user) {
			await user.sendEmailVerification();
			console.log("Email verification sent to:", user.email);
		}
	} catch (error) {
		console.error('Error sending email verification:', error);
	}
});
			
// Log out button functionality
var logoutButton = document.getElementById("logoutButton");
logoutButton.addEventListener("click", function() {
  auth.signOut()
    .then(function() {
      // Clear UI and reset to the initial state
      console.log("User logged out successfully.");
    })
    .catch(function(error) {
      console.error("Logout error:", error);
    });
});