function googleTranslateElementInit() {
    new google.translate.TranslateElement({
        pageLanguage: 'en',
        autoDisplay: true
    }, 'google_translate_element');
}

(async function () {
    var userLanguage = navigator.language || navigator.userLanguage;
    if (userLanguage === 'en' || userLanguage === 'en-US')
        return;

    var translateDiv = document.createElement('div');
    translateDiv.id = 'google_translate_element';
    document.body.appendChild(translateDiv);

    function loadGoogleTranslateScript() {
        return new Promise((resolve) => {
            var script = document.createElement('script');
            script.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
            script.defer = true;
            script.onload = resolve;
            document.head.appendChild(script);
        });
    }

    await loadGoogleTranslateScript();

    function setTranslateSelectIndex() {
        return new Promise((resolve) => {
            var observer = new MutationObserver((mutationsList) => {
                for (const mutation of mutationsList) {
                    if (mutation.addedNodes.length > 0) {
                        var selectElement = document.querySelector("#google_translate_element select");
                        if (selectElement) {
                            selectElement.selectedIndex = 1; // Select browser default langugage. (0 is english)
                            selectElement.dispatchEvent(new Event('change'));
                            observer.disconnect();
                            resolve();
                        }
                    }
                }
            });

            observer.observe(document.body, { childList: true, subtree: true });
        });
    }

    await setTranslateSelectIndex();
})();
