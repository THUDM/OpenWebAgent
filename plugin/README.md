# OpenWebAgent - Chrome extensions

## Install

First, you need to install the dependencies. We recommend using npm as the package manager.

```shell
npm install
```

Then you can modify the source code of this extension as needed. Don't forget to rebuild the extension after making any changes.

```shell
npm run build
```

Finally, the generated file `openwebagent-extension` is the extension we need. You can compress it and release it to the public, or you can use it as an unpackaged extension in Chrome.



## Best Practice

If you want to modify this extension, you should focus on the file  `src/popup/pages/chatWindow/index.js` , which is used to organize the information on the page and execute actions.

### API calls

You should change the backend URL in `fetchDataandDecode` and run `npm run build` to build your own plugin. (Or you can keep the same backend port settings so that you don't need to rebuild the extension)

```javascript
const fetchDataAndDecode = async (data, sessionId) => {
    const url = '<your-url>'; // TODO
    ...
}
```

### Event loop

The main event loop is located on `chatLoop` in the function `onPressEnter`, and each time we call the API `fetchDataandDecode` first, and then use `executeScriptOnActiveTab` to perform the action.

Therefore, if you want to define a new action, you should add the corresponding description to the function `doAction`, which is called in `executeScriptOnActiveTab`..
