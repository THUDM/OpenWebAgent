/* global chrome */
import React, { useState, useEffect, useRef } from 'react';
import { Input, Button, List, Avatar, TextArea, Tag, Spin, Collapse, Divider, message } from 'antd';
import { v4 as uuidv4 } from 'uuid';
import { MessageFilled, PlayCircleFilled, EditFilled } from "@ant-design/icons";

import GlobalInput from "../../components/GlobalInput";
import Answer from '../../components/Answer';
import UserSvg from '@/assets/user.svg';
import AnswerSvg from "@/assets/answer.png";
import getHtmlInfo from '../../../common/js/getHtmlInfo';
import DislikeSvg from "@/assets/dislike.svg";
import LikeSvg from "@/assets/like.svg";
import './index.less';

const ChatWindow = () => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [isFinished, setIsFinished] = useState(true);
  const [round, setRound] = useState(0);
  const [exit, setExit] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [renderMessages, setRenderMessages] = useState([]);
  // const [isPaused, setIsPaused] = useState(false);
  const isPaused = useRef(false);
  const chatWindowRef = useRef(null);
  const gref = useRef(null);

  useEffect(() => {
    // This effect will run every time the messages state changes
    console.log('Messages updated:', messages);
  }, [messages]);

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  const handleSendMessage = () => {
    if (inputValue.trim() !== '') {
      setMessages([...messages, { content: inputValue, sender: 'me' }]);
      setInputValue('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  const fetchChat = async (url, data) => {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });

      return res;
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  }

  const runChat = async () => {

  }

  const handleRunPlaywright = (data) => {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ action: "doAction", actionData: data }, (response) => {
        if (response && response.status && response.status === 'success') {
          resolve(response);
        } else {
          reject(new Error("Failed to execute doAction"));
        }
      });
    });
  }

  const waitForTimeout = (timeout) => {
    return new Promise((resolve) => {
      setTimeout(resolve, timeout);
    });
  };

  const sendMessageToBackground = (message) => {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(response);
        }
      });
    });
  };

  const fetchDataAndDecode = async (data, sessionId) => {
    const url = 'http://127.0.0.1:24080/v1/controller'; // TODO: you should change this URL into yours.
    const res = await fetchChat(url, {
      "session_id": sessionId,
      ...data
    });

    if (res.status !== 200 || !res.ok) {
      console.error("Fetch failed:", res);
      return null;
    }

    const reader = res.body.getReader();
    let decoder = new TextDecoder('utf-8');
    let buffer = '';
    let done = false;

    while (!done) {
      const { value, done: doneReading } = await reader.read();
      done = doneReading;
      if (value) {
        buffer += decoder.decode(value, { stream: true });
      }
    }
    return JSON.parse(buffer);
  };

  const handleCleanMessages = (value) => {
    isPaused.current = true;
    setMessages(value);
    // setIsPaused(true);
    // setLoading(false);
    // onPressEnter(null);
    // setIsFinished(true);
  }

  const onPressEnter = async (value) => {
    if (loading) return;
    if (value) {
      if (isPaused.current) {
        isPaused.current = false;
      }
      setMessages(prevMessages => [
        ...prevMessages,
        { id: uuidv4(), role: 'Human', parts: [{ content: value, type: 'text' }], stop: true }
      ]);
      setLoading(true);
      setExit(false);
      setSessionId(null);
      setIsFinished(false);

      let localSessionId = null;

      const chatLoop = async () => {
        let currentRound = 1;
        let currentExit = false;

        while (currentRound <= 30 && !currentExit) {
          console.log("isPaused current: ", isPaused.current);
          if (isPaused.current) {
            setLoading(false);
            setIsFinished(true);
            setMessages(prevMessages => {
              const updatedMessages = [...prevMessages];
              updatedMessages[updatedMessages.length - 1].stop = true;
              updatedMessages[updatedMessages.length - 1].paused = true;
              return updatedMessages;
            })
            message.success("Paused");
            break;
          }

          try {
            const response = await processChatInstruction(value);

            if (response && response.status === 'success') {
              const responseData = await fetchDataAndDecode(response.data, localSessionId);
              if (!responseData) continue;

              console.log('Response Data:', responseData);
              console.log('localSessionId: ', localSessionId);
              setRound(responseData.round);
              localSessionId = responseData.session_id;
              setSessionId(responseData.session_id);

              // const action = await parseAction(responseData.response);
              if (responseData.response && responseData.response.includes('exit')) {
                setExit(true);
                setLoading(false);
                setIsFinished(true);

                let messsageMatch = responseData.response.match(/message="([^"]*)"/);
                let message = messsageMatch ? messsageMatch[1] : null;
                let content = {
                  "operation": "do",
                  "action": "exit",
                  "round": responseData.round,
                  "kwargs": { "instruction": message }
                };
                setMessages(prevMessages => {
                  // Search if same id exists
                  const existingMessageIndex = prevMessages.findIndex(msg => msg.id === responseData.session_id);

                  if (existingMessageIndex !== -1) {
                    // Same id exists, append parts with content
                    const updatedMessages = [...prevMessages];
                    updatedMessages[existingMessageIndex].parts = [
                      ...updatedMessages[existingMessageIndex].parts,
                      { content: content, type: 'text' }
                    ];
                    updatedMessages[existingMessageIndex].stop = true;
                    return updatedMessages;
                  } else {
                    // Same id not exists, create new object for it
                    return [
                      ...prevMessages,
                      { id: responseData.session_id, role: 'Bot', parts: [{ content: content, type: 'text' }], stop: true }
                    ];
                  }
                });
                currentExit = true;
                break;
              }

              console.log("response.data.viewport_size: ", response.data.viewport_size);
              const result = await executeScriptOnActiveTab(responseData.response, responseData.element_id ? responseData.element_id : 0, responseData.element_bbox ? responseData.element_bbox : { "height": 0, "width": 0, "x": 0, "y": 0 }, response.data.viewport_size);
              if (result) {
                await addBotMessage(responseData.session_id, responseData.round, result);
                setLoading(false);
              }

            } else {
              console.log("No response from background.js.");
              setLoading(false);
              setIsFinished(true);
              message.error(`Request Error ${response.status}`);
              break;
            }
          } catch (error) {
            console.error("Error during chat loop:", error);
            setLoading(false);
            setIsFinished(true);
            message.error(`Error during chat loop: ${error}`);
            break;
          } finally {
            setLoading(false);
          }
          currentRound = currentRound + 1;
          await waitForTimeout(2000);
        }
      }
      await chatLoop();
      setIsFinished(true);
      setLoading(false);
    }
  };

  const onPauseChat = async () => {
    console.log("onPauseChat")
    // setIsPaused(true);
    isPaused.current = true;
  }

  const onStopPauseChat = async () => {
    console.log("onStopPauseChat");
    isPaused.current = false;
  }

  const processChatInstruction = (instruction) => {

    return new Promise((resolve, reject) => {
      chrome.tabs.captureVisibleTab(null, { format: "png" }, (dataUrl) => {
        console.log("Captured visible tab.");
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (chrome.runtime.lastError) {
            console.error("chrome.tabs.query error:", chrome.runtime.lastError);
            return reject(chrome.runtime.lastError);
          }

          if (!tabs.length) {
            console.error("No active tabs found.");
            return reject(new Error("No active tabs found"));
          }

          const currentTab = tabs[0];
          const currentTabId = currentTab.id;
          const currentTabUrl = currentTab.url;

          if (!currentTabUrl || currentTabUrl.startsWith('devtools://')) {
            console.error("Cannot access devtools URL.");
            return reject(new Error("Cannot access devtools URL"));
          }

          chrome.scripting.executeScript({
            target: { tabId: currentTabId, },
            func: getHtmlInfo,
          }, (results) => {
            if (results && results[0] && results[0].result) {
              const { html_text, viewport_size } = results[0].result;

              const image = dataUrl;
              resolve({
                status: "success",
                data: {
                  instruction,
                  html_text,
                  image,
                  url: currentTabUrl,
                  viewport_size,
                }
              });
            } else {
              console.log("Request Failed to execute script.");
              reject(new Error("Request Failed to execute script"));
            }
          });
        });
      });
    });
  }

  const executeScriptOnActiveTab = async (response, element_id, element_bbox, viewport_size) => {
    return new Promise((resolve, reject) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (chrome.runtime.lastError) {
          console.error("chrome.tabs.query error:", chrome.runtime.lastError);
          return reject(chrome.runtime.lastError);
        }

        if (!tabs.length) {
          console.error("No active tabs found.");
          return reject(new Error("No active tabs found"));
        }

        const currentTab = tabs[0];
        const currentTabId = currentTab.id;
        const currentTabUrl = currentTab.url;

        if (!currentTabUrl || currentTabUrl.startsWith('devtools://')) {
          console.error("Cannot access devtools URL.");
          return reject(new Error("Cannot access devtools URL"));
        }

        chrome.scripting.executeScript({
          target: { tabId: currentTabId },
          func: doAction,
          args: [currentTabUrl, response, element_id, element_bbox, viewport_size]
        }, (results) => {
          if (results && results[0] && results[0].result) {
            resolve(results[0].result);
          } else {
            console.log("Failed to execute script.");
            reject(new Error("Failed to execute script"));
          }
        });
      });
    });
  };

  const addBotMessage = (sessionId, round, result) => {
    setMessages(prevMessages => {
      // Search if same id exists
      const existingMessageIndex = prevMessages.findIndex(msg => msg.id === sessionId);

      if (existingMessageIndex !== -1) {
        // Same id exists, append parts with content
        const updatedMessages = [...prevMessages];
        updatedMessages[existingMessageIndex].parts = [
          ...updatedMessages[existingMessageIndex].parts,
          { content: { round, ...result }, type: 'text' }
        ];
        return updatedMessages;
      } else {
        // Same id not exists, create new object for it
        return [
          ...prevMessages,
          { id: sessionId, role: 'Bot', parts: [{ content: { round, ...result }, type: 'text' }] }
        ];
      }
    });
  };

  async function doAction(currentTabUrl, response, element_id, element_bbox, viewport_size) {
    if (response) {
      console.log("Response:", response);
      let actionMatch = response.match(/action="([^"]*)"/);
      const argumentMatch = response.match(/argument="([^"]*)"/);
      const instructionMatch = response.match(/instruction="((?:\\"|[^"])*)"/);
      const queryMatch = response.match(/query="([^"]*)"/);
      const withScreenInfoMatch = response.match(/with_screen_info="([^"]*)"/);
      console.log("actionMatch: ", actionMatch);
      let actionName = actionMatch ? actionMatch[1] : null;
      console.log("actionName: ", actionName);
      const argument = argumentMatch ? argumentMatch[1] : null;
      const instruction = instructionMatch ? instructionMatch[1].replace(/\\"/g, '"') : null;
      const query = queryMatch ? queryMatch[1] : null;
      const withScreenInfo = withScreenInfoMatch ? withScreenInfoMatch[1] : null;

      let center_x = element_bbox['x'] + element_bbox['width'] / 2;
      let center_y = element_bbox['y'] + element_bbox['height'] / 2;

      let result = '';

      const waitForTimeout = (timeout) => {
        return new Promise((resolve) => {
          setTimeout(resolve, timeout);
        });
      };

      function simulateMouseClick(element, x, y, button = 'left') {
        if (element) {
          // create and trigger mousedown event
          const mousedownEvent = new MouseEvent('mousedown', {
            bubbles: true,
            cancelable: true,
            view: window,
            button: button === 'right' ? 2 : 0,
            // clientX: x,
            // clientY: y
          });
          element.dispatchEvent(mousedownEvent);

          // create and trigger mouseup event
          const mouseupEvent = new MouseEvent('mouseup', {
            bubbles: true,
            cancelable: true,
            view: window,
            button: button === 'right' ? 2 : 0,
            // clientX: x,
            // clientY: y
          });
          element.dispatchEvent(mouseupEvent);

          // create and trigger click event
          const clickEvent = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            view: window,
            button: button === 'right' ? 2 : 0,
            // clientX: x,
            // clientY: y
          });
          element.dispatchEvent(clickEvent);
        }
      }

      function simulateKeyPress(element, key, isKeyDown = true) {
        const event = new KeyboardEvent(isKeyDown ? 'keydown' : 'keyup', {
          bubbles: true,
          cancelable: true,
          key: key,
          code: `Key${key.toUpperCase()}`,
          location: window.KeyboardEvent.DOM_KEY_LOCATION_STANDARD,
          view: window
        });
        element.dispatchEvent(event);
      }

      async function simulateTyping(element, text) {
        element.value = '';
        for (let i = 0; i < text.length; i++) {
          const char = text[i];

          simulateKeyPress(element, char, true); // keydown
          await new Promise(resolve => setTimeout(resolve, 50));

          element.value = element.value + char;

          const inputEvent = new InputEvent('input', {
            bubbles: true,
            cancelable: true,
            data: char
          });
          element.dispatchEvent(inputEvent);

          simulateKeyPress(element, char, false); // keyup
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      async function simulateCombinationKeyPress(element, key1, key2) {
        simulateKeyPress(element, key1, true); // keydown key1
        await new Promise(resolve => setTimeout(resolve, 50));
        simulateKeyPress(element, key2, true); // keydown key2
        await new Promise(resolve => setTimeout(resolve, 50));
        simulateKeyPress(element, key2, false); // keyup key2
        await new Promise(resolve => setTimeout(resolve, 50));
        simulateKeyPress(element, key1, false); // keyup key1
      }

      function simulateMouseMove(element, x, y) {
        const mouseMoveEvent = new MouseEvent('mousemove', {
          // clientX: x,
          // clientY: y,
          bubbles: true, 
          cancelable: true, 
          view: window
        });
        element.dispatchEvent(mouseMoveEvent);
      }

      async function simulateMouseWheel(deltaX, deltaY) {
        const wheelEvent = new WheelEvent('wheel', {
          deltaX: deltaX,
          deltaY: deltaY,
          bubbles: true
        });
        document.dispatchEvent(wheelEvent);
      }

      const simulateEnterKey = (searchElement) => {
        let focusInEvent = new FocusEvent('focusin', {
          bubbles: true,
          cancelable: false,
          type: 'focusin',
          composed: true,
          defaultPrevented: false,
          detail: 0,
          returnValue: true,
          view: window
        });
        searchElement.dispatchEvent(focusInEvent);

        let clickEvent = new PointerEvent('click', {
          bubbles: true,
          cancelable: true,
          cancelBubble: false,
          composed: true,
          ctrlKey: false,
          metaKey: false,
          shiftKey: false,
          button: 0,
          buttons: 0,
          pointerId: 1,
          pointerType: 'mouse',
          view: window,
          which: 1
        });

        searchElement.dispatchEvent(clickEvent);

        const keydownEvent = new KeyboardEvent('keydown', {
          bubbles: true,
          cancelable: true,
          key: 'Enter',
          code: 'Enter',
          keyCode: 13,
          which: 13
        });
        searchElement.dispatchEvent(keydownEvent);

        const keypressEvent = new KeyboardEvent('keypress', {
          bubbles: true,
          cancelable: true,
          key: 'Enter',
          code: 'Enter',
          keyCode: 13,
          which: 13
        });
        searchElement.dispatchEvent(keypressEvent);

        const keyupEvent = new KeyboardEvent('keyup', {
          bubbles: true,
          cancelable: true,
          key: 'Enter',
          code: 'Enter',
          keyCode: 13,
          which: 13
        });
        searchElement.dispatchEvent(keyupEvent);
      };

      function simulateGoBack(timeout = 6000) {
        return new Promise(resolve => {
          setTimeout(() => {
            window.history.back();
            resolve();
          }, timeout);
        });
      }

      function simulateGoForward(timeout = 6000) {
        return new Promise(resolve => {
          setTimeout(() => {
            window.history.forward();
            resolve();
          }, timeout);
        });
      }

      if (actionName === 'Click') {
        let element = await document.querySelector(`[data-label-id='${element_id}']`) || document.querySelector(`[data-bbox='${element_bbox.x, element_bbox.y, element_bbox.width, element_bbox.height}']`) || document.querySelector(`[data-backend-node-id='${element_id}']`);;
        if (element) {
          element.style.setProperty('border', '4px solid green', 'important');
          await waitForTimeout(1500);
          element.style.border = '';
          console.log("click element", element);
          await simulateMouseClick(element, center_x, center_y, 'left')
        }
        result = { "operation": "do", "action": actionName, "kwargs": { "instruction": instruction }, "bbox": element_bbox };
      } else if (actionName === 'Right Click') {
        let element = await document.querySelector(`[data-label-id='${element_id}']`) || document.querySelector(`[data-bbox='${element_bbox.x, element_bbox.y, element_bbox.width, element_bbox.height}']`) || document.querySelector(`[data-backend-node-id='${element_id}']`);;
        if (element) {
          console.log("Right element", element);
          element.style.setProperty('border', '4px solid green', 'important');
          await waitForTimeout(1500);
          element.style.border = '';
          await element.dispatchEvent(new MouseEvent('contextmenu', {bubbles: true, cancelable: true, view: window}));
        }
        result = { "operation": "do", "action": actionName, "kwargs": { "instruction": instruction }, "bbox": element_bbox };
      } else if (actionName === 'Type') {
        let element = await document.querySelector(`[data-label-id='${element_id}']`) || document.querySelector(`[data-bbox='${element_bbox.x, element_bbox.y, element_bbox.width, element_bbox.height}']`) || document.querySelector(`[data-backend-node-id='${element_id}']`);;
        if (element) {
          element.style.setProperty('border', '4px solid green', 'important');
          await waitForTimeout(1500);
          element.style.border = '';
        }
        if (element && element.tagName.toLowerCase() !== 'input') {
          for (var i = 0; i < element.childNodes.length; i++) {
            if (element.childNodes[i].nodeType === Node.ELEMENT_NODE && element.childNodes[i].tagName.toLowerCase() === 'input') {
              element = element.childNodes[i];
              break;
            }
          }
          if (element.parentElement.tagName.toLowerCase() === 'input') {
            element = element.parentElement;
          }
        }
        if (element && element.tagName.toLowerCase() === 'iframe') {
          var iframe = element;
          var iframeDocument = iframe.contentDocument || iframe.contentWindow.document;
          if (!iframeDocument) {
            console.error('No document found in iframe');
            return;
          }

          // Change the target element to the actual input area inside the iframe
          // let iframeXpath = "//body[@class='cke_editable cke_editable_themed cke_contents_ltr cke_show_borders']"; // Change to your specific internal element xpath
          let iframeXpath = "//html/body"
          let iframeElement = iframeDocument.evaluate(iframeXpath, iframeDocument, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
          if (iframeElement && (iframeElement.tagName.toLowerCase() === 'input' || iframeElement.tagName.toLowerCase() === 'textarea' || iframeElement.classList.contains('cke_editable'))) {
            await waitForTimeout(500);
            iframeElement.focus();
            iframeElement.innerHTML = ''; // clear content
            await simulateInputInIframe(iframeDocument, iframeElement, argument);
          }
          return;
        }
        async function simulateInputInIframe(iframeDocument, element, text) {
          // Helper function to trigger keyboard events in the iframe document
          function triggerKeyEvent(eventType, key, code) {
            const event = new KeyboardEvent(eventType, {
              bubbles: true,
              cancelable: true,
              key: key,
              code: code,
              charCode: key.charCodeAt(0),
              keyCode: key.charCodeAt(0),
            });
            element.dispatchEvent(event);
          }

          element.focus();

          let index = 0;
          while (index < text.length) {
            const char = text[index];
            const code = `Key${char.toUpperCase()}`;

            // Trigger keyboard events for the current character
            triggerKeyEvent('keydown', char, code);
            triggerKeyEvent('keypress', char, code);

            // Insert the text using document.execCommand
            iframeDocument.execCommand('insertText', false, char);

            // Trigger input and keyup events
            const inputEvent = new Event('input', { bubbles: true });
            element.dispatchEvent(inputEvent);

            triggerKeyEvent('keyup', char, code);

            // Type the next character after a short delay
            await waitForTimeout(100);
            // Refocus the editor and set the cursor position
            element.focus();
            const selection = iframeDocument.getSelection();
            const range = iframeDocument.createRange();
            range.selectNodeContents(element);
            range.collapse(false);
            selection.removeAllRanges();
            selection.addRange(range);
            index++;
          }
        }
        if (element && element.isContentEditable && (window.location.href.includes('.baidu.com') || window.location.href.includes('.douban.com'))) {
          // Clear content
          element.innerHTML = '';

          // Simulate typing with the keyboard
          async function simulateEditableInput(content, el) {
            for (let char of content) {
              let textNode = document.createTextNode(char);
              el.appendChild(textNode);
              const inputEvent = new Event('input', { bubbles: true, cancelable: true });
              el.dispatchEvent(inputEvent);
              const changeEvent = new Event('change', { bubbles: true, cancelable: true });
              el.dispatchEvent(changeEvent);
              await waitForTimeout(100); // The time interval can be changed
            }
          }

          element.focus();
          await simulateEditableInput(argument, element);
          console.log("input completed for contenteditable element: ", element);
        } else {
          console.log("The element could not be found or is not contenteditable.");
        }
        if (element && (element.tagName.toLowerCase() === 'input' || element.tagName.toLowerCase() === 'textarea')) {
          await waitForTimeout(500);
          element.focus();
          element.value = argument;
          element.dispatchEvent(new Event('input', { bubbles: true }));
          element.dispatchEvent(new Event('change', { bubbles: true }));
          console.log("type element: ", element);
        }

        function clearDraftEditorContent() {
          const editorContent = document.querySelector('.public-DraftEditor-content');
          if (!editorContent) {
            console.error('Editor content not found');
            return;
          }

          // Focus the editor
          editorContent.focus();

          // Create a range to select all content
          const selection = window.getSelection();
          const range = document.createRange();
          range.selectNodeContents(editorContent);
          selection.removeAllRanges();
          selection.addRange(range);

          // Simulate the delete key press
          const deleteEvent = new KeyboardEvent('keydown', {
            bubbles: true,
            cancelBubble: false,
            cancelable: true,
            defaultPrevented: true,
            key: 'Delete',
            code: 'Delete',
            keyCode: 46,
            which: 46,
            view: window
          });
          editorContent.dispatchEvent(deleteEvent);

          // Trigger input event to notify Draft.js of the change
          const inputEvent = new Event('input', { bubbles: true });
          editorContent.dispatchEvent(inputEvent);
          let clearElement = editorContent.querySelector('.public-DraftStyleDefault-block.public-DraftStyleDefault-ltr');
          if (!window.location.href.includes('.zhihu.com') && clearElement) {
            console.log("element.isContentedEditable: ", editorContent.isContentedEditable);
            
            waitForTimeout(500);
            clearElement.innerHTML = '';
          }
        }

        async function simulateInput(text) {
          const editorContent = document.querySelector('.public-DraftEditor-content');
          if (!editorContent) {
            console.error('Editor content not found');
            return;
          }

          // Helper function to trigger keyboard events
          function triggerKeyEvent(eventType, key, code) {
            const event = new KeyboardEvent(eventType, {
              bubbles: true,
              cancelable: true,
              key: key,
              code: code,
              charCode: key.charCodeAt(0),
              keyCode: key.charCodeAt(0),
            });
            editorContent.dispatchEvent(event);
          }

          // Focus the editor
          editorContent.focus();

          // Simulate typing each character
          let index = 0;

          while (index < text.length) {
            const char = text[index];
            console.log("char: ", char)
            console.log("index: ", index)
            const code = `Key${char.toUpperCase()}`;
            console.log("code: ", code)

            // Trigger keyboard events for the current character
            triggerKeyEvent('keydown', char, code);
            triggerKeyEvent('keypress', char, code);
            // Clear existing content (if any)

            // Insert the text using document.execCommand
            document.execCommand('insertText', false, char);

            // Trigger input and keyup events
            const inputEvent = new Event('input', { bubbles: true });
            editorContent.dispatchEvent(inputEvent);

            triggerKeyEvent('keyup', char, code);

            // Type the next character after a short delay
            await waitForTimeout(100);
            // Refocus the editor and set the cursor position
            editorContent.focus();
            const selection = window.getSelection();
            const range = document.createRange();
            range.selectNodeContents(editorContent);
            range.collapse(false);
            selection.removeAllRanges();
            selection.addRange(range);
            index++;
          }
        }
        // Zhihu uses neither textarea nor input for typing, which uses the draft-x plugin
        console.log("Type Element: ", element);
        if (element && (element.classList.contains('public-DraftStyleDefault-block') || element.classList.contains('public-DraftEditor-content') || element.classList.contains('DraftEditor-editorContainer'))&& (element.tagName.toLowerCase() === "div") && !window.location.href.includes('.douban.com')) {
          if (window.location.href.includes('.zhihu.com')) {
            clearDraftEditorContent();
            simulateInput(argument[0]);
            clearDraftEditorContent();
            simulateInput(argument);
          } else {
            clearDraftEditorContent();
            simulateInput(argument);
          }
        }

        result = { "operation": "do", "action": actionName, "kwargs": { "instruction": instruction, "argument": argument }, "bbox": element_bbox };
      } else if (actionName === 'Search') {
        let element = await document.querySelector(`[data-label-id='${element_id}']`) || document.querySelector(`[data-bbox='${element_bbox.x, element_bbox.y, element_bbox.width, element_bbox.height}']`) || document.querySelector(`[data-backend-node-id='${element_id}']`);;
        if (element) {
          element.style.setProperty('border', '4px solid green', 'important');
          await waitForTimeout(1500);
          element.style.border = '';
          let form = element.closest('form');
          var submitButton = form && form.querySelector('button[type="submit"]');
          var inputSubmitButton = form && form.querySelector('input[type="submit"]');
          if (form && form.checkValidity() && submitButton && !submitButton.disabled) {
            console.log("button form: ", form);
            element.value = argument;
            form.target = '_self';
            await waitForTimeout(500);
            form.submit();
          } else if (form && form.checkValidity() && inputSubmitButton && !inputSubmitButton.disabled) {
            element.value = argument;
            form.target = '_self';
            await waitForTimeout(500);
            inputSubmitButton.click();
          } else {
            // Select all with key comb "Meta+A" and delete all content with "Backspace"
            await simulateCombinationKeyPress(element, 'Meta', 'A');
            await simulateKeyPress(element, 'Backspace');
            // Type content
            await simulateTyping(element, argument);
            await waitForTimeout(2000);
            await simulateEnterKey(element);

            // Special handle due to Weibo design issue, these codes can be removed.
            if ((window.location.href.includes('.baidu.com') || window.location.href.includes('x.com')) && form && form.checkValidity()) {
              if (window.location.href.includes('tieba.baidu.com')) {
                window.location.href = `https://tieba.baidu.com/f?ie=utf-8&kw=${encodeURIComponent(argument)}&fr=search`;
              } else if (window.location.href.includes('x.com')) {
                window.location.href = `https://x.com/search?q=${encodeURIComponent(argument)}`;
              } else {
                form.submit();
              }
            }

            if (window.location.href.includes('https://arxiv.org/') && form && form.checkValidity()) {
              form.submit();
            }

            if ((window.location.href.includes('https://www.weibo.com') || window.location.href.includes('https://weibo.com') || window.location.href.includes('https://s.weibo.com')) && argument) {
              window.location.href = `https://s.weibo.com/weibo?q=${encodeURIComponent(argument)}`;
            }
          }
        }
        result = { "operation": "do", "action": actionName, "kwargs": { "instruction": instruction, "argument": argument }, "bbox": element_bbox };

      } else if (actionName === 'Hover') {
        let element = await document.querySelector(`[data-label-id='${element_id}']`) || document.querySelector(`[data-bbox='${element_bbox.x, element_bbox.y, element_bbox.width, element_bbox.height}']`) || document.querySelector(`[data-backend-node-id='${element_id}']`);
        if (element) {
          element.style.setProperty('border', '4px solid green', 'important');
          await waitForTimeout(1500);
          element.style.border = '';
          await simulateMouseMove(element, center_x, center_y);
        }
        result = { "operation": "do", "action": actionName, "kwargs": { "instruction": instruction }, "bbox": element_bbox };
      } else if (actionName === 'Scroll Down') {
        const htmlElement = document.documentElement;
        const bodyElement = document.body;

        const removeOverflowHidden = (element) => {
          if (window.getComputedStyle(element).overflow === 'hidden') {
            element.style.overflow = '';
          }
        };

        removeOverflowHidden(htmlElement);
        removeOverflowHidden(bodyElement);
        window.scrollBy(0, (viewport_size['viewport_height'] * 2.0 / 3));
        console.log("(viewport_size['viewport_height'] * 2.0 / 3): ", (viewport_size['viewport_height'] * 2.0 / 3));
        result = { "operation": "do", "action": actionName };
      } else if (actionName === 'Scroll Up') {
        const htmlElement = document.documentElement;
        const bodyElement = document.body;

        const removeOverflowHidden = (element) => {
          if (window.getComputedStyle(element).overflow === 'hidden') {
            element.style.overflow = '';
          }
        };

        removeOverflowHidden(htmlElement);
        removeOverflowHidden(bodyElement);
        window.scrollBy(0, -(viewport_size['viewport_height'] * 2.0 / 3));
        result = { "operation": "do", "action": actionName };
      } else if (actionName === 'Press Enter') {
        let element = await document.querySelector(`[data-label-id='${element_id}']`) || document.querySelector(`[data-bbox='${element_bbox.x, element_bbox.y, element_bbox.width, element_bbox.height}']`) || document.querySelector(`[data-backend-node-id='${element_id}']`);;
        if (element) {
          element.style.setProperty('border', '4px solid green', 'important');
          await waitForTimeout(1500);
          element.style.border = '';
          // await page.keyboard.press('Enter');
          await simulateKeyPress(element, 'Enter');
          console.log("Press Enter element: ", element);
        }

        result = { "operation": "do", "action": actionName, "kwargs": { "instruction": instruction } };
      } else if (actionName === 'Select Dropdown Option') {
        let element = await document.querySelector(`[data-label-id='${element_id}']`) || document.querySelector(`[data-bbox='${element_bbox.x, element_bbox.y, element_bbox.width, element_bbox.height}']`) || document.querySelector(`[data-backend-node-id='${element_id}']`);;
        if (element) {
          element.style.setProperty('border', '4px solid green', 'important');
          await waitForTimeout(1500);
          element.style.border = '';
          if (element.tagName.toLowerCase() === 'select') {
            let optionFound = false;
            for (let option of element.options) {
              if (option.text === argument || option.value === argument) {
                element.value = option.value;
                option.selected = true;
                element.dispatchEvent(new Event('change', { bubbles: true }));
                optionFound = true;
                console.log(`Selected option: ${option.text}`);
                break;
              }
            }
            if (!optionFound) {
              console.error(`Option "${argument}" not found in <select> element.`);
            }
          } else if (element.tagName.toLowerCase() === 'input' && element.type === 'radio') {
            // handle radio
            let radioGroup = document.getElementsByName(element.name);
            let optionFound = false;
            for (let radio of radioGroup) {
              if (radio.value === argument || radio.id === argument) {
                radio.checked = true;
                radio.dispatchEvent(new Event('change', { bubbles: true }));
                optionFound = true;
                console.log(`Selected radio button: ${radio.value}`);
                break;
              }
            }
            if (!optionFound) {
              console.error(`Radio button with value or id "${argument}" not found.`);
            }
          } else if (element.tagName.toLowerCase() === 'input' && element.type === 'checkbox') {
            // handle checkbox
            if (argument.toLowerCase() === 'true' || argument === '1') {
              element.checked = true;
            } else if (argument.toLowerCase() === 'false' || argument === '0') {
              element.checked = false;
            }
            element.dispatchEvent(new Event('change', { bubbles: true }));
            console.log(`Checkbox ${argument.toLowerCase() === 'true' ? 'checked' : 'unchecked'}`);
          } else {
            console.warn(`Element is not a <select>, radio button, or checkbox and cannot handle argument "${argument}".`);
          }
        }
        result = {"operation": "do", "action": "Select Dropdown Option", "kwargs": {"instruction": instruction}};
      } else if (actionName === 'Wait') {
        await waitForTimeout(5000);
        result = { "operation": "do", "action": 'Wait' };
      } else if (actionName === 'Go Backward') {
        await simulateGoForward();
        await waitForTimeout(6000);
        result = { "operation": "do", "action": 'Go Backward' };
      } else if (actionName === 'Go Back') {
        await simulateGoBack();
        await waitForTimeout(6000);
        result = { "operation": "do", "action": 'Go Forward' };
      } else if (actionName === 'Refresh') {
        await waitForTimeout(2000);
        await window.location.reload();
        await waitForTimeout(2000);
        result = { "operation": "do", "action": 'Refresh' };
      } else {
        result = '';
        throw new Error(`Unsupported action: ${actionName}`);
      }

      return result
    }
  }

  const renderMessage = (message, index) => {
    if (message.role === 'Human') {
      console.log("message.parts: ", message);
      return (
        <div key={index} className="flex w-full gap-[4px] flex-col">
          <div className="flex items-center gap-[4px] height-[20px]">
            <img src={UserSvg} className="w-[24px] h-[24px]" alt="User" />
            <span className="text-[16px] color-[#000] font-weight-600 line-height-[22px] overflow-hidden text-ellipsis break-all">You</span>
          </div>
          <div className="max-w-[95%] overflow-auto text-[16px] mt-[4px] pl-[28px]">
            <div className="text-[15px]" style={{ whiteSpace: 'pre-wrap' }}>
              {
                message.parts && message.parts.length && message.parts[0].type === 'text' ? message.parts[0].content : ''
              }
            </div>
          </div>
        </div>
      )
    }
  }

  const renderStepContent = (message) => {
    let part = message && message.parts && message.parts.length > 0 && message.parts[message.parts.length - 1];
    return <div className='mt-[4px]'><Tag style={{backgroundColor: 'transparent'}} bordered={false} className="multiline-tag tag-small" icon={<PlayCircleFilled />} color="#2db7f5">{part.content.action}</Tag>
        {part && part.content && part.content.kwargs && part.content.kwargs.argument ? <Tag style={{backgroundColor: 'transparent'}} bordered={false} className="multiline-tag tag-small" icon={<EditFilled />} color="#2db7f5">{part.content.kwargs.argument}</Tag> : null}
        {part && part.content && part.content.kwargs && part.content.kwargs.instruction ? <Tag style={{backgroundColor: 'transparent'}} bordered={false} className="multiline-tag tag-small" icon={<MessageFilled />} color="#2db7f5">{part.content.kwargs.instruction}</Tag> : null}
        </div>
  }

  const renderStepItems = (message) => {
    return (
      <div className="w-full">
        <div className="flex">
          <div className="rounded-b-xl rounded-tr-xl flex-1 text-[16px] overflow-hidden">
            {
              message.parts.map((part, index) => (
                <>
                <div key={index} className="text-[16px] flex flex-col mt-[4px]">
                  {/* <div>Step: {part.content.round}</div> */}
                  <div className="flex flex-row w-full">
                    <Tag style={{backgroundColor: 'transparent'}} bordered={false} className="multiline-tag tag-small" icon={<PlayCircleFilled />} color="#2db7f5">{part.content.action}</Tag>
                    {part && part.content && part.content.kwargs && part.content.kwargs.argument ? <Tag style={{backgroundColor: 'transparent'}} bordered={false} className="multiline-tag tag-small" icon={<EditFilled />} color="#2db7f5">{part.content.kwargs.argument}</Tag> : null}
                  </div>
                  {part && part.content && part.content.kwargs && part.content.kwargs.instruction ? <div className='mt-[1px]'><Tag style={{backgroundColor: 'transparent'}} bordered={false} className="multiline-tag tag-small" icon={<MessageFilled />} color="#2db7f5">{part.content.kwargs.instruction}</Tag></div> : null}
                </div>
                {index !== message.parts.length - 1 && <Divider style={{ borderColor: 'white' }} className="my-[6px]" key={index} />}
                </>
              ))
            }
          </div>
        </div>
      </div>
    )
  };

  return (
    <div className="flex-1 h-full w-full flex flex-col relative padding-0" style={{ minHeight: 0, textAlign: 'left' }}>
      <div style={{ zIndex: 4999 }}></div>
      <div className="flex-1 flex flex-col w-full items-center" style={{ minHeight: 0 }}>
        <div id="chat-messages-scroll" ref={chatWindowRef} className="flex-1 overflow-y-scroll w-full flex flex-col items-center" style={{
          overscrollBehavior: "contain"
        }}>
          <div className="message-items">
            {messages.map((message, index) => (<div key={index}>
              {message.role === 'Human' &&
                <div className="text-base w-full flex flex-wrap lg:px-0 m-auto items-start">{renderMessage(message, index)}</div>
              }
              {message.role === 'Bot' &&
                <div className="flex w-full gap-[4px] flex-col ">
                  <div className="flex gap-[4px] items-center height-[28px]">
                    <img src={AnswerSvg} className="w-[24px] h-[24px]" alt="answer" />
                    <span className="text-[16px] font-weight-600 line-height-[22px] overflow-hidden text-ellipsis break-all">OpenWeb Agent</span>
                  </div>
                  <div className="flex flex-col max-w-[95%] bg-customPurple ml-[28px] px-[14px] py-[10px] rounded text-white shadow-[0_4px_8px_rgba(0,0,0,0.05)]">
                    <div className="flex flex-col">
                      {!message.stop && (!loading && isFinished ? <div>Request Exits Abnormally</div> : <div className="flex flex-row"><Spin className="custom-spin" /> <div className='ml-[8px]'>Generate Processing</div> </div>
                      )}
                      {message.stop && <div>Generate {message.paused ? "Paused" : "Finished"}</div>}
                      {message && renderStepContent(message)}
                    </div>
                    <div className="flex flex-col w-full">
                      <Divider style={{ borderColor: 'white' }} className="my-[8px]"></Divider>
                      <Collapse style={{backgroundColor: 'transparent'}} expandIconPosition="end" bordered={false}>
                        <Collapse.Panel className="history-panel" header="history" key="1">
                          {renderStepItems(message)}
                        </Collapse.Panel>
                      </Collapse>
                    </div>
                  </div>
                </div>
              }
            </div>
            ))}

            {loading && 
              <div className="flex w-full gap-[4px] flex-col ">
                <div className="flex gap-[4px] items-center height-[28px]">
                  <img src={AnswerSvg} className="w-[24px] h-[24px]" alt="answer" />
                  <span className="text-[16px] font-weight-600 line-height-[22px] overflow-hidden text-ellipsis break-all">OpenWeb Agent</span>
                </div>
                <div className="flex flex-col max-w-[95%] text-white bg-customPurple ml-[28px] px-[14px] py-[10px] rounded shadow-[0_4px_8px_rgba(0,0,0,0.05)]">
                  <div className="flex items-center">
                    <Spin className="custom-spin" />
                    <div className='ml-[8px]'>Generate Processing</div>
                  </div>
                </div>
              </div>
            }
          </div>
        </div>
        <div className="bg-second-color w-full" style={{ padding: '0 16px' }}>
          <GlobalInput
            gref={gref}
            isFinished={isFinished}
            onPressEnter={onPressEnter}
            handleCleanMessages={handleCleanMessages}
            onPauseChat={onPauseChat}
            pausedValue={isPaused.current}
            onStopPauseChat={onStopPauseChat}
          />
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;