let hashChange = undefined;
let currentPageUid = undefined;
var bannerHeight, key;
var bannerGradient = false;
var bannerPlacement = false;
const pixabayCache = new Map();
const PIXABAY_CACHE_STORAGE_KEY = "bh-pixabay-cache-v1";
const PIXABAY_PER_PAGE = 200;
const PIXABAY_MIN_UNUSED = 12;
const PIXABAY_MAX_USED_IDS = 1000;
const PIXABAY_MAX_PAGES = 3;
const LEGACY_CACHE_STORAGE_KEY = "bh-legacy-checked-v1";
const LEGACY_CACHE_MAX = 1000;
const LEGACY_CACHE_TTL_MS = 14 * 24 * 60 * 60 * 1000;
const LEGACY_LOG = false;
let legacyCheckedCache = new Map();
let legacyCacheSaveTimer = null;
let legacyCacheDirty = false;

export default {
    onload: ({ extensionAPI }) => {
        const config = {
            tabTitle: "Banner Headings",
            settings: [
                {
                    id: "bh-height",
                    name: "Banner height",
                    description: "Banner height in pixels",
                    action: { type: "input", placeholder: "150", onChange: (evt) => checkBanner({ height: evt.target.value }) },
                },
                {
                    id: "bh-gradient",
                    name: "Gradient to bottom",
                    description: "Apply gradient top to bottom",
                    action: { type: "switch", onChange: (evt) => checkBanner({ gradient: evt.target.checked }) },
                },
                {
                    id: "bh-placement",
                    name: "Place in Roam topbar",
                    description: "Turn on to place the banner within the topbar so it remains fixed. Keep off to scroll the image with the page content",
                    action: { type: "switch", onChange: (evt) => checkBanner({ placement: evt.target.checked }) },
                },
                {
                    id: "bh-unsplash-accessKey",
                    name: "Unsplash Access key",
                    description: "Your Access Key from https://unsplash.com/oauth/applications",
                    action: { type: "input", placeholder: "Add Unsplash Access key here" },
                },
                {
                    id: "bh-random",
                    name: "Theme for Random Unsplash image",
                    description: "Unsplash image from <YOUR THEME>. e.g. nature",
                    action: { type: "input", placeholder: "nature", onChange: () => checkBanner() },
                },
                {
                    id: "bh-pixabay-apiKey",
                    name: "Pixabay API key",
                    description: "Your API key from https://pixabay.com/api/docs/",
                    action: { type: "input", placeholder: "Add Pixabay API key here" },
                },
                {
                    id: "bh-random-pixabay",
                    name: "Theme for Random Pixabay image",
                    description: "Pixabay image from <YOUR THEME>. e.g. nature",
                    action: { type: "input", placeholder: "nature", onChange: () => checkBanner() },
                },
            ]
        };
        extensionAPI.settings.panel.create(config);
        loadPixabayCache();
        loadLegacyCheckedCache();
        setCurrentPageUid();

        extensionAPI.ui.commandPalette.addCommand({
            label: "Set Banner from Clipboard",
            callback: () => setBannerClip()
        });
        extensionAPI.ui.commandPalette.addCommand({
            label: "Remove Banner",
            callback: () => removeBanner()
        });
        extensionAPI.ui.commandPalette.addCommand({
            label: "Set random Banner from Unsplash",
            callback: () => setRandomBanner()
        });
        extensionAPI.ui.commandPalette.addCommand({
            label: "Set random Banner from Pixabay",
            callback: () => setRandomBannerPixabay()
        });

        hashChange = async (e) => {
            checkBanner();
        };
        window.addEventListener('hashchange', hashChange);

        async function checkBanner(overrides = {}) {
            await setCurrentPageUid();
            const pageUid = currentPageUid;

            if (!pageUid) return;

            breakme: {
                const overrideHeight = overrides.height;
                if (overrideHeight || extensionAPI.settings.get("bh-height")) {
                    const regex = /^\d{1,3}$/;
                    const candidateHeight = overrideHeight || extensionAPI.settings.get("bh-height");
                    if (candidateHeight.match(regex)) {
                        bannerHeight = candidateHeight;
                    } else {
                        key = "height";
                        sendConfigAlert(key);
                        break breakme;
                    }
                } else {
                    bannerHeight = "150";
                }
                bannerGradient = overrides.gradient ?? (extensionAPI.settings.get("bh-gradient") == true);
                bannerPlacement = overrides.placement ?? (extensionAPI.settings.get("bh-placement") == true);

                // remove existing banner divs
                if (document.querySelector("div.bannerDiv")) {
                    document.querySelector("div.bannerDiv").remove();
                    let dropzone = document.querySelector("#app > div > div > div.flex-h-box > div.roam-main > div.rm-files-dropzone");
                    dropzone.style.cssText = 'height: 100%;';
                    let article = document.querySelector(".roam-body .roam-app .roam-main .roam-article");
                    article.style.cssText = 'margin-top: 0;';
                }
                const bannerData = await getBannerDataForPage(pageUid);
                if (bannerData?.url) {
                    setBanner(
                        bannerData.url,
                        bannerHeight,
                        bannerGradient,
                        bannerPlacement,
                        bannerData.creditAuthor,
                        bannerData.creditAuthorLink,
                        bannerData.creditPhotoLink,
                        bannerData.creditText,
                        bannerData.creditSourceName,
                        bannerData.creditSourceLink
                    );
                }
            }
        }

        async function setBannerClip() {
            await setCurrentPageUid();
            const pageUid = currentPageUid;
            if (!pageUid) return;

            var bannerHeight, key;
            var bannerGradient = false;
            var bannerPlacement = false;
            breakme: {
                if (extensionAPI.settings.get("bh-height")) {
                    const regex = /^\d{2,3}$/;
                    if (extensionAPI.settings.get("bh-height").match(regex)) {
                        bannerHeight = extensionAPI.settings.get("bh-height");
                    } else {
                        key = "height";
                        sendConfigAlert(key);
                        break breakme;
                    }
                } else {
                    bannerHeight = "150";
                }
                if (extensionAPI.settings.get("bh-gradient") == true) {
                    bannerGradient = true;
                }
                if (extensionAPI.settings.get("bh-placement") == true) {
                    bannerPlacement = true;
                }
                const clipText = await navigator.clipboard.readText();
                if (!isUrl(clipText)) {
                    alert('Please make sure that the clipboard contains a url to an image');
                } else {
                    await setBannerPropOnPage(pageUid, clipText);
                    if (document.querySelector("div.bannerDiv")) {
                        document.querySelector("div.bannerDiv").remove();
                    }
                    setBanner(clipText, bannerHeight, bannerGradient, bannerPlacement);
                }
            }
        }

        async function setRandomBanner() {
            await setCurrentPageUid();
            const pageUid = currentPageUid;
            if (!pageUid) return;

            var bannerHeight, bannerTheme, key;
            var bannerGradient = false;
            var bannerPlacement = false;
            var unsplashKey;

            breakme: {
                if (extensionAPI.settings.get("bh-height")) {
                    const regex = /^\d{2,3}$/;
                    if (extensionAPI.settings.get("bh-height").match(regex)) {
                        bannerHeight = extensionAPI.settings.get("bh-height");
                    } else {
                        key = "height";
                        sendConfigAlert(key);
                        break breakme;
                    }
                } else {
                    bannerHeight = "150";
                }

                if (extensionAPI.settings.get("bh-gradient") == true) {
                    bannerGradient = true;
                }
                if (extensionAPI.settings.get("bh-placement") == true) {
                    bannerPlacement = true;
                }
                if (extensionAPI.settings.get("bh-unsplash-accessKey")) {
                    unsplashKey = extensionAPI.settings.get("bh-unsplash-accessKey");
                } else {
                    key = "unsplashKey";
                    sendConfigAlert(key);
                    break breakme;
                }
                if (extensionAPI.settings.get("bh-random")) {
                    bannerTheme = extensionAPI.settings.get("bh-random");
                } else {
                    bannerTheme = "nature";
                }

                const params = new URLSearchParams({
                    client_id: unsplashKey,
                    count: "1",
                    query: bannerTheme,
                    orientation: "landscape",
                    content_filter: "high",
                });

                const apiUrl =
                    "https://api.unsplash.com/photos/random?" + params.toString();

                const response = await fetchWithRetry(apiUrl, 2, [300, 700]);
                if (!response) {
                    console.error("Unsplash fetch failed");
                    alert("Failed to contact Unsplash. Check your connection.");
                    break breakme;
                }

                if (!response.ok) {
                    console.error("Unsplash API error", response);
                    alert("Failed to get random image from Unsplash.");
                    break breakme;
                }

                let data;
                try {
                    data = await response.json();
                } catch (e) {
                    console.error("Unsplash JSON parse error", e);
                    alert("Unexpected response from Unsplash.");
                    break breakme;
                }

                const photo = Array.isArray(data) ? data[0] : data;
                if (!photo || !photo.urls) {
                    console.error("Unsplash returned no usable photo", data);
                    alert("Unsplash did not return a usable image.");
                    break breakme;
                }

                const finalUrl =
                    photo.urls.regular || photo.urls.full || photo.urls.raw;
                const creditAuthor = photo.user?.name;
                const creditAuthorLink = addUnsplashUtms(photo.user?.links?.html);
                const creditPhotoLink = addUnsplashUtms(photo.links?.html);
                const creditText = creditAuthor ? `Photo by ${creditAuthor} on Unsplash` : undefined;

                // Optional: register download per Unsplash guidelines
                if (photo.links && photo.links.download_location) {
                    const dlUrl =
                        photo.links.download_location +
                        "?client_id=" +
                        encodeURIComponent(unsplashKey);
                    // fire and forget
                    fetch(dlUrl).catch((e) =>
                        console.warn("Unsplash download tracking failed", e)
                    );
                }

                await setBannerPropOnPage(pageUid, finalUrl, {
                    creditAuthor,
                    creditAuthorLink,
                    creditPhotoLink,
                    creditText,
                    creditSourceName: "Unsplash",
                    creditSourceLink: creditPhotoLink
                });

                if (document.querySelector("div.bannerDiv")) {
                    document.querySelector("div.bannerDiv").remove();
                }

                setBanner(
                    finalUrl,
                    bannerHeight,
                    bannerGradient,
                    bannerPlacement,
                    creditAuthor,
                    creditAuthorLink,
                    creditPhotoLink,
                    creditText,
                    "Unsplash",
                    creditPhotoLink
                );
            }
        }

        async function setRandomBannerPixabay() {
            await setCurrentPageUid();
            const pageUid = currentPageUid;
            if (!pageUid) return;

            var bannerHeight, bannerTheme, key;
            var bannerGradient = false;
            var bannerPlacement = false;
            var pixabayKey;

            breakme: {
                if (extensionAPI.settings.get("bh-height")) {
                    const regex = /^\d{2,3}$/;
                    if (extensionAPI.settings.get("bh-height").match(regex)) {
                        bannerHeight = extensionAPI.settings.get("bh-height");
                    } else {
                        key = "height";
                        sendConfigAlert(key);
                        break breakme;
                    }
                } else {
                    bannerHeight = "150";
                }

                if (extensionAPI.settings.get("bh-gradient") == true) {
                    bannerGradient = true;
                }
                if (extensionAPI.settings.get("bh-placement") == true) {
                    bannerPlacement = true;
                }
                if (extensionAPI.settings.get("bh-pixabay-apiKey")) {
                    pixabayKey = extensionAPI.settings.get("bh-pixabay-apiKey");
                } else {
                    key = "pixabayKey";
                    sendConfigAlert(key);
                    break breakme;
                }
                if (extensionAPI.settings.get("bh-random-pixabay")) {
                    bannerTheme = extensionAPI.settings.get("bh-random-pixabay");
                } else {
                    bannerTheme = "nature";
                }

                let hit;
                try {
                    hit = await getRandomPixabayHit(pixabayKey, bannerTheme);
                } catch (e) {
                    console.error("Pixabay fetch failed", e);
                    alert("Failed to contact Pixabay. Check your connection.");
                    break breakme;
                }

                if (!hit) {
                    alert("Pixabay did not return a usable image.");
                    break breakme;
                }

                const finalUrl = hit.largeImageURL || hit.webformatURL || hit.previewURL;
                if (!finalUrl) {
                    alert("Pixabay did not return a usable image URL.");
                    break breakme;
                }

                const creditAuthor = hit.user;
                const creditAuthorLink = hit.userURL;
                const creditPhotoLink = hit.pageURL;
                const creditSourceName = "Pixabay";

                await setBannerPropOnPage(pageUid, finalUrl, {
                    creditAuthor,
                    creditAuthorLink,
                    creditPhotoLink,
                    creditSourceName,
                    creditSourceLink: creditPhotoLink
                });

                if (document.querySelector("div.bannerDiv")) {
                    document.querySelector("div.bannerDiv").remove();
                }

                setBanner(
                    finalUrl,
                    bannerHeight,
                    bannerGradient,
                    bannerPlacement,
                    creditAuthor,
                    creditAuthorLink,
                    creditPhotoLink,
                    undefined,
                    creditSourceName,
                    creditPhotoLink
                );
            }
        }
    },
    onunload: () => {
        if (document.querySelector("div.bannerDiv")) {
            document.querySelector("div.bannerDiv").remove();
        }
        window.removeEventListener('hashchange', hashChange);
    }
}

async function setBanner(finalURL, bannerHeight, bannerGradient, bannerPlacement, creditAuthor, creditAuthorLink, creditPhotoLink, creditText, creditSourceName, creditSourceLink) {
    const creditAuthorHref = addUnsplashUtms(creditAuthorLink);
    const creditPhotoHref = addUnsplashUtms(creditPhotoLink);
    const inferredSourceName =
        creditSourceName || inferCreditSourceName(creditPhotoHref || creditAuthorHref, creditText);
    const sourceHref = creditSourceLink || creditPhotoHref || creditAuthorHref;
    await sleep(50);
    var bannerDiv = document.createElement('div');
    bannerDiv.classList.add('bannerDiv');
    bannerDiv.innerHTML = "";
    bannerDiv.style.position = 'relative';
    function insertAfter(newNode, existingNode) {
        existingNode.parentNode.insertBefore(newNode, existingNode.nextSibling);
    }
    if (bannerPlacement == true) { // place in topbar and keep fixed on page
        let dropzone = document.querySelector("#app > div > div > div.flex-h-box > div.roam-main > div.rm-files-dropzone");
        if (bannerGradient == true) {
            bannerDiv.style.cssText = 'position: relative; background: linear-gradient(to bottom, transparent, white 150%), url(' + finalURL + ') no-repeat center center; height: ' + bannerHeight + 'px;';
        } else {
            bannerDiv.style.cssText = 'position: relative; background: url(' + finalURL + ') no-repeat center center; height: ' + bannerHeight + 'px;';
        }
        insertAfter(bannerDiv, dropzone.lastElementChild);
        let height = 45 + parseInt(bannerHeight);
        dropzone.style.cssText = 'height: ' + height + 'px; z-index: 1000;';
        let article = document.querySelector(".roam-body .roam-app .roam-main .roam-article");
        let marginTop = parseInt(bannerHeight);
        article.style.cssText = 'margin-top: ' + marginTop + 'px;';
    } else { // place in article and scroll with page
        let dropzone = document.querySelector("#app > div > div > div.flex-h-box > div.roam-main > div.roam-body-main > div > div");
        if (bannerGradient == true) {
            bannerDiv.style.cssText = 'position: relative; background: linear-gradient(to bottom, transparent, white 150%), url(' + finalURL + ') no-repeat center center; height: ' + bannerHeight + 'px; margin-left: -16px;';
        } else {
            bannerDiv.style.cssText = 'position: relative; background: url(' + finalURL + ') no-repeat center center; height: ' + bannerHeight + 'px; margin-left: -16px;';
        }
        dropzone.parentNode.insertBefore(bannerDiv, dropzone);
        let article = document.querySelector(".roam-body .roam-app .roam-main .roam-article");
        article.style.cssText = 'margin-top: 0;';
    }
    if (creditAuthor || creditText) {
        const creditEl = document.createElement('div');
        creditEl.style.cssText = 'position: absolute; right: 8px; bottom: 6px; font-size: 11px; color: white; text-shadow: 0 1px 2px rgba(0,0,0,0.7); background: rgba(0,0,0,0.35); padding: 4px 6px; border-radius: 4px;';
        const authorSpan = document.createElement('span');
        if (creditAuthor) {
            authorSpan.textContent = "Photo by ";
            const authorLink = document.createElement('a');
            authorLink.href = creditAuthorHref || "#";
            authorLink.target = "_blank";
            authorLink.rel = "noopener noreferrer";
            authorLink.style.color = 'white';
            authorLink.style.textDecoration = 'underline';
            authorLink.textContent = creditAuthor;
            authorSpan.appendChild(authorLink);
        } else if (creditText) {
            authorSpan.textContent = creditText;
        }
        creditEl.appendChild(authorSpan);
        if (creditAuthor && inferredSourceName) {
            const spacer = document.createElement('span');
            spacer.textContent = " on ";
            spacer.style.marginLeft = '2px';
            creditEl.appendChild(spacer);
            const sourceLink = document.createElement('a');
            sourceLink.href = sourceHref || "#";
            sourceLink.target = "_blank";
            sourceLink.rel = "noopener noreferrer";
            sourceLink.style.color = 'white';
            sourceLink.style.textDecoration = 'underline';
            sourceLink.textContent = inferredSourceName;
            creditEl.appendChild(sourceLink);
        }
        bannerDiv.appendChild(creditEl);
    }
}

async function removeBanner() {
    await setCurrentPageUid();
    const pageUid = currentPageUid;
    await clearBannerPropOnPage(pageUid);
    await deleteLegacyBannerBlocks(pageUid);
    if (document.querySelector("div.bannerDiv")) {
        document.querySelector("div.bannerDiv").remove();
        let dropzone = document.querySelector("#app > div > div > div.flex-h-box > div.roam-main > div.rm-files-dropzone");
        dropzone.style.cssText = 'height: 100%;';
        let article = document.querySelector(".roam-body .roam-app .roam-main .roam-article");
        article.style.cssText = 'margin-top: 0;';
    }
}

async function setCurrentPageUid() {
    currentPageUid = await window.roamAlphaAPI.ui.mainWindow.getOpenPageOrBlockUid();
    if (currentPageUid) return;

    const getUidFromLogPage = (el) => {
        const logPage = el?.closest?.(".roam-log-page");
        const titleContainer = logPage?.querySelector?.(".rm-title-display-container[data-page-uid]");
        return titleContainer?.dataset?.pageUid;
    };

    const activeUid = getUidFromLogPage(document.activeElement);
    if (activeUid) {
        currentPageUid = activeUid;
        return;
    }

    const selection = window.getSelection?.();
    const selectionNode = selection?.anchorNode;
    const selectionEl = selectionNode
        ? (selectionNode.nodeType === Node.ELEMENT_NODE ? selectionNode : selectionNode.parentElement)
        : null;
    const selectionUid = getUidFromLogPage(selectionEl);
    if (selectionUid) {
        currentPageUid = selectionUid;
        return;
    }

    const logContainer = document.querySelector(".roam-log-container");
    if (logContainer) {
        const pages = Array.from(
            logContainer.querySelectorAll(".roam-log-page:not(.roam-log-preview)")
        );
        let bestUid = undefined;
        let bestDistance = Infinity;
        for (const page of pages) {
            const titleContainer = page.querySelector(".rm-title-display-container[data-page-uid]");
            if (!titleContainer) continue;
            const rect = page.getBoundingClientRect();
            if (rect.bottom < 0 || rect.top > window.innerHeight) continue;
            const distance = Math.abs(rect.top);
            if (distance < bestDistance) {
                bestDistance = distance;
                bestUid = titleContainer.dataset.pageUid;
            }
        }
        if (bestUid) {
            currentPageUid = bestUid;
            return;
        }
    }

    const titleContainer = document.querySelector(".rm-title-display-container[data-page-uid]");
    if (titleContainer?.dataset?.pageUid) {
        currentPageUid = titleContainer.dataset.pageUid;
    }
}

async function getBannerDataForPage(pageUid) {
    if (!pageUid) return undefined;
    const props = await getPropsForPage(pageUid);
    const url = getBannerFromProps(props);
    if (url) {
        legacyLog("props banner", pageUid);
        return {
            url,
            creditAuthor: props.bannerCreditAuthor || props.bannerCredit,
            creditAuthorLink: props.bannerCreditAuthorLink || props.bannerCreditLink,
            creditPhotoLink: props.bannerCreditPhotoLink || props.bannerCreditLink,
            creditText: props.bannerCredit,
            creditSourceName: props.bannerCreditSource,
            creditSourceLink: props.bannerCreditSourceLink
        };
    }

    if (legacyCheckedHas(pageUid)) {
        legacyLog("legacy cache hit", pageUid);
        return undefined;
    }

    legacyLog("legacy cache miss", pageUid);
    const bannerChild = await findLastBannerChild(pageUid);
    if (bannerChild?.url) {
        const trimmedUrl = String(bannerChild.url || "").trim();
        if (!trimmedUrl) {
            legacyLog("legacy banner empty", pageUid);
            legacyCheckedSet(pageUid);
            return undefined;
        }
        if (!isUrl(trimmedUrl)) {
            legacyLog("legacy banner invalid url", pageUid, { url: trimmedUrl });
            legacyCheckedSet(pageUid);
            return undefined;
        }
        legacyLog("legacy banner found", pageUid);
        await setBannerPropOnPage(pageUid, trimmedUrl, undefined, props, false);
        await deleteLegacyBannerBlocks(pageUid);
        legacyCheckedSet(pageUid);
        return { url: trimmedUrl };
    }

    legacyLog("legacy banner not found", pageUid);
    legacyCheckedSet(pageUid);
    return undefined;
}

function extractProps(pullResult) {
    if (!pullResult) return {};
    const raw = pullResult[":block/props"] || pullResult.props || {};
    return normalizeProps(raw);
}

async function setBannerPropOnPage(pageUid, url, credit, existingProps, deleteLegacy = true) {
    if (!pageUid || !url) return;
    const existing = existingProps || await getPropsForPage(pageUid);
    const updated = { ...existing, banner: url };
    if (credit) {
        if (credit.creditText) updated.bannerCredit = credit.creditText;
        if (credit.creditAuthor) updated.bannerCreditAuthor = credit.creditAuthor;
        if (credit.creditAuthorLink) updated.bannerCreditAuthorLink = credit.creditAuthorLink;
        if (credit.creditPhotoLink) updated.bannerCreditPhotoLink = credit.creditPhotoLink;
        if (credit.creditSourceName) updated.bannerCreditSource = credit.creditSourceName;
        if (credit.creditSourceLink) updated.bannerCreditSourceLink = credit.creditSourceLink;
    }
    await window.roamAlphaAPI.updateBlock({
        block: {
            uid: pageUid,
            props: updated
        }
    });
    if (deleteLegacy) {
        await deleteLegacyBannerBlocks(pageUid);
    }
}

async function clearBannerPropOnPage(pageUid) {
    if (!pageUid) return;
    const existing = await getPropsForPage(pageUid);
    const updated = { ...existing };
    let changed = false;
    if (updated.banner !== undefined) {
        delete updated.banner;
        changed = true;
    }
    if (updated.bannerCredit !== undefined) {
        delete updated.bannerCredit;
        changed = true;
    }
    if (updated.bannerCreditAuthor !== undefined) {
        delete updated.bannerCreditAuthor;
        changed = true;
    }
    if (updated.bannerCreditAuthorLink !== undefined) {
        delete updated.bannerCreditAuthorLink;
        changed = true;
    }
    if (updated.bannerCreditPhotoLink !== undefined) {
        delete updated.bannerCreditPhotoLink;
        changed = true;
    }
    if (updated.bannerCreditSource !== undefined) {
        delete updated.bannerCreditSource;
        changed = true;
    }
    if (updated.bannerCreditSourceLink !== undefined) {
        delete updated.bannerCreditSourceLink;
        changed = true;
    }
    if (updated.bannerCreditLink !== undefined) {
        delete updated.bannerCreditLink;
        changed = true;
    }
    if (changed) {
        await window.roamAlphaAPI.updateBlock({
            block: {
                uid: pageUid,
                props: updated
            }
        });
    }
}

async function deleteLegacyBannerBlocks(pageUid, childrenArg) {
    if (!pageUid) return;
    let res;
    try {
        res = await window.roamAlphaAPI.q(
            `[:find ?uid ?s
              :where
              [?p :block/uid "${pageUid}"]
              [?c :block/parents ?p]
              [?c :block/uid ?uid]
              [?c :block/string ?s]
              [(re-find #"(?i)^banner:\\s+" ?s)]]`
        );
    } catch (e) {
        legacyLog("legacy query fallback", pageUid);
        res = await window.roamAlphaAPI.q(
            `[:find ?uid ?s
              :where
              [?p :block/uid "${pageUid}"]
              [?c :block/parents ?p]
              [?c :block/uid ?uid]
              [?c :block/string ?s]]`
        );
    }
    for (let i = 0; i < res.length; i++) {
        const [uid, str] = res[i];
        if (uid && str && /^banner:\s+/i.test(str)) {
            await window.roamAlphaAPI.deleteBlock({ block: { uid } });
        }
    }
}

function getBannerFromProps(props) {
    return props?.banner;
}

function normalizeProps(raw) {
    const cleaned = {};
    Object.entries(raw || {}).forEach(([k, v]) => {
        const key = typeof k === "string" ? k.replace(/^:+/, "") : k;
        if (key) {
            cleaned[key] = v;
        }
    });
    return cleaned;
}

async function findLastBannerChild(pageUid) {
    let matches;
    try {
        matches = await window.roamAlphaAPI.q(
            `[:find ?uid ?s ?o
              :where
              [?p :block/uid "${pageUid}"]
              [?c :block/parents ?p]
              [?c :block/uid ?uid]
              [?c :block/string ?s]
              [(re-find #"(?i)^banner:\\s+" ?s)]
              [(get-else $ ?c :block/order 0) ?o]]`
        );
    } catch (e) {
        legacyLog("legacy query fallback", pageUid);
        matches = await window.roamAlphaAPI.q(
            `[:find ?uid ?s ?o
              :where
              [?p :block/uid "${pageUid}"]
              [?c :block/parents ?p]
              [?c :block/uid ?uid]
              [?c :block/string ?s]
              [(get-else $ ?c :block/order 0) ?o]]`
        );
    }
    if (!matches || matches.length === 0) return null;
    const parsed = matches
        .map(([uid, s, order]) => ({ uid, string: s, order: order || 0 }))
        .filter((m) => m.string && /^banner:\s+/i.test(m.string));
    if (parsed.length === 0) return null;
    parsed.sort((a, b) => (a.order || 0) - (b.order || 0));
    const last = parsed[parsed.length - 1];
    return { uid: last.uid, url: last.string.split("banner:")[1].trim() };
}

async function getPropsForPage(pageUid) {
    if (!pageUid) return {};
    try {
        const res = await window.roamAlphaAPI.q(
            `[:find (pull ?p [:block/props]) :where [?p :block/uid "${pageUid}"]]`
        );
        return extractProps(res?.[0]?.[0]);
    } catch (e) {
        console.error("getPropsForPage failed", e);
        return {};
    }
}

// helper functions

async function getRandomPixabayHit(apiKey, theme) {
    const safeTheme = (theme || "nature").trim() || "nature";
    const cacheKey = normalizePixabayCacheKey(safeTheme);
    let cache = pixabayCache.get(cacheKey);
    if (!cache) {
        cache = {
            unused: [],
            usedIds: new Set(),
            totalHits: 0,
            totalPages: 0
        };
        pixabayCache.set(cacheKey, cache);
    }

    if (cache.totalHits && cache.usedIds.size >= cache.totalHits) {
        cache.usedIds.clear();
        cache.unused = [];
    }

    if (cache.unused.length < PIXABAY_MIN_UNUSED) {
        await refillPixabayCache(cache, apiKey, safeTheme);
    }

    if (cache.unused.length === 0) return null;

    const idx = Math.floor(Math.random() * cache.unused.length);
    const hit = cache.unused.splice(idx, 1)[0];
    if (hit?.id) cache.usedIds.add(hit.id);
    prunePixabayCacheEntry(cache);
    savePixabayCache();
    return hit;
}

async function refillPixabayCache(cache, apiKey, theme) {
    const totalPages = cache.totalPages || 0;
    const page = totalPages
        ? 1 + Math.floor(Math.random() * totalPages)
        : 1;
    let data = await fetchPixabayPage(apiKey, theme, page);
    if (data && Array.isArray(data.hits) && data.hits.length === 0 && page !== 1) {
        data = await fetchPixabayPage(apiKey, theme, 1);
    }
    if (!data || !Array.isArray(data.hits)) return;

    if (typeof data.totalHits === "number") {
        cache.totalHits = data.totalHits;
        const calculatedPages = Math.max(1, Math.ceil(data.totalHits / PIXABAY_PER_PAGE));
        cache.totalPages = Math.min(calculatedPages, PIXABAY_MAX_PAGES);
    }

    const hits = data.hits.filter((hit) => hit?.id);
    const filtered = hits.filter((hit) => !cache.usedIds.has(hit.id));
    if (filtered.length === 0 && hits.length > 0 && cache.usedIds.size > 0) {
        cache.usedIds.clear();
        cache.unused = hits.slice();
    } else {
        cache.unused = cache.unused.concat(filtered);
    }
    prunePixabayCacheEntry(cache);
    savePixabayCache();
}

async function fetchPixabayPage(apiKey, theme, page) {
    const params = new URLSearchParams({
        key: apiKey,
        q: theme,
        category: "backgrounds",
        image_type: "photo",
        editors_choice: "true",
        min_width: "800",
        orientation: "horizontal",
        safesearch: "true",
        order: "latest",
        per_page: String(PIXABAY_PER_PAGE),
        page: String(page)
    });
    const apiUrl = "https://pixabay.com/api/?" + params.toString();

    const response = await fetchWithRetry(apiUrl, 2, [300, 700]);
    if (!response) return null;

    if (!response.ok) {
        console.error("Pixabay API error", response);
        return null;
    }

    try {
        return await response.json();
    } catch (e) {
        console.error("Pixabay JSON parse error", e);
        return null;
    }
}

function addUnsplashUtms(url) {
    if (!url) return url;
    try {
        const parsed = new URL(url);
        if (!parsed.hostname.includes("unsplash.com")) return url;
        parsed.searchParams.set("utm_source", "BannerHeadingsRoamResearch");
        parsed.searchParams.set("utm_medium", "referral");
        return parsed.toString();
    } catch (e) {
        return url;
    }
}

async function fetchWithRetry(url, retries, delaysMs) {
    let lastError = undefined;
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const response = await fetch(url);
            if (response.ok) return response;
            if (response.status === 429 || response.status >= 500) {
                lastError = new Error(`HTTP ${response.status}`);
            } else {
                return response;
            }
        } catch (e) {
            lastError = e;
        }
        if (attempt < retries) {
            const delay = delaysMs?.[attempt] ?? 300;
            await sleep(delay);
        }
    }
    if (lastError) {
        console.warn("Fetch failed after retries", lastError);
    }
    return null;
}

function normalizePixabayCacheKey(input) {
    if (!input) return "pixabay::default";
    const raw = String(input);
    if (raw.includes("::")) {
        const parts = raw.split("::");
        return `pixabay::${(parts[parts.length - 1] || "default").toLowerCase()}`;
    }
    return `pixabay::${raw.toLowerCase()}`;
}

function loadPixabayCache() {
    try {
        const raw = localStorage.getItem(PIXABAY_CACHE_STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object") return;
        Object.entries(parsed).forEach(([cacheKey, entry]) => {
            if (!entry || typeof entry !== "object") return;
            const unused = Array.isArray(entry.unused) ? entry.unused : [];
            const usedIds = new Set(Array.isArray(entry.usedIds) ? entry.usedIds : []);
            const totalHits = typeof entry.totalHits === "number" ? entry.totalHits : 0;
            const totalPages = typeof entry.totalPages === "number" ? entry.totalPages : 0;
            const cache = { unused, usedIds, totalHits, totalPages };
            prunePixabayCacheEntry(cache);
            pixabayCache.set(normalizePixabayCacheKey(cacheKey), cache);
        });
    } catch (e) {
        console.warn("Failed to load Pixabay cache", e);
    }
}

function savePixabayCache() {
    try {
        const serializable = {};
        pixabayCache.forEach((value, key) => {
            prunePixabayCacheEntry(value);
            serializable[key] = {
                unused: Array.isArray(value.unused)
                    ? value.unused.map((hit) => ({
                        id: hit.id,
                        largeImageURL: hit.largeImageURL,
                        webformatURL: hit.webformatURL,
                        previewURL: hit.previewURL,
                        user: hit.user,
                        userURL: hit.userURL,
                        pageURL: hit.pageURL
                    }))
                    : [],
                usedIds: Array.from(value.usedIds || []),
                totalHits: value.totalHits || 0,
                totalPages: value.totalPages || 0
            };
        });
        localStorage.setItem(PIXABAY_CACHE_STORAGE_KEY, JSON.stringify(serializable));
    } catch (e) {
        console.warn("Failed to save Pixabay cache", e);
    }
}

function prunePixabayCacheEntry(cache) {
    if (!cache) return;
    if (cache.unused?.length && cache.usedIds?.size) {
        cache.unused = cache.unused.filter((hit) => !cache.usedIds.has(hit?.id));
    }
    if (cache.usedIds && cache.usedIds.size > PIXABAY_MAX_USED_IDS) {
        const ids = Array.from(cache.usedIds);
        cache.usedIds = new Set(ids.slice(-PIXABAY_MAX_USED_IDS));
    }
}

function inferCreditSourceName(link, creditText) {
    if (creditText && /pixabay/i.test(creditText)) return "Pixabay";
    if (creditText && /unsplash/i.test(creditText)) return "Unsplash";
    if (!link) return undefined;
    if (link.includes("pixabay.com")) return "Pixabay";
    if (link.includes("unsplash.com")) return "Unsplash";
    return undefined;
}

function legacyLog(action, pageUid, meta) {
    if (!LEGACY_LOG) return;
    console.log(`[BannerHeadings] ${action}`, { pageUid, ...meta });
}

function getLegacyCacheGraphKey() {
    const graphName = window.roamAlphaAPI?.graph?.name;
    return graphName ? `graph::${graphName}` : "graph::default";
}

function loadLegacyCheckedCache() {
    try {
        const raw = localStorage.getItem(LEGACY_CACHE_STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        const graphKey = getLegacyCacheGraphKey();
        const entry = parsed?.[graphKey];
        if (!entry || typeof entry !== "object") return;
        const now = Date.now();
        legacyCheckedCache = new Map();
        Object.entries(entry).forEach(([uid, ts]) => {
            if (!uid || typeof ts !== "number") return;
            if (now - ts > LEGACY_CACHE_TTL_MS) return;
            legacyCheckedCache.set(uid, ts);
        });
        pruneLegacyCheckedCache();
    } catch (e) {
        console.warn("Failed to load legacy cache", e);
    }
}

function saveLegacyCheckedCache() {
    legacyCacheDirty = true;
    if (legacyCacheSaveTimer) return;
    legacyCacheSaveTimer = setTimeout(() => {
        legacyCacheSaveTimer = null;
        if (!legacyCacheDirty) return;
        legacyCacheDirty = false;
        persistLegacyCheckedCache();
    }, 500);
}

function persistLegacyCheckedCache() {
    try {
        pruneLegacyCheckedCache();
        const graphKey = getLegacyCacheGraphKey();
        const raw = localStorage.getItem(LEGACY_CACHE_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : {};
        const entry = {};
        legacyCheckedCache.forEach((ts, uid) => {
            entry[uid] = ts;
        });
        parsed[graphKey] = entry;
        localStorage.setItem(LEGACY_CACHE_STORAGE_KEY, JSON.stringify(parsed));
    } catch (e) {
        console.warn("Failed to save legacy cache", e);
    }
}

function pruneLegacyCheckedCache() {
    const now = Date.now();
    for (const [uid, ts] of legacyCheckedCache.entries()) {
        if (now - ts > LEGACY_CACHE_TTL_MS) {
            legacyCheckedCache.delete(uid);
        }
    }
    if (legacyCheckedCache.size <= LEGACY_CACHE_MAX) return;
    const sorted = Array.from(legacyCheckedCache.entries()).sort((a, b) => b[1] - a[1]);
    legacyCheckedCache = new Map(sorted.slice(0, LEGACY_CACHE_MAX));
}

function legacyCheckedHas(pageUid) {
    const ts = legacyCheckedCache.get(pageUid);
    if (!ts) return false;
    if (Date.now() - ts > LEGACY_CACHE_TTL_MS) {
        legacyCheckedCache.delete(pageUid);
        return false;
    }
    return true;
}

function legacyCheckedSet(pageUid) {
    if (!pageUid) return;
    legacyCheckedCache.set(pageUid, Date.now());
    saveLegacyCheckedCache();
}

function isUrl(s) {
    var regexp = /(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/
    return regexp.test(s);
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function sendConfigAlert(key) {
    if (key == "height") {
        alert("Please set your preferred banner height in pixels in the configuration settings via the Roam Depot tab.");
    } else if (key == "unsplashKey") {
        alert("Please set your Unsplash Access Key in the configuration settings via the Roam Depot tab.");
    } else if (key == "pixabayKey") {
        alert("Please set your Pixabay API key in the configuration settings via the Roam Depot tab.");
    }
}
