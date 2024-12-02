import { auth, usersRef } from '../scripts-17/firebase-config.js';

// Password recovery form
var passwordRecoveryForm = document.getElementById("passwordRecoveryForm");
var recoveryMessage = document.getElementById("recoveryMessage");

passwordRecoveryForm.addEventListener("submit", function(event) {
  event.preventDefault();
  var recoveryEmail = document.getElementById("recoveryEmail").value;

  auth.sendPasswordResetEmail(recoveryEmail)
    .then(function() {
      // Password recovery email sent successfully
      console.log("Password recovery email sent to:", recoveryEmail);
      recoveryMessage.innerHTML = '<p class="success-message">Password recovery email sent successfully. Please check your inbox.</p>';
      recoveryMessage.style.display = "block";
    })
    .catch(function(error) {
      // Handle errors
      console.error("Password recovery email error:", error);
      recoveryMessage.innerHTML = '<p class="error-message">Password recovery email could not be sent. Please check your email address and try again.</p>';
      recoveryMessage.style.display = "block";
    });
});