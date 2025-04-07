let translationCompleted = false;
let isTranslating = false;

const cached = 'cached_translate';
const translate = 'translate';

function callEvent(event) {
    window.dispatchEvent(new Event(event));
}

function googleTranslateElementInit() {
    new google.translate.TranslateElement({
        pageLanguage: 'en',
        autoDisplay: true
    }, 'google_translate_element');
}

function loadGoogleTranslateScript() {
    return new Promise((resolve, reject) => {
        if (document.querySelector('script[src*="translate.google.com/translate_a/element.js"]')) {
            resolve();
            return;
        }

        var script = document.createElement('script');
        script.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
        script.defer = true;
        script.onload = resolve;
        script.onerror = () => reject(new Error('Failed to load Google Translate script'));
        document.head.appendChild(script);
    });
}

function setTranslateSelectIndex() {
    return new Promise((resolve) => {
        var observer = new MutationObserver((mutationsList) => {
            for (const mutation of mutationsList) {
                if (mutation.addedNodes.length > 0) {
                    var selectElement = document.querySelector("#google_translate_element select");
                    if (selectElement) {
                        selectElement.selectedIndex = 1;
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

function removeGoogleTranslateFontTags() {
    const fontTags = document.querySelectorAll('font[style*="vertical-align: inherit"]');
    const fontTagsArray = Array.from(fontTags);
    fontTagsArray.forEach(fontTag => {
        while (fontTag.firstChild) {
            fontTag.parentNode.insertBefore(fontTag.firstChild, fontTag);
        }
        fontTag.parentNode.removeChild(fontTag);
    });
    return fontTagsArray.length > 0;
}

function attemptFontTagRemoval(attempt = 1) {
    const foundTags = removeGoogleTranslateFontTags();
    if (attempt < 989) {
        setTimeout(() => {
            attemptFontTagRemoval(attempt + 1);
        }, 500);
    }
}

function getTextNodes(node) {
    let textNodes = [];

    if (node.nodeType === Node.ELEMENT_NODE) {
        if (node.tagName.toLowerCase() === 'script' ||
            node.tagName.toLowerCase() === 'style' ||
            node.getAttribute('translate') === 'no') {
            return textNodes;
        }

        if (node.hasAttribute('title')) {
            textNodes.push(document.createTextNode(node.getAttribute('title')));
        }
    }

    for (let i = node.childNodes.length - 1; i >= 0; i--) {
        textNodes = textNodes.concat(getTextNodes(node.childNodes[i]));
    }

    if (node.nodeType === Node.TEXT_NODE && node.nodeValue) {
        textNodes.push(node);
    }

    return textNodes;
}

function blockGoogleTranslateAPICalls(pageName) {
    const originalXhrOpen = XMLHttpRequest.prototype.open;
    let observer;

    XMLHttpRequest.prototype.open = function (method, url) {
        if (url.includes('translate')) {
            if (!translationCompleted) {
                document.getElementById('google_translate_element')?.remove();
                document.getElementById('goog-gt-tt')?.remove();
                document.querySelectorAll('.VIpgJd-ZVi9od-aZ2wEe-wOHMyf, .VIpgJd-ZVi9od-xl07Ob-OEVmcd').forEach(element => element.remove());

                function updateLocalStorageWithUniqueData(suffix) {
                    let text = getTextNodes(document.body)
                        .filter(node => node.nodeValue && node.nodeValue.trim() !== '')
                        .map((node, index) => `${node.nodeValue.trim()} (${index})`)
                        .join(',');

                    let existingData = localStorage.getItem(pageName + suffix) || '';
                    let newData = existingData ? existingData + ',' + text : text;
                    let uniqueData = [...new Set(newData.split(','))].join(',');
                    localStorage.setItem(pageName + suffix, uniqueData + (uniqueData ? ',' : ''));
                }

                updateLocalStorageWithUniqueData('-untranslated');

                observer = new MutationObserver((mutations) => {
                    let textChanged = false;

                    mutations.forEach(mutation => {
                        if (mutation.type === 'characterData' && mutation.target.nodeValue.trim() !== '') {
                            textChanged = true;
                        }
                    });

                    if (textChanged) {
                        attemptFontTagRemoval(3);
                        updateLocalStorageWithUniqueData('-translated');
                        translationCompleted = true;
                        isTranslating = false;
                        observer.disconnect();
                        callEvent(cached);
                    }
                });

                observer.observe(document.body, { childList: true, subtree: true, characterData: true });
            } else {
                return;
            }
        }

        return originalXhrOpen.apply(this, arguments);
    };
}

function getPageName() {
    const url = window.location.pathname;
    const pathArray = url.split('/');
    return pathArray[pathArray.length - 1] || 'default';
}

async function initializeTranslation() {
    try {
        var userLanguage = navigator.language || navigator.userLanguage;
        if (userLanguage === 'en' || userLanguage === 'en-US') return;

        const pageName = getPageName();

        window.addEventListener(translate, async () => {
            translationCompleted = false;
            if (isTranslating)
                return;
            isTranslating = true;

            if (!document.getElementById('google_translate_element')) {
                var translateDiv = document.createElement('div');
                translateDiv.id = 'google_translate_element';
                document.body.appendChild(translateDiv);
            }

            await loadGoogleTranslateScript();
            await setTranslateSelectIndex();
            await blockGoogleTranslateAPICalls(pageName);
        });

        let nodeText = [];

        window.addEventListener(cached, () => {
            const translatedText = localStorage.getItem(pageName + "-translated");
            const untranslatedText = localStorage.getItem(pageName + "-untranslated");
            const translatedArray = translatedText ? translatedText.split('),').map(item => item.trim() + ')') : [];
            const untranslatedArray = untranslatedText ? untranslatedText.split('),').map(item => item.trim() + ')') : [];
            const checkTranslation = translatedText && untranslatedText && translatedArray.length === untranslatedArray.length && !translationCompleted;

            const nonEmptyTextNodes = getTextNodes(document.body).filter(node => node.nodeValue && node.nodeValue.trim() !== '');
            nonEmptyTextNodes.forEach((node, index) => {
                if (!translationCompleted)
                    nodeText[index] = node.nodeValue.trim();

                function setTranslationState(shouldTranslate = false) {
                    const parent = node.parentElement;
                    if (parent && !parent.hasAttribute('translate')) {
                        parent.translate = shouldTranslate;
                        if (!shouldTranslate) {
                            parent.setAttribute("default", nodeText[index]);
                        }
                    }
                }

                if (translationCompleted)
                    setTranslationState();
                else if (checkTranslation) {
                    const match = untranslatedArray.find(item => nodeText[index] === item.match(/^(.*?)(\s*\(\d+\))$/)?.[1]?.trim());
                    if (match) {
                        setTranslationState();
                        const translatedValue = translatedArray[untranslatedArray.indexOf(match)].replace(/\(\d+\)$/, '').trim();
                        node.nodeValue = translatedValue;
                        document.querySelectorAll(`[title="${nodeText[index]}"]`).forEach(element => {
                            element.title = translatedValue;
                            element.translate = false;
                        });
                    } else {
                        setTranslationState(true);
                    }
                }
            });
        });

        callEvent(cached);

        if (!localStorage.getItem(pageName + "-translated"))
            callEvent(translate);

        const observer = new MutationObserver((mutations) => {
            const hasRelevantMutation = mutations.some(mutation =>
                (mutation.type === 'childList' && mutation.addedNodes.length > 0) ||
                (mutation.type === 'characterData' && mutation.target.nodeValue.trim() !== '')
            );

            if (hasRelevantMutation) {
                observer.disconnect();
                callEvent(cached);
            }

            if (document.body.querySelector('[translate="yes"]')) {
                observer.disconnect();
                callEvent(translate);
            }
        });

        observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    } catch (error) {
        console.error('Translation initialization error:', error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Retrieve the saved state; default to "true" if not set.
    let translationEnabled = localStorage.getItem('translationEnabled');
    if (translationEnabled === null) {
        translationEnabled = "true";
        localStorage.setItem('translationEnabled', translationEnabled);
    }
    const isEnabled = translationEnabled === "true";

    if (isEnabled) {
        initializeTranslation();
    }

    // Helper: Attach toggle listener to the button if not already attached.
    function attachToggleListener(button) {
        if (!button.dataset.listenerAttached) {
            button.addEventListener('click', () => {
                const current = localStorage.getItem('translationEnabled') === "true";
                localStorage.setItem('translationEnabled', (!current).toString());
                location.reload(); // Refresh to apply the new state
            });
            button.dataset.listenerAttached = "true";
        }
    }

    // Attach listener to any existing toggleTranslation button(s)
    document.querySelectorAll('.toggleTranslation').forEach(attachToggleListener);

    // Observe for dynamically added elements containing the toggle button.
    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    // If the added node itself is the toggle button
                    if (node.matches('.toggleTranslation')) {
                        attachToggleListener(node);
                    }
                    // Also check within its descendants
                    node.querySelectorAll('.toggleTranslation').forEach(attachToggleListener);
                }
            });
        });
    });

    observer.observe(document.body, { childList: true, subtree: true });
});