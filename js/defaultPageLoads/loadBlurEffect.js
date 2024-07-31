export function loadBlurEffect(loadingScreen, mains, sidebar, navbar) {
    const speedBlurAmount = 1;
    const softBlurAmount = 8;
    const initialBlurAmount = 100 / softBlurAmount;
    const decreaseAmount = 1 / softBlurAmount;

    let load = 0;
    let interval = setInterval(loadBlurEffect, speedBlurAmount);

    function loadBlurEffect() {
        load++;
        if (load === initialBlurAmount / decreaseAmount)
            clearInterval(interval);

        const blurAmount = initialBlurAmount - (load * decreaseAmount);
        if (blurAmount < 0)
            return;

        if (loadingScreen) {
            if (blurAmount > 0) {
                loadingScreen.style.filter = `blur(${blurAmount}px)`;
            } else {
                loadingScreen.removeAttribute('style');
            }
        }

        if (sidebar)
            sidebar.style.filter = `blur(${blurAmount}px)`;

        if (navbar)
            navbar.style.filter = `blur(${blurAmount}px)`;

        if (mains && mains.length > 0) {
            mains.forEach((main) => {
                main.style.filter = `blur(${blurAmount}px)`;
            });
        }
    }
}