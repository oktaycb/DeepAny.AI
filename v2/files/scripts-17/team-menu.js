window.addEventListener("load", event => {
    var swiperWrapper = document.querySelector('.swiper-wrapper');

    var team = [
	{
        name: "Duri Eun",
        role: "Owner",
        desc: "I like vodka and you :)",
        photo: "files/assets/profile.jpg",
        website: "https://www.bodyswap.me",
        email: "durieun02@gmail.com",
        linkedin: "",
        dribbble: ""
    },
	];

    var icons = [{
        iWebsite: "files/assets/link.svg",
        iEmail: "files/assets/email.svg",
        iLinkedin: "files/assets/linkedin.svg",
        iDribbble: "files/assets/dribbble.svg"
    }];

    var iWebsite = icons[0].iWebsite,
        iEmail = icons[0].iEmail,
        iLinkedin = icons[0].iLinkedin,
        iDribbble = icons[0].iDribbble;

    function addTeam() {
        for (let i = 0; i < team.length; i++) {
            var name = team[i].name,
                role = team[i].role,
                desc = team[i].desc,
                photo = team[i].photo,
                website = team[i].website,
                email = team[i].email,
                linkedin = team[i].linkedin,
                dribbble = team[i].dribbble;

            var template = `
                <div class="swiper-slide">
                    <div class="card">
                        <span class="bg"></span>
                        <span class="more"></span>
                        <figure class="photo"><img src="${photo}"></figure>
                        <article class="text">
                            <p class="name">${name}</p>
                            <p class="role">${role}</p>
                            <p class="desc">${desc}</p>
                        </article>
                        <div class="social">
                            <span class="pointer"></span>
                            <div class="icons">
                                <a class="icon" href="${website}" target="_blank" data-index="0"><img src="${iWebsite}"></a>
                                <a class="icon" href="${email}" target="_blank" data-index="1"><img src="${iEmail}"></a>
                                <a class="icon" href="${linkedin}" target="_blank" data-index="2"><img src="${iLinkedin}"></a>
                                <a class="icon" href="${dribbble}" target="_blank" data-index="3"><img src="${iDribbble}"></a>
                            </div>
                        </div>
                    </div>
                </div>`;

            swiperWrapper.insertAdjacentHTML('beforeend', template);
        }
    }

    addTeam();

    var mySwiper = new Swiper(".swiper-container", {
        direction: "horizontal",
        loop: false,
        centeredSlides: false,
        speed: 800,
        slidesPerView: 2,
        spaceBetween: 40,
        threshold: 5,

        pagination: {
            el: ".swiper-pagination",
            clickable: true
        },

        navigation: {
            nextEl: ".swiper-button-next",
            prevEl: ".swiper-button-prev"
        },

        breakpoints: {
            1180: {
                slidesPerView: 2,
                spaceBetween: 40,
                centeredSlides: false
            },
            799: {
                slidesPerView: 1,
                spaceBetween: 20,
                centeredSlides: true,
                loop: true
            }
        }
    });

    var btnShow = document.querySelectorAll('.more');

    btnShow.forEach(function (el) {
        el.addEventListener('click', showMore);
    });

    function showMore(event) {
        var card = event.target.closest(".swiper-slide");
        if (card.classList.contains('show-more')) {
            card.classList.remove('show-more');
        } else {
            card.classList.add('show-more');
        }
    }

    var icon = document.querySelectorAll('.icon');

    icon.forEach(function (el) {
        el.addEventListener("mouseenter", followCursor);
    });

    function followCursor(event) {
        var pointer = event.currentTarget.closest(".swiper-slide").querySelector('.pointer'),
            index = event.currentTarget.dataset.index,
            sizeIcon = 60 * index + 25;
        pointer.style.transform = `translateX(${sizeIcon}px)`;
    }
});