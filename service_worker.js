// We would like to intercept all communication between the browser and Sparx.

// Answer window
chrome.action.onClicked.addListener(function (tab) {
    chrome.windows.create({
        url: "answers.html",
        type: "popup",
        width: 350,
        height: 300
    });
});

let currentTab;
let debuggerId;
let version = "1.0";

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    if (tab.url.indexOf("sparxmaths.uk") == -1) {
        chrome.debugger.detach(debuggerId);
        return;
    }

    currentTab = tab;

    chrome.debugger.attach({ //debug at current tab
        tabId: currentTab.id
    }, version, onAttach.bind(null, currentTab.id));
});


function onAttach(tabId) {

    chrome.debugger.sendCommand({ //first enable the Network
        tabId: tabId
    }, "Network.enable");

    chrome.debugger.onEvent.addListener(allEventHandler);

}


function allEventHandler(debuggeeId, message, params) {

    if (currentTab.id != debuggeeId.tabId) {
        return;
    }

    debuggerId = debuggeeId;

    if (message == "Network.responseReceived") { //response return 
        chrome.debugger.sendCommand({
            tabId: debuggeeId.tabId
        }, "Network.getResponseBody", {
            "requestId": params.requestId
        }, function (response) {
            if (response.base64Encoded) {
                const decodedBody = atob(response.body);

                if (decodedBody.includes("\"layout\":")) {
                    const activityData = JSON.parse("[" + decodedBody.split("[").slice(1).join("[").split("]").slice(0, -1).join("]") + "]");
                    console.log(activityData);

                    const answers = [];

                    for (const activity of activityData) {
                        let answersNeeded = 0;

                        // Get answers needed
                        for (const content of activity.layout.content) {
                            if (content.type.includes("answer")) {
                                for (const answersContent of content.content) {
                                    if (!answersContent.content) {
                                        continue;
                                    }

                                    for (const layoutAnswersContent of answersContent.content) {
                                        if (layoutAnswersContent.ref) {
                                            if (layoutAnswersContent.ref.indexOf("answer") != -1) {
                                                answersNeeded++;
                                                continue;
                                            }
                                        }

                                        if (layoutAnswersContent.type) {
                                            if (layoutAnswersContent.type.includes("answer-part")) {
                                                answersNeeded++;
                                                continue;
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        // Loop through input.card_groups
                        for (const cardGroupKey of Object.keys(activity.input.card_groups)) {
                            const cardGroup = activity.input.card_groups[cardGroupKey];

                            for (let i = 0; i < answersNeeded; i++) {
                                if (cardGroup.card_refs[i]) {
                                    answers.push(activity.input.cards[cardGroup.card_refs[i]].content[0].text);
                                }
                            }
                        }

                        // Loop through input.choice_groups
                        for (const choiceGroupKey of Object.keys(activity.input.choice_groups)) {
                            const choiceGroup = activity.input.choice_groups[choiceGroupKey];

                            answersNeeded += parseInt(choiceGroup.max_choices);

                            for (let i = 0; i < answersNeeded - answers.length; i++) {
                                if (choiceGroup.choice_refs[i]) {
                                    answers.push(activity.input.choices[choiceGroup.choice_refs[i]].content[0].text);
                                }
                            }
                        }
                    }

                    for (const answer of answers) {
                        console.log(answer);
                    }

                    chrome.runtime.sendMessage({
                        message: "answers|" + answers.join("‰")
                    });
                }
            }
        });
    }
}

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    const messageSplit = request.message.split("|");
    const message = messageSplit[0];

    switch (message) {
        case "windowReady":
            chrome.runtime.sendMessage({
                message: "workerReady"
            });
            break;
    }
});