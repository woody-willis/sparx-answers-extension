function calculateMultipleChoiceAnswer(activityData) {
    const answerIds = [];

    if (activityData.input.choice_groups.choice_group) {
        if (activityData.input.choice_groups.choice_group.max_choices && activityData.input.choice_groups.choice_group.max_choices !== 1) return;
        answerIds.push(activityData.input.choice_groups.choice_group.choice_refs[0]);
    } else {
        const acceptCounts = {};
        for (const answerContent of activityData.layout.content[1].content[0].content) {
            if (!answerContent.type.includes("answer-part")) continue;

            for (const answerPartContent of answerContent.content) {
                if (answerPartContent.element !== "slot") continue;
                
                if (acceptCounts[answerPartContent.accept]) {
                    acceptCounts[answerPartContent.accept] += 1;
                } else {
                    acceptCounts[answerPartContent.accept] = 1;
                }
            }
        }

        for (const acceptKey of Object.keys(acceptCounts)) {
            const cardGroupKey = Object.keys(activityData.input.card_groups).find(cardGroupKeSearch => cardGroupKeSearch === acceptKey);
            if (!cardGroupKey) continue;

            const cardGroup = activityData.input.card_groups[cardGroupKey];

            for (let i = 0; i < acceptCounts[acceptKey]; i++) {
                answerIds.push(cardGroup.card_refs[i]);
            }
        }
    }

    const answers = [];

    for (const answerId of answerIds) {
        answers.push(activityData.input.cards[answerId].content[0].text);
    }

    return answers;
}

function highlightAnswer(answer) {
    const numbersInAnswer = answer.match(/[0-9]/g).map(num => parseInt(num));
    const sortedNumbersInAnswer = numbersInAnswer.sort((a, b) => a - b);

    if (answer.includes("-")) {
        const amountOfDashes = answer.match(/-/g).length;
        for (let i = 0; i < amountOfDashes; i++) {
            sortedNumbersInAnswer.push('-');
        }
    }

    const answerElement = document.querySelectorAll(`[class="base"]`);

    for (const elementText of answerElement) {
        const numbersInElement = elementText.textContent.match(/[0-9]/g);

        if (!numbersInElement) continue;

        const sortedNumbersInElement = numbersInElement.map(num => parseInt(num)).sort((a, b) => a - b);

        if (elementText.textContent.includes("−") || elementText.textContent.includes("-")) {
            const amountOfDashes = elementText.textContent.match(/[−|-]/g).length;
            for (let i = 0; i < amountOfDashes; i++) {
                sortedNumbersInElement.push('-');
            }
        }
        console.log(sortedNumbersInAnswer, sortedNumbersInElement, elementText.textContent);

        let isMatch = true;
        for (let i = 0; i < sortedNumbersInElement.length; i++) {
            if (sortedNumbersInElement[i] !== sortedNumbersInAnswer[i]) {
                isMatch = false;
                break;
            }
        }

        if (!isMatch || sortedNumbersInElement.length !== sortedNumbersInAnswer.length) continue;

        const parentBoxElement = elementText.closest(`[data-scale-target="card-content"]`);
        if (parentBoxElement) {
            parentBoxElement.style.backgroundColor = "lightgreen";
        }
    }
}

(function() {
    const originalFetch = window.fetch;

    window.fetch = async function(input, init) {
        const method = init?.method || 'GET';
        const url = typeof input === 'string' ? input : input.url;
        const requestHeaders = init?.headers || {}
        const requestBody = init?.body;

        try {
            // Call original fetch and get the response
            const response = await originalFetch(input, init);

            // Get response details
            const responseHeaders = {};
            response.headers.forEach((value, key) => {
                responseHeaders[key] = value;
            });
            const responseBody = await response.clone().text();

            if (responseBody.includes("\"layout\":")) {
                const activityData = JSON.parse("[" + responseBody.split("[").slice(1).join("[").split("]").slice(0, -1).join("]") + "]");
                console.log(activityData);

                if (activityData[0].layout.type.includes("multiple-choice") || activityData[0].layout.type.includes("multi-part")) {
                    console.log("Multiple choice activity detected");
                    const answers = calculateMultipleChoiceAnswer(activityData[0]);
                    if (answers) {
                        console.log("Answers:", answers);
                        document.onclick = (event) => {
                            for (const answer of answers) {
                                highlightAnswer(answer);
                            }
                        };
                    } else {
                        console.error("Failed to calculate answers");
                    }
                }
            }

            // Return the original response
            return response;
        } catch (error) {
            console.error('Fetch error:', error);
            throw error;
        }
    };
})();
