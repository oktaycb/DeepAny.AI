document.addEventListener('DOMContentLoaded', function () {
	const mainContainers = document.querySelectorAll('.main-container');

	function sizeBasedElements() {
		mainContainers.forEach((mainContainer, index) => {
			mainContainer.innerHTML = '';

			switch (index) {
				case 0:
                    mainContainer.insertAdjacentHTML('afterbegin', `
					<div class="main-container">   
					
					<h1>Admin Panel</h1>    
					<div class="background-container">
					<a class="background-dot-container">
						<div class="background-dot-container-content">
							<div class="background-dot-container-header">
								<h4 class="plans-name">User Management</h4>
								<h4 class="plans-popular">Settings</h4>
							</div>
							<div class="line"></div>

<div class="search-wrapper">
  <form>
  <input type="text" name="focus" required class="search-box" placeholder="Enter search term" />
    <button class="close-icon" type="reset"></button>
  </form>
</div>
					<table cellspacing="0" cellpadding="0" class="user-table">
   		<tr id="user-table-top">
      <th>
         <h4>Name</h4>
      </th>
      <th>
         <h4>Email</h4>
      </th>
      <th>
         <h4>Sub Lenght</h4>
      </th>
	  <th>
	  <h4>Coin</h4>
   </th>
      <th>
         <h4>Edit user</h4>
      </th>
      <th>
         <h4>Delete</h4>
      </th>
   </tr>
   <tr>
      <th>
         <h5>Hannah West</h5>
      </th>
      <th>
         <h5>hannah_west@example.com</h5>
      </th>
      <th>
         <h5>Lifetime</h5>
      </th>
	  <th>
		 <h5> </h5>
	  </th>
      <th><button class="manage-button" ></button></th>
      <th><button class="manage-button" ></button>
      </th>
   </tr>
   <tr>
      <th>
         <h5>Edward Rios</h5>
      </th>
      <th>
         <h5>Edward@example.com</h5>
      </th>
      <th>
         <h5>7 Days left</h5>
      </th>
	  <th>
	  <h5> </h5>
   </th>
      <th><button class="manage-button" ></button></th>
      <th><button class="manage-button" ></button>
      </th>
   </tr>
   <tr>
      <th>
         <h5>William Crawford</h5>
      </th>
      <th>
         <h5>william_86@example.com</h5>
      </th>
      <th>
         <h5>3 months left</h5>
      </th>
	  <th>
	  <h5> </h5>
   </th>
      <th><button class="manage-button" ></button></th>
      <th><button class="manage-button" ></button>
      </th>
   </tr>
   <tr>
      <th>
         <h5>Doris Gray</h5>
      </th>
      <th>
         <h5>Doris6@example.com</h5>
      </th>
      <th>
         <h5>1 Day left</h5>
      </th>
	  <th>
	  <h5> </h5>
   </th>
      <th><button class="manage-button" ></button></th>
      <th><button class="manage-button" ></button>
      </th>
   </tr>
   <tr>
      <th>
         <h5>Sharon Richards</h5>
      </th>
      <th>
         <h5>sharon_91@example.com</h5>
      </th>
      <th>
         <h5>1 years left</h5>
      </th>
	  <th>
	  <h5> </h5>
   </th>
      <th><button class="manage-button" ></button></th>
      <th><button class="manage-button" ></button>
      </th>
   </tr>
   <tr>
      <th>
         <h5>Andrew Matthews</h5>
      </th>
      <th>
         <h5>andrew84@example.com</h5>
      </th>
      <th>
         <h5>1 years (15D freezed)</h5>
      </th>
	  <th>
	  <h5> </h5>
   </th>
      <th><button class="manage-button" ></button></th>
      <th><button class="manage-button" ></button>
      </th>
   </tr>
</table>
				</div>
									`);
					break;
			}
		});
	}

	sizeBasedElements();

	window.addEventListener('resize', sizeBasedElements);
});