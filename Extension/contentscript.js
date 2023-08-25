document.addEventListener("mouseup", function (event) {
  const selectedText = window.getSelection().toString();
  if (selectedText) {
    //send selected text to background script
    chrome.runtime.sendMessage({
      action: "getSelectedText",
      data: selectedText,
    });
  }
});
