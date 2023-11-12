let promise = Promise.resolve();  // Used to hold chain of typesetting calls

function typeset(code) {
    promise = promise.then(() => MathJax.typesetPromise(code()))
                     .catch((err) => console.log('Typeset failed: ' + err.message));
    return promise;
}