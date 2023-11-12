MathJax = {
    tex: {
        inlineMath: [['$', '$'], ['{', '}']]
    }
};

chrome.runtime.sendMessage({
    message: "windowReady"
});

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    const messageSplit = request.message.split("|");
    const message = messageSplit[0];

    switch (message) {
        case "answers":
            const answers = messageSplit[1].split("‰");
            console.log(answers);

            if (answers.length == 0 || answers[0] == "") {
                document.getElementById("answers").innerHTML = "<p>No answers could be intercepted. The answers are likely number input(s) only!</p>";
                return;
            }

            document.getElementById("answers").innerHTML = "";

            for (const answer of answers) {
                const li = document.createElement("li");
                li.innerHTML = answer;
                document.getElementById("answers").appendChild(li);

                typeset(() => {});
            }

            break;

        case "workerReady":
            document.getElementById("answers").innerHTML = "<p>Intercepter ready. Please open a question or reload Sparx to start.</p>";
            break;
    }
});