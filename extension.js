const config = {
    tabTitle: "Banner Headings",
    settings: [
        {
            id: "bh-height",
            name: "Banner height",
            description: "Banner height in pixels",
            action: { type: "input", placeholder: "150" },
        },
        {
            id: "bh-gradient",
            name: "Gradient to bottom",
            description: "Apply gradient top to bottom",
            action: { type: "switch" },
        },
    ]
};

export default {
    onload: ({ extensionAPI }) => {
        extensionAPI.settings.panel.create(config);

        window.roamAlphaAPI.ui.commandPalette.addCommand({
            label: "Set Banner from Clipboard",
            callback: () => setBannerClip({ extensionAPI })
        });

        window.addEventListener('hashchange', async function (e) {
            checkBanner({ extensionAPI });
        });
    },
    onunload: () => {
        if (document.querySelector("div.bannerDiv")) {
            document.querySelector("div.bannerDiv").remove();
        }
        window.roamAlphaAPI.ui.commandPalette.removeCommand({
            label: 'Set Banner from Clipboard'
        });
    }
}

function sendConfigAlert(key) {
    if (key == "height") {
        alert("Please set your preferred banner height in the configuration settings via the Roam Depot tab.");
    }
}

async function checkBanner({ extensionAPI }) {
    var bannerHeight, key;
    var bannerGradient = false;
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
    }

    if (document.querySelector("div.bannerDiv")) {
        document.querySelector("div.bannerDiv").remove();
    }
    var startBlock = await window.roamAlphaAPI.ui.mainWindow.getOpenPageOrBlockUid();
    var bannerURL, bannerURL1, finalURL;
    let q = `[:find (pull ?page [:node/title :block/string {:block/children ...} ]) :where [?page :block/uid "${startBlock}"]  ]`;
    var info = await window.roamAlphaAPI.q(q);
    if (info.length > 0) {
        for (var i = 0; i < info[0][0]?.children.length; i++) {
            if (info[0][0].children[i].string.match("banner: ")) {
                bannerURL = info[0][0].children[i].string;
                bannerURL1 = bannerURL.split("banner: ")
                finalURL = bannerURL1[1];
                setBanner(finalURL, bannerHeight, bannerGradient);
            }
        }
    }
}

async function setBanner(finalURL, bannerHeight, bannerGradient) {
    var bannerDiv = document.createElement('div');
    bannerDiv.classList.add('bannerDiv');
    bannerDiv.innerHTML = "";
    if (bannerGradient == true) {
        bannerDiv.style.cssText = 'background: linear-gradient(to bottom, transparent, white 150%), url(' + finalURL + ') no-repeat center center; height: ' + bannerHeight + 'px;';
    } else {
        bannerDiv.style.cssText = 'background: url(' + finalURL + ') no-repeat center center; height: ' + bannerHeight + 'px;';
    }    
    var roamBody = document.querySelector("#app > div > div > div.flex-h-box > div.roam-main > div.roam-body-main > div > div")
    roamBody.parentNode.insertBefore(bannerDiv, roamBody);
}

async function setBannerClip({ extensionAPI }) {
    var bannerHeight, key;
    var bannerGradient = false;
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
    }
    const clipText = await navigator.clipboard.readText();
    if (!isUrl(clipText)) {
        alert('Please make sure that the clipboard contains a url to an image');
    } else {
        var bannerText = "banner: " + clipText;
        var startBlock = await window.roamAlphaAPI.ui.mainWindow.getOpenPageOrBlockUid();
        let q = `[:find (pull ?page [:node/title :block/string :block/uid {:block/children ...} ]) :where [?page :block/uid "${startBlock}"]  ]`;
        var info = await window.roamAlphaAPI.q(q);
        if (info.length > 0) {
            var bannerExists = false;
            for (var i = 0; i < info[0][0]?.children.length; i++) {
                if (info[0][0].children[i].string.match("banner: ")) { // there's already a banner
                    console.log("Updating page banner");
                    await window.roamAlphaAPI.updateBlock(
                        { block: { uid: info[0][0].children[i].uid, string: bannerText.toString(), open: true } });
                    bannerExists = true;
                }
            }            
            if (bannerExists == false) { // no banners found, create one from clipboard
                console.log("Creating page banner");
                var thisBlock = window.roamAlphaAPI.util.generateUID();
                await window.roamAlphaAPI.createBlock({
                    location: { "parent-uid": info[0][0].uid, order: 10000 },
                    block: { string: bannerText.toString(), uid: thisBlock }
                });
            }
        }
        if (document.querySelector("div.bannerDiv")) {
            document.querySelector("div.bannerDiv").remove();
        }
        setBanner(clipText, bannerHeight, bannerGradient);
    }
}

function isUrl(s) {
    var regexp = /(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/
    return regexp.test(s);
}