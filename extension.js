let hashChange = undefined;
let currentPageUid = undefined;
var bannerHeight, key;
var bannerGradient = false;
var bannerPlacement = false;

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
                    id: "bh-random",
                    name: "Theme for Random Unsplash image",
                    description: "Unsplash image from <YOUR THEME>. e.g. nature",
                    action: { type: "input", placeholder: "nature", onChange: () => checkBanner() },
                },
            ]
        };
        extensionAPI.settings.panel.create(config);
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
                var finalURL = await getBannerUrlForPage(pageUid);
                if (finalURL) {
                    setBanner(finalURL, bannerHeight, bannerGradient, bannerPlacement);
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

                if (extensionAPI.settings.get("bh-random")) {
                    bannerTheme = extensionAPI.settings.get("bh-random");
                } else {
                    bannerTheme = "nature";
                }

                const unsplashKey = "WmvepWvdp91wlYN3aFiNaL-n4BBeaLo2V35x7EsBg1U";
                const params = new URLSearchParams({
                    client_id: unsplashKey,
                    count: "1",
                    query: bannerTheme,
                    orientation: "landscape",
                    content_filter: "high",
                });

                const apiUrl =
                    "https://api.unsplash.com/photos/random?" + params.toString();

                let response;
                try {
                    response = await fetch(apiUrl);
                } catch (e) {
                    console.error("Unsplash fetch failed", e);
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

                await setBannerPropOnPage(pageUid, finalUrl);

                if (document.querySelector("div.bannerDiv")) {
                    document.querySelector("div.bannerDiv").remove();
                }

                setBanner(finalUrl, bannerHeight, bannerGradient, bannerPlacement);
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

async function setBanner(finalURL, bannerHeight, bannerGradient, bannerPlacement) {
    await sleep(50);
    var bannerDiv = document.createElement('div');
    bannerDiv.classList.add('bannerDiv');
    bannerDiv.innerHTML = "";
    function insertAfter(newNode, existingNode) {
        existingNode.parentNode.insertBefore(newNode, existingNode.nextSibling);
    }
    if (bannerPlacement == true) { // place in topbar and keep fixed on page
        let dropzone = document.querySelector("#app > div > div > div.flex-h-box > div.roam-main > div.rm-files-dropzone");
        if (bannerGradient == true) {
            bannerDiv.style.cssText = 'background: linear-gradient(to bottom, transparent, white 150%), url(' + finalURL + ') no-repeat center center; height: ' + bannerHeight + 'px;';
        } else {
            bannerDiv.style.cssText = 'background: url(' + finalURL + ') no-repeat center center; height: ' + bannerHeight + 'px;';
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
            bannerDiv.style.cssText = 'background: linear-gradient(to bottom, transparent, white 150%), url(' + finalURL + ') no-repeat center center; height: ' + bannerHeight + 'px; margin-left: -16px;';
        } else {
            bannerDiv.style.cssText = 'background: url(' + finalURL + ') no-repeat center center; height: ' + bannerHeight + 'px; margin-left: -16px;';
        }
        dropzone.parentNode.insertBefore(bannerDiv, dropzone);
        let article = document.querySelector(".roam-body .roam-app .roam-main .roam-article");
        article.style.cssText = 'margin-top: 0;';
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
    if (!currentPageUid) {
        const uri = window.location.href;
        const regex = /^https:\/\/roamresearch.com\/#\/(app|offline)\/\w+$/;
        const today = new Date();
        const dd = String(today.getDate()).padStart(2, '0');
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const yyyy = today.getFullYear();
        const todayUid = mm + '-' + dd + '-' + yyyy;
        if (uri.match(regex)) {
            currentPageUid = todayUid;
        }
        let logPage = document.getElementById("rm-log-container");
        if (logPage) {
            currentPageUid = todayUid;
        }
    }
}

async function getBannerUrlForPage(pageUid) {
    if (!pageUid) return undefined;
    const migrated = await migrateBannerBlockToProps(pageUid);
    if (migrated) return migrated;
    const props = await getPropsForPage(pageUid);
    return getBannerFromProps(props);
}

function extractProps(pullResult) {
    if (!pullResult) return {};
    const raw = pullResult[":block/props"] || pullResult.props || {};
    return normalizeProps(raw);
}

async function migrateBannerBlockToProps(pageUid) {
    const props = await getPropsForPage(pageUid);
    const bannerFromProps = getBannerFromProps(props);
    const bannerChild = await findLastBannerChild(pageUid);
    const bannerFromBlock = bannerChild?.url;

    if (bannerFromBlock && !bannerFromProps) {
        const updated = { ...props, banner: bannerFromBlock };
        await window.roamAlphaAPI.updateBlock({
            block: {
                uid: pageUid,
                props: updated
            }
        });
        await deleteLegacyBannerBlocks(pageUid);
        return bannerFromBlock;
    }
    if (bannerFromProps) {
        if (bannerFromBlock) {
            await deleteLegacyBannerBlocks(pageUid);
        }
        return bannerFromProps;
    }
    if (bannerFromBlock) {
        await deleteLegacyBannerBlocks(pageUid);
        return bannerFromBlock;
    }
    return undefined;
}

async function setBannerPropOnPage(pageUid, url) {
    if (!pageUid || !url) return;
    const existing = await getPropsForPage(pageUid);
    const updated = { ...existing, banner: url };
    await window.roamAlphaAPI.updateBlock({
        block: {
            uid: pageUid,
            props: updated
        }
    });
    await deleteLegacyBannerBlocks(pageUid);
}

async function clearBannerPropOnPage(pageUid) {
    if (!pageUid) return;
    const existing = await getPropsForPage(pageUid);
    if (existing.banner !== undefined) {
        const updated = { ...existing };
        delete updated.banner;
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
    const res = await window.roamAlphaAPI.q(
        `[:find ?uid ?s
          :where
          [?p :block/uid "${pageUid}"]
          [?c :block/parents ?p]
          [?c :block/uid ?uid]
          [?c :block/string ?s]]`
    );
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
    const matches = await window.roamAlphaAPI.q(
        `[:find ?uid ?s ?o
          :where
          [?p :block/uid "${pageUid}"]
          [?c :block/parents ?p]
          [?c :block/uid ?uid]
          [?c :block/string ?s]
          [(get-else $ ?c :block/order 0) ?o]]`
    );
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
    }
}
