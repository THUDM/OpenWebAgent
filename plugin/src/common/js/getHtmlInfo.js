async function getHtmlInfo() {
    let refinePrompt = {
        dom: '<{tag}{label}|{attr}{content}{subtree} >',
        label: '[{label}]',
        attr: '{attr}',
        attrSplitter: '; ',
        subtreeSplitter: ' ',
    };

    let xmlPrompt = {
        dom: '<{tag}{label}{attr}>{content}{subtree} </{tag}>',
        label: ' id="{label}"',
        attr: '{key}="{attr}"',
        attrSplitter: ' ',
        subtreeSplitter: ' ',
    };

    let prompts = {
        refine: refinePrompt,
        xml: xmlPrompt,
        new_data: refinePrompt,
    };

    class HtmlPrompt {
        constructor(prompt = '') {
            prompt = this.extract(prompt, 'xml');
            if (!prompts.hasOwnProperty(prompt)) {
                throw new Error('Unknown prompt: ' + prompt);
            }

            const constructors = {
                'refine': this.normalPromptConstructor,
                'xml': this.normalPromptConstructor,
                'new_data': this.newDataPromptConstructor,
            };

            this.name = prompt;
            this.prompt = prompts[prompt];
            this.constructor = constructors[prompt];
        }

        extract(data, defaultValue = '') {
            return data ? data : defaultValue;
        }

        subtreeConstructor(subtree = []) {
            return subtree.join(this.prompt.subtreeSplitter);
        }

        normalPromptConstructor(tag = '', label = '', content = '', subtreeStr = '', classDict = {}) {
            const addPrefix = (data, prefix) => {
                return data.length > 0 ? prefix + data : '';
            };

            tag = this.extract(tag);
            label = this.extract(label);
            content = this.extract(content);
            subtreeStr = this.extract(subtreeStr, '');
            classDict = this.extract(classDict, {});

            let labelStr = '';
            if (label.length > 0) {
                labelStr = ` id="${label}"`;
            }

            const classes = [];
            const values = new Set();
            for (const [key, val] of Object.entries(classDict)) {
                if (values.has(val)) {
                    continue;
                }
                values.add(val);
                classes.push(`${key}="${val}"`);
            }
            let classesStr = classes.join(this.prompt.attrSplitter);

            const contentSplitter = (classesStr.length === 0) ? ' ' : this.prompt.attrSplitter;
            classesStr = addPrefix(classesStr, ' ');
            const contentStr = addPrefix(content, contentSplitter);
            subtreeStr = addPrefix(subtreeStr, ' ');

            return `<${tag}${labelStr}${classesStr}>${contentStr}${subtreeStr}</${tag}>`;
        }

        newDataPromptConstructor(tag = '', label = '', content = '', subtreeStr = '', classDict = {}) {
            const addPrefix = (data, prefix) => {
                return data.length > 0 ? prefix + data : '';
            };

            tag = this.extract(tag);
            label = this.extract(label);
            content = this.extract(content);
            subtreeStr = this.extract(subtreeStr, '');
            classDict = this.extract(classDict, {});

            let labelStr = '';
            if (label.length > 0) {
                labelStr = ` id="${label}"`;
            }

            const classes = [];
            const values = new Set();

            const message = [];
            for (const [key, val] of Object.entries(classDict)) {
                if (val === '') {
                    message.push(key);
                    continue;
                }
                if (values.has(val)) {
                    continue;
                }
                values.add(val);
                classes.push(`${key}="${val}"`);
            }

            if (message.length > 0) {
                const messageStr = message.join(' ');
                classes.push(`message="${messageStr}"`);
            }

            let classesStr = classes.join(this.prompt.attrSplitter);

            const contentSplitter = (classesStr.length === 0) ? ' ' : this.prompt.attrSplitter;
            classesStr = addPrefix(classesStr, ' ');
            const contentStr = addPrefix(content, contentSplitter);
            subtreeStr = addPrefix(subtreeStr, ' ');

            return `<${tag}${labelStr}${classesStr}>${contentStr}${subtreeStr}</${tag}>`;
        }

        promptConstructor(tag = '', label = '', content = '', subtreeStr = '', classDict = {}) {
            return this.constructor(tag, label, content, subtreeStr, classDict);
        }
    }

    var basic_attrs = [
        'title',
        'value',
        'type',
        'placeholder',
        'selected',
        'data-value',
        'data-text',
        'data-testid',
        'data-label',
        'data-bbox',
        'data-status'
    ]

    const getWindow = () => {
        let x = window.screenX;
        let y = window.screenY;
        let w = window.innerWidth;
        let h = window.innerHeight;

        return [x, y, w, h];
    }

    const getViewport = () => {
        let width = window.visualViewport.width;
        let height = window.visualViewport.height;
        return {
            viewport_width: width,
            viewport_height: height
        };
    }

    const getRoot = (tree) => {
        let node = tree;
        while (true) {
            let parent = node.parentNode;
            if (!parent || parent.nodeType !== Node.ELEMENT_NODE) {
                break;
            }
            node = parent;
        }
        return node;
    }

    function rect2tuple(rect) {
        if (rect === null || typeof rect !== 'string') {
            return false;
        }
        rect = rect.trim();
        if (rect.split(',').length !== 4) {
            return false;
        }
        rect = rect.split(',').map(parseFloat);
        return rect;
    }

    const prepareScript = () => {
        // mark backend node id
        var vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
        var vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);

        var backendId = 0;
        Array.prototype.slice.call(
            document.querySelectorAll("*")
        ).forEach((element) => {
            element.setAttribute("data-backend-node-id", backendId);
            backendId++;
            
            var tag = element.tagName.toLowerCase?.() || "";
            var bb = element.getClientRects();
            var rect = {
                left: 0,
                top: 0,
                right: 0,
                bottom: 0,
                width: 0,
                height: 0
            };

            if (bb.length > 0) {
                bb = bb[0];
                // rect = {
                //     left: Math.round(Math.max(0, bb.left) * 100) / 100,
                //     top: Math.round(Math.max(0, bb.top) * 100) / 100,
                //     right: Math.round(Math.min(vw, bb.right) * 100) / 100,
                //     bottom: Math.round(Math.min(vh, bb.bottom) * 100) / 100
                // };
                rect = {
                    left: (Math.round(bb.left) * 100) / 100,
                    top: (Math.round(bb.top) * 100) / 100,
                    right: (Math.round(bb.right) * 100) / 100,
                    bottom: (Math.round(bb.bottom) * 100) / 100
                };
                rect = {
                    ...rect,
                    width: Math.round((rect.right - rect.left) * 100) / 100,
                    height: Math.round((rect.bottom - rect.top) * 100) / 100
                };
                
                element.setAttribute("data-bbox", `${rect.left},${rect.top},${rect.width},${rect.height}`);
            }

            if (element.hasChildNodes()) {
                let children = Array.prototype.slice.call(element.childNodes);
                var texts = children.filter(
                    (node) => node.nodeType == Node.TEXT_NODE
                ).map(
                    (node) => node.textContent.trim().replace(/\s{2,}/g, " ") || ""
                ).filter(
                    (text) => text.length > 0
                )
                element.setAttribute("data-text", texts.join(","));
            } 

            // fix select issue
            if (tag == "select") {
                var value = element.value;
                var text = element.options[element.selectedIndex]?.text || "";
                element.setAttribute("data-value", value);
                element.setAttribute("data-text", text);
                element.options[element.selectedIndex]?.setAttribute("data-status", "selected");
            }

            if (tag == "input") {
                var input_type = element.getAttribute("type") || "";
                if (input_type == "checkbox") {
                    var status = element.checked? "checked" : "not-checked";
                    element.setAttribute("data-status", status);
                }
            }
        });

        // fix input and textarea issue
        Array.prototype.slice.call(
            document.querySelectorAll("input, textarea")
        ).forEach(element => {
            element.setAttribute("data-value", element.value);
        });
    };

    const clickableCheckerScript = () => {
        var items = Array.prototype.slice.call(
            document.querySelectorAll('*')
        ).map(function(element) {
            // element.classList.add('possible-clickable-element');
            var vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
            var vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
            
            var rects = [...element.getClientRects()].filter(bb => {
                var center_x = bb.left + bb.width / 2;
                var center_y = bb.top + bb.height / 2;
                var elAtCenter = document.elementFromPoint(center_x, center_y);
            
                if (!elAtCenter) return false;
                return elAtCenter === element || element.contains(elAtCenter) 
            }).map(bb => {
                const rect = {
                    left: Math.max(0, bb.left),
                    top: Math.max(0, bb.top),
                    right: Math.min(vw, bb.right),
                    bottom: Math.min(vh, bb.bottom)
                };
                return {
                    ...rect,
                    width: rect.right - rect.left,
                    height: rect.bottom - rect.top
                }
            });
            // var rects = [];
            var area = rects.reduce((acc, rect) => acc + rect.width * rect.height, 0);
        
            const tagName = element.tagName.toLowerCase?.() || "";
            let isClickable = ((element.onclick != null) || window.getComputedStyle(element).cursor == "pointer");
            
            // Insert area elements that provide click functionality to an img.
            if (tagName === "img") {
                let mapName = element.getAttribute("usemap");
                if (mapName) {
                    const imgClientRects = element.getClientRects();
                    mapName = mapName.replace(/^#/, "").replace('"', '\\"');
                    const map = document.querySelector(`map[name=\"${mapName}\"]`);
                    if (map && (imgClientRects.length > 0)) isClickable = true;
                }
            }
        
            if (!isClickable) {
                const role = element.getAttribute("role");
                const clickableRoles = [
                    "button",
                    "tab",
                    "link",
                    "checkbox",
                    "menuitem",
                    "menuitemcheckbox",
                    "menuitemradio",
                    "radio",
                ];
                if (role != null && clickableRoles.includes(role.toLowerCase())) {
                    isClickable = true;
                } else {
                    const contentEditable = element.getAttribute("contentEditable");
                    if (
                    contentEditable != null &&
                    ["", "contenteditable", "true"].includes(contentEditable.toLowerCase())
                    ) {
                    isClickable = true;
                    }
                }
            }
        
            // Check for jsaction event listeners on the element.
            if (!isClickable && element.hasAttribute("jsaction")) {
                const jsactionRules = element.getAttribute("jsaction").split(";");
                for (let jsactionRule of jsactionRules) {
                    const ruleSplit = jsactionRule.trim().split(":");
                    if ((ruleSplit.length >= 1) && (ruleSplit.length <= 2)) {
                    const [eventType, namespace, actionName] = ruleSplit.length === 1
                        ? ["click", ...ruleSplit[0].trim().split("."), "_"]
                        : [ruleSplit[0], ...ruleSplit[1].trim().split("."), "_"];
                    if (!isClickable) {
                        isClickable = (eventType === "click") && (namespace !== "none") && (actionName !== "_");
                    }
                    }
                }
            }
        
            if (!isClickable) {
                const clickableTags = [
                    "input",
                    "textarea",
                    "select",
                    "button",
                    "a",
                    "iframe",
                    "video",
                    "object",
                    "embed",
                    "details"
                ];
                isClickable = clickableTags.includes(tagName);
            }
            
            if (!isClickable) {
                if (tagName === "label")
                    isClickable = (element.control != null) && !element.control.disabled;
                else if (tagName === "img")
                    isClickable = ["zoom-in", "zoom-out"].includes(element.style.cursor);
            }

            // An element with a class name containing the text "button" might be clickable. However, real
            // clickables are often wrapped in elements with such class names. So, when we find clickables
            // based only on their class name, we mark them as unreliable.
            const className = element.getAttribute("class");
            if (!isClickable && className && className.toLowerCase().includes("button")) {
                isClickable = true;
            }
        
            // Elements with tabindex are sometimes useful, but usually not. We can treat them as second
            // class citizens when it improves UX, so take special note of them.
            const tabIndexValue = element.getAttribute("tabindex");
            const tabIndex = tabIndexValue ? parseInt(tabIndexValue) : -1;
            if (!isClickable && !(tabIndex < 0) && !isNaN(tabIndex)) {
                isClickable = true;
            }
        
            const idValue = element.getAttribute("id");
            const id = idValue ? idValue.toLowerCase() : "";
            if (isClickable && area == 0) {
                const textValue = element.textContent.trim().replace(/\s{2,}/g, ' ');
                let clickable_msg = `${tagName}[id=${id}] ${isClickable} (${area}) ${textValue}`
            }
        
            return {
                element: element,
                include: isClickable,
                area,
                rects,
                text: element.textContent.trim().replace(/\s{2,}/g, ' ')
            };
        })
        .filter(item =>
            item.include &&
            (item.area >= 1)
        );

        // items = items.filter(x => !items.some(y => x.element.contains(y.element) && !(x == y)))
        console.log("Filtered items: ", items);
        items.forEach(item => {
            item.element.classList.add('possible-clickable-element');
        });
    }

    const labelScript = (packet) => {
        function int2str(index) {
            var str = "";
            while (index >= 0) {
                str = String.fromCharCode(65 + index % 26) + str;
                index = Math.floor(index / 26) - 1;
            }
            return str;
        };

        let selector = packet.selector
        let index = packet.startIndex
        var items = Array.prototype.slice.call(
            document.querySelectorAll(selector)
        );

        var vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
        var vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
        
        // items = items.filter(
        //     x => !items.some(y => x.contains(y) && !(x == y))
        // )
        items = items.map(element => {
            var bb = element.getClientRects();
            var rect = {
                left: 0,
                top: 0,
                right: 0,
                bottom: 0,
                width: 0,
                height: 0
            };
            var keep = false;
            var text = "", id = -1;
            if (bb.length > 0) {
                bb = bb[0];
                rect = {
                    left: Math.max(0, bb.left),
                    top: Math.max(0, bb.top),
                    right: Math.min(vw, bb.right),
                    bottom: Math.min(vh, bb.bottom)
                };
                rect = {
                    ...rect,
                    width: rect.right - rect.left,
                    height: rect.bottom - rect.top
                };
                if (rect.width > 0 || rect.height > 0) {
                    keep = true;
                    if (index >= 0) { 
                        // id = int2str(index++);
                        id = index++;
                        element.setAttribute("data-label-id", id);
                    }
                    var childNodes = element.childNodes;
                    
                    for (var i = 0; i < childNodes.length; i++) {
                        if (childNodes[i].nodeType == Node.TEXT_NODE) {
                            text += childNodes[i].textContent;
                        }
                    }
                }
            }
            
            return {
                keep: true,
                id,
                rects: rect,
                tag: element.tagName.toLowerCase?.() || "",
                text,//: element.innerText?.trim().replace(/\s{2,}/g, " ") || ""
            };
        }).filter(x => x.keep);

        return [items, index];
    }

    const elementInfoScript = () => {
        function getElementInfo(element) {
            return {
                "bid": element.getAttribute("data-backend-node-id") || "",
                "label": element.getAttribute("data-label-id") || "",
                "tag": element.tagName.toLowerCase?.() || "",
                "area": JSON.parse("[" + (element.getAttribute("data-bbox") || "") + "]"),
                "text": element.innerText?.trim().replace(/\s{2,}/g, " ") || "",
                "id": element.getAttribute("id") || "",
                "role": element.getAttribute("role") || "",
                "aria-label": element.getAttribute("aria-label") || "",
                "href": element.getAttribute("href") || "",
            };
        }
        
        var all_items = Array.prototype.slice.call(
            document.querySelectorAll("*")
        ).map((element) => {
            return getElementInfo(element);
        });
        
        var clickable_items = Array.prototype.slice.call(
            document.querySelectorAll("*")
        ).filter(
            element => element.getAttribute("data-label-id")
        ).map((element) => {
            return getElementInfo(element);
        });
        
        return {
            all_elements: all_items, 
            clickable_elements: clickable_items
        };
    }

    const parse = (root, windowSize) => {
        function getSubText(str) {
            return str ? str.trim().substring(0, 100) : '';
        }

        function getText(node) {
            let text = '';
            Array.from(node.childNodes).forEach(child => {
                if (child.nodeType === Node.TEXT_NODE) {
                    text += child.textContent.trim() + ' ';
                }
            });
            return getSubText(text.trim());
        }

        function isVisible(node, bid) {
            let rect = {};
            let bound = node.getAttribute('data-bbox') || null;

            if (!rect2tuple(bound)) {
                return false;
            }

            if (!windowSize) {
                return false;
            }

            // get window size
            let [wx, wy, ww, wh] = windowSize;
            let [x, y, w, h] = rect2tuple(bound);
            
            if (x === null || y === null || w === null || h === null) return false;

            if ((x + w) < 0 || x > ww || (y + h) < 0 || y > wh) {
                return false;
            }

            return true;
        }

        function checkAttr(attr, node) {
            var tag = node.tagName.toLowerCase();
            if (
                (attr === 'role' && ['presentation', 'none', 'link'].includes(node.getAttribute(attr)))
                || (attr === 'type' && node.getAttribute(attr) === 'hidden')
                || (attr === 'aria-hidden' && node.getAttribute(attr) === 'true')
            ) {
                return false;
            }
            return true;
        }
        

        function _dfs(node, parKeep) {
            let bid = node.getAttribute("data-backend-node-id") || '';
            let tag = node.tagName.toLowerCase();
            let label = node.getAttribute("data-label-id") || '';

            // element which is keeped equivalent to visible
            let visible = isVisible(node, bid);
            let keepElement = visible || parKeep;

            if (label) {
                keepElement = true;
            }
            // get text or alt_text of current element
            let text = getText(node);

            let classes = {};
            // keep attributes if needed
            let keepAttrs = basic_attrs;

            for(let i = 0; i < keepAttrs.length; i++) {
                if (!Array.from(node.attributes).map(attr => attr.name).includes(keepAttrs[i]) || !checkAttr(keepAttrs[i], node)) {
                    continue;
                }

                if (["data-backend-node-id", "data-label-id"].includes(keepAttrs[i])) {
                    continue;
                }

                let val = getSubText(node.getAttribute(keepAttrs[i]));
                if (val.length > 0 || keepAttrs.length === 0) {
                    classes[keepAttrs[i]] = val;
                }
            }

            let haveText = text.length > 0 || (classes.length - ("data-bbox" in classes ? 1 : 0) > 0);
            parKeep = keepElement && tag === 'select';
            
            let parts = [];
            let clickableCount = 0;
            let children = node.children;

            
            for (const child of children) {
                if (child.nodeType === Node.ELEMENT_NODE) {
                    let childRes = _dfs(child, parKeep);
                    if (childRes && childRes.length > 0) {
                        parts.push(childRes);
                    }
                }
            }

            const htmlPrompt = new HtmlPrompt();
            let dom = htmlPrompt.subtreeConstructor(parts);

            if (keepElement) {
                dom = htmlPrompt.promptConstructor(tag, label, text, dom, classes);
            }

            // remove <text|> if all children are text
            // console.log("dom: ", dom);
            return dom
        }

        let dom = _dfs(root, false);

        return dom;
    };

    const parseTree = (domTree, windowSize) => {
        let startTime = Date.now();
        const root = getRoot(domTree);
        const dom = parse(root, windowSize);
        console.log(`Parsing took ${Date.now() - startTime}ms`);
        return dom;
    };

    const waitForTimeout = (timeout) => {
        return new Promise((resolve) => {
            setTimeout(resolve, timeout);
        });
    };    

    const checkPageLoaded = () => {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                console.log("Page load timeout after 10 seconds");
                resolve(); // keep running after timeout, dont reject Promise
            }, 10000);

            const checkLoaded = () => {
                console.log(document.readyState === 'complete')
                if (document.readyState === 'complete') {
                    clearTimeout(timeout);
                    resolve();
                } else {
                    console.log("Page is not fully loaded yet.");
                    setTimeout(checkLoaded, 100);
                }
            }
            checkLoaded();
        });
    }

    const modifyPage = async () => {
        await waitForTimeout(500);

        try {
            console.log("remove label id");
            (() => {
                Array.from(document.getElementsByClassName('possible-clickable-element')).forEach((element) => {
                    element.classList.remove('possible-clickable-element');
                    element.removeAttribute('data-value');
                    element.removeAttribute('data-text');
                    element.removeAttribute('data-label');
                    element.removeAttribute('data-bbox');
                    element.removeAttribute('data-status');
                    element.removeAttribute('data-backend-node-id');
                    element.removeAttribute('data-label-id');
                });
            })();
        } catch (error) {
            console.log("error: ", error);
        }

        let packet = {
            // "raw_html": document.documentElement.outerHTML,
            "window": getWindow(),
            "viewportSize": getViewport(),
        }

        // prepare
        prepareScript();

        await waitForTimeout(100);

        // clickable checker script
        (clickableCheckerScript)();

        // get all clickable elements
        let startIndex = 0;
        let items;
        [items, startIndex] = labelScript({
            "selector": ".possible-clickable-element",
            "startIndex": startIndex
        });

        await waitForTimeout(50);

        await waitForTimeout(100);

        // remove markers on the page
        (() => {
            document.querySelectorAll(".our-dom-marker").forEach(item => {
                document.body.removeChild(item);
            });
        })();
        
        packet['modified_html'] = document.documentElement.outerHTML;

        // element info script
        let elementInfo = (elementInfoScript)();
        // await waitForTimeout(100);
        packet['element_info'] = elementInfo;

        let domTree = ctx2tree(packet['modified_html']);
        let pageHtml = parseTree(domTree, packet['window']);

        // window.addEventListener('resize', function() {
        //     packet['window'] = getWindow();
        //     pageHtml = parseTree(domTree, packet['window']);
        //     console.log("pageHtml: ", pageHtml);
        //     console.log("window: ", packet['window']);
        // });

        packet['html'] = pageHtml;

        return packet;
    }

    function ctx2tree(ctx) {
        // remove useless tag such as style and script
        ctx = ctx.replace(/<!--[\s\S]*?-->/g, '');
        ctx = ctx.replace(/<style[\s\S]*?<\/style>/g, '');
        ctx = ctx.replace(/<script[\s\S]*?<\/script>/g, '');
        ctx = ctx.replace(/<link[\s\S]*?>/g, '');
        ctx = ctx.replace(/<noscript[\s\S]*?<\/noscript>/g, '');
        ctx = ctx.replace(/<plasmo-csui[\s\S]*?<\/plasmo-csui>/g, '');
        ctx = ctx.replace(/<svg\b[^>]*>(.*?)<\/svg>/g, '<svg></svg>');
        ctx = ctx ? ctx.replace(/\s+/g, ' ').trim() : '';
        // ctx = ctx.replace(/<[^>]*\bstyle=["']?[^'">]*\bdisplay\s*:\s*none;?[^'">]*["']?[^>]*>.*?<\/[^>]+>/gi, '');
        // ctx = ctx.replace(/<[^>]*\bstyle=["']?[^'">]*\bopacity\s*:\s*0;?[^'">]*["']?[^>]*>.*?<\/[^>]+>/gi, '');
        
        // search for <meta charset="..."> and update charset
        const charsetMatch = ctx.match(/<meta charset="([^"]*)">/);
        let parser = new DOMParser({
            explicitDocumentType: true,
            proxyDocument: {
                encoding: 'utf-8'
            }
        });
        
        if (charsetMatch) {
            const charset = charsetMatch[1];
            parser = new DOMParser({
                explicitDocumentType: true,
                proxyDocument: {
                    encoding: charset
                }
            });
            console.log('Charset:', charset);
        } else {
            console.log('Charset not found');
        }
    
        // parse HTML string into DOM tree
        let doc = parser.parseFromString(ctx, 'text/html');
        
        // Function to remove elements with display: none in inline style
        function removeHiddenElements(doc) {
            const elements = doc.querySelectorAll('*');
            elements.forEach(el => {
                const style = el.getAttribute('style');
                if (style && (
                    style.includes('display: none') || 
                    style.includes('display:none') ||
                    style.includes('visibility: hidden') ||
                    style.includes('visibility:hidden') ||
                    style.includes('opacity: 0') ||
                    style.includes('opacity:0') ||
                    style.includes('position: absolute') && style.includes('left: -9999px') ||
                    style.includes('clip: rect(0, 0, 0, 0)') ||
                    style.includes('clip-path: inset(100%)') ||
                    style.includes('height: 0') ||
                    style.includes('height:0') ||
                    style.includes('width: 0') ||
                    style.includes('width:0')
                )) {
                    el.remove();
                }
            });
        }

        // // Function to remove elements whose content is purely style-related
        // function removeStyleOnlyElements(doc) {
        //     const selfClosingTags = ['INPUT', 'IMG', 'TEXTAREA'];
    
        //     const allElements = doc.querySelectorAll('*');
        //     allElements.forEach(el => {
        //         // If the element has no child nodes or only style/script nodes, remove it
        //         if (selfClosingTags.includes(el.tagName)) {
        //             return;
        //         }
        //         if (!el.hasChildNodes() || [...el.childNodes].every(node => 
        //             node.nodeType === Node.ELEMENT_NODE && 
        //             (node.tagName === 'STYLE' || node.tagName === 'SCRIPT') || 
        //             node.nodeType === Node.TEXT_NODE && !node.nodeValue.trim()
        //         )) {
        //             el.remove();
        //         }
        //     });
        // }
    
        // Apply the removal functions
        // removeStyleOnlyElements(doc);
        removeHiddenElements(doc);
        const domTree = doc.documentElement;
        return domTree;
    }

    function removeTags(htmlString) {
        // Remove <svg> tags and their content
        // htmlString = htmlString.replace(/<svg[^>]*>([\s\S]*?)<\/svg>/gi, '');
        // htmlString = htmlString.replace(/<button[^>]*>([\s\S]*?)<\/button>/gi, '');
        // htmlString = htmlString.replace(/<textarea[^>]*>([\s\S]*?)<\/textarea>/gi, '');
        // htmlString = htmlString.replace(/<input[^>]*>([\s\S]*?)<\/input>/gi, '');
        // htmlString = htmlString.replace(/<a[^>]*>([\s\S]*?)<\/a>/gi, '');
        // htmlString = htmlString.replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, '');
        htmlString = htmlString.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, '');
        htmlString = htmlString.replace(/<meta[^>]*>([\s\S]*?)<\/meta>/gi, '');
        // Remove <img> tags
        // htmlString = htmlString.replace(/<img[^>]*>/gi, '');
        htmlString = htmlString.replace(/<br[^>]*>/gi, '');
    
        // Remove <meta> tags
        htmlString = htmlString.replace(/<meta[^>]*>/gi, '');
        // Remove all id attributes
        // htmlString = htmlString.replace(/\s*id\s*=\s*["'][^"']*["']/g, '');
        
        // Remove all data-bbox attributes
        htmlString = htmlString.replace(/\s*data-text\s*=\s*["'][^"']*["']/g, '');
        htmlString = htmlString.replace(/\s*title\s*=\s*["'][^"']*["']/g, '');

        // 移除 <html> 标签上的 data-bbox 属性
        htmlString = htmlString.replace(/<html\b([^>]*)\bdata-bbox="[^"]*"\s*/g, '<html$1');
        // 移除 <body> 标签上的 data-bbox 属性
        htmlString = htmlString.replace(/<body\b([^>]*)\bdata-bbox="[^"]*"\s*/g, '<body$1');
        htmlString = htmlString.replace(/>\s+</g, '><');

        // 移除任何多余的空格
        htmlString = htmlString.replace(/<html\s*>/g, '<html>');
        htmlString = htmlString.replace(/<body\s*>/g, '<body>');

        // if (htmlString.length > 16385) {
            // htmlString = htmlString.substring(0, 16385);
        // }
    
        return htmlString;
    }
    try {
        await checkPageLoaded();
    } catch (error) {
        console.error(error.message);
    }
    const packet = await modifyPage();
    const html = removeTags(packet.html)
    const viewportSize = packet.viewportSize;
    return {
        html_text: html,
        viewport_size: viewportSize
    };
};

export default getHtmlInfo