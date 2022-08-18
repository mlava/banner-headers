const config = {
    tabTitle: "Banner Headings",
    settings: [
        {
            id: "bh-height",
            name: "Banner height",
            description: "Banner height in pixels",
            action: { type: "input", placeholder: "150" },
        },
    ]
};

export default {
    onload: ({ extensionAPI }) => {
        extensionAPI.settings.panel.create(config);

        window.addEventListener('hashchange', async function (e) {
            checkBanner({ extensionAPI });
        });
    },
    onunload: () => {
        if (document.querySelector("div.bannerDiv")) {
            document.querySelector("div.bannerDiv").remove();
        }
    }
}

function sendConfigAlert(key) {
    if (key == "height") {
        alert("Please set your preferred banner height in the configuration settings via the Roam Depot tab.");
    }
}

async function checkBanner({ extensionAPI }) {
    var bannerHeight, key;
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
                setBanner(finalURL, bannerHeight);
            }
        }
    }
}

async function setBanner(finalURL, bannerHeight) {
    var bannerDiv = document.createElement('div');
    bannerDiv.classList.add('bannerDiv');
    bannerDiv.innerHTML = "";
    bannerDiv.style.cssText = 'background: url(' + finalURL + ') no-repeat center center; height: ' + bannerHeight + 'px;';
    var roamBody = document.querySelector("#app > div > div > div.flex-h-box > div.roam-main > div.roam-body-main > div > div")
    roamBody.parentNode.insertBefore(bannerDiv, roamBody);
}