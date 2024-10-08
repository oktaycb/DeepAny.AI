import { auth, usersRef } from '../scripts-17/firebase-config.js';

const $ = (s, o = document) => o.querySelector(s);
const $$ = (s, o = document) => o.querySelectorAll(s);

const loginForm = $('#login-form');
loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
});

const passwordContainer = $('.password', loginForm);
const password = $('input', passwordContainer);
const passwordList = $('.dots', passwordContainer);

const submit = document.getElementById("submit");
const google = document.getElementById("google");

const resetPasswordButton = $('#resetPasswordButton');

password.addEventListener('input', e => {
  if (password.value.length > $$('i', passwordList).length) {
    passwordList.appendChild(document.createElement('i'));
  }
  submit.disabled = !password.value.length;
  passwordContainer.style.setProperty('--cursor-x', password.value.length * 10 + 'px');
});

let pressed = false;

password.addEventListener('keydown', e => {
  if (pressed || loginForm.classList.contains('processing') || password.value.length > 14 && e.keyCode != 8 && e.keyCode != 13) {
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

resetPasswordButton.addEventListener("click", async (event) => {
  event.preventDefault();

  const emailInput = $('#email'); // Get the email input element
  const email = emailInput.value; // Retrieve the user's email from the input

  try {
    // Send a password reset email
    await auth.sendPasswordResetEmail(email);

    // Display an error message
    console.log("Password recovery email sent to:", email);
	
    // Display a message to the user
    alert("A password reset email has been sent to your email address.");
  } catch (error) {
    // Handle error, e.g., display an error message
    console.error("Error sending password reset email:", error);
    alert("An error occurred while sending the password reset email. Please try again later.");
  }
});

submit.addEventListener('click', async (event) => {
  event.preventDefault();

  if (!loginForm.classList.contains('processing')) {
    loginForm.classList.add('processing');

    try {
	  const email = document.getElementById("email").value;
      console.log('email:', email);
	
	  const password = document.getElementById("password").value;
      console.log('password:', password);
	
      // Sign in using Firebase Authentication
      const userCredential = await auth.signInWithEmailAndPassword(email, password);

      const cls = 'success';
      loginForm.classList.add(cls);

      setTimeout(() => {
        loginForm.classList.remove('processing', cls);
      }, 2000);

      const user = userCredential.user;
      console.log("User logged in:", user);
	  
	  // Redirect to login.html after a 2-second delay
	  setTimeout(() => {
		window.location.href = '../index.html';
	  }, 3000);
    } catch (error) {
      const errorCode = error.code;
      const errorMessage = error.message;
      console.error("Error during login:", errorCode, errorMessage);
	  
	  // Show the reset password link
	  const resetPasswordLink = document.getElementById("resetPasswordLink");
	  resetPasswordLink.style.display = "block";
  
      const cls = 'error';
      loginForm.classList.add(cls);
      setTimeout(() => {
        loginForm.classList.remove('processing', cls);
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

// Initialize Google Sign-In
google.addEventListener("click", async (event) => {
  event.preventDefault();
  
  if (!loginForm.classList.contains('processing')) {
    loginForm.classList.add('processing');

    try {
      var provider = new firebase.auth.GoogleAuthProvider();
      const result = await auth.signInWithPopup(provider);

      // Handle the successful sign-in, update UI, etc.
      console.log("Google sign-in successful:", result.user);
	  
	  // Its a succes.
      loginForm.classList.remove('processing', 'error');		

	  // Redirect to login.html after a 2-second delay
	  setTimeout(() => {
		window.location.href = '../index.html';
	  }, 3000);
    } catch (error) {
      // Handle errors
      console.error("Google sign-in error:", error);

	  // Its a failure.
      loginForm.classList.remove('processing');
      loginForm.classList.add('error');
      setTimeout(() => {
        loginForm.classList.remove('error');
      }, 2000);
    }
  }
});